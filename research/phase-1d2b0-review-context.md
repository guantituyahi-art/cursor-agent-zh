# Phase 1D.2b.0 — Review UI Context Discovery (closed)

**Status:** Closed — target not applicable for contextual PoC on Cursor **3.21.18** Glass.  
**Baseline:** `9b76b87` (Phase 1D.2a). Working tree restored clean; probe edits to `README.md` discarded.  
**Date:** 2026-09-24  

This phase was **research only**. No Keep/Undo translation was implemented. Runtime / dictionary enablement was not changed. Phase **1D.2b.1 was not started** under the old Keep/Undo plan.

---

## Goal (original)

Answer: how to reliably distinguish Review-action **Keep / Undo** from the same short English words elsewhere, using stable DOM context for a future `contextual` dictionary layer.

---

## Method

1. Trigger real Agents Window Review / Changes UI (uncommitted `README.md` probe marker; later restored).
2. Round 1 — exact Text Node scan for Keep / Undo / Keep All / Undo All / related phrases.
3. Round 2 — button / `[role=button]` attribute scan (`aria-label`, `title`, `data-*`, ancestor chains).
4. Round 3 — enumerate **actual** actions inside confirmed diff semantic regions (not Keep/Undo-assuming).
5. Round 4 — attempt context probe on the pre-Changes **"1 File Changed"** card **Review** button (card lifecycle unstable; no reliable capture).

Forged DevTools DOM was not used.

---

## Findings

### A. Actual Review action copy (this workflow)

| Expected (Phase 0 / bundle strings) | Observed in live Review/Changes UI |
| --- | --- |
| `Keep` / `Undo` | **Not rendered** (text nodes, button labels, aria-label, title) |
| `Keep All` / `Undo All` | **Not rendered** |
| Diff chrome actions | Present, e.g. `Select line range`, `Expand up`, `Expand down`, `N unmodified lines` |

Static bundle scan still contains EDIT_FILE-style `Keep`/`Undo` strings and related copy, but **this Agents Window Review/Changes path did not surface them**. Do not treat bundle strings as live UI proof.

### B. Stable diff semantic anchors (real DOM)

Confirmed present in the live Changes/diff surface:

- `data-diff-card-header`
- `data-diff-content-ready`
- `data-file-path`
- `data-buttons`
- `data-ui-default-diff-interactive-row`

These are useful for **future** diff-scoped work. They are **not** Keep/Undo action anchors.

### C. Why bare exact `Keep` / `Undo` would have been unsafe (and is moot here)

Even if those labels returned in another surface:

- Short tokens collide with chat, code, menus, image annotation (`aria-label: Undo`), dialogs (`Keep Files`), etc.
- Invariants protect message/code bodies, but **not** all chrome.
- Live evidence: zero Keep/Undo hits in this workflow → **no contextual rule to implement**.

### D. Expand up / Expand down (rejected for 1D.2b.1)

- Appear only inside diff semantic scope (`occurrencesOutsideDiff = 0` in Round 3).
- Primarily **aria-label** navigation controls, not ideal Text Node PoC.
- Would mix **contextual** + **attribute translation** variables; deferred.

### E. Round 4 — File Changed card `Review` button

- Goal: short word `Review` on the card before entering Changes.
- Outcome: card / button **not reliably re-evoked** after entering Changes; probe path prepared but **no stable live capture**.
- Reported shape when unavailable: `realReviewCardAnchor=null`, `fileChangedCardHits=0`, `recommendedContextualCondition=null`.
- **Do not** invent a File Changed card rule without a successful live sample.

---

## Candidate strategies considered (not implemented)

| Id | Idea | Verdict |
| --- | --- | --- |
| A | Translate Keep/Undo only under Review action container | **N/A** — labels absent in this workflow |
| B | button + aria + Review root | **N/A** — no Keep/Undo buttons |
| C | Bind to `data-diff-*` for Expand_* | Rejected for PoC (attribute-heavy, nav chrome) |
| D | Contextual `Review` on File Changed card | **Blocked** — insufficient live anchor |

---

## MutationObserver note

Glass runtime at probe time: `runtimePhase=1D.2a`, `observerAttached=true`, `data-cursor-glass-mode=true`. Review/Changes content is **dynamically mounted**; Round 1/2/3 observed live subtrees. No new observer type was added in this phase.

---

## Decision

**Close Phase 1D.2b.0 as: current Review UI target is not applicable for Keep/Undo contextual PoC.**

Next research track (separate): **Phase 1D.2b.1 — Sidebar Search Contextual Translation** (`Search` → `搜索` under `data-sidebar-menu-button`). Implementation doc: [`phase-1d2b1-sidebar-contextual.md`](phase-1d2b1-sidebar-contextual.md).

---

## Explicit non-claims

- This document does **not** claim Keep/Undo contextual translation is supported.
- This document does **not** claim File Changed `Review` contextual translation is supported.
- Diff `data-*` anchors are recorded as **facts**, not as enabled dictionary rules.

## Probes (host Temp; not in repo history)

- `probe-review-dom.js` (Round 1)
- `probe-review-buttons-r2.js` (Round 2)
- `probe-review-actions-r3.js` (Round 3)
- `probe-review-button-r4.js` (Round 4)
