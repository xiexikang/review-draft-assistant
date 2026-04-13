import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"

export const openaiProvider: ProviderAdapter = {
  defaultBaseUrl: "https://api.openai.com",
  recommendedModels: ["gpt-4o-mini", "gpt-4.1-mini"],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) => {
    const baseUrl = config.baseUrl?.trim() || "https://api.openai.com"
    return {
      url: `${baseUrl}/v1/chat/completions`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
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
  testRequest: (config: ProviderConfig) => openaiProvider.buildRequest(config, "[{\"ok\":true}]"),
}

