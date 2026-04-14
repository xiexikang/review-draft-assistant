import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"

export const zhipuProvider: ProviderAdapter = {
  defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
  recommendedModels: [
    "glm-5.1",
    "glm-5",
    "glm-5-turbo",
    "glm-4.7",
    "glm-4.7-flash",
    "glm-4.6",
    "glm-4-32b",
    "glm-4-flash",
    "glm-4",
  ],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) => {
    let baseUrl = config.baseUrl?.trim() || "https://open.bigmodel.cn/api/paas/v4"
    
    // Auto-fix for users who only entered the root domain
    const stripped = baseUrl.replace(/\/$/, '')
    if (
      stripped === "https://open.bigmodel.cn" ||
      stripped === "http://open.bigmodel.cn" ||
      stripped === "https://api.z.ai" ||
      stripped === "http://api.z.ai"
    ) {
      baseUrl = `${stripped}/api/paas/v4`
    }
    
    const cleanBaseUrl = baseUrl.replace(/\/$/, '')
    
    // Some proxies might already append /v1 or /api/paas/v4.
    // We just append /chat/completions directly.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    }

    if (cleanBaseUrl.includes("openrouter.ai")) {
      headers["HTTP-Referer"] = "https://github.com/xiexikang/review-draft-assistant"
      headers["X-Title"] = "AI Review Draft Assistant"
    }

    const model = cleanBaseUrl.includes("openrouter.ai") && !config.model.includes("/")
      ? `z-ai/${config.model}`
      : config.model

    return {
      url: `${cleanBaseUrl}/chat/completions`,
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
  testRequest: (config: ProviderConfig) => zhipuProvider.buildRequest(config, "[{\"ok\":true}]"),
}
