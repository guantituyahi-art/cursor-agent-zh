# Phase 1C — Runtime Safety Skeleton

> 日期：2026-09-24（Asia/Shanghai）  
> 目标：最小 runtime 安全骨架；**不做任何汉化 / 文案修改**。  
> **未做：** MutationObserver、词典应用、Settings、commit / push。  
> 人工 DevTools / GUI：**已通过（2026-09-24）**（见 §人工验收）。

---

## 结论（自动门禁）

**A. Phase 1C 自动门禁 + 人工验收均已通过（2026-09-24）**

仍**不要**自动开始 Phase 1D；等用户明确指示后再做真正翻译 / MutationObserver。

---

## Runtime 生命周期

入口：`runtime/bootstrap.js`（唯一 SoT；deploy 复制为 sidecar）。

1. 浏览器加载 sidecar → `console.log("[cursor-agent-zh] runtime loaded")`  
2. DOM 未就绪则等 `DOMContentLoaded`  
3. Runtime guard：`globalThis.__cursorAgentZhRuntime`（与 loader 的 `__cursorAgentZhLoader` **分责**）  
4. 同页仅初始化一次（`api.__booted`）  
5. 任意错误：`console.error('[cursor-agent-zh] …')`，不向外抛  

Loader guard 只防重复加载脚本；Runtime guard 只防 sidecar 重复 init。

---

## Glass 作用域门禁

`classifyGlassScope` 读 `document.body.getAttribute('data-cursor-glass-mode')`：

- `"true"` → Glass，一次只读 safety scan  
- `"false"` → 非 Glass，立即 skip  
- **缺失** → `pending`：有界等待（默认 ~8s，属性 MutationObserver + poll）；未 settle 前**不**永久写 `initialized` / `skippedNotGlass`  
- 超时仍无 marker → `skipped: not Glass`

详见 `research/phase-1c-glass-scope-race.md`。不使用「编辑器也有的宽泛选择器」作为唯一 Glass 依据。

---

## Translation Invariants → 代码映射

| 不变量 | 代码 |
| --- | --- |
| human / assistant / tool 消息正文 | `data-message-kind` / `data-message-role` ∈ {human, assistant, tool} → skip `message` |
| pre / code / Monaco / xterm / CM | 标签 `PRE`/`CODE`；class 含 `monaco-editor`、`view-lines`、`xterm`、`cm-editor`、`cm-content` → skip `code` |
| 可编辑输入 | `INPUT` / `TEXTAREA` / `contenteditable`（非 false）→ skip `editable` |
| 未来翻译候选 | `shouldSkipNode(node) === false` 且非空 text → candidate（**本阶段不修改**） |

核心 API：`shouldSkipNode` / `skipReasonForNode` / `isCandidateTextNode`。

---

## 一次性只读扫描

- `document.createTreeWalker(…, SHOW_TEXT)`  
- 仅统计：`textNodesSeen`、`candidateCount`、各类 skip  
- **禁止**改 `nodeValue` / `textContent` / `innerHTML`  
- Console **不打印**任何节点正文 / 消息 / 代码内容  

示例日志形态：

```text
[cursor-agent-zh] safety audit
Glass: true
textNodesSeen: …
candidates: …
skippedMessage: …
skippedCode: …
skippedEditable: …
skippedEmpty: …
```

---

## Debug Status API

```js
globalThis.__cursorAgentZhRuntime.getStatus()
```

返回（仅统计 / 标志）：`initialized`、`isGlass`、`scanCompleted`、`skippedNotGlass`、`waitingForGlass`、`scopeSettled`、`textNodesSeen`、`candidateCount`、`skipCounts`、`phase: "1c-safety-skeleton"`、`translates: false`。

不返回节点文本、消息正文、DOM 大对象。

---

## 自动测试

`node scripts/test-runtime-safety.js`（无 jsdom / 无新依赖）

| Test | 结果 |
| --- | --- |
| A human（含 `data-message-role`） | PASS |
| B assistant | PASS |
| C tool | PASS |
| D pre/code/monaco/xterm/cm-* | PASS |
| E input/textarea/contenteditable | PASS |
| F 安全 UI 文案可为 candidate | PASS |
| Glass 属性门禁 | PASS |

---

## 部署验证（本机 2026-09-24）

`node scripts/deploy-glass-loader.js` 刷新 sidecar：

| 项 | 结果 |
| --- | --- |
| glass SHA | 首次 1C sidecar 刷新时为 `21D2F394…`；loader-blocker 后为 `24ED1E63…`（见 blocker 文档） |
| marker 次数 | **1** |
| backup | **不变** `F43F8393…B4BC` |
| product.json | **不变** |
| desktop | **不变** |
| sidecar | 已更新（含 `1c-safety-skeleton` / `__cursorAgentZhRuntime`） |
| sidecar | 随 SoT 多次刷新；scope-race 修复后含有界等待逻辑 |

---

## 人工验收（已通过）

**状态：用户于 2026-09-24 确认 Phase 1C 人工验收通过。**

清单（历史门禁，均已由用户实机确认）：

1. 完全重启 Agents Window  
2. Console **无**新的未捕获错误  
3. runtime / `getStatus()` 显示 `isGlass: true`（settle 后；含 scope-race 修复）  
4. `getStatus()` 可返回统计字段  
5. 存在用户/AI 消息时，`skipCounts.message` > 0（或合理增加）  
6. 存在代码块时，`skipCounts.code` > 0（或合理增加）  
7. 页面肉眼**无**任何文字被改成中文 / 被改写  
8. 聊天正文完全无变化  
9. 普通编辑器：最终为 `skippedNotGlass` / 不跑 Glass 主流程  

关联 blocker 复测亦已通过：`research/phase-1c-loader-blocker.md`、`research/phase-1c-glass-scope-race.md`。

在 DevTools Console 可执行：

```js
globalThis.__cursorAgentZhRuntime && globalThis.__cursorAgentZhRuntime.getStatus()
```

---

## 已知限制

- 仅一次初始化扫描；动态插入的节点要到 Phase 1D + MutationObserver 才覆盖。  
- Glass 信号仅钉 `data-cursor-glass-mode="true"`（含 pending 有界等待）；若官方改名需重检。  
- 未排除「模型名 / 路径 / URL」文本级启发式（属后续规则，本阶段以 DOM 区域排除为主）。  
- candidate 统计可能含尚不宜翻译的 chrome 文案；1D 才加词典与上下文。
