import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"

export const zhipuProvider: ProviderAdapter = {
  defaultBaseUrl: "https://open.bigmodel.cn",
  recommendedModels: ["glm-4.7", "glm-5.1", "glm-4-flash", "glm-4"],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) => {
    const baseUrl = config.baseUrl?.trim() || "https://open.bigmodel.cn"
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
  testRequest: (config: ProviderConfig) => zhipuProvider.buildRequest(config, "[{\"ok\":true}]"),
}

