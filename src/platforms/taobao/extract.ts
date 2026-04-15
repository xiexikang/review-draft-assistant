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
  const items: OrderItem[] = []

  // 1. 旧版结构：通过“评价”链接反查订单
  const actionLinks = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a')).filter(a => {
    const txt = text(a)
    if (!txt.includes('评价') && !txt.includes('追加评价')) return false
    if (a.closest('.nav, .tab, .menu, .header, .top')) return false
    if (txt === '评价管理') return false // 排除导航栏等处的“评价管理”按钮
    if (a.href && (a.href.includes('rate.taobao.com') || a.href.includes('rate.tmall.com'))) return true
    if (a.classList.contains('btn-review') || a.classList.contains('J_MakePoint')) return true
    return false
  })

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

  // 2. 新版结构（React DOM）：遍历订单容器 trade-bought-list-order-container
  const newContainers = Array.from(doc.querySelectorAll('.trade-bought-list-order-container'))
  for (const container of newContainers) {
    // 找到所有“评价”按钮（可能是 div 模拟的按钮）
    const ops = Array.from(container.querySelectorAll('.tbpc_boughtlist_orderItem_order_op'))
    const hasReviewBtn = ops.some(op => text(op).includes('评价') || text(op).includes('追加评价'))
    if (!hasReviewBtn) continue

    // 提取订单号
    let orderKey = ""
    const orderIdEl = container.querySelector('.shopInfoOrderId--CVDgDEO2')
    if (orderIdEl) {
      const match = text(orderIdEl).match(/\d{15,}/)
      if (match) orderKey = match[0]
    }
    if (!orderKey) continue

    // 提取商品标题和链接
    const titleEl = container.querySelector('.titleText--W0CIPGbq')
    const title = titleEl ? text(titleEl) : ""
    if (!title) continue
    
    const itemLinkEl = container.querySelector('.title--pLEC2yiw') as HTMLAnchorElement | null
    const itemUrl = itemLinkEl?.href ? new URL(itemLinkEl.href, location.href).toString() : undefined

    // 提取 SKU 信息
    const skuEl = container.querySelector('.infoContent--bykGfoHq')
    const skuText = skuEl ? text(skuEl) : undefined

    // 提取图片
    const imgEl = container.querySelector('.image--qmstcRYr') as HTMLElement | null
    let imageUrl = undefined
    if (imgEl && imgEl.style.backgroundImage) {
      const bgMatch = imgEl.style.backgroundImage.match(/url\("?(.*?)"?\)/)
      if (bgMatch && bgMatch[1]) {
        imageUrl = bgMatch[1]
        if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl
      }
    }

    // 拼凑评价页 URL
    // 如果商品链接包含 detail.tmall.com，则使用天猫评价链接，否则使用默认的淘宝评价链接
    const isTmall = itemUrl && itemUrl.includes('detail.tmall.com')
    const reviewUrl = isTmall 
      ? `https://ratewrite.tmall.com/rate_detail.htm?tradeID=${orderKey}`
      : `https://rate.taobao.com/app/rate/index.htm?tradeId=${orderKey}`

    items.push({ platform: "taobao", orderKey, title, itemUrl, reviewUrl, imageUrl, skuText })
  }

  const uniq = new Map<string, OrderItem>()
  for (const it of items) uniq.set(it.orderKey, it)
  return Array.from(uniq.values()).slice(0, 50)
}
