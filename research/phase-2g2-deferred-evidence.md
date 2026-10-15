# Phase 2G.2 — Deferred 词条证据探针（只读）

> 日期：2026-10-15（Asia/Shanghai）
> 状态：**只读取证**。未改 DOM、未读消息正文、未部署。
> 探针：DevTools Console 内联脚本，仅统计属性名与出现次数；未存入仓库（沿用 host Temp 惯例）。
> 路线图：[`docs/roadmap-phase-2g.md`](../docs/roadmap-phase-2g.md)。

## 方法

- 环境：独立 Agents Window（`body[data-cursor-glass-mode="true"]`）。
- 状态：默认侧栏 + 一段已有对话；元素 1650、消息容器 23、代码类元素 4。
- 对 9 个目标词统计：文本节点出现次数、是否落在消息 / 代码内、祖先链签名（含 `data-*` 属性名）；
  另统计 `aria-label` / `title` / `placeholder` 命中。

## 结果

| 词 | 文本出现 | 消息内 | 代码内 | 属性命中 | anchor 证据 |
| --- | --- | --- | --- | --- | --- |
| Customize | 1 | 0 | 0 | — | `span.ui-text < … < div.ui-button.ui-sidebar-menu-button[data-sidebar-menu-button]` |
| New Agent | 0 | 0 | 0 | `aria-label` × 7 | `button.ui-icon-button[data-base-ui-tooltip-trigger] < … < div.ui-sidebar-menu-button-actions < div.ui-sidebar-menu-button-end` |
| Show Chat History | 0 | 0 | 0 | 0 | 无 |
| New Agents Window | 0 | 0 | 0 | 0 | 无 |
| Review changes | 0 | 0 | 0 | 0 | 无 |
| Keep | 0 | 0 | 0 | 0 | 无 |
| Keep All | 0 | 0 | 0 | 0 | 无 |
| Undo | 0 | 0 | 0 | 0 | 无 |
| Undo All | 0 | 0 | 0 | 0 | 无 |

## 判定

| 词 | 判定 | 理由 |
| --- | --- | --- |
| Customize | **可做** | 可见完整文本，anchor 为已实现作用域 `sidebar-menu-button`；已在 Phase 2G.1 实现 |
| New Agent | **deferred（属性翻译）** | 当前只以 `aria-label` 存在；runtime 不翻译属性。且它是图标按钮的 tooltip 触发词，是否在悬浮时渲染可见文本本次未取证 |
| Show Chat History | **待取证** | 本次视图未渲染；可能在菜单 / 悬浮 / 其它入口 |
| New Agents Window | **待取证** | 同上，可能在窗口或应用菜单 |
| Review changes | **待取证** | 与 `phase-1d2b0` 结论一致：Changes / diff 视图未打开时不存在 |
| Keep / Undo / Keep All / Undo All | **closed（已测工作流）** | 与 `phase-1d2b0` 一致，连续两次在工作流内不渲染 |

## 关键结论

1. **步骤 3 在当前证据下没有可新增的词条。** 唯一有证据的 `Customize` 已在 Phase 2G.1 落地；
   `New Agent` 需要当前 runtime 不具备的**属性翻译**能力；其余 6 词无 anchor。
2. **不得据此宣称这 6 个词永久不存在。** 本次只覆盖「默认侧栏 + 已有对话」这一种状态。

## 本次未覆盖的表面（后续取证要点）

| 表面 | 涉及词 | 取证方式 |
| --- | --- | --- |
| 悬浮 tooltip | New Agent | 悬浮侧栏图标按钮，再跑同一探针 |
| 侧栏行「更多 / ⋯」菜单 | Show Chat History 等 | 打开菜单后跑探针 |
| Changes / diff 视图 | Review changes / Keep / Undo / Keep All / Undo All | 打开 Changes 后跑探针 |
| 窗口 / 应用菜单 | New Agents Window | 打开菜单后跑探针 |

## 采集窗口复测（3.22.7 实机，2026-10-15）

方法：40 秒采集窗口。脚本先全量快照，再以 `MutationObserver`
（`childList` + `characterData` + 属性过滤）记录期间新增的匹配，用户同期手动操作四个界面。

| 词 | 来源 | via | inMsg | inCode | anchor 证据 |
| --- | --- | --- | --- | --- | --- |
| Customize | initial | text | false | false | `div.ui-button.ui-sidebar-menu-button[data-sidebar-menu-button]` |
| **Keep** | **added** | **text** | **false** | **false** | `button.ui-button < div[data-diff-card-header,data-diff-content-ready]` |
| New Agent | — | — | — | — | 悬浮未产生文本节点；仍只有 `aria-label` |
| Show Chat History | — | — | — | — | 未捕获 |
| New Agents Window | — | — | — | — | 未捕获 |
| Review changes | — | — | — | — | 未捕获 |
| Undo / Keep All / Undo All | — | — | — | — | 未捕获 |

**判定更新：**

- `Keep`：由 closed 改为 **有实机样本、可做**。anchor 与 `phase-1d2b0` 记录的
  `data-diff-card-header` / `data-diff-content-ready` 一致；需要新增一个 diff 卡片作用域。
- `Undo` / `Keep All` / `Undo All`：同一视图未出现，**待定向取证**
  （可能为图标按钮 + `aria-label`，也可能是不同卡片状态）。
- `New Agent`：悬浮未产生文本，仍归属性翻译 deferred。

**边界：** 本次仅一个 diff 卡片样本；未确认 `Keep` 按钮所在卡片是否会在
`data-message-kind` 容器内出现；未确认 `Undo` 等是否存在。

## 顺带发现

- 侧栏菜单按钮带 **`data-action-id`**（`div.ui-button.ui-sidebar-menu-button[data-sidebar-menu-button,data-variant,data-compact,data-action-id]`）。
  这可能是比 class 更稳定的**按项作用域**锚点，值得在后续阶段评估；本次未使用、未依赖。

## 未验证与边界

- 未部署、未实机验收 `Customize` 的中文显示。
- Console 新增性仍未判定。
- 探针只读取属性名与计数，无消息正文样本。
