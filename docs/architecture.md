# 初步架构（Phase 0）

> 状态：**Phase 1D.1 Exact PoC**（仅 3 条静态 exact；无 MutationObserver）。  
> Phase 0–1C 见既有 research；**1D.1** 见 `research/phase-1d1-exact-translation.md`。词典为分层 `translations/zh-CN.json`；sidecar 由 bootstrap + JSON 生成。

## 目标

为 Cursor **独立 Agent Window（Glass Workbench）** 提供轻量简体中文界面文案与少量 UI 样式增强。  
锚定实验版本：**Cursor 3.21.18**。  
不宣称「完整汉化」，不承诺跨版本兼容。

## 设计原则

1. **仅 Agent Window / Glass**：暂不汉化普通编辑器桌面 Workbench。
2. **优先运行时 DOM 翻译**（未来）：在 Glass 页面内替换可见 UI 文案。
3. **禁止全局字符串替换**安装目录大包作为默认手段（避免误伤协议与逻辑字符串）。
4. **不修改协议字段**（IPC / JSON-RPC / 内部 id / 枚举键等）。
5. **Translation Invariants 优先**：所有新规则必须先通过下文「翻译不变量」过滤层（见 §A）。
6. **MutationObserver（或同等机制）** 跟踪动态 UI。
7. **优先全串精确匹配**；短语表与执行逻辑分离。
8. **短词必须绑定 DOM/属性上下文**（如 `Agent` / `Model` / `Tools` / `Keep` / `Undo`）。
9. **词典与执行逻辑分离**（`translations/` vs 未来 `runtime/`）；词典预留分层结构（见 §C）。
10. **Checksum 策略：优先不改被校验文件**；不以「同步/改写 product.json checksum 掩盖改动」为默认方案（见 §B）。
11. **Cursor 更新后先做兼容检查**，再考虑注入。
12. **必须支持备份与还原**。
13. **明确：当前未实现运行时翻译器。**

---

## A. Translation Invariants（硬安全边界）

> **每一条未来翻译规则，都必须先通过本层过滤。**  
> 不变量优先于词典命中、作用域便利或「看起来像 UI 文案」的直觉。

### 默认永不翻译

| 类别 | 规则 |
| --- | --- |
| 消息正文 | `human` / `assistant` / `tool` 消息体（含 `data-message-kind` 对应区域）**默认永不翻译** |
| 代码与终端 | `pre` / `code` / Monaco（含 `.monaco-editor`、`.view-lines` 等）/ xterm **永不翻译** |
| 标识与协议 | 模型名称、文件路径、命令、URL、协议字段（IPC / JSON-RPC / 内部 id / 枚举键等）**永不翻译** |

### 规则准入

- 新增任何 exact / contextual / dynamic 词条或选择器规则前，先自问：是否可能命中上表任一类别？
- 若存在命中风险 → **拒绝该规则**，或收紧到可证明安全的 DOM/属性上下文后再议。
- 本层是**硬边界**，不是可协商的「尽量遵守」清单。

---

## B. Checksum / 完整性策略（本项目原则，非 vibepm 默认路径）

社区项目（如 vibepm666）常见做法：改 `workbench.html` 等后 **同步/更新 `product.json` checksum**，以避免「安装损坏」提示。

**本项目原则：**

1. **优先不修改被 checksum 保护的文件。**
2. **不以「同步/更新 product.json checksum 来掩盖文件改动」作为计划中的默认方案。**
3. 从 vibepm 等仓库 **了解** checksum 同步技术即可，作为研究知识保留；**不是**我们偏好的策略。
4. 仅当后续确实找不到其它可行注入路径时，才重新评估是否触碰 checksummed 文件；届时须单独架构评审，不得默许为常规步骤。

与静态补丁、注入研究的关系见下文「与静态补丁的关系」与 §D。

---

## C. 词典机制（预留分层 — 勿把 zh-CN.json 当作永久扁平全局表）

### 当前状态

`translations/zh-CN.json` 自 Phase 1D.1 起为 **正式分层 schema**（`exact` / `contextual` / `dynamic`）。1D.1 仅启用 3 条 exact；Keep/Undo 等为 deferred。  
**Phase 1+ 应迁移到分层结构**，避免短词与动态句永久混在同一扁平 map 里。

### 三层目标结构（推荐：单文件分节）

推荐目标形态（一个 JSON 内分节；若日后体积增大可再拆文件，语义仍对应三层）：

```json
{
  "exact": {
    "New Chat": "新建聊天",
    "New Project": "新建项目",
    "Automations": "自动化"
  },
  "contextual": [
    {
      "en": "Agent",
      "zh": "智能体",
      "when": "toolbar button / tab label / aria-label in Glass chrome"
    },
    {
      "en": "Keep",
      "zh": "保留",
      "when": "Review changes action button"
    }
  ],
  "dynamic": [
    {
      "pattern": "Reviewing {n} files",
      "zh": "正在审查 {n} 个文件",
      "vars": ["n"]
    }
  ]
}
```

| 层 | 用途 | 匹配策略 |
| --- | --- | --- |
| `exact` | 完整、安全的 UI 全串 | 叶节点文本全串精确匹配 |
| `contextual` | 短词（Model / Tools / Agent / Keep / Undo 等） | 必须绑定 DOM/属性上下文（`when`）；禁止裸全局替换 |
| `dynamic` | 带变量的状态句 | 模式 + 变量占位；不得吞掉路径/模型名等不变量内容 |

### 迁移说明

- Phase 0：**不改**现有 `zh-CN.json` 的 8 条扁平内容（除非仅为注释/文档需要）。
- Phase 1+：将种子迁入 `exact`（及必要时 `contextual`），再扩展；执行逻辑只消费分层结构。
- 备选：拆成 `exact.json` / `contextual.json` / `dynamic.json`；语义与上表一致即可。**默认推荐单文件分节**，减少早期路径碎片。

---

## D. Phase 1 注入加载研究（Phase 1 的第一项任务）

> **最大未知**：如何在每次 Glass Window 启动时可靠加载我们的运行时翻译器。  
> 候选调研见下；**Phase 1A 实机后倾向采纳 B**（细节以 `research/phase-1a-injection.md` 为准）。

### 目标约束

- Cursor 自有文件至多只负责「加载我们的 JS」。
- **全部翻译逻辑留在我们自己的文件中**（`runtime/` + `translations/`）。
- 与 §B 对齐：优先避免改 checksummed 文件。

### 候选（并列调研，勿过早收敛）

| ID | 候选 | 关注点 |
| --- | --- | --- |
| A | 最小 Glass HTML / bootstrap 注入 | 改动面、是否触发 checksum、能否只加载外部脚本 |
| B | Glass JS bundle 单点 bootstrap 注入 | 单点改动量 vs 升级脆弱性；是否可做到「仅一行 load」 |
| C | Cursor 扩展能否触达 Glass runtime | 扩展 API / webview / 独立窗口边界；零改安装目录的可能性 |
| D | 其它独立加载入口 | 用户态配置、启动参数、辅助进程等未列尽路径 |

### 产出期望

- 各候选的可行性、风险（含 checksum）、升级成本对照表。
- 明确推荐路径与否决理由；若均高风险，Escalation 回 §B 第 4 点，而不是默认开启 checksum sync。

### Phase 1A 研究进展（2026-09-23 研究 / 2026-09-24 实机）

详细对照见 **`research/phase-1a-injection.md`**（含本机 inspect；**截至文档更新时仍未改 Cursor 安装**）。

- 重建 + 实机：Agent Window / Glass 入口为 `workbench.glass.main.js`；与 desktop 分流。本机安装根：`D:\下载应用\cursor\resources\app`（3.21.18）。
- `product.json.checksums` 仅 6 键（desktop js/css、workbench.html/js、preload、extensionHostProcess）；**无** glass 键。
- **拍板倾向：采纳 B**（glass EOF 最小 loader + sidecar）。**否决 A**；**B′ 后备**；**暂缓 C**。写入安装目录前需用户确认，并做备份 / SHA256。

---

### Phase 1B 加载入口安全验收（2026-09-24）

详见 **`research/phase-1b-load-entry.md`**。

- 本机 checksum：**glass 不在** 6 键列表中；未改 `product.json`。
- 备份 SHA 与 Phase 1A 原始记录一致；marker 全文件仅 1 次。
- **结论：A**（可进入 Phase 1C）——静态审计通过；1B.1 部署层通过；人工 DevTools 三项已确认。非结论 C。

### Phase 1B.1 部署收口（2026-09-24）

见 **`research/phase-1b1-deploy.md`**：`scripts/deploy-glass-loader.js` / `restore-glass-loader.js`；SoT=`runtime/bootstrap.js`；自动 Test A–E 通过。人工 DevTools 三项已于 2026-09-24 用户确认通过（`phase-1b-load-entry.md` §5）。

### Phase 1C Runtime Safety（2026-09-24）

见 **`research/phase-1c-runtime-safety.md`**（及 loader-blocker / glass-scope-race）。1C 人工验收已于 2026-09-24 通过。

### Phase 1D.1 Exact Static PoC（2026-09-24）

见 **`research/phase-1d1-exact-translation.md`** 与 **`research/phase-1d2a-mutation-exact.md`**。分层词典 + exact（校准三词）；1D.1 一次性扫描；1D.2a 在 Glass 上挂一次 `childList` MutationObserver 做增量，复用同一 safety 管线。侧栏动态挂载导致 1D.1 UI proof 顺延至 1D.2a；**1D.2a 人工验收已于 2026-09-24 通过。**

## E. Phase 1 成功标准（PoC 门禁 — 先于 Settings 全量本地化）

### PoC 范围（仅这些文案）

**Phase 1D.1 当前启用（Glass 3.21.18 校准）：**

- New Chat  
- New Project  
- Automations  

**Deferred（未接入 runtime）：** New Agent / Show Chat History / Review changes / Keep / Undo / Keep All / Undo All / New Agents Window 等。  
（更广 Phase 1 门禁仍以架构 §E 为准；1D.1 不以扩大范围为门禁条件。）

### 必须全部满足，方可考虑 Settings 等更大范围本地化

| # | 门禁项 |
| --- | --- |
| 1 | **新会话**中上述 UI 文案生效 |
| 2 | **历史会话**中上述 UI 文案生效 |
| 3 | **动态出现的 Review UI** 文案生效 |
| 4 | **重启后仍生效**（加载路径稳定） |
| 5 | **零修改**用户 / AI 消息正文（及 tool 消息体） |
| 6 | **无新增** console 错误 |

任一未达成 → PoC 未通过；不得以「先做 Settings 再回来修」绕过。

---

## 逻辑分层（规划）

```text
┌──────────────────────────────────────────────────────────┐
│  Translation Invariants 过滤层（硬边界，所有规则先过此层）   │
├──────────────────────────────────────────────────────────┤
│  translations/（词典）                                     │
│   当前：zh-CN.json 扁平种子（临时）                          │
│   目标：exact / contextual / dynamic 分层                   │
├──────────────────────────────────────────────────────────┤
│  runtime/（未来）                                          │
│   - injection loader（§D 研究后再定）                        │
│   - Glass 窗口检测 / 作用域根                                │
│   - MutationObserver 批处理                                 │
│   - exact + contextual(+when) + dynamic 匹配                │
│   - 跳过：消息语义属性 / code / Monaco / xterm / 路径等       │
├──────────────────────────────────────────────────────────┤
│  styles/user-message.css  （样式，已有）                     │
├──────────────────────────────────────────────────────────┤
│  scripts/（未来）备份 · 兼容检查 · 最小加载注入（非 checksum  │
│            sync 优先）· CSS 注入                              │
└──────────────────────────────────────────────────────────┘
```

---

## 作用域检测（规划）

可选信号（实现时再验证）：

- 独立 Agent 窗口进程 / 加载 `workbench.glass.main.js`
- `body[data-cursor-glass-mode="true"]`
- Glass 特有布局根节点

非 Glass 页面：**不挂载**翻译观察器。

## 消息与内容排除（规划）

与 §A 一致；利用稳定语义属性（见 `research/cursor-3.21.18.md`）：

| 区域 | 属性 | 策略 |
| --- | --- | --- |
| 用户消息 | `data-message-kind="human"` | 不翻译文本；样式可增强 |
| Agent 回复 | `data-message-kind="assistant"` | 不翻译正文 |
| 工具 | `data-message-kind="tool"` | 不翻译参数/输出正文 |
| 代码 | `pre` / `code` / `.monaco-editor` / `.view-lines` | 跳过 |
| 终端 | `.xterm` 等 | 跳过 |

样式选择器不得仅使用 `.composer-human-message`（输入框共用）。

## 词典策略（规划）

- 见 §C：`exact` 全串；`contextual` 短词 + DOM 上下文；`dynamic` 变量句。
- 不在词典中放协议字段名、模型名、路径或代码标识符。
- 当前扁平 `zh-CN.json` 仅作种子，不视为最终形态。

## 与静态补丁的关系

既有社区项目大量修改 `workbench.desktop.main.js` / `workbench.glass.main.js`，部分再 **同步 product.json checksum**。

本项目：

- **默认路径**：Glass 作用域运行时 DOM 翻译；Cursor 侧至多「加载我们的 JS」。
- **静态补丁**仅作可选、需严格备份与兼容门禁的后备；**当前阶段不实现**。
- **不把 checksum sync 列为偏好或默认后备步骤**（见 §B）。若某注入目标本身被 checksum，视为高风险，优先换路径；无法换路径时暂停并重新评估架构，而不是先改 checksum 再继续。

## 非目标（Phase 0 / PoC 前）

- 实现 `runtime` 翻译器代码（Phase 1 研究与 PoC 之后）
- 修改用户机器上的 Cursor 安装文件
- 官方语言包替代方案
- 完整 IDE 菜单 / Settings 全量汉化（须先过 §E PoC 门禁）
- 宣称「完整汉化」或跨版本兼容保证
