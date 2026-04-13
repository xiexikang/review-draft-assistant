import type { OrderItem } from "../../shared/types"

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim()
}

function pickTitle(container: Element): string {
  const candidates = [
    container.querySelector(".p-name a, .p-name"),
    container.querySelector("a[href*='item.jd.com'], a[href*='item.m.jd.com']"),
    container.querySelector("[title]"),
    container.querySelector("[class*='title']"),
    container.querySelector("[class*='name']"),
  ]
  for (const c of candidates) {
    const t = text(c)
    // 排除掉纯导航文本，保证抓到的是真实商品名称
    if (t && t.length > 4 && !t.includes("待评价") && !t.includes("已评价")) return t
  }
  return text(container)
}

function stableOrderKey(actionUrl: string | undefined, container: Element, fallback: string): string {
  // 1. 尝试从评价按钮的链接里取 ruleid 或 orderId
  if (actionUrl) {
    try {
      const u = new URL(actionUrl)
      const ruleid = u.searchParams.get("ruleid") || u.searchParams.get("orderId") || u.searchParams.get("oid")
      if (ruleid) return ruleid
      
      const pathMatch = u.pathname.match(/\/(\d{10,})\.html/)
      if (pathMatch) return pathMatch[1]!
    } catch {}
  }

  // 2. 尝试从附近的 DOM 节点（如订单头部）提取订单号
  const orderEl = container.closest('.tr-th, .order-tb tbody, table, .com-item')?.querySelector('.number a, [name="orderIdLinks"], .order-id, span.number')
  if (orderEl) {
    const txt = text(orderEl)
    const match = txt.match(/\d{10,}/)
    if (match) return match[0]
  }

  // 3. 兜底正则提取 actionUrl 中的连续数字
  if (actionUrl) {
    const match = actionUrl.match(/\d{10,}/)
    if (match) return match[0]
  }

  return fallback
}

export async function extractJdOrders(doc: Document): Promise<OrderItem[]> {
  // 找出所有可能是“评价”操作的按钮
  const actionLinks = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a')).filter(a => {
    const txt = text(a)
    if (!txt.includes('评价') && !txt.includes('晒单')) return false
    
    // 关键：排除顶部的导航 Tab（就是图片里看到的“待评价 服务评价”那一行）
    if (a.closest('.mt, .tab, .nav, .menu, .ui-tab, .top, .top-nav')) return false
    
    if (a.classList.contains('btn-def') || a.classList.contains('btn-9')) return true
    if (a.href && (a.href.includes('orderVoucher') || a.href.includes('club.jd.com'))) return true
    
    return false
  })

  const items: OrderItem[] = []
  for (const a of actionLinks) {
    // 找到该评价按钮所属的商品区块/行
    const container = a.closest("tr, tbody, table, .item, .com-item, .order-item, .J-order") ?? a.parentElement ?? a
    
    // 优先从商品链接获取标题
    const titleEl = container.querySelector(".p-name a, a[href*='item.jd.com']")
    const title = titleEl ? text(titleEl) : pickTitle(container)
    
    // 如果标题太短或者是导航词，跳过
    if (!title || title.length < 4 || title.includes("待评价")) continue
    
    const itemUrl = titleEl && (titleEl as HTMLAnchorElement).href ? new URL((titleEl as HTMLAnchorElement).href, location.href).toString() : undefined
    const orderKey = stableOrderKey(a.href, container, title)
    
    const skuEl = container.querySelector('.p-extra, .p-sku, .p-attr, .property')
    const skuText = skuEl ? text(skuEl) : undefined
    
    items.push({ platform: "jd", orderKey, title, itemUrl, skuText })
  }

  const uniq = new Map<string, OrderItem>()
  for (const it of items) uniq.set(it.orderKey, it)
  return Array.from(uniq.values()).slice(0, 50)
}
