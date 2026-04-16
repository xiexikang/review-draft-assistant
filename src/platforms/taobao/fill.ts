import { setNativeValue } from "../shared/dom"

// ─── 工具函数 ─────────────────────────────────────────────────────

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
    '.J_submit_rate, .J_SubmitReview, .compose-btn button, button[type="submit"], .btn-submit, .submit, button[data-spm-anchor-id]'
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

// ─── 淘宝旧版评价页 (remarkSeller.jhtml) ──────────────────────────────

function isTaobaoClassicReviewPage(): boolean {
  return location.href.includes("rate.taobao.com/remarkSeller") ||
         location.href.includes("rate.taobao.com/rate.htm")
}

/**
 * 淘宝旧版评价页结构:
 *   li.rate-box[data-id="{tradeId}"]
 *     textarea.rate-msg[name="rateContents{tradeId}"]
 *     input.good-rate (好评 value=1) / input.noraml-rate (中评 value=0) / input.bad-rate (差评 value=-1)
 *     .dsr-box .rate-stars input[type="radio"][value="1-5"] (描述/态度/物流)
 *   button.J_submit_rate (发表评论)
 */
function fillTaobaoClassic(doc: Document, text: string, orderKey: string | undefined, rating: number | undefined, submit: boolean | undefined): void {
  // 1. 定位 textarea
  let textarea: HTMLTextAreaElement | null = null
  let rateBox: Element | null = null

  if (orderKey) {
    // 按 data-id 匹配
    rateBox = doc.querySelector(`li.rate-box[data-id="${orderKey}"]`)
    if (rateBox) {
      textarea = rateBox.querySelector("textarea.rate-msg") as HTMLTextAreaElement | null
    }
  }

  if (!textarea) {
    // 兜底取第一个可见的 textarea.rate-msg
    const allTa = doc.querySelectorAll("textarea.rate-msg")
    for (const ta of Array.from(allTa)) {
      if (isElementVisible(doc, ta)) {
        textarea = ta as HTMLTextAreaElement
        rateBox = ta.closest("li.rate-box")
        break
      }
    }
  }

  if (!textarea) {
    // 再兜底：任意 textarea
    textarea = doc.querySelector("textarea") as HTMLTextAreaElement | null
    if (textarea) rateBox = textarea.closest("li.rate-box")
  }

  if (!textarea) throw new Error("未找到输入框")

  // 2. 填入文本
  textarea.focus()
  setNativeValue(textarea, text)

  // 3. 评分（好评/中评/差评）
  if (rating && rateBox) {
    const isGood = rating >= 4
    const isNormal = rating === 3
    // 默认好评
    const selector = isGood ? "input.good-rate" : isNormal ? "input.noraml-rate" : "input.bad-rate"
    const radio = rateBox.querySelector(selector) as HTMLInputElement | null
    if (radio) {
      radio.checked = true
      radio.dispatchEvent(new Event("change", { bubbles: true }))
      radio.dispatchEvent(new Event("click", { bubbles: true }))
    }

    // DSR 店铺动态评分（描述/态度/物流，都在 .dsr-box 中）
    const dsrBox = doc.querySelector(".dsr-box")
    if (dsrBox) {
      const dsrInputs = dsrBox.querySelectorAll<HTMLInputElement>(`input[type="radio"][value="${rating}"]`)
      for (const input of Array.from(dsrInputs)) {
        input.checked = true
        input.dispatchEvent(new Event("change", { bubbles: true }))
        input.dispatchEvent(new Event("click", { bubbles: true }))
      }
    }
  }

  // 4. 提交
  if (submit) {
    setTimeout(() => {
      textarea!.dispatchEvent(new Event("blur", { bubbles: true }))
      textarea!.blur()
      const submitBtn = pickSubmitButton(doc, doc)
      if (submitBtn) clickLikeUser(doc, submitBtn)
    }, 800)
  }
}

// ─── 天猫/新版评价页 (ratewrite.tmall.com / compose-order) ──────────

function fillTmallReview(doc: Document, text: string, orderKey: string | undefined, rating: number | undefined, submit: boolean | undefined): void {
  let textarea: HTMLTextAreaElement | HTMLInputElement | null = null
  let targetContainer: Element | null = null

  // 按 orderKey 精确匹配
  if (orderKey) {
    // 1. 通过 data-bizoid 匹配
    targetContainer = doc.querySelector(`.compose-order[data-bizoid="${orderKey}"]`)
    if (targetContainer) {
      textarea = (targetContainer.querySelector("textarea") as HTMLTextAreaElement | null) ??
                 (targetContainer.querySelector("input[type='text']") as HTMLInputElement | null)
    }

    // 2. 通过 SKU 链接匹配
    if (!textarea) {
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
  }

  // 兜底
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

  // 星级评分
  if (rating && targetContainer) {
    // 旧版星星
    const oldStarGroups = targetContainer.querySelectorAll('.rate-star, .stars-wrap, [class*="star"]')
    for (const group of Array.from(oldStarGroups)) {
      const stars = Array.from(group.querySelectorAll('li, i, span.star')) as HTMLElement[]
      if (stars.length >= 5) {
        const targetStar = stars[rating - 1]
        if (targetStar) targetStar.click()
      }
    }
    // 新版星星
    const newStarGroups = targetContainer.querySelectorAll('.tm-rating-star-list, .rate-star-list')
    for (const group of Array.from(newStarGroups)) {
      const stars = Array.from(group.querySelectorAll('.J_ratingStar, [data-star-value]')) as HTMLElement[]
      if (stars.length >= 5) {
        const targetStar = stars.find(s => s.getAttribute('data-star-value') === String(rating)) || stars[rating - 1]
        if (targetStar) targetStar.click()
      }
    }
  }

  // 提交
  if (submit) {
    setTimeout(() => {
      textarea!.dispatchEvent(new Event("blur", { bubbles: true }))
      textarea!.blur()
      const submitBtn =
        (targetContainer ? pickSubmitButton(doc, targetContainer) : null) ||
        pickSubmitButton(doc, doc)
      if (submitBtn) clickLikeUser(doc, submitBtn)
    }, 800)
  }
}

// ─── 入口：自动区分淘宝/天猫 ────────────────────────────────────────

export async function fillTaobaoReview(doc: Document, text: string, orderKey?: string, rating?: number, submit?: boolean): Promise<void> {
  if (isTaobaoClassicReviewPage()) {
    fillTaobaoClassic(doc, text, orderKey, rating, submit)
  } else {
    fillTmallReview(doc, text, orderKey, rating, submit)
  }
}
