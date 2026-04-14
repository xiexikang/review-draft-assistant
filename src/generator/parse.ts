import type { DraftItem } from "../shared/types"

export function parseDrafts(text: string): DraftItem[] {
  const trimmed = text.trim()
  const jsonStart = trimmed.indexOf("[")
  const jsonEnd = trimmed.lastIndexOf("]")
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    const jsonText = trimmed.slice(jsonStart, jsonEnd + 1)
    const data = JSON.parse(jsonText) as any
    const arr = Array.isArray(data) ? data : [data]
    const out: DraftItem[] = []
    for (const item of arr) {
      if (!item || typeof item !== "object") continue
      if (typeof item.draft_short !== "string") continue
      if (typeof item.draft_mid !== "string") continue
      if (typeof item.draft_long !== "string") continue
      out.push({
        orderKey: typeof item.orderKey === "string" ? item.orderKey : "",
        rating: typeof item.rating === "number" ? item.rating : 0,
        draft_short: item.draft_short,
        draft_mid: item.draft_mid,
        draft_long: item.draft_long,
      })
    }
    if (out.length === 0) throw new Error("模型输出缺少草稿字段")
    return out
  }
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const obj = JSON.parse(trimmed) as any
    if (obj && typeof obj === "object") {
      const item = obj
      if (
        typeof item.draft_short === "string" &&
        typeof item.draft_mid === "string" &&
        typeof item.draft_long === "string"
      ) {
        return [
          {
            orderKey: typeof item.orderKey === "string" ? item.orderKey : "",
            rating: typeof item.rating === "number" ? item.rating : 0,
            draft_short: item.draft_short,
            draft_mid: item.draft_mid,
            draft_long: item.draft_long,
          },
        ]
      }
    }
  }
  throw new Error("模型输出不是可解析的 JSON 草稿")
}
