import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"
import { buildOpenAICompatRequest } from "./base"

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
  buildRequest: (config: ProviderConfig, prompt: string) =>
    buildOpenAICompatRequest({ defaultBaseUrl: "https://openrouter.ai/api/v1" }, config, prompt),
  parseText: (respJson: any) => respJson?.choices?.[0]?.message?.content ?? "",
  testRequest: (config: ProviderConfig) => openrouterProvider.buildRequest(config, '[{"ok":true}]'),
}
