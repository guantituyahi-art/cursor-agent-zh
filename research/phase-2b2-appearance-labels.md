# Phase 2B.2 — Appearance 常用设置标签扩展

> 日期：2026-09-25（Asia/Shanghai）
> 状态：代码、本地回归、部署和十三个标签的实机验证通过。
> 范围：在 Phase 2B.1 四标签基础上，新增九个低风险静态标签。

## 依据

用户确认继续 Appearance 页。Phase 2A 截图已记录新增标签的真实可见英文；Phase 2B.1 已实机验证该页面的 Glass、data-react-tab=appearance 与 ui-field-group__entry-label 三层作用域，且四个标签正常翻译、控件正常。此次沿用同一上下文规则，不增加全局 exact 或其它页面选择器。

## 新增词条

| 英文 | 中文 |
| --- | --- |
| Themed Diff Backgrounds | 差异背景跟随主题 |
| Hue | 色相 |
| Intensity | 强度 |
| Reduce Transparency | 降低透明度 |
| UI Font Size | 界面字号 |
| Code Font Size | 代码字号 |
| UI Font Family | 界面字体 |
| Code Font Family | 代码字体 |
| Follow System High Contrast | 跟随系统高对比度 |

这批仅翻译设置行的完整标签 Text Node。说明文案、滑块值、字体名称、代码 diff 预览、Hide Email Address 隐私项和 Give the Agent a Confetti Cannon 趣味项保持原样。消息、代码与可编辑区域继续经过安全排除。

## 验证门槛

本地：语法、全部十三个 Appearance 标签的正向与负向作用域、初始扫描与动态新增节点；原有 exact、侧栏 Search、消息/代码安全、loader 和备份回归。

实机：九个新增标签显示中文，四个既有标签继续生效；说明、设置值和代码 diff 预览保持原样；相关控件可用；General/Agents 与聊天内容不受影响；记录 Console 中带 cursor-agent-zh 前缀的新错误。如缺少可比的原版 Console 采样，不把其它 Cursor 日志自动归因于本项目。

## 部署状态

Cursor 3.22.7 / commit 37076c6c3f9e253c0fa2305197e45befd13a2260 已通过部署前检查，复用外部版本化备份。Glass loader marker=1，Glass SHA256=195D857FF651DB5FE797285D76758C257EF8ECD5E9AFA779915BC05352EAA379；sidecar SHA256=40C7EC4F89533740197F1041FAC0B625573DEF76C0737E6B1ADC35A4212D3E7A，并与当前仓库生成内容一致。用户在独立 Agents Window 的 Appearance 页反馈“一切正常”；只读运行时探针返回 phase=2B.2，九个新增英文标签的 contextualTranslationCounts 均为 1。用户未报告新的 cursor-agent-zh 前缀错误。该反馈覆盖九个新增标签显示、四个既有标签、说明/设置值/代码预览及控件；其它 Cursor Console 日志仍遵循 Phase 2B.1 的证据边界。
