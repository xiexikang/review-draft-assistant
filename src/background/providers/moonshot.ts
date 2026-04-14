import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"

export const moonshotProvider: ProviderAdapter = {
  defaultBaseUrl: "https://api.moonshot.cn/v1",
  recommendedModels: [
    "kimi-k2.5",
    "kimi-k2-thinking",
    "kimi-k2-0905",
    "kimi-k2",
    "kimi-dev-72b",
    "moonlight-16b-a3b-instruct"
  ],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) => {
    let baseUrl = config.baseUrl?.trim() || "https://api.moonshot.cn/v1"
    const cleanBaseUrl = baseUrl.replace(/\/$/, "")

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    }

    if (cleanBaseUrl.includes("openrouter.ai")) {
      headers["HTTP-Referer"] = "https://github.com/xiexikang/review-draft-assistant"
      headers["X-Title"] = "AI Review Draft Assistant"
    }

    const url = cleanBaseUrl.endsWith("/v1")
      ? `${cleanBaseUrl}/chat/completions`
      : `${cleanBaseUrl}/v1/chat/completions`
    const model = cleanBaseUrl.includes("openrouter.ai") && !config.model.includes("/")
      ? `moonshotai/${config.model}`
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
  testRequest: (config: ProviderConfig) => moonshotProvider.buildRequest(config, '[{"ok":true}]'),
}
