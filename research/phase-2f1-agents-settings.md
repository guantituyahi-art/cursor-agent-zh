# Phase 2F.1 — Agents 页普通静态设置

> 日期：2026-09-25（Asia/Shanghai）
> 状态：只读节点验证、本地回归、部署与界面验收通过。
> 范围：独立 Agents Window → Settings → Agents 的五个普通设置行，仅标签与说明。

## 准入证据

Phase 2A 截图记录了候选原文，并确认 Agents 页面容器的 data-react-tab 值是 chat。用户在 Cursor 3.22.7 上运行只读 DOM 探针：Glass=true；chat 页面容器存在。Default Environment、Default Model、Usage Summary、Agent Autocomplete、Legacy Terminal Tool 五行各有一个完整标签 Text Node 和一个完整说明 Text Node，分别位于 ui-field-group__entry-label 与 ui-field-group__entry-description。十条英文原文也在 Glass bundle 静态存在。

沿用已验证的设置文本作用域逻辑，新增 agents-settings-label / agents-settings-description 两种 when，必须同时满足 Glass body、data-react-tab=chat 的 glass-settings-panel、对应语义类和全文匹配。所有规则先经过消息、代码、终端和可编辑内容安全排除。模型名、环境选项、开关状态及用户输入不是静态词条。

## 十条译文

| 英文 | 中文 |
| --- | --- |
| Default Environment | 默认环境 |
| Where new agents start by default | 新建智能体默认启动的环境 |
| Default Model | 默认模型 |
| What model new agents use by default | 新建智能体默认使用的模型 |
| Usage Summary | 用量摘要 |
| When to show the usage summary at the bottom of the chat pane | 何时在聊天面板底部显示用量摘要 |
| Agent Autocomplete | 智能体提示词补全 |
| Contextual suggestions while prompting Agent | 编写智能体提示词时提供上下文建议 |
| Legacy Terminal Tool | 旧版终端工具 |
| Use the legacy terminal tool in agent mode, for use on systems with unsupported shell configurations | 在智能体模式下使用旧版终端工具，适用于不受支持的 Shell 配置 |

Auto-Approve Mode Transitions、Remote Control、MCP Authentication、Run Mode、File-Deletion Protection、External-File Protection 等涉及权限、安全和外部作用的文案继续暂缓。本批不改变设置行为。

## 验证与部署

本地通过五组正向翻译、非 Glass、General/Appearance 页、错误容器、跨标签/说明、行外文本、消息、代码、可编辑内容及非目标值的负向测试；初始与动态扫描通过。Settings 导航、General、Appearance、exact、侧栏 Search、安全不变量和单观察器回归通过。

部署脚本确认 Cursor 3.22.7 / commit 37076c6c3f9e253c0fa2305197e45befd13a2260，复用安装目录外原始备份，Glass loader marker=1。Glass SHA256=195D857FF651DB5FE797285D76758C257EF8ECD5E9AFA779915BC05352EAA379；sidecar SHA256=FC06975F71B40B3C1DD9C691F5AA2D9B3506208C0F235F06DC81E3D76447F069，与仓库生成内容一致。用户确认汉化正常；只读运行时探针返回 phase=2F.1，十条固定文案的 contextualTranslationCounts 均为 1。用户未报告新的 cursor-agent-zh 前缀错误。
