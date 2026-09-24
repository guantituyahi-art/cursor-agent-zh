# runtime/

## Source of Truth

**`bootstrap.js` 是 runtime 唯一源码。**

Cursor 安装目录中的 `cursor-agent-zh-bootstrap.js` 只是由
`scripts/deploy-glass-loader.js` 从本文件复制生成的部署产物，不要在安装目录单独改逻辑。

## Phase 1A / 1B.1（当前）

- 内容：仅 `console.log("[cursor-agent-zh] runtime loaded");`（外加本文件头注释）。
- 由 Glass EOF loader（方案 B）加载；loader 含 `globalThis.__cursorAgentZhLoader` 运行时幂等 guard。
- **尚未**实现翻译器 / MutationObserver / 词典加载。

约束见 `docs/architecture.md` 与 `research/phase-1b1-deploy.md`。
