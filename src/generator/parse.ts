import type { DraftItem } from "../shared/types"

export function parseDrafts(text: string): DraftItem[] {
  const trimmed = text.trim()
  const jsonStart = trimmed.indexOf("[")
  const jsonEnd = trimmed.lastIndexOf("]")
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) throw new Error("模型输出不是 JSON 数组")
  const jsonText = trimmed.slice(jsonStart, jsonEnd + 1)
  const data = JSON.parse(jsonText) as any
  if (!Array.isArray(data)) throw new Error("JSON 不是数组")
  const out: DraftItem[] = []
  for (const item of data) {
    if (!item || typeof item !== "object") throw new Error("数组项不是对象")
    if (typeof item.orderKey !== "string") throw new Error("orderKey 缺失")
    if (typeof item.rating !== "number") throw new Error("rating 缺失")
    if (typeof item.draft_short !== "string") throw new Error("draft_short 缺失")
    if (typeof item.draft_mid !== "string") throw new Error("draft_mid 缺失")
    if (typeof item.draft_long !== "string") throw new Error("draft_long 缺失")
    out.push(item as DraftItem)
  }
  return out
}

