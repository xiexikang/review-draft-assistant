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

function stableOrderKey(itemUrl: string | undefined, fallback: string): string {
  if (!itemUrl) return fallback
  try {
    const u = new URL(itemUrl)
    const possible = u.searchParams.get("orderId") || u.searchParams.get("orderid") || u.searchParams.get("oid")
    if (possible) return possible
    return u.toString()
  } catch {
    return itemUrl
  }
}

export async function extractJdOrders(doc: Document): Promise<OrderItem[]> {
  const actionLinks = Array.from(
    doc.querySelectorAll<HTMLAnchorElement>(
      'a[href*="comment"],a[href*="evaluate"],a[href*="mycomments"],a[href*="myComments"]',
    ),
  )

  const items: OrderItem[] = []
  for (const a of actionLinks) {
    const container = a.closest("li, tr, .item, .order, .J-order, .J_item, div") ?? a
    const title = pickTitle(container)
    if (!title) continue
    const itemUrl = a.href ? new URL(a.href, location.href).toString() : undefined
    const orderKey = stableOrderKey(itemUrl, title)
    items.push({ platform: "jd", orderKey, title, itemUrl })
  }

  const uniq = new Map<string, OrderItem>()
  for (const it of items) uniq.set(it.orderKey, it)
  return Array.from(uniq.values()).slice(0, 50)
}

