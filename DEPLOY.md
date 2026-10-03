# 部署指南 — 打包式部署（语言环境随镜像带走）

> 本项目的 Python / Node.js / Java / Go / C / C++ **全部运行时都打包在 Docker 沙箱镜像里**。
> 服务器上不需要安装任何语言环境，装完 Docker 即可运行六种语言的代码。

## 一、部署架构

```
Ubuntu 服务器
├── Nginx (80)  ── 托管前端静态文件 + /api 反向代理
├── Node.js (PM2 守护, 3000)  ── 后端服务 + 数据库
│        │
│        └── docker exec ──┐
│                          ▼
└── Docker 容器 code-sandbox ── 学生代码在这里执行
     （镜像内含：Python3 / Node20 / JDK17 / Go1.23 / gcc / g++）
     挂载 ./temp:/code   ·   断网   ·   512MB / 1 CPU
```

**为什么把代码执行放在独立容器里？**
学生代码在容器内运行，读不到后端目录下的 `.env`（内含 DeepSeek API Key）和数据库文件，也无法访问外网。

## 二、服务器要求

| 项目 | 建议 |
|------|------|
| 系统 | **Ubuntu 22.04 LTS**（推荐）/ Debian 11+ |
| 配置 | **2 核 4G** 起（Go/Java 编译较吃内存；2 核 2G 也能跑但会紧张） |
| 磁盘 | 40 GB 以上（镜像约 1.2 GB + Node 依赖） |
| 带宽 | 3 Mbps 以上 |
| 权限 | 有 `sudo` 权限，能执行 `apt install` |

> Docker 可用性：腾讯云 / 阿里云 / 华为云的 Ubuntu 服务器都能直接安装 Docker，没有特殊限制，不需要备案之外的额外申请。

## 三、上传项目

### 方式 A：Git（推荐）

```bash
# ① 本地先把改动提交并推送（重要！否则服务器上的代码是旧的）
git add -A && git commit -m "部署准备" && git push

# ② 服务器上拉取
ssh ubuntu@你的服务器IP
cd ~ && git clone <你的仓库地址> programming-tutor
cd programming-tutor
```

### 方式 B：直接上传（不方便用 Git 时）

在**本地**打包（排除依赖与数据），再上传：

```bash
# 本地 Git Bash / WSL
tar --exclude=node_modules --exclude=dist --exclude=data --exclude=temp \
    --exclude=.git --exclude=.env \
    -czf programming-tutor.tar.gz programming-tutor

# 上传（把 IP 换成你的服务器）
scp programming-tutor.tar.gz ubuntu@你的服务器IP:~/

# 服务器上解压
ssh ubuntu@你的服务器IP
tar -xzf programming-tutor.tar.gz && cd programming-tutor
```

> `.env` 里含 API Key，**不要**打包上传；服务器上由部署脚本自动生成。

## 四、一键部署

```bash
cd ~/programming-tutor
bash deploy.sh
```

脚本会依次完成：

1. 安装 Docker 并配置国内镜像加速
2. **把当前用户加入 docker 组**（若需要，会提示你重新登录后再跑一次）
3. 构建沙箱镜像（首次 3–8 分钟，会下载 Go 70MB / Node 25MB / JDK 等）
4. **逐项验证六种语言运行时，并实际跑一次 Go 程序**
5. 安装 Node.js 18+ 与依赖、构建前端
6. 生成 `server/.env`（自动写入随机 JWT_SECRET）
7. 用 PM2 启动后端、配置 Nginx 与开机自启

参数：

```bash
bash deploy.sh --skip-nginx    # 不配置 Nginx（自己已有反向代理时）
bash deploy.sh --rebuild       # 强制重建沙箱镜像（改过 sandbox/Dockerfile 后）
```

> **如果脚本提示"请重新登录后再次运行"**：这是 Docker 组权限的正常要求，执行 `exit` 断开 SSH、重新登录、再跑一次 `bash deploy.sh` 即可。

## 五、配置密钥（必做）

```bash
nano server/.env
```

至少填写：

```env
DEEPSEEK_API_KEY=sk-你的密钥          # 必需，否则 AI 对话不可用
JWT_SECRET=已自动生成                 # 保持不动即可

# 忘记密码功能需要（可选）：QQ 邮箱示例
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=你的QQ邮箱@qq.com
SMTP_PASS=邮箱SMTP授权码
MAIL_FROM=你的QQ邮箱@qq.com
```

改完**必须重启后端**：

```bash
pm2 restart tutor-server
```

## 六、开放端口

在云服务器控制台 → 防火墙/安全组，放行 **TCP 80**。

然后浏览器访问：`http://你的服务器公网IP/`

## 七、部署后验证清单

```bash
# 1) 沙箱容器在运行
docker ps | grep code-sandbox

# 2) 六种语言运行时都在（应全部输出版本号）
docker exec code-sandbox bash -lc \
  "python3 --version; node --version; javac -version; go version; gcc --version | head -1; g++ --version | head -1"

# 3) Go 实际编译运行
docker exec code-sandbox bash -lc \
  'printf "package main\nimport \"fmt\"\nfunc main(){fmt.Println(\"Go OK\")}\n" > /tmp/t.go && cd /tmp && go run t.go'

# 4) stdin 能传进容器（判题依赖这一条）
echo "5" | docker exec -i code-sandbox bash -lc \
  'printf "n=int(input())\nprint(n*2)\n" > /tmp/s.py && python3 /tmp/s.py'
# 期望输出：10

# 5) 后端与前端
curl http://127.0.0.1:3000/api/health      # {"status":"ok"}
curl -I http://127.0.0.1/                  # HTTP/1.1 200
```

全部通过后，登录网页 → 侧边栏「代码编辑」→ 逐个切换语言点「▶ 运行」，应当都能出结果。

## 八、常用运维命令

```bash
pm2 logs tutor-server        # 后端日志
pm2 restart tutor-server     # 重启后端（改 .env 后）
pm2 status                   # 进程状态

cd ~/programming-tutor
docker compose logs -f sandbox     # 沙箱日志
docker compose restart sandbox     # 重启沙箱
docker compose build --no-cache sandbox && docker compose up -d sandbox   # 重建镜像

sudo nginx -s reload         # 重载 Nginx
```

**更新代码后**：

```bash
cd ~/programming-tutor
git pull
cd client && npm install && npm run build && cd ..
cd server && npm install --omit=dev && cd ..
pm2 restart tutor-server
```

## 九、常见问题

| 现象 | 原因与解决 |
|------|-----------|
| `docker compose build` 卡在拉取 `ubuntu:22.04` | 镜像加速未生效。检查 `/etc/docker/daemon.json` 后 `sudo systemctl restart docker` |
| 网页能开，但点「运行」提示"未找到 xxx 编译器" | ① 沙箱没跑：`docker compose up -d sandbox`；② 后端没有 docker 权限：`docker ps` 是否需要 sudo，若需要则重新登录 SSH 并 `pm2 restart tutor-server` |
| 点「运行」提示 "未找到 python 编译器" 之类 | 同上，后端启动时探测不到 Docker 就会降级本机执行，重启后端可重新探测 |
| Go 第一次运行很慢 | 正常，首次编译标准库缓存，后续会快 |
| 页面显示但接口 502 | 后端没起来：`pm2 logs tutor-server` |
| 手机/局域网访问打不开 | 云防火墙放行 80；本地开发时用 `npm run dev` 并注意 `--host` |
| 忘记密码收不到邮件 | `server/.env` 的 SMTP 未配置或授权码错误；未配置 SMTP 时验证码会打印在 `pm2 logs` 里（开发模式） |
| 磁盘被 temp 占满 | 每次执行会自动清理；异常中断可能残留 `temp/`，可手动 `rm -f temp/*` |

## 十、安全说明

- ✅ 学生代码在**独立容器**内运行，无法读取 `.env`、数据库等后端文件
- ✅ 沙箱容器 **完全断网**（`network_mode: none`），无法对外发起请求
- ✅ 资源受限：512 MB 内存、1 核 CPU、128 进程上限、单次执行 14 秒超时
- ✅ 沙箱内以受限用户 `sandbox` 运行，非 root
- ⚠️ 生产环境请务必修改 `JWT_SECRET`（脚本已自动生成随机值），并保管好 `.env`
