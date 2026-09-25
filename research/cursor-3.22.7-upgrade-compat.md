# Upgrade Compatibility Gate — Cursor 3.21.18 → 3.22.7

> 日期：2026-09-25（Asia/Shanghai）  
> 仓库基线：`548a1a0`（Phase 1D.2b.1）  
> 性质：**只读检查**。未 deploy、未 restore、未创建 loader、未清 CachedData、未改 translations / runtime / product.json，未 commit。  
> Phase 2A inventory 已暂停。

## 结论

**B. 存在小范围兼容变化，需要先适配后才能 deploy。**

Glass 加载机制与 checksum 状况没有变（不是 C）。但真实 DOM 出现了 Phase 1 invariants 未覆盖的消息标记，部署脚本也仍绑定 3.21.18 的原始 SHA 与旧 backup 命名，所以不能直接判 A 去重新部署。

---

## 1. 版本身份

| 项 | 值 |
| --- | --- |
| version（product.json / package.json） | **3.22.7**（旧基线 3.21.18） |
| commit | `37076c6c3f9e253c0fa2305197e45befd13a2260`（旧 `c4730f7d…`） |
| build date | 2026-09-24 05:01:24 |
| 安装目录 | `D:\下载应用\cursor\resources\app`（**未变**） |
| product.json SHA256 | `FFE8FA1B6660432598C1CFF831FAF68DAFB5913459E4FF3E5965602E0F34ABDF` |
| 运行进程 | `D:\下载应用\cursor\Cursor.exe` |

**Cursor 已从 3.21.18 升级到 3.22.7。** 更新器在 2026-09-25 11:04–11:09 替换了 `locales` / `resources` / `tools` 等目录。

## 2. Glass 资源

| 文件 | 存在 | SHA256 | 大小 |
| --- | --- | --- | --- |
| `out\vs\workbench\workbench.glass.main.js` | 是 | `721501D167E1EA82E51F33346C924448A34360E857B1E6D3972DC677589AA5A0` | 45,389,668 |
| `out\vs\workbench\workbench.glass.main.css` | 是 | `9FCF516F600812BBF97CB80E668E55B2545845AA5B7495BE9EB11F486E537BA9` | 1,261,492 |
| `out\vs\code\electron-sandbox\workbench\workbench.js` | 是 | `A4957D88692AF09E89F19AA8B4B0CEDC5B3539E2F198BBD0B082977F1257D38D` | 34,296 |

- `workbench.js` 仍用 `resolveEsModule: a.glass===!0 ? "vs/workbench/workbench.glass.main" : "vs/workbench/workbench.desktop.main"` 选择 bundle，**Glass Window 仍使用该 bundle**。另有仅在 `devBundleMtime` 存在时启用的 `workbench.glass.main.bundle.js` 开发分支，正式运行不走。
- 实机 DOM：`body[data-cursor-glass-mode="true"]` **仍存在**。
- glass bundle 静态计数：`sourceMappingURL`=1，`cursor-glass-mode`=22。
- 观察：`workbench.glass.main.css` 中 `.user-message-backup` 计数为 0（3.21.18 有）。仅记录，Phase 1 runtime 不依赖。
- 观察：Console 出现 Cursor 自身错误 `WorkspaceResolutionTimeoutError: Timed out resolving the agent workspace after 30000ms`（来自 glass bundle），与本项目无关。

## 3. loader 为什么消失

| 检查 | 结果 |
| --- | --- |
| `cursor-agent-zh-phase1a-loader` marker | 0 |
| `__cursorAgentZhLoader` guard（bundle 文本） | 0 |
| 任何 `cursor-agent-zh` 字符串 | 0 |
| `window.__cursorAgentZhLoader`（实机） | `undefined` |
| `window.__cursorAgentZhRuntime`（实机） | 不存在 |
| sidecar `out\vs\workbench\cursor-agent-zh-bootstrap.js` | **不存在** |

**判定：A。** Cursor 更新用新版 bundle 覆盖了 `workbench.glass.main.js`，loader 随之消失；更新器同时清掉了 `out\vs\workbench` 下我们放置的 sidecar。不是 B / C。

## 4. Checksum 重新检查（3.22.7）

`product.json.checksums` 共 6 个键：

- `vs/base/parts/sandbox/electron-sandbox/preload.js`
- `vs/workbench/workbench.desktop.main.js`
- `vs/workbench/workbench.desktop.main.css`
- `vs/workbench/api/node/extensionHostProcess.js`
- `vs/code/electron-sandbox/workbench/workbench.html`
- `vs/code/electron-sandbox/workbench/workbench.js`

**`workbench.glass.main.js` 仍不在 checksum 列表**，product.json 也没有其它 integrity 字段。旧注入方案无需因 checksum 重新评审。

## 5. 旧 backup 隔离

- `workbench.glass.main.js.cursor-agent-zh-backup` 在安装目录中**已不存在**（更新器一并删除）。在 Temp / Desktop / Downloads / D:\ 浅层也未找到副本。
- 旧 backup SHA 记录：`F43F8393D53FEBD5DB82DA6EECDE39BF4D1878DC5D811D557EFA91279B39B4BC`，**仅属于 Cursor 3.21.18**，永不用于 3.22.7。
- 风险：`scripts/lib/glass-loader-shared.js` 仍硬编码 `PRISTINE_GLASS_SHA256` = 3.21.18 值，backup 路径为 `glass + ".cursor-agent-zh-backup"`（不带版本）。在 3.22.7 上运行会被 SHA 校验拒绝（安全），但也说明部署层需要版本化适配。

### 建议的版本化 backup 命名（未实施）

```
<appRoot>\out\vs\workbench\cursor-agent-zh-backups\<version>\<commit>\workbench.glass.main.js
<appRoot>\out\vs\workbench\cursor-agent-zh-backups\<version>\<commit>\manifest.json
```

另建议在安装目录**之外**保留一份镜像（例如 `%LOCALAPPDATA%\cursor-agent-zh\backups\<version>\<commit>\`），因为本次更新证明安装目录内的 backup 会被更新器清除。

`manifest.json` 记录：version、commit、原始 SHA256、大小、创建时间。部署脚本应改为按 `<version, commit>` 查表校验原始 SHA，而不是单一常量；已存在的同版本 backup 不覆盖，SHA 不符则停止。

## 6. DOM compatibility probe（实机，只读）

探针：Temp `probe-upgrade-compat.js`，不写 DOM，不输出正文。场景：已有对话 + 展开侧栏。

| 语义 | 3.22.7 实测 | 与 Phase 1 假设 |
| --- | --- | --- |
| `body[data-cursor-glass-mode="true"]` | `"true"` | 一致 |
| `data-message-kind="human"` | 4 | 一致 |
| `data-message-kind="assistant"` | 4 | 一致 |
| `data-message-kind="tool"` | **0** | 本次样本未出现，**待确认** |
| `data-message-kind` 全部取值 | `human:4, assistant:4, thinking:1` | **新增 `thinking`** |
| `data-message-role` 全部取值 | `human:4, ai:5` | **新增 `ai`** |
| `data-sidebar-menu-button` | 21 | 一致 |
| `pre` / `code` | 0 / 5 | 存在 code |
| `.monaco-editor` / `.view-lines` / `.xterm` / `.cm-editor` | 0 / 0 / 0 / 0 | 本次场景未出现 |
| `textarea` / `input` / `[contenteditable=true]` | 0 / 3 / 1 | composer 仍为 contenteditable |
| `data-diff-card-header` | 0 | 本次场景未打开 diff |

侧栏文案（Text Node 全等匹配）：

| 文案 | total | 在 `data-sidebar-menu-button` 下 | 消息内 | 其它 |
| --- | --- | --- | --- | --- |
| New Chat | 1 | 1 | 0 | 0 |
| Search | 1 | 1 | 0 | 0 |
| Automations | 1 | 1 | 0 | 0 |
| New Project | 1 | 1 | 0 | 0 |
| Customize | 1 | 1 | 0 | 0 |
| New Agent | 0 | – | – | – |

中文 `新建聊天` / `搜索` 为 0，符合 runtime 未加载。

## 7. runtime 静态兼容分析

| 问题 | 结论 |
| --- | --- |
| Phase 1 safety invariants 是否仍适用 | **部分适用，有缺口。** `MESSAGE_KINDS = {human, assistant, tool}` 同时用于 kind 与 role。3.22.7 出现 `data-message-kind="thinking"` 与 `data-message-role="ai"`，二者都不在集合内。role `ai` 计数 5 = assistant 4 + thinking 1，推测 thinking 块自身带 `kind=thinking, role=ai`，如果它不嵌套在 assistant 容器里，thinking 正文会被当作候选节点。这违反「AI 内容永不翻译」。需要在部署前确认嵌套关系并补充 invariant。 |
| tool 消息 | 样本中 `kind=tool` 为 0，无法确认 3.22.7 工具调用是否仍用该标记。需要在含工具调用的对话里补测。 |
| code / editable | `code` 标签与 `contenteditable` 规则仍然命中真实元素；Monaco / xterm 本次未出现，规则本身无需改。 |
| MutationObserver 方案 | 仍适用。Glass 仍为同一 bundle、同一 body 标记，observer 不依赖版本特定结构。 |
| exact 三词是否仍真实存在 | 是。New Chat / New Project / Automations 各 1 次，均在侧栏。 |
| Search sidebar anchor | 仍存在。`Search` 1 次，位于 `data-sidebar-menu-button` 下。 |
| 必须适配的新 DOM 变化 | ① `thinking` kind 与 `ai` role 未纳入 skip；② tool 标记待确认。 |
| 部署层 | ③ `PRISTINE_GLASS_SHA256` 与无版本 backup 命名绑定 3.21.18；④ 新 commit 已生成 CachedData 目录 `37076c6c…`，重新注入后可能重现 Phase 1C 的陈旧 V8 缓存问题（仅记录，未清理）。 |

## 8. 自动测试

| Suite | 结果 |
| --- | --- |
| `test-runtime-safety.js` | 14 PASS |
| `test-exact-translation.js` | 17 PASS |
| `test-mutation-exact.js` | 14 PASS |
| `test-contextual-sidebar-search.js` | 16 PASS |
| `test-loader-placement.js` | PASS |

**repo tests** 只证明仓库代码内部一致；它们用的是 mock DOM，不包含 `thinking` / `ai`。**new Cursor real compatibility** 以第 6、7 节的实机结果为准，目前未通过（见结论 B）。

## 9. 升级结论与建议的下一步（未执行）

**B。** 需要先做的小范围适配：

1. 补测：在含工具调用、含 thinking 的对话中，只读确认 `thinking` 块与 assistant 容器的嵌套关系，以及工具调用的实际标记。
2. invariant：把 `thinking`（kind）和 `ai`（role）纳入 message skip，并增加对应测试。只放宽不变量是禁止的，这里是收紧。
3. 部署层版本化：原始 SHA 按 `<version, commit>` 校验；backup 使用版本化目录并在安装目录外保留镜像。
4. 以上完成后，再为 3.22.7 创建新的原始 backup 并部署，按 Phase 1C 经验处理 CachedData。

在用户确认前不执行上述任何一步。
