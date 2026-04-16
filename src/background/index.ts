import type {
  GenDraftsError,
  GenDraftsProgress,
  GenDraftsResult,
  MessageToBackground,
  PlatformOrdersUpdated,
  ProviderTestResult,
} from "../shared/messages"
import { getDraftsByOrderKey, setDraftsByOrderKey, setOrdersSnapshot } from "../shared/storage"
import type { DraftItem } from "../shared/types"
import { generateDraftForOrder } from "./queue"
import { getProvider } from "./providers/registry"

/** Simple concurrency limiter – runs at most `concurrency` promises at a time */
async function promisePool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let index = 0

  async function worker() {
    while (index < items.length) {
      const i = index++
      results[i] = await fn(items[i])
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

chrome.runtime.onMessage.addListener((message: MessageToBackground | PlatformOrdersUpdated, _sender, sendResponse) => {
  void (async () => {
    if (message.type === "PLATFORM_ORDERS_UPDATED") {
      await setOrdersSnapshot(message.payload)
      sendResponse({ ok: true })
      return
    }

    if (message.type === "PROVIDER_TEST") {
      try {
        const provider = getProvider(message.payload.providerConfig.provider)
        const req = provider.testRequest(message.payload.providerConfig)
        const resp = await fetch(req.url, {
          method: "POST",
          headers: req.headers,
          body: JSON.stringify(req.body),
        })
        if (!resp.ok) {
          const text = await resp.text()
          const result: ProviderTestResult = {
            type: "PROVIDER_TEST_RESULT",
            payload: { ok: false, errorMessage: text.slice(0, 500) },
          }
          sendResponse(result)
          return
        }
        const result: ProviderTestResult = { type: "PROVIDER_TEST_RESULT", payload: { ok: true } }
        sendResponse(result)
      } catch (e) {
        const result: ProviderTestResult = {
          type: "PROVIDER_TEST_RESULT",
          payload: { ok: false, errorMessage: e instanceof Error ? e.message : "Unknown error" },
        }
        sendResponse(result)
      }
      return
    }

    if (message.type === "GEN_DRAFTS_START") {
      const { providerConfig, orders, rating, tags, style } = message.payload
      const total = orders.length
      const out: DraftItem[] = []
      const map = await getDraftsByOrderKey()
      let done = 0

      await promisePool(orders, 3, async (order) => {
        try {
          const draft = await generateDraftForOrder({ providerConfig, order, rating, tags, style })
          out.push(draft)
          map[draft.orderKey] = draft
        } catch (e) {
          const err: GenDraftsError = {
            type: "GEN_DRAFTS_ERROR",
            payload: {
              orderKey: order.orderKey,
              errorMessage: e instanceof Error ? e.message : "Unknown error",
            },
          }
          chrome.runtime.sendMessage(err)
        }

        done += 1
        const progress: GenDraftsProgress = {
          type: "GEN_DRAFTS_PROGRESS",
          payload: { done, total, currentOrderKey: order.orderKey },
        }
        chrome.runtime.sendMessage(progress)
      })

      await setDraftsByOrderKey(map)
      const result: GenDraftsResult = { type: "GEN_DRAFTS_RESULT", payload: { drafts: out } }
      chrome.runtime.sendMessage(result)
      sendResponse({ ok: true })
      return
    }

    sendResponse({ ok: false })
  })()

  return true
})
