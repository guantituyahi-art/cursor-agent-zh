# Upgrade Compatibility Gate — Cursor 3.22.7 → 3.24.18

> 日期：2026-10-15（Asia/Shanghai）
> 仓库基线：`6630803`
> 性质：**WSL 侧只读静态扫描**。未部署、未 restore、未写安装目录、未改 `product.json`、未跑实机 DOM 探针。
> 上次同类审计：[`cursor-3.22.7-upgrade-compat.md`](cursor-3.22.7-upgrade-compat.md)。

## 结论

**B —— 需要适配后才能 deploy。** 静态层面加载机制与安全锚点未变，但：

1. 安装版已从 3.22.7 升到 **3.24.18**，仓库 `SUPPORTED_BASELINES` 未登记 → 部署脚本会 fail-closed 拒绝。
2. 上一次的注入**已被更新器清除**（marker = 0，sidecar 不存在）。
3. **实机 DOM 未验证**：消息 kind / role 取值集合与 Settings 作用域仍需在真实 Agents Window 复核。

> **2026-10-15 更新：条件 1、2 已解决**（baseline 已登记，见 §8）；**条件 3 的消息 kind/role 已实机验证通过（见 §9）**，Settings 作用域仍未覆盖（低风险）。**当前判定：可进入部署。**

与 3.21.18 → 3.22.7 属同一模式：更新器替换 bundle 并清掉安装目录内的 sidecar，不是新问题。

## 1. 版本身份

| 项 | 值 |
| --- | --- |
| version（product.json / package.json） | **3.24.18**（上一基线 3.22.7） |
| commit | `be4c9e5350d77747b42cd467cbd3370a753d4640` |
| 安装目录 | `D:\下载应用\cursor\resources\app` |
| product.json SHA256 | `ED3E8A51AE196A075964A9D1A8866F27F5117CF3080FB8F3261B72749A15FD86` |
| package.json SHA256 | `31C1C7957AC295CED9AA5E75668507E3FCB4B9B9918B304D970EC1FE293155EA` |
| glass js 修改时间 | 2026-10-13 19:04:48 +0800 |

## 2. Glass 资源（静态）

| 文件 | 存在 | 大小 | SHA256 |
| --- | --- | --- | --- |
| `out\vs\workbench\workbench.glass.main.js` | 是 | 47,393,036 | `8660A1449025C353BCB9E076D609A427955EB0A94B2D84646D2F758C6947813B` |
| `out\vs\workbench\workbench.glass.main.css` | 是 | 1,283,951 | `FCB71974B675D98505CA73C6B381E8FEB282753B1E3AFCA7698E15EACCDAE449` |
| `out\vs\code\electron-sandbox\workbench\workbench.js` | 是 | 35,754 | `CDA2B96E8B512B0BA73291921D7D481E09AF3DDA1AC9FEF0D3D61551603F4FE4` |

- `workbench.js` 仍为 `resolveEsModule: o.glass===!0 ? "vs/workbench/workbench.glass.main" : "vs/workbench/workbench.desktop.main"` → Glass 仍使用该 bundle。
- glass 静态计数：`sourceMappingURL` = 1（注入点唯一）、`cursor-glass-mode` = 22。

## 3. loader 状态（注入已被清除）

| 检查 | 结果 |
| --- | --- |
| `cursor-agent-zh-phase1a-loader` marker | **0** |
| sidecar `out\vs\workbench\cursor-agent-zh-bootstrap.js` | **不存在** |

**判定：** 更新器覆盖 bundle 并清掉 sidecar。当前汉化为**失效状态**。

## 4. Checksum 重新检查（3.24.18）

`product.json.checksums` 仍为 6 键：

- `vs/base/parts/sandbox/electron-sandbox/preload.js`
- `vs/workbench/workbench.desktop.main.js`
- `vs/workbench/workbench.desktop.main.css`
- `vs/workbench/api/node/extensionHostProcess.js`
- `vs/code/electron-sandbox/workbench/workbench.html`
- `vs/code/electron-sandbox/workbench/workbench.js`

**`workbench.glass.main.js` 仍不在 checksum 列表**，无需触碰 `product.json`。

## 5. 静态锚点计数（3.24.18，仅证明字符串存在，不等于实机 DOM）

| 标记 | 计数 |
| --- | --- |
| `data-message-kind` | 9 |
| `data-message-role` | 9 |
| `glass-settings-panel` | 2 |
| `glass-settings-sidebar` | 1 |
| `ui-field-group__entry-label` | 2 |
| `ui-field-group__entry-description` | 2 |
| `ui-sidebar-menu-button-label` | 2 |
| `data-sidebar-menu-button` | 25 |
| `data-sidebar-row-trigger` | 3 |
| `data-action-id` | 4 |
| `data-diff-card-header` | 7 |
| `data-diff-content-ready` | 1 |

bundle 中 `"human"` / `"assistant"` / `"thinking"` / `"tool"` / `"ai"` 均有出现（仅供参考，不构成 DOM 取值证明）。

## 6. 待实机验证（不得据静态推断）

- `body[data-cursor-glass-mode]` 是否仍为 `"true"`。
- `data-message-kind` / `data-message-role` 的**实际取值集合**（3.22.7 曾新增 `thinking` / `ai`；本次是否有新值未知）。
- Settings 作用域：`data-component=glass-settings-panel` + `data-react-tab`、`glass-settings-sidebar`、`ui-field-group__entry-label/description`、`ui-sidebar-menu-button-label`。
- 现有词典条目在真实 UI 中是否仍命中（New Chat / New Project / Automations / Search / Customize 等）。

## 7. 建议下一步

1. ✅ **已完成**：登记 3.24.18 baseline（见 §8）。
2. ⬅ **待做**：实机只读 DOM 探针（用户执行）——确认 kind / role 取值集合与 Settings 作用域。
3. 依探针结果决定是否需要新的 kind / role / 作用域适配。
4. 全量测试 → 部署 → 实机验收。

## 8. Baseline 登记（已完成，2026-10-15）

`scripts/lib/glass-loader-shared.js` 新增 3.24.18 条目（保留 3.22.7 历史基线）：

| version | commit | sha256 | bytes |
| --- | --- | --- | --- |
| **3.24.18** | `be4c9e5350d77747b42cd467cbd3370a753d4640` | `8660A1449025C353BCB9E076D609A427955EB0A94B2D84646D2F758C6947813B` | 47,393,036 |
| 3.22.7 | `37076c6c3f9e253c0fa2305197e45befd13a2260` | `721501D167E1EA82E51F33346C924448A34360E857B1E6D3972DC677589AA5A0` | 45,389,668 |

- 新增测试 `scripts/test-supported-baselines.js`（4 项）：守护每个基线的 SHA/bytes 与 `version:commit` key 格式，并验证 `readSupportedIdentity()` 对已登记身份解析、对未知身份 fail-closed。
- 只读验证：对真实安装目录 `/mnt/d/下载应用/cursor/resources/app` 调用 `readSupportedIdentity()`，返回 3.24.18 条目。
- 全量 **13** 个测试脚本 `exit=0`。
- **部署仍未执行。** 部署前仍待完成「实机 DOM 探针」这道门禁。

## 9. 实机只读 DOM 探针（2026-10-15，3.24.18）

方法：DevTools Console 内联脚本，只读取 DOM 属性与计数，**不读消息正文**；采集期界面为「有消息的对话 + 展开的侧栏」。

| 字段 | 实测值 | 判定 |
| --- | --- | --- |
| `glass` | `"true"` | Glass 标记仍在 |
| `runtime` / `loader` | `false` / `false` | 注入确认已被清除 |
| `messageKinds` | `human:6, thinking:3, assistant:8, tool:4` | **无新增 kind**，全部在现有 `MESSAGE_KINDS` 内 |
| `messageRoles` | `human:6, ai:15` | **无新增 role**；`ai` = 8+3+4，与 3.22.7 结论一致 |
| 词典目标 | New Chat 2 / New Project 2 / Automations 2 / Search 1 / Customize 1 | 现有词条在真实 UI 中仍存在 |
| `counts` | sidebar 41、sidebarLabel 41、code 105、input 5、ce 5 | 侧栏锚点与排除目标正常；`pre` 0、`monaco` 0、`xterm` 0（本次未出现） |
| Settings | `tabs`=[]、settingsSidebar 0、entryLabel 0、entryDesc 0 | **未覆盖**：Settings 页未打开 |

**结论：**

- 消息不变量在 3.24.18 **仍然成立** → 安全门禁通过。
- Settings 作用域本次未实机覆盖。风险低：锚点若改名，规则只是**未命中**（fail-closed），不会误译。
- `monaco` / `xterm` 本次未出现，排除规则无需改动。

## 未验证与边界

- 未在真实 3.24.18 Agents Window 运行任何探针；第 5 节全部为静态文本计数。
- 未部署、未创建备份、未清理 CachedData。
- 未找到 `%LOCALAPPDATA%\cursor-agent-zh\backups` 外部备份目录（WSL 侧不可见），需在 Windows 侧确认旧备份是否仍在。
- Console 新增性仍未判定。
