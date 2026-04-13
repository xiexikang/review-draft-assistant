import type { Context } from "../../shared/types"

export function detectJdContext(tabUrl: string, doc: Document): Context {
  const url = tabUrl
  if (url.includes("comment") || url.includes("evaluate") || url.includes("rate")) {
    return "review_page"
  }
  if (url.includes("mycomments") || url.includes("myComments") || url.includes("comment")) {
    return "order_list_pending_review"
  }

  const hasLikelyList = Boolean(
    doc.querySelector(
      'a[href*="comment"],a[href*="evaluate"],a[href*="mycomments"],a[href*="myComments"]',
    ),
  )
  if (hasLikelyList) return "order_list_pending_review"

  return "unknown"
}

