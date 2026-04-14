import type { Context } from "../../shared/types"

export function detectJdContext(tabUrl: string, doc: Document): Context {
  const url = tabUrl.toLowerCase()
  
  // 具体的评价填写页面
  if (url.includes("ordervoucher.action") || url.includes("club.jd.com/review") || url.includes("appendcomment.action")) {
    return "review_page"
  }
  
  // 待评价列表页面
  if (url.includes("myjdcomment.action") || url.includes("mycomments") || url.includes("order.jd.com")) {
    return "order_list_pending_review"
  }

  // 兜底检测
  const hasReviewForm = Boolean(doc.querySelector('.mycomment-form, .f-textarea textarea'))
  if (hasReviewForm) return "review_page"

  const hasLikelyList = Boolean(
    doc.querySelector('a[href*="orderVoucher.action"], a[href*="myJdcomment.action"]')
  )
  if (hasLikelyList) return "order_list_pending_review"

  return "unknown"
}

