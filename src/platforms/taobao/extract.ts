import type { OrderItem } from "../../shared/types"

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim()
}

function pickTitle(container: Element): string {
  const candidates = [
    container.querySelector(".item-title, .title a, .product-title"),
    container.querySelector("[title]"),
    container.querySelector("[class*='title']"),
    container.querySelector("[class*='name']"),
    container.querySelector("a[href*='item.htm']"),
  ]
  for (const c of candidates) {
    const t = text(c)
    if (t) return t
  }
  return text(container)
}

function stableOrderKey(itemUrl: string | undefined, container: Element, fallback: string): string {
  // Look for order ID in the table or container
  const orderEl = container.closest('table, .order-item, .item')?.querySelector('.order-info, .order-num, [class*="orderId"]')
  if (orderEl) {
    const match = text(orderEl).match(/\d{15,}/)
    if (match) return match[0]
  }

  if (!itemUrl) return fallback
  try {
    const u = new URL(itemUrl)
    const possible = u.searchParams.get("trade_id") || u.searchParams.get("tradeId") || u.searchParams.get("orderId") || u.searchParams.get("id")
    if (possible) return possible
    return u.toString()
  } catch {
    return itemUrl
  }
}

export async function extractTaobaoOrders(doc: Document): Promise<OrderItem[]> {
  const actionLinks = Array.from(
    doc.querySelectorAll<HTMLAnchorElement>('a[href*="rate"],a[href*="comment"],a[href*="evaluate"],.btn-review,.J_MakePoint')
  ).filter(a => text(a).includes('评价') || text(a).includes('追加评价'))

  const items: OrderItem[] = []
  for (const a of actionLinks) {
    const container = a.closest("tr, .item, .order, .order-item, .suborder") ?? a.parentElement ?? a
    const title = pickTitle(container)
    if (!title) continue
    const itemUrl = a.href ? new URL(a.href, location.href).toString() : undefined
    const orderKey = stableOrderKey(itemUrl, container, title)
    
    // Extract SKU details
    const skuEl = container.querySelector('.sku, .props, .spec')
    const skuText = skuEl ? text(skuEl) : undefined
    
    items.push({ platform: "taobao", orderKey, title, itemUrl, skuText })
  }

  const uniq = new Map<string, OrderItem>()
  for (const it of items) uniq.set(it.orderKey, it)
  return Array.from(uniq.values()).slice(0, 50)
}

