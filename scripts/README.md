# scripts/

## Cursor 3.22.7 部署与还原

当前只支持 Cursor 3.22.7、commit 37076c6c3f9e253c0fa2305197e45befd13a2260，以及原始 Glass SHA256 721501D167E1EA82E51F33346C924448A34360E857B1E6D3972DC677589AA5A0。其它版本或哈希在写入安装目录前停止。

运行前须完全退出 Cursor。部署只改 Glass bundle 与由仓库生成的 sidecar；不会改 product.json 或普通编辑器 bundle。

    node scripts/deploy-glass-loader.js --app D:/下载应用/cursor/resources/app --repo D:/CodexProjects/cursor-agent-zh
    node scripts/restore-glass-loader.js --app D:/下载应用/cursor/resources/app

首次部署会在安装目录外创建原始备份及 manifest：%LOCALAPPDATA%/cursor-agent-zh/backups/<version>/<commit>/。manifest 记录 version、commit、原始 SHA256、字节数和创建时间。已存在的备份只校验、不覆盖；还原必须使用同版本同 commit 的有效备份，并拒绝未知改动的 Glass 文件。

部署在写入 sidecar 前检查版本与 commit、package/product 版本一致性、checksum 列表、Glass 原始哈希或已知 loader 产物，以及备份完整性。sidecar 由 runtime/bootstrap.js 和 translations/zh-CN.json 生成。--reinstall-loader 从已验证备份重新组合 loader；--clear-code-cache 会在部署后清除当前 commit 的 V8 JS 缓存，仅在出现旧缓存问题且 Cursor 已退出时使用。

## 测试

    node scripts/test-runtime-safety.js
    node scripts/test-exact-translation.js
    node scripts/test-mutation-exact.js
    node scripts/test-contextual-sidebar-search.js
    node scripts/test-loader-placement.js
    node scripts/test-versioned-backup.js

版本化备份测试只在自有临时目录内创建 fixture 并在结束后清理。仓库测试不能替代 3.22.7 的真实 DOM 与 Agents Window 验收。
