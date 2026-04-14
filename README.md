# AI 一键评价助手 (Review Draft Assistant)

一款基于 Chrome Side Panel 的浏览器扩展，利用大语言模型（LLM）帮助用户在京东、淘宝等电商平台一键批量生成评价草稿，并支持自动填入文本、自动打星、可选一键发表。

## ✨ 核心功能

- 🛍️ **多电商平台支持**：支持京东（JD）、淘宝（Taobao）待评价列表的数据抓取与展示。
- 🤖 **多 AI 模型接入**：内置 OpenAI、Anthropic (Claude)、智谱（Zhipu / Z.ai）、DeepSeek、Qwen（通义千问）、MiniMax、Kimi（Moonshot）、OpenRouter 等；支持自定义 Base URL / API Key / 温度 / maxTokens。
- 📝 **生成评价草稿**：支持根据星级、风格（如“简洁、口语化”）和自定义标签（如“物流快、包装好”）生成短/中/长三种字数的草稿。
- ⚡ **批量生成 + 单条一键生成**：支持勾选多单批量生成，也支持在订单列表中对单个订单“一键生成 / 重新生成”。
- 🧩 **自动填入与可选一键发表**：自动识别评价输入框并填入、自动打星，并支持“填入并发表”（会触发页面提交）。
- 🧼 **只展示文本模型**：模型下拉中不展示视频/图片生成模型（仅保留文本/推理相关模型）。
- 🎨 **侧边栏 UI**：Side Panel 内卡片式展示订单信息、商品图片、规格与草稿预览。

## 🛠️ 技术栈

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)（Rollup 多入口：Side Panel / Background / Content Script）
- [Tailwind CSS](https://tailwindcss.com/)
- Chrome Extension Manifest V3（Side Panel、Content Scripts、Background Service Worker）

## 🚀 安装与运行

### 1. 克隆项目

```bash
git clone https://github.com/xiexikang/review-draft-assistant.git
cd review-draft-assistant
```

### 2. 安装依赖

本项目使用 `pnpm` 作为包管理工具，如果你还没安装，请先运行 `npm install -g pnpm`。

```bash
pnpm install
```

### 3. 本地构建

```bash
pnpm build
```

构建完成后，会在根目录下生成 `dist` 文件夹。

### 4. 在 Chrome 中加载扩展

1. 打开 Chrome 浏览器，在地址栏输入 `chrome://extensions/`
2. 开启右上角的 **“开发者模式”**
3. 点击左上角的 **“加载已解压的扩展程序”**
4. 选择本项目刚构建出的 `dist` 文件夹
5. （可选）将扩展固定在浏览器工具栏上，方便后续随时点开 Side Panel。

## 💡 使用指南

1. **配置大模型**：
   打开扩展侧边栏面板，进入 **“AI设置”**，选择大模型厂商，填入 API Key 与模型名称并点击“保存”。支持“测试连接”验证配置是否正确。
   - 推荐：如果你使用 OpenRouter（有免费额度），直接把厂商选成 OpenRouter，并在模型里填 `provider/model`（例如 `openai/gpt-5.4-mini`）。
2. **抓取待评价订单**：
   在浏览器中打开京东的待评价页面（如 `https://club.jd.com/myJdcomments/myJdcomment.action`）或淘宝的待评价页面。
3. **刷新订单数据**：
   如果面板没有自动抓取，可以点击面板顶部订单标题旁的 **“刷新”** 按钮重新获取当前页面的订单。
4. **生成草稿**：
   - 批量：勾选你要评价的订单，选择星级、风格后点击“批量生成”。
   - 单条：在订单列表的某条订单中点击“一键生成 / 重新生成”。
5. **一键评价**：
   点击“填入并发表”按钮，插件将自动把文字填入页面输入框、打上相应的星级，并在短暂等待后自动提交评价。

## 🔧 大模型配置（Base URL）

下表为各厂商常见 Base URL（也支持自定义代理）。

| 厂商 | 建议 Base URL | 说明 |
| --- | --- | --- |
| OpenRouter | `https://openrouter.ai/api/v1` | 使用 `provider/model` 形式（例如 `openai/gpt-5.4-mini`），可用 OpenRouter API Key（通常带免费额度） |
| OpenAI | `https://api.openai.com` | 也可切换到 OpenRouter |
| Anthropic (Claude) | `https://api.anthropic.com` | 使用 OpenRouter 时走 OpenAI 兼容 `/chat/completions` |
| 智谱（Zhipu / Z.ai） | `https://open.bigmodel.cn/api/paas/v4` 或 `https://api.z.ai/api/paas/v4` | OpenAI 兼容接口 |
| DeepSeek | `https://api.deepseek.com` | OpenAI 兼容接口 |
| Qwen（通义千问） | `https://dashscope.aliyuncs.com/compatible-mode/v1` | OpenAI 兼容接口 |
| MiniMax | `https://api.minimax.chat/v1` | OpenAI 兼容接口 |
| Kimi（Moonshot） | `https://api.moonshot.cn/v1` | OpenAI 兼容接口 |

## 🧩 OpenRouter 常用模型示例

OpenRouter 的模型名一般是 `provider/model`：

| 类型 | 示例 |
| --- | --- |
| OpenAI | `openai/gpt-5.4-mini` |
| Claude | `anthropic/claude-sonnet-4.6` |
| 智谱（Z.ai） | `z-ai/glm-4.7` |
| Qwen | `qwen/qwen3.6-plus` |
| DeepSeek | `deepseek/deepseek-chat` |
| Kimi | `moonshotai/kimi-k2` |
| MiniMax | `minimax/minimax-m2.5` |

## 🧯 常见问题

### 1) OpenRouter 连接失败：String contains non ISO-8859-1 code point

这是浏览器对 HTTP Header 的限制导致的（Header 值不能包含中文等非 Latin-1 字符）。更新到最新版本后已修复（将 OpenRouter 的 `X-Title` 头改为纯英文）。

## 📜 许可证 (License)

[MIT License](LICENSE) © 2026 阿里巴啦
