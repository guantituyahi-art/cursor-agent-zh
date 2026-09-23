# Cursor 3.21.18 调研笔记

> 目标版本：Cursor **3.21.18**  
> 范围：独立 Agent Window（Glass Workbench）轻量简体中文 UI + 样式增强  
> 阶段：Phase 0（仅研究与脚手架；**尚未实现**运行时翻译器）

## 核心结论

| 项 | 结论 |
| --- | --- |
| Cursor 版本 | **3.21.18** |
| Agent Window | 使用 **Glass Workbench** |
| `workbench.glass.main.css` | 当前 **不在** `product.json` 的 checksum 列表中 |
| 用户消息稳定语义属性 | `data-message-kind="human"` + `data-message-role="human"` |
| Agent 回复 | `data-message-kind="assistant"` + `data-message-role="ai"` |
| 工具消息 | `data-message-kind="tool"` |
| 样式选择器注意 | **不能**仅依赖 `.composer-human-message`（输入框也使用该类） |
| 已验证 CSS | 见 `styles/user-message.css` |

## Glass / Agent Window

- 独立 Agent Window 与普通编辑器桌面 Workbench 分离，入口资源通常为 `workbench.glass.main.js`（及可能的 CSS）。
- 对 Agent Window 做 UI 汉化/样式时，应优先锚定 Glass 相关资源与 DOM，而不是默认的 `workbench.desktop.main.js`。
- `workbench.glass.main.css` 若不在 `product.json` checksum 中，注入/追加 CSS 的兼容风险相对低于被校验的 JS bundle；仍需在升级后复核。

## 消息 DOM 语义（稳定属性）

推荐用语义属性区分消息种类，而不是只靠 class：

```text
用户消息: data-message-kind="human"    + data-message-role="human"
Agent 回复: data-message-kind="assistant" + data-message-role="ai"
工具:     data-message-kind="tool"
```

`.composer-human-message` 会同时出现在「已发送的用户气泡」和「输入框区域」，因此样式与翻译作用域都必须叠加 `data-message-*`（以及可选的 `body[data-cursor-glass-mode="true"]`）限定。

## 已验证用户消息样式

完整 CSS 见仓库 `styles/user-message.css`：

- 背景 `#EEF3F8`，左侧边框 `3px solid #C5D0DC`
- 内容区上下 padding `11px`
- 选择器强制要求 Glass 模式 + human 语义属性，避免误伤输入框

## 对本项目的含义

1. **只做 Agent Window / Glass**，暂不汉化普通编辑器。
2. 运行时翻译（未来）应以 Glass DOM 为作用域，并用语义属性排除聊天正文。
3. CSS 增强可先于翻译器落地；注入前仍应做备份与兼容检查。
4. Cursor 升级后优先复查：Glass 资源是否存在、checksum 列表、选择器是否仍有效。
