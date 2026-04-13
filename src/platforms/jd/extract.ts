import type { OrderItem } from "../../shared/types"

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim()
}

function pickTitle(container: Element): string {
  const candidates = [
    container.querySelector(".p-name a, .p-name"),
    container.querySelector("[title]"),
    container.querySelector("[class*='title']"),
    container.querySelector("[class*='name']"),
    container.querySelector("a[href*='item.jd.com']"),
  ]
  for (const c of candidates) {
    const t = text(c)
    if (t) return t
  }
  return text(container)
}

function stableOrderKey(itemUrl: string | undefined, container: Element, fallback: string): string {
  // Try to find order ID in nearby elements (like order header)
  const orderEl = container.closest('.tr-th, .order-tb tbody')?.querySelector('.number a, [name="orderIdLinks"], .order-id')
  if (orderEl) {
    const txt = text(orderEl)
    const match = txt.match(/\d{10,}/)
    if (match) return match[0]
  }

  if (!itemUrl) return fallback
  try {
    const u = new URL(itemUrl)
    const possible = u.searchParams.get("orderId") || u.searchParams.get("orderid") || u.searchParams.get("oid")
    if (possible) return possible
    
    // Sometimes it's in the path like /evaluate/123456789.html
    const pathMatch = u.pathname.match(/\/(\d{10,})\.html/)
    if (pathMatch) return pathMatch[1]!
    
    return u.toString()
  } catch {
    return itemUrl
  }
}

export async function extractJdOrders(doc: Document): Promise<OrderItem[]> {
  const actionLinks = Array.from(
    doc.querySelectorAll<HTMLAnchorElement>(
      'a[href*="comment"],a[href*="evaluate"],a[href*="mycomments"],a[href*="myComments"],.btn-def'
    ),
  ).filter(a => text(a).includes('评价') || text(a).includes('晒单'))

  const items: OrderItem[] = []
  for (const a of actionLinks) {
    // JD orders are usually in a table row (tr) or a specific item container (.item)
    const container = a.closest("tr, .item, .order, .J-order, .J_item") ?? a.parentElement ?? a
    const title = pickTitle(container)
    if (!title) continue
    const itemUrl = a.href ? new URL(a.href, location.href).toString() : undefined
    const orderKey = stableOrderKey(itemUrl, container, title)
    
    // Try to extract SKU if available
    const skuEl = container.querySelector('.p-extra, .p-sku')
    const skuText = skuEl ? text(skuEl) : undefined
    
    items.push({ platform: "jd", orderKey, title, itemUrl, skuText })
  }

  const uniq = new Map<string, OrderItem>()
  for (const it of items) uniq.set(it.orderKey, it)
  return Array.from(uniq.values()).slice(0, 50)
}

