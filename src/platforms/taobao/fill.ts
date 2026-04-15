function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event("input", { bubbles: true }))
  el.dispatchEvent(new Event("change", { bubbles: true }))
}

export async function fillTaobaoReview(doc: Document, text: string, orderKey?: string, rating?: number, submit?: boolean): Promise<void> {
  let textarea: HTMLTextAreaElement | HTMLInputElement | null = null
  let targetContainer: Element | null = null

  if (orderKey) {
    const parts = orderKey.split('-')
    const sku = parts[1] || parts[0]
    if (sku) {
      const link = doc.querySelector(`a[href*="${sku}.htm"], a[href*="${sku}"]`)
      targetContainer = link?.closest('.rate-item, .item, .comment-box, .box, .compose-order') ?? null
      if (targetContainer) {
        textarea = (targetContainer.querySelector("textarea") as HTMLTextAreaElement | null) ??
                   (targetContainer.querySelector("input[type='text']") as HTMLInputElement | null)
      }
    }
  }

  // 尝试直接通过天猫特有的 data-bizoid 定位容器
  if (!textarea && orderKey) {
    const parts = orderKey.split('-')
    const tradeId = parts[0]
    if (tradeId) {
      targetContainer = doc.querySelector(`.compose-order[data-bizoid="${tradeId}"]`)
      if (targetContainer) {
        textarea = (targetContainer.querySelector("textarea") as HTMLTextAreaElement | null) ??
                   (targetContainer.querySelector("input[type='text']") as HTMLInputElement | null)
      }
    }
  }

  if (!textarea) {
    textarea = (doc.querySelector("textarea") as HTMLTextAreaElement | null) ??
               (doc.querySelector("input[type='text']") as HTMLInputElement | null)
    if (textarea) {
      targetContainer = textarea.closest('.rate-item, .item, .comment-box, .box, .compose-order') ?? doc.body
    }
  }

  if (!textarea) throw new Error("未找到输入框")
  setNativeValue(textarea, text)
  textarea.focus()

  if (rating && targetContainer) {
    // 1. 旧版淘宝的星星选择器，通常在类似 ul.rate-star 或 .stars-wrap 下的 li / i
    const oldStarGroups = targetContainer.querySelectorAll('.rate-star, .stars-wrap, [class*="star"]')
    for (const group of Array.from(oldStarGroups)) {
      const stars = Array.from(group.querySelectorAll('li, i, span.star')) as HTMLElement[]
      if (stars.length >= 5) {
        const targetStar = stars[rating - 1]
        if (targetStar) {
          targetStar.click()
        }
      }
    }

    // 2. 新版天猫 / 淘宝的星星选择器：.tm-rating-star-list 下的 div.J_ratingStar
    const newStarGroups = targetContainer.querySelectorAll('.tm-rating-star-list, .rate-star-list')
    for (const group of Array.from(newStarGroups)) {
      // 获取当前星级组下的所有星星（可能是 data-star-value=1,2,3,4,5）
      const stars = Array.from(group.querySelectorAll('.J_ratingStar, [data-star-value]')) as HTMLElement[]
      // 为了安全，过滤出真正带 data-star-value 或者是按顺序的星标
      if (stars.length >= 5) {
        // 寻找符合 rating 数值的元素
        const targetStar = stars.find(s => s.getAttribute('data-star-value') === String(rating)) || stars[rating - 1]
        if (targetStar) {
          targetStar.click()
        }
      }
    }
  }

  if (submit) {
    setTimeout(() => {
      // 淘宝的发表按钮
      const submitBtn = doc.querySelector('.J_SubmitReview, button[type="submit"], .btn-submit, .submit') as HTMLElement | null
      if (submitBtn) {
        submitBtn.click()
      }
    }, 500)
  }
}

