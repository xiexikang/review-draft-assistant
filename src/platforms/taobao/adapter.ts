import type { PlatformAdapter } from "../types"

export const taobaoAdapter: PlatformAdapter = {
  platform: "taobao",
  detectContext: () => "unknown",
  extractOrders: async () => [],
  fillReview: async () => {},
}

