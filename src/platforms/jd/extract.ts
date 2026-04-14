import type { OrderItem } from "../../shared/types"

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim()
}

export async function extractJdOrders(doc: Document): Promise<OrderItem[]> {
  const items: OrderItem[] = []
  
  // 京东订单列表页 (order.jd.com) 的结构通常是一个 table.order-tb，每个订单对应一个/多个 tbody
  // 每个订单包含一个 header tr.tr-th（里面有订单号）和至少一个商品行 tr.tr-bd
  const tbodys = Array.from(doc.querySelectorAll<HTMLTableSectionElement>('table.order-tb tbody[id^="tb-"]'))
  
  for (const tbody of tbodys) {
    // 提取订单号
    const orderIdEl = tbody.querySelector('.number a[name="orderIdLinks"], .number [id^="idUrl"]')
    let orderKey = ""
    if (orderIdEl) {
      orderKey = text(orderIdEl)
    } else {
      // 兜底：尝试从 tbody ID 中提取
      const match = tbody.id.match(/\d{10,}/)
      if (match) orderKey = match[0]
    }
    if (!orderKey) continue

    // 查找该 tbody 下的所有商品行
    const productRows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>('tr.tr-bd'))
    
    for (const row of productRows) {
      // 查找商品链接和名称
      const nameEl = row.querySelector('.p-name a') as HTMLAnchorElement | null
      if (!nameEl) continue
      
      const title = text(nameEl)
      if (!title || title.length < 2) continue
      
      const itemUrl = nameEl.href ? new URL(nameEl.href, location.href).toString() : undefined
      
      // 查找商品规格（如果有）
      const skuEl = row.querySelector('.p-extra .o-info')
      const skuText = skuEl ? text(skuEl) : undefined
      
      // 检查当前行是否有关联的“评价”按钮
      // 这里不严格要求按钮必须存在，因为有些商品可能已评价/评价过期，
      // 但为了只收集“待评价”商品，我们检查操作区是否有“评价”相关字眼。
      // 对于纯待评价列表，也可以假设出现的都是需要评价的。
      const operateEl = row.querySelector('.operate') || tbody.querySelector('.operate')
      const operateText = text(operateEl)
      
      // 注意：有些页面结构是把“评价”按钮放在订单级别，有些放在商品级别
      // 只要能抓到这个订单的商品，就加进去。
      // 我们可以在这里简单过滤一下那些明显写了“已评价”的行，但通常在“待评价”tab下都是可以评价的
      if (operateText && operateText.includes("已评价")) continue
      
      // 如果没有专门的评价字眼，但页面 URL 本身就是待评价列表，也放行
      
      // 为了保证能被 Side Panel 使用，我们以 sku 为维度拆分 draft（或者退一步按 orderKey）
      // 这里用 orderKey 加上商品后缀防止同订单多商品覆盖
      // 但由于当前系统 Draft 结构主要是 orderKey 映射，我们可能需要保证 orderKey 的唯一性，
      // 如果一个订单有多个商品，为了简单起见，可以给 orderKey 加个商品 ID 后缀
      let uniqueOrderKey = orderKey
      if (itemUrl) {
        const skuMatch = itemUrl.match(/(\d+)\.html/)
        if (skuMatch) uniqueOrderKey = `${orderKey}-${skuMatch[1]}`
      }
      
      const reviewBtn = operateEl?.querySelector('a[href*="orderVoucher.action"], a[href*="myJdcomment.action"], a[href*="club.jd.com"]') as HTMLAnchorElement | null
      const reviewUrl = reviewBtn?.href ? new URL(reviewBtn.href, location.href).toString() : undefined
      
      const imgEl = row.querySelector('.p-img img, .goods-item img, img') as HTMLImageElement | null
      let imageUrl = imgEl?.getAttribute('data-lazy-img') || imgEl?.getAttribute('src') || imgEl?.src || undefined
      // 处理 src 可能存在的协议缺失或者包含懒加载占位图（比如 //misc.360buyimg.com/lib/img/e/blank.gif）
      if (imageUrl && imageUrl.includes('blank.gif')) {
        imageUrl = imgEl?.getAttribute('data-lazy-img') || undefined
      }
      if (imageUrl && imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl
      
      items.push({ 
        platform: "jd", 
        orderKey: uniqueOrderKey, // 使用唯一 Key
        title, 
        itemUrl, 
        reviewUrl,
        imageUrl,
        skuText 
      })
    }
  }

  // 如果上面的方法没抓到任何数据（可能在特殊的评价中心页面，结构不同）
  // 兜底策略：查找所有可能带评价的商品单元
  if (items.length === 0) {
    const backupContainers = Array.from(doc.querySelectorAll('.com-item, .order-item, .goods-item'))
    for (const container of backupContainers) {
      const nameEl = container.querySelector('.p-name a, .name a, .title a') as HTMLAnchorElement | null
      if (!nameEl) continue
      
      const title = text(nameEl)
      if (!title) continue
      
      const itemUrl = nameEl.href ? new URL(nameEl.href, location.href).toString() : undefined
      const reviewBtn = container.querySelector('a[href*="comment"], a[href*="evaluate"]') as HTMLAnchorElement | null
      const reviewUrl = reviewBtn?.href ? new URL(reviewBtn.href, location.href).toString() : undefined
      
      const imgEl = container.querySelector('.p-img img, .goods-item img, img') as HTMLImageElement | null
      let imageUrl = imgEl?.getAttribute('data-lazy-img') || imgEl?.getAttribute('src') || imgEl?.src || undefined
      if (imageUrl && imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl
      
      // 尝试找订单号
      let orderKey = ""
      const orderEl = container.closest('.order, .item')?.querySelector('.order-id, .number')
      if (orderEl) {
        const match = text(orderEl).match(/\d{10,}/)
        if (match) orderKey = match[0]
      }
      
      if (!orderKey && itemUrl) {
        const match = itemUrl.match(/\d{10,}/)
        if (match) orderKey = match[0]
      }
      if (!orderKey) orderKey = title.slice(0, 15) // 最后兜底
      
      items.push({ platform: "jd", orderKey, title, itemUrl, reviewUrl, imageUrl })
    }
  }

  const uniq = new Map<string, OrderItem>()
  for (const it of items) uniq.set(it.orderKey, it)
  return Array.from(uniq.values()).slice(0, 50)
}
