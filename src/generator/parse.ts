import type { DraftItem } from "../shared/types"

function toDraftItem(item: any): DraftItem | null {
  if (!item || typeof item !== "object") return null
  if (typeof item.draft_short !== "string") return null
  if (typeof item.draft_mid !== "string") return null
  if (typeof item.draft_long !== "string") return null
  return {
    orderKey: typeof item.orderKey === "string" ? item.orderKey : "",
    rating: typeof item.rating === "number" ? item.rating : 0,
    draft_short: item.draft_short,
    draft_mid: item.draft_mid,
    draft_long: item.draft_long,
  }
}

export function parseDrafts(text: string): DraftItem[] {
  const trimmed = text.trim()

  try {
    const jsonStart = trimmed.indexOf("[")
    const jsonEnd = trimmed.lastIndexOf("]")
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonText = trimmed.slice(jsonStart, jsonEnd + 1)
      const data = JSON.parse(jsonText) as any
      const arr = Array.isArray(data) ? data : [data]
      const out: DraftItem[] = []
      for (const item of arr) {
        const draft = toDraftItem(item)
        if (draft) out.push(draft)
      }
      if (out.length === 0) throw new Error("模型输出缺少草稿字段")
      return out
    }

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const obj = JSON.parse(trimmed) as any
      const draft = toDraftItem(obj)
      if (draft) return [draft]
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("模型输出")) throw e
    throw new Error(`模型输出 JSON 解析失败：${e instanceof Error ? e.message : "未知错误"}`)
  }

  throw new Error("模型输出不是可解析的 JSON 草稿")
}
