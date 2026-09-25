# Phase 2D.1 — General 页四组静态文案

> 日期：2026-09-25（Asia/Shanghai）
> 状态：实机只读节点验证、本地测试、部署和界面验收通过。
> 范围：独立 Agents Window → Settings → General 的四个常用设置行；每行仅标签与说明。

## 准入证据

Phase 2A 截图记录了原文与页面上下文。用户在 Cursor 3.22.7 的 General 页执行只读 DOM 探针：glass=true，data-component=glass-settings-panel 且 data-react-tab=general 的容器存在。Tips、Window Restoration、System Notifications、Warning Notifications 四行各存在一个完整标签 Text Node 和一个完整说明 Text Node，分别位于 ui-field-group__entry-label 与 ui-field-group__entry-description。八条原文也在当前 Glass bundle 中静态可见。

运行时沿用 Appearance 已验证的设置文本作用域逻辑，但为 General 增加独立 when：general-settings-label / general-settings-description。规则必须同时满足 Glass body、general 页面标记、对应语义类以及英文全文匹配；全局 exact 不增加词条。先经过消息、代码、终端与可编辑内容安全排除。

## 八条译文

| 英文 | 中文 |
| --- | --- |
| Tips | 提示 |
| Show rotating tips on the empty screen | 在空白页面轮播使用提示 |
| Window Restoration | 窗口恢复 |
| Controls which windows Cursor restores on startup | 控制 Cursor 启动时恢复哪些窗口 |
| System Notifications | 系统通知 |
| Show system notifications when Agent completes or needs attention | 当智能体完成任务或需要关注时显示系统通知 |
| Warning Notifications | 警告通知 |
| Show notifications for less urgent issues | 对不太紧急的问题显示通知 |

顶部临时提示、账号和隐私区域、下拉当前值、开关状态、侧栏导航、通知授权含义较强的项目以及原生菜单继续保持原样。

## 自动验证与实机门槛

本地覆盖四组正向翻译；非 Glass、Appearance/Agents 页面、标签与说明交叉、行外文本、消息、代码、可编辑内容、短词与状态值的负向验证；初始与动态扫描。Appearance 原有标签和说明、exact 与侧栏 Search 回归通过。

实机需确认四组文案显示中文、下拉与开关正常、General 其它区域及 Appearance/Agents 页面不误译、聊天和代码保持原样；记录新的 cursor-agent-zh 前缀错误。部署和实机验收已完成。

## 部署记录

Cursor 3.22.7 / commit 37076c6c3f9e253c0fa2305197e45befd13a2260 通过预检并复用外部版本化备份。Glass loader marker=1，Glass SHA256=195D857FF651DB5FE797285D76758C257EF8ECD5E9AFA779915BC05352EAA379；sidecar SHA256=9C5D9E8262C186CDAC44A94BB1C85871846E97BDFCA17B8488034FF08F14AC35，与当前仓库生成内容一致。

用户确认汉化正常；只读运行时探针返回 phase=2D.1，八条固定文案的 contextualTranslationCounts 均为 1。用户未报告新的 cursor-agent-zh 前缀错误。账号、隐私、动态设置值及其它页面仍不在本批范围。
