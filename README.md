# Open Agent - AI Agent Running Platform

基于 Boxlite 的 AI Agent 运行管理平台。用户可以选择 Agent、配置 API Key，并在 sandbox 中长期运行 Agent。

## 功能特性

- **Agent 模板市场**: 选择预配置的 Agent 模板
- **长期运行**: Agent 在用户关闭页面后继续执行
- **Web Terminal**: 通过 xterm.js 连接 Agent PTY
- **状态持久化**: Agent 生命周期事件和日志持久化
- **API Key 管理**: 加密存储用户密钥
- **邮件通知**: 支持 Resend 发送运行提醒

## 技术栈

### 后端
- NestJS + TypeScript
- Prisma ORM + Postgres
- JWT 认证
- Socket.io (WebSocket)

### 前端
- Next.js 15 + React 19
- TypeScript
- Tailwind CSS
- xterm.js (Web Terminal)
- socket.io-client

### 基础设施
- Boxlite (sandbox 运行时，需 KVM 支持)
- Postgres (数据库)
- Redis (队列/WebSocket pub/sub)

## 快速开始

### 1. 启动基础设施

```bash
docker-compose up -d
```

### 2. 配置后端

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run start:dev
```

后端将在 `http://localhost:4000` 启动。

### 3. 配置前端

```bash
cd frontend
npm install
npm run dev
```

前端将在 `http://localhost:3000` 启动。

### 4. 访问应用

打开 `http://localhost:3000`，注册账号并开始使用。

## 项目结构

```
open-agent/
├── backend/              # NestJS 后端
│   ├── src/
│   │   ├── auth/              # 认证模块 (JWT)
│   │   ├── agent-templates/   # Agent 模板模块
│   │   ├── agent-runs/        # Agent 运行模块 + 状态机
│   │   ├── secrets/           # 密钥管理 (加密存储)
│   │   ├── terminal/          # WebSocket 终端网关
│   │   ├── boxlite-adapter/   # Boxlite 适配器 (接口 + Mock)
│   │   └── prisma/            # Prisma 服务
│   ├── prisma/
│   │   └── schema.prisma     # 数据库 schema
│   └── .env                  # 环境变量
├── frontend/             # Next.js 前端
│   ├── src/
│   │   ├── app/               # App Router 页面
│   │   ├── components/        # React 组件
│   │   └── lib/              # API 客户端
│   └── .env.local            # 环境变量
├── docs/                 # 文档
└── docker-compose.yml    # 基础设施
```

## 开发说明

### Boxlite 集成

当前使用 Mock 实现。在支持 KVM 的主机上：

1. 安装并启动 `boxlite serve`
2. 设置环境变量 `BOXLITE_ADAPTER_TYPE=real`
3. 实现 `RealBoxliteAdapter` 类

### 数据库迁移

```bash
cd backend
npx prisma migrate dev --name <migration-name>
```

### 查看数据库

```bash
cd backend
npx prisma studio
```

## API 端点

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户

### Agent 模板
- `GET /api/agent-templates` - 列出模板
- `POST /api/agent-templates` - 创建模板

### Agent 运行
- `GET /api/agent-runs` - 列出运行
- `POST /api/agent-runs` - 创建运行
- `GET /api/agent-runs/:id` - 获取运行详情
- `PUT /api/agent-runs/:id/stop` - 停止运行
- `PUT /api/agent-runs/:id/restart` - 重启运行
- `DELETE /api/agent-runs/:id` - 删除运行

### 密钥
- `GET /api/secrets` - 列出密钥
- `POST /api/secrets` - 创建密钥
- `DELETE /api/secrets/:id` - 删除密钥

### WebSocket
- `GET /ws/agent-runs` - 终端连接

## License

MIT
