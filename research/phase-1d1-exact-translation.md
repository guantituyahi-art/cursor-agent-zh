# Phase 1D.1 — Exact Static Translation PoC

> 日期：2026-09-24（Asia/Shanghai）  
> 基线 commit：`f8d9bb0`（Phase 1A–1C）  
> 状态：**词条校准后自动门禁通过，等待人工验收**（不 commit / push；不进入 Phase 1D.2）

## 结论（自动）

**校准自动门禁曾通过；人工验收未形成正向 UI 证明。** 实机：`exactMatches=0` 且稍后 `currentTargetsInDOM` 三词各为 1。根因是初始扫描后侧栏才挂载，**不是** exact/safety 失败。**不判 matcher 失败；不做固定延时扫描；UI proof 顺延 Phase 1D.2a。**

## 词条校准（2026-09-24）

人工验收发现 Cursor **3.21.18** Agents Window 初始化 DOM 中：

| 原 PoC exact | 计数 |
| --- | --- |
| New Agent | 0 |
| Show Chat History | 0 |
| Review changes | 0 |

同时 runtime 正常：`runtimePhase="1D.1"`、`isGlass=true`、`scanCompleted=true`、`exactMatches=0`。

**判定：不判 1D.1 失败；不进入 1D.2。** 做最小 PoC 词条校准。

### 当前启用（exact）

```json
{
  "exact": {
    "New Chat": "新建聊天",
    "New Project": "新建项目",
    "Automations": "自动化"
  },
  "contextual": [],
  "dynamic": []
}
```

### Deferred（本阶段不接入 runtime）

- New Agent → 新建智能体  
- Show Chat History → 显示聊天历史  
- Review changes → 审查更改  
- Keep → 保留  
- Undo → 撤销  
- Keep All → 全部保留  
- Undo All → 全部撤销  
- New Agents Window → 新建智能体窗口  

机制未改：exact matching、safety invariants、无 MutationObserver、无 contextual/dynamic、不译 attributes。

## 正式词典 schema

`translations/zh-CN.json`（唯一词典 SoT）为分层结构；自 1D.1 起只接受该 schema。

## 双 Source of Truth → 单一 sidecar

| 角色 | 路径 |
| --- | --- |
| Runtime 逻辑 SoT | `runtime/bootstrap.js` |
| 词典 SoT | `translations/zh-CN.json` |
| 安装产物 | `out/vs/workbench/cursor-agent-zh-bootstrap.js` |

`scripts/deploy-glass-loader.js` → `deploySidecar` / `buildSidecarSource`：

1. 校验分层 JSON（Phase 1D.1 仅允许当前 3 个校准 exact key）  
2. 生成只读注入：`globalThis.__cursorAgentZhTranslations = …`  
3. 再拼接 `runtime/bootstrap.js`  
4. 写入安装目录 sidecar  

约束：无 bundler、无第三方依赖、运行时**不**再 `fetch`/`import` JSON、bootstrap **不**手写第二份词典。

## Exact matching

- 仅完整 Text Node 核心串精确匹配（可保留外围 whitespace）  
- `"  New Chat  "` → `"  新建聊天  "`  
- 禁止 substring / `replaceAll` / partial / fuzzy / 宽正则  
- 只改 `node.nodeValue`；不改 innerHTML / 父 textContent / 属性 / DOM 结构  

## Safety pipeline

```text
Text Node → Glass 已确认 → Invariants → shouldSkipNode
  → candidate → exact full-string lookup → nodeValue
```

安全层永远高于词典。消息 / code / editable 中即使出现 PoC 英文串也不得翻译。

## DOM 扫描

继续 Phase 1C 一次性 TreeWalker。

**Phase 1D.1 不支持动态 DOM，MutationObserver 尚未启用。**

初始化后才动态出现的校准文案保持英文是允许的。

## getStatus()

纯统计（无正文 / 无 DOM 对象）：

- `exactMatches` / `translationsApplied`  
- `translationCounts`（按 exact key）  
- `runtimePhase: "1D.1"`  
- `translates: true`  

## 自动测试

| Suite | 结果 |
| --- | --- |
| `scripts/test-runtime-safety.js`（1C） | 须保持通过 |
| `scripts/test-exact-translation.js`（A–M + SoT，校准后文案） | 须通过 |
| `scripts/test-loader-placement.js` | 须通过 |

## 部署结果

### 首次 1D.1（原三词，2026-09-24 上午）

| 项 | 结果 |
| --- | --- |
| glass / marker / backup / product / desktop | 不变 |
| sidecar | `ECFACDDE…` → `0C47FD4F…`（含原三词注入） |

人工：runtime 正常，但原三词 DOM 计数均为 0 → **校准**，不判失败。

### 校准后重新部署（2026-09-24 下午，LAPTOP-07K1IGOK）

仅刷新 sidecar；**未**改 glass / product / desktop；**未** `--reinstall-loader`；**未**清 code cache。

| 项 | 结果 |
| --- | --- |
| glass SHA | **不变** `24ED1E6367B15F05BADAE9CCE9952DABDCF0EDB61DA911658B7F3479A118B810` |
| marker | **1** |
| backup | **不变** `F43F8393…B4BC` |
| product.json | **不变** `38A60F0C…95373B` |
| desktop | **不变** `42479915…9098` |
| sidecar BEFORE | `0C47FD4F…`（原三词） |
| sidecar AFTER | `A23015A84EDB09417315F37041421AEFD824557AFC38E43D94976CD414B92963` |
| sidecar 内容 | 含 New Chat / New Project / Automations；无旧 New Agent key |

Code cache：若 Agents Window 的 `translationCounts` 仍是旧 key，请**完全退出** Cursor 后按既有流程 `--clear-code-cache` 再开（策略不变）。

## 人工验收

**状态：1D.1 作为静态 exact + 双 SoT 基础设施已关闭；UI 正向证明顺延并已由 1D.2a 通过（2026-09-24）。**

1D.1 本身验证了：分层词典、deploy 注入、safety 先于 exact、一次性扫描、无 MutationObserver。  
校准后侧栏 DOM 晚于初始扫描 → 不算 matcher 失败；见下节与 `phase-1d2a-mutation-exact.md`。

## 实机发现（校准后人工）

Cursor 3.21.18 的目标侧栏 UI 在初始扫描后动态加入 DOM，因此 **1D.1 的真实 UI translation proof 被顺延至 1D.2a**。

诊断摘要：

```text
runtimePhase = "1D.1"
exactMatches = 0
translationsApplied = 0
currentTargetsInDOM: New Chat = 1, New Project = 1, Automations = 1
```

见 `research/phase-1d2a-mutation-exact.md`。

## 当前限制（1D.1 阶段视角）

- 仅 3 条校准后的 exact PoC  
- **1D.1 本身**无 MutationObserver（动态覆盖见 1D.2a）  
- contextual / dynamic 空数组  
- 原 PoC 与其它种子 deferred  
