# Provider 扩展：智谱 & DeepSeek（OpenAI 兼容）设计说明

## 目标

在现有插件的多模型厂商框架中新增两家厂商：

- 智谱（Zhipu / GLM）
- DeepSeek

要求：

- 作为新增 Provider 选项出现在 Side Panel 的“设置”页
- 仍然通过 background service worker 发起网络请求
- 协议按 OpenAI Chat Completions 兼容实现，复用现有 OpenAI provider 的请求与解析结构
- 允许用户在高级参数中覆盖 Base URL、模型、temperature、maxTokens

## 非目标

- 不实现厂商原生 API 的全部能力或特殊字段
- 不实现自动拉取模型列表
- 不引入额外的密钥管理或云端存储（仍存本地 chrome.storage.local）

## 现状与约束

- Provider 架构入口：background 根据 `ProviderConfig.provider` 选择 adapter（[index.ts](file:///workspace/src/background/index.ts)）
- Settings UI 目前支持 `openai` 与 `claude` 两种 ProviderId（[types.ts](file:///workspace/src/shared/types.ts)、[SettingsTab.tsx](file:///workspace/src/panel/tabs/SettingsTab.tsx)）
- OpenAI provider 使用 `POST /v1/chat/completions` 并按 `choices[0].message.content` 解析（[openai.ts](file:///workspace/src/background/providers/openai.ts)）

## 方案

### 1) 类型扩展

- 扩展 `ProviderId`：
  - `openai | claude | zhipu | deepseek`

### 2) Provider Adapter 实现

新增两份 provider 实现文件：

- `src/background/providers/zhipu.ts`
- `src/background/providers/deepseek.ts`

实现方式：

- request：
  - URL：`{baseUrl}/v1/chat/completions`
  - headers：`Authorization: Bearer {apiKey}`，`Content-Type: application/json`
  - body：沿用 OpenAI provider 的 `messages`、`temperature`、`max_tokens` 字段
- parse：
  - 复用 OpenAI provider 的 `choices[0].message.content`

默认 baseUrl 与推荐模型：

- 智谱（OpenAI 兼容）：默认 `https://open.bigmodel.cn`
- DeepSeek（OpenAI 兼容）：默认 `https://api.deepseek.com`

推荐模型：

- 智谱：`glm-4-flash`、`glm-4`
- DeepSeek：`deepseek-chat`、`deepseek-reasoner`

### 3) background 分发

在 background 中的 `getProvider()` 增加两个分支返回对应 provider adapter。

### 4) Settings UI

在 Settings 中：

- “厂商”下拉新增：智谱、DeepSeek
- `providerModels` 增加对应推荐模型列表

### 5) 权限（host_permissions）

为降低 MV3 环境下 fetch 被限制的概率，在 `public/manifest.json` 的 `host_permissions` 增加：

- `https://open.bigmodel.cn/*`
- `https://api.deepseek.com/*`
- 同时保留 OpenAI / Anthropic（当前代码默认 baseUrl 会用到）

## 验收标准

- 设置页可选择智谱/DeepSeek，模型下拉与厂商匹配
- 保存后重开 Side Panel 配置可回显
- “测试连接”对智谱/DeepSeek 可返回成功/失败提示（失败能显示可读的错误内容片段）
- `pnpm build` 通过，Chrome Load unpacked（dist）可正常加载

