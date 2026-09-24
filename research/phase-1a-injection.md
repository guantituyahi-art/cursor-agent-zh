# Phase 1A — Glass / Agent Window 注入加载研究

> 状态：**Phase 1A 注入已实施（2026-09-24）**（方案 B：备份 + sidecar + EOF loader）。验证待 Agent Window DevTools。  
> 日期：2026-09-23 研究 / 2026-09-24 本机核对（Asia/Shanghai）。  
> 锚定版本：Cursor **3.21.18**（本机 `package.json` / `product.json` 已确认）。  
> 用户机：Windows `LAPTOP-07K1IGOK`（已连接）；安装根 **`D:\下载应用\cursor\resources\app`**（非 `%LOCALAPPDATA%\Programs\cursor`）。  
> 目标 PoC：在 Glass 内加载外部 `runtime/bootstrap.js`，仅 `console.log("[cursor-agent-zh] runtime loaded")`。

---

## 0. 约束回顾（必须遵守）

| # | 约束 |
| --- | --- |
| 1 | **仅 Glass / Agent Window** — 永不注入普通 Cursor Editor |
| 2 | 优先 **最小稳定** bootstrap 注入点 |
| 3 | **不修改** `workbench.desktop.main.js` |
| 4 | **不修改** `product.json` checksums 列表中的任何文件 |
| 5 | 不对 `workbench.glass.main.js` 做大改写/格式化；若必须触碰，仅最小 loader |
| 6 | 若无可靠最小路径 → 推荐 **STOP** |
| 7 | 不以「同步/改写 product.json checksum」为默认路径（见 `docs/architecture.md` §B） |

---

## 1. How Glass Window likely loads（社区 + 文档重建）

### 1.1 高层链路（重建，非官方白皮书）

```text
Cursor.exe
  └─ Electron main  (resources/app/package.json → "main": usually ./out/main.js)
       ├─ Editor BrowserWindow  → HTML shell → workbench.desktop.main.js (+ .css)
       └─ Agents / Glass BrowserWindow
            → HTML shell (likely electron-sandbox workbench HTML; exact file TBD on device)
            → vscode-file://…/out/vs/workbench/workbench.glass.main.js
            → (+ workbench.glass.main.css when present)
```

依据：

1. **官方 Agents Window 文档**（[cursor.com/docs/agent/agents-window](https://cursor.com/docs/agent/agents-window)）：Agents Window 与经典 Editor 可切换/并存，是独立 agent-first 界面（Cursor 3 GA）。
2. **论坛崩溃栈**：大量 Agents Window / GlassSidebar / AgentPanel 错误全部落在  
   `vscode-file://vscode-app/…/resources/app/out/vs/workbench/workbench.glass.main.js`  
   （例：UriError `_createBackgroundComposerUri`、thinking-trace 卡死等）。证明 **Glass UI 运行时入口就是 glass bundle**，不是 desktop bundle。
3. **社区汉化目标文件一致列出 glass**：  
   - rainiva：`workbench.glass.main.js` ↔ `workbench.glass.main_translated.js`  
   - svipm `CODE_TARGETS`：glass 排在 desktop 之前  
   - baishi `TARGET_FILES`：glass 标为「Glass 主页」  
   - LoosePrince：`glassWorkbenchPath` + target id `glass`

### 1.2 Entry HTML vs JS bootstrap

| 层 | 典型路径（Windows） | 角色 |
| --- | --- | --- |
| App 根 | `%LOCALAPPDATA%\Programs\cursor\resources\app\` | `package.json` / `product.json` |
| Main process | `…\resources\app\out\main.js` | Electron 主进程；创建窗口、注册 `vscode-file` 协议 |
| Desktop HTML | `…\out\vs\code\electron-sandbox\workbench\workbench.html` | **经典 Editor** 渲染壳（vibepm 注入点） |
| Desktop JS | `…\out\vs\workbench\workbench.desktop.main.js` | 经典 Workbench UI |
| Glass JS | `…\out\vs\workbench\workbench.glass.main.js` | **Agent Window / Glass UI** |
| Glass CSS | `…\out\vs\workbench\workbench.glass.main.css` | Glass 样式（本仓库笔记：常不在 checksum） |

**尚未在无安装环境下证实的点：**

- Agents Window 是否复用同一个 `workbench.html`，还是另有 `workbench-glass.html` / 等价入口 HTML。  
- Glass 窗口创建时 HTML 内 script 标签如何引用 glass bundle（相对路径 vs 动态 `vscode-file`）。

因此：**HTML 注入不能默认视为 Glass-only**；vibepm 明确写的是 desktop `workbench.html`。

### 1.3 rainiva 的加载重定向（最清晰的「如何加载 glass」社区证据）

rainiva `AGENTS.md` + `scripts/tool/builder/bootstrap.js`：

1. 将 `package.json` 的 `main` 指到 **`out/cursorTranslatorMain.js`**（新建文件）。
2. **不改**原始 `out/main.js` 字节（避免 profile 目录漂移）。
3. Bootstrap 在主进程里 patch `session.defaultSession.protocol.registerFileProtocol`，对 scheme `vscode-file`：  
   若请求 basename 为 `workbench.glass.main.js`（及 desktop / automations）且旁路存在 `*_translated.js`，则 **改写 URL 到译后文件**。
4. 译后 glass bundle 顶部再注入 DOM 运行时翻译器（MutationObserver）。

含义：Electron 在 **加载 glass 包之前** 仍走同一 `vscode-file` 管线；Glass 与 Desktop 是 **同协议、不同 basename** 的两条工作台入口。

### 1.4 Agent Window 与 Desktop Editor 的差异（对本项目）

| | Desktop Editor | Agents / Glass |
| --- | --- | --- |
| 主 UI bundle | `workbench.desktop.main.js` | `workbench.glass.main.js` |
| 社区 HTML 注入 | vibepm → `workbench.html` | **无社区「仅 glass HTML」先例** |
| 扩展宿主 | 标准 VS Code extension host | Glass 是否完整加载用户扩展 **未证实** |
| Checksum（社区） | desktop.js **通常在** `product.json.checksums` | glass.js：**baishi 显式 `hashKey: null`**（见 §3） |
| 本项目范围 | **禁止注入** | **唯一允许作用域** |

---

## 2. Candidate injection points

### A — HTML / bootstrap 注入（vibepm 路径）

| 项 | 评估 |
| --- | --- |
| **机制** | 在 `electron-sandbox/workbench/workbench.html` 注入标记 + `<script src="./Cursor_Localization.js">`；旁路写入组装好的运行时 JS。 |
| **触碰文件** | `workbench.html`、同目录注入 JS；几乎总是再改 `product.json` checksums（vibepm `WORKBENCH_CHECKSUM_KEY_HINTS` + `GengXin_JiaoYan_Zhi()`）。 |
| **Glass-only?** | **否。** 目标是经典 Editor HTML。即使 Glass 碰巧共用该 HTML（未证实），也会污染普通 Editor，违反约束 1。 |
| **Checksum 风险** | **高。** vibepm 明确列出  
  `vs/code/electron-sandbox/workbench/workbench.html` 等键，并在注入后同步全部 checksum。 |
| **升级脆弱性** | HTML 结构/`</body>` 锚点、checksum 键名均可能变；每次升级需重跑。 |
| **约束可行性** | **否决。** 非 Glass-only + 改 checksummed 文件 + 依赖 checksum sync。 |

### B — Glass JS 单点最小 loader（**本机已确认优先；待用户批准后实现**）

| 项 | 评估 |
| --- | --- |
| **机制** | 在 `workbench.glass.main.js` **末尾**追加极小 loader（理想一行/数行），动态插入 `<script>` 或 `import()` 加载旁路 `cursor-agent-zh-bootstrap.js` / 指向用户仓库的 `runtime/bootstrap.js`（PoC 仅 `console.log`）。**禁止**全文替换/美化。 |
| **触碰文件** | （1）`out/vs/workbench/workbench.glass.main.js` — 仅追加 loader；（2）同目录新增旁路 JS（我们的文件，不在官方清单内）。**不碰** desktop.main.js。 |
| **Glass-only?** | **是。** |
| **Checksum 风险** | **社区证据：低。** baishi `src/platform.js`：  
  ```js
  { rel: '…/workbench.glass.main.js', hashKey: null, label: 'Glass 主页' },
  { rel: '…/workbench.desktop.main.js', hashKey: 'vs/workbench/workbench.desktop.main.js', … }
  ```  
  即他们为 desktop 修 hash，**故意不为 glass 设 hashKey**。  
  安全博客/讨论亦常只提 `checksums["vs/workbench/workbench.desktop.main.js"]`。  
  **但仍必须以本机 3.21.18 的 `product.json.checksums` 键表为准。** |
| **升级脆弱性** | **高。** 升级会覆盖 glass bundle → loader 消失；需兼容检查 + 备份 + 重注入。追加点（EOF vs 特定锚点）在 minify 后仍相对稳定。 |
| **约束可行性** | **条件可行。** 满足 Glass-only、不改 desktop、不做大 rewrite；若实机确认 glass **不在** checksums → 与 §B 策略兼容。若 **在** checksums → 本候选升格为高风险，按约束应 STOP 或改 B′。 |

#### B′ — rainiva 风格：改 `package.json` main + `vscode-file` 仅重定向 glass（不改原始 glass 字节）

| 项 | 评估 |
| --- | --- |
| **机制** | 新建 `out/cursor-agent-zh-main.js`：patch `registerFileProtocol('vscode-file')`，仅当 basename === `workbench.glass.main.js` 时重定向到旁路 `workbench.glass.main.cursor-agent-zh.js`（内含原内容拷贝+loader，或仅 loader wrapper）。`package.json` main 指向该 bootstrap；**保持 `main.js` 字节不变**（rainiva 不变量）。 |
| **触碰文件** | `package.json`（main 字段）、新建 bootstrap、新建 glass 旁路文件；**不修改**原始 `workbench.glass.main.js` / desktop / checksummed 列表项（若 package.json 不在 checksums）。 |
| **Glass-only?** | **可以。** 限制 `WORKBENCH_REDIRECTS` 仅含 glass。 |
| **Checksum 风险** | 取决于 `package.json` 是否被校验（社区 vibepm/baishi **未**把 package.json 列入常见 workbench checksum 键；**仍需实机确认**）。原始 glass 文件不变 → 即使 glass 日后被加入 checksum 也不触发。 |
| **升级脆弱性** | 中高：升级可能恢复 `package.json` main、删除旁路文件；需 ensure 流程。比直接改 glass 多一层主进程复杂性与白屏风险。 |
| **约束可行性** | **后备方案。** 比 A 更符合 Glass-only；工程成本高于 B；适合「glass 已被 checksum」时的 Escalation，而不是 PoC 第一刀。 |

### C — Cursor 扩展能否触达 Glass runtime

| 项 | 评估 |
| --- | --- |
| **机制** | 安装 VS Code/Cursor 扩展，在 activate 时注入脚本 / webview / 命令。 |
| **触碰文件** | 理想：零改安装目录。 |
| **Glass-only?** | 理论可检测窗口类型；实操未知。 |
| **证据** | LoosePrince **本身是扩展**，但对 Glass UI 仍走 **`workbenchPatcher` 写安装目录 glass/desktop JS**；语言包 `contributes.localizations` 只覆盖 `anysphere.cursor-*` 包元数据，**不**覆盖 Glass React 硬编码文案。说明：**扩展 API 不足以可靠改 Glass chrome DOM**，至少社区没有「纯扩展加载运行时进 Glass」的成功先例。 |
| **Checksum 风险** | 纯扩展：无。但达不到 PoC 目标则无意义。 |
| **升级脆弱性** | 扩展自身可随 marketplace 更新；但若仍依赖补丁则同 B。 |
| **约束可行性** | **证据不足 → 不选为 Phase 1A 实现路径。** 可列为后续 CDP/扩展宿主探测项。 |

### D — 其它独立加载入口

| 子项 | 结论 |
| --- | --- |
| `argv.json` / `locale.json` / 官方语言包 | 只影响 NLS 显示语言，**不**执行任意 JS。 |
| 仅改 `workbench.glass.main.css` | 可做样式（本仓库已有样式实验笔记）；**不能**加载 `bootstrap.js`。 |
| DevTools / CDP 临时 `Runtime.evaluate` | 可验证 PoC，**非**持久注入。 |
| 改 `out/main.js` 字符串 | 触碰主进程；rainiva 明确避免；可能影响 profile；常伴随更高完整性风险 → **不推荐。** |

---

## 3. Recommendation

### 3.1 结论（Phase 1A）

**本机 3.21.18 inspect 后：推荐采纳候选 B；不再因证据不足 STOP。**  
仍须在用户确认后再写入安装目录（备份 + SHA256 + 最小追加）。

拍板排序：

1. **采纳**：**B** — `workbench.glass.main.js` 末尾最小 loader + 同目录 sidecar（PoC 仅 `console.log`）。实机确认 glass **不在** 6 项 checksums 内。  
2. **后备**：**B′** — 仅当日后 glass 被加入 checksum、或 EOF 追加被产品完整性其它机制拦截时。  
3. **否决**：**A**（`workbench.html` 在 checksums 内，且非 Glass-only）。  
4. **暂缓**：**C**（扩展直达 Glass）。

> DevTools 对 `data-cursor-glass-mode` 的确认可与首次 PoC 验证一并完成；不阻塞「键表层面可写 glass」的结论。

### 3.2 若日后采纳 B，精确会改哪些文件

| 文件 | 动作 |
| --- | --- |
| `resources/app/out/vs/workbench/workbench.glass.main.js` | **仅追加**最小 loader（备份后） |
| `resources/app/out/vs/workbench/cursor-agent-zh-bootstrap.js`（建议名） | **新建**；内容为加载/内联 PoC `console.log`，或从固定用户路径读入 |
| `workbench.desktop.main.js` | **不改** |
| `workbench.html` | **不改** |
| `product.json` | **不改**（含不改 checksums） |
| `out/main.js` | **不改** |

### 3.3 哪些通常被 checksum（社区代码引用）

| 来源 | 读 checksum 的方式 | 典型被保护目标 |
| --- | --- | --- |
| **vibepm666** `Cursor_Localization_Tool.py` | `ZhaDao_Workbench_JiaoYan_Jian` / `WORKBENCH_CHECKSUM_KEY_HINTS`；`JiSuan_WenJian_JiaoYan_HaXi` = SHA256→Base64 去 `=` | **`workbench.html`** 相关键；并 `GengXin_JiaoYan_Zhi` **重算全部** `product.json.checksums` |
| **baishi1114010** `src/platform.js` + `src/hash.js` | `hashKey: 'vs/workbench/workbench.desktop.main.js'`；`fixProductHashes` 按 key 后缀匹配 | **desktop.main.js**；**glass / automations 的 `hashKey: null`** |
| **安全分析文**（knostic 等） | 对比 `checksums["vs/workbench/workbench.desktop.main.js"]` | **desktop.main.js** |
| **本仓库** `research/cursor-3.21.18.md` | 笔记 | **`workbench.glass.main.css` 不在 checksum**（仍需实机复核） |

### 3.4 Cursor 更新后注入如何失效

| 失效模式 | 表现 | 缓解（未来脚本，非本阶段） |
| --- | --- | --- |
| 安装覆盖 glass.js | loader 消失；console 无 PoC 日志 | `ensure`/兼容检查后重注入 |
| glass 文件改名/拆分 | 路径找不到 | 参考 svipm `discover.js` 发现 `workbench.*.js` |
| glass 被加入 checksums | 启动「安装已损坏」 | **停止写入**；改 B′ 或 STOP；**不**默认同步 checksum |
| HTML/入口变更 | 若误用 A 则全挂 | 本项目本就不采用 A |
| package.json main 被重置（若用 B′） | 重定向失效 | 检测 main 字段后恢复 bootstrap |
| 完全重装到新目录 | 所有旁路丢失 | 重新定位 `%LOCALAPPDATA%\Programs\cursor\…` |

---

## 4. What we still need from the user’s machine

> 目标机：Windows **LAPTOP-07K1IGOK**。典型根：  
> `%LOCALAPPDATA%\Programs\cursor\resources\app\`  
> （亦见 `Program Files\Cursor`、自定义路径；svipm/baishi/LoosePrince/vibepm 均探测 `LOCALAPPDATA\Programs\cursor`。）  
> 调研时该机 **未连接**，下列项需用户打开本机 Agent / 提供只读拷贝。

### Checklist（只读 inspect — 禁止此时写入）

- [ ] Cursor 版本确认为 **3.21.18**（About / `package.json` version）
- [ ] 记录安装根与 `resources\app` 绝对路径
- [ ] 导出 `product.json` 的 **`checksums` 全部键名**（至少确认是否存在）：
  - [ ] `vs/workbench/workbench.desktop.main.js`（或带 `out/` 前缀变体）
  - [ ] 任何含 `workbench.glass` 的键
  - [ ] 任何含 `workbench.html` 的键
  - [ ] 任何含 `package.json` / `main.js` 的键
- [ ] 文件存在性：
  - [ ] `out\vs\workbench\workbench.glass.main.js`
  - [ ] `out\vs\workbench\workbench.glass.main.css`
  - [ ] `out\vs\workbench\workbench.desktop.main.js`
  - [ ] `out\vs\code\electron-sandbox\workbench\workbench.html`
  - [ ] 是否存在 `*glass*.html` / `workbench.glass.html` 等
- [ ] Agents Window 打开后 DevTools：
  - [ ] 确认主文档 URL / 加载的 script 是否为 `workbench.glass.main.js`
  - [ ] `document.body` 是否有 `data-cursor-glass-mode="true"`（或其它 Glass 标志）
  - [ ] 扩展是否在该窗口 `vscode.extensions.all` 可见（候选 C）
- [ ] 对 `workbench.glass.main.js` 计算与 Cursor 相同的 checksum 算法结果，与 `product.json` 比对（确认「未列入」≠「未校验」的边角）
- [ ] 写权限：当前用户能否写 `out\vs\workbench\`（非 Program Files 锁定）

### Windows 路径速查

```text
%LOCALAPPDATA%\Programs\cursor\Cursor.exe
%LOCALAPPDATA%\Programs\cursor\resources\app\package.json
%LOCALAPPDATA%\Programs\cursor\resources\app\product.json
%LOCALAPPDATA%\Programs\cursor\resources\app\out\main.js
%LOCALAPPDATA%\Programs\cursor\resources\app\out\vs\workbench\workbench.glass.main.js
%LOCALAPPDATA%\Programs\cursor\resources\app\out\vs\workbench\workbench.desktop.main.js
%LOCALAPPDATA%\Programs\cursor\resources\app\out\vs\code\electron-sandbox\workbench\workbench.html
```

---


---

## 4b. 本机实机 inspect 结果（LAPTOP-07K1IGOK，2026-09-24）

> 只读核对；**未写入**任何 Cursor 安装文件。

### 安装定位

| 项 | 值 |
| --- | --- |
| `cursor.cmd` | `D:\下载应用\cursor\resources\app\bin\cursor.cmd` |
| `resources\app` | `D:\下载应用\cursor\resources\app` |
| `package.json` version / main | **3.21.18** / `./out/main.js` |
| `product.json` quality | `stable` |
| `%LOCALAPPDATA%\Programs\cursor` | **不存在**（本机为自定义目录安装） |

### `product.json.checksums`（完整 6 键）

| 键 | 在本机？ |
| --- | --- |
| `vs/base/parts/sandbox/electron-sandbox/preload.js` | 是 |
| `vs/workbench/workbench.desktop.main.js` | 是 |
| `vs/workbench/workbench.desktop.main.css` | 是 |
| `vs/workbench/api/node/extensionHostProcess.js` | 是 |
| `vs/code/electron-sandbox/workbench/workbench.html` | 是 |
| `vs/code/electron-sandbox/workbench/workbench.js` | 是 |
| 任何含 `workbench.glass` 的键 | **否** |
| `package.json` / `out/main.js` | **否** |

### 关键文件（相对 `resources\app`）

| 相对路径 | 存在 | 备注 |
| --- | --- | --- |
| `out\vs\workbench\workbench.glass.main.js` | 是 | ~44.9 MB；EOF 为原厂 sourcemap/debugId 注释；**无** `cursor-agent-zh` 标记 |
| `out\vs\workbench\workbench.glass.main.css` | 是 | 另有 `workbench.glass.main.css.user-message-backup`；当前 CSS SHA256 ≠ 备份（CSS 侧已有既有改动） |
| `out\vs\workbench\workbench.desktop.main.js` | 是 | **在** checksums |
| `out\vs\code\electron-sandbox\workbench\workbench.html` | 是 | **在** checksums；未发现独立 `*glass*.html` |
| `out\vs\glass\browser\media\cursor-splash-logo-glass.png` | 是 | 资源图，非入口 |

### 加载线索（只读字符串检索）

- `out\main.js`：`glass-dev-bundle-stamp` 将 `vpe` 设为 `out/vs/workbench/workbench.glass.main.js`；窗口类型 `"glass"` 显示名为 `"Agents Window"`。
- `out\vs\code\electron-sandbox\workbench\workbench.js`（及 extensionMonitor / processExplorer）：存在对 `vs/workbench/workbench.glass.main` 的专用加载分支。
- 目录内另见 `replaceCode.bat` / `restoreCode.bat`（来源未查；与本 PoC 无关，注入前勿误用）。

### Checklist 勾选（相对 §4）

- [x] 版本 3.21.18  
- [x] 安装根与 `resources\app` 绝对路径  
- [x] `checksums` 全键导出；**无** glass 键；**有** workbench.html；**无** package.json/main.js  
- [x] glass/desktop JS、glass CSS、workbench.html 存在；无独立 glass HTML  
- [ ] Agents Window DevTools（主文档 URL / `data-cursor-glass-mode` / 扩展可见性）— **仍待用户在 Agent 窗口打开 DevTools 确认**  
- [x] glass.js 未列入 checksums（键表层面）  
- [x] 安装在 `D:\下载应用\…`（非 Program Files），当前用户具备写该目录的预期条件（实际写入前再试）

### 门禁对照（§6）

1. §4 关键项完成；DevTools 项可在注入后验证。  
2. glass.js **存在**且 **不在** checksums → **满足**。  
3. 推荐实现路径升级为：**采纳 B**（不再 STOP）；B′ 仅作后备。  
4–5. 实现时仍须：备份 + SHA256 记录、sidecar 仅 `console.log`、不改 desktop/HTML/product.json。


## 5. 源码引用索引（本报告直接阅读）

| 仓库 | 路径 | 用途 |
| --- | --- | --- |
| rainiva/Cursor-zh | `AGENTS.md`；`scripts/tool/builder/bootstrap.js`；`scripts/lib/patcher/workbench-bundle-registry.js`；`scripts/lib/install/managed-install-artifacts.js` | glass 重定向、package.json main、不改 main.js |
| svipm/cursor-i18n-zh | `src/config.js`；`src/discover.js`；`src/locate.js` | CODE_TARGETS；Windows 路径探测 |
| baishi1114010/cursor-i18n-zh | `src/platform.js`；`src/hash.js` | TARGET_FILES；**glass hashKey: null** |
| LoosePrince/cursor-zh-cn-pack | `src/workbenchPatcher.ts`；`src/cursorLocator.ts`；`package.json` | glass target；扩展仍写安装目录 |
| vibepm666/cursor-localization-zh | `Cursor_Localization_Tool.py` | **desktop-only** `workbench.html` 注入 + checksum sync |
| Web | cursor.com Agents Window 文档；论坛 glass 栈 | 确认 Agent Window ≡ glass bundle |

---

## 6. Phase 1A 门禁（实现前）

仅当全部为真，才允许开始「最小 loader」实现草稿（仍先备份、仍先 dry-run）：

1. 本机 checklist §4 完成；  
2. `workbench.glass.main.js` **存在**且 **不在** `product.json.checksums`；  
3. 选定 B 或 B′ 并写下精确字节级补丁方案；  
4. `runtime/bootstrap.js` PoC 仅含约定 `console.log`；  
5. 确认不会改 desktop / HTML / product.json。

否则维持 **STOP**。

---

## 7. Phase 1A 注入记录（本机，2026-09-24）

> **2026-09-24 Phase 1B.1：** 经 restore + 重新 deploy 后，glass 现含 runtime guard；当前注入后 SHA 见 `research/phase-1b1-deploy.md`（不再是下表「注入后 SHA256」）。原始 backup SHA **不变**。


| 项 | 值 |
| --- | --- |
| 安装根 | `D:\下载应用\cursor\resources\app` |
| 目标 | `out\vs\workbench\workbench.glass.main.js` |
| 备份 | `out\vs\workbench\workbench.glass.main.js.cursor-agent-zh-backup` |
| 注入前 SHA256 | `F43F8393D53FEBD5DB82DA6EECDE39BF4D1878DC5D811D557EFA91279B39B4BC` |
| 注入后 SHA256 | `6E53DD7E7AD24510F23DF7D775AD37EC5849284FC3D34D2CA78B165DF7DEE9AF` |
| 长度 | 44976559 → 44978162（+1603） |
| Sidecar | `out\vs\workbench\cursor-agent-zh-bootstrap.js` → `console.log("[cursor-agent-zh] runtime loaded");` |
| Loader 标记 | `/* cursor-agent-zh-phase1a-loader */`（EOF 追加） |
| 未改动 | `workbench.desktop.main.js`、`workbench.html`、`product.json`、`out/main.js` |

### 回滚

1. 用备份覆盖 glass：  
   `workbench.glass.main.js.cursor-agent-zh-backup` → `workbench.glass.main.js`
2. 删除 `cursor-agent-zh-bootstrap.js`（可选）
3. 重启 Cursor / 重开 Agents Window

### 验证步骤

1. 完全重开 **Agents Window**（或重启 Cursor），使新 glass bundle 被加载。  
2. Agents Window → DevTools → Console。  
3. 应看到：`[cursor-agent-zh] runtime loaded`（以及 loader 的 `sidecar script loaded`）。  
4. 普通 Editor 窗口 Console **不应**出现该日志。

