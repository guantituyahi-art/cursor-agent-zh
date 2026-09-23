# runtime/

本目录为**未来**运行时翻译器占位。

## 当前状态

- **尚未实现**运行时翻译器。
- Phase 0 仅保留目录与说明，不包含可注入的 JS 实现。

## 规划方向（未实现）

- 基于 DOM `MutationObserver`（或等价观察机制）的界面文案替换。
- **作用域限定**：仅 Agent Window / Glass Workbench，不覆盖普通编辑器主窗口。
- 词典与执行逻辑分离（词典见 `translations/`）。
- 明确跳过：用户消息、AI 回复正文、代码块、终端、文件路径、工具参数、协议字段。

实现前请阅读 `docs/architecture.md` 与 `docs/compatibility.md`。
