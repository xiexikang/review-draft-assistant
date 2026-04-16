import type { PlatformAdapter } from "../types"

// TODO: 美团平台适配器尚未实现，需要补充 detectContext、extractOrders、fillReview 逻辑
export const meituanAdapter: PlatformAdapter = {
  platform: "meituan",
  detectContext: () => "unknown",
  extractOrders: async () => [],
  fillReview: async () => {},
}

