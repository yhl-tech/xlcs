# 说明文档

## 包管理器

本项目使用 **pnpm** 作为包管理器。

## 安装依赖

首次使用前，需要安装依赖：

```bash
pnpm install
```

这将安装 Vite 和其他必要的依赖。

## 构建命令

### 开发环境

```bash
# 使用代理服务器开发（推荐）
pnpm dev
```

### 生产构建

```bash
# 构建生产版本
pnpm build

# 使用生产环境模式构建
pnpm build:prod

# 预览构建结果
pnpm preview

# 或使用自定义端口预览
pnpm serve
```

## 构建输出

构建完成后，所有文件将输出到 `dist/` 目录：

```
dist/
├── index.html          # 主页面
├── js/                 # JavaScript 文件（已压缩）
│   ├── index-[hash].js
│   └── ...
├── images/             # 图片资源（从 public/images 自动复制）
│   └── ...
└── audio/              # 音频文件（从 public/audio 自动复制，如果存在）
    └── ...
```

**注意**：`public/` 目录下的所有文件会被自动复制到 `dist/` 根目录，保持相同的目录结构。

## 环境变量配置

### 开发环境
在开发环境中，API 请求会通过 Vite 的代理转发到后端服务器。

### 生产环境
生产环境需要配置实际的 API 地址：

1. 修改 `.env.production` 文件中的 `VITE_API_BASE_URL` 为实际的生产环境 API 地址
2. 构建时会自动使用该配置

```bash
# 生产环境配置示例
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

然后在代码中使用 `import.meta.env.VITE_API_BASE_URL` 访问。

## 部署注意事项

1. **静态资源**：确保 `public/` 目录下的所有静态资源（图片、音频等）都能正确访问
2. **路由配置**：如果使用 history 模式路由，需要配置服务器将所有路由指向 `index.html`
3. **HTTPS**：生产环境建议使用 HTTPS
4. **CORS**：确保后端 API 正确配置 CORS 策略
5. **安全性**：
   - 不要在前端代码中硬编码敏感信息
   - 确保 API 接口有适当的身份验证和授权机制
   - 定期更新依赖包以修复安全漏洞

## 详细的生产环境部署指南

请查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 文件获取详细的生产环境部署指南。

## 部署检查清单

请查看 [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) 文件获取完整的部署前检查清单。