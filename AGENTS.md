# AI Agent 协作规则

## 项目定位

open-agent 是基于 Boxlite 的 Agent 运行管理平台，目标是让用户选择 Agent、配置 API Key，并在 sandbox 中长期运行 Agent。页面关闭后 Agent 仍应继续执行，用户回来后可以继续查看状态、日志和 Web Terminal。

## 架构边界

- **平台层负责**：用户、Agent 模板、Agent Run、密钥管理、运行状态、日志、通知、权限、配额和 UI。
- **Boxlite 负责**：sandbox、PTY、exec、持久盘、资源限制、端口转发和底层隔离。
- 业务代码不应到处直接调用 Boxlite API，应通过 `BoxliteAdapter` 或同等封装访问。
- 如果问题涉及 PTY attach、exec、box 生命周期、持久盘或 metrics，应先判断是平台状态管理问题，还是 Boxlite 集成语义问题。
- Boxlite API 未确认的能力不要硬编码假设，应在代码或文档中保留适配层边界。

## 文件组织

- 严禁在根目录放置临时脚本、测试脚本或一次性文档。
- 文档放在 `docs/` 下；主题较多时使用子目录，例如 `docs/runtime/`、`docs/ui/`、`docs/boxlite/`。
- 脚本放在 `scripts/` 下。
- 测试放在所属模块的 `tests/` 下。
- 根目录只保留必要配置文件、`README.md` 和项目级规范文件。

## 文档规范

- `docs/` 下文件名应简短清晰，避免过长复合名称。
- 新增方案文档优先按主题归档，不要把大量草稿堆在顶层。
- 重大架构、里程碑方案或关键 bug 修复可以写文档；普通小改动不要额外创建文档。
- 文档中涉及 Boxlite 未确认接口时，应明确标注“待确认”，不要写成既定事实。

## 安全与密钥

- 用户 API Key 必须加密持久化，不能明文存储。
- 前端不能读取已保存密钥明文，只能展示脱敏信息。
- Agent Run 只保存 secret 引用，不保存 secret 明文。
- 密钥只能在运行时注入到对应用户的 sandbox。
- 日志、事件、邮件通知中不得包含 API Key 或敏感 token。

## Agent 运行规则

- WebSocket 和 xterm.js 只是终端交互通道，不能作为 Agent 是否运行的权威状态。
- Agent Run 生命周期应由后端 Orchestrator/Reconciler 管理。
- 用户关闭页面不应导致 Agent 停止。
- 状态、日志、事件和退出码必须可持久化，便于用户回来后恢复查看。
- 停止运行时应优先优雅退出，超时后再强制终止。

## 前端 UI

- Web Terminal 推荐使用 `xterm.js`。
- 状态、日志、终端输入权限要区分展示，避免多个页面同时写入导致混乱。
- 表单中涉及密钥的字段应默认隐藏，并避免自动回填明文。

## 部署与验证

- 修改运行生命周期、密钥、Boxlite 集成或通知逻辑后，必须验证最小闭环。
- 最小闭环包括：创建 Agent Run、启动 sandbox、连接 terminal、断开页面、确认 Agent 继续运行、重新连接查看状态。
- 如果项目接入 GitHub Actions，推送 main 后应监控 workflow 直到成功或失败，不要把部署确认留给用户。
