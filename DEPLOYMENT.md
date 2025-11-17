# 生产环境部署指南

## 部署前准备

### 1. 环境变量配置
在项目根目录创建 `.env.production` 文件，配置生产环境变量：

```bash
# 生产环境 API 地址
VITE_API_BASE_URL=https://your-production-api-domain.com/api
```

### 2. 静态资源检查
确保所有静态资源（图片、音频等）都放在 `public/` 目录下，构建时会自动复制到 `dist/` 目录。

## 构建步骤

### 1. 安装依赖
```bash
pnpm install
```

### 2. 生产环境构建
```bash
pnpm build
```

构建完成后，所有文件将输出到 `dist/` 目录。

## 部署配置

### 1. Web 服务器配置
将 `dist/` 目录下的所有文件部署到 Web 服务器。

#### Nginx 配置示例：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 根目录指向 dist 目录
    root /path/to/your/project/dist;
    index index.html;
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|mp3|mp4)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理（如果需要）
    location /api/ {
        proxy_pass https://your-api-domain.com/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 2. HTTPS 配置
生产环境强烈建议使用 HTTPS，可以通过 Let's Encrypt 免费获取 SSL 证书。

## 安全注意事项

### 1. API 安全
- 确保后端 API 正确配置 CORS 策略
- 使用 HTTPS 加密传输
- 实施适当的认证和授权机制

### 2. 前端安全
- 不要在前端代码中硬编码敏感信息
- 定期更新依赖包以修复安全漏洞
- 启用内容安全策略 (CSP)

### 3. 访问控制
- 配置适当的文件权限
- 限制对敏感文件的访问

## 性能优化

### 1. 静态资源优化
- 图片压缩和格式优化
- 启用 Gzip/Brotli 压缩
- 使用 CDN 加速静态资源

### 2. 缓存策略
- 合理设置静态资源缓存时间
- 实施浏览器缓存策略

## 监控和维护

### 1. 错误监控
- 集成前端错误监控服务
- 监控 API 请求成功率

### 2. 性能监控
- 监控页面加载性能
- 监控用户交互体验

## 故障排除

### 1. 常见问题
- **页面刷新 404**：检查 Web 服务器是否正确配置 SPA 路由
- **API 请求失败**：检查 API 地址配置和 CORS 设置
- **静态资源加载失败**：检查文件路径和 Web 服务器配置

### 2. 日志查看
- 查看浏览器控制台错误信息
- 查看 Web 服务器访问日志和错误日志

## 更新部署

### 1. 版本更新
1. 拉取最新代码
2. 重新安装依赖：`pnpm install`
3. 重新构建：`pnpm build`
4. 部署新生成的 `dist/` 目录内容

### 2. 回滚
- 保留历史版本的构建文件
- 快速切换到之前的版本