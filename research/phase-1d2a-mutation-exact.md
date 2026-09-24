# Phase 1D.2a — MutationObserver Dynamic Exact PoC

> 日期：2026-09-24（Asia/Shanghai）  
> 基线 commit：`f8d9bb0`（Phase 1A–1C）  
> 词典：校准后三词 New Chat / New Project / Automations  
> 状态：**自动门禁通过，等待人工验收**（不 commit / push；不进入 1D.2b）

## 结论（自动）

**A. Phase 1D.2a 自动门禁通过；人工验收已通过。**

## 为何需要 1D.2a

实机（Cursor 3.21.18 Agents Window）确认：

- `runtimePhase = "1D.1"`，scan 完成，`exactMatches = 0`
- 稍后 DOM 中 `New Chat` / `New Project` / `Automations` 各为 1

根因：目标侧栏 Text Node 在**初始安全扫描之后**才动态加入。  
不是 exact matcher / Translation Invariants 失败。  
**不做固定延时二次扫描**；改用 MutationObserver 增量处理。

1D.1 的真实 UI translation proof 顺延至本阶段。

## Observer scope

- 仅在 `isGlass === true` 且 `completeAsGlass` 之后挂载  
- 观察根：`document.body`（Glass 已确认；最窄稳定根）  
- 普通 desktop / 非 Glass：**不**启动 translation observer  
- 同一页面最多一个；`observerAttached` + runtime guard 防重复

## Observer options

```js
{ childList: true, subtree: true }
```

- **不**监听 `attributes`（本阶段不译属性）  
- **不**监听 `characterData`：侧栏目标以新增节点为主；译后中文不会再命中英文 exact，且避免无意义的自触发  
- childList 对本阶段足够的说明见上

## Incremental subtree strategy

MutationRecord `addedNodes` → microtask 批处理（Set 去重）→ 对每个节点：

| 节点 | 行为 |
| --- | --- |
| Text | `shouldSkipNode` → exact → `nodeValue` |
| Element / DocumentFragment | `runSafetyScan(该节点)` 仅扫 subtree |

**禁止**每个 mutation 后 TreeWalk 整个 `document.body`。

## Safety pipeline reuse

与 1D.1 同一管线；无第二套“动态专用”翻译路径。

## Loop prevention

- 中文结果 ∉ exact keys → 再处理不 applied  
- 仅 childList → 改 `nodeValue` 不产生本 observer 回调  
- `translationsApplied` 仅在 `applied: true` 时增加

## getStatus()

`runtimePhase: "1D.2a"`，并增加纯统计：

- `observerAttached`  
- `mutationBatches`  
- `mutatedNodesSeen`  
- `dynamicExactMatches`  
- `dynamicTranslationsApplied`  

累计 `exactMatches` / `translationsApplied` / `translationCounts` 仍保留。

## 自动测试

| Suite | 结果 |
| --- | --- |
| `test-runtime-safety.js` | 14 PASS |
| `test-exact-translation.js` | 16 PASS |
| `test-mutation-exact.js`（A–L + batch + 性能静态门禁） | 14 PASS |
| `test-loader-placement.js` | PASS |

静态门禁：无 `setInterval`；translation options 无 attributes；`processAddedNode` 不 `runSafetyScan(doc.body)`。

## 部署结果（LAPTOP-07K1IGOK，2026-09-24）

仅刷新 sidecar；**未** `--reinstall-loader`；**未**清 code cache。

| 项 | 结果 |
| --- | --- |
| glass SHA | **不变** `24ED1E6367B15F05BADAE9CCE9952DABDCF0EDB61DA911658B7F3479A118B810` |
| marker | **1** |
| backup | **不变** `F43F8393…B4BC` |
| product.json | **不变** `38A60F0C…95373B` |
| desktop | **不变** `42479915…9098` |
| sidecar BEFORE | `A23015A8…`（1D.1 校准） |
| sidecar AFTER | `0AF5B4824F1E4AA77AF282228B13DE62FECB78841F528518B6F6F2F1073660E0` |

若 `runtimePhase` 仍非 `1D.2a`，完全退出 Cursor 后按既有流程 `--clear-code-cache`。

## 人工验收

**状态：已通过（用户确认 `1d2a-pass`，2026-09-24）**

实机确认：

- `runtimePhase = 1D.2a`
- `observerAttached = true`
- `dynamicTranslationsApplied > 0`
- `New Chat` / `New Project` / `Automations` 在真实 Glass UI 中成功翻译
- 用户动态消息中的相同英文保持不变
- AI 回复中的相同英文保持不变
- （若已测试）代码块中的相同英文保持不变
- UI 功能未发现异常

## 当前限制

- 仍仅三词 exact；无 Keep/Undo/contextual/dynamic/attributes  
- 无 1D.2b

## Follow-on: Phase 1D.2b (updated 2026-09-24)

Phase **1D.2b.0** Review/Keep/Undo live discovery is **closed** as not applicable for this Cursor 3.21.18 Agents Window workflow. See [`phase-1d2b0-review-context.md`](phase-1d2b0-review-context.md).

Phase **1D.2b.1** Sidebar Search contextual translation is **in progress / awaiting human acceptance**. See [`phase-1d2b1-sidebar-contextual.md`](phase-1d2b1-sidebar-contextual.md) (`Search` → `搜索` under `data-sidebar-menu-button` only).

