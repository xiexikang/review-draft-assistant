import type { PlatformAdapter } from "../types"

export const jdAdapter: PlatformAdapter = {
  platform: "jd",
  detectContext: () => "unknown",
  extractOrders: async () => [],
  fillReview: async () => {},
}

