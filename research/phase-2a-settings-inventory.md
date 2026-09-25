# Phase 2A — Cursor 3.22.7 Glass Settings 文案盘点

> 日期：2026-09-25（Asia/Shanghai）
> 状态：General、Appearance、Agents 三页首轮盘点；三个页面的 Glass 范围标记已实机确认，Appearance 四条标签候选已完成节点探针；尚无词典或运行时改动。
> 范围：独立 Agents Window 的设置界面。普通编辑器菜单与用户内容不在本阶段范围内。

## 证据与边界

用户提供了 General、Appearance、Agents 三页的上半部和底部截图。截图证明下列英文文案在 Cursor 3.22.7 的真实 Agents Window 设置界面中可见；它不能证明文本节点边界、稳定选择器、跨页面唯一性或重启后是否变化。截图中的账户名称、开关状态和个人数据共享状态不录入本仓库。

在 Agents 设置页的只读探针返回 `glass="true"`、`runtimePhase="1D.2b.1"`、`isGlass=true`、`observerAttached=true`，确认设置页仍由现有 Glass runtime 覆盖。分别切换页面后的探针确认 `[data-component="glass-settings-panel"]` 的 `data-react-tab` 值为 General=`general`、Appearance=`appearance`、Agents=`chat`。这三个值是页面级作用域证据，不自动证明每条设置行都可翻译。

安装包的只读静态检索显示部分设置由带 `label` / `description` 的条目组件构造；目标文案附近未直接看到稳定 `data-*` 属性。静态代码仅作交叉线索，实际准入仍以页面 DOM 探针为准。

Agents 页的首轮受限 DOM 探针返回 4 个结果：`Default Environment`、`Run Mode`、`File-Deletion Protection`、`Legacy Terminal Tool` 各命中一个去除外围空白后全等的 Text Node。展开的祖先路径显示四项都在 `.ui-field-group__entry-label` 内，外层为 `.ui-field-group__entry`。其它 `ui-...` 类名属于生成样式，不纳入兼容锚点；已见 `data-filled`、`data-align`、`data-layout` 等为通用属性，`Run Mode` 额外有 `data-search-aliases`，仍不足以安全定位单独设置行。进一步实机探针确认：`Run Mode` 行的 `id` 为 `cursor-settings-auto-run-mode`，`File-Deletion Protection` 行的 `id` 为 `cursor-settings-file-deletion-protection`；`Default Environment` 与 `Legacy Terminal Tool` 行没有 `id`，四行均未设置 `role`。前两项虽有明确锚点，仍因权限／安全语义而暂缓；后两项需要其它设置页上下文，不能仅凭通用类名准入。

Phase 2A 只做只读 inventory。任何词条进入 `translations/zh-CN.json` 前，仍须通过 `docs/architecture.md` §A 的消息、代码、终端、路径、协议与可编辑内容排除门禁。Phase 1 §E 的动态 Review UI 条件需在后续实施前与 1D.2b.0 的“不适用”记录对齐。

## 页面结构：General

### 设置导航（短词，均需设置导航上下文）

`Back`、`Search Settings`；分类为 `General`、`Profile`、`Appearance`、`Plan & Usage`、`Agents`、`Cloud Agents`、`Models`、`Git & PRs`、`Worktrees`、`Browser & Network`、`Tab`、`Code Intelligence`、`Beta`、`Docs`。

这些词可能在聊天、其它设置或工作台中重复。截图不足以允许裸 exact 翻译；需要先找到设置侧栏的稳定语义锚点，并证明不会命中普通编辑器或消息正文。

### General 内容

| 区域 | 实际可见文案 | 初步分类 | 待核实点 |
| --- | --- | --- | --- |
| 顶部提示 | `Plugins, MCPs, Skills, and Rules have moved to Customize.` / `We've introduced a new home for all the ways to customize Cursor.` / `Dismiss` / `Open Customize` | 暂缓 | 临时提示可能消失；按钮需上下文 |
| 账号入口 | `Cursor Account` / `Manage your account and billing` / `Open` | 暂缓 | 外部跳转与账号相关；短词 `Open` 易撞词 |
| Startup | `Startup` / `Tips` / `Show rotating tips on the empty screen` | 候选 | 核实标题与说明是否为独立文本节点 |
| Startup | `Window Restoration` / `Controls which windows Cursor restores on startup` | 候选 | 下拉当前值属于状态，不按静态文案处理 |
| Startup | `Continue Interrupted Agents` / `Automatically resume working on agents and their subagents after a reload or restart` | 候选 | 核实同一行的稳定锚点 |
| Notifications | `Notifications` / `System Notifications` / `Show system notifications when Agent completes or needs attention` | 候选 | `Agent` 不能作为裸短词替换 |
| Notifications | `Cloud Agent Approval Banners While Focused` / `Also show the approval banner while Cursor is focused; the request card in the agent conversation always shows` | 候选，后置 | 说明较长且涉及审批语义，须核准译文 |
| Notifications | `Warning Notifications` / `Show notifications for less urgent issues` | 候选 | 核实文本节点与行容器 |
| Notifications | `System Tray Icon` / `Show Cursor in system tray` | 候选 | 核实文本节点与行容器 |
| Notifications | `Completion Sound` / `Play a sound when agents finish or need attention` / `Choose Custom Sound...` / `Preview` / `Default Sound` | 候选，按钮需上下文 | `Preview`、`Default Sound` 可能在其它音频界面重复 |
| Privacy | `Privacy` / `Configure` / `Log Out` | 暂缓 | 隐私状态与账号动作，先核实文案语义及上下文 |

页面顶部原生菜单 `File`、`Edit`、`View`、`Help` 不属于 Glass DOM 词典候选。截图中的当前下拉值、开关状态及隐私状态不作为通用静态词条。

## 页面结构：Appearance

截图覆盖 Appearance 页上下区域。当前下拉值、数值、滑块百分比和开关状态只代表截图当时的用户状态，不作为翻译候选。

| 区域 | 实际可见文案 | 初步分类 | 待核实点 |
| --- | --- | --- | --- |
| 主题 | Theme / Choose between light, dark, or high contrast themes | 候选 | 下拉选项及当前值需单独采样 |
| Agent Conversations | Tool Call Density / Adjust how much detail is shown for tool calls / Compact / Detailed | 候选，需上下文 | 滑块两端标签与当前密度值分开 |
| Agent Conversations | Code Block Word Wrap / Wrap long lines in Agent conversation code blocks | 候选 | 核实行容器 |
| Agent Conversations | Themed Diff Backgrounds / Use themed background colors for inline code diffs | 候选 | 核实行容器 |
| Colors | Hue / Choose a tint color / Intensity / Control how strongly the tint is applied / Reduce Transparency / Replace translucent surfaces with opaque backgrounds | 候选，需上下文 | 颜色、百分比和滑块值不翻译 |
| Typography | UI Font Size / Font size for the Cursor user interface / Code Font Size / Font size for code editors and diffs / UI Font Family / Override the Cursor user interface typeface / Code Font Family / Override the font for code editors and diffs | 候选 | 字体名称、字号和代码预览不翻译 |
| High Contrast | Follow System High Contrast / Switch to a high contrast theme when your OS is in a high contrast mode | 候选 | 核实完整文本节点 |
| Motion | Reduce Motion / Minimize interface animations. System follows your OS preference. | 候选 | 核实完整文本节点 |
| Fun | Give the Agent a Confetti Cannon / Allow the agent to celebrate with a shower of confetti | 后置 | 趣味功能，优先级低 |
| Privacy | Hide Email Address / Partially mask your email address in the Cursor user interface | 暂缓 | 隐私语义需准确校对 |

Appearance 页只读 DOM 探针确认 `Theme`、`Tool Call Density`、`Code Block Word Wrap`、`Reduce Motion` 各存在目标设置行，但四行都没有 `id`。因此这些候选尚需页面级稳定容器或其它安全上下文，不能直接写成通用行规则。

`Theme` 行向上的实机结构为 `.ui-field-group__entry` → `FIELDSET.ui-field-group` → `.ui-section__body` → `SECTION` → 滚动区域 → `.agent-panel`。这些语义类可识别设置行结构，但在多个设置页之间共用；中间的 `glass-...` 类是生成样式，不采用。祖先属性值已核实：页面容器为 `[data-component="glass-settings-panel"][data-react-tab="appearance"]`，其内部为 `[data-component="glass-settings-tab"]`；更外层的 `[data-component="agent-panel"]` 覆盖整个 Agent 界面，不能单独用作设置页锚点。Appearance 的页面级作用域已找到，但仍须在后续实现时验证每条规则的 Text Node 及安全排除。

Typography 区域的彩色代码 diff **示例内容**属于代码与 diff 数据；即使出现在设置页，也必须由不变量过滤层跳过，不能以本页作用域为理由翻译它。

## 页面结构：Agents

截图覆盖 Agents 页 Conversation、Third-Party Imports、Remote Control、Context and Tools、Execution and Approvals、Terminal and Editing。下拉当前值、开关状态和用户自定义的 Voice Submit Keywords 不录入词典或公开文档。

| 区域 | 实际可见文案 | 初步分类 | 待核实点 |
| --- | --- | --- | --- |
| Conversation | Submit with Ctrl + Enter / Ctrl+Enter submits chat, Enter inserts a newline, and primary actions move to Ctrl+Alt+Enter | 候选，需校对 | 快捷键必须原样保留 |
| Conversation | Default Environment / Where new agents start by default / Default Model / What model new agents use by default | 候选 | 下拉值与模型名不翻译 |
| Conversation | New Messages / Choose the default behavior of messages sent while Agent is working / Manually Sent Messages from Queue / Choose the default behavior of messages sent from the queue | 候选，需校对 | 当前行为选项不是静态标签 |
| Conversation | Usage Summary / When to show the usage summary at the bottom of the chat pane / Agent Autocomplete / Contextual suggestions while prompting Agent | 候选 | 核实行容器 |
| Conversation | Auto-Approve Mode Transitions / Allow agent to switch to modes like Plan or Debug without asking. When off, Cursor asks first, but skips if unanswered within 15 seconds. | 高风险暂缓 | 自动批准语义与超时不可误译 |
| Conversation | Voice Submit Keywords / Custom words that submit a voice prompt. Spaces and punctuation are ignored. | 候选，后置 | 用户输入值绝不翻译或记录 |
| Third-Party Imports | Include Third-Party Plugins, Skills, and Other Configs / Automatically import agent configs from other tools / Import Claude Code Conversations / Sync chats and continue them in Cursor | 后置 | 第三方导入及同步语义需核准 |
| Remote Control | Remote Control / Allow agents on this computer to be controlled remotely from mobile / Keep This Computer Awake / Prevent sleep when this computer is plugged in and Remote Control is enabled | 高风险暂缓 | 远程访问及唤醒行为不能含糊 |
| Context and Tools | Web Search Tool / Allow Agent to search the web for relevant information / Auto-Accept Web Search / Skip approval dialog; Agent may run web searches automatically / Web Fetch Tool / Allow Agent to fetch content from URLs | 高风险暂缓 | 涉及自动运行与联网权限 |
| Context and Tools | Wait for MCP Authentication / Wait indefinitely to authenticate when prompted. When off, skip authentication prompts after 30 seconds. / Sync Skills for Cloud Agents / Cursor syncs your local skills so they can be used with Cloud Agents. Turn this off to disable syncing. | 高风险暂缓 | 认证与云同步文案需核准 |
| Execution and Approvals | Run Mode / Choose how Agents run tools like command execution, MCP, and file writes. / A classifier will run for each action and decide whether it's safe to execute this command. Allowlists are still respected. / Learn more | 高风险暂缓 | 当前模式值和审批含义需保持原样 |
| Execution and Approvals | File-Deletion Protection / Prevent Agent from deleting files automatically / External-File Protection / Prevent Agent from creating or modifying files outside of the workspace automatically / Allowlist Options / You can configure Shell, MCP and Fetch allowlists for Auto mode. However, Auto works well without these. | 高风险暂缓 | 文件删除、工作区外写入和白名单属于安全边界 |
| Terminal and Editing | Legacy Terminal Tool / Use the legacy terminal tool in agent mode, for use on systems with unsupported shell configurations / Auto-Parse Links / Automatically parse links when pasted into Quick Edit (Ctrl+K) input | 候选，后置 | 快捷键和工具名保持一致 |

以上分类仅决定**盘点顺序**，不是翻译准入。特别是权限、认证、远程控制、删除保护相关项，在产品文案语义经人工核准之前不能加入运行时。

## 首轮优先级（仅供盘点，尚未准入）

- **优先验证：** General 的 `Tips`、`Window Restoration`、`System Notifications`、`Warning Notifications`，以及 Appearance 的 `Theme`、`Tool Call Density`、`Code Block Word Wrap`、`Reduce Motion`。这些项目有完整说明文案，便于先核对文本节点与行上下文。
- **第二梯队：** Agents 的 `Default Environment`、`Usage Summary`、`Agent Autocomplete`、`Legacy Terminal Tool`。选项值、模型名、快捷键和用户输入仍保持原样。
- **暂缓：** 自动审批、远程控制、MCP 认证、云同步、文件保护、隐私与账号操作；Appearance 的代码 diff 预览始终排除。

## 准入初判（尚未实施）

| 候选 | 当前证据 | Phase 2B 前还需验证 |
| --- | --- | --- |
| Appearance: Theme / Tool Call Density / Code Block Word Wrap / Reduce Motion | 四条真实设置行均有完整标签 Text Node；已确认 `glass-settings-panel` 的 `data-react-tab=appearance` 页面范围 | 在该范围内限定 `.ui-field-group__entry-label`，补测说明文案的 Text Node；回归代码 diff 预览、消息和普通 Editor 不变 |
| General: Tips / Window Restoration / System Notifications / Warning Notifications | 截图证明真实可见 | General 页面标记 `general` 已确认，标签节点尚待探测 |
| Agents: Default Environment / Legacy Terminal Tool | 真实标签 Text Node、共用设置行结构，但行无 `id` | Agents 页面标记 `chat` 已确认，说明节点尚待探测 |
| Agents: Run Mode / File-Deletion Protection | 真实行 `id` 分别为 `cursor-settings-auto-run-mode` / `cursor-settings-file-deletion-protection` | 因审批、删除保护语义而暂缓，不进入第一批 |
| 导航短词、动态状态、权限和隐私文案 | 截图可见或有一般结构 | 缺少足够上下文或需更严格语义核准，当前均 `defer` |

## Phase 2A 首轮结论与下一阶段门禁

1. **建议的最小 Phase 2B PoC：**仅 Appearance 的 `Theme`、`Tool Call Density`、`Code Block Word Wrap`、`Reduce Motion` 四个标签。候选条件是确认 Glass 后，限于 `[data-component="glass-settings-panel"][data-react-tab="appearance"]` 内的 `.ui-field-group__entry-label` 完整 Text Node；这属于页面上下文规则，不是全局 exact。
2. 实施前须核对普通 Editor、聊天正文、代码 diff 预览、其它设置页和动态重挂载均不误译，并用真实 3.22.7 UI 验证重启、按钮/控件与 Console。
3. General 的标签节点及 Agents 的说明节点尚未逐项探测；导航短词、状态值、权限/认证/远程控制/文件保护/隐私文案全部 `defer`。本轮只完成三页截图范围的 inventory，不宣称所有设置页已盘点。
4. Phase 2A 不修改 `translations/zh-CN.json`、runtime 或 Cursor 安装；若进入 Phase 2B，再单独审查最小实现与译文。
