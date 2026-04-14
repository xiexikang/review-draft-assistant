import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"

export const openaiProvider: ProviderAdapter = {
  defaultBaseUrl: "https://api.openai.com",
  recommendedModels: [
    "gpt-5.4-pro",
    "gpt-5.4",
    "gpt-5.4-mini",
    "gpt-5.4-nano",
    "gpt-5.3-chat",
    "gpt-5.3-codex",
    "gpt-5.2-pro",
    "gpt-5.2",
    "o3-deep-research",
    "o4-mini-deep-research"
  ],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) => {
    const baseUrl = config.baseUrl?.trim() || "https://api.openai.com"
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

    const url = cleanBaseUrl.endsWith("/v1") ? `${cleanBaseUrl}/chat/completions` : `${cleanBaseUrl}/v1/chat/completions`
    const model = isOpenRouter && !config.model.includes("/") ? `openai/${config.model}` : config.model
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
  },
  parseText: (respJson: any) => respJson?.choices?.[0]?.message?.content ?? "",
  testRequest: (config: ProviderConfig) => openaiProvider.buildRequest(config, "[{\"ok\":true}]"),
}
