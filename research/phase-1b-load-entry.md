# Phase 1B — 方案 B 加载入口安全验收

> 状态：**静态审计 + 人工 DevTools 验收完成（2026-09-24）**。用户确认三项全部通过。  
> 范围：只判断方案 B 是否可作后续 Glass runtime 正式加载入口。  
> **未做**：中文翻译、词典扩展、Settings、commit / push、Phase 1C。  
> 锚定：Cursor **3.21.18** @ `D:\下载应用\cursor\resources\app`（`LAPTOP-07K1IGOK`）。

---

## 结论（本阶段）

**A. 方案 B 可以继续进入 Phase 1C**（在 Phase 1B.1 部署层与人工 DevTools 均完成后）。

- **Checksum 原则：未冲突**（不是结论 C）。glass **不在** `product.json.checksums`。
- **静态审计：通过**（见下文与 `phase-1b1-deploy.md`）。
- **Phase 1B.1：** 幂等 deploy/restore + SoT 已落地；自动 Test A–E 通过。
- **人工 DevTools：通过**（2026-09-24，用户确认三项全部通过；见 §5）。

若未来 glass 被写入 checksums，或出现完整性损坏提示且归因于本注入 → 立即改判 **C**，且**禁止**改 product.json / 同步 checksum。

---

## 1. Checksum 检查（只读）

| 项 | 结果 |
| --- | --- |
| `product.json` 路径 | `D:\下载应用\cursor\resources\app\product.json` |
| `version` | `3.21.18` |
| checksum 键数量 | **6** |
| 完整键列表 | 见下表 |
| 含 `workbench.glass` 的键 | **无** |
| `product.json` 正文是否提及 `workbench.glass.main` | **否** |
| glass 是否受 checksum 保护 | **否** |
| 对应 checksum key | **无**（不存在） |
| Phase 1A/1B 是否修改过 `product.json` | **未修改**（本项目注入未写入该文件） |
| 当前 `product.json` SHA256（现状快照，非「出厂基线」） | `38A60F0C35FBBDA39D7A7582809FD73A5E442AAFB5D75D897B05C9539F95373B` |
| 修改 glass bundle 后的完整性风险（相对官方 checksum 列表） | **低（键表层面）**：glass 不在校验列表，官方启动校验**不应**因 glass EOF 追加而报「安装损坏」。 |
| 残留 / 未知风险 | Cursor 是否另有未写入 `product.json.checksums` 的完整性机制 → **未证实**；升级后若新增 glass 键 → 风险跃升。 |

### 当前 `checksums` 全部键

1. `vs/base/parts/sandbox/electron-sandbox/preload.js`
2. `vs/workbench/workbench.desktop.main.js`
3. `vs/workbench/workbench.desktop.main.css`
4. `vs/workbench/api/node/extensionHostProcess.js`
5. `vs/code/electron-sandbox/workbench/workbench.html`
6. `vs/code/electron-sandbox/workbench/workbench.js`

**若 glass 受保护时的策略（本机不适用，但原则保留）：** 立即停止扩大方案 B；不改 product.json；不同步 checksum；只报告并改评 B′ / 其它路径。

---

## 2. Phase 1A loader 审计

### 实际文件

| 文件 | 角色 |
| --- | --- |
| `out\vs\workbench\workbench.glass.main.js` | 仅 EOF 追加 loader |
| `out\vs\workbench\cursor-agent-zh-bootstrap.js` | sidecar（PoC 日志） |
| `out\vs\workbench\workbench.desktop.main.js` | **未注入**（尾部无本项目 marker） |

### 哈希与标记

| 项 | 值 |
| --- | --- |
| 注入后 glass SHA256 | `6E53DD7E7AD24510F23DF7D775AD37EC5849284FC3D34D2CA78B165DF7DEE9AF`（与 Phase 1A 记录一致） |
| 注入后长度 | `44978162` |
| Marker | `cursor-agent-zh-phase1a-loader`（注释形式 `/* … */`） |
| 全文件 marker 出现次数 | **1** |
| desktop 尾部含 marker | **否** |

### Loader 机制（摘要）

1. IIFE 包在 `try/catch` 中；**无** `throw`。
2. 解析 sidecar URL：优先 `script[src*=workbench.glass.main.js]` 的目录；否则从 `location.href` 中的 `/out/vs/` 拼 `workbench/`。
3. `document.createElement('script')` 加载 `cursor-agent-zh-bootstrap.js`；`onerror` 只 `console.error`，不中断。
4. `DOMContentLoaded` 或立即执行（视 `readyState`）。

### 安全失败（静态判断）

| 场景 | 预期（静态） | 运行时证实？ |
| --- | --- | --- |
| sidecar 缺失 | `onerror` 打日志，不抛到外层 | **未人工证实** |
| `pickBase()` 失败 | `console.error` 后 return | **未人工证实** |
| sidecar 抛错 | 取决于浏览器对经典 script 错误的处理；loader 自身已 catch 外围 | **未人工证实** |
| 破坏 Glass Window | 设计上避免；**不能**静态保证零风险 | **等待人工** |

### 重复注入风险

- 现状：marker **仅一处**；Phase 1A 注入脚本在发现 marker 时会中止。
- 缺口：安装树内无正式 `ensure`/`inject` 命令；若忽略 marker 再次 EOF 追加 → 会重复执行 loader。
- **建议极小补丁（本阶段未改安装文件，仅提案）：** 任何未来写入 glass 的脚本必须 `(1)` 全文件或尾部扫描 marker，`(2)` 已存在则 no-op，`(3)` 记录 SHA。可选：loader IIFE 内 `if (globalThis.__cursorAgentZhLoader) return; globalThis.__cursorAgentZhLoader = 1` 防止同页双跑。

---

## 3. 备份完整性

| 项 | 结果 |
| --- | --- |
| 备份路径 | `workbench.glass.main.js.cursor-agent-zh-backup` |
| 存在 | 是 |
| 长度 | `44976559` |
| SHA256（重算） | `F43F8393D53FEBD5DB82DA6EECDE39BF4D1878DC5D811D557EFA91279B39B4BC` |
| 与 Phase 1A 原始记录 | **一致** |
| 是否含 `cursor-agent-zh-phase1a-loader` | **否** |
| 本阶段是否覆盖备份 | **否** |

**未触发停止条件。**

### 回滚方法（记录）

1. 用备份覆盖：`workbench.glass.main.js.cursor-agent-zh-backup` → `workbench.glass.main.js`
2. 删除（可选）`cursor-agent-zh-bootstrap.js`
3. 重启 Cursor / 重开 Agents Window  
**不要**为回滚去改 `product.json`。

---

## 4. Source of Truth

| 位置 | 内容关系 |
| --- | --- |
| 仓库 `runtime/bootstrap.js` | 含说明注释 + `console.log("[cursor-agent-zh] runtime loaded");` |
| 安装 `cursor-agent-zh-bootstrap.js` | **仅**一行 `console.log(...)`（无仓库头注释） |
| 关系 | **语义同源、字节不等价**；安装文件是手工/脚本部署产物，不是 git 跟踪文件 |

### 最小收口方案（本阶段只记录，不实现完整 installer）

1. **唯一源：** 仓库 `runtime/bootstrap.js`（日后翻译器也只进此文件或由其 import 的模块）。
2. **部署产物：** `…/out/vs/workbench/cursor-agent-zh-bootstrap.js` = 由工具从仓库复制（可允许剥离文件头注释，但逻辑字节应来自仓库；或规定「安装时原样复制」二选一，推荐**原样复制**以免漂移）。
3. **Loader：** 仍只负责加载 sidecar URL；不内嵌业务逻辑。
4. **门禁：** 进入 Phase 1C 业务代码前，文档或脚本中写明 `deploy-sidecar` 步骤；CI/本地可对「仓库文件 SHA」与「安装 sidecar SHA」做可选比对。

---

## 5. 人工验收门禁

本助手不能直接读取 DevTools；下列结果由**用户于 2026-09-24 确认「通过」**（三项一并确认）：

| # | 门禁 | 状态 |
| --- | --- | --- |
| 1 | 完全重启后，Glass Console 出现 `[cursor-agent-zh] runtime loaded` | **通过** |
| 2 | 普通编辑器 Console **不**出现该日志 | **通过** |
| 3 | 再次重启后依然有效 | **通过** |

---

## 6. 已知风险（摘要）

| 风险 | 等级（当前认知） | 说明 |
| --- | --- | --- |
| 官方 checksum 拦 glass | 低（本机 3.21.18） | 键表无 glass；升级可能变化 |
| 未文档化的其它完整性检查 | 未知 | 需靠人工观察有无「安装损坏」 |
| 升级覆盖 glass | 高（预期） | loader 丢失，需重注入 |
| `pickBase` 失败 / CSP 拦 sidecar | 中 | 设计为安全失败；待人工看 Console |
| 重复 EOF 追加 | 中（流程） | 缺持久幂等工具 |
| SoT 漂移 | 中（流程） | 仓库与 sidecar 已不完全一致 |
| 人工验收 | 已通过（2026-09-24） | 见 §5 |

---

## 7. 审计元数据

- 审计脚本输出：`%TEMP%\cursor-agent-zh-phase1b.json`（2026-09-24T09:55+08:00）
- 相关文档：`research/phase-1a-injection.md` §7 注入记录；`docs/architecture.md` §D

---

## 8. Phase 1C 进入条件

下列在 2026-09-24 均已满足（可进入 1C；本文件不启动 1C 实现）：

1. §5 人工三项用户确认为通过；  
2. SoT 约定：`runtime/bootstrap.js` 唯一源，sidecar 为部署产物（`phase-1b1-deploy.md`）；  
3. 注入/ensure：`scripts/deploy-glass-loader.js` 具备 marker 幂等；  
4. glass 仍不在 checksums（升级后须重检）。
