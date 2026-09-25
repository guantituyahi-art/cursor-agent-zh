# 兼容性检查清单

> 已验收旧基线：**Cursor 3.21.18**；当前适配目标：**3.22.7**。升级或其他版本安装前，应先完成本清单。
> deploy/restore 已实现版本与 commit 门禁；DOM 语义仍须在目标版本人工核实。
> Checksum 策略与 `docs/architecture.md` §B 对齐。

## 1. 版本与安装完整性

- [ ] 确认 Cursor 版本、commit 与部署脚本支持的基线一致（当前为 3.22.7）
- [ ] 确认安装目录可读，且存在 `resources/app`（或平台等价路径）
- [ ] 记录 `product.json` 中的 version / commit（如有）便于备份目录命名

## 2. Checksum / 完整性（本项目原则）

- [ ] 读取 `product.json` 的 `checksums`（或现行等价字段）
- [ ] 确认计划修改的文件是否被校验
- [ ] 已知：`workbench.glass.main.css` 在 3.21.18 调研中 **不在** checksum 列表（仍需在目标机器上复核）
- [ ] **优先策略：避免修改被 checksum 保护的文件**
- [ ] **不要**把「改后重写 / 同步 product.json checksum 以掩盖改动」当作计划中的默认步骤
- [ ] 若目标文件**已被 checksum**：视为 **高风险** → **停止写入**，优先改换注入路径（见 architecture §D）；仅当架构层正式重新评估后才可再议，不得临时默许 checksum sync

## 3. Glass / Agent Window 资源

- [ ] 是否存在 `workbench.glass.main.js`（路径可能为 `out/vs/workbench/...`，以实机为准）
- [ ] 是否存在 `workbench.glass.main.css`（若做 CSS 注入）
- [ ] Agent Window 能否独立启动，并出现 Glass DOM 标志（如 `data-cursor-glass-mode`）

## 4. 选择器与语义属性探针

在 Agent Window 开发者工具中抽查：

- [ ] 用户消息同时具备 `data-message-kind="human"` 与 `data-message-role="human"`
- [ ] Agent 回复：`data-message-kind="assistant"`、`data-message-role="ai"`
- [ ] 工具：`data-message-kind="tool"`
- [ ] `.composer-human-message` 是否仍被输入框共用（若是，样式/翻译不得只靠该类）
- [ ] `styles/user-message.css` 中选择器是否仍命中用户气泡、且不命中输入框

## 5. 备份与还原门禁

- [ ] 修改任何 Cursor 文件前已创建并验证外部原始备份（`scripts/deploy-glass-loader.js`）
- [ ] 原始备份位于安装目录外的 `%LOCALAPPDATA%\cursor-agent-zh\backups\<version>\<commit>\`，且 manifest 与原始 SHA/大小一致
- [ ] 已演练还原步骤
- [ ] 备份元数据包含 Cursor version、commit、原始 SHA256、大小和创建时间

## 6. 升级后流程

1. 安装/升级 Cursor 后 **不要** 假设旧注入仍有效  
2. 跑完整兼容检查（本清单）  
3. 若探针失败 → 停止注入，更新文档/词典/选择器  
4. 若计划目标被 checksum → 按 §2 停止或换路径，**不要**先改 checksum 再继续  
5. 若探针通过且目标可安全改动 → 备份 → 再应用经验证的 Glass 加载注入
6. 验证 Agent Window：UI 文案、用户消息样式、聊天正文未被翻译、无新增 console 错误

## 7. 失败即停止的条件

出现任一情况应中止写入：

- 版本或 Glass 资源缺失/更名且无适配方案
- 目标文件被 checksum，且尚无经架构确认的非 checksum-sync 替代路径
- 语义属性探针失败
- 无法创建或校验备份
