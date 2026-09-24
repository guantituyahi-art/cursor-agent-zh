# scripts/

## Phase 1B.1 — Glass loader deploy / restore

| 脚本 | 用途 |
| --- | --- |
| `deploy-glass-loader.js` | 幂等部署 Glass EOF loader + 从 SoT 复制 sidecar |
| `restore-glass-loader.js` | 用已验证原始 backup 恢复 glass，并删除 sidecar |
| `lib/glass-loader-shared.js` | 共享常量与检查（marker、checksum 门禁、备份规则） |
| `test-runtime-safety.js` | Phase 1C：`shouldSkipNode` 等纯函数分类测试（无 jsdom） |

### Source of Truth

- 唯一源码：`runtime/bootstrap.js`
- 安装目录 `cursor-agent-zh-bootstrap.js`：**仅部署产物**（由 deploy 复制生成）

### 用法

在能访问 Cursor 安装目录的机器上：

```bash
# 可选：显式指定 resources/app
export CURSOR_APP="D:/下载应用/cursor/resources/app"

node scripts/deploy-glass-loader.js --repo /path/to/cursor-agent-zh
node scripts/restore-glass-loader.js --repo /path/to/cursor-agent-zh
```

`--app` / 环境变量 `CURSOR_APP` 指向 `resources/app`。未指定时尝试解析 PATH 上的 `cursor`。

### 硬约束

- glass 若出现在 `product.json.checksums` → **立即停止**，不改任何文件，不改 checksum。
- 已存在 `workbench.glass.main.js.cursor-agent-zh-backup` 时：**绝不覆盖**；须无 marker 且 SHA256 等于 Phase 1A 原始记录。
- 不修改 `workbench.desktop.main.js`、`product.json`。

详见 `research/phase-1b1-deploy.md`。
