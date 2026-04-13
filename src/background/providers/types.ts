import type { ProviderConfig } from "../../shared/types"

export type ProviderRequest = {
  url: string
  headers: Record<string, string>
  body: unknown
}

export type ProviderAdapter = {
  defaultBaseUrl: string
  recommendedModels: string[]
  requiredExtraFields: string[]
  buildRequest: (config: ProviderConfig, prompt: string) => ProviderRequest
  parseText: (respJson: any) => string
  testRequest: (config: ProviderConfig) => ProviderRequest
}

