import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"
import { buildOpenAICompatRequest } from "./base"

export const openaiProvider: ProviderAdapter = {
  defaultBaseUrl: "https://api.openai.com",
  recommendedModels: [
    "gpt-5.4-pro",
    "gpt-5.4",
    "gpt-5.4-mini",
    "gpt-5.4-nano",
    "gpt-5.3-chat",
    "gpt-5.3-codex",
    "gpt-5.2-pro",
    "gpt-5.2",
    "o3-deep-research",
    "o4-mini-deep-research",
  ],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) =>
    buildOpenAICompatRequest(
      { defaultBaseUrl: "https://api.openai.com", openrouterPrefix: "openai" },
      config,
      prompt,
    ),
  parseText: (respJson: any) => respJson?.choices?.[0]?.message?.content ?? "",
  testRequest: (config: ProviderConfig) => openaiProvider.buildRequest(config, '[{"ok":true}]'),
}
