# 阶段一：使用 Node + pnpm 构建
FROM node:20-alpine AS builder

# 使用 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 依赖
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# 源码与构建
COPY . .

# 构建时使用项目里的 .env.production（已随 COPY . . 带入），无需在 Docker 里再赋值
# 若需覆盖，可传 --build-arg VITE_XXX=value
RUN pnpm run build:prod

# 阶段二：使用 Nginx 提供静态资源
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
# 使用仅含 server 块的配置（nginx.conf 是宿主机完整配置，勿用）
COPY nginx1.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
