# 使用 Docker 部署本项目

本文档说明如何将「知己心探」前端（Vue3 + Vite）用 Docker 构建并部署。项目使用 **pnpm** 作为包管理器。

---

## 一、流程概览

1. **准备**：在仓库根目录准备好 `Dockerfile`、`nginx.conf`、`.dockerignore` 和 `pnpm-lock.yaml`
2. **本地构建**：在仓库根目录执行 `docker build` 生成镜像
3. **上传镜像**：通过镜像仓库、导出 tar 或直接在服务器上构建
4. **服务器运行**：在服务器上 `docker run` 或 `docker compose up` 启动容器

---

## 二、环境要求

### 构建环境（本机或 CI）

- 已安装 **Docker**（建议 20.10+）
- 仓库根目录存在 **pnpm-lock.yaml**（若无，在根目录执行 `pnpm install` 生成）

### 服务器

只需安装 **Docker**，无需单独安装 Node.js、pnpm 或 Nginx。容器内会使用 Nginx 提供静态资源和反向代理。

安装 Docker（示例，Linux）：

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# 重新登录后生效，或执行 newgrp docker
```

其他系统见 [Docker 官方安装文档](https://docs.docker.com/engine/install/)。

---

## 三、本地打包

### 3.1 确认目录与文件

- 在**仓库根目录**（xlcs，即包含 `package.json`、`vite.config.js` 的目录）执行所有 Docker 命令
- 确认根目录下存在：
  - `Dockerfile`
  - `nginx.conf`
  - `.dockerignore`
  - `package.json`、`pnpm-lock.yaml`
  - `vite.config.js`、`index.html`、`src/` 等源码

### 3.2 构建命令

**根路径部署**（前端在 `/`，接口用 `/api`）：

```bash
docker build -t xlcs-vue3:latest .
```

**子路径部署**（例如前端在 `/xlcp`，接口用 `/xlcp/api`）：

```bash
docker build \
  --build-arg VITE_BASE_URL=/xlcp \
  --build-arg VITE_API_BASE_URL=/xlcp/api \
  -t xlcs-vue3:latest \
  .
```

- `-t xlcs-vue3:latest`：镜像名称与标签
- 末尾的 `.`：构建上下文为当前目录（仓库根目录）

### 3.3 验证与本地试跑

```bash
docker images | grep xlcs-vue3
docker run -d -p 8080:80 --name xlcs-vue3 xlcs-vue3:latest
```

浏览器访问 `http://localhost:8080`（根路径）或 `http://localhost:8080/xlcp`（子路径）。试跑结束后：

```bash
docker stop xlcs-vue3 && docker rm xlcs-vue3
```

---

## 四、将镜像弄到服务器

任选一种方式。

### 方式 A：镜像仓库（推荐）

1. 打标签并推送（示例为 Docker Hub）：
   ```bash
   docker tag xlcs-vue3:latest 你的用户名/xlcs-vue3:latest
   docker login
   docker push 你的用户名/xlcs-vue3:latest
   ```
2. 在服务器上拉取并运行：
   ```bash
   docker pull 你的用户名/xlcs-vue3:latest
   docker run -d -p 8080:80 --name xlcs-vue3 你的用户名/xlcs-vue3:latest
   ```

### 方式 B：导出 tar 再上传

1. 本机：`docker save -o xlcs-vue3.tar xlcs-vue3:latest`
2. 上传：`scp xlcs-vue3.tar 用户@服务器IP:/home/用户/`
3. 服务器上：
   ```bash
   docker load -i xlcs-vue3.tar
   docker run -d -p 8080:80 --name xlcs-vue3 xlcs-vue3:latest
   ```

### 方式 C：在服务器上构建

1. 将代码传到服务器（如 `git clone`、`rsync`）
2. 在仓库根目录执行与「三、本地打包」相同的 `docker build` 命令
3. 再执行 `docker run` 即可

---

## 五、在服务器上运行

### 启动容器

```bash
docker run -d -p 8080:80 --name xlcs-vue3 xlcs-vue3:latest
```

- `-d`：后台运行
- `-p 8080:80`：宿主机 8080 映射到容器内 80（Nginx）
- `--name xlcs-vue3`：容器名称

若使用 Docker Compose，在仓库根目录执行：`docker compose up -d`（以实际 `docker-compose.yml` 为准）。

### 常用命令

```bash
docker ps                  # 查看运行中的容器
docker logs xlcs-vue3      # 查看日志
docker stop xlcs-vue3      # 停止
docker start xlcs-vue3     # 再次启动
docker rm -f xlcs-vue3     # 删除容器（需先停止）
```

---

## 六、构建参数

通过 `--build-arg 变量名=值` 传入，常用如下：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| VITE_BASE_URL | 前端访问基础路径 | / |
| VITE_API_BASE_URL | 前端请求 API 的基础地址 | /api |
| VITE_SHOW_USERNAME_LOGIN | 是否显示用户名登录 | 未设置 |
| VITE_OPENAI_API_KEY | OpenAI 相关密钥（慎用，建议由后端代理） | 未设置 |

示例（子路径 + 用户名登录）：

```bash
docker build \
  --build-arg VITE_BASE_URL=/xlcp \
  --build-arg VITE_API_BASE_URL=/xlcp/api \
  --build-arg VITE_SHOW_USERNAME_LOGIN=true \
  -t xlcs-vue3:latest \
  .
```

---

## 七、API 路径说明

### 构建时

建议使用**相对路径**，便于换域名或端口时无需重编镜像：

| 部署方式 | 构建参数 | 前端实际请求示例（页面在 https://example.com） |
|----------|----------|-----------------------------------------------|
| 根路径   | `/api`   | https://example.com/api/xxx                   |
| 子路径   | `/xlcp/api` | https://example.com/xlcp/api/xxx           |

### 部署时（Nginx 反向代理）

前端会请求当前域名下的上述路径，需在 Nginx 中把该路径转发到真实后端。例如后端为 `http://14.103.237.160:29876`：

根路径时：

```nginx
location /api/ {
    proxy_pass http://14.103.237.160:29876/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

子路径 `/xlcp` 时：

```nginx
location /xlcp/api/ {
    proxy_pass http://14.103.237.160:29876/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

镜像内 Nginx 已包含静态与 SPA 配置；若需在容器内代理 API，可在 `nginx.conf` 中按上述方式配置并保证后端地址正确。

---

## 八、注意事项

1. **不要提交密钥**：`.env.production`、`.env.development` 等应在 `.gitignore` 中，生产环境密钥通过构建参数或运行时环境变量注入，不要写进仓库。
2. **子路径**：当 `VITE_BASE_URL=/xlcp` 时，镜像内 Nginx 会按子路径配置，无需改宿主机。
3. **SPA 路由**：Nginx 已配置回退到 `index.html`，Vue Router history 模式可正常使用。
4. **锁文件**：保留 `pnpm-lock.yaml`，镜像内使用 `pnpm install --frozen-lockfile`，保证构建可重复。

---

## 九、相关文件

| 文件 | 作用 |
|------|------|
| `Dockerfile` | 多阶段构建：Node + pnpm 构建 → Nginx 托管 dist |
| `nginx.conf` | Nginx 配置：静态资源、SPA、可选 /api 代理 |
| `.dockerignore` | 排除 node_modules、.git、.env 等，加快构建 |

---

## 部署前检查

- [ ] 根目录已有 `Dockerfile`、`nginx.conf`、`.dockerignore`
- [ ] 根目录已有 `pnpm-lock.yaml`（无则执行 `pnpm install`）
- [ ] 确定部署方式（根路径或子路径），构建时传入对应 `VITE_BASE_URL`、`VITE_API_BASE_URL`
- [ ] 在**仓库根目录**执行 `docker build`，上下文为 `.`
- [ ] 服务器已安装 Docker，并选好镜像上传方式（仓库 / tar / 服务器构建）
