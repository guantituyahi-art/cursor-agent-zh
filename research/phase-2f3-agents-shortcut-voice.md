# Phase 2F.3 — Agents 提交快捷键与语音关键词说明

> 日期：2026-09-25（Asia/Shanghai）
> 状态：实机只读节点验证、本地测试、部署与界面验收通过。
> 范围：Agents 设置页的 Submit with Ctrl + Enter、Voice Submit Keywords 两行，仅静态标签与说明。

## 准入证据

Phase 2A 截图记录了 Windows 页的可见原文。用户在 Cursor 3.22.7 的独立 Agents Window → Settings → Agents 运行只读 DOM 探针，返回 Glass=true、data-react-tab=chat 页面存在。两行各有一个完整标签 Text Node 和一个完整说明 Text Node，分别位于 ui-field-group__entry-label / ui-field-group__entry-description。Voice Submit Keywords 的标签和说明可在 Glass bundle 中静态全文找到；提交快捷键说明按平台生成，Windows 实机确认的完整文本为下表原文。

沿用 agents-settings-label / agents-settings-description 页面和容器作用域，完整英文串匹配，并先通过消息、代码、终端及可编辑内容安全排除。自定义语音关键词及输入框不属于词典候选。

## 四条译文

| 英文 | 中文 |
| --- | --- |
| Submit with Ctrl + Enter | 使用 Ctrl + Enter 提交 |
| Ctrl+Enter submits chat, Enter inserts a newline, and primary actions move to Ctrl+Alt+Enter | Ctrl+Enter 提交聊天，Enter 插入换行，主要操作改用 Ctrl+Alt+Enter |
| Voice Submit Keywords | 语音提交关键词 |
| Custom words that submit a voice prompt. Spaces and punctuation are ignored. | 用于提交语音提示词的自定义词语；空格和标点符号会被忽略。 |

译文保留 Windows 页中 Ctrl + Enter、Ctrl+Enter、Enter、Ctrl+Alt+Enter 的原写法。其它系统快捷键形式不匹配此规则。设置开关、用户自定义词、消息正文及审批/安全文案保持原样。

## 验证与部署

本地通过十组 Agents 设置正向与负向作用域、初始与动态扫描、可编辑区域和其它系统快捷键排除测试；Settings 导航、General、Appearance、exact、Search 与安全回归通过。

部署脚本确认 Cursor 3.22.7 / commit 37076c6c3f9e253c0fa2305197e45befd13a2260，复用安装目录外备份，Glass loader marker=1。Glass SHA256=195D857FF651DB5FE797285D76758C257EF8ECD5E9AFA779915BC05352EAA379；sidecar SHA256=D42A0FCA187C99178BFD46D00C602B06F2985460A0BEBBF57CA4216D998B3373，与仓库生成内容一致。用户确认汉化正常；只读运行时探针返回 phase=2F.3，四条固定文案的 contextualTranslationCounts 均为 1。用户未报告新的 cursor-agent-zh 前缀错误。
