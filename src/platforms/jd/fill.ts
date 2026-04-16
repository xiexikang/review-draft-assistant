import { setNativeValue } from "../shared/dom"

/**
 * 在页面上下文中执行脚本（绕过 content script 隔离）
 */
function executeInPage(fn: string) {
  const script = document.createElement("script")
  script.textContent = fn
  document.head.appendChild(script)
  script.remove()
}

/**
 * 查找商品评价的 textarea（排除服务评价等隐藏的 textarea）
 * JD 评价页结构：
 *   .f-service .star-desc textarea  ← 隐藏的服务评价输入框
 *   .f-goods .f-textarea textarea   ← 可见的商品评价输入框
 */
function findProductTextarea(doc: Document, sku?: string): { textarea: HTMLTextAreaElement; container: Element } | null {
  // 1. 按 SKU 精确匹配 .f-goods 容器
  if (sku) {
    const goodsEl = doc.querySelector(`.f-goods.product-${sku}`)
    if (goodsEl) {
      const ta = goodsEl.querySelector(".f-textarea textarea") as HTMLTextAreaElement | null
      if (ta) return { textarea: ta, container: goodsEl }
    }
  }

  // 2. 遍历所有 .f-goods，找可见的 textarea
  const allGoods = doc.querySelectorAll(".f-goods")
  for (const goods of Array.from(allGoods)) {
    const ta = goods.querySelector(".f-textarea textarea") as HTMLTextAreaElement | null
    if (ta) return { textarea: ta, container: goods }
  }

  // 3. 兜底：找所有可见 textarea，跳过 display:none 的
  const allTa = doc.querySelectorAll("textarea")
  for (const ta of Array.from(allTa)) {
    const el = ta as HTMLTextAreaElement
    const parent = el.closest(".f-textarea, .star-desc")
    // 跳过隐藏的服务评价 textarea
    if (parent instanceof HTMLElement && getComputedStyle(parent).display === "none") continue
    if (el.offsetWidth > 0 || el.offsetHeight > 0 || el.closest(".f-goods")) {
      return { textarea: el, container: el.closest(".f-goods") ?? el.closest(".f-item") ?? doc.body }
    }
  }

  return null
}

export async function fillJdReview(doc: Document, text: string, orderKey?: string, rating?: number, submit?: boolean): Promise<void> {
  const sku = orderKey ? (orderKey.split('-')[1] || orderKey.split('-')[0]) : undefined
  const result = findProductTextarea(doc, sku)
  if (!result) throw new Error("未找到商品评价输入框")

  const { textarea, container: targetContainer } = result

  // 填入文本
  textarea.focus()
  setNativeValue(textarea, text)

  // 在页面上下文中额外触发事件，确保 JD 的 JS 能感知到值变化
  executeInPage(`
    (function() {
      var ta = document.querySelector('.f-goods.product-${sku} .f-textarea textarea')
             || document.querySelector('.f-goods .f-textarea textarea');
      if (!ta) return;
      var setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, ${JSON.stringify(text)});
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true }));
      ta.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    })();
  `)

  // 自动打分
  if (rating) {
    // 商品评分（在 .f-goods 容器内）
    const starGroups = targetContainer.querySelectorAll('.commstar')
    for (const group of Array.from(starGroups)) {
      const targetStar = group.querySelector(`.star${rating}`) as HTMLElement | null
      if (targetStar) targetStar.click()
    }
    // 物流/服务评分（在 .f-service 区块内）
    const globalStarGroups = doc.querySelectorAll('.f-service .commstar, .service-box .commstar')
    for (const group of Array.from(globalStarGroups)) {
      const targetStar = group.querySelector(`.star${rating}`) as HTMLElement | null
      if (targetStar) targetStar.click()
    }
  }

  // 自动点击"发表"按钮
  if (submit) {
    setTimeout(() => {
      executeInPage(`
        (function() {
          var btn = document.querySelector('.btn-submit');
          if (!btn) return;
          if (btn.tagName === 'A') {
            btn.setAttribute('href', 'javascript:void(0)');
          }
          btn.click();
        })();
      `)
    }, 1500)
  }
}
