# Phase 2F.2 — Agents 消息行为与编辑辅助

> 日期：2026-09-25（Asia/Shanghai）
> 状态：实机只读节点验证、本地回归、部署与界面验收通过。
> 范围：Agents 设置页的 New Messages、Manually Sent Messages from Queue、Auto-Parse Links 三行，仅标签和说明。

## 准入证据

用户在 Cursor 3.22.7 的独立 Agents Window → Settings → Agents 中执行只读 DOM 探针：Glass=true，data-react-tab=chat 页面容器存在。三个设置行各有一个完整标签 Text Node 和一个完整说明 Text Node，位于 ui-field-group__entry-label / ui-field-group__entry-description。前两行的英文标签与说明均可在 Glass bundle 静态找到。

Auto-Parse Links 的说明由 Cursor 按系统拼接快捷键：当前 Windows 实机呈现为完整的 “Automatically parse links when pasted into Quick Edit (Ctrl+K) input” Text Node。此批只收录该 Windows 全文；译文保留 Ctrl+K。其它系统显示的快捷键形式不会被此规则匹配，本批不做模式或部分字符串替换。

沿用 Phase 2F.1 的 agents-settings-label / agents-settings-description 页面与容器作用域。所有规则仍先经过消息、代码、终端和可编辑内容安全排除。

## 六条译文

| 英文 | 中文 |
| --- | --- |
| New Messages | 新消息 |
| Choose the default behavior of messages sent while Agent is working | 选择智能体工作时发送消息的默认处理方式 |
| Manually Sent Messages from Queue | 从队列手动发送的消息 |
| Choose the default behavior of messages sent from the queue | 选择从队列发送消息时的默认处理方式 |
| Auto-Parse Links | 自动解析链接 |
| Automatically parse links when pasted into Quick Edit (Ctrl+K) input | 将链接粘贴到快速编辑（Ctrl+K）输入框时自动解析 |

当前行为选项（如 Queue、Interrupt）、用户实际消息和输入、自动审批、权限与保护设置均不翻译或修改。

## 验证门槛

本地覆盖八组 Agents 设置正向文案、非 Glass/其它 Settings 页面、错误容器、行外文本、消息、代码、可编辑内容、当前选项值与非 Windows 快捷键的负向测试；初始和动态扫描、既有 Settings 导航/General/Appearance/exact/Search 回归通过。

实机需确认三组标签与说明中文、Ctrl+K 保留、当前选项与相关控件正常，聊天正文、审批及安全相关文案保持原样。部署和实机验收完成。用户确认汉化正常；只读运行时探针返回 phase=2F.2，六条新增文案的 contextualTranslationCounts 均为 1。用户未报告新的 cursor-agent-zh 前缀错误。

## 部署记录

Cursor 3.22.7 / commit 37076c6c3f9e253c0fa2305197e45befd13a2260 通过预检并复用安装目录外备份。Glass loader marker=1，Glass SHA256=195D857FF651DB5FE797285D76758C257EF8ECD5E9AFA779915BC05352EAA379；sidecar SHA256=7516A86AF95990782688772594AFAEF2ADD5063F044B6DE138C13DA96050A651，与仓库生成内容一致。
