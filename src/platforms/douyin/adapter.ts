import type { PlatformAdapter } from "../types"

// TODO: 抖音平台适配器尚未实现，需要补充 detectContext、extractOrders、fillReview 逻辑
export const douyinAdapter: PlatformAdapter = {
  platform: "douyin",
  detectContext: () => "unknown",
  extractOrders: async () => [],
  fillReview: async () => {},
}

