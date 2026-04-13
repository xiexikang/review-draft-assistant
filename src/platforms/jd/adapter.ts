import type { PlatformAdapter } from "../types"
import { detectJdContext } from "./detect"
import { extractJdOrders } from "./extract"

export const jdAdapter: PlatformAdapter = {
  platform: "jd",
  detectContext: detectJdContext,
  extractOrders: extractJdOrders,
  fillReview: async () => {},
}
