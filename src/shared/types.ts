export type Platform = "jd" | "taobao" | "meituan" | "douyin" | "unknown"

export type Context = "order_list_pending_review" | "review_page" | "unknown"

export type OrderItem = {
  platform: Exclude<Platform, "unknown">
  orderKey: string
  title: string
  skuText?: string
  itemUrl?: string
  reviewUrl?: string
}

export type ProviderId = "openai" | "claude" | "zhipu" | "deepseek"

export type ProviderExtra = Record<string, string>

export type ProviderConfig = {
  provider: ProviderId
  apiKey: string
  model: string
  baseUrl?: string
  maxTokens?: number
  temperature?: number
  extra?: ProviderExtra
}

export type DraftItem = {
  orderKey: string
  rating: number
  draft_short: string
  draft_mid: string
  draft_long: string
}
