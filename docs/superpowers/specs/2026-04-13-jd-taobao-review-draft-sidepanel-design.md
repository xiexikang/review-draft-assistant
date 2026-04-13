# 京东→淘宝 批量评价草稿插件（Side Panel）设计说明（v1/v1.1）

## 目标与边界

### v1（京东）

- 在京东「待评价」列表页识别订单条目并支持批量选择
- 批量为每单生成 3 条中文评价草稿（短/中/长），在 Side Panel 展示并支持复制
- 在单笔评价页支持一键填入输入框（不自动提交）
- 支持多模型厂商：用户在插件中填写各厂商 API Key；支持测试连接；高级参数可配置

### v1.1（淘宝）

- 淘宝新增同等能力：待评价列表抽取 + 评价页填入
- UI 与生成逻辑复用，不为淘宝复制一套业务层

### 预留（不做）

- 美团、抖音仅预留平台适配接口与目录结构，不实现抽取与填入
- 不做自动提交评价、自动化发布、风控对抗
- 不做自动拉取厂商模型列表（v1 用推荐模型下拉 + 可手填）

## 非目标

- 账号体系、云同步、多人协作
- 评价内容合规审查自动化（仅通过 prompt 与约束降低风险）

## 总体架构

### 技术栈

- Chrome Extension：Manifest V3
- UI：Side Panel + React + TypeScript + Tailwind + Vite
- 存储：chrome.storage.local
- 背景服务：background service worker（统一模型调用与队列）
- 页面注入：content scripts（按平台拆分适配逻辑）

### 分层与职责

- platforms（平台适配层）：识别页面 / 抽取订单 / 填入文本
- generator（生成层）：prompt 拼装与响应解析，输出规范化 drafts
- panel（UI 层）：选择订单与参数，触发生成，展示草稿与复制/填入动作
- background（执行层）：provider 调用、队列与进度、错误重试、缓存落盘

## 目录结构（建议）

- src/panel：Side Panel 应用（Orders/Drafts/Settings 三 Tab）
- src/background：service worker（provider 调用与队列）
- src/content：content script 总入口与消息桥
- src/platforms：平台适配器与分发器
  - src/platforms/jd：v1 实现
  - src/platforms/taobao：v1.1 实现
  - src/platforms/meituan：预留空实现
  - src/platforms/douyin：预留空实现
- src/generator：prompt 规范、draft 校验、生成请求编排（平台无关）
- src/shared：跨层共享的 types、storage keys、消息协议定义

## 平台适配层设计

### 统一接口

每个平台实现以下接口：

- detectContext(tabUrl, document): Context
- extractOrders(document): Promise<OrderItem[]>
- fillReview(document, text): Promise<void>（只填入不提交）

Context 取值：

- order_list_pending_review
- review_page
- unknown

OrderItem 结构：

- platform: jd | taobao | meituan | douyin
- orderKey: string（稳定绑定草稿、用于缓存与填入）
- title: string
- skuText?: string
- itemUrl?: string

### 分发器

src/platforms/index.ts 提供：

- getPlatformByUrl(url): Platform
- getAdapter(platform): PlatformAdapter

content script 单入口职责：

1) 判断当前平台与上下文
2) 在列表页调用 adapter.extractOrders 并推送给 panel
3) 在评价页接收 fill 消息后调用 adapter.fillReview

### 预留平台策略

- 淘宝/meituan/douyin 在 v1 只提供 detectContext=unknown / extractOrders=[] / fillReview=noop
- platform 分发器依旧可以识别 URL 平台枚举（unknown 之外），但 adapter 行为为空实现

## 生成层与 Provider 设计

### Provider Adapter 统一接口

每家厂商实现：

- defaultBaseUrl
- recommendedModels[]
- requiredExtraFields[]（例如 app_id / group_id 等）
- buildRequest(config, prompt) → { url, headers, body }
- parseText(respJson) → string
- testRequest(config) → { url, headers, body }

v1 先实现：

- OpenAI
- Claude

### 统一输出规范（跨平台/跨厂商）

模型输出强制为严格 JSON 数组，每项字段固定：

- orderKey
- rating
- draft_short
- draft_mid
- draft_long

约束：

- 只基于订单信息与 tags 明确事实，不编造使用时长、功效、夸大承诺
- 三条草稿表达必须明显不同（句式/开头/词汇变化）

### Prompt 生成

- 生成层根据 OrderItem、rating、tags、style 拼接 prompt
- 生成层在 background 中对返回文本执行 JSON 解析与字段校验
- 校验失败时：
  - 先进行一次“仅修复为合法 JSON”的再提示重试
  - 仍失败则返回可读错误到 panel（不落盘）

## Side Panel UI（信息架构与交互）

顶部 Tabs：

1) 订单
2) 草稿
3) 设置

### 订单 Tab

- 展示：当前页面识别的平台与上下文、识别到的订单数量
- 操作：批量选择、统一星级（默认 5）、tags chips、style（可选）
- 触发：批量生成按钮
- 状态：生成进度 done/total + 当前 orderKey

### 草稿 Tab

- 按订单卡片展示短/中/长三条草稿
- 操作：复制短/中/长；在评价页上下文下提供“一键填入”
- 填入策略：由用户选择具体一条草稿后触发填入（不自动提交）

### 设置 Tab

- 基础：厂商、API Key、模型、测试连接、保存
- 高级（折叠）：Base URL、maxTokens、temperature、extra（动态字段）

## 通信协议

content → panel：

- PLATFORM_ORDERS_UPDATED { platform, context, orders }

panel → background：

- PROVIDER_TEST { providerConfig }
- GEN_DRAFTS_START { providerConfig, orders, rating, tags, style }

background → panel：

- GEN_DRAFTS_PROGRESS { done, total, currentOrderKey }
- GEN_DRAFTS_RESULT { drafts }
- GEN_DRAFTS_ERROR { orderKey?, errorMessage }

panel/background → content：

- PLATFORM_FILL_REVIEW { platform, orderKey, text }

## 数据存储

存储位置：chrome.storage.local

- providerConfig：用户选择的 provider + key + model + 高级参数 + extraFields
- ordersSnapshot：最近一次识别到的平台上下文与订单列表（供 panel 展示）
- draftsByOrderKey：按 orderKey 持久化草稿与元信息（rating/tags/updatedAt）

缓存策略：

- 生成前：若 draftsByOrderKey 已存在且参数一致，则可跳过生成（以 v1 先不实现参数一致性判断为准，先简单覆盖）
- 生成后：按 orderKey 写入 draftsByOrderKey

## 错误处理与安全

- 不在日志中打印 API Key
- provider 调用错误统一转为可读消息回传 panel
- 网络请求只从 background 发起（减少 content/panel 暴露面）
- 不做自动提交，提交由用户手动完成

## 验收标准（按 Ticket）

- Ticket 1：扩展可在 Chrome 本地加载；Side Panel 三 Tab 可打开与切换
- Ticket 2：设置可保存/读取；OpenAI 与 Claude 测试连接可用（通过 background 发起请求）
- Ticket 3：平台分发器可按 URL 识别 jd/taobao/meituan/douyin；content 单入口按 adapter 调用；预留平台空实现不报错
- Ticket 4：京东待评价列表抽取订单；订单 Tab 可展示与选择
- Ticket 5：批量生成可队列执行并展示进度；草稿可按订单展示与复制；草稿按 orderKey 落盘
- Ticket 6：京东评价页可一键填入指定草稿（不自动提交）
- Ticket 8：淘宝新增抽取与填入，UI/生成层无需复制一套业务逻辑

