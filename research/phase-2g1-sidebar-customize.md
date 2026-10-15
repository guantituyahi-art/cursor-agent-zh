# Phase 2G.1 — 侧栏 Customize 上下文词条

> 日期：2026-10-15（Asia/Shanghai）
> 状态：词典、自动测试与文档完成；**未部署、未实机验收**。
> 范围：仅独立 Agents Window 侧栏菜单的 `Customize` 一个完整串。
> 路线图：[`docs/roadmap-phase-2g.md`](../docs/roadmap-phase-2g.md)。

## 输入证据

本轮未新增实机探针，直接复用既有证据：

- `research/cursor-3.22.7-upgrade-compat.md` §6 侧栏文案表：`Customize` 出现 1 次，
  且 1 次全部位于 `data-sidebar-menu-button` 之下，消息内 0 次、其它 0 次。
- 该 anchor 与已验收的 `Search` 完全相同，作用域 `sidebar-menu-button` 已在 runtime 实现。

因此这是一条**有证据、可复用现有作用域**的词典新增，不需要新作用域。

## 实施

词典新增一条 contextual 规则：

| 英文原文 | 中文 | when |
| --- | --- | --- |
| Customize | 自定义 | `sidebar-menu-button` |

约束与设计：

- **不修改** `runtime/bootstrap.js` 逻辑，不新增作用域，不新增 observer 类型。
- 仍然先经过消息（human / assistant / thinking / tool / ai role）、代码 / 终端、
  可编辑内容的硬安全排除；`Customize` 不会进入全局 exact 表。
- `RUNTIME_PHASE` 保持 `2F.3`：本次为**词典新增、无运行时逻辑变更**，
  故不递增阶段常量。若后续新增作用域谓词，则应递增。

## 测试

新增 `scripts/test-contextual-sidebar-customize.js`（12 条断言）。与既有测试不同，本测试
**加载真实词典** `translations/zh-CN.json`，而非本地 POC fixture，因此词典或 `when` 漂移会直接失败：

- 正向：`Customize` 在 `data-sidebar-menu-button` 下 → `自定义`（含 `matchesContextualWhen`）。
- 负向：无 anchor 的裸 `Customize` 不变；human / assistant / thinking / tool / ai role；
  `pre` / `code` / `monaco-editor` / `xterm`；`input` / `textarea` / `contenteditable`。
- 动态：`processAddedNodes` 命中与计数；重复扫描不重复计数。
- 回归：`Search` 同作用域仍生效。
- 护栏：真实词典中**所有 contextual 的 `when` 必须是已实现作用域**，且无重复规则
  （`loadTranslationsPack` 本身不校验 `when`，未知值会静默失效）。

顺带修复一处测试脆弱点：6 个既有测试硬编码 `pack.contextual.length === 75`，
每新增一个词条就要改动 6 个无关文件。改为单调下限
`assert.ok(pack.contextual.length >= 76, ...)`；这些测试各自仍有行为级规则断言，覆盖不降低。

## 验证结果

- `node --check runtime/bootstrap.js`：通过。
- 全部 **12** 个测试脚本 `exit=0`（91 条 `PASS` 断言 + 各 `OK` 汇总行）。
- `loadTranslationsPack`：`exact=3, contextual=76, dynamic=0, phase=2F.3`。

## 未验证（不得声称通过）

- **未部署到 Cursor，未在真实 Glass 侧栏观察 `Customize` 显示为「自定义」**。
- 未验证 `Show Chat History` / `New Agent` 等其它 deferred 词（属路线图步骤 2–3）。
- 仓库测试用 mock DOM，不能替代真实 3.22.7 DOM 与 Agents Window 验收。
- Console 新增性仍为**未判定**（沿用既有结论）。

## 下一步

按路线图步骤 2：在真实 Cursor 中用只读探针收集剩余 deferred 词的 anchor 证据，
再决定步骤 3 能实现哪些词；无证据不造规则。
