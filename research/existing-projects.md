# 既有 Cursor 汉化项目深度分析

> 基于各仓库 **源代码**（`get_git_tree` / `get_file_contents` / `search_code` / raw 文件）分析，而非仅 README。  
> 分析日期：2026-09-23（Asia/Shanghai）。  
> 本仓库目标：仅 Agent Window / Glass、运行时 DOM 翻译优先、**当前阶段未实现**运行时翻译器。

## 许可与复用声明（必读）

- 我们可复用各仓库的 **思路 / 架构 / 公开文档中的设计讨论**。
- **日后若复制代码片段**，须先核对该仓库的 **License**（见各节 License 小节与下表）；许可证未声明或未澄清前，**不要复制其代码**。
- 本文件中的「可复用思路」指设计层面；不等于已获准抄代码。

| 仓库 | License（调研记录） |
| --- | --- |
| vibepm666/cursor-localization-zh | **未声明许可证（GitHub license=null；根目录无 LICENSE）** — 澄清前勿复制代码 |
| rainiva/Cursor-zh | MIT（Copyright 2026 lonr） |
| svipm/cursor-i18n-zh | MIT（Copyright 2026 svipm） |
| baishi1114010/cursor-i18n-zh | MIT（Copyright 2026 双玉 张） |
| LoosePrince/cursor-zh-cn-pack | MIT（Copyright 2026 LoosePrince） |

---

## 源码引用索引（分析所依据的实际路径）

| 仓库 | 关键源码路径 |
| --- | --- |
| vibepm666/cursor-localization-zh | `Cursor_Localization_Tool.py`; `localization/runtime/{bootstrap,engine,helpers,init,keywords,market}.js`; `localization/{Core,Pattern,Partial_Fragments,Dropdown_Fragments,Plugin_Marketplace,Ad_Popup}_Dictionary.json`（及 Fragments 变体） |
| rainiva/Cursor-zh | `scripts/cursor-zh-tool.js`; `scripts/lib/runtime/text-translator-template.js`; `scripts/lib/runtime/template/class-core.js`; `scripts/lib/patcher/workbench-bundles.js`; `translations/**`; Glass 相关测试如 `scripts/tests/lib/runtime-selector-glass.test.js` |
| svipm/cursor-i18n-zh | `src/{cli,engine,backup,nls,config,locate}.js`; `dict/00-common.json`…`50-tray.json`; `dict/nls.json`; `compat/cursor-stable.json`; `desktop-sample/` |
| baishi1114010/cursor-i18n-zh | `index.js`; `src/{translate,tricky,dict,dict-automations,dict-appearance,dict-settings-pages,backup,hash,platform}.js` |
| LoosePrince/cursor-zh-cn-pack | `src/{extension,panel,workbenchPatcher,orderedPatchEngine,nlsMessagePatcher,cursorLocator,braceBalance}.ts`; `data/workbench-patches.json`; `data/workbench-patch-runtime-policy.json`; `translations/extensions/anysphere.cursor-*.i18n.json` |

## 1. vibepm666/cursor-localization-zh

### License

**未声明许可证（GitHub license=null；根目录无 LICENSE）。**  
警告：在许可证澄清前，**不要复制该仓库代码**；仅可参考公开可见的架构描述与行为观察。

### 架构要点（源码）

- 安装器：`Cursor_Localization_Tool.py` — 定位 Cursor `resources/app`，备份并注入 `workbench.html`，同步 `product.json` checksum（含 `workbench.html` 相关键）。
- 运行时：`localization/runtime/` 下 `bootstrap.js` / `engine.js` / `helpers.js` / `init.js` / `keywords.js` / `market.js`，由 Python 拼装为注入脚本。
- 词典：`localization/Core_Dictionary.json`、`Pattern_Dictionary.json`、`Partial_Fragments.json`、`Dropdown_Fragments.json`、`Plugin_Marketplace_Dictionary.json`、`Ad_Popup_Dictionary.json` 等分层 JSON。
- 另附 VS Code 官方语言包 `VSCode-language-pack-zh-hans.vsix`，形成「官方 NLS + 注入脚本」双层方案。

### 翻译如何加载

注入标记 `<!-- CURSOR_LOCALIZATION_INJECTION -->` + `<script src="./Cursor_Localization.js">` 写入 `workbench.html`；启动后浏览器侧执行词典与 DOM 替换。

### MutationObserver

**是。** `localization/runtime/init.js` 中 `ChuShiHua()` 对 `document.documentElement` 建立 `MutationObserver`（`childList` + `subtree`），并挂载设置下拉、Monaco hover、webview、菜单等专项观察。

### 动态 DOM 识别

- 全局队列修正 + 作用域选择器（设置页、Agent/Composer、市场、弹窗等）。
- `helpers.js` 提供 `FanYi_Scope_*`、`KeYi_AnQuan_GaiXie_WenBen`、属性 `title`/`aria-label` 同步翻译。

### 如何避免误译代码 / 聊天正文 / 协议字段

- 明确跳过 `.monaco-editor .view-lines`、`.monaco-editor`、部分 `webview`、菜单栏等（`YingGai_TiaoGuo_BianJiQi_YuanSu` / `YingGai_TiaoGuo_FanYi_ZiShu_YuanSu`）。
- 叶节点文本长度上限、子元素启发式，降低改写复合节点风险。
- **并非**按 `data-message-kind` 排除聊天气泡；对 Composer/Agent 区域仍有大量 UI 文案替换，存在误伤聊天正文的风险面。

### 危险短词（Model / Agent / Tools）

`keywords.js` 主要是**场景门闩关键词表**（用于决定跑哪些补丁），不是严格的「短词仅 DOM 上下文替换」策略。短词误替换风险依赖全句词典与补丁函数设计，防护弱于 baishi / LoosePrince 的上下文绑定方案。

### 词典组织

多 JSON 分区 + 运行时合并；支持正则 `Pattern_Dictionary` 与片段替换。

### Cursor 更新处理

更新后需重跑启动脚本；`--fix-checksum` / 修复校验 bat/sh 处理「安装损坏」。无自动兼容流水线。

### 备份与还原

备份 `workbench.html`、`product.json`；取消汉化脚本按备份恢复。语言包可保留。

### 是否修改桌面 Workbench

**是。** 主注入点是桌面 `workbench.html`，覆盖整个 Electron 工作台 UI（含 Agent 侧栏等出现在同一 DOM 的区域）。

### 能否只针对 Glass / Agent Window

**基本不能。** 未单独以 `workbench.glass.main.js` 为唯一目标；Glass 相关 class（如 empty-state tip）在引擎中有特殊处理，但仍是桌面注入全局运行时。

### 因版本变化可能过时之处

Workbench HTML 路径、checksum 键名、CSS class、设置页结构变化会导致补丁失效；大词典维护成本高。

### 可复用思路

- MutationObserver + 安全改写封装。
- 跳过 Monaco/终端的选择器清单。
- **了解**「注入后同步 `product.json` checksum」这一社区常见技术（研究知识）；**本项目不将其作为偏好/默认策略**（见 `docs/architecture.md` §B）。
- 词典与引擎分包。

---

## 2. rainiva/Cursor-zh

### License

**MIT**（Copyright 2026 lonr）。复制代码前仍请核对仓库内 LICENSE 全文与版权声明。

### 架构要点（源码）

- Windows 向、Agent 友好的安装工具链：`scripts/cursor-zh-tool.js`、`scripts/lib/`（mapping / patcher / runtime / install）、`translations/` 多层映射。
- **静态**：生成 `workbench.desktop.main_translated.js` 与 `workbench.glass.main_translated.js`，并用 bootstrap 在 `package.json` main 层把 `vscode-file` 重定向到译后 bundle；**保持原始 `main.js` 字节不变**（避免 profile 路径漂移）。
- **运行时**：注入 DOM 翻译器（`scripts/lib/runtime/text-translator-template.js` 等），默认 `performance` 模式（作用域观察、无全局轮询）。

### 翻译如何加载

安装时备份并写入译后 bundle + NLS/`package.nls`；运行时在 workbench 内执行 `TextTranslator`。

### MutationObserver

**是。** 运行时模板构建 `TextTranslator`，对作用域根做 mutation 批处理 / idle 队列；另有 discovery observer。测试中大量 `runtime-*-glass.test.js` 证明 Glass 是一等公民。

### 动态 DOM 识别

- `observeScopeSelectors` 限定设置、市场、Glass 聊天工具行等。
- surface / shard（`runtime-shards`、`surface-registry`）按界面分片加载映射，降低全树扫描成本。

### 如何避免误译

模板内默认：

```text
skipSelector = "pre, code, .monaco-editor, .xterm, .cm-editor, .cm-content, .view-lines"
```

另有 product tip 规范化、短词 exact fallback 开关、按 surface 的 `forceRuntime` 治理。映射治理文档明确禁止无作用域的全局短词（如单独的 `Mode`/`Agent`）。

### 危险短词

优先 **完整串 + 作用域/anchor**；模型档位等用专用函数（如 `__cursorZhTranslateModelPickerDisplayName`）做受控短词映射。

### 词典组织

`translations/base` + `overlay` + `patches/cursor-*` + meta（surfaces、governance）；静态与运行时映射分流。

### Cursor 更新处理

`ensure` 检测漂移后重建；`harvest` 对比未映射文案；`doctor`/`verify` 只读诊断。有较完整的更新韧性设计文档。

### 备份与还原

工作区 `state/backups/` + manifest；卸载按清单回滚，强调无备份则硬失败。

### 是否修改桌面 Workbench

**是**（desktop + glass 双 bundle）。

### 能否只针对 Glass / Agent Window

**具备 Glass 专用产物与测试**，但产品定位仍是整窗增强；可裁剪为「仅构建/注入 glass 译包」，工程上可行，当前默认两者都做。

### 过时风险

锚点、bundle 文件名、surface 选择器随 Cursor 大版本失效；静态替换命中率下降时依赖运行时补洞。

### 可复用思路

- **desktop / glass 分流**。
- 运行时 skipSelector 与 scoped MutationObserver。
- 短词禁止裸全局替换的治理规则。
- 备份 manifest + ensure/verify 流程。
- 保持 `main.js` 不变的安全不变量。

---

## 3. svipm/cursor-i18n-zh

### License

**MIT**（Copyright 2026 svipm）。复制代码前仍请核对仓库内 LICENSE 全文与版权声明。

### 架构要点（源码）

- Node CLI：`src/cli.js`、`src/engine.js`（acorn tokenizer 字符串字面量替换）、`src/nls.js`（官方语言包 + 自有 nls 词典）、`src/backup.js`、`src/locate.js`。
- 词典：`dict/00-common.json` … `50-tray.json`、`dict/nls.json`。
- 桌面：`desktop-sample/` Tauri「汉化工作台」（备份 UI、兼容流水线、扩展管理等），体积远大于纯 CLI。
- `src/config.js` 明确目标：

```js
'out/vs/workbench/workbench.glass.main.js',
'out/vs/workbench/workbench.desktop.main.js',
'out/vs/workbench/workbench.anysphere-ui-automations.js',
```

并自动发现 `workbench.*.js`（体积下限过滤）。

### 翻译如何加载

安装前强制备份 → 对 JS bundle 做上下文敏感的静态字符串替换（`lit` / `prop` / `html-text` / `html-attr`）→ 写回磁盘；同时可打 NLS 层。

### MutationObserver

**否**（核心汉化路径为静态补丁，不是 DOM 运行时）。

### 动态 DOM 识别

不适用；动态 UI 依赖静态包内字符串是否命中。新动态文案需更新词典后重装。

### 如何避免误译

- `engine.js` 用 acorn 分词，按属性名/HTML 属性上下文分桶，避免裸全局替换。
- 单词语默认不进 `lit` 桶（`defaultCtx`：多词才含 `lit`）。
- NLS 校验 `{0}` 占位符一致性；备份前检测「已汉化内容」防止污染原始备份。

### 危险短词

通过 **属性上下文桶** 与词条长度策略降低风险；仍是改 bundle，协议/内部字符串若出现在可替换上下文仍可能被改。

### 词典组织

按界面域编号的 JSON + 独立 nls.json；安装时合并。

### Cursor 更新处理

`compat/cursor-stable.json`、`scripts/cursor-compat.js`、GitHub `cursor-compat.yml` 周期性拉官方包做结构/补丁预检；结构异常则停止写入。

### 备份与还原

`backup/<版本>/files/...` + `meta.json`（version/commit/sha256）；版本不匹配禁止恢复；强调「未备份禁止安装」。

### 是否修改桌面 Workbench

**是**（desktop + glass + automations + 发现的其它 workbench 包）。

### 能否只针对 Glass / Agent Window

**可以裁剪 CODE_TARGETS 仅保留 glass**，架构已把 glass 列为独立目标；当前产品默认全量。

### 过时风险

压缩后的属性名/字符串形态变化会导致命中率下降；依赖兼容流水线与词典更新。

### 可复用思路

- Glass 与 desktop 目标文件清单。
- 强制备份门禁与写前完整性检测（了解社区 checksum/已汉化检测做法；**本项目不以改写 checksum 为默认策略**）。
- 属性上下文替换（相对裸 `replaceAll`）。
- 升级后「先兼容检查再写入」。

---

## 4. baishi1114010/cursor-i18n-zh

### License

**MIT**（Copyright 2026 双玉 张）。复制代码前仍请核对仓库内 LICENSE 全文与版权声明。

### 架构要点（源码）

- 零依赖 Node CLI：`index.js` + `src/translate.js` / `tricky.js` / `dict*.js` / `backup.js` / `hash.js` / `platform.js`。
- `platform.js` 目标文件包含：

```text
out/vs/workbench/workbench.desktop.main.js
out/vs/workbench/workbench.glass.main.js
out/vs/workbench/workbench.anysphere-ui-automations.js
```

并修复 `product.json` hash；macOS 清隔离属性与 ad-hoc 重签。

### 翻译如何加载

对目标 JS 做正则/字典静态替换后写回。

### MutationObserver

**否。**

### 动态 DOM 识别

无；完全依赖打包串。

### 如何避免误译

`translate.js` 三类策略：

1. **安全长句** `safeGlobalDict`：仅在引号内替换（`(["'\`])(long|phrases)\1`）。
2. **危险短词** `riskyShortWords`：仅在 `label|title|description|...` 等 UI 属性、部分 JSX 参数、`>text<` HTML 文本上下文替换。
3. **tricky.js**：模板字符串、Unicode 引号、三元表达式等特殊形态。

聊天正文/代码一般不在这些 UI 属性上下文中，误伤面小于裸全局替换；但仍是改 bundle，无法按 `data-message-kind` 运行时排除。

### 危险短词（Model / Agent / Tools）

`dict.js` 中 `riskyShortWords` 显式收录 `Agent`、`Agents`、`Models`、`Tools`、`Chat`、`Plan`、`Build` 等，**强制走属性上下文**，是本仓库最值得直接借鉴的短词策略之一。

### 词典组织

`dict.js` + `dict-automations.js` + `dict-appearance.js` + `dict-settings-pages.js`；安全表与危险表分离。

### Cursor 更新处理

大版本后需重跑 `localize`；无自动兼容 CI（相对 svipm/rainiva 更轻量）。

### 备份与还原

`~/.cursor-i18n-zh/backups/<版本>/`（用户目录，避开 .app 内 EPERM）+ `state.json`；`restore` 命令还原。

### 是否修改桌面 Workbench

**是**（desktop + glass + automations）。

### 能否只针对 Glass / Agent Window

**可改 TARGET_FILES 仅保留 glass**；默认全量。

### 过时风险

压缩标识符、文案微调导致 safe/tricky 规则失效；Settings 截图驱动的补丁需持续维护（见 `docs/UPDATE-v1.*.md`）。

### 可复用思路

- **safe 长句 vs risky 短词** 分流。
- Glass 明确列入目标。
- 用户目录备份；社区常见的 product.json hash 修复仅作研究对照，**非本项目默认路径**。
- 审计脚本 `scripts/audit.js` 做覆盖率自检。

---

## 5. LoosePrince/cursor-zh-cn-pack

### License

**MIT**（Copyright 2026 LoosePrince）。复制代码前仍请核对仓库内 LICENSE 全文与版权声明。

### 架构要点（源码）

- VS Code/Cursor **扩展**（语言包 + 「汉化管理器」UI）：`src/extension.ts`、`src/panel.ts`、`src/workbenchPatcher.ts`、`src/orderedPatchEngine.ts`、`src/nlsMessagePatcher.ts`。
- 数据：`data/workbench-patches.json`（大规模替换表）、`data/workbench-patch-runtime-policy.json`（安全前缀/受保护 needle/命中上限）、`data/nls-*.json`、`translations/extensions/anysphere.cursor-*.i18n.json`。
- 补丁目标：`workbench.desktop.main.js` + **若存在则** `workbench.glass.main.js`；NLS `nls.messages.json`。

### 翻译如何加载

用户在命令面板打开管理器 →「应用汉化补丁」→ 有序字符串替换写入安装目录；扩展 NLS 走标准 Language Pack，不改安装目录。

### MutationObserver

**否**（安装时静态补丁；非 DOM 运行时翻译器）。

### 动态 DOM 识别

无运行时 DOM 层；动态文案依赖补丁表是否覆盖 soft-coded 字符串。

### 如何避免误译

- 规则带 **模块上下文前缀**（`label:`、`settings.*` 等），不做裸词全局替换（README/策略说明）。
- `workbench-patch-runtime-policy.json`：`safeSourcePrefixes`、`guardedRuntimeNeedles`（如 storage 错误文案）、`maxRuntimePatchRuleHits` / `maxRuntimePatchChangedLines`。
- `braceBalance.ts`：括号结构一致性校验，降低写坏 bundle 概率。

### 危险短词

依靠上下文前缀与策略文件；比全局词典更谨慎，但表项需随压缩符号分别维护 desktop/glass。

### 词典组织

Workbench 补丁表 + NLS 补丁 + 扩展 i18n JSON；扫描脚本生成 staging 候选。

### Cursor 更新处理

升级后需重新扫描应用；glass 缺失的旧版会跳过 glass。压缩符号桌面/glass 不一致需分别维护。

### 备份与还原

同目录带时间戳备份：`workbench.desktop.main.js.cursor-zh-cn-pack.*`、`workbench.glass.main.js.cursor-zh-cn-pack.*`；管理器支持恢复/卸载补丁；写前算 SHA-256。

### 是否修改桌面 Workbench

**是**（desktop + 可选 glass + nls.messages）。

### 能否只针对 Glass / Agent Window

**可以只应用 glass 目标**（代码已分 `desktop` | `glass` target id）；产品默认两者。扩展语言包层仍偏全局。

### 过时风险

`workbench-patches.json` 对具体 bundle 形态耦合极强；Cursor 升级后大量 source 未命中 → partial/unknown。

### 可复用思路

- **显式 Glass target** 与独立备份前缀。
- 运行时安全策略（前缀白名单、受保护 needle、变更行数上限）。
- 括号平衡与命中数门禁。
- 管理器式备份/恢复 UX。

---

## 对比表

| 维度 | vibepm666 | rainiva | svipm | baishi1114010 | LoosePrince |
| --- | --- | --- | --- | --- | --- |
| License | 未声明（null / 无 LICENSE） | MIT | MIT | MIT | MIT |
| 主机制 | HTML 注入 + DOM 运行时 | 静态译包 + DOM 运行时 | 静态 AST/上下文替换 | 静态字典/正则替换 | 扩展 + 有序静态补丁 |
| MutationObserver | 有 | 有 | 无 | 无 | 无 |
| 改 desktop workbench | 是 | 是 | 是 | 是 | 是 |
| 明确 Glass 目标文件 | 弱（同页 DOM） | 强（独立 glass 译包） | 强（CODE_TARGETS） | 强（TARGET_FILES） | 强（glass target） |
| 可仅 Glass/Agent | 难 | 可裁剪 | 可裁剪 | 可裁剪 | 可裁剪 |
| 短词防护 | 弱-中 | 中-强（治理+作用域） | 中（上下文桶） | 强（risky 表） | 中-强（前缀+策略） |
| 跳过编辑器/代码 | Monaco 选择器 | skipSelector 完善 | 不改 DOM | 不改 DOM | 不改 DOM |
| 备份还原 | 有 | 很强 | 很强 | 有（用户目录） | 有（管理器） |
| 更新策略 | 重跑脚本 | ensure/harvest | compat CI | 手动重跑 | 重扫应用 |
| 与「仅 Agent Window」契合度 | 低 | 中高 | 中高 | 中高 | 中高 |

---

## 对本项目（cursor-agent-zh）的建议 Takeaways

1. **优先运行时 DOM 翻译（未来实现）**，借鉴 vibepm666/rainiva 的 MutationObserver，但 **作用域必须锁在 Glass / Agent Window**（检测 `workbench.glass` 窗口、`body[data-cursor-glass-mode="true"]` 等），避免 vibepm666 式全局桌面注入。复制 vibepm 代码前须先澄清其 License。
2. **词典与逻辑分离**，并预留 `exact` / `contextual` / `dynamic` 分层（见 `docs/architecture.md` §C）；长句全串匹配；`Agent`/`Model`/`Tools`/`Keep`/`Undo` 等短词必须 **DOM/属性上下文**（直接借鉴 baishi `riskyShortWords` 思想）。
3. **永不翻译（Invariants）**：`data-message-kind` ∈ {human, assistant, tool} 的消息正文、`pre/code`、Monaco、xterm、文件路径、工具参数、协议字段、模型名、命令、URL（rainiva skipSelector + 本仓库语义属性 + architecture §A）。
4. **静态改 bundle 仅作可选后备**（若做，优先仅 glass），Phase 0/1 PoC 不实现。若将来考虑，应学习 svipm/LoosePrince 的 **备份门禁、括号/命中上限、写前校验** 等安全工程；**不要把「同步/改写 product.json checksum」当作本项目的默认或偏好策略**（checksum sync 仅作研究知识，见 architecture §B）。
5. **升级流程**：先兼容检查（glass 文件是否存在、目标是否被 checksum、选择器探针）→ 再备份 → 再注入；禁止无备份写入；遇 checksummed 目标按 architecture §B / `docs/compatibility.md` 处理（优先换路径，而非改 checksum）。
6. **不要承诺「完整汉化」**；本项目只做 Agent Window 轻量 UI + 样式，实验性，锚定 3.21.18；Phase 1 须先过 PoC 门禁再谈 Settings。
7. **当前不实现运行时翻译器**；仅落地词典雏形、样式、文档与研究结论。Phase 1 第一项任务是注入加载研究（architecture §D）。
