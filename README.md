# AI 一键评价助手 (Review Draft Assistant)

一款基于 Chrome Side Panel 的浏览器扩展，利用大语言模型（LLM）帮助用户在京东、淘宝等电商平台一键批量生成优质的评价草稿，并支持自动填入文本、自动打星和一键发表，彻底解放你的双手！

## ✨ 核心功能

- 🛍️ **多电商平台支持**：支持京东（JD）、淘宝（Taobao）待评价列表的数据自动抓取与订单智能合并展示。
- 🤖 **多 AI 模型接入**：内置 OpenAI、Claude、智谱 (Zhipu)、DeepSeek 等多种大语言模型接口兼容，支持自定义 Base URL、API Key 与高级生成参数。
- 📝 **批量生成评价草稿**：支持勾选多个订单，根据用户指定的星级、风格（如“简洁、口语化”）和自定义标签（如“物流快、包装好”）一键批量生成**短、中、长**三种字数的评价草稿，满足不同场景需求。
- ⚡ **自动填入与一键发表**：
  - 自动识别网页上的评价输入框并填入对应文案。
  - 根据生成的星级自动点亮所有的星星（商品评分、物流评分、服务评分等）。
  - 支持“**填入并发表**”按钮，自动等待页面响应后触发表单提交。
- 🎨 **现代化流畅 UI**：基于 React + Tailwind CSS 构建的侧边栏界面，仿原生的卡片式排版体验，包含商品图片缩略图、订单时间、规格数量等详细信息展示。

## 🛠️ 技术栈

- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) + [CRXJS Vite Plugin](https://crxjs.dev/) (用于构建 Chrome 扩展)
- [Tailwind CSS](https://tailwindcss.com/) (原子化 CSS 样式框架)
- **Chrome Extension Manifest V3** (包括 Side Panel API, Content Scripts, Background Service Worker)

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
   打开扩展侧边栏面板，切换到 **“AI设置”** 页签，选择你的大模型厂商（如 DeepSeek、智谱等），填入你的 API Key 和对应的模型名称，点击“保存”。可以通过“测试连接”来验证是否配置成功。
2. **抓取待评价订单**：
   在浏览器中打开京东的待评价页面（如 `https://club.jd.com/myJdcomments/myJdcomment.action`）或淘宝的待评价页面。
3. **刷新订单数据**：
   如果面板没有自动抓取，可以点击面板顶部订单标题旁的 **“刷新”** 按钮重新获取当前页面的订单。
4. **生成草稿**：
   勾选你要评价的订单，选择你想要给出的星级、风格，并点击“批量生成”按钮，等待 AI 返回生成的文案。
5. **一键评价**：
   点击“填入并发表”按钮，插件将自动把文字填入页面输入框、打上相应的星级，并在短暂等待后自动提交评价。

## 📜 许可证 (License)

[MIT License](LICENSE) © 2026 阿里巴啦
