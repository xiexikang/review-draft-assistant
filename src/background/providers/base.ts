import type { ProviderConfig } from "../../shared/types"
import type { ProviderRequest } from "./types"

type OpenAICompatOptions = {
  defaultBaseUrl: string
  openrouterPrefix?: string
  /** Extra base URLs to auto-fix (e.g. zhipu needs /api/paas/v4 appended) */
  autoFixBaseUrls?: Record<string, string>
}

export function buildOpenAICompatRequest(
  opts: OpenAICompatOptions,
  config: ProviderConfig,
  prompt: string,
): ProviderRequest {
  let baseUrl = config.baseUrl?.trim() || opts.defaultBaseUrl
  const stripped = baseUrl.replace(/\/$/, "")

  // Auto-fix: if user entered only the root domain, append the correct path
  if (opts.autoFixBaseUrls) {
    for (const [root, fullUrl] of Object.entries(opts.autoFixBaseUrls)) {
      if (stripped === root || stripped === root.replace("https://", "http://")) {
        baseUrl = fullUrl
        break
      }
    }
  }

  const cleanBaseUrl = baseUrl.replace(/\/$/, "")
  const isOpenRouter = cleanBaseUrl.includes("openrouter.ai")

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  }

  if (isOpenRouter) {
    headers["HTTP-Referer"] = "https://github.com/xiexikang/review-draft-assistant"
    headers["X-Title"] = "AI Review Draft Assistant"
  }

  const url = cleanBaseUrl.endsWith("/v1")
    ? `${cleanBaseUrl}/chat/completions`
    : `${cleanBaseUrl}/v1/chat/completions`

  const model =
    isOpenRouter && opts.openrouterPrefix && !config.model.includes("/")
      ? `${opts.openrouterPrefix}/${config.model}`
      : config.model

  return {
    url,
    headers,
    body: {
      model,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 800,
      messages: [
        { role: "system", content: "You are a helpful assistant that outputs strictly valid JSON." },
        { role: "user", content: prompt },
      ],
    },
  }
}
