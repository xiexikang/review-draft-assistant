function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event("input", { bubbles: true }))
  el.dispatchEvent(new Event("change", { bubbles: true }))
}

export async function fillJdReview(doc: Document, text: string): Promise<void> {
  const textarea =
    (doc.querySelector("textarea") as HTMLTextAreaElement | null) ??
    (doc.querySelector("input[type='text']") as HTMLInputElement | null)
  if (!textarea) throw new Error("未找到输入框")
  setNativeValue(textarea, text)
  textarea.focus()
}

