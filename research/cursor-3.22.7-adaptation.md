# Cursor 3.22.7 compatibility adaptation

> 日期：2026-09-25（Asia/Shanghai）
> 基线：仓库 d78c430；安装版 Cursor 3.22.7 / commit 37076c6c3f9e253c0fa2305197e45befd13a2260。
> 本文记录升级审计之后的适配；原只读发现见 cursor-3.22.7-upgrade-compat.md。

## DOM 补测

用户在真实 Glass Agents Window 运行只读探针。第一份样本：human 15、thinking 7、assistant 16；role 为 human 15、ai 23。抽样 thinking/ai 元素的标记祖先链只有自身，因此消息排除必须直接识别 thinking 与 ai。第二份样本将真实工具调用滚动到可见区域后，得到 data-message-kind=tool 6 个、data-tool-call-id 6 个、thinking 8 个；工具消息仍使用 tool kind。探针只统计属性与数量，未读取消息正文。

静态 Glass bundle 也有两处工具容器生成代码，设置 data-message-kind=tool、data-message-role=ai 和 data-tool-call-id。实机结果与静态代码一致。

## 代码适配

- runtime/bootstrap.js：分别管理 message kind 与 role 排除；新增 thinking kind 和 ai role，原 human/assistant/tool 规则保留。初始与动态翻译继续共用同一安全管线。
- scripts/lib/glass-loader-shared.js：只接受 3.22.7 当前 version+commit 与记录的原始 Glass SHA256/大小。备份路径按 version/commit 放在 %LOCALAPPDATA%/cursor-agent-zh/backups/，manifest 记录身份、原始哈希、大小和创建时间；已有备份验证后复用，绝不覆盖。
- deploy/restore：checksum、版本、Glass 当前哈希及备份在安装写入前验证；拒绝未知 bundle。Cursor 进程仍在时拒绝部署/还原。sidecar 由 runtime 与分层词典生成，restore 只从匹配的有效备份恢复。

## 验证

仓库六组测试共 79 项通过：safety 16、exact 18、mutation 15、contextual 17、loader placement 4、versioned backup 9。备份测试含隔离 fixture 的首次部署、重复部署、还原，以及错误 SHA/manifest 的停止门禁。

对真实 3.22.7 原始 Glass 在临时目录组合 loader：placement=before-sourceMappingURL，marker=1，产物大小 45,392,073 字节，SHA256 195D857FF651DB5FE797285D76758C257EF8ECD5E9AFA779915BC05352EAA379；node --check 通过。此检查只读取安装目录，未写入安装文件。

## 实机安装状态

Cursor.exe 进程为零、版本与原始 SHA 再次确认后，已运行 deploy（未使用 --clear-code-cache）。独立只读核对：

- 外部备份 SHA256 721501D167E1EA82E51F33346C924448A34360E857B1E6D3972DC677589AA5A0、大小 45,389,668 字节，manifest 中 version/commit/SHA/大小一致。
- 安装 Glass SHA256 195D857FF651DB5FE797285D76758C257EF8ECD5E9AFA779915BC05352EAA379；loader marker 恰好 1 处。
- sidecar SHA256 E089BAF67ED78AF013D5F3CE968F698C279750A9A7E7D7D1FFE784336C530E60，与仓库 SoT 生成值一致。
- product.json SHA256 FFE8FA1B6660432598C1CFF831FAF68DAFB5913459E4FF3E5965602E0F34ABDF，与部署前升级审计一致；部署脚本同时验证 desktop bundle 前后 SHA 不变。

重开 Agents Window 后，用户实机报告四项侧栏文案已显示中文，用户消息、AI 回复、工具输出中的英文文案保持原样。只读状态：glass=true、loader=true、initialized/isGlass/scanCompleted/scopeSettled/observerAttached=true、skippedNotGlass=false；exactMatches/translationsApplied=5、contextualMatches/contextualTranslationsApplied=1（Search）、skipCounts.message=415、code=78、editable=7。该次页面 thinkingCount=3、toolCount=0；先前含真实工具调用的页面已确认 toolCount=6。用户随后确认中文按钮点击功能正常。部署前的 DevTools 截图已出现黄色 agent-exec/ExtensionService 警告和红色 [composer] Extension host became UNRESPONSIVE；该截图拍摄时尚未部署 loader/sidecar。原始 3.22.7 Glass 备份中也包含此 [composer] 错误日志代码，而 loader 只在后续部署时插入。因此这条截图中的红色错误属于部署前基线，不能计为本项目新增。截图未显示 [cursor-agent-zh] 错误。已验收本轮翻译范围及功能；未对 Cursor 自身扩展服务错误做修复。Phase 2A 继续暂停。
