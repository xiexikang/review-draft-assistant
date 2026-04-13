import type { PlatformAdapter } from "../types"

export const douyinAdapter: PlatformAdapter = {
  platform: "douyin",
  detectContext: () => "unknown",
  extractOrders: async () => [],
  fillReview: async () => {},
}

