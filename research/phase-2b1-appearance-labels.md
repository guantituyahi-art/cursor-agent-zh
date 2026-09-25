# Phase 2B.1 — Appearance 四个设置标签

> 日期：2026-09-25（Asia/Shanghai）
> 状态：代码、自动测试与 Cursor 3.22.7 部署完成；四标签显示、控件与页面保持原样的实机反馈通过；Console 新增性未判定。
> 范围：仅独立 Agents Window 的 Settings → Appearance 页四个标签。

## 输入证据

Phase 2A 的截图与实机探针见 phase-2a-settings-inventory.md。Appearance 页的 Theme、Tool Call Density、Code Block Word Wrap、Reduce Motion 均为设置行标签中的完整 Text Node。它们所在页面由 Glass body 标记、data-component=glass-settings-panel 与 data-react-tab=appearance 确认；标签祖先使用 ui-field-group__entry-label。四行均没有独立 id。

## 实施

词典新增四条 contextual 规则：

| 英文原文 | 中文 |
| --- | --- |
| Theme | 主题 |
| Tool Call Density | 工具调用详情密度 |
| Code Block Word Wrap | 代码块自动换行 |
| Reduce Motion | 减少动画 |

when=appearance-settings-label 同时要求：

1. 祖先 BODY 的 data-cursor-glass-mode=true。
2. 标签位于 data-component=glass-settings-panel 且 data-react-tab=appearance 的页面内。
3. 文本节点位于 ui-field-group__entry-label 内，且英文全文匹配。

所有规则继续先经过消息、代码、终端和可编辑内容安全排除。未增加全局 exact 词条，未翻译说明、选项、开关值、字号、代码 diff 预览或其它 Settings 页面。只复用现有初始扫描与单个 childList MutationObserver，不观察属性或 characterData。

## 自动验证与安装

- node --check runtime/bootstrap.js：通过。
- test-appearance-settings-labels：四条正向命中；非 Glass、general/chat 页、标签外、代码、消息、可编辑节点与非完整串均不命中；初始扫描和动态子树通过。
- test-runtime-safety、test-exact-translation、test-mutation-exact、test-contextual-sidebar-search、test-loader-placement、test-versioned-backup：通过。
- 部署脚本确认 Cursor 3.22.7 / commit 37076c6c3f9e253c0fa2305197e45befd13a2260，复用安装目录外已验证原始备份，Glass loader marker=1。未修改 product.json 或普通编辑器 bundle。

## 实机反馈与 Console 边界

用户重新打开独立 Agents Window 后，截图确认前三项标签中文且周边说明、选项及代码 diff 预览保持原样；随后反馈四项均翻译正常、控件正常、页面保持原样。此次启动后的 Console 摘录中没有 [cursor-agent-zh] 前缀错误。

Console 摘录确有 Cursor 自身的错误与警告：TrustedScript/Function constructor 限制、CSS color 解析、project hooks 配置解析、扩展宿主 punycode 弃用、Worktree/Search 超时，以及 AI 连接失败/团队权限不足。它们分别指向 Glass 或 out/main.js 的代码位置。针对摘录提及的 Glass 行号 62、82、1553、20482、20776、21163、22204，与外部原始备份逐行比较均相同；本项目只改 Glass 文件尾部 loader 与 sidecar。此证据说明报错位置不是本轮改写的源码，不能单独证明这些日志在注入前就存在，也不能排除间接触发。没有注入前后的同条件 Console 基线，因此“零新增 Console 错误”门禁仍记为未判定，不把这批日志归因为本项目或宣称已完全通过。

## 原版对照（同日）

为核实 Console 日志，先在 Cursor 完全退出后运行还原脚本。还原后 Glass SHA256 为 721501D167E1EA82E51F33346C924448A34360E857B1E6D3972DC677589AA5A0，sidecar 不存在。用户截图显示 Appearance 标签恢复英文；DevTools 探针返回 loader=false、runtime=false，证明是未注入对照组。

原版 Console 摘录中出现 Failed to get git telemetry attributes: Canceled，因此这一类错误已证明可在未注入状态发生。摘录未提供 TrustedScript、CSS color 与 project hooks 三类日志的明确有无或同条件计数，不能据此判定它们是新增还是原有。网络、扩展和服务超时也缺少可比采样。

用户退出原版 Cursor 后，重新运行部署脚本；Glass SHA256 恢复为 195D857FF651DB5FE797285D76758C257EF8ECD5E9AFA779915BC05352EAA379，sidecar SHA256 恢复为 EF9A511E2F40E0700D34DBB85401AACD9CD045BAEEF682C4B6BCCB62E3BBDCD2，与对照前一致。对照实验已结束，安装状态回到 Phase 2B.1 四标签版本。
