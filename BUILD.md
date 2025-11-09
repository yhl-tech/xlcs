# 构建说明文档

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

## 环境变量配置（可选）

如果需要根据环境配置不同的 API 地址，可以创建 `.env` 文件：

```bash
# 开发环境
VITE_API_BASE_URL=/api

# 生产环境
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

然后在代码中使用 `import.meta.env.VITE_API_BASE_URL` 访问。

## 部署

### 方式1：静态服务器部署

将 `dist/` 目录部署到 Nginx、Apache 等静态服务器：

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend:3000;
    }
}
```

### 方式2：Node.js 服务器部署

修改 `proxy-server.js`，使其服务 `dist/` 目录：

```javascript
app.use(express.static(path.join(__dirname, 'dist')));
```

### 方式3：CDN/对象存储

将 `dist/` 目录上传到云存储（如阿里云 OSS、腾讯云 COS），并配置 CDN 加速。

## 注意事项

1. **API 代理**：生产环境需要配置实际的后端 API 地址
2. **路径问题**：Vite 会自动处理资源路径，无需手动修改
3. **CORS**：如果直接访问后端 API，需要后端支持 CORS
4. **HTTPS**：生产环境建议使用 HTTPS

## 构建优化

Vite 会自动进行以下优化：

- ✅ 代码压缩和混淆
- ✅ 资源优化（图片、音频）
- ✅ 自动处理路径
- ✅ 生产环境优化
- ✅ Tree-shaking（移除未使用代码）

## 故障排查

### 构建失败

1. 检查 Node.js 版本（建议 16+）
2. 删除 `node_modules` 和 `pnpm-lock.yaml`，重新安装：`pnpm install`
3. 检查 `vite.config.js` 配置是否正确
4. 如果遇到依赖问题，尝试：`pnpm install --force`

### 资源路径错误

1. 确保使用相对路径 `./` 或 `/`
2. 检查 `vite.config.js` 中的 `base` 配置
3. 查看浏览器控制台的错误信息

### API 请求失败

1. 检查后端服务是否运行
2. 检查 API 地址配置是否正确
3. 检查 CORS 配置

