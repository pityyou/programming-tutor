# 部署指南 — 腾讯云轻量应用服务器

## 购买建议

| 配置 | 推荐 | 说明 |
|------|------|------|
| 镜像 | Ubuntu 22.04 | 兼容性最好 |
| CPU | 2核 | 最低要求 |
| 内存 | 2GB+ | 4GB 更流畅 |
| 带宽 | 3Mbps+ | 学生用够 |
| 地域 | 离学生近 | 选最近的地域 |

## 服务器初始化

```bash
# 1. 更新系统
sudo apt update && sudo apt upgrade -y

# 2. 安装 Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 3. 安装 git + nginx
sudo apt install -y git nginx

# 4. 安装编译工具（代码执行沙箱需要）
sudo apt install -y g++ gcc golang-go openjdk-17-jdk

# 5. 安装 PM2（进程守护）
sudo npm install -g pm2
```

## 部署项目

```bash
# 1. 克隆项目
cd ~
git clone https://github.com/pityyou/programming-tutor.git
cd programming-tutor

# 2. 配置环境变量
cp server/.env.example server/.env
nano server/.env
# 填入你的 DEEPSEEK_API_KEY，修改 JWT_SECRET

# 3. 安装依赖
cd client && npm install && npm run build && cd ..
cd server && npm install && cd ..

# 4. 启动后端（端口 3000）
pm2 start server/src/index.js --name tutor-server

# 5. 配置 Nginx
sudo tee /etc/nginx/sites-available/tutor << 'NGINX'
server {
    listen 80;
    server_name _;

    # 前端静态文件
    root /home/ubuntu/programming-tutor/client/dist;
    index index.html;

    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;  # SSE 流式输出
    }

    # 前端路由（SPA）
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/tutor /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 6. 开机自启
pm2 save && sudo pm2 startup
```

## 访问

买完服务器后在腾讯云控制台：
1. **防火墙** → 添加规则 → 放行 TCP 80 端口
2. 浏览器打开 `http://你的服务器IP`

## 常用命令

```bash
pm2 logs tutor-server      # 查看日志
pm2 restart tutor-server   # 重启后端
sudo nginx -s reload       # Nginx 重载配置
```
