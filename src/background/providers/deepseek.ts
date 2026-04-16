import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"
import { buildOpenAICompatRequest } from "./base"

export const deepseekProvider: ProviderAdapter = {
  defaultBaseUrl: "https://api.deepseek.com",
  recommendedModels: ["deepseek-chat", "deepseek-reasoner"],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) =>
    buildOpenAICompatRequest({ defaultBaseUrl: "https://api.deepseek.com" }, config, prompt),
  parseText: (respJson: any) => respJson?.choices?.[0]?.message?.content ?? "",
  testRequest: (config: ProviderConfig) => deepseekProvider.buildRequest(config, '[{"ok":true}]'),
}
