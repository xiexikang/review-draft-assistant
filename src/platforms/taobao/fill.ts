function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event("input", { bubbles: true }))
  el.dispatchEvent(new Event("change", { bubbles: true }))
}

function isElementVisible(doc: Document, el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false
  const win = doc.defaultView
  const style = win?.getComputedStyle(el)
  if (!style) return false
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false
  if (el.hasAttribute("hidden") || el.getAttribute("aria-hidden") === "true") return false
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function clickLikeUser(doc: Document, el: HTMLElement) {
  el.scrollIntoView({ block: "center", inline: "center" })
  el.focus()
  const win = doc.defaultView
  const makeMouse = (type: string) => new MouseEvent(type, { bubbles: true, cancelable: true, view: win })
  const makePointer = (type: string) => {
    const PE = win?.PointerEvent
    return PE ? new PE(type, { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, view: win }) : null
  }
  for (const t of ["pointerdown", "mousedown"]) {
    const ev = makePointer(t) || makeMouse(t)
    el.dispatchEvent(ev)
  }
  for (const t of ["pointerup", "mouseup", "click"]) {
    const ev = makePointer(t) || makeMouse(t)
    el.dispatchEvent(ev)
  }
  if (el instanceof HTMLButtonElement && el.type === "submit") {
    const form = el.closest("form")
    const requestSubmit = (form as HTMLFormElement | null)?.requestSubmit
    if (form && typeof requestSubmit === "function") {
      requestSubmit.call(form, el)
      return
    }
  }
  el.click()
}

function pickSubmitButton(doc: Document, scope: ParentNode): HTMLElement | null {
  const candidates = Array.from(scope.querySelectorAll<HTMLElement>(
    '.J_SubmitReview, .compose-btn button, button[type="submit"], .btn-submit, .submit, button[data-spm-anchor-id]'
  ))
  const filtered = candidates.filter(el => {
    if (!isElementVisible(doc, el)) return false
    if (el instanceof HTMLButtonElement && el.disabled) return false
    const txt = (el.textContent ?? "").replace(/\s+/g, "")
    if (!txt) return false
    return txt.includes("提交") || txt.includes("发表") || txt.includes("确认")
  })
  return filtered[0] ?? null
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

    const newStarGroups = targetContainer.querySelectorAll('.tm-rating-star-list, .rate-star-list')
    for (const group of Array.from(newStarGroups)) {
      const stars = Array.from(group.querySelectorAll('.J_ratingStar, [data-star-value]')) as HTMLElement[]
      if (stars.length >= 5) {
        const targetStar = stars.find(s => s.getAttribute('data-star-value') === String(rating)) || stars[rating - 1]
        if (targetStar) {
          targetStar.click()
        }
      }
    }
  }

  if (submit) {
    setTimeout(() => {
      textarea?.dispatchEvent(new Event("blur", { bubbles: true }))
      textarea?.blur()
      const submitBtn =
        (targetContainer ? pickSubmitButton(doc, targetContainer) : null) ||
        pickSubmitButton(doc, doc)
      if (submitBtn) clickLikeUser(doc, submitBtn)
    }, 500)
  }
}