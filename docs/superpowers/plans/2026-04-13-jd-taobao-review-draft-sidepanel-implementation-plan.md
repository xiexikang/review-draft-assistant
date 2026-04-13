# 京东→淘宝 批量评价草稿插件（Side Panel）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Chrome（Manifest V3）中实现一个 Side Panel 插件：京东 v1 跑通“抽取待评价订单 → 批量生成草稿 → 评价页一键填入（不提交）”闭环；淘宝 v1.1 复用同一套 UI/生成层并仅新增平台适配模块；美团/抖音仅预留接口与目录结构。

**Architecture:** 三层/四模块：platforms（detect/extract/fill）+ generator/provider（prompt/解析/校验）+ panel（UI）+ background（provider 调用/队列/进度/缓存）。content script 单入口只做平台分发与消息桥；网络请求只在 background 发起。

**Tech Stack:** Chrome Extension MV3 + Side Panel, React, TypeScript, Tailwind, Vite, chrome.storage.local, background service worker, content scripts

---

## Workspace 约定

- 包管理器：pnpm
- 构建产物目录：dist（用于 chrome://extensions → Load unpacked）
- 每完成一个 Ticket：
  - 必须在本地可加载验证通过（按该 Ticket 的“验证步骤”）
  - 提交一次 commit，commit message 使用 `Ticket <编号>`（例如 `Ticket 1`）

## 文件结构（落地后）

- Create: package.json, pnpm-lock.yaml, tsconfig.json, vite.config.ts, index.html（Vite 默认）
- Create: src/shared/types.ts（Platform/Context/OrderItem/消息协议）
- Create: src/shared/storage.ts（storage keys 与读写封装）
- Create: src/shared/messages.ts（消息类型与 helpers）
- Create: src/panel/index.html, src/panel/main.tsx, src/panel/App.tsx
- Create: src/panel/tabs/OrdersTab.tsx, DraftsTab.tsx, SettingsTab.tsx
- Create: src/background/index.ts（service worker 入口）
- Create: src/background/providers/openai.ts, claude.ts, types.ts
- Create: src/background/queue.ts（Ticket 5）
- Create: src/content/index.ts（content script 单入口）
- Create: src/platforms/index.ts（分发器）
- Create: src/platforms/jd/adapter.ts, detect.ts, extract.ts, fill.ts
- Create: src/platforms/taobao/adapter.ts, detect.ts, extract.ts, fill.ts（Ticket 8）
- Create: src/platforms/meituan/adapter.ts（空实现）
- Create: src/platforms/douyin/adapter.ts（空实现）
- Create: public/manifest.json, public/icons/*（最小图标）

---

### Task 0：初始化仓库为可构建的扩展工程（Ticket 1 的前置）

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `public/manifest.json`
- Create: `src/panel/index.html`
- Create: `src/panel/main.tsx`
- Create: `src/panel/App.tsx`
- Create: `src/panel/tabs/OrdersTab.tsx`
- Create: `src/panel/tabs/DraftsTab.tsx`
- Create: `src/panel/tabs/SettingsTab.tsx`
- Create: `src/background/index.ts`
- Create: `src/content/index.ts`
- Create: `src/shared/types.ts`
- Create: `src/shared/messages.ts`

- [ ] **Step 1: 初始化 Vite + React + TS**

Run:

```bash
pnpm create vite@latest . -- --template react-ts
pnpm install
```

Expected:
- 生成 Vite React TS 目录结构
- `pnpm dev` 可启动本地开发服务器

- [ ] **Step 2: 安装并配置 Tailwind**

Run:

```bash
pnpm add -D tailwindcss postcss autoprefixer
pnpm dlx tailwindcss init -p
```

Update `tailwind.config.js`（若为 ts 版本则相应调整）：

```js
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

Update `src/index.css`：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: 改为扩展多入口构建（Side Panel / background / content）**

Update `vite.config.ts` 为多入口构建，输出到 `dist/`：

```ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "node:path"

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        panel: resolve(__dirname, "src/panel/index.html"),
        background: resolve(__dirname, "src/background/index.ts"),
        content: resolve(__dirname, "src/content/index.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "background") return "background/index.js"
          if (chunkInfo.name === "content") return "content/index.js"
          return "assets/[name]-[hash].js"
        },
      },
    },
  },
})
```

- [ ] **Step 4: 添加 MV3 manifest（Side Panel + scripts）**

Create `public/manifest.json`：

```json
{
  "manifest_version": 3,
  "name": "Review Draft Assistant",
  "version": "0.1.0",
  "description": "批量生成评价草稿并在评价页一键填入（不自动提交）",
  "action": { "default_title": "Review Draft Assistant" },
  "permissions": ["storage", "sidePanel", "tabs"],
  "host_permissions": ["https://*.jd.com/*", "https://*.taobao.com/*"],
  "background": { "service_worker": "background/index.js", "type": "module" },
  "content_scripts": [
    {
      "matches": ["https://*.jd.com/*", "https://*.taobao.com/*"],
      "js": ["content/index.js"],
      "run_at": "document_idle"
    }
  ],
  "side_panel": { "default_path": "panel/index.html" }
}
```

- [ ] **Step 5: 创建 Side Panel 页面入口**

Create `src/panel/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Review Draft Assistant</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/panel/main.tsx"></script>
  </body>
</html>
```

Create `src/panel/main.tsx`：

```tsx
import React from "react"
import ReactDOM from "react-dom/client"
import "../index.css"
import { App } from "./App"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

Create `src/panel/App.tsx`（三 Tab 最小可用）：

```tsx
import { useMemo, useState } from "react"
import { OrdersTab } from "./tabs/OrdersTab"
import { DraftsTab } from "./tabs/DraftsTab"
import { SettingsTab } from "./tabs/SettingsTab"

type TabKey = "orders" | "drafts" | "settings"

export function App() {
  const [tab, setTab] = useState<TabKey>("orders")

  const content = useMemo(() => {
    if (tab === "orders") return <OrdersTab />
    if (tab === "drafts") return <DraftsTab />
    return <SettingsTab />
  }, [tab])

  return (
    <div className="h-screen w-full bg-white text-slate-900">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="text-sm font-semibold">Review Draft Assistant</div>
        <div className="flex gap-1">
          <button
            className={tab === "orders" ? "rounded bg-slate-900 px-2 py-1 text-xs text-white" : "rounded px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"}
            onClick={() => setTab("orders")}
            type="button"
          >
            订单
          </button>
          <button
            className={tab === "drafts" ? "rounded bg-slate-900 px-2 py-1 text-xs text-white" : "rounded px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"}
            onClick={() => setTab("drafts")}
            type="button"
          >
            草稿
          </button>
          <button
            className={tab === "settings" ? "rounded bg-slate-900 px-2 py-1 text-xs text-white" : "rounded px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"}
            onClick={() => setTab("settings")}
            type="button"
          >
            设置
          </button>
        </div>
      </div>
      <div className="p-3">{content}</div>
    </div>
  )
}
```

Create 三个 Tab（先占位）：

```tsx
// src/panel/tabs/OrdersTab.tsx
export function OrdersTab() {
  return <div className="text-sm">Orders</div>
}
```

```tsx
// src/panel/tabs/DraftsTab.tsx
export function DraftsTab() {
  return <div className="text-sm">Drafts</div>
}
```

```tsx
// src/panel/tabs/SettingsTab.tsx
export function SettingsTab() {
  return <div className="text-sm">Settings</div>
}
```

- [ ] **Step 6: 添加 background/content 最小入口，保证构建不报错**

Create `src/background/index.ts`：

```ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})
```

Create `src/content/index.ts`：

```ts
export {}
```

- [ ] **Step 7: 构建并本地加载验证（Ticket 1）**

Run:

```bash
pnpm build
```

Manual verify:
- Chrome → `chrome://extensions` → 打开开发者模式 → Load unpacked → 选择 `dist/`
- 点击扩展图标可打开 Side Panel
- Side Panel 可切换三个 Tab，页面无报错

- [ ] **Step 8: Commit（Ticket 1）**

```bash
git add -A
git commit -m "Ticket 1"
```

---

### Task 2：Settings + storage + Provider 框架（OpenAI/Claude）（Ticket 2）

**Files:**
- Create: `src/shared/storage.ts`
- Create: `src/shared/types.ts`
- Create: `src/shared/messages.ts`
- Create: `src/background/providers/types.ts`
- Create: `src/background/providers/openai.ts`
- Create: `src/background/providers/claude.ts`
- Modify: `src/background/index.ts`
- Modify: `src/panel/tabs/SettingsTab.tsx`

- [ ] **Step 1: 定义共享类型（Platform/Context/OrderItem/ProviderConfig/草稿结构）**

Create `src/shared/types.ts`：

```ts
export type Platform = "jd" | "taobao" | "meituan" | "douyin" | "unknown"

export type Context = "order_list_pending_review" | "review_page" | "unknown"

export type OrderItem = {
  platform: Exclude<Platform, "unknown">
  orderKey: string
  title: string
  skuText?: string
  itemUrl?: string
}

export type ProviderId = "openai" | "claude"

export type ProviderExtra = Record<string, string>

export type ProviderConfig = {
  provider: ProviderId
  apiKey: string
  model: string
  baseUrl?: string
  maxTokens?: number
  temperature?: number
  extra?: ProviderExtra
}

export type DraftItem = {
  orderKey: string
  rating: number
  draft_short: string
  draft_mid: string
  draft_long: string
}
```

- [ ] **Step 2: 定义消息协议与安全的 send helper**

Create `src/shared/messages.ts`：

```ts
import type { Context, DraftItem, OrderItem, Platform, ProviderConfig } from "./types"

export type PlatformOrdersUpdated = {
  type: "PLATFORM_ORDERS_UPDATED"
  payload: { platform: Platform; context: Context; orders: OrderItem[] }
}

export type ProviderTest = {
  type: "PROVIDER_TEST"
  payload: { providerConfig: ProviderConfig }
}

export type ProviderTestResult = {
  type: "PROVIDER_TEST_RESULT"
  payload: { ok: boolean; errorMessage?: string }
}

export type GenDraftsStart = {
  type: "GEN_DRAFTS_START"
  payload: {
    providerConfig: ProviderConfig
    orders: OrderItem[]
    rating: number
    tags: string[]
    style?: string
  }
}

export type GenDraftsProgress = {
  type: "GEN_DRAFTS_PROGRESS"
  payload: { done: number; total: number; currentOrderKey?: string }
}

export type GenDraftsResult = {
  type: "GEN_DRAFTS_RESULT"
  payload: { drafts: DraftItem[] }
}

export type GenDraftsError = {
  type: "GEN_DRAFTS_ERROR"
  payload: { orderKey?: string; errorMessage: string }
}

export type PlatformFillReview = {
  type: "PLATFORM_FILL_REVIEW"
  payload: { platform: Platform; orderKey: string; text: string }
}

export type MessageToBackground = ProviderTest | GenDraftsStart
export type MessageFromBackground = ProviderTestResult | GenDraftsProgress | GenDraftsResult | GenDraftsError

export type MessageToPanel = PlatformOrdersUpdated | MessageFromBackground
export type MessageToContent = PlatformFillReview

export async function sendToBackground<T extends MessageToBackground, R>(
  msg: T,
): Promise<R> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (resp) => {
      const err = chrome.runtime.lastError
      if (err) reject(new Error(err.message))
      else resolve(resp as R)
    })
  })
}
```

- [ ] **Step 3: 封装 chrome.storage.local 读写**

Create `src/shared/storage.ts`：

```ts
import type { ProviderConfig } from "./types"

export const StorageKeys = {
  providerConfig: "providerConfig",
  ordersSnapshot: "ordersSnapshot",
  draftsByOrderKey: "draftsByOrderKey",
} as const

export async function getProviderConfig(): Promise<ProviderConfig | null> {
  const result = await chrome.storage.local.get(StorageKeys.providerConfig)
  return (result[StorageKeys.providerConfig] as ProviderConfig | undefined) ?? null
}

export async function setProviderConfig(config: ProviderConfig): Promise<void> {
  await chrome.storage.local.set({ [StorageKeys.providerConfig]: config })
}
```

- [ ] **Step 4: Provider 适配器接口 + OpenAI/Claude 实现**

Create `src/background/providers/types.ts`：

```ts
import type { ProviderConfig } from "../../shared/types"

export type ProviderRequest = {
  url: string
  headers: Record<string, string>
  body: unknown
}

export type ProviderAdapter = {
  defaultBaseUrl: string
  recommendedModels: string[]
  requiredExtraFields: string[]
  buildRequest: (config: ProviderConfig, prompt: string) => ProviderRequest
  parseText: (respJson: any) => string
  testRequest: (config: ProviderConfig) => ProviderRequest
}
```

Create `src/background/providers/openai.ts`：

```ts
import type { ProviderAdapter } from "./types"
import type { ProviderConfig } from "../../shared/types"

export const openaiProvider: ProviderAdapter = {
  defaultBaseUrl: "https://api.openai.com",
  recommendedModels: ["gpt-4o-mini", "gpt-4.1-mini"],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) => {
    const baseUrl = config.baseUrl?.trim() || "https://api.openai.com"
    return {
      url: `${baseUrl}/v1/chat/completions`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: {
        model: config.model,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 800,
        messages: [
          { role: "system", content: "You are a helpful assistant that outputs strictly valid JSON." },
          { role: "user", content: prompt },
        ],
      },
    }
  },
  parseText: (respJson: any) => respJson?.choices?.[0]?.message?.content ?? "",
  testRequest: (config: ProviderConfig) => {
    return openaiProvider.buildRequest(config, "[{\"ok\":true}]")
  },
}
```

Create `src/background/providers/claude.ts`：

```ts
import type { ProviderAdapter } from "./types"
import type { ProviderConfig } from "../../shared/types"

export const claudeProvider: ProviderAdapter = {
  defaultBaseUrl: "https://api.anthropic.com",
  recommendedModels: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) => {
    const baseUrl = config.baseUrl?.trim() || "https://api.anthropic.com"
    return {
      url: `${baseUrl}/v1/messages`,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: {
        model: config.model,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 800,
        messages: [{ role: "user", content: prompt }],
      },
    }
  },
  parseText: (respJson: any) => respJson?.content?.[0]?.text ?? "",
  testRequest: (config: ProviderConfig) => {
    return claudeProvider.buildRequest(config, "[{\"ok\":true}]")
  },
}
```

- [ ] **Step 5: background 增加 PROVIDER_TEST 处理**

Modify `src/background/index.ts`：

```ts
import type { MessageToBackground, ProviderTestResult } from "../shared/messages"
import { openaiProvider } from "./providers/openai"
import { claudeProvider } from "./providers/claude"

function getProvider(provider: "openai" | "claude") {
  if (provider === "openai") return openaiProvider
  return claudeProvider
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

chrome.runtime.onMessage.addListener((message: MessageToBackground, _sender, sendResponse) => {
  void (async () => {
    if (message.type === "PROVIDER_TEST") {
      try {
        const provider = getProvider(message.payload.providerConfig.provider)
        const req = provider.testRequest(message.payload.providerConfig)
        const resp = await fetch(req.url, {
          method: "POST",
          headers: req.headers,
          body: JSON.stringify(req.body),
        })
        if (!resp.ok) {
          const text = await resp.text()
          const result: ProviderTestResult = { type: "PROVIDER_TEST_RESULT", payload: { ok: false, errorMessage: text.slice(0, 500) } }
          sendResponse(result)
          return
        }
        const result: ProviderTestResult = { type: "PROVIDER_TEST_RESULT", payload: { ok: true } }
        sendResponse(result)
      } catch (e) {
        const result: ProviderTestResult = { type: "PROVIDER_TEST_RESULT", payload: { ok: false, errorMessage: e instanceof Error ? e.message : "Unknown error" } }
        sendResponse(result)
      }
      return
    }
    sendResponse({ ok: false })
  })()
  return true
})
```

- [ ] **Step 6: Settings UI（保存/读取/测试连接）**

Modify `src/panel/tabs/SettingsTab.tsx`：

```tsx
import { useEffect, useMemo, useState } from "react"
import type { ProviderConfig, ProviderId } from "../../shared/types"
import { getProviderConfig, setProviderConfig } from "../../shared/storage"
import { sendToBackground } from "../../shared/messages"

const providerModels: Record<ProviderId, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4.1-mini"],
  claude: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
}

export function SettingsTab() {
  const [provider, setProvider] = useState<ProviderId>("openai")
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState(providerModels.openai[0]!)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [baseUrl, setBaseUrl] = useState("")
  const [maxTokens, setMaxTokens] = useState<number>(800)
  const [temperature, setTemperature] = useState<number>(0.7)
  const [status, setStatus] = useState<string>("")

  const models = useMemo(() => providerModels[provider], [provider])

  useEffect(() => {
    void (async () => {
      const cfg = await getProviderConfig()
      if (!cfg) return
      setProvider(cfg.provider)
      setApiKey(cfg.apiKey)
      setModel(cfg.model)
      setBaseUrl(cfg.baseUrl ?? "")
      setMaxTokens(cfg.maxTokens ?? 800)
      setTemperature(cfg.temperature ?? 0.7)
    })()
  }, [])

  useEffect(() => {
    setModel(models[0]!)
  }, [provider, models])

  async function onSave() {
    const cfg: ProviderConfig = {
      provider,
      apiKey: apiKey.trim(),
      model: model.trim(),
      baseUrl: baseUrl.trim() || undefined,
      maxTokens,
      temperature,
    }
    await setProviderConfig(cfg)
    setStatus("已保存")
  }

  async function onTest() {
    setStatus("测试中…")
    const cfg: ProviderConfig = {
      provider,
      apiKey: apiKey.trim(),
      model: model.trim(),
      baseUrl: baseUrl.trim() || undefined,
      maxTokens,
      temperature,
    }
    try {
      const resp = await sendToBackground({ type: "PROVIDER_TEST", payload: { providerConfig: cfg } })
      if (resp?.payload?.ok) setStatus("连接成功")
      else setStatus(`连接失败：${resp?.payload?.errorMessage ?? "unknown"}`)
    } catch (e) {
      setStatus(`连接失败：${e instanceof Error ? e.message : "unknown"}`)
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">设置</div>

      <label className="block space-y-1">
        <div className="text-xs text-slate-600">厂商</div>
        <select className="w-full rounded border px-2 py-1 text-sm" value={provider} onChange={(e) => setProvider(e.target.value as ProviderId)}>
          <option value="openai">OpenAI</option>
          <option value="claude">Claude</option>
        </select>
      </label>

      <label className="block space-y-1">
        <div className="text-xs text-slate-600">API Key</div>
        <input className="w-full rounded border px-2 py-1 text-sm" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="仅存本地 storage" />
      </label>

      <label className="block space-y-1">
        <div className="text-xs text-slate-600">模型</div>
        <select className="w-full rounded border px-2 py-1 text-sm" value={model} onChange={(e) => setModel(e.target.value)}>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      <button className="w-full rounded bg-slate-900 px-2 py-2 text-sm text-white" type="button" onClick={onTest}>
        测试连接
      </button>

      <button className="w-full rounded border px-2 py-2 text-sm" type="button" onClick={onSave}>
        保存
      </button>

      <button className="text-xs text-slate-700 underline" type="button" onClick={() => setAdvancedOpen((v) => !v)}>
        {advancedOpen ? "收起高级参数" : "展开高级参数"}
      </button>

      {advancedOpen ? (
        <div className="space-y-2 rounded border bg-slate-50 p-2">
          <label className="block space-y-1">
            <div className="text-xs text-slate-600">Base URL</div>
            <input className="w-full rounded border px-2 py-1 text-sm" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <div className="text-xs text-slate-600">maxTokens</div>
            <input className="w-full rounded border px-2 py-1 text-sm" type="number" value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} />
          </label>
          <label className="block space-y-1">
            <div className="text-xs text-slate-600">temperature</div>
            <input className="w-full rounded border px-2 py-1 text-sm" type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} />
          </label>
        </div>
      ) : null}

      {status ? <div className="text-xs text-slate-700">{status}</div> : null}
    </div>
  )
}
```

- [ ] **Step 7: 构建并本地加载验证（Ticket 2）**

Run:

```bash
pnpm build
```

Manual verify:
- Side Panel → 设置 Tab：可切换厂商/模型、输入 key
- 点击“保存”后重开 Side Panel 仍可回显配置
- 点击“测试连接”：使用真实 key 时返回连接成功；无效 key 时返回失败提示

- [ ] **Step 8: Commit（Ticket 2）**

```bash
git add -A
git commit -m "Ticket 2"
```

---

### Task 3：平台分发器 + content script 单入口（Ticket 3）

**Files:**
- Create: `src/platforms/types.ts`
- Create: `src/platforms/index.ts`
- Create: `src/platforms/jd/adapter.ts`
- Create: `src/platforms/taobao/adapter.ts`
- Create: `src/platforms/meituan/adapter.ts`
- Create: `src/platforms/douyin/adapter.ts`
- Modify: `src/content/index.ts`

- [ ] **Step 1: 定义 PlatformAdapter 接口**

Create `src/platforms/types.ts`：

```ts
import type { Context, OrderItem, Platform } from "../shared/types"

export type PlatformAdapter = {
  platform: Exclude<Platform, "unknown">
  detectContext: (tabUrl: string, doc: Document) => Context
  extractOrders: (doc: Document) => Promise<OrderItem[]>
  fillReview: (doc: Document, text: string) => Promise<void>
}
```

- [ ] **Step 2: 分发器实现（url → platform → adapter）**

Create `src/platforms/index.ts`：

```ts
import type { Platform } from "../shared/types"
import type { PlatformAdapter } from "./types"
import { jdAdapter } from "./jd/adapter"
import { taobaoAdapter } from "./taobao/adapter"
import { meituanAdapter } from "./meituan/adapter"
import { douyinAdapter } from "./douyin/adapter"

export function getPlatformByUrl(url: string): Platform {
  try {
    const u = new URL(url)
    const h = u.hostname
    if (h.endsWith(".jd.com")) return "jd"
    if (h.endsWith(".taobao.com")) return "taobao"
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
```

- [ ] **Step 3: 预留平台 adapter 空实现（v1）**

Create `src/platforms/taobao/adapter.ts`：

```ts
import type { PlatformAdapter } from "../types"

export const taobaoAdapter: PlatformAdapter = {
  platform: "taobao",
  detectContext: () => "unknown",
  extractOrders: async () => [],
  fillReview: async () => {},
}
```

Create `src/platforms/meituan/adapter.ts`：

```ts
import type { PlatformAdapter } from "../types"

export const meituanAdapter: PlatformAdapter = {
  platform: "meituan",
  detectContext: () => "unknown",
  extractOrders: async () => [],
  fillReview: async () => {},
}
```

Create `src/platforms/douyin/adapter.ts`：

```ts
import type { PlatformAdapter } from "../types"

export const douyinAdapter: PlatformAdapter = {
  platform: "douyin",
  detectContext: () => "unknown",
  extractOrders: async () => [],
  fillReview: async () => {},
}
```

- [ ] **Step 4: 京东 adapter 先只做 detect=unknown（Ticket 4 再补全）**

Create `src/platforms/jd/adapter.ts`：

```ts
import type { PlatformAdapter } from "../types"

export const jdAdapter: PlatformAdapter = {
  platform: "jd",
  detectContext: () => "unknown",
  extractOrders: async () => [],
  fillReview: async () => {},
}
```

- [ ] **Step 5: content script 单入口：识别平台与上下文，回传 ordersSnapshot；接收 fill 消息并调用 adapter.fillReview**

Modify `src/content/index.ts`：

```ts
import type { MessageToContent, PlatformOrdersUpdated } from "../shared/messages"
import { getAdapter, getPlatformByUrl } from "../platforms"

async function syncOrders() {
  const platform = getPlatformByUrl(location.href)
  const adapter = getAdapter(platform)
  if (!adapter) return
  const context = adapter.detectContext(location.href, document)
  if (context !== "order_list_pending_review") return
  const orders = await adapter.extractOrders(document)
  const msg: PlatformOrdersUpdated = {
    type: "PLATFORM_ORDERS_UPDATED",
    payload: { platform, context, orders },
  }
  chrome.runtime.sendMessage(msg)
}

chrome.runtime.onMessage.addListener((message: MessageToContent) => {
  if (message.type !== "PLATFORM_FILL_REVIEW") return
  const platform = getPlatformByUrl(location.href)
  const adapter = getAdapter(platform)
  if (!adapter) return
  void adapter.fillReview(document, message.payload.text)
})

void syncOrders()
```

- [ ] **Step 6: 构建并本地加载验证（Ticket 3）**

Run:

```bash
pnpm build
```

Manual verify:
- 打开任意 jd.com 页面，控制台无报错（content 注入不应异常）
- 预留平台（taobao.com 页面）注入不报错

- [ ] **Step 7: Commit（Ticket 3）**

```bash
git add -A
git commit -m "Ticket 3"
```

---

### Task 4：京东待评价列表抽取 + Orders UI（Ticket 4）

**Files:**
- Modify: `src/platforms/jd/adapter.ts`
- Create: `src/platforms/jd/detect.ts`
- Create: `src/platforms/jd/extract.ts`
- Modify: `src/panel/tabs/OrdersTab.tsx`
- Modify: `src/shared/storage.ts`（增加 ordersSnapshot 存储）
- Modify: `src/background/index.ts`（接收 content 消息并落盘，转发给 panel）

- [ ] **Step 1: 京东上下文识别（待评价列表 / 评价页）**

Create `src/platforms/jd/detect.ts`：

```ts
import type { Context } from "../../shared/types"

export function detectJdContext(tabUrl: string, doc: Document): Context {
  const url = tabUrl
  if (url.includes("comment") || url.includes("evaluate")) {
    return "review_page"
  }
  const hasPending = Boolean(doc.querySelector('[class*="comment"],[class*="evaluate"],[id*="comment"],[id*="evaluate"]'))
  if (hasPending) return "order_list_pending_review"
  return "unknown"
}
```

- [ ] **Step 2: 京东订单抽取（稳定 orderKey + title/sku/url）**

Create `src/platforms/jd/extract.ts`：

```ts
import type { OrderItem } from "../../shared/types"

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? "").trim()
}

export async function extractJdOrders(doc: Document): Promise<OrderItem[]> {
  const items: OrderItem[] = []
  const rows = Array.from(doc.querySelectorAll("[data-orderid],[data-order-id],li,div"))
  for (const row of rows) {
    const orderId =
      (row as HTMLElement).dataset.orderid ||
      (row as HTMLElement).dataset.orderId ||
      (row as HTMLElement).getAttribute("data-orderid") ||
      (row as HTMLElement).getAttribute("data-order-id") ||
      ""
    const a = row.querySelector("a[href]")
    const title = text(row.querySelector("[class*='title'],[class*='name'],a")) || text(a)
    if (!title) continue
    const key = orderId || (a ? new URL((a as HTMLAnchorElement).href, location.href).toString() : title)
    const skuText = text(row.querySelector("[class*='sku'],[class*='spec']")) || undefined
    const itemUrl = a ? new URL((a as HTMLAnchorElement).href, location.href).toString() : undefined
    items.push({ platform: "jd", orderKey: key, title, skuText, itemUrl })
  }
  const uniq = new Map<string, OrderItem>()
  for (const it of items) uniq.set(it.orderKey, it)
  return Array.from(uniq.values()).slice(0, 50)
}
```

- [ ] **Step 3: 串联 jd adapter**

Modify `src/platforms/jd/adapter.ts`：

```ts
import type { PlatformAdapter } from "../types"
import { detectJdContext } from "./detect"
import { extractJdOrders } from "./extract"

export const jdAdapter: PlatformAdapter = {
  platform: "jd",
  detectContext: detectJdContext,
  extractOrders: extractJdOrders,
  fillReview: async () => {},
}
```

- [ ] **Step 4: ordersSnapshot 落盘 + panel 实时显示**

Update `src/shared/storage.ts` 增加：

```ts
import type { Context, OrderItem, Platform } from "./types"

export type OrdersSnapshot = { platform: Platform; context: Context; orders: OrderItem[] }

export async function getOrdersSnapshot(): Promise<OrdersSnapshot | null> {
  const result = await chrome.storage.local.get(StorageKeys.ordersSnapshot)
  return (result[StorageKeys.ordersSnapshot] as OrdersSnapshot | undefined) ?? null
}

export async function setOrdersSnapshot(snapshot: OrdersSnapshot): Promise<void> {
  await chrome.storage.local.set({ [StorageKeys.ordersSnapshot]: snapshot })
}
```

Update `src/background/index.ts`：接收 content 发来的 `PLATFORM_ORDERS_UPDATED`，落盘，并把同消息再 `chrome.runtime.sendMessage` 广播给 panel（panel 可监听并更新 UI）。

- [ ] **Step 5: OrdersTab：展示识别数量 + 支持选择（仅本地 state）**

Modify `src/panel/tabs/OrdersTab.tsx`：

```tsx
import { useEffect, useMemo, useState } from "react"
import type { OrderItem } from "../../shared/types"
import type { PlatformOrdersUpdated } from "../../shared/messages"
import { getOrdersSnapshot } from "../../shared/storage"

export function OrdersTab() {
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [meta, setMeta] = useState<{ platform: string; context: string }>({ platform: "unknown", context: "unknown" })

  useEffect(() => {
    void (async () => {
      const snap = await getOrdersSnapshot()
      if (!snap) return
      setOrders(snap.orders)
      setMeta({ platform: snap.platform, context: snap.context })
    })()
  }, [])

  useEffect(() => {
    function onMsg(message: PlatformOrdersUpdated) {
      if (message.type !== "PLATFORM_ORDERS_UPDATED") return
      setOrders(message.payload.orders)
      setMeta({ platform: message.payload.platform, context: message.payload.context })
      setSelected({})
    }
    chrome.runtime.onMessage.addListener(onMsg as any)
    return () => chrome.runtime.onMessage.removeListener(onMsg as any)
  }, [])

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected])

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">订单</div>
      <div className="text-xs text-slate-600">
        平台：{meta.platform} / 上下文：{meta.context} / 识别：{orders.length} / 已选：{selectedCount}
      </div>
      <div className="space-y-2">
        {orders.map((o) => (
          <label key={o.orderKey} className="flex items-start gap-2 rounded border p-2">
            <input type="checkbox" checked={Boolean(selected[o.orderKey])} onChange={(e) => setSelected((s) => ({ ...s, [o.orderKey]: e.target.checked }))} />
            <div className="min-w-0">
              <div className="truncate text-sm">{o.title}</div>
              {o.skuText ? <div className="truncate text-xs text-slate-600">{o.skuText}</div> : null}
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: 构建并本地加载验证（Ticket 4）**

Run:

```bash
pnpm build
```

Manual verify:
- 打开京东待评价列表页
- Side Panel → 订单 Tab 出现订单列表与数量
- 勾选后已选数量变化

- [ ] **Step 7: Commit（Ticket 4）**

```bash
git add -A
git commit -m "Ticket 4"
```

---

### Task 5：批量生成草稿（队列/进度/缓存）+ Drafts UI（Ticket 5）

**Files:**
- Create: `src/generator/prompt.ts`
- Create: `src/generator/parse.ts`
- Create: `src/background/queue.ts`
- Modify: `src/background/index.ts`（GEN_DRAFTS_START）
- Modify: `src/shared/storage.ts`（draftsByOrderKey 存储）
- Modify: `src/panel/tabs/OrdersTab.tsx`（生成按钮、rating/tags）
- Modify: `src/panel/tabs/DraftsTab.tsx`（展示/复制）

- [ ] **Step 1: 生成 Prompt（严格 JSON 输出约束）**

Create `src/generator/prompt.ts`：

```ts
import type { OrderItem } from "../shared/types"

export function buildPrompt(args: {
  order: OrderItem
  rating: number
  tags: string[]
  style?: string
}): string {
  const { order, rating, tags, style } = args
  const tagText = tags.length ? `tags: ${tags.join(", ")}` : "tags: (none)"
  const styleText = style?.trim() ? `style: ${style.trim()}` : "style: (default)"
  return [
    "请根据订单信息生成三条中文评价草稿（短/中/长），只基于订单信息与 tags 明确事实，不编造使用时长、功效、夸大承诺；三条草稿表达必须明显不同。",
    "输出必须是严格 JSON 数组，且只输出 JSON，不要输出任何多余文本。",
    "数组每一项字段固定：orderKey, rating, draft_short, draft_mid, draft_long。",
    `orderKey: ${order.orderKey}`,
    `title: ${order.title}`,
    order.skuText ? `skuText: ${order.skuText}` : "skuText: (none)",
    tagText,
    styleText,
    `rating: ${rating}`,
    "输出示例：[{\"orderKey\":\"...\",\"rating\":5,\"draft_short\":\"...\",\"draft_mid\":\"...\",\"draft_long\":\"...\"}]",
  ].join("\n")
}
```

- [ ] **Step 2: 解析与校验 Draft JSON**

Create `src/generator/parse.ts`：

```ts
import type { DraftItem } from "../shared/types"

export function parseDrafts(text: string): DraftItem[] {
  const trimmed = text.trim()
  const jsonStart = trimmed.indexOf("[")
  const jsonEnd = trimmed.lastIndexOf("]")
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) throw new Error("模型输出不是 JSON 数组")
  const jsonText = trimmed.slice(jsonStart, jsonEnd + 1)
  const data = JSON.parse(jsonText) as any
  if (!Array.isArray(data)) throw new Error("JSON 不是数组")
  const out: DraftItem[] = []
  for (const item of data) {
    if (!item || typeof item !== "object") throw new Error("数组项不是对象")
    if (typeof item.orderKey !== "string") throw new Error("orderKey 缺失")
    if (typeof item.rating !== "number") throw new Error("rating 缺失")
    if (typeof item.draft_short !== "string") throw new Error("draft_short 缺失")
    if (typeof item.draft_mid !== "string") throw new Error("draft_mid 缺失")
    if (typeof item.draft_long !== "string") throw new Error("draft_long 缺失")
    out.push(item as DraftItem)
  }
  return out
}
```

- [ ] **Step 3: draftsByOrderKey 存储**

Update `src/shared/storage.ts` 增加：

```ts
import type { DraftItem } from "./types"

export type DraftsByOrderKey = Record<string, DraftItem>

export async function getDraftsByOrderKey(): Promise<DraftsByOrderKey> {
  const result = await chrome.storage.local.get(StorageKeys.draftsByOrderKey)
  return (result[StorageKeys.draftsByOrderKey] as DraftsByOrderKey | undefined) ?? {}
}

export async function setDraftsByOrderKey(map: DraftsByOrderKey): Promise<void> {
  await chrome.storage.local.set({ [StorageKeys.draftsByOrderKey]: map })
}
```

- [ ] **Step 4: background 队列（串行即可，预留并发/重试）**

Create `src/background/queue.ts`：

```ts
import type { DraftItem, OrderItem, ProviderConfig } from "../shared/types"
import { buildPrompt } from "../generator/prompt"
import { parseDrafts } from "../generator/parse"
import { openaiProvider } from "./providers/openai"
import { claudeProvider } from "./providers/claude"

function getProvider(provider: ProviderConfig["provider"]) {
  if (provider === "openai") return openaiProvider
  return claudeProvider
}

export async function generateDraftForOrder(args: {
  providerConfig: ProviderConfig
  order: OrderItem
  rating: number
  tags: string[]
  style?: string
}): Promise<DraftItem> {
  const prompt = buildPrompt({ order: args.order, rating: args.rating, tags: args.tags, style: args.style })
  const provider = getProvider(args.providerConfig.provider)
  const req = provider.buildRequest(args.providerConfig, prompt)
  const resp = await fetch(req.url, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify(req.body),
  })
  if (!resp.ok) throw new Error((await resp.text()).slice(0, 500))
  const json = await resp.json()
  const text = provider.parseText(json)
  const drafts = parseDrafts(text)
  const first = drafts.find((d) => d.orderKey === args.order.orderKey) ?? drafts[0]
  if (!first) throw new Error("空草稿结果")
  return { ...first, orderKey: args.order.orderKey, rating: args.rating }
}
```

- [ ] **Step 5: background 处理 GEN_DRAFTS_START，逐单生成并回传进度/结果并落盘**

Modify `src/background/index.ts` 增加 GEN_DRAFTS_START 分支：

实现要点：
- total=orders.length
- 每生成一单发 `GEN_DRAFTS_PROGRESS`
- 全部成功后发 `GEN_DRAFTS_RESULT { drafts }`
- 任意失败发 `GEN_DRAFTS_ERROR`（继续生成下一单）
- 最终把成功 drafts 合并写入 draftsByOrderKey

- [ ] **Step 6: OrdersTab 增加 rating/tags 与“批量生成”按钮**

Modify `src/panel/tabs/OrdersTab.tsx`：
- 增加 `rating`（默认 5）与 `tags` 输入（逗号分隔即可）
- 生成按钮点击时，把已选订单数组 + providerConfig + rating/tags/style 发送给 background：`GEN_DRAFTS_START`
- 监听 `GEN_DRAFTS_PROGRESS/RESULT/ERROR` 更新状态

- [ ] **Step 7: DraftsTab：从 storage 读取草稿并按订单展示，支持复制**

Modify `src/panel/tabs/DraftsTab.tsx`：
- 读取 draftsByOrderKey 并渲染
- 每条草稿提供复制按钮（调用 `navigator.clipboard.writeText`）

- [ ] **Step 8: 构建并本地加载验证（Ticket 5）**

Manual verify:
- 在京东待评价列表选择多单 → 点击批量生成
- Side Panel 显示进度（done/total）并最终在草稿 Tab 出现对应订单草稿
- 关闭/重开 Side Panel 草稿仍存在（落盘成功）

- [ ] **Step 9: Commit（Ticket 5）**

```bash
git add -A
git commit -m "Ticket 5"
```

---

### Task 6：京东评价页一键填入（不提交）（Ticket 6）

**Files:**
- Create: `src/platforms/jd/fill.ts`
- Modify: `src/platforms/jd/adapter.ts`
- Modify: `src/panel/tabs/DraftsTab.tsx`

- [ ] **Step 1: 实现 fill：定位文本输入框并触发 input 事件**

Create `src/platforms/jd/fill.ts`：

```ts
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
```

- [ ] **Step 2: 串联 jd adapter.fillReview**

Modify `src/platforms/jd/adapter.ts`：

```ts
import { fillJdReview } from "./fill"
// ...
fillReview: fillJdReview,
```

- [ ] **Step 3: DraftsTab 增加“一键填入”按钮（仅在评价页上下文可用）**

实现要点：
- DraftsTab 读取当前 context（从 ordersSnapshot 或通过 content 额外同步 context）
- 点击填入：发送 `PLATFORM_FILL_REVIEW { platform, orderKey, text }` 到 content（用 `chrome.tabs.query` 找到当前激活 tab 并 `chrome.tabs.sendMessage`）

- [ ] **Step 4: 构建并本地加载验证（Ticket 6）**

Manual verify:
- 打开京东某笔评价页
- Side Panel → 草稿 Tab → 对某条草稿点击“一键填入”
- 页面输入框出现对应文本，且不会自动提交

- [ ] **Step 5: Commit（Ticket 6）**

```bash
git add -A
git commit -m "Ticket 6"
```

---

### Task 7：补齐更多 Provider（Ticket 7，可推迟到 v1.1）

说明：按需求扩展 provider 目录结构与 Settings 动态 requiredExtraFields。若 v1 阶段只需 OpenAI/Claude，可在此 Ticket 暂不执行。

---

### Task 8：淘宝平台适配（新增模块，不动业务）（Ticket 8 / v1.1）

**Files:**
- Modify: `src/platforms/taobao/adapter.ts`
- Create: `src/platforms/taobao/detect.ts`
- Create: `src/platforms/taobao/extract.ts`
- Create: `src/platforms/taobao/fill.ts`

- [ ] **Step 1: detect：识别淘宝待评价列表与评价页**

Create `src/platforms/taobao/detect.ts`：

```ts
import type { Context } from "../../shared/types"

export function detectTaobaoContext(tabUrl: string, doc: Document): Context {
  const url = tabUrl
  if (url.includes("rate") || url.includes("comment")) return "review_page"
  const hasRate = Boolean(doc.querySelector("[class*='rate'],[id*='rate']"))
  if (hasRate) return "order_list_pending_review"
  return "unknown"
}
```

- [ ] **Step 2: extract：抽取订单（orderKey/title/url）**

Create `src/platforms/taobao/extract.ts`：

```ts
import type { OrderItem } from "../../shared/types"

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? "").trim()
}

export async function extractTaobaoOrders(doc: Document): Promise<OrderItem[]> {
  const items: OrderItem[] = []
  const rows = Array.from(doc.querySelectorAll("a[href],div,li"))
  for (const row of rows) {
    const a = row.querySelector("a[href]") as HTMLAnchorElement | null
    const title = text(row.querySelector("[class*='title'],[class*='name']")) || text(a)
    if (!title) continue
    const url = a ? new URL(a.href, location.href).toString() : undefined
    const orderKey = url || title
    items.push({ platform: "taobao", orderKey, title, itemUrl: url })
  }
  const uniq = new Map<string, OrderItem>()
  for (const it of items) uniq.set(it.orderKey, it)
  return Array.from(uniq.values()).slice(0, 50)
}
```

- [ ] **Step 3: fill：定位输入框并填入**

Create `src/platforms/taobao/fill.ts`：

```ts
function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event("input", { bubbles: true }))
  el.dispatchEvent(new Event("change", { bubbles: true }))
}

export async function fillTaobaoReview(doc: Document, text: string): Promise<void> {
  const textarea =
    (doc.querySelector("textarea") as HTMLTextAreaElement | null) ??
    (doc.querySelector("input[type='text']") as HTMLInputElement | null)
  if (!textarea) throw new Error("未找到输入框")
  setNativeValue(textarea, text)
  textarea.focus()
}
```

- [ ] **Step 4: 串联 taobao adapter**

Modify `src/platforms/taobao/adapter.ts`：

```ts
import type { PlatformAdapter } from "../types"
import { detectTaobaoContext } from "./detect"
import { extractTaobaoOrders } from "./extract"
import { fillTaobaoReview } from "./fill"

export const taobaoAdapter: PlatformAdapter = {
  platform: "taobao",
  detectContext: detectTaobaoContext,
  extractOrders: extractTaobaoOrders,
  fillReview: fillTaobaoReview,
}
```

- [ ] **Step 5: 构建并本地加载验证（Ticket 8）**

Manual verify:
- 打开淘宝待评价列表页可识别订单并在 OrdersTab 展示
- 打开淘宝评价页可一键填入，不自动提交

- [ ] **Step 6: Commit（Ticket 8）**

```bash
git add -A
git commit -m "Ticket 8"
```

---

## 自检（对齐 spec）

- v1 京东：Ticket 1~6 覆盖（Side Panel/Settings/provider/dispatcher/JD extract+fill/批量生成+缓存）
- v1.1 淘宝：Ticket 8 覆盖（新增模块，不动业务层）
- 预留平台：Ticket 3 预留 adapter 空实现
- 不自动提交：fill 实现只写 input，不触发提交
- Key 不外泄：background 不打印 key；UI 不记录日志

---

## 执行方式选择

计划已完成并保存到 [2026-04-13-jd-taobao-review-draft-sidepanel-implementation-plan.md](file:///workspace/docs/superpowers/plans/2026-04-13-jd-taobao-review-draft-sidepanel-implementation-plan.md)。

两种执行选项：

1. Subagent-Driven（推荐）- 我按 Task/Ticket 分发子任务并逐步 review
2. Inline Execution - 我在当前会话里按 Ticket 顺序直接执行并在每个 Ticket 完成后验证与提交

请选择一种执行方式。

