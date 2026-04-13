import type { OrderItem } from "../shared/types"

export function buildPrompt(args: {
  order: OrderItem
  rating: number
  tags: string[]
  style?: string
}): string {
  const { order, rating, tags, style } = args
  const tagText = tags.length ? `tags: ${tags.join(", ")}` : "tags: (none)"
  const styleText = style?.trim() ? `style: ${style.trim()}` : "style: (default)"
  return [
    "请根据订单信息生成三条中文评价草稿（短/中/长），只基于订单信息与 tags 明确事实，不编造使用时长、功效、夸大承诺；三条草稿表达必须明显不同。",
    "输出必须是严格 JSON 数组，且只输出 JSON，不要输出任何多余文本。",
    "数组每一项字段固定：orderKey, rating, draft_short, draft_mid, draft_long。",
    `orderKey: ${order.orderKey}`,
    `title: ${order.title}`,
    order.skuText ? `skuText: ${order.skuText}` : "skuText: (none)",
    tagText,
    styleText,
    `rating: ${rating}`,
    "输出示例：[{\"orderKey\":\"...\",\"rating\":5,\"draft_short\":\"...\",\"draft_mid\":\"...\",\"draft_long\":\"...\"}]",
  ].join("\n")
}

