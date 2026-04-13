import { useEffect, useMemo, useState } from "react"
import type { GenDraftsError, GenDraftsProgress, GenDraftsResult, PlatformOrdersUpdated } from "../../shared/messages"
import type { OrderItem } from "../../shared/types"
import { getOrdersSnapshot, getProviderConfig } from "../../shared/storage"

export function OrdersTab() {
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [rating, setRating] = useState<number>(5)
  const [tagsInput, setTagsInput] = useState<string>("")
  const [style, setStyle] = useState<string>("")
  const [genStatus, setGenStatus] = useState<string>("")
  const [progress, setProgress] = useState<{ done: number; total: number; currentOrderKey?: string } | null>(
    null,
  )
  const [meta, setMeta] = useState<{ platform: string; context: string }>({
    platform: "unknown",
    context: "unknown",
  })

  useEffect(() => {
    void (async () => {
      const snap = await getOrdersSnapshot()
      if (!snap) return
      setOrders(snap.orders)
      setMeta({ platform: snap.platform, context: snap.context })
    })()
  }, [])

  useEffect(() => {
    function onMsg(message: PlatformOrdersUpdated) {
      if (message.type !== "PLATFORM_ORDERS_UPDATED") return
      setOrders(message.payload.orders)
      setMeta({ platform: message.payload.platform, context: message.payload.context })
      setSelected({})
    }
    chrome.runtime.onMessage.addListener(onMsg as any)
    return () => chrome.runtime.onMessage.removeListener(onMsg as any)
  }, [])

  useEffect(() => {
    function onMsg(message: GenDraftsProgress | GenDraftsResult | GenDraftsError) {
      if (message.type === "GEN_DRAFTS_PROGRESS") {
        setProgress(message.payload)
        setGenStatus("")
        return
      }
      if (message.type === "GEN_DRAFTS_ERROR") {
        setGenStatus(message.payload.errorMessage)
        return
      }
      if (message.type === "GEN_DRAFTS_RESULT") {
        setProgress(null)
        setGenStatus(`已生成：${message.payload.drafts.length} 单`)
      }
    }
    chrome.runtime.onMessage.addListener(onMsg as any)
    return () => chrome.runtime.onMessage.removeListener(onMsg as any)
  }, [])

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected])
  const selectedOrders = useMemo(() => orders.filter((o) => selected[o.orderKey]), [orders, selected])

  async function onGenerate() {
    if (selectedOrders.length === 0) {
      setGenStatus("请先选择订单")
      return
    }
    const providerConfig = await getProviderConfig()
    if (!providerConfig || !providerConfig.apiKey || !providerConfig.model) {
      setGenStatus("请先在设置中保存 API Key 与模型")
      return
    }
    setGenStatus("已开始生成…")
    setProgress({ done: 0, total: selectedOrders.length })

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    chrome.runtime.sendMessage({
      type: "GEN_DRAFTS_START",
      payload: {
        providerConfig,
        orders: selectedOrders,
        rating,
        tags,
        style: style.trim() || undefined,
      },
    })
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">订单</div>
      <div className="text-xs text-slate-600">
        平台：{meta.platform} / 上下文：{meta.context} / 识别：{orders.length} / 已选：{selectedCount}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <div className="text-xs text-slate-600">统一星级</div>
          <select
            className="w-full rounded border px-2 py-1 text-sm"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <div className="text-xs text-slate-600">tags（逗号分隔）</div>
          <input
            className="w-full rounded border px-2 py-1 text-sm"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="物流快, 包装好"
          />
        </label>
      </div>
      <label className="block space-y-1">
        <div className="text-xs text-slate-600">风格（可选）</div>
        <input
          className="w-full rounded border px-2 py-1 text-sm"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          placeholder="简洁、口语化"
        />
      </label>

      <button
        className="w-full rounded bg-slate-900 px-2 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        type="button"
        onClick={onGenerate}
        disabled={selectedOrders.length === 0}
      >
        批量生成
      </button>

      {progress ? (
        <div className="text-xs text-slate-700">
          进度：{progress.done}/{progress.total}
          {progress.currentOrderKey ? `（${progress.currentOrderKey}）` : ""}
        </div>
      ) : null}
      {genStatus ? <div className="text-xs text-slate-700">{genStatus}</div> : null}
      <div className="space-y-2">
        {orders.map((o) => (
          <label key={o.orderKey} className="flex items-start gap-2 rounded border p-2">
            <input
              type="checkbox"
              checked={Boolean(selected[o.orderKey])}
              onChange={(e) => setSelected((s) => ({ ...s, [o.orderKey]: e.target.checked }))}
            />
            <div className="min-w-0">
              <div className="truncate text-sm">{o.title}</div>
              {o.skuText ? <div className="truncate text-xs text-slate-600">{o.skuText}</div> : null}
            </div>
          </label>
        ))}
        {orders.length === 0 ? <div className="text-xs text-slate-600">当前页面未识别到待评价订单</div> : null}
      </div>
    </div>
  )
}
