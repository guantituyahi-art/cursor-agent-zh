# Phase 1B.1 — Loader 收口与可重复部署

> 日期：2026-09-24（Asia/Shanghai）  
> 范围：幂等 deploy / restore、SoT、runtime guard、备份硬规则。  
> **未做**：翻译、词典、MutationObserver、Settings、Phase 1C、commit / push。  
> **人工 DevTools**：Phase 1B §5 三项已于 2026-09-24 由用户确认通过。

---

## 结论

**A. Phase 1B.1 已通过，可以进入 Phase 1C**

依据：本机（`LAPTOP-07K1IGOK` / Cursor 3.21.18）自动 Test A–E 全部通过。  
说明：Phase 1B 人工 Glass/Editor Console 三项已由用户确认通过；本文件记录的是部署层自动测试。

---

## Source of Truth

| 角色 | 路径 |
| --- | --- |
| **唯一源码** | `runtime/bootstrap.js` |
| **部署产物** | `resources/app/out/vs/workbench/cursor-agent-zh-bootstrap.js` |

`deploy-glass-loader.js` 每次运行都用仓库 SoT **覆盖复制** sidecar。禁止在安装目录单独维护另一份逻辑。

---

## 脚本

| 文件 | 作用 |
| --- | --- |
| `scripts/deploy-glass-loader.js` | 定位 app → checksum 门禁 → marker 幂等 → 备份规则 → 追加 loader → 复制 sidecar |
| `scripts/restore-glass-loader.js` | 验证 backup → 恢复 glass → 删 sidecar |
| `scripts/lib/glass-loader-shared.js` | 常量、SHA、marker 扫描、loader 源码、路径解析 |

用法：

```bash
export CURSOR_APP="D:/下载应用/cursor/resources/app"   # resources/app
node scripts/deploy-glass-loader.js --repo /path/to/cursor-agent-zh
node scripts/restore-glass-loader.js --app "$CURSOR_APP"
```

---

## Deploy 行为

1. 解析 `CURSOR_APP` / `--app` / PATH 上的 `cursor`。  
2. 读 `product.json`：若 checksum 键含 glass → **STOP**，零写入。  
3. **始终**从 `runtime/bootstrap.js` 复制 sidecar。  
4. 若 glass 已含 marker → 不再追加；打印 `loader already installed` + `sidecar refreshed from source of truth`。  
5. 若无 marker：  
   - 已有 backup → 校验无 marker 且 SHA = `F43F8393…B4BC`，否则 STOP，**不覆盖** backup；  
   - 无 backup → 仅当当前 glass SHA 已是该 pristine 时才创建 backup（本 PoC 钉死 3.21.18 基线）；  
   - 再 EOF 追加带 marker 的 loader（含 runtime guard）。  
6. 断言 `product.json` 与 `workbench.desktop.main.js` SHA 未变。

---

## Restore 行为

1. 验证 backup（无 marker + pristine SHA）。  
2. backup → `workbench.glass.main.js`。  
3. 删除 sidecar（若存在）。  
4. 确认恢复后 glass SHA = pristine；不改 product / desktop。

---

## Backup 硬规则

- 文件名：`workbench.glass.main.js.cursor-agent-zh-backup`  
- **禁止**把「当前可能已注入的 glass」覆盖成 backup。  
- 已存在 backup：只能复用；SHA 必须为  
  `F43F8393D53FEBD5DB82DA6EECDE39BF4D1878DC5D811D557EFA91279B39B4BC`

---

## Checksum 门禁

- 本机 3.21.18：checksum 仍为 6 键，**无** glass。  
- 测试全程 `product.json` SHA 未变：  
  `38A60F0C35FBBDA39D7A7582809FD73A5E442AAFB5D75D897B05C9539F95373B`

---

## Marker 幂等 + Runtime guard

- Marker：`cursor-agent-zh-phase1a-loader`（注释 `/* … */`）。  
- 文件级：已存在则不追加。  
- 运行时：loader 内 `if (globalThis.__cursorAgentZhLoader) return; globalThis.__cursorAgentZhLoader = 1`。  
- 同页误执行两次不会重复挂 sidecar script。

---

## 本机测试结果（2026-09-24）

| Test | 结果 | 摘要 |
| --- | --- | --- |
| A 已注入再 deploy | **PASS** | `loader already installed (marker count=1)`；sidecar 刷新；backup/product/desktop 不变 |
| B sidecar = SoT | **PASS** | 字节级等于 `runtime/bootstrap.js` |
| C backup 不覆盖 | **PASS** | 始终 `F43F8393…B4BC` |
| D restore | **PASS** | glass 回到 `F43F8393…B4BC`；sidecar 删除 |
| E 再 deploy + 二次 deploy | **PASS** | marker=1；含 `__cursorAgentZhLoader`；二次 deploy glass SHA 不变 |

### 安装目录终态（测试结束后保持「已部署」）

| 项 | 值 |
| --- | --- |
| glass SHA256（含新 loader+guard） | `21D2F3946289CBBE75859521826F250B4EC3BBA96411D064F35585FBE131F1FA` |
| backup SHA256 | `F43F8393D53FEBD5DB82DA6EECDE39BF4D1878DC5D811D557EFA91279B39B4BC` |
| marker 次数 | 1 |
| sidecar | 已从 SoT 部署 |
| product / desktop | 未改 |

> 注：终态 glass SHA **不同于** Phase 1A 首次注入后的 `6E53DD7E…`，因为 1B.1 在 restore 后重新部署了带 runtime guard 的 loader。这是预期行为。

### 非自动测试（人工，已确认）

人工 DevTools（Glass 有日志 / Editor 无日志 / 重启仍有效）——**非自动验证**；用户于 2026-09-24 确认三项全部 **通过**（见 `phase-1b-load-entry.md` §5）。
