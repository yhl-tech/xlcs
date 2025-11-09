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

