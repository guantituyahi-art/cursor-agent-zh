# cursor-agent-zh

面向 **Cursor 独立 Agent Window（Glass）** 的轻量简体中文界面增强（实验项目）。

## 项目目标

- 仅增强 **Agent Window**，不把普通编辑器当作汉化范围。
- 提供少量 UI 文案词典雏形与用户消息样式增强。
- 研究社区汉化方案，为后续「Glass 作用域运行时 DOM 翻译」做架构准备。

## 当前阶段

### Phase 0（已完成）

- ✅ 仓库脚手架、词典雏形、用户消息 CSS、研究文档、架构与兼容清单
- ❌ **尚未实现**运行时翻译器
- ❌ **尚未提供**可执行的备份/注入脚本
- ❌ 不修改你本机的 Cursor 安装文件（请勿手工乱改）

### Phase 1（下一步）

1. **注入加载研究**（如何在每次 Glass 启动时可靠加载我们的 JS；候选见架构 §D，先调研不急着定案）
2. **PoC 文案门禁**：New Chat / New Project / Automations（1D.1 校准；其它种子 deferred）（须过架构 §E 全部条件）
3. 仅在 PoC 通过后，才考虑更大范围（如 Settings）本地化

硬安全边界（消息正文 / 代码 / 终端 / 路径 / 协议字段等永不翻译）与 Phase 1 门禁详见 [`docs/architecture.md`](docs/architecture.md)。

## 版本说明

- 主要实验版本：**Cursor 3.21.18**
- **不承诺**跨版本兼容；升级后须按 `docs/compatibility.md` 重新检查

## 重要限制

- **不会**翻译聊天正文（用户消息 / AI 回复 / 工具输出）
- **不会**翻译代码块、终端内容、文件路径、工具参数、协议字段、模型名、命令、URL
- **请勿**将本项目理解为「完整汉化」或官方语言包

## 修改 Cursor 前必读

若后续阶段需要向 Cursor 安装目录写入文件：

1. **先备份**，并确认可以还原  
2. **先做兼容检查**（`docs/compatibility.md`）  
3. **优先避免**修改被 checksum 保护的文件；不要以改写 checksum 掩盖改动（见架构 §B）  
4. 再考虑最小加载注入或 CSS 注入  

## 目录结构

```text
docs/           架构与兼容性说明
research/       版本调研与既有项目分析
runtime/        运行时翻译器占位（未实现）
translations/   简体中文词典雏形（当前扁平种子；目标分层见架构 §C）
styles/         Agent Window 样式（用户消息）
scripts/        备份/检查/注入脚本占位（未实现）
```

## 文档入口

- [初步架构](docs/architecture.md)（Invariants · Checksum 原则 · 词典分层 · Phase 1 注入研究与 PoC 门禁）
- [兼容性清单](docs/compatibility.md)
- [Cursor 3.21.18 调研](research/cursor-3.21.18.md)
- [既有项目深度分析](research/existing-projects.md)

## 许可

MIT © 2026 guantituyahi-art / Tuyahi Guanti (hexiuyuan)
