import type { PlatformAdapter } from "../types"
import { detectJdContext } from "./detect"
import { extractJdOrders } from "./extract"
import { fillJdReview } from "./fill"

export const jdAdapter: PlatformAdapter = {
  platform: "jd",
  detectContext: detectJdContext,
  extractOrders: extractJdOrders,
  fillReview: (doc, text, orderKey, rating) => fillJdReview(doc, text, orderKey, rating),
}
