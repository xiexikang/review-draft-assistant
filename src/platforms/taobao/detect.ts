import type { Context } from "../../shared/types"

export function detectTaobaoContext(tabUrl: string, doc: Document): Context {
  const url = tabUrl.toLowerCase()
  
  // 具体的评价填写页面
  if (
    url.includes("rate.taobao.com/appendrate.htm") ||
    url.includes("rate.taobao.com/rate.htm") ||
    url.includes("rate.taobao.com/remarkseller") ||
    url.includes("rate.tmall.com/rate.htm") ||
    url.includes("ratewrite.tmall.com/rate_detail.htm")
  ) {
    return "review_page"
  }
  
  // 待评价列表页面
  if (url.includes("myrate.htm") || url.includes("list_bought_items.htm")) {
    return "order_list_pending_review"
  }

  // 兜底检测
  const hasReviewForm = Boolean(doc.querySelector('textarea, .rate-item, .rate-box, .comment-box, form#rateListForm'))
  if (hasReviewForm) return "review_page"

  const hasLikelyList = Boolean(doc.querySelector('a[href*="rate.htm"], a[href*="appendRate.htm"], a[href*="remarkSeller"]'))
  if (hasLikelyList) return "order_list_pending_review"

  return "unknown"
}
