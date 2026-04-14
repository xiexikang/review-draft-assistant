import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"

export const claudeProvider: ProviderAdapter = {
  defaultBaseUrl: "https://api.anthropic.com",
  recommendedModels: [
    "claude-sonnet-4.6",
    "claude-opus-4.6",
    "claude-sonnet-4.5",
    "claude-opus-4.5",
    "claude-haiku-4.5",
    "claude-sonnet-4",
    "claude-opus-4",
    "claude-3-haiku"
  ],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) => {
    const baseUrl = config.baseUrl?.trim() || "https://api.anthropic.com"
    const cleanBaseUrl = baseUrl.replace(/\/$/, "")
    const isOpenRouter = cleanBaseUrl.includes("openrouter.ai")

    if (isOpenRouter) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "HTTP-Referer": "https://github.com/xiexikang/review-draft-assistant",
        "X-Title": "AI Review Draft Assistant",
      }

      const url = cleanBaseUrl.endsWith("/v1") ? `${cleanBaseUrl}/chat/completions` : `${cleanBaseUrl}/v1/chat/completions`
      const model = !config.model.includes("/") ? `anthropic/${config.model}` : config.model

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

    return {
      url: `${cleanBaseUrl}/v1/messages`,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: {
        model: config.model,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 800,
        messages: [{ role: "user", content: prompt }],
      },
    }
  },
  parseText: (respJson: any) =>
    respJson?.choices?.[0]?.message?.content ?? respJson?.content?.[0]?.text ?? "",
  testRequest: (config: ProviderConfig) => claudeProvider.buildRequest(config, "[{\"ok\":true}]"),
}
