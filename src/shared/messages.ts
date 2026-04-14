import type { Context, DraftItem, OrderItem, Platform, ProviderConfig } from "./types"

export type PlatformOrdersUpdated = {
  type: "PLATFORM_ORDERS_UPDATED"
  payload: { platform: Platform; context: Context; orders: OrderItem[] }
}

export type ProviderTest = {
  type: "PROVIDER_TEST"
  payload: { providerConfig: ProviderConfig }
}

export type ProviderTestResult = {
  type: "PROVIDER_TEST_RESULT"
  payload: { ok: boolean; errorMessage?: string }
}

export type GenDraftsStart = {
  type: "GEN_DRAFTS_START"
  payload: {
    providerConfig: ProviderConfig
    orders: OrderItem[]
    rating: number
    tags: string[]
    style?: string
  }
}

export type GenDraftsProgress = {
  type: "GEN_DRAFTS_PROGRESS"
  payload: { done: number; total: number; currentOrderKey?: string }
}

export type GenDraftsResult = {
  type: "GEN_DRAFTS_RESULT"
  payload: { drafts: DraftItem[] }
}

export type GenDraftsError = {
  type: "GEN_DRAFTS_ERROR"
  payload: { orderKey?: string; errorMessage: string }
}

export type PlatformFillReview = {
  type: "PLATFORM_FILL_REVIEW"
  payload: { platform: Platform; orderKey: string; text: string; rating: number }
}

export type MessageToBackground = ProviderTest | GenDraftsStart
export type MessageFromBackground = ProviderTestResult | GenDraftsProgress | GenDraftsResult | GenDraftsError

export type MessageToPanel = PlatformOrdersUpdated | MessageFromBackground
export type MessageToContent = PlatformFillReview

export async function sendToBackground<T extends MessageToBackground, R>(msg: T): Promise<R> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (resp) => {
      const err = chrome.runtime.lastError
      if (err) reject(new Error(err.message))
      else resolve(resp as R)
    })
  })
}

