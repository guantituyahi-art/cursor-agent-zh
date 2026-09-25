# cursor-agent-zh

面向 **Cursor 独立 Agent Window（Glass）** 的轻量简体中文界面增强（实验项目）。

## 项目目标

- 仅增强 **Agent Window**，不把普通编辑器当作汉化范围。
- 提供少量 UI 文案词典雏形与用户消息样式增强。
- 研究社区汉化方案，为后续「Glass 作用域运行时 DOM 翻译」做架构准备。

## 当前阶段

Phase 1D.2b.1 已在 Cursor 3.21.18 人工验收：Glass 内三个 exact 文案及侧栏 Search 上下文翻译。Cursor 3.22.7 兼容适配已验收；Phase 2A 三页首轮盘点已完成，Phase 2B.1 的 Appearance 四个标签已获实机显示与控件反馈；Phase 2B.2 的同页九个新增标签已获实机确认；Phase 2C.1 的四条 Appearance 说明文案已获实机确认；Phase 2C.2 的同页九条新增说明已获实机确认；Phase 2D.1 的 General 页四组静态文案已获实机确认；Phase 2D.2 的同页三组新增文案已获实机确认；Phase 2E.1 的 Settings 十四项导航标签已获实机确认。Console 基线仍有未判定项。运行时与部署细节见 [架构](docs/architecture.md) 和 [3.22.7 升级审计](research/cursor-3.22.7-upgrade-compat.md)。

## 版本说明

- 已验收基线：**Cursor 3.21.18**；当前适配目标：**3.22.7**
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
runtime/        Glass 运行时翻译器
translations/   exact / contextual / dynamic 分层词典
styles/         Agent Window 样式（用户消息）
scripts/        部署、还原与回归测试
```

## 文档入口

- [初步架构](docs/architecture.md)（Invariants · Checksum 原则 · 词典分层 · Phase 1 注入研究与 PoC 门禁）
- [兼容性清单](docs/compatibility.md)
- [Cursor 3.21.18 调研](research/cursor-3.21.18.md)
- [Cursor 3.22.7 适配记录](research/cursor-3.22.7-adaptation.md)
- [Phase 2A Settings 盘点](research/phase-2a-settings-inventory.md)
- [Phase 2B.1 Appearance 标签验证](research/phase-2b1-appearance-labels.md)
- [Phase 2B.2 Appearance 标签扩展](research/phase-2b2-appearance-labels.md)
- [Phase 2C.1 Appearance 说明文案](research/phase-2c1-appearance-descriptions.md)
- [Phase 2C.2 Appearance 说明扩展](research/phase-2c2-appearance-descriptions.md)
- [Phase 2D.1 General 静态文案](research/phase-2d1-general-settings.md)
- [Phase 2D.2 General 文案扩展](research/phase-2d2-general-settings.md)
- [Phase 2E.1 Settings 导航](research/phase-2e1-settings-navigation.md)
- [既有项目深度分析](research/existing-projects.md)

## 许可

MIT © 2026 guantituyahi-art / Tuyahi Guanti (hexiuyuan)
