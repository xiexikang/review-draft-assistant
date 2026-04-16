import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"
import { buildOpenAICompatRequest } from "./base"

export const minimaxProvider: ProviderAdapter = {
  defaultBaseUrl: "https://api.minimax.chat/v1",
  recommendedModels: [
    "minimax-m2.7",
    "minimax-m2.5",
    "minimax-m2-her",
    "minimax-m2.1",
    "minimax-m2",
    "minimax-m1",
    "minimax-01",
  ],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) =>
    buildOpenAICompatRequest(
      { defaultBaseUrl: "https://api.minimax.chat/v1", openrouterPrefix: "minimax" },
      config,
      prompt,
    ),
  parseText: (respJson: any) => respJson?.choices?.[0]?.message?.content ?? "",
  testRequest: (config: ProviderConfig) => minimaxProvider.buildRequest(config, '[{"ok":true}]'),
}
