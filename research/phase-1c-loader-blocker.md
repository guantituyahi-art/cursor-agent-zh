# Phase 1C — Loader blocker investigation (Agents Window)

> 日期：2026-09-24（Asia/Shanghai）  
> 状态：**已修复；人工复测通过（2026-09-24）**（本阶段可随 Phase 1C 一并 commit；不进入 Phase 1D）  
> 安装：`D:\下载应用\cursor\resources\app` · Cursor **3.21.18** · commit `c4730f7d…`

## Symptom

在确认 Glass 的 Agents Window Console 中：

| Check | Result |
| --- | --- |
| `document.body.getAttribute('data-cursor-glass-mode')` | `"true"` |
| `globalThis.__cursorAgentZhLoader` | `undefined` |
| `document.querySelector('script[src*="cursor-agent-zh-bootstrap.js"]')` | `undefined` |
| `typeof globalThis.__cursorAgentZhRuntime` | `"undefined"` |

结论：loader 未执行，sidecar 未加载。Phase 1C 安全骨架自动测试通过，但真实入口未过人工验收。

## Root Cause

**不是** `//# sourceMappingURL` 行注释吞掉 loader。

调查时磁盘上的 `workbench.glass.main.js`（SHA `21D2F394…`）尾部 loader 已在独立行、位于 `sourceMappingURL` / `debugId` **之后**，语法可执行，marker=1。

真正原因：

1. Agents Window 通过 `workbench.js` 对  
   `vs/workbench/workbench.glass.main.js` 做 **native ESM `import()`**（`vscode-file://`）。
2. Electron 对该 scheme 启用了 code cache（进程参数含 `--code-cache-schemes=…,vscode-file`）。
3. `%APPDATA%\Cursor\CachedData\c4730f7d…\chrome\js\` 中存在约 **25 MB** 的缓存条目，**mtime=2026-09-22**（注入之前），且 **不含** `cursor-agent-zh` / loader marker。
4. 磁盘 glass 已于 2026-09-24 注入，但运行时仍更可能执行 **CachedData 中的旧 V8 字节码**，因此 `__cursorAgentZhLoader` 永不出现。

次要加固（非本 blocker 主因，但已一并修复）：

- 旧 deploy 使用 `appendFileSync`；若原始文件无尾换行，理论上存在把 loader 粘到 `//` 行的风险 → 现改为从 backup **整文件重写**，并优先插在 `//# sourceMappingURL` **之前**。
- Glass 为 ESM，页面上往往没有 `script[src*=glass]` → loader 的 `pickBase` 改为优先 `globalThis._VSCODE_FILE_ROOT`，sidecar 用 `import()`（失败再回退 script 标签）。

## 修改文件（仓库）

| 文件 | 变更 |
| --- | --- |
| `scripts/lib/glass-loader-shared.js` | `composeGlassWithLoader` / `reinstallLoaderFromBackup` / `clearCursorJsCodeCache`；loader 独立行；pickBase + dynamic import |
| `scripts/deploy-glass-loader.js` | `--reinstall-loader`、`--clear-code-cache`；首次安装也走 compose 而非裸 append |
| `scripts/test-loader-placement.js` | **Test F**（及 F2/F3）placement 回归 |
| `research/phase-1c-loader-blocker.md` | 本文 |
| `runtime/bootstrap.js` | **未改** Phase 1C safety 逻辑 |

## 安装目录操作

在 Cursor **完全退出**（`Cursor.exe` 计数为 0）后执行：

```text
node scripts/deploy-glass-loader.js --app <resources/app> --repo <repo>
  --reinstall-loader --clear-code-cache
```

效果：

1. 从 **未覆盖的** backup 读出原始 glass  
2. 写入 **恰好一份** loader（`placement=before-sourceMappingURL`）  
3. 刷新 sidecar（SoT = `runtime/bootstrap.js`）  
4. 删除该 product `commit` 下 `CachedData/.../chrome/js` 内文件（本次 removed=27）

随后又跑了 restore → 再 deploy 回归，确认 backup/product/desktop 不变量仍成立。

## SHA

| 项 | SHA256 |
| --- | --- |
| 原始 backup（未覆盖） | `F43F8393D53FEBD5DB82DA6EECDE39BF4D1878DC5D811D557EFA91279B39B4BC` |
| 修复后 glass（before-sourceMappingURL loader） | `24ED1E6367B15F05BADAE9CCE9952DABDCF0EDB61DA911658B7F3479A118B810` |
| product.json | `38A60F0C…95373B`（未变） |
| desktop bundle | `42479915…9098`（未变） |

旧注入 SHA `21D2F394…` 已被本次 reinstall 替换（预期：placement 从 “EOF after pragma” 改为 “before sourceMappingURL”）。

## 不变量

| 检查 | 结果 |
| --- | --- |
| marker count | **1** |
| backup 未覆盖 | **是**（仍为 `F43F8393…`） |
| product.json | **未改** |
| desktop | **未改** |
| checksum / product checksums 列表 | **未改**；glass 仍不在 checksum 中 |
| CachedData chrome/js（该 commit） | **已清空**（文件数 0） |

## 自动回归

| Suite | 结果 |
| --- | --- |
| `scripts/test-loader-placement.js`（Test F…） | PASS |
| `scripts/test-runtime-safety.js`（1C A–F） | PASS |
| restore → redeploy | PASS（backup SHA 恢复后再次 compose） |

## 人工复测（已通过）

用户于 2026-09-24 确认 loader / runtime 已在 Agents Window 正常加载。复测步骤（历史）：

```js
globalThis.__cursorAgentZhLoader
globalThis.__cursorAgentZhRuntime?.getStatus()
```

期望：

1. `__cursorAgentZhLoader` 为真值（如 `1`）  
2. Console 出现 `[cursor-agent-zh] runtime loaded` 和/或 `sidecar module loaded`  
3. `getStatus()` 可用且 `isGlass: true`  
4. 页面文案无中文翻译 / 聊天正文无变化  

## 结论

**A. Loader blocker 已修复，人工复测通过（2026-09-24）。**

不开始 Phase 1D，直至用户明确指示。
