import type { MessageToBackground, ProviderTestResult } from "../shared/messages"
import { claudeProvider } from "./providers/claude"
import { openaiProvider } from "./providers/openai"

function getProvider(provider: "openai" | "claude") {
  if (provider === "openai") return openaiProvider
  return claudeProvider
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

chrome.runtime.onMessage.addListener((message: MessageToBackground, _sender, sendResponse) => {
  void (async () => {
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

    sendResponse({ ok: false })
  })()
  return true
})
