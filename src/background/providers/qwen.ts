import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"
import { buildOpenAICompatRequest } from "./base"

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
    "qwen3-max",
  ],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) =>
    buildOpenAICompatRequest(
      { defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", openrouterPrefix: "qwen" },
      config,
      prompt,
    ),
  parseText: (respJson: any) => respJson?.choices?.[0]?.message?.content ?? "",
  testRequest: (config: ProviderConfig) => qwenProvider.buildRequest(config, '[{"ok":true}]'),
}
