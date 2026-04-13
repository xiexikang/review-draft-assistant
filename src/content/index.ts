import type { MessageToContent, PlatformOrdersUpdated } from "../shared/messages"
import { getAdapter, getPlatformByUrl } from "../platforms"

async function syncOrders() {
  const platform = getPlatformByUrl(location.href)
  const adapter = getAdapter(platform)
  if (!adapter) return
  const context = adapter.detectContext(location.href, document)
  if (context !== "order_list_pending_review") return
  const orders = await adapter.extractOrders(document)
  const msg: PlatformOrdersUpdated = {
    type: "PLATFORM_ORDERS_UPDATED",
    payload: { platform, context, orders },
  }
  chrome.runtime.sendMessage(msg)
}

chrome.runtime.onMessage.addListener((message: MessageToContent, _sender, sendResponse) => {
  if (message.type !== "PLATFORM_FILL_REVIEW") return false
  const platform = getPlatformByUrl(location.href)
  const adapter = getAdapter(platform)
  if (!adapter) {
    sendResponse({ ok: false, error: "no adapter" })
    return true
  }
  adapter.fillReview(document, message.payload.text, message.payload.orderKey)
    .then(() => sendResponse({ ok: true }))
    .catch((err) => sendResponse({ ok: false, error: err instanceof Error ? err.message : "unknown" }))
  return true
})

void syncOrders()
