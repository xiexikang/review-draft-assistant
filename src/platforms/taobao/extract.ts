import type { OrderItem } from "../../shared/types"

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim()
}

function pickTitle(container: Element): string {
  const candidates = [
    container.querySelector(".item-title, .title a, .product-title, .baobei-name"),
    container.querySelector("a[href*='item.htm'], a[href*='detail.tmall.com']"),
    container.querySelector("[title]"),
    container.querySelector("[class*='title']"),
    container.querySelector("[class*='name']"),
  ]
  for (const c of candidates) {
    const t = text(c)
    if (t && t.length > 4 && !t.includes("评价")) return t
  }
  return text(container)
}

function stableOrderKey(actionUrl: string | undefined, container: Element, fallback: string): string {
  if (actionUrl) {
    try {
      const u = new URL(actionUrl)
      const possible = u.searchParams.get("trade_id") || u.searchParams.get("tradeId") || u.searchParams.get("orderId") || u.searchParams.get("id") || u.searchParams.get("bizOrderId")
      if (possible) return possible
    } catch {}
  }

  const orderEl = container.closest('table, .order-item, .item, tbody')?.querySelector('.order-info, .order-num, [class*="orderId"], .number')
  if (orderEl) {
    const match = text(orderEl).match(/\d{15,}/)
    if (match) return match[0]
  }

  if (actionUrl) {
    const match = actionUrl.match(/\d{15,}/)
    if (match) return match[0]
  }

  return fallback
}

export async function extractTaobaoOrders(doc: Document): Promise<OrderItem[]> {
  const actionLinks = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a')).filter(a => {
    const txt = text(a)
    if (!txt.includes('评价') && !txt.includes('追加评价')) return false
    
    if (a.closest('.nav, .tab, .menu, .header, .top')) return false
    
    if (a.href && (a.href.includes('rate.taobao.com') || a.href.includes('rate.tmall.com'))) return true
    if (a.classList.contains('btn-review') || a.classList.contains('J_MakePoint')) return true
    
    return false
  })

  const items: OrderItem[] = []
  for (const a of actionLinks) {
    const container = a.closest("tr, tbody, table, .item, .order, .order-item, .suborder") ?? a.parentElement ?? a
    
    const titleEl = container.querySelector(".item-title, .baobei-name, a[href*='item.htm'], a[href*='detail.tmall.com']")
    const title = titleEl ? text(titleEl) : pickTitle(container)
    
    if (!title || title.length < 4 || title.includes("待评价")) continue
    
    const itemUrl = titleEl && (titleEl as HTMLAnchorElement).href ? new URL((titleEl as HTMLAnchorElement).href, location.href).toString() : undefined
    const reviewUrl = a.href ? new URL(a.href, location.href).toString() : undefined
    const orderKey = stableOrderKey(a.href, container, title)
    
    const skuEl = container.querySelector('.sku, .props, .spec, .spec-info')
    const skuText = skuEl ? text(skuEl) : undefined
    
    const imgEl = container.querySelector('.item-pic img, .p-img img, .pic img, img') as HTMLImageElement | null
    let imageUrl = imgEl?.getAttribute('data-src') || imgEl?.getAttribute('src') || imgEl?.src || undefined
    if (imageUrl && imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl
    
    items.push({ platform: "taobao", orderKey, title, itemUrl, reviewUrl, imageUrl, skuText })
  }

  const uniq = new Map<string, OrderItem>()
  for (const it of items) uniq.set(it.orderKey, it)
  return Array.from(uniq.values()).slice(0, 50)
}
