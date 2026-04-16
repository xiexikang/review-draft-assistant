import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"
import { buildOpenAICompatRequest } from "./base"

export const moonshotProvider: ProviderAdapter = {
  defaultBaseUrl: "https://api.moonshot.cn/v1",
  recommendedModels: [
    "kimi-k2.5",
    "kimi-k2-thinking",
    "kimi-k2-0905",
    "kimi-k2",
    "kimi-dev-72b",
    "moonlight-16b-a3b-instruct",
  ],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) =>
    buildOpenAICompatRequest(
      { defaultBaseUrl: "https://api.moonshot.cn/v1", openrouterPrefix: "moonshotai" },
      config,
      prompt,
    ),
  parseText: (respJson: any) => respJson?.choices?.[0]?.message?.content ?? "",
  testRequest: (config: ProviderConfig) => moonshotProvider.buildRequest(config, '[{"ok":true}]'),
}
