# Phase 1C — Glass scope timing race

> 日期：2026-09-24（Asia/Shanghai）  
> 状态：**已修复；人工复测通过（2026-09-24）**（本阶段可随 Phase 1C 一并 commit；不进入 1D）

## Symptom（实机）

同一 Agents Window 中：

1. `getStatus()` → `initialized: true`, `isGlass: false`, `skippedNotGlass: true`
2. 随后 `document.body.getAttribute('data-cursor-glass-mode')` → `"true"`

Loader / sidecar 已加载；问题在 **runtime 过早判定非 Glass**。

## Root Cause

`runInit` 在 DOM ready 后立即调用 `isGlassDocument`。Agents Window 会在稍后才把 `body[data-cursor-glass-mode="true"]` 写上。旧逻辑把「属性尚未出现」当成最终非 Glass，并设置：

- `initialized = true`
- `skippedNotGlass = true`
- runtime guard `__booted`

之后即使属性出现，也不会再扫描。

**不是** selector 选错。

## Fix

`runtime/bootstrap.js`：

1. `classifyGlassScope`：`true` → glass；`false` → not-glass；**缺失 → pending**（不再当作最终结果）。
2. pending 时启动 **有界等待**（默认 8s）：属性 MutationObserver（仅 lifecycle）+ poll 备份 + hard deadline。
3. Glass marker 出现 → **只做一次** read-only safety scan → `isGlass: true`。
4. 超时仍无 marker → 再 `skipped: not Glass`。
5. **未 settle 前**：`initialized` / `skippedNotGlass` 保持 false；`waitingForGlass: true`。
6. `getStatus()` 增加 `waitingForGlass`、`scopeSettled`。

未改：Translation Invariants、只读扫描、无翻译、无 Phase 1D MutationObserver 翻译管线。

## Deploy

仅刷新 sidecar（SoT → `cursor-agent-zh-bootstrap.js`）。

- Glass bundle SHA **不变**
- backup / product / desktop **不变**

## Tests

`scripts/test-runtime-safety.js`：既有 A–F + 新增 classify / pending-not-lock / timeout 用例（共 14）。

## 人工复测（已通过）

用户于 2026-09-24 确认：同一 Agents Window 中不再出现「先 `skippedNotGlass` 再出现 glass-mode」的锁死。完全重开 Agents Window 后：

```js
// 若仍在等：
globalThis.__cursorAgentZhRuntime.getStatus()
// 期望短暂可能出现 waitingForGlass:true, initialized:false

// settle 后：
// isGlass:true, scopeSettled:true, scanCompleted:true, skippedNotGlass:false
document.body?.getAttribute('data-cursor-glass-mode') // "true"
```

普通编辑器：约 8s 内变为 `skippedNotGlass:true`（可接受）。

## 结论

**Glass scope race 已修复，人工复测通过（2026-09-24）。** 不进入 Phase 1D，直至用户明确指示。
