import { useEffect, useMemo, useState } from "react"
import type { GenDraftsResult, PlatformFillReview } from "../../shared/messages"
import type { DraftItem } from "../../shared/types"
import { getDraftsByOrderKey } from "../../shared/storage"

export function DraftsTab() {
  const [map, setMap] = useState<Record<string, DraftItem>>({})
  const list = useMemo(() => Object.values(map), [map])

  async function refresh() {
    const next = await getDraftsByOrderKey()
    setMap(next)
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    function onMsg(message: GenDraftsResult) {
      if (message.type !== "GEN_DRAFTS_RESULT") return
      void refresh()
    }
    chrome.runtime.onMessage.addListener(onMsg as any)
    return () => chrome.runtime.onMessage.removeListener(onMsg as any)
  }, [])

  async function copy(text: string) {
    await navigator.clipboard.writeText(text)
  }

  async function fill(text: string) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) return
      const msg: PlatformFillReview = {
        type: "PLATFORM_FILL_REVIEW",
        payload: { platform: "jd", orderKey: "", text },
      }
      await new Promise<void>((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id!, msg, () => {
          const err = chrome.runtime.lastError
          if (err) reject(new Error(err.message))
          else resolve()
        })
      })
    } catch {
      return
    }
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
            <div className="text-xs text-slate-600">orderKey：{d.orderKey}</div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold">短</div>
                <div className="flex gap-1">
                  <button className="rounded border px-2 py-1 text-xs" type="button" onClick={() => void copy(d.draft_short)}>
                    复制
                  </button>
                  <button className="rounded border px-2 py-1 text-xs" type="button" onClick={() => void fill(d.draft_short)}>
                    填入
                  </button>
                </div>
              </div>
              <div className="whitespace-pre-wrap break-words text-xs text-slate-800">{d.draft_short}</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold">中</div>
                <div className="flex gap-1">
                  <button className="rounded border px-2 py-1 text-xs" type="button" onClick={() => void copy(d.draft_mid)}>
                    复制
                  </button>
                  <button className="rounded border px-2 py-1 text-xs" type="button" onClick={() => void fill(d.draft_mid)}>
                    填入
                  </button>
                </div>
              </div>
              <div className="whitespace-pre-wrap break-words text-xs text-slate-800">{d.draft_mid}</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold">长</div>
                <div className="flex gap-1">
                  <button className="rounded border px-2 py-1 text-xs" type="button" onClick={() => void copy(d.draft_long)}>
                    复制
                  </button>
                  <button className="rounded border px-2 py-1 text-xs" type="button" onClick={() => void fill(d.draft_long)}>
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
