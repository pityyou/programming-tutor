#!/usr/bin/env bash
# ============================================================
# 编程助学智能体 — 一键部署脚本（Ubuntu 22.04 / Debian）
#
# 用法：
#   bash deploy.sh                # 完整部署
#   bash deploy.sh --skip-nginx   # 跳过 Nginx 配置
#   bash deploy.sh --rebuild      # 强制重建沙箱镜像（改过 Dockerfile 后）
#
# 部署架构：
#   宿主机：Node.js（PM2 守护，端口 3000）+ Nginx（托管前端 dist）
#   容器　：code-sandbox —— 打包了 Python/Node/Java/Go/C/C++ 全部运行时
#
# 服务器只需能联网装 Docker，无需预先安装任何语言环境。
# ============================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$APP_DIR/server"
CLIENT_DIR="$APP_DIR/client"
NODE_VERSION="20.18.1"
APP_PORT="3000"
SKIP_NGINX=0
REBUILD=0

for arg in "$@"; do
  case "$arg" in
    --skip-nginx) SKIP_NGINX=1 ;;
    --rebuild)    REBUILD=1 ;;
    -h|--help)
      echo "用法: bash deploy.sh [--skip-nginx] [--rebuild]"
      exit 0 ;;
    *) echo "未知参数: $arg"; exit 1 ;;
  esac
done

BOLD=$'\033[1m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; NC=$'\033[0m'
step() { echo; echo "${BOLD}==> $*${NC}"; }
ok()   { echo "  ${GREEN}✓${NC} $*"; }
warn() { echo "  ${YELLOW}!${NC} $*"; }
die()  { echo "  ${RED}✗${NC} $*" >&2; exit 1; }

if [ "${EUID}" -eq 0 ]; then
  SUDO=""
else
  command -v sudo >/dev/null 2>&1 || die "需要 root 权限或 sudo"
  SUDO="sudo"
fi

COMPOSE=""
detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
  else
    COMPOSE=""
  fi
}

# ------------------------------------------------------------
step "1/7 检查并准备 Docker"
if command -v docker >/dev/null 2>&1; then
  ok "Docker 已安装：$(docker --version)"
else
  warn "未检测到 Docker，开始安装…"
  $SUDO apt-get update -qq
  # Ubuntu 22.04 源里是 docker.io + docker-compose(v1)；24.04+ 是 docker-compose-v2
  $SUDO apt-get install -y docker.io docker-compose-v2 2>/dev/null \
    || $SUDO apt-get install -y docker.io docker-compose
  $SUDO systemctl enable --now docker
  ok "Docker 安装完成"
fi

$SUDO systemctl is-active --quiet docker || $SUDO systemctl start docker

# Docker Hub 直连在国内通常很慢/不通，配置镜像加速（拉取 ubuntu 基础镜像必需）
if [ ! -f /etc/docker/daemon.json ]; then
  $SUDO mkdir -p /etc/docker
  $SUDO tee /etc/docker/daemon.json >/dev/null <<'JSON'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.m.daocloud.io",
    "https://dockerproxy.cn"
  ]
}
JSON
  $SUDO systemctl restart docker
  ok "已配置 Docker 国内镜像加速"
else
  ok "已存在 /etc/docker/daemon.json，跳过镜像加速配置"
fi

# 非 root 用户必须能免 sudo 执行 docker，否则后端会降级为本机执行，
# 而服务器上并没有安装任何语言运行时 → 代码执行会全部失败。
if [ "${EUID}" -ne 0 ] && ! docker info >/dev/null 2>&1; then
  if $SUDO docker info >/dev/null 2>&1; then
    warn "当前用户不在 docker 组，正在添加用户 $(whoami) …"
    $SUDO usermod -aG docker "$(whoami)"
    echo
    echo "${BOLD}Docker 组权限需要重新登录才生效，请按下面步骤继续：${NC}"
    echo "     exit                 # 退出 SSH"
    echo "     ssh 重新登录服务器"
    echo "     bash deploy.sh       # 再次运行本脚本，即可完成部署"
    exit 0
  else
    die "Docker 无法运行，请检查：sudo systemctl status docker"
  fi
fi
[ "${EUID}" -eq 0 ] || ok "当前用户可直接使用 docker"

# ------------------------------------------------------------
step "2/7 准备代码共享目录"
mkdir -p "$APP_DIR/temp"
# 容器内的 sandbox 用户需要写入编译产物（.class/.exe 等）
chmod 777 "$APP_DIR/temp"
ok "temp 目录就绪（777，容器内可写）"

# ------------------------------------------------------------
step "3/7 构建并启动代码沙箱（首次约 3-8 分钟，需下载 Go/Node/JDK）"
cd "$APP_DIR"
detect_compose
[ -n "$COMPOSE" ] || die "未找到 docker compose，请手动安装 docker-compose-plugin"
if [ "$REBUILD" -eq 1 ]; then
  $COMPOSE build --no-cache sandbox
else
  $COMPOSE build sandbox
fi
$COMPOSE up -d sandbox
ok "沙箱容器已启动"

# ------------------------------------------------------------
step "4/7 验证沙箱内的语言运行时"
for _ in $(seq 1 20); do
  docker exec code-sandbox true >/dev/null 2>&1 && break
  sleep 1
done
docker exec code-sandbox true >/dev/null 2>&1 \
  || die "沙箱容器未就绪，请查看：$COMPOSE logs sandbox"

checks=(
  "Python|python3 --version"
  "Node.js|node --version"
  "Java|javac -version"
  "Go|go version"
  "GCC (C)|gcc --version | head -1"
  "G++ (C++)|g++ --version | head -1"
)
for item in "${checks[@]}"; do
  name="${item%%|*}"
  cmd="${item#*|}"
  if out=$(docker exec code-sandbox bash -lc "$cmd" 2>&1); then
    ok "$name：$out"
  else
    warn "$name 不可用：$out"
  fi
done

# Go 实际编译运行冒烟测试（确认"Go 环境已随镜像打包且可运行"）
if out=$(docker exec code-sandbox bash -lc \
    'printf "package main\nimport \"fmt\"\nfunc main(){fmt.Println(\"Go 运行正常\")}\n" > /tmp/t.go && cd /tmp && go run t.go' 2>&1); then
  ok "Go 实跑测试：$out"
else
  warn "Go 实跑失败：$out"
fi

# ------------------------------------------------------------
step "5/7 检查宿主机 Node.js"
need_node=1
if command -v node >/dev/null 2>&1; then
  major="$(node -v | sed 's/^v\([0-9]*\).*/\1/')"
  if [ "$major" -ge 18 ]; then
    ok "Node.js 已安装：$(node -v)"
    need_node=0
  else
    warn "Node.js 版本过低（$(node -v)），需要 18+"
  fi
fi
if [ "$need_node" -eq 1 ]; then
  warn "安装 Node.js v${NODE_VERSION}（npmmirror 镜像）…"
  tmp="/tmp/node-v${NODE_VERSION}.tar.xz"
  curl -fsSL -o "$tmp" \
    "https://npmmirror.com/mirrors/node/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    || die "下载 Node.js 失败，请检查网络"
  $SUDO tar -xJf "$tmp" -C /usr/local --strip-components=1
  rm -f "$tmp"
  ok "Node.js 安装完成：$(node -v)"
fi
npm config set registry https://registry.npmmirror.com >/dev/null 2>&1 || true

# ------------------------------------------------------------
step "6/7 安装依赖、构建前端、生成配置"
cd "$SERVER_DIR"
npm install --omit=dev --no-audit --no-fund
ok "后端依赖安装完成"

cd "$CLIENT_DIR"
npm install --no-audit --no-fund
npm run build
ok "前端构建完成 → client/dist"

cd "$SERVER_DIR"
if [ ! -f .env ]; then
  cp .env.example .env
  secret="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${secret}|" .env
  ok "已生成 server/.env（含随机 JWT_SECRET）"
  warn "请编辑 server/.env 填入 DEEPSEEK_API_KEY（必需），并按需配置 SMTP 邮件"
else
  ok "server/.env 已存在，未改动"
fi

# ------------------------------------------------------------
step "7/7 启动后端并配置 Nginx"
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2 --no-audit --no-fund
fi
cd "$APP_DIR"
pm2 delete tutor-server >/dev/null 2>&1 || true
pm2 start server/src/index.js --name tutor-server --cwd "$APP_DIR"
pm2 save
ok "后端已由 PM2 守护启动"

# 配置开机自启（失败不影响部署）
if [ "${EUID}" -ne 0 ]; then
  $SUDO env PATH="$PATH" "$(command -v pm2)" startup systemd -u "$(whoami)" --hp "$HOME" >/dev/null 2>&1 \
    && ok "已配置 PM2 开机自启" \
    || warn "PM2 开机自启未配置，可稍后手动执行：pm2 startup && pm2 save"
fi

if [ "$SKIP_NGINX" -eq 0 ]; then
  command -v nginx >/dev/null 2>&1 || $SUDO apt-get install -y nginx
  $SUDO tee /etc/nginx/sites-available/tutor >/dev/null <<NGINX
server {
    listen 80;
    server_name _;

    root ${CLIENT_DIR}/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX
  $SUDO ln -sf /etc/nginx/sites-available/tutor /etc/nginx/sites-enabled/tutor
  $SUDO rm -f /etc/nginx/sites-enabled/default
  $SUDO nginx -t && $SUDO systemctl reload nginx
  ok "Nginx 配置完成（80 → 前端 dist + /api 反代 ${APP_PORT}）"
else
  warn "已跳过 Nginx 配置"
fi

# ------------------------------------------------------------
step "部署完成"
sleep 2
if curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null 2>&1; then
  ok "后端健康检查通过"
else
  warn "后端未响应，请执行：pm2 logs tutor-server"
fi

echo
echo "${BOLD}访问地址${NC}：http://<服务器公网IP>/"
echo "${BOLD}记得在云控制台防火墙放行 TCP 80${NC}"
echo
echo "${BOLD}常用命令${NC}"
echo "  pm2 logs tutor-server        查看后端日志"
echo "  pm2 restart tutor-server     重启后端（改过 .env 后执行）"
echo "  cd $APP_DIR && $COMPOSE logs -f sandbox   查看沙箱日志"
echo "  cd $APP_DIR && $COMPOSE restart sandbox   重启沙箱"
echo
echo "${BOLD}若还没填 API Key${NC}"
echo "  nano $SERVER_DIR/.env    然后：pm2 restart tutor-server"
