import type { PlatformAdapter } from "../types"
import { detectTaobaoContext } from "./detect"
import { extractTaobaoOrders } from "./extract"
import { fillTaobaoReview } from "./fill"

export const taobaoAdapter: PlatformAdapter = {
  platform: "taobao",
  detectContext: detectTaobaoContext,
  extractOrders: extractTaobaoOrders,
  fillReview: (doc, text, orderKey, rating, submit) => fillTaobaoReview(doc, text, orderKey, rating, submit),
}
