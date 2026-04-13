function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event("input", { bubbles: true }))
  el.dispatchEvent(new Event("change", { bubbles: true }))
}

export async function fillTaobaoReview(doc: Document, text: string, orderKey?: string): Promise<void> {
  let textarea: HTMLTextAreaElement | HTMLInputElement | null = null

  if (orderKey) {
    const parts = orderKey.split('-')
    const sku = parts[1] || parts[0]
    if (sku) {
      const link = doc.querySelector(`a[href*="${sku}.htm"], a[href*="${sku}"]`)
      const container = link?.closest('.rate-item, .item, .comment-box, .box')
      if (container) {
        textarea = (container.querySelector("textarea") as HTMLTextAreaElement | null) ??
                   (container.querySelector("input[type='text']") as HTMLInputElement | null)
      }
    }
  }

  if (!textarea) {
    textarea = (doc.querySelector("textarea") as HTMLTextAreaElement | null) ??
               (doc.querySelector("input[type='text']") as HTMLInputElement | null)
  }

  if (!textarea) throw new Error("未找到输入框")
  setNativeValue(textarea, text)
  textarea.focus()
}

