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
      targetContainer = link?.closest('.rate-item, .item, .comment-box, .box') ?? null
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
      targetContainer = textarea.closest('.rate-item, .item, .comment-box, .box') ?? doc.body
    }
  }

  if (!textarea) throw new Error("未找到输入框")
  setNativeValue(textarea, text)
  textarea.focus()

  if (rating && targetContainer) {
    // 淘宝的星星选择器，通常在类似 ul.rate-star 或 .stars-wrap 下的 li / i
    const starGroups = targetContainer.querySelectorAll('.rate-star, .stars-wrap, [class*="star"]')
    for (const group of Array.from(starGroups)) {
      // 淘宝可能是 li:nth-child(n) 或 i:nth-child(n)
      const stars = Array.from(group.querySelectorAll('li, i, span.star')) as HTMLElement[]
      if (stars.length >= 5) {
        const targetStar = stars[rating - 1]
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

