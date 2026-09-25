# Phase 2C.2 — Appearance 其余九条说明

> 日期：2026-09-25（Asia/Shanghai）
> 状态：实机只读节点验证、本地测试、部署与界面验收通过。
> 范围：在 Phase 2C.1 四条说明基础上，加入同页九条已验证说明。

## 准入证据

用户在 Cursor 3.22.7 的 Appearance 页执行只读 DOM 探针，返回 glass=true、appearance 页面容器存在。九个对应设置行与 ui-field-group__entry-description 容器均存在；每条英文说明各由一个完整 Text Node 构成，均与截图记录的原文全等。现有 when=appearance-settings-description 已要求 Glass body、data-react-tab=appearance 的 glass-settings-panel、语义说明容器与全文匹配；本批不增加选择器或全局 exact 词条。

## 新增词条

| 英文原文 | 中文 |
| --- | --- |
| Use themed background colors for inline code diffs | 为行内代码差异使用与主题匹配的背景色 |
| Choose a tint color | 选择界面的色调 |
| Control how strongly the tint is applied | 调整色调的应用强度 |
| Replace translucent surfaces with opaque backgrounds | 将半透明界面区域替换为不透明背景 |
| Font size for the Cursor user interface | Cursor 界面的字号 |
| Font size for code editors and diffs | 代码编辑器和差异视图的字号 |
| Override the Cursor user interface typeface | 覆盖 Cursor 界面使用的字体 |
| Override the font for code editors and diffs | 覆盖代码编辑器和差异视图使用的字体 |
| Switch to a high contrast theme when your OS is in a high contrast mode | 操作系统启用高对比度模式时，切换到高对比度主题 |

这些是界面静态说明，不包含设置值。滑块数值、字体名称、代码 diff 预览、聊天正文、其它 Settings 页面及隐私和趣味项继续不翻译。

## 验证与部署

本地通过 runtime 语法、十三条说明的正向与负向作用域、初始和动态扫描、十三个标签、exact 与侧栏 Search 回归。部署脚本确认 Cursor 3.22.7 / commit 37076c6c3f9e253c0fa2305197e45befd13a2260，复用安装目录外备份，Glass loader marker=1。Glass SHA256=195D857FF651DB5FE797285D76758C257EF8ECD5E9AFA779915BC05352EAA379；sidecar SHA256=9791CF0C6B9ED5F2FEF3F13F4BED56F370190EFB7F8AA4AF855E41A5673AAB0C，并与仓库生成内容一致。用户明确确认九条新增说明均已显示中文，并反馈其它显示与之前一致；只读运行时探针返回 phase=2C.2，九条固定说明的 contextualTranslationCounts 均为 1。用户未报告新的 cursor-agent-zh 前缀错误。
