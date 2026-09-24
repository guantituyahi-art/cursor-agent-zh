# runtime/

## Source of Truth

**`bootstrap.js` 是 runtime 唯一源码。**

安装目录 `cursor-agent-zh-bootstrap.js` 仅由 `scripts/deploy-glass-loader.js` 复制生成。

## Phase 1C（已通过人工验收，2026-09-24）

安全骨架（**不翻译**）：

- Glass 门禁：`body[data-cursor-glass-mode="true"]`（属性缺失时有界等待，避免 timing race）
- Translation Invariants：`shouldSkipNode`（message / code / editable）
- 一次只读 TreeWalker 扫描 + 统计日志（不打印正文）
- `globalThis.__cursorAgentZhRuntime.getStatus()`
- 与 loader guard `__cursorAgentZhLoader` 分责

测试：`node scripts/test-runtime-safety.js`、`node scripts/test-loader-placement.js`  
说明：`research/phase-1c-runtime-safety.md`；blocker：`phase-1c-loader-blocker.md`、`phase-1c-glass-scope-race.md`

## 尚未实现

MutationObserver、词典应用、UI 文案替换、Settings 汉化。
