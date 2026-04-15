import { useEffect, useMemo, useState } from "react"
import type { PlatformFillReview } from "../../shared/messages"
import type { OrderItem, DraftItem } from "../../shared/types"
import { getOrdersSnapshot, getProviderConfig, getDraftsByOrderKey } from "../../shared/storage"

export function OrdersTab() {
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [drafts, setDrafts] = useState<Record<string, DraftItem>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  
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

  const [copyStatus, setCopyStatus] = useState<Record<string, string>>({})
  const [fillStatus, setFillStatus] = useState<Record<string, string>>({})

  async function loadData() {
    const snap = await getOrdersSnapshot()
    if (snap) {
      setOrders(snap.orders)
      setMeta({ platform: snap.platform, context: snap.context })
    }
    const ds = await getDraftsByOrderKey()
    setDrafts(ds)
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    function onMsg(message: any) {
      if (message.type === "PLATFORM_ORDERS_UPDATED") {
        setOrders(message.payload.orders)
        setMeta({ platform: message.payload.platform, context: message.payload.context })
        setSelected({})
      }
      if (message.type === "GEN_DRAFTS_RESULT") {
        setProgress(null)
        setGenStatus(`已生成：${message.payload.drafts.length} 单`)
        void loadData() // 重新加载草稿数据
      }
      if (message.type === "GEN_DRAFTS_PROGRESS") {
        setProgress(message.payload)
        setGenStatus("")
      }
      if (message.type === "GEN_DRAFTS_ERROR") {
        setGenStatus(message.payload.errorMessage)
      }
    }
    chrome.runtime.onMessage.addListener(onMsg)
    return () => chrome.runtime.onMessage.removeListener(onMsg)
  }, [])

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected])
  const selectedOrders = useMemo(() => orders.filter((o) => selected[o.orderKey]), [orders, selected])

  async function generateForOrders(ordersToGen: OrderItem[]) {
    if (ordersToGen.length === 0) {
      setGenStatus("请先选择订单")
      return
    }
    const providerConfig = await getProviderConfig()
    if (!providerConfig || !providerConfig.apiKey || !providerConfig.model) {
      setGenStatus("请先在设置中保存 API Key 与模型")
      return
    }
    setGenStatus("已开始生成…")
    setProgress({ done: 0, total: ordersToGen.length })

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    chrome.runtime.sendMessage({
      type: "GEN_DRAFTS_START",
      payload: {
        providerConfig,
        orders: ordersToGen,
        rating,
        tags,
        style: style.trim() || undefined,
      },
    })
  }

  async function onGenerate() {
    await generateForOrders(selectedOrders)
  }

  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopyStatus((prev) => ({ ...prev, [id]: "已复制" }))
    setTimeout(() => {
      setCopyStatus((prev) => ({ ...prev, [id]: "" }))
    }, 1500)
  }

  async function fill(id: string, text: string, orderKey: string, draftRating: number, reviewUrl?: string, submit: boolean = false) {
    try {
      setFillStatus((prev) => ({ ...prev, [id]: submit ? "发表中..." : "填入中..." }))
      const tabs = await chrome.tabs.query({ url: ["*://*.jd.com/*", "*://*.taobao.com/*", "*://*.tmall.com/*"] })
      const activeTab = tabs.find(t => t.active) || tabs[0]
      
      if (!activeTab?.id) {
        setFillStatus((prev) => ({ ...prev, [id]: "未找到评价页" }))
        return
      }
      
      const isReviewPage = activeTab.url?.includes('orderVoucher.action') || activeTab.url?.includes('myJdcomment.action') || activeTab.url?.includes('rate.taobao.com') || activeTab.url?.includes('rate.tmall.com') || activeTab.url?.includes('ratewrite.tmall.com')
      
      const msg: PlatformFillReview = {
        type: "PLATFORM_FILL_REVIEW",
        payload: { platform: meta.platform as any, orderKey, text, rating: draftRating, submit },
      }
      
      const res = await new Promise<{ok: boolean, error?: string}>((resolve) => {
        chrome.tabs.sendMessage(activeTab.id!, msg, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message })
          } else {
            resolve(response || { ok: true })
          }
        })
      })
      
      if (res.ok) {
        setFillStatus((prev) => ({ ...prev, [id]: "已填入" }))
      } else {
        if (!isReviewPage && reviewUrl) {
          setFillStatus((prev) => ({ ...prev, [id]: "请先进入评价页" }))
        } else {
          setFillStatus((prev) => ({ ...prev, [id]: `失败: ${res.error || '未找到输入框'}` }))
        }
      }
    } catch (e) {
      setFillStatus((prev) => ({ ...prev, [id]: "错误" }))
    }
    
    setTimeout(() => {
      setFillStatus((prev) => ({ ...prev, [id]: "" }))
    }, 3000)
  }

  function toggleExpand(orderKey: string) {
    setExpanded((prev) => ({ ...prev, [orderKey]: !prev[orderKey] }))
  }

  function getPlatformName(platform: string) {
    if (platform === "jd") return "京东"
    if (platform === "taobao") return "淘宝"
    return platform
  }

  async function refreshCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "REQUEST_SYNC_ORDERS" }, () => {
          if (chrome.runtime.lastError) {
             console.warn("刷新请求未送达，可能不在支持的页面:", chrome.runtime.lastError.message)
          }
        })
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">订单</div>
        <button 
          onClick={refreshCurrentTab} 
          className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
        >
          刷新
        </button>
      </div>
      <div className="text-xs text-slate-600">
        平台：<span className="font-bold">{getPlatformName(meta.platform)}</span> / 上下文：<span className="font-bold">{meta.context}</span> / 识别：<span className="font-bold">{orders.length}</span> / 已选：<span className="font-bold">{selectedCount}</span>
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
      
      <div className="space-y-4 mt-4">
        {Object.entries(
          // 按 orderId 分组
          orders.reduce((acc, o) => {
            const key = o.orderId || o.orderKey
            if (!acc[key]) acc[key] = []
            acc[key].push(o)
            return acc
          }, {} as Record<string, OrderItem[]>)
        ).map(([groupId, groupOrders]) => {
          const firstOrder = groupOrders[0]
          
          return (
            <div key={groupId} className="rounded border flex flex-col overflow-hidden bg-white">
              {/* 订单 Header (灰色背景) */}
              <div className="bg-slate-50 px-3 py-2 flex items-center justify-between border-b text-xs text-slate-600">
                <div className="flex items-center gap-4">
                  {firstOrder.date && <span className="font-bold text-slate-800">{firstOrder.date}</span>}
                  <span>订单号: <span className="font-mono">{groupId}</span></span>
                </div>
                {firstOrder.consignee && <span>{firstOrder.consignee}</span>}
              </div>

              {/* 订单下的所有商品 */}
              <div className="flex flex-col divide-y">
                {groupOrders.map((o) => {
                  const draft = drafts[o.orderKey]
                  const isExpanded = expanded[o.orderKey]
                  
                  return (
                    <div key={o.orderKey} className="flex flex-col">
                      <label className="flex items-start gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                        <div className="flex items-center h-full pt-1">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            checked={Boolean(selected[o.orderKey])}
                            onChange={(e) => setSelected((s) => ({ ...s, [o.orderKey]: e.target.checked }))}
                          />
                        </div>
                        {o.imageUrl ? (
                          <img src={o.imageUrl} alt="" className="w-14 h-14 object-cover rounded-md border border-slate-100 flex-shrink-0" />
                        ) : (
                          <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-md flex items-center justify-center text-slate-400 text-xs flex-shrink-0">无图</div>
                        )}
                        <div className="min-w-0 flex-1 flex flex-col justify-between min-h-[3.5rem]">
                          <div className="truncate text-sm font-medium text-slate-800" title={o.title}>{o.title}</div>
                          <div className="flex items-center justify-between mt-auto pt-1">
                            <div className="flex items-center gap-2">
                              {o.skuText ? <div className="text-[11px] text-slate-500 truncate max-w-[150px]" title={o.skuText}>{o.skuText}</div> : null}
                              {o.count ? <div className="text-[11px] text-slate-500">{o.count}</div> : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                type="button" 
                                onClick={(e) => { 
                                  e.preventDefault()
                                  generateForOrders([o])
                                  setExpanded(prev => ({ ...prev, [o.orderKey]: true }))
                                }}
                                className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors whitespace-nowrap font-medium"
                              >
                                {draft ? "重新生成" : "一键生成"}
                              </button>
                              {draft ? (
                                <button 
                                  type="button" 
                                  onClick={(e) => { e.preventDefault(); toggleExpand(o.orderKey); }}
                                  className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors whitespace-nowrap"
                                >
                                  {isExpanded ? "收起草稿" : "查看草稿"}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </label>
                      
                      {draft && isExpanded && (
                        <div className="border-t p-3 bg-slate-50 space-y-3 shadow-inner">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-slate-700">生成结果（{draft.rating}星）</div>
                            {o.reviewUrl && (
                              <a href={o.reviewUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline font-semibold">
                                去评价页 →
                              </a>
                            )}
                          </div>
                          
                          {/* 短草稿 */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-semibold">短</div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-green-600">{copyStatus[`${o.orderKey}-short`] || fillStatus[`${o.orderKey}-short`]}</span>
                                <button className="rounded border px-2 py-1 text-xs bg-white hover:bg-slate-50 transition-colors" type="button" onClick={() => void copy(`${o.orderKey}-short`, draft.draft_short)}>
                                  复制
                                </button>
                                <button className="rounded border px-2 py-1 text-xs bg-white hover:bg-slate-50 transition-colors" type="button" onClick={() => void fill(`${o.orderKey}-short`, draft.draft_short, o.orderKey, draft.rating, o.reviewUrl)}>
                                  填入
                                </button>
                                <button className="rounded border px-2 py-1 text-xs bg-slate-900 text-white hover:bg-slate-800 transition-colors" type="button" onClick={() => void fill(`${o.orderKey}-short`, draft.draft_short, o.orderKey, draft.rating, o.reviewUrl, true)}>
                                  填入并发表
                                </button>
                              </div>
                            </div>
                            <div className="whitespace-pre-wrap break-words text-xs text-slate-800 bg-white p-2 rounded border border-slate-200">{draft.draft_short}</div>
                          </div>

                          {/* 中草稿 */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-semibold">中</div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-green-600">{copyStatus[`${o.orderKey}-mid`] || fillStatus[`${o.orderKey}-mid`]}</span>
                                <button className="rounded border px-2 py-1 text-xs bg-white hover:bg-slate-50 transition-colors" type="button" onClick={() => void copy(`${o.orderKey}-mid`, draft.draft_mid)}>
                                  复制
                                </button>
                                <button className="rounded border px-2 py-1 text-xs bg-white hover:bg-slate-50 transition-colors" type="button" onClick={() => void fill(`${o.orderKey}-mid`, draft.draft_mid, o.orderKey, draft.rating, o.reviewUrl)}>
                                  填入
                                </button>
                                <button className="rounded border px-2 py-1 text-xs bg-slate-900 text-white hover:bg-slate-800 transition-colors" type="button" onClick={() => void fill(`${o.orderKey}-mid`, draft.draft_mid, o.orderKey, draft.rating, o.reviewUrl, true)}>
                                  填入并发表
                                </button>
                              </div>
                            </div>
                            <div className="whitespace-pre-wrap break-words text-xs text-slate-800 bg-white p-2 rounded border border-slate-200">{draft.draft_mid}</div>
                          </div>

                          {/* 长草稿 */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-semibold">长</div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-green-600">{copyStatus[`${o.orderKey}-long`] || fillStatus[`${o.orderKey}-long`]}</span>
                                <button className="rounded border px-2 py-1 text-xs bg-white hover:bg-slate-50 transition-colors" type="button" onClick={() => void copy(`${o.orderKey}-long`, draft.draft_long)}>
                                  复制
                                </button>
                                <button className="rounded border px-2 py-1 text-xs bg-white hover:bg-slate-50 transition-colors" type="button" onClick={() => void fill(`${o.orderKey}-long`, draft.draft_long, o.orderKey, draft.rating, o.reviewUrl)}>
                                  填入
                                </button>
                                <button className="rounded border px-2 py-1 text-xs bg-slate-900 text-white hover:bg-slate-800 transition-colors" type="button" onClick={() => void fill(`${o.orderKey}-long`, draft.draft_long, o.orderKey, draft.rating, o.reviewUrl, true)}>
                                  填入并发表
                                </button>
                              </div>
                            </div>
                            <div className="whitespace-pre-wrap break-words text-xs text-slate-800 bg-white p-2 rounded border border-slate-200">{draft.draft_long}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {orders.length === 0 ? <div className="text-xs text-slate-600">当前页面未识别到待评价订单</div> : null}
      </div>
    </div>
  )
}
