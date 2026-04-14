import { parseDrafts } from "../generator/parse"
import { buildPrompt } from "../generator/prompt"
import type { DraftItem, OrderItem, ProviderConfig } from "../shared/types"
import { claudeProvider } from "./providers/claude"
import { deepseekProvider } from "./providers/deepseek"
import { openaiProvider } from "./providers/openai"
import { zhipuProvider } from "./providers/zhipu"
import { qwenProvider } from "./providers/qwen"
import { minimaxProvider } from "./providers/minimax"
import { moonshotProvider } from "./providers/moonshot"

function getProvider(provider: ProviderConfig["provider"]) {
  if (provider === "openai") return openaiProvider
  if (provider === "claude") return claudeProvider
  if (provider === "zhipu") return zhipuProvider
  if (provider === "qwen") return qwenProvider
  if (provider === "minimax") return minimaxProvider
  if (provider === "moonshot") return moonshotProvider
  return deepseekProvider
}

export async function generateDraftForOrder(args: {
  providerConfig: ProviderConfig
  order: OrderItem
  rating: number
  tags: string[]
  style?: string
}): Promise<DraftItem> {
  const prompt = buildPrompt({
    order: args.order,
    rating: args.rating,
    tags: args.tags,
    style: args.style,
  })

  const provider = getProvider(args.providerConfig.provider)
  const req = provider.buildRequest(args.providerConfig, prompt)
  const resp = await fetch(req.url, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify(req.body),
  })
  if (!resp.ok) throw new Error((await resp.text()).slice(0, 500))
  const json = await resp.json()
  const text = provider.parseText(json)
  const drafts = parseDrafts(text)
  const first = drafts.find((d) => d.orderKey === args.order.orderKey) ?? drafts[0]
  if (!first) throw new Error("空草稿结果")
  return { ...first, orderKey: args.order.orderKey, rating: args.rating }
}
