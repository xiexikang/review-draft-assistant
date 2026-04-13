import type { PlatformAdapter } from "../types"

export const meituanAdapter: PlatformAdapter = {
  platform: "meituan",
  detectContext: () => "unknown",
  extractOrders: async () => [],
  fillReview: async () => {},
}

