import { useEffect, useMemo, useState } from "react"
import type { PlatformFillReview } from "../../shared/messages"
import type { DraftItem } from "../../shared/types"
import { getDraftsByOrderKey, getOrdersSnapshot } from "../../shared/storage"

export function DraftsTab() {
  const [map, setMap] = useState<Record<string, DraftItem>>({})
  const list = useMemo(() => Object.values(map), [map])
  const [reviewUrls, setReviewUrls] = useState<Record<string, string>>({})

  async function refresh() {
    const next = await getDraftsByOrderKey()
    setMap(next)
    
    const snap = await getOrdersSnapshot()
    if (snap) {
      const urls: Record<string, string> = {}
      for (const o of snap.orders) {
        if (o.reviewUrl) urls[o.orderKey] = o.reviewUrl
      }
      setReviewUrls(urls)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    function onMsg(message: any) {
      if (message.type !== "GEN_DRAFTS_RESULT") return
      void refresh()
    }
    chrome.runtime.onMessage.addListener(onMsg as any)
    return () => chrome.runtime.onMessage.removeListener(onMsg as any)
  }, [])

  const [copyStatus, setCopyStatus] = useState<Record<string, string>>({})
  const [fillStatus, setFillStatus] = useState<Record<string, string>>({})

  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopyStatus((prev) => ({ ...prev, [id]: "已复制" }))
    setTimeout(() => {
      setCopyStatus((prev) => ({ ...prev, [id]: "" }))
    }, 1500)
  }

  async function fill(id: string, text: string, orderKey: string) {
    try {
      setFillStatus((prev) => ({ ...prev, [id]: "填入中..." }))
      // 匹配可能包含输入框的页面，不限制为 active，有时评价页在其他 tab
      const tabs = await chrome.tabs.query({ url: ["*://*.jd.com/*", "*://*.taobao.com/*"] })
      const activeTab = tabs.find(t => t.active) || tabs[0]
      
      if (!activeTab?.id) {
        setFillStatus((prev) => ({ ...prev, [id]: "未找到评价页" }))
        return
      }
      
      const isReviewPage = activeTab.url?.includes('orderVoucher.action') || activeTab.url?.includes('rate.taobao.com') || activeTab.url?.includes('rate.tmall.com')
      
      const msg: PlatformFillReview = {
        type: "PLATFORM_FILL_REVIEW",
        payload: { platform: "jd", orderKey, text },
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
        if (!isReviewPage && reviewUrls[orderKey]) {
          setFillStatus((prev) => ({ ...prev, [id]: "请先点击上方'去评价'进入页面" }))
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">草稿</div>
        <button className="rounded border px-2 py-1 text-xs" type="button" onClick={() => void refresh()}>
          刷新
        </button>
      </div>

      {list.length === 0 ? <div className="text-xs text-slate-600">暂无草稿</div> : null}

      <div className="space-y-2">
        {list.map((d) => (
          <div key={d.orderKey} className="space-y-2 rounded border p-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-600">orderKey：{d.orderKey}</div>
              {reviewUrls[d.orderKey] && (
                <a href={reviewUrls[d.orderKey]} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline font-semibold">
                  去评价页 →
                </a>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold">短</div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-green-600">{copyStatus[`${d.orderKey}-short`] || fillStatus[`${d.orderKey}-short`]}</span>
                  <button className="rounded border px-2 py-1 text-xs" type="button" onClick={() => void copy(`${d.orderKey}-short`, d.draft_short)}>
                    复制
                  </button>
                  <button className="rounded border px-2 py-1 text-xs" type="button" onClick={() => void fill(`${d.orderKey}-short`, d.draft_short, d.orderKey)}>
                    填入
                  </button>
                </div>
              </div>
              <div className="whitespace-pre-wrap break-words text-xs text-slate-800">{d.draft_short}</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold">中</div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-green-600">{copyStatus[`${d.orderKey}-mid`] || fillStatus[`${d.orderKey}-mid`]}</span>
                  <button className="rounded border px-2 py-1 text-xs" type="button" onClick={() => void copy(`${d.orderKey}-mid`, d.draft_mid)}>
                    复制
                  </button>
                  <button className="rounded border px-2 py-1 text-xs" type="button" onClick={() => void fill(`${d.orderKey}-mid`, d.draft_mid, d.orderKey)}>
                    填入
                  </button>
                </div>
              </div>
              <div className="whitespace-pre-wrap break-words text-xs text-slate-800">{d.draft_mid}</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold">长</div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-green-600">{copyStatus[`${d.orderKey}-long`] || fillStatus[`${d.orderKey}-long`]}</span>
                  <button className="rounded border px-2 py-1 text-xs" type="button" onClick={() => void copy(`${d.orderKey}-long`, d.draft_long)}>
                    复制
                  </button>
                  <button className="rounded border px-2 py-1 text-xs" type="button" onClick={() => void fill(`${d.orderKey}-long`, d.draft_long, d.orderKey)}>
                    填入
                  </button>
                </div>
              </div>
              <div className="whitespace-pre-wrap break-words text-xs text-slate-800">{d.draft_long}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
