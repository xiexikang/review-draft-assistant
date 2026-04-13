import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"

export const claudeProvider: ProviderAdapter = {
  defaultBaseUrl: "https://api.anthropic.com",
  recommendedModels: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) => {
    const baseUrl = config.baseUrl?.trim() || "https://api.anthropic.com"
    return {
      url: `${baseUrl}/v1/messages`,
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
  parseText: (respJson: any) => respJson?.content?.[0]?.text ?? "",
  testRequest: (config: ProviderConfig) => claudeProvider.buildRequest(config, "[{\"ok\":true}]"),
}

