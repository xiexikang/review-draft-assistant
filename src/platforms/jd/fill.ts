function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event("input", { bubbles: true }))
  el.dispatchEvent(new Event("change", { bubbles: true }))
}

export async function fillJdReview(doc: Document, text: string, orderKey?: string, rating?: number): Promise<void> {
  let textarea: HTMLTextAreaElement | HTMLInputElement | null = null
  let targetContainer: Element | null = null
  
  if (orderKey) {
    // 尝试根据 sku 匹配对应的评价框 (例如 orderKey 为 3465490006541174-100087006483)
    const parts = orderKey.split('-')
    const sku = parts[1] || parts[0]
    if (sku) {
      // 匹配商品链接、或者商品图片的 data-lazy-img / src，或者评价容器本身的 class
      const link = doc.querySelector(`a[href*="${sku}.html"], a[href*="${sku}"], .product-${sku}, [productid="${sku}"]`)
      targetContainer = link?.closest('.f-item, .f-goods, .form-item, .comm-box, .item, .goods-info') ?? null
      if (targetContainer) {
        textarea = (targetContainer.querySelector("textarea") as HTMLTextAreaElement | null) ??
                   (targetContainer.querySelector("input[type='text']") as HTMLInputElement | null)
      }
    }
  }

  // 兜底：如果没匹配到，或者只有一个输入框，取第一个
  if (!textarea) {
    textarea = (doc.querySelector("textarea") as HTMLTextAreaElement | null) ??
               (doc.querySelector("input[type='text']") as HTMLInputElement | null)
    if (textarea) {
      targetContainer = textarea.closest('.f-item, .f-goods, .form-item, .comm-box, .item, .goods-info') ?? doc.body
    }
  }

  if (!textarea) throw new Error("未找到输入框")
  setNativeValue(textarea, text)
  textarea.focus()

  // 自动打分
  if (rating && targetContainer) {
    // 京东的星星选择器，通常在 .commstar .starX 上
    // 寻找商品评价、服务评价、物流评价等所有的星星组
    const starGroups = targetContainer.querySelectorAll('.commstar')
    for (const group of Array.from(starGroups)) {
      const targetStar = group.querySelector(`.star${rating}`) as HTMLElement | null
      if (targetStar) {
        targetStar.click()
      }
    }
    
    // 全局兜底：有些店铺/物流的评分不在单个商品里，而是在外层通用的 .f-service 区块里
    const globalStarGroups = doc.querySelectorAll('.f-service .commstar, .service-box .commstar')
    for (const group of Array.from(globalStarGroups)) {
      const targetStar = group.querySelector(`.star${rating}`) as HTMLElement | null
      if (targetStar) {
        targetStar.click()
      }
    }
  }
}

