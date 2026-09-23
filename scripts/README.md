# scripts/

本目录为**未来**运维/注入脚本占位。

## 当前状态

以下脚本均 **尚未实现**：

| 规划脚本 | 用途 |
| --- | --- |
| 备份 / 还原 | 修改 Cursor 安装目录文件前备份，并支持还原 |
| 兼容性检查 | 校验 Cursor 版本、Glass 资源、checksum、关键选择器 |
| CSS 注入 | 将 `styles/user-message.css` 等安全注入 Glass / Agent Window |

请勿在本阶段向 Cursor 安装目录写入任何文件。修改前必须先完成备份与兼容检查（见 `docs/compatibility.md`）。
