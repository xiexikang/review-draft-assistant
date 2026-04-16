import type { ProviderId } from "../../shared/types"
import type { ProviderAdapter } from "./types"
import { claudeProvider } from "./claude"
import { deepseekProvider } from "./deepseek"
import { minimaxProvider } from "./minimax"
import { moonshotProvider } from "./moonshot"
import { openaiProvider } from "./openai"
import { openrouterProvider } from "./openrouter"
import { qwenProvider } from "./qwen"
import { zhipuProvider } from "./zhipu"

const providerMap: Record<ProviderId, ProviderAdapter> = {
  openai: openaiProvider,
  claude: claudeProvider,
  zhipu: zhipuProvider,
  deepseek: deepseekProvider,
  qwen: qwenProvider,
  minimax: minimaxProvider,
  moonshot: moonshotProvider,
  openrouter: openrouterProvider,
}

export function getProvider(id: ProviderId): ProviderAdapter {
  return providerMap[id] ?? deepseekProvider
}

export function getProviderAdapter(id: ProviderId): ProviderAdapter {
  return providerMap[id] ?? deepseekProvider
}

export function getAllProviders(): Record<ProviderId, ProviderAdapter> {
  return providerMap
}
