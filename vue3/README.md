# 知己心探测试 - Vue 3 版本

基于 Vue 3 + Vite + Pinia 重构的心理测评应用。

## 技术栈

- **框架**: Vue 3.5 (Composition API)
- **构建工具**: Vite 5
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **HTTP 客户端**: Axios
- **3D 背景**: Three.js
- **用户引导**: Driver.js
- **音频处理**: lamejs (MP3 编码)
- **调试工具**: vConsole (开发环境)

## 项目结构

```
vue3/
├── public/                  # 静态资源
│   └── images/              # 罗夏墨迹图
├── src/
│   ├── assets/
│   │   └── styles/          # 全局样式
│   ├── components/
│   │   ├── common/          # 通用组件
│   │   ├── effects/         # 视觉效果组件
│   │   ├── forms/           # 表单组件
│   │   ├── media/           # 媒体组件
│   │   └── test/            # 测试相关组件
│   ├── composables/         # 组合式函数
│   │   ├── useApi.js        # API 请求
│   │   ├── useAudioRecorder.js  # 音频录制
│   │   ├── useCanvas.js     # 画布绑制
│   │   ├── useDeviceCheck.js    # 设备检测
│   │   ├── useGuide.js      # 用户引导
│   │   ├── useImagePreloader.js # 图片预加载
│   │   ├── useInteractionTracker.js # 交互追踪
│   │   ├── useRealtimeDialog.js # WebRTC 语音对话
│   │   ├── useSession.js    # 会话管理
│   │   └── useSubtitle.js   # 字幕管理
│   ├── router/              # 路由配置
│   ├── stores/              # Pinia 状态管理
│   │   ├── authStore.js     # 认证状态
│   │   ├── sessionStore.js  # 会话状态
│   │   ├── testStore.js     # 测试状态
│   │   └── uiStore.js       # UI 状态
│   ├── utils/               # 工具函数
│   │   ├── constants.js     # 常量配置
│   │   └── helpers.js       # 辅助函数
│   ├── views/               # 页面视图
│   ├── App.vue              # 根组件
│   └── main.js              # 入口文件
├── .env.development         # 开发环境变量
├── .env.production          # 生产环境变量
├── vite.config.js           # Vite 配置
└── package.json             # 依赖配置
```

## 开发

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

### 构建生产版本

```bash
pnpm build
```

### 预览生产版本

```bash
pnpm preview
```

## 环境变量

在 `.env.development` 和 `.env.production` 中配置：

```env
# API 基础路径
VITE_API_BASE_URL=/api

# 是否显示用户名登录（开发调试用）
VITE_SHOW_USERNAME_LOGIN=true

# OpenAI API Key（用于 WebRTC 语音对话）
VITE_OPENAI_API_KEY=
```

## 功能模块

### 1. 认证模块
- 手机号 + 验证码登录
- 用户名密码登录（可选）
- Token 自动管理

### 2. 测试模块
- 10 张罗夏墨迹图依次展示
- 缩放、旋转、画笔标注功能
- 交互数据自动记录

### 3. 语音对话
- 基于 WebRTC 连接 OpenAI Realtime API
- 实时语音转文字
- AI 语音回复

### 4. 会话管理
- 自动保存测试进度
- 断点恢复支持
- 数据本地持久化

### 5. 视觉效果
- Three.js 粒子背景
- 能量进度条
- 加载动画

## API 接口

所有 API 请求通过 `/api` 代理到后端服务器，主要接口：

- `POST /rorschach/user_login_phone` - 手机号登录
- `POST /rorschach/user_login` - 用户名登录
- `GET /rorschach/basic_info` - 获取基本信息
- `POST /rorschach/set_basic_info` - 设置基本信息
- `POST /rorschach/upload_scale` - 上传缩放数据
- `POST /rorschach/upload_rotate` - 上传旋转数据
- `POST /rorschach/upload_seg_time` - 上传时间戳数据
- `POST /rorschach/upload_media` - 上传音频文件
- `POST /rorschach/analyze` - 触发分析
- `GET /rorschach/check_report_status` - 检查报告状态
- `GET /rorschach/get_publicity_report` - 获取报告

## 部署

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/dist;
    index index.html;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://backend-server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 静态资源缓存
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 从原项目迁移

本项目是从原始 Vanilla JavaScript 项目迁移而来，主要改动：

1. **模块化**: 从全局变量改为 ES Module
2. **响应式**: 使用 Vue 3 Composition API
3. **状态管理**: 从手动管理改为 Pinia
4. **组件化**: UI 元素拆分为可复用组件
5. **类型安全**: 添加 PropTypes 验证
6. **构建优化**: 代码分割、Tree Shaking
