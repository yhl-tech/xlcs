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

# 构建时传入的变量（对应 Vite 的 VITE_* 环境变量）
ARG VITE_BASE_URL=/
ARG VITE_API_BASE_URL=/api
ARG VITE_SHOW_USERNAME_LOGIN
ARG VITE_OPENAI_API_KEY

ENV VITE_BASE_URL=$VITE_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SHOW_USERNAME_LOGIN=$VITE_SHOW_USERNAME_LOGIN
ENV VITE_OPENAI_API_KEY=$VITE_OPENAI_API_KEY

RUN pnpm run build

# 阶段二：使用 Nginx 提供静态资源
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
# 使用仅含 server 块的配置（nginx.conf 是宿主机完整配置，勿用）
COPY nginx1.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
