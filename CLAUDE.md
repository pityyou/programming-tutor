# Programming Tutor - 编程学习智能体

## 项目概述

面向学生的编程自主学习智能体，支持 Python、Java、C/C++、C#、Go 等多语言语法学习，部署于 Web 端。

### 开发缘由

- 传统编程教学中，学生遇到语法错误、逻辑 bug 时无法即时获得帮助
- 教师无法 1v1 覆盖所有学生，学习资源分散
- 学生需同时学习多门语言，需要统一平台

### 功能特点

- AI 对话学伴：基于 LLM 的编程答疑，支持追问、代码解释、错误分析
- 多语言代码沙箱：Python / Java / C / C++ / C# / Go 在线编写运行
- 多模型切换：DeepSeek（默认）/ Claude / OpenAI 自由切换
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
| UI 组件 | Naive UI |
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
│   │   ├── components/      # 对话面板、代码编辑器、模型切换器
│   │   ├── views/           # 首页、对话页、登录页
│   │   ├── stores/          # Pinia 状态管理
│   │   ├── api/             # 后端 API 封装
│   │   └── App.vue
│   └── package.json
├── server/                  # Node.js 后端
│   ├── src/
│   │   ├── routes/          # chat, auth, execute
│   │   ├── adapters/        # LLM 适配器 (deepseek/claude/openai)
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

1. AI 对话学伴（SSE 流式 + 代码块渲染 + 多模型切换）
2. 代码编辑器 + 运行（Monaco Editor + 本地沙箱，支持 7 种语言）
3. 简易用户系统（注册/登录 + JWT + 对话历史绑定）
4. 语言切换时自动填入 Hello World 示例代码
5. SSE 流式输出（绕过 Vite 代理直连后端 + TCP NoDelay）

## 第二阶段（已完成）

### Phase 1：富文本对话增强
- Markdown 渲染（粗体、代码块、引用等）
- 代码块语法高亮（highlight.js）+ 一键复制 + "在编辑器中打开"
- 对话历史侧边栏（搜索、删除、重命名会话）

### Phase 2：语法知识卡片库
- 7 语言 63 知识点（Python/JS/Java/C++/C/C#/Go）
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

### Phase 3：AI 出题 + 评测
- AI 根据语言 + 难度/主题自动出题
- 代码提交后沙箱执行 + 测试用例验证
- 分步提示（不给完整答案）
- 题目完成记录

## LLM 多模型网关架构

```
请求 → /api/chat → DeepSeek API
```

前端传 `provider` 参数，后端自动路由到对应适配器。所有适配器实现统一接口。

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
