# Phase 2C.1 — Appearance 四条说明文案

> 日期：2026-09-25（Asia/Shanghai）
> 状态：实机只读节点验证、本地测试、部署与界面验收通过。
> 范围：仅独立 Agents Window → Settings → Appearance 中四个已验证设置行的说明。

## 准入证据

Phase 2A 截图记录了英文原文。用户在 Cursor 3.22.7 的 Appearance 页执行只读 DOM 探针，返回 glass=true、appearance 页面容器存在；Theme、Tool Call Density、Code Block Word Wrap、Reduce Motion 对应的说明容器均存在，且各由一个完整 Text Node 构成。容器类名为 ui-field-group__entry-description。安装包只读静态检查也确认该语义类及四条英文原文存在，但实机探针是准入依据。其它九条说明仅完成截图与静态原文确认，尚无逐条实机文本节点证据，本批不翻译。

## 四条译文

| 英文原文 | 中文 |
| --- | --- |
| Choose between light, dark, or high contrast themes | 选择浅色、深色或高对比度主题 |
| Adjust how much detail is shown for tool calls | 调整工具调用显示的详细程度 |
| Wrap long lines in Agent conversation code blocks | 让智能体对话中的代码块长行自动换行 |
| Minimize interface animations. System follows your OS preference. | 减少界面动画。设为 System 时遵循操作系统偏好。 |

继续使用 contextual 全串匹配。新增 when=appearance-settings-description：必须同时位于 Glass body、data-react-tab=appearance 的 glass-settings-panel 和 ui-field-group__entry-description 内。既有标签使用单独的 appearance-settings-label 规则。两类规则均先通过消息、代码、终端和可编辑内容安全排除；不读取或更改设置值、代码 diff 示例、聊天正文、其它 Settings 页面。

## 验证

本地测试覆盖四条完整说明、外围空白、非 Glass、General/Agents 页、说明容器外、标签容器、消息、代码、可编辑内容、非完整短词、初始扫描和动态新增节点，并回归十三个既有标签与其它词条。部署和实机结果待补。

## 部署状态

Cursor 3.22.7 / commit 37076c6c3f9e253c0fa2305197e45befd13a2260 已通过部署检查并复用外部备份。Glass loader marker=1，Glass SHA256=195D857FF651DB5FE797285D76758C257EF8ECD5E9AFA779915BC05352EAA379；sidecar SHA256=38951B07F21D6403DBED16764110C43446C77000E4A6B6EF1FE2249066DE802D，与仓库生成内容一致。用户反馈四条说明均已显示中文，其它界面与控件正常；只读运行时探针返回 phase=2C.1，四个固定说明的 contextualTranslationCounts 均为 1。用户未报告新的 cursor-agent-zh 前缀错误。其它九条说明保持英文，尚未进入本阶段。
