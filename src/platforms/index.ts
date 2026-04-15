import type { Platform } from "../shared/types"
import { douyinAdapter } from "./douyin/adapter"
import { jdAdapter } from "./jd/adapter"
import { meituanAdapter } from "./meituan/adapter"
import { taobaoAdapter } from "./taobao/adapter"
import type { PlatformAdapter } from "./types"

export function getPlatformByUrl(url: string): Platform {
  try {
    const u = new URL(url)
    const h = u.hostname
    if (h.endsWith(".jd.com")) return "jd"
    if (h.endsWith(".taobao.com") || h.endsWith(".tmall.com")) return "taobao"
    if (h.endsWith(".meituan.com")) return "meituan"
    if (h.endsWith(".douyin.com")) return "douyin"
    return "unknown"
  } catch {
    return "unknown"
  }
}

export function getAdapter(platform: Platform): PlatformAdapter | null {
  if (platform === "jd") return jdAdapter
  if (platform === "taobao") return taobaoAdapter
  if (platform === "meituan") return meituanAdapter
  if (platform === "douyin") return douyinAdapter
  return null
}

