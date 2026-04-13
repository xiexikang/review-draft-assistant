function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event("input", { bubbles: true }))
  el.dispatchEvent(new Event("change", { bubbles: true }))
}

export async function fillJdReview(doc: Document, text: string, orderKey?: string): Promise<void> {
  let textarea: HTMLTextAreaElement | HTMLInputElement | null = null
  
  if (orderKey) {
    // 尝试根据 sku 匹配对应的评价框 (例如 orderKey 为 3465490006541174-100087006483)
    const parts = orderKey.split('-')
    const sku = parts[1] || parts[0]
    if (sku) {
      const link = doc.querySelector(`a[href*="${sku}.html"], a[href*="${sku}"]`)
      const container = link?.closest('.form-item, .comm-box, .item, .goods-info')
      if (container) {
        textarea = (container.querySelector("textarea") as HTMLTextAreaElement | null) ??
                   (container.querySelector("input[type='text']") as HTMLInputElement | null)
      }
    }
  }

  // 兜底：如果没匹配到，或者只有一个输入框，取第一个
  if (!textarea) {
    textarea = (doc.querySelector("textarea") as HTMLTextAreaElement | null) ??
               (doc.querySelector("input[type='text']") as HTMLInputElement | null)
  }

  if (!textarea) throw new Error("未找到输入框")
  setNativeValue(textarea, text)
  textarea.focus()
}

