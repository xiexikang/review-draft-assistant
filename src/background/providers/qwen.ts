import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"

export const qwenProvider: ProviderAdapter = {
  defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  recommendedModels: [
    "qwen3.6-plus",
    "qwen3.6-plus-preview",
    "qwen3.5-9b",
    "qwen3.5-35b-a3b",
    "qwen3.5-27b",
    "qwen3.5-122b-a10b",
    "qwen3.5-flash-02-23",
    "qwen3.5-plus-02-15",
    "qwen3.5-397b-a17b",
    "qwen3-max-thinking",
    "qwen3-coder-next",
    "qwen3-max"
  ],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) => {
    let baseUrl = config.baseUrl?.trim() || "https://dashscope.aliyuncs.com/compatible-mode/v1"
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
      ? `qwen/${config.model}`
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
  testRequest: (config: ProviderConfig) => qwenProvider.buildRequest(config, '[{"ok":true}]'),
}
