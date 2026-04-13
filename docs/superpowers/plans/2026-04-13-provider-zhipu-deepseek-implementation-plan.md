# Provider 扩展：智谱 & DeepSeek（OpenAI 兼容）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有扩展中新增智谱与 DeepSeek 两个 Provider（按 OpenAI Chat Completions 兼容协议），并在设置页可选、可测试连接、可用于草稿生成。

**Architecture:** 复用现有 ProviderAdapter 结构：新增 `zhipuProvider` 与 `deepseekProvider`（请求/解析与 OpenAI 一致，仅 defaultBaseUrl/推荐模型不同）；扩展 `ProviderId` 枚举；background 的 provider 分发增加分支；Settings 下拉新增两个选项；manifest 增加 host_permissions。

**Tech Stack:** Chrome Extension MV3, TypeScript, React, background service worker, fetch

---

### Task 1：扩展 ProviderId 与 Settings UI（预期影响最小）

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/panel/tabs/SettingsTab.tsx`

- [ ] **Step 1: 扩展 ProviderId**

Update [types.ts](file:///workspace/src/shared/types.ts)：

```ts
export type ProviderId = "openai" | "claude" | "zhipu" | "deepseek"
```

- [ ] **Step 2: Settings 下拉加入智谱与 DeepSeek，并补齐推荐模型列表**

Update [SettingsTab.tsx](file:///workspace/src/panel/tabs/SettingsTab.tsx)：

```ts
const providerModels: Record<ProviderId, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4.1-mini"],
  claude: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
  zhipu: ["glm-4-flash", "glm-4"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
}
```

并在 provider select 中加入：

```tsx
<option value="zhipu">智谱</option>
<option value="deepseek">DeepSeek</option>
```

- [ ] **Step 3: 本地构建验证**

Run:

```bash
pnpm build
```

Expected:
- `pnpm build` 通过
- Side Panel → 设置：厂商下拉出现智谱/DeepSeek，切换后模型下拉跟随变化

---

### Task 2：新增 zhipu/deepseek provider 并接入 background 分发

**Files:**
- Create: `src/background/providers/zhipu.ts`
- Create: `src/background/providers/deepseek.ts`
- Modify: `src/background/index.ts`

- [ ] **Step 1: 新增智谱 provider（OpenAI compatible）**

Create `src/background/providers/zhipu.ts`：

```ts
import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"

export const zhipuProvider: ProviderAdapter = {
  defaultBaseUrl: "https://open.bigmodel.cn",
  recommendedModels: ["glm-4-flash", "glm-4"],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) => {
    const baseUrl = config.baseUrl?.trim() || "https://open.bigmodel.cn"
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
  testRequest: (config: ProviderConfig) => zhipuProvider.buildRequest(config, "[{\"ok\":true}]"),
}
```

- [ ] **Step 2: 新增 DeepSeek provider（OpenAI compatible）**

Create `src/background/providers/deepseek.ts`：

```ts
import type { ProviderConfig } from "../../shared/types"
import type { ProviderAdapter } from "./types"

export const deepseekProvider: ProviderAdapter = {
  defaultBaseUrl: "https://api.deepseek.com",
  recommendedModels: ["deepseek-chat", "deepseek-reasoner"],
  requiredExtraFields: [],
  buildRequest: (config: ProviderConfig, prompt: string) => {
    const baseUrl = config.baseUrl?.trim() || "https://api.deepseek.com"
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
  testRequest: (config: ProviderConfig) => deepseekProvider.buildRequest(config, "[{\"ok\":true}]"),
}
```

- [ ] **Step 3: background 分发 getProvider 增加两家**

Update [background/index.ts](file:///workspace/src/background/index.ts)：

1) 增加 import：

```ts
import { deepseekProvider } from "./providers/deepseek"
import { zhipuProvider } from "./providers/zhipu"
```

2) 修改 getProvider 的入参类型与分支：

```ts
function getProvider(provider: "openai" | "claude" | "zhipu" | "deepseek") {
  if (provider === "openai") return openaiProvider
  if (provider === "claude") return claudeProvider
  if (provider === "zhipu") return zhipuProvider
  return deepseekProvider
}
```

- [ ] **Step 4: 本地构建验证**

Run:

```bash
pnpm build
```

Expected:
- `pnpm build` 通过
- 设置页选择智谱/DeepSeek → “测试连接”会从 background 发起请求并返回成功/失败提示（需要真实 key）

---

### Task 3：manifest host_permissions 补齐（减少 MV3 fetch 限制）

**Files:**
- Modify: `public/manifest.json`

- [ ] **Step 1: 扩展 host_permissions**

Update [manifest.json](file:///workspace/public/manifest.json)：

```json
"host_permissions": [
  "https://*.jd.com/*",
  "https://*.taobao.com/*",
  "https://api.openai.com/*",
  "https://api.anthropic.com/*",
  "https://open.bigmodel.cn/*",
  "https://api.deepseek.com/*"
],
```

- [ ] **Step 2: 本地构建验证**

Run:

```bash
pnpm build
```

Manual verify:
- 重新在 `chrome://extensions` 刷新扩展后，设置页测试连接可正常发起请求（不因权限被拦截）

---

### Task 4：提交 Ticket 7

**Files:**
- Modify/Create: 本计划所涉及文件

- [ ] **Step 1: git status 检查变更**

Run:

```bash
git status --porcelain=v1
```

- [ ] **Step 2: Commit**

Run:

```bash
git add -A
git commit -m "Ticket 7"
```

