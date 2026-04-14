import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"

export const minimaxProvider: ProviderAdapter = {
  defaultBaseUrl: "https://api.minimax.chat/v1",
  recommendedModels: [
    "minimax-m2.7",
    "minimax-m2.5",
    "minimax-m2-her",
    "minimax-m2.1",
    "minimax-m2",
    "minimax-m1",
    "minimax-01"
  ],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) => {
    let baseUrl = config.baseUrl?.trim() || "https://api.minimax.chat/v1"
    const cleanBaseUrl = baseUrl.replace(/\/$/, "")

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    }

    if (cleanBaseUrl.includes("openrouter.ai")) {
      headers["HTTP-Referer"] = "https://github.com/xiexikang/review-draft-assistant"
      headers["X-Title"] = "AI 一键评价助手"
    }

    const url = cleanBaseUrl.endsWith("/v1")
      ? `${cleanBaseUrl}/chat/completions`
      : `${cleanBaseUrl}/v1/chat/completions`
    const model = cleanBaseUrl.includes("openrouter.ai") && !config.model.includes("/")
      ? `minimax/${config.model}`
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
  },
  parseText: (respJson: any) => respJson?.choices?.[0]?.message?.content ?? "",
  testRequest: (config: ProviderConfig) => minimaxProvider.buildRequest(config, '[{"ok":true}]'),
}
