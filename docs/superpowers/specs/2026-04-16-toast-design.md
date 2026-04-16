# Toast 轻提示（顶部居中）设计

## 背景与目标

侧边栏订单页存在多类操作：批量生成/一键生成/重新生成/复制/填入/填入并发表。当前仅在局部区域展示状态文本（如 `genStatus`、按钮旁的小字），用户需要更直观的“轻量弹窗提示”来确认操作是否开始、进行中、成功或失败。

目标：
- 在侧边栏面板内提供 **顶部居中** 的 Toast 轻提示。
- 覆盖全流程状态：进行中（loading）/成功（success）/失败（error）。
- **全局只显示一个 Toast**：新提示覆盖旧提示。
- 支持“同一流程更新文案”（例如生成进度 1/10→2/10→完成）。

非目标：
- 不实现 Toast 队列/堆叠列表。
- 不引入第三方 UI 库（除非项目已存在且用户明确要求）。

## 方案选择

采用方案 A：全局 `ToastProvider` + `useToast()`，单实例可更新。

理由：
- 全局复用（OrdersTab/SettingsTab 均可用）。
- 支持通过 `id` 更新同一条 Toast（非常适合生成进度）。
- 不依赖 DOM 结构，易测、易维护。

## UI/交互规格

### 位置与层级
- 位置：顶部居中（`fixed`），距离顶部约 `12px`。
- 层级：高于 OrdersTab/SettingsTab 内容（`z-index` 足够大）。
- 宽度：自适应内容，设置 `max-width`，超长文本自动换行或省略（实现时二选一）。

### 视觉样式
- 容器：白底、圆角、轻阴影、细边框。
- 图标：
  - loading：旋转指示
  - success：绿色对勾
  - error：红色错误符号
- 文案：单行优先，过长时折行或省略（默认折行以避免信息丢失）。

### 生命周期
- loading：默认不自动消失，直到被 success/error 覆盖或被手动隐藏。
- success/error：默认 1.8s 自动消失（可配置）。
- 覆盖策略：调用 `show()` 会覆盖当前 toast（不排队）。

## API 设计

### 数据结构
- `ToastType = "loading" | "success" | "error"`
- `ToastPayload`
  - `id?: string`：用于更新同一个 toast（如 `gen`、`fill`、`copy`）
  - `type: ToastType`
  - `text: string`
  - `durationMs?: number`：success/error 的自动消失时长

### Hook
- `useToast()` 返回：
  - `show(payload: ToastPayload): void`
  - `hide(): void`

规则：
- `show()` 如果传入 `id` 且当前 toast 的 `id` 相同，则更新现有 toast（类型/文案/时长均可更新）。
- `show()` 如果传入 `id` 不同或缺省，则直接覆盖当前 toast。

## 触发点（覆盖范围）

### OrdersTab
- 批量生成
  - 点击：loading「开始生成…」
  - 进度消息：loading「生成中：x/y」
  - 完成消息：success「已生成：N 单」
  - 失败消息：error「生成失败：原因」
- 一键生成/重新生成：复用同一套提示与同一 `id="gen"`（覆盖即可）。
- 复制
  - 成功：success「已复制」
  - 失败：error「复制失败」
- 填入/填入并发表
  - 点击：loading「填入中…」或「发表中…」
  - 成功：success「已填入」/「已提交」
  - 失败：error「填入失败：原因」

### SettingsTab（可选扩展）
- 测试连接：loading→success/error
- 保存：success/error

## 代码落点（计划）

- 新增：
  - `src/panel/components/Toast.tsx`：Toast UI 组件
  - `src/panel/toast/ToastProvider.tsx`：Provider + context
  - `src/panel/toast/useToast.ts`：hook（或从 provider 文件导出）
- 修改：
  - [App.tsx](file:///workspace/src/panel/App.tsx)：在最外层包裹 `ToastProvider`
  - [OrdersTab.tsx](file:///workspace/src/panel/tabs/OrdersTab.tsx)：在关键操作点调用 `show/hide`，并在消息监听处更新 toast
  - `SettingsTab.tsx`（如需）：测试连接/保存时调用 toast

## 风险与兼容性
- 并发操作：由于全局单实例，多个操作会互相覆盖提示，属于预期行为（符合“只显示一个”要求）。
- 文案过长：错误信息可能较长，UI 应允许换行或限制最大高度以避免遮挡过多内容。

## 验收标准
- 任意操作（批量生成/一键生成/重新生成/复制/填入/填入并发表）都会在顶部居中显示 toast。
- 生成流程会按进度更新同一个 toast 文案，并在完成/失败后自动消失。
- 填入/发表流程能正确显示 loading→success/error。
- 全程只出现一个 toast，新提示会覆盖旧提示。

