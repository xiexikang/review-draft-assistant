import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"

export const openrouterProvider: ProviderAdapter = {
  defaultBaseUrl: "https://openrouter.ai/api/v1",
  recommendedModels: [
    "openai/gpt-5.4-mini",
    "openai/gpt-5.4-nano",
    "anthropic/claude-sonnet-4.6",
    "z-ai/glm-4.7",
    "qwen/qwen3.6-plus",
    "deepseek/deepseek-chat",
    "moonshotai/kimi-k2",
    "minimax/minimax-m2.5",
  ],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) => {
    const baseUrl = config.baseUrl?.trim() || "https://openrouter.ai/api/v1"
    const cleanBaseUrl = baseUrl.replace(/\/$/, "")

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "HTTP-Referer": "https://github.com/xiexikang/review-draft-assistant",
      "X-Title": "AI Review Draft Assistant",
    }

    const url = cleanBaseUrl.endsWith("/v1") ? `${cleanBaseUrl}/chat/completions` : `${cleanBaseUrl}/v1/chat/completions`

    return {
      url,
      headers,
      body: {
        model: config.model,
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
  testRequest: (config: ProviderConfig) => openrouterProvider.buildRequest(config, "[{\"ok\":true}]"),
}
