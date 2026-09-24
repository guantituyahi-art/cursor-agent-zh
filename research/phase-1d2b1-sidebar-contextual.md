# Phase 1D.2b.1 — Sidebar Search Contextual Translation

> 日期：2026-09-24（Asia/Shanghai）  
> 基线：Phase 1D.2a（人工验收已通过）+ 1D.2b.0（Review/Keep/Undo 关闭）  
> 状态：**人工验收已通过**（2026-09-24 Asia/Shanghai；本地 commit，不 push；不进入下一阶段）

## 结论（自动）

**A. Phase 1D.2b.1 自动门禁通过；人工验收已通过。**

## Prep probe（Cursor 3.21.18 live）

| 项 | 结果 |
| --- | --- |
| `Search` Text Node occurrences | 1 |
| Sidebar hits | 1 |
| Other UI | 0 |
| Stable anchor | `data-sidebar-menu-button`（attribute present on sidebar menu button ancestor） |

Translate **only** `Search` → `搜索` when the text node has an ancestor with `data-sidebar-menu-button`.

**Explicitly not in this phase:** Keep / Undo / Review / other contextual words / attribute translation / dynamic-pattern layer.

## Schema (`translations/zh-CN.json`)

```json
{
  "exact": {
    "New Chat": "新建聊天",
    "New Project": "新建项目",
    "Automations": "自动化"
  },
  "contextual": [
    {
      "en": "Search",
      "zh": "搜索",
      "when": "sidebar-menu-button"
    }
  ],
  "dynamic": []
}
```

- `when` is a **semantic id** (`sidebar-menu-button`), not a CSS selector stored as the dictionary value.
- Deploy loader validates each contextual item has string `en` / `zh` / `when` and **passes them through** into `__cursorAgentZhTranslations` (no longer forced to `[]`).
- Absolute ban: `Search` must **not** appear in the exact map.

## Context resolver (runtime)

| Helper | Behavior |
| --- | --- |
| `getContextualRules()` | reads `pack.contextual` (safe `[]` if missing) |
| `hasAncestorDataAttr(node, attrName)` | walks parents (text → parent first); true if `getAttribute(attrName) != null` |
| `matchesContextualWhen(when, node)` | `'sidebar-menu-button'` → `data-sidebar-menu-button`; unknown → **false** (fail closed) |
| `matchContextualTranslation(raw, node)` | same whitespace split as exact; core === `rule.en` **and** when matches |
| `tryApplyContextualTranslation(node)` | `shouldSkipNode` first; then match; already-zh skip applied; else set `nodeValue` |

**NEVER** bare `if (text === 'Search') translate()` without when match.

## Pipeline order

1. Safety skip (message / code / editable)  
2. Exact (`tryApplyExactTranslation`)  
3. If no exact hit → contextual (`tryApplyContextualTranslation`)

Same order in one-shot `runSafetyScan` and mutation `processAddedNode`.  
Still: text nodes only; no attribute translation; **one** MutationObserver (reuse 1D.2a).

## Stats

- `contextualMatches` / `contextualTranslationsApplied` / `contextualTranslationCounts` (keyed by en, e.g. `Search`)
- Dynamic path mirrors exact: `dynamicContextualMatches` / `dynamicContextualTranslationsApplied`
- `emptyTranslationCounts` stays exact-only; `emptyContextualTranslationCounts()` from rules

## Tests

| Suite | Result |
| --- | --- |
| `test-runtime-safety.js` | 14 PASS |
| `test-exact-translation.js` | 17 PASS（含 Search ≠ exact） |
| `test-mutation-exact.js` | 14 PASS |
| `test-contextual-sidebar-search.js` (A–L + extras) | 16 PASS |
| `test-loader-placement.js` | PASS |

Coverage highlights:

- A sidebar → 搜索  
- B plain UI → unchanged  
- C–G safety first (human/assistant/tool/code/editable) even with bogus sidebar attr  
- H/I dynamic mutation path  
- J already 搜索 idempotent  
- K exact three words still work  
- L single observer

## Deploy notes

- Sidecar-only refresh (no `--reinstall-loader`, no code-cache clear unless runtimePhase stuck).  
- Glass SHA / marker / backup / product.json / desktop must stay unchanged.  
- Sidecar must contain `1D.2b.1`, contextual Search, and `搜索`.

## 部署结果（LAPTOP-07K1IGOK，2026-09-24 Asia/Shanghai）

仅刷新 sidecar；**未** `--reinstall-loader`；**未**清 code cache。

| 项 | 结果 |
| --- | --- |
| glass SHA | **不变** `24ED1E6367B15F05BADAE9CCE9952DABDCF0EDB61DA911658B7F3479A118B810` |
| marker | **1** |
| backup | **不变** `F43F8393…B4BC` |
| product.json | **不变** `38A60F0C…95373B` |
| desktop | **不变** `42479915…9098` |
| sidecar BEFORE | `0AF5B482…`（1D.2a） |
| sidecar AFTER | `8490682B268165B5FD1A97720DEF21CDD81BB6B988295877975E359F56AB3A96` |

Sidecar contains `1D.2b.1`, `"en":"Search"`, `搜索`, `sidebar-menu-button`.

若 `runtimePhase` 仍非 `1D.2b.1`，完全退出 Cursor 后按既有流程 `--clear-code-cache`。

## Manual verification checklist

1. Fully quit Cursor, reopen Agents Window (Glass).  
2. `getStatus().runtimePhase === '1D.2b.1'`, `observerAttached === true`.  
3. Left sidebar label **Search** shows as **搜索**.  
4. Plain / non-sidebar **Search** (if any) stays English.  
5. User/assistant/tool message bodies containing `Search` stay English.  
6. Code / terminal / inputs unchanged.  
7. **New Chat** / **New Project** / **Automations** still translate.  
8. UI still usable; no duplicate observers / loops.

## 人工验收（2026-09-24 Asia/Shanghai）

**结果：通过。**

| 项 | 结果 |
| --- | --- |
| Sidebar `Search` → `搜索` | ✅ 已显示 |
| 点击「搜索」打开 Search 功能 | ✅ 正常 |
| 用户消息中的 `Search` | ✅ 保持英文 |
| AI 回复中的 `Search` | ✅ 保持英文 |
| 代码块中的 `Search` | ✅ 保持英文 |
| exact：新建聊天 / 新建项目 / 自动化 | ✅ 仍正常 |

未开始下一阶段。本地 commit 本阶段有效变化；不 push。

## History

- [`phase-1d2b0-review-context.md`](phase-1d2b0-review-context.md) — closed (Keep/Undo N/A).  
- [`phase-1d2a-mutation-exact.md`](phase-1d2a-mutation-exact.md) — MutationObserver baseline.
