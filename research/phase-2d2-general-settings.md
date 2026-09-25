# Phase 2D.2 — General 页三组常用文案

> 日期：2026-09-25（Asia/Shanghai）
> 状态：实机只读节点验证、本地回归、部署与界面验收通过。
> 范围：在 Phase 2D.1 四组文案基础上，新增 General 页三个常用设置行的标签与说明。

## 准入证据

用户在 Cursor 3.22.7 独立 Agents Window 的 General 页运行只读 DOM 探针，返回 glass=true、general 页面容器存在。Continue Interrupted Agents、System Tray Icon、Completion Sound 三行均存在目标设置行；每行标签与说明各在 ui-field-group__entry-label / ui-field-group__entry-description 中形成一个完整 Text Node，且与截图原文全等。六条英文也在 Glass bundle 中静态存在。

沿用 Phase 2D.1 的 general-settings-label / general-settings-description 上下文规则，不增加全局 exact 或其它页面选择器。所有词条仍先经过消息、代码、终端、可编辑内容的安全排除。

## 新增词条

| 英文 | 中文 |
| --- | --- |
| Continue Interrupted Agents | 继续中断的智能体任务 |
| Automatically resume working on agents and their subagents after a reload or restart | 重新加载或重启后，自动恢复智能体及其子智能体的任务 |
| System Tray Icon | 系统托盘图标 |
| Show Cursor in system tray | 在系统托盘中显示 Cursor |
| Completion Sound | 完成提示音 |
| Play a sound when agents finish or need attention | 智能体完成任务或需要关注时播放提示音 |

这批不翻译开关状态、当前声音值、选择自定义声音和试听按钮。账号、隐私、审批相关区域及其它设置页面仍按既有范围处理。

## 验证与部署

本地通过七组 General 正向和负向作用域、初始扫描与动态节点测试；Appearance 标签和说明、exact、侧栏 Search、消息与代码安全回归通过。部署脚本确认 Cursor 3.22.7 / commit 37076c6c3f9e253c0fa2305197e45befd13a2260，复用安装目录外备份，Glass loader marker=1。Glass SHA256=195D857FF651DB5FE797285D76758C257EF8ECD5E9AFA779915BC05352EAA379；sidecar SHA256=46F9F49E32F5449F94BBA7E368078CA7BE532B82CB1E82754F41A842C322F20A，与仓库生成内容一致。用户确认汉化正常；只读运行时探针返回 phase=2D.2，六条新增文案的 contextualTranslationCounts 均为 1。用户未报告新的 cursor-agent-zh 前缀错误。
