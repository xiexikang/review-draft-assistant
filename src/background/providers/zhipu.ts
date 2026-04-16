import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"
import { buildOpenAICompatRequest } from "./base"

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
  buildRequest: (config: ProviderConfig, prompt: string) =>
    buildOpenAICompatRequest(
      {
        defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
        openrouterPrefix: "z-ai",
        autoFixBaseUrls: {
          "https://open.bigmodel.cn": "https://open.bigmodel.cn/api/paas/v4",
          "https://api.z.ai": "https://api.z.ai/api/paas/v4",
        },
      },
      config,
      prompt,
    ),
  parseText: (respJson: any) => respJson?.choices?.[0]?.message?.content ?? "",
  testRequest: (config: ProviderConfig) => zhipuProvider.buildRequest(config, '[{"ok":true}]'),
}
