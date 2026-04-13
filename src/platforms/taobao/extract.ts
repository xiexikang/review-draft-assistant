import type { OrderItem } from "../../shared/types"

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim()
}

function pickTitle(container: Element): string {
  const candidates = [
    container.querySelector("[title]"),
    container.querySelector("[class*='title']"),
    container.querySelector("[class*='name']"),
    container.querySelector("a[href]"),
  ]
  for (const c of candidates) {
    const t = text(c)
    if (t) return t
  }
  return text(container)
}

export async function extractTaobaoOrders(doc: Document): Promise<OrderItem[]> {
  const actionLinks = Array.from(
    doc.querySelectorAll<HTMLAnchorElement>('a[href*="rate"],a[href*="comment"],a[href*="evaluate"]'),
  )

  const items: OrderItem[] = []
  for (const a of actionLinks) {
    const container = a.closest("li, tr, .item, .order, div") ?? a
    const title = pickTitle(container)
    if (!title) continue
    const itemUrl = a.href ? new URL(a.href, location.href).toString() : undefined
    const orderKey = itemUrl ?? title
    items.push({ platform: "taobao", orderKey, title, itemUrl })
  }

  const uniq = new Map<string, OrderItem>()
  for (const it of items) uniq.set(it.orderKey, it)
  return Array.from(uniq.values()).slice(0, 50)
}

