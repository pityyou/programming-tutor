# Programming Tutor - 编程学习智能体

## 项目概述

面向学生的编程自主学习智能体，支持 Python、Java、C/C++、Go、JavaScript 等多语言语法学习，部署于 Web 端。

### 开发缘由

- 传统编程教学中，学生遇到语法错误、逻辑 bug 时无法即时获得帮助
- 教师无法 1v1 覆盖所有学生，学习资源分散
- 学生需同时学习多门语言，需要统一平台

### 功能特点

- AI 对话学伴：基于 LLM 的编程答疑，支持追问、代码解释、错误分析
- 多语言代码沙箱：Python / Java / C / C++ / Go / JavaScript 在线编写运行
- AI 对话基于 DeepSeek API
- 交互式练习：AI 出题 → 学生写代码 → AI 评测反馈
- 学习记录：对话历史、练习记录、进度追踪

### 教学理念

- **以学生为中心 (SCL)**：学生自主选择学习语言、节奏、深度
- **OBE 成果导向**：每个知识点对应明确的学习产出，练习直接验证
- **数智化转型**：从传统教学 → 信息化 → 数字化 → AI 驱动的个性化学习

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript + Vite |
| 代码编辑器 | Monaco Editor (VS Code 内核) |
| UI 组件 | 自研组件 + CSS 变量主题（原 Naive UI 依赖已移除） |
| 后端框架 | Node.js + Express |
| LLM 集成 | DeepSeek API |
| 代码执行 | Docker 沙箱隔离 |
| 数据存储 | SQLite (MVP) → PostgreSQL |
| 流式输出 | SSE (Server-Sent Events) |
| 认证 | JWT (JSON Web Token) |

## 项目结构

```
programming-tutor/
├── client/                  # Vue 3 前端
│   ├── src/
│   │   ├── components/      # 对话面板、代码编辑器、快捷指令等
│   │   ├── views/           # 首页、对话页、登录页
│   │   ├── stores/          # Pinia 状态管理
│   │   ├── api/             # 后端 API 封装
│   │   └── App.vue
│   └── package.json
├── server/                  # Node.js 后端
│   ├── src/
│   │   ├── routes/          # chat, auth, execute
│   │   ├── adapters/        # LLM 适配器 (DeepSeek)
│   │   ├── services/        # 代码执行沙箱
│   │   ├── models/          # 数据模型 (SQLite)
│   │   ├── middleware/       # JWT 认证中间件
│   │   └── index.js
│   └── package.json
├── sandbox/                 # Docker 沙箱配置
│   └── Dockerfile
└── docker-compose.yml
```

## MVP 范围（第一期 - 已完成）

1. AI 对话学伴（SSE 流式 + 代码块渲染）
2. 代码编辑器 + 运行（Monaco Editor + 本地沙箱，支持 6 种语言）
3. 简易用户系统（注册/登录 + JWT + 对话历史绑定）
4. 语言切换时自动填入 Hello World 示例代码
5. SSE 流式输出（绕过 Vite 代理直连后端 + TCP NoDelay）

## 第二阶段（已完成）

### Phase 1：富文本对话增强
- Markdown 渲染（粗体、代码块、引用等）
- 代码块语法高亮（highlight.js）+ 一键复制 + "在编辑器中打开"
- 对话历史侧边栏（搜索、删除、重命名会话）

### Phase 2：语法知识卡片库
- 6 语言 + 算法 90+ 知识点（Python/JS/Java/C++/C/Go + 算法）
- 每个卡片：问 AI / 运行示例 / B站视频
- 卡片与 AI 联动（一键发送知识点到对话）
- 卡片示例代码一键填入编辑器

### Phase 3：AI 出题 + 评测
- AI 根据语言 + 难度/主题自动出题
- 代码提交后沙箱执行 + AI 评测
- 分步提示（不给完整答案）
- B站视频链接推荐（System Prompt 内建）

## 第三阶段（已完成）

### Phase 4：学习仪表盘 + 代码收藏 + 导出 + 响应式
- 学习仪表盘（对话次数、消息数、收藏数、最近活跃）
- 代码片段收藏（对话中一键收藏 → 代码库管理）
- 对话导出 Markdown 文件
- 响应式布局（平板 1024px / 手机 768px 断点）

## 第四阶段（已完成）

- 暗色/亮色主题切换（CSS 变量 + 系统偏好跟随 + 一键切换）
- Monaco Editor 懒加载 + 路由代码分割
- 代码对比视图（学生代码 vs AI 参考答案并排 diff）
- 学习路径（7 语言分级课程体系，入门→实战）
- 成就系统（徽章墙：初次对话/勤学好问/代码收藏家等）

## 第五阶段（已完成）

- 语音输入（Web Speech API，支持中文语音转文字提问）
- AI 学习报告（分析对话历史，生成学习总结+优势+建议）
- Docker 沙箱（容器隔离代码执行，安全限内存/CPU/网络）
- 粒子背景特效（200 粒子 + 鼠标联动 + 亮暗主题适配）
- 学习路径 ↔ 知识卡片联动导航

## 第六阶段（已完成 - Bug 修复 + 功能/UI 优化）

### 功能修复（P0）
- SSE 流式解析重写：按 `\n\n` 事件边界缓冲解析，修复网络分片导致的多行内容丢失
- 修复 Vite 代理端口错误（65225 → 3000），开发环境所有非聊天 API 恢复正常
- 消息顺序修复：messages 表新增 `seq` 列（自动迁移），查询按 seq 排序，杜绝同秒消息乱序
- 会话保存重构：增量追加（新建/追加两个接口），取代"全删全建"，修复 O(n²) 与数据丢失风险
- 中文输入法（IME）回车误发送修复（`isComposing` 判断）

### 对话体验
- 停止生成按钮（AbortController，保留已生成内容）
- 流式渲染优化：80ms 节流替代 45ms 打字机全量重渲染，末尾流式光标
- 消息复制 / 重新生成（重新生成会截断服务端历史再重答，不产生重复）
- 消息头像、悬浮快捷操作、输入框自动增高、Ctrl+Enter 换行
- 顶栏新增模型选择器（DeepSeek-V3 / R1）

### 练习自动判题
- 服务端 `/api/execute/test`：批量运行测试用例并比对预期输出
- 前端自动解析题目中的测试用例（输入 → 预期输出），运行判题展示逐用例通过/失败
- AI 评测携带真实执行结果，不再凭空评价

### 安全加固
- XSS 修复：练习题描述改用 markdown-it 渲染（`html: false`），移除 `v-html`
- JWT 密钥：检测默认占位值并生成临时随机密钥（提示配置强随机 secret）
- 速率限制：登录 10 次/分（IP）、对话 60 次/分、执行 30 次/分（按用户）
- 输入校验：JSON body 1MB 上限、消息/代码长度限制、用户名/密码长度校验
- Docker 沙箱：验证容器存在且运行，否则降级本地执行并输出提示

### UI 布局
- 聊天/编辑器可拖拽分栏（CSS Grid + fr，比例持久化）
- 移动端改为抽屉式侧边栏 + 遮罩层（替代纵向堆叠）
- 轻量 toast 提示系统（无依赖），替换静默 catch
- 成就修复："多语言探索者"（按已学语言统计）、"持之以恒"（真实连续学习天数）

## 第七阶段（已完成 - 账号安全）

- **忘记密码（邮箱验证码重置）**：
  - 注册必填邮箱（格式 + 唯一性校验），登录/资料接口返回邮箱
  - `POST /api/auth/forgot-password`：按邮箱发送 6 位验证码（15 分钟有效，未过期不重复发送防刷；统一响应文案防用户枚举）
  - `POST /api/auth/reset-password`：验证邮箱 + 验证码 + 新密码后重置
  - `POST /api/auth/bind-email`：老账号登录后补绑邮箱（仪表盘"账户安全"区块）
  - 邮件发送用 nodemailer（SMTP_HOST/PORT/USER/PASS/MAIL_FROM 环境变量）；未配置 SMTP 时进入开发模式：验证码打印到服务端日志并随接口返回 `devCode`，便于本地调试
  - 登录页三步找回流程（输邮箱 → 验证码+新密码 → 完成）

## 第八阶段（已完成 - 数据安全 + 练习记录 + 工程债）

- **流式消息防丢**：用户消息发出立即入库（不等流完成），刷新/断网不丢对话；保存操作串行化（Promise 链）防竞态；切换会话时自动中止在途生成
- **练习记录与错题本**：
  - 新增 `practice_records` 表 + `/api/practice`（保存/列表/详情/删除）
  - 练习判题后自动保存记录（含测试用例结果、通过状态）
  - 仪表盘新增"练习记录（错题本）"区块：通过率统计、最近 10 条记录、逐条删除
- **工程债清理**：
  - sql.js 写盘节流：300ms 窗口合并多次写，进程退出（exit/SIGINT/SIGTERM）时强制落盘
  - 知识卡片数据拆分：`KnowledgeCards.vue` 67KB → 数据移到 `client/src/data/knowledge.ts`（组件 486 行 → 184 行）
  - 移除从未使用的 Naive UI 依赖（省 20 个安装包）

## 第九阶段（已完成 - 注册邮箱验证 + 唯一性强化）

- **注册邮箱验证**：
  - 新增 `email_verifications` 表 + `POST /api/auth/register/send-code`（发送前预检用户名/邮箱唯一性；已有未过期验证码不重复发送防刷；开发模式返回 `devCode`）
  - `POST /api/auth/register` 要求邮箱验证码，校验通过才创建账号，注册成功后清除验证码记录
  - 登录页注册表单：邮箱行"获取验证码"按钮 + 60s 倒计时 + 验证码输入框
- **唯一性强化**：
  - 用户名改为大小写不敏感唯一（`COLLATE NOCASE` 查询 + 唯一索引），'Bob' 与 'bob' 视为同一账号
  - 邮箱唯一（小写存储 + 唯一索引），校验大小写不敏感
  - 登录同样支持大小写不敏感用户名

## 第十阶段（已完成 - Bug 排查与修复）

- **会话竞态修复（严重）**：引入 `sessionGeneration` 世代标记。此前在保存/流式过程中新建或切换会话，在途请求返回后会污染新会话状态（导致新对话消息永远存不上、或历史消息被覆盖）
- **Docker 沙箱路径修复（严重）**：`runInSandbox` 中 `dockerPath` 原是死变量，命令里的宿主路径未替换为容器内 `/code`，导致沙箱模式下代码全部找不到文件
- **停止生成不再浪费 token（严重）**：客户端断开时通过 AbortController 中止上游 LLM 请求（此前服务端仍会拉完整个回复）
- **删除会话不再误清当前对话**：仅当删除的是当前会话时才清空聊天区
- **验证码重发状态如实返回**：注册/忘记密码新增 `resent`、`remainSeconds` 字段（验证码仍有效时不再误报"已发送"），开发模式返回当前有效验证码
- **练习记录不再重复刷屏**：新增 `PUT /api/practice/:id`，同一题重复提交覆盖原记录；列表返回 `hasTests`，区分"通过/未过/已练习"三态
- **SSE 解析兼容 CRLF**：兼容代理改写换行符（含跨分片的 `\r\n`），此前会导致流式内容整段解析失败
- **局域网访问修复**：CORS 改为反射来源、聊天直连地址改用页面 hostname（此前局域网 IP 访问时聊天不可用）
- **其他**：会话重命名避免重复请求；仪表盘"最近活跃"改用最后一条消息时间；snippets 的 tags 非数组不再崩溃；auth 限流由 10/分放宽到 60/分（避免校园网 NAT 下多人共享出口 IP 互相限流）

## 第十一阶段（已完成 - 打包式部署）

**目标**：语言运行时（含 Go）随项目一起打包到服务器，服务器无需安装任何语言环境。

- **沙箱镜像重做**（`sandbox/Dockerfile`）：Ubuntu 22.04 + Python3 + Node 20（npmmirror 二进制）+ JDK17 + **Go 1.23.4（阿里云镜像）** + gcc/g++
  - 配置 `GOPATH`/`GOCACHE`/`GOTOOLCHAIN=local`，确保 Go 在无网沙箱中可编译
  - 以非 root 的 `sandbox` 用户运行，编译缓存目录归属正确
- **编排重做**（`docker-compose.yml`）：只保留沙箱服务（后端在宿主机用 PM2 跑）
  - 修正原配置引用不存在的 `server/Dockerfile`（会导致 `docker compose up` 直接失败）
  - 限制：512MB / 1 CPU / 128 进程 / 完全断网 / no-new-privileges
- **一键部署脚本**（`deploy.sh`，新增）：装 Docker + 国内镜像加速 + docker 组权限处理 → 构建并启动沙箱 → **逐项验证六种语言并实跑 Go** → 装 Node → 构建前端 → 生成 .env（随机 JWT_SECRET）→ PM2 + Nginx + 开机自启
- **部署文档重写**（`DEPLOY.md`）：服务器选购、两种上传方式、一键部署、密钥配置、**验证清单**（含 stdin 传输入容器的验证）、运维命令、常见问题、安全说明
- **容器执行适配修复**（`execute.js`）：
  - `docker exec` 补上 `-i`：**此前学生程序收不到 stdin，测试用例判题会全部失败**
  - 容器内用 `timeout 14` 包裹：避免死循环进程在沙箱内残留、持续占用 CPU
  - `maxBuffer` 提升到 5MB：避免大输出触发 ENOBUFS
  - 超时（退出码 124）与大输出给出中文友好提示

## LLM 架构

```
请求 → /api/chat → DeepSeek API
```

## 页面布局（MVP）

```
┌──────────────────────────────────────────────────┐
│  🔤 Programming Tutor    [模型: DeepSeek ▼] [👤] │
├────────────────────┬─────────────────────────────┤
│   AI 对话区        │   代码编辑器 (Monaco)        │
│                    │                             │
│  [对话历史...]     │   支持 Python/JS 语法高亮    │
│                    │                             │
│  [输入框________]  │   [▶ 运行]                   │
│                    │   [输出区域]                 │
└────────────────────┴─────────────────────────────┘
```

## 环境变量

```env
# Server
PORT=3000
JWT_SECRET=your-secret-key
DOCKER_SANDBOX=true

# LLM APIs
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# Default model
DEFAULT_PROVIDER=deepseek
DEFAULT_MODEL=deepseek-chat
```
