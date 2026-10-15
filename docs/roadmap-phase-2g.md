# Phase 2G — Deferred 词条补全（路线图）

> 建立日期：2026-10-15（Asia/Shanghai）
> 性质：路线图与进度记录。逐项完成后在本文件勾选，并各自补 `research/phase-2g*.md`。
> 前置阅读：`docs/architecture.md` §A（翻译不变量）、§C（词典分层）、§E（deferred 清单）。

## 目标

在**不新增不变量风险**的前提下，把侧栏与 deferred 词条补进词典。

## 成功标准

1. 每条新规则都有**实机 anchor 证据**（写入对应 `research/` 文件）。
2. 消息正文、AI 回复、工具输出、代码 / 终端 / 可编辑内容**零翻译**（不变量不回退）。
3. 全部仓库测试 `exit=0`，`node --check` 通过。
4. 用户实机验收通过；Console 无新增 `[cursor-agent-zh]` 错误。

## 背景与现状（为什么这样排）

- 添加词条不是「往 JSON 加一行」：每条 `contextual` 词必须绑定一个**已实现的作用域**（`when`），作用域需要实机 DOM 证据。
- `Keep` / `Undo` / `Keep All` / `Undo All` 已在
  [`phase-1d2b0-review-context.md`](phase-1d2b0-review-context.md) **关闭**：
  实机 Review UI 不渲染这些文案，且短词裸翻译不安全。
- 但 3.22.7 审计 §6 有一条现成证据：侧栏 `Customize` 出现 1 次，anchor 为
  `data-sidebar-menu-button`，与已实现的 `Search` 同一作用域。
- 结论：**先做有证据的 1 条**，其余先取证再决定，无证据不造规则。

## 步骤与验收

| 步骤 | 内容 | 执行方 | 可量化验收 | 状态 |
| --- | --- | --- | --- | --- |
| 0 | 提交既有测试修复（`LOCALAPPDATA` 显式注入） | WSL | 1 个 commit，工作区干净 | ☑ |
| 1 | 加入 `Customize` 侧栏 contextual 词条（复用 `sidebar-menu-button`） | WSL | +1 条规则；新测试 ≥5 断言；全部测试 exit=0 | ☑ |
| 2 | Deferred 词实机证据收集（只读探针） | Windows | 8 个词各得「出现次数 + anchor 属性」 | ☐ |
| 3 | 按证据实现有锚点的词；无证据的标 closed | WSL | 新增词条数 = 有证据词数 | ☐ |
| 4 | 全量回归 + 文档更新 | WSL | 全部测试 exit=0；`node --check` 通过 | ☐ |
| 5 | 部署 + 实机验收 | Windows | 验收清单全过；无新增 `[cursor-agent-zh]` 错误 | ☐ |

### 步骤 1 说明（已完成）

- 只改 `translations/zh-CN.json`，**不改** `runtime/bootstrap.js` 逻辑。
- 新增测试 `scripts/test-contextual-sidebar-customize.js`：加载**真实词典**、
  正向命中、消息 / 代码 / 可编辑负向、动态子树、`when` 合法性护栏。

## 步骤 2 证据表模板

探针只统计属性名与出现次数，**不读取消息正文**。逐词填写：

| 词 | 出现次数 | anchor 属性 | 是否落在消息 / 代码内 | 判定 |
| --- | --- | --- | --- | --- |
| New Agent | | | | |
| Show Chat History | | | | |
| New Agents Window | | | | |
| Review changes | | | | |
| Keep / Undo | | | | |
| Keep All / Undo All | | | | |

**通过条件**：至少 1 个词拿到稳定 anchor。拿到几个做几个。
**合法结果**：多个词判定 closed —— 这不是失败，`phase-1d2b0` 已有先例。

## 停止条件（失败即停止，不加规则）

- 词只能靠猜测定位（无实机 anchor）。
- anchor 会命中消息 / 代码 / 终端 / 可编辑内容。
- 需要修改 `product.json` 或 checksum。
- 测试失败且一次最小修复后仍失败。

## 进度记录

- 2026-10-15：建立路线图；步骤 0、1 完成（见 `phase-2g1-sidebar-customize.md`）。
