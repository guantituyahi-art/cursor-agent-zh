# runtime/

## Source of Truth（双源）

| SoT | 路径 | 职责 |
| --- | --- | --- |
| Runtime 逻辑 | **`bootstrap.js`** | Glass 门禁、Invariants、exact 应用 |
| 词典 | **`translations/zh-CN.json`** | 分层 exact / contextual / dynamic |

安装目录 `cursor-agent-zh-bootstrap.js` 由 `scripts/deploy-glass-loader.js` **生成**（注入 `__cursorAgentZhTranslations` + 拼接 bootstrap）。**不要**手改安装产物；**不要**在 bootstrap 内维护第二份词典。

## Phase 2E.1（当前代码；Settings 十四项导航已实机验收）

Exact PoC + MutationObserver（**仅**三个完整串；Glass DOM 校准）。初始扫描保留，observer 增量补充：

- `New Chat` → `新建聊天`
- `New Project` → `新建项目`
- `Automations` → `自动化`

管线：Glass → shouldSkipNode → exact full-string → contextual → nodeValue。侧栏 Search 沿用 data-sidebar-menu-button；Appearance 与 General 的设置行使用各自页面标记和标签/说明容器；Settings 导航另要求 glass-settings-sidebar 与 ui-sidebar-menu-button-label。初始扫描后，一个 childList MutationObserver 处理新增节点；thinking kind 与 ai role 也属于消息排除范围。

测试：

- `node scripts/test-runtime-safety.js`
- `node scripts/test-exact-translation.js`
- `node scripts/test-mutation-exact.js`
- node scripts/test-appearance-settings-labels.js
- node scripts/test-appearance-settings-descriptions.js
- node scripts/test-general-settings.js
- node scripts/test-settings-navigation.js

说明：`research/phase-1d2a-mutation-exact.md`（1D.1 记录见 `phase-1d1-exact-translation.md`）

## 尚未实现

characterData observer / dynamic / 其它 Settings 文案 / deferred 种子（原 New Agent / Show Chat History / Review changes / Keep / Undo / …）。
