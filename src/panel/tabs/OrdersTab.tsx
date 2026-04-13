import { useEffect, useMemo, useState } from "react"
import type { PlatformOrdersUpdated } from "../../shared/messages"
import type { OrderItem } from "../../shared/types"
import { getOrdersSnapshot } from "../../shared/storage"

export function OrdersTab() {
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
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

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected])

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">订单</div>
      <div className="text-xs text-slate-600">
        平台：{meta.platform} / 上下文：{meta.context} / 识别：{orders.length} / 已选：{selectedCount}
      </div>
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
