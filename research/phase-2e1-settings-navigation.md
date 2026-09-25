# Phase 2E.1 — Settings 侧栏导航

> 日期：2026-09-25（Asia/Shanghai）
> 状态：只读 DOM 验证、本地回归、部署与界面验收通过。
> 范围：独立 Agents Window 的 Settings 左侧十四个分类标签。

## 准入证据

Phase 2A 截图记录了十四个英文分类。Cursor 3.22.7 实机只读探针确认：Glass=true；General、Appearance、Agents、Worktrees 的导航文本祖先中有 ui-sidebar-menu-button-label，且共同位于 data-component=glass-settings-sidebar。当前页正文中的 General 位于 glass-settings-panel，属于另一个节点。Back 位于 data-component=workspace-sidebar，不属于本批。

第二轮探针确认十四个英文分类在 glass-settings-sidebar 内各有一个标签元素。初始的“直接子 Text Node”检查均返回 false，因此未凭该结果准入；随后使用 TreeWalker 核对标签元素内的完整 Text Node：十四项各为 labels=1、total=1、exact=1。选择器依靠设置专属侧栏容器和语义标签类，不依靠生成样式名或当前活动页面。

## 十四项译文

| 英文 | 中文 |
| --- | --- |
| General | 常规 |
| Profile | 个人资料 |
| Appearance | 外观 |
| Plan & Usage | 套餐与用量 |
| Agents | 智能体 |
| Cloud Agents | 云端智能体 |
| Models | 模型 |
| Git & PRs | Git 与拉取请求 |
| Worktrees | 工作树 |
| Browser & Network | 浏览器与网络 |
| Tab | 标签页 |
| Code Intelligence | 代码智能 |
| Beta | 测试版 |
| Docs | 文档 |

新增 when=settings-sidebar-label，同时要求 Glass body、glass-settings-sidebar 祖先和 ui-sidebar-menu-button-label 祖先，并全文匹配；先经过消息、代码、终端、可编辑内容安全排除。Back 和 Search Settings 不翻译：前者在其它侧栏，后者是搜索框属性文案，本运行时只修改 Text Node。

## 验证与部署

本地通过十四项正向规则；非 Glass、workspace-sidebar、设置内容页、错误标签类、同名行外文本、消息、代码、可编辑区域和非目标短词负向回归；初始扫描与动态节点回归。General、Appearance、exact、原侧栏 Search、安全不变量与单观察器回归通过。

部署脚本确认 Cursor 3.22.7 / commit 37076c6c3f9e253c0fa2305197e45befd13a2260，复用安装目录外原始备份，Glass loader marker=1。Glass SHA256=195D857FF651DB5FE797285D76758C257EF8ECD5E9AFA779915BC05352EAA379；sidecar SHA256=F3CD8C3B7825F71E9AB6463BAAA0AF57E79F7C5E4DDFADD9549EB4E502B78F13，且与仓库生成内容一致。用户确认汉化及 General、Appearance、Agents 切页正常；只读运行时探针返回 phase=2E.1，十四项 contextualTranslationCounts 均为 2。该状态值是累计匹配次数，切页可能导致导航重挂载；用户未反馈可见的重复条目或新的 cursor-agent-zh 前缀错误。Back、搜索框及其它界面保持既定范围。
