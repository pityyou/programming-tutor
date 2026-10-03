# ============================================================
# 代码执行沙箱镜像
# 打包了本平台支持的全部语言运行时：
#   Python 3 / Node.js 20 / Java 17 / Go 1.23 / C / C++
# 服务器上无需安装任何语言环境，只要 Docker。
#
# 构建：docker compose build   （或 bash deploy.sh）
# ============================================================
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8

# 可通过 --build-arg 覆盖版本
ARG GO_VERSION=1.23.4
ARG NODE_VERSION=20.18.1

# ---------- 系统包：Python / Java / C / C++ ----------
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 \
      openjdk-17-jdk-headless \
      gcc \
      g++ \
      curl \
      ca-certificates \
      xz-utils \
      bash \
      coreutils \
    && rm -rf /var/lib/apt/lists/*

# ---------- Go（阿里云镜像，避免 go.dev 在国内不可达）----------
RUN curl -fsSL -o /tmp/go.tgz \
      "https://mirrors.aliyun.com/golang/go${GO_VERSION}.linux-amd64.tar.gz" \
    && tar -C /usr/local -xzf /tmp/go.tgz \
    && rm -f /tmp/go.tgz \
    && /usr/local/go/bin/go version

# ---------- Node.js（npmmirror 镜像；Ubuntu 自带的 12 太旧）----------
RUN curl -fsSL -o /tmp/node.tar.xz \
      "https://npmmirror.com/mirrors/node/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 \
    && rm -f /tmp/node.tar.xz \
    && node --version

# ---------- 执行代码用的受限用户 ----------
RUN useradd -m -s /bin/bash sandbox

ENV PATH="/usr/local/go/bin:${PATH}" \
    HOME=/home/sandbox \
    GOPATH=/home/sandbox/go \
    GOCACHE=/home/sandbox/.cache/go-build \
    GOFLAGS=-mod=mod \
    GOTOOLCHAIN=local

# Go / Java 需要可写的编译缓存与输出目录
RUN mkdir -p /code "${GOPATH}" "${GOCACHE}" \
    && chown -R sandbox:sandbox /home/sandbox \
    && chmod 777 /code

WORKDIR /code

# 以 sandbox 用户运行（docker exec 也使用该用户）
USER sandbox

CMD ["sleep", "infinity"]
