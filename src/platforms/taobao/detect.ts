import type { Context } from "../../shared/types"

export function detectTaobaoContext(tabUrl: string, doc: Document): Context {
  const url = tabUrl
  if (url.includes("rate") || url.includes("comment") || url.includes("evaluate")) {
    return "review_page"
  }

  if (url.includes("rate") || url.includes("comment") || url.includes("bought")) {
    const hasRateEntry = Boolean(
      doc.querySelector('a[href*="rate"],a[href*="comment"],a[href*="evaluate"]'),
    )
    if (hasRateEntry) return "order_list_pending_review"
  }

  const hasLikelyList = Boolean(doc.querySelector('a[href*="rate"],a[href*="comment"],a[href*="evaluate"]'))
  if (hasLikelyList) return "order_list_pending_review"

  return "unknown"
}

