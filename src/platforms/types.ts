import type { Context, OrderItem, Platform } from "../shared/types"

export type PlatformAdapter = {
  platform: Exclude<Platform, "unknown">
  detectContext: (tabUrl: string, doc: Document) => Context
  extractOrders: (doc: Document) => Promise<OrderItem[]>
  fillReview: (doc: Document, text: string, orderKey?: string) => Promise<void>
}

