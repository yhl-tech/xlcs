# 知己心探测试系统 - 技术文档

## 1. 项目概述

**知己心探测试系统**是一个基于罗夏墨迹测试的在线心理测评系统。系统通过展示 10 张标准罗夏墨迹图版，结合 AI 语音对话和用户交互数据采集，对用户进行深度心理分析并生成专业报告。

### 主要功能

- **墨迹图版展示**：支持 10 张标准罗夏墨迹图版的展示、缩放、旋转
- **实时语音对话**：基于 WebRTC 的 AI 语音对话，引导用户描述看到的内容
- **画笔标注**：用户可在图版上进行画笔标注，标记看到的区域
- **交互数据追踪**：记录用户的缩放、旋转、画笔轨迹等所有交互行为
- **数据上传与分析**：将测试数据上传至服务器进行 AI 分析
- **报告生成与下载**：生成专业心理测评报告（PDF）

---

## 2. 技术架构

### 2.1 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | 3.x | 前端框架（Composition API） |
| Vite | 5.x | 构建工具 |
| Pinia | 2.x | 状态管理 |
| Vue Router | 4.x | 路由管理 |
| Axios | 1.x | HTTP 请求 |
| Three.js | - | 3D 背景效果（黑洞动画） |
| WebRTC | - | 实时语音通信 |
| Driver.js | - | 新手引导 |

### 2.2 项目目录结构

```
vue3/
├── src/
│   ├── App.vue                 # 根组件
│   ├── main.js                 # 入口文件
│   │
│   ├── assets/                 # 静态资源
│   │   └── styles/             # CSS 样式文件
│   │       ├── app.css
│   │       ├── intro-preview-background.css
│   │       ├── question-progress.css
│   │       └── waiting-report.css
│   │
│   ├── components/             # 组件
│   │   ├── common/             # 通用组件
│   │   │   ├── AppHeader.vue       # 顶部导航栏
│   │   │   ├── BaseButton.vue      # 基础按钮
│   │   │   ├── BaseModal.vue       # 基础弹窗
│   │   │   ├── LoadingOverlay.vue  # 加载遮罩
│   │   │   └── UserBar.vue         # 用户信息栏
│   │   │
│   │   ├── effects/            # 特效组件
│   │   │   ├── BlackHoleBackground.vue  # 黑洞背景动画
│   │   │   ├── UploadingView.vue        # 上传进度视图
│   │   │   └── WaitingReportView.vue    # 等待报告视图
│   │   │
│   │   ├── forms/              # 表单组件
│   │   │   ├── BasicInfoForm.vue   # 基本信息表单
│   │   │   └── PostTestForm.vue    # 后测问卷表单
│   │   │
│   │   ├── media/              # 媒体组件
│   │   │   └── SubtitleDisplay.vue # 字幕显示
│   │   │
│   │   └── test/               # 测试相关组件
│   │       ├── ControlsBar.vue     # 控制栏（缩放/旋转/画笔）
│   │       ├── EnergyPillar.vue    # 能量柱进度
│   │       ├── ImageCanvas.vue     # 墨迹图版画布
│   │       └── IntroOverlay.vue    # 操作说明引导
│   │
│   ├── composables/            # 组合式函数
│   │   ├── useApi.js               # API 请求封装
│   │   ├── useAudioRecorder.js     # 音频录制
│   │   ├── useCanvas.js            # 画布操作
│   │   ├── useDeviceCheck.js       # 设备检测
│   │   ├── useGuide.js             # 新手引导
│   │   ├── useImagePreloader.js    # 图片预加载
│   │   ├── useInteractionTracker.js # 交互追踪
│   │   ├── useRealtimeDialog.js    # WebRTC 实时对话
│   │   ├── useSession.js           # 会话管理
│   │   └── useSubtitle.js          # 字幕管理
│   │
│   ├── router/                 # 路由配置
│   │   └── index.js
│   │
│   ├── stores/                 # Pinia 状态管理
│   │   ├── authStore.js        # 认证状态
│   │   ├── sessionStore.js     # 会话状态
│   │   ├── testStore.js        # 测试状态
│   │   └── uiStore.js          # UI 状态
│   │
│   ├── utils/                  # 工具函数
│   │   ├── audioManager.js     # 音频管理
│   │   ├── constants.js        # 常量定义
│   │   └── helpers.js          # 辅助函数
│   │
│   └── views/                  # 页面视图
│       ├── HomeView.vue        # 首页
│       ├── LoginView.vue       # 登录页
│       ├── PrepView.vue        # 测试准备页
│       ├── IntroView.vue       # 介绍说明页
│       ├── TestView.vue        # 正式测试页
│       └── ReportView.vue      # 报告页
│
├── public/                     # 静态资源（直接复制）
│   ├── images/                 # 墨迹图版图片
│   └── audio/                  # 音频文件
│
├── .env.development            # 开发环境配置
├── .env.production             # 生产环境配置
├── vite.config.js              # Vite 配置
└── package.json                # 项目依赖
```

---

## 3. 核心功能模块

### 3.1 WebRTC 实时语音对话

**文件位置**：`src/composables/useRealtimeDialog.js`

基于 OpenAI Realtime API 实现的 WebRTC 语音对话功能：

- **连接管理**：建立和维护 WebRTC 连接
- **语音输入**：通过麦克风采集用户语音
- **AI 响应**：接收并播放 AI 语音回复
- **转写显示**：实时显示语音转文字内容

```javascript
// 使用示例
const { connect, disconnect, sendText, isConnected } = useRealtimeDialog()

// 连接对话服务
await connect()

// 发送文本消息
sendText('用户输入的内容')

// 断开连接
disconnect()
```

### 3.2 墨迹图版画布交互

**文件位置**：`src/components/test/ImageCanvas.vue`

支持的交互操作：

| 操作 | 描述 | 数据记录 |
|------|------|----------|
| 缩放 | 双指捏合或按钮控制 | `zoom: { "1": [1, -1, 1], ... }` |
| 旋转 | 按钮控制顺/逆时针旋转 | `rotate: { "1": 2, ... }` |
| 画笔 | 手指/鼠标绘制轨迹 | `drawingTracks: { "1": {...}, ... }` |
| 平移 | 缩放后拖动查看 | 不记录 |

### 3.3 用户交互数据追踪

**文件位置**：`src/composables/useInteractionTracker.js`

追踪并记录用户在测试过程中的所有交互行为：

```javascript
const tracker = useInteractionTracker()

// 记录缩放操作（1=放大，-1=缩小）
tracker.trackZoom(1)

// 记录旋转操作
tracker.trackRotate(15)  // 旋转角度

// 记录画笔轨迹
tracker.trackDrawingStart()
tracker.trackDrawingMove(x, y)
tracker.trackDrawingEnd()

// 获取所有数据
const data = tracker.getAllData()
```

### 3.4 数据上传流程

测试完成后，系统会依次上传以下 6 个数据文件：

| 序号 | 文件名 | 内容 | 接口 |
|------|--------|------|------|
| 1 | scale.json | 缩放操作记录 | `/rorschach/user/upload_scale` |
| 2 | rotate.json | 旋转次数统计 | `/rorschach/user/upload_rotate` |
| 3 | trajectory.json | 画笔轨迹数据 | `/rorschach/user/upload_trajectory` |
| 4 | video_clip.json | 时间戳切分 | `/rorschach/user/upload_seg_time` |
| 5 | 5_questions.json | 后测问卷答案 | `/rorschach/user/upload_5_questions` |
| 6 | audio.mp3 | 对话录音文件 | `/rorschach/user/upload_media` |

---

## 4. 页面流程

```
┌─────────────┐
│   首页      │  HomeView.vue
│  (/)        │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   登录      │  LoginView.vue
│  (/login)   │  - 手机号+验证码登录
└──────┬──────┘  - 用户名+密码登录（可选）
       │
       ▼
┌─────────────┐
│  测试准备   │  PrepView.vue
│  (/prep)    │  - 设备检测（摄像头/麦克风）
└──────┬──────┘  - 填写基本信息
       │
       ▼
┌─────────────┐
│  操作说明   │  IntroView.vue + IntroOverlay.vue
│  (/intro)   │  - 观看操作演示
└──────┬──────┘  - 练习基本操作
       │
       ▼
┌─────────────┐
│  正式测试   │  TestView.vue
│  (/test)    │  - 10 张墨迹图版
│             │  - AI 语音对话
└──────┬──────┘  - 交互数据记录
       │
       ▼
┌─────────────┐
│  后测问卷   │  PostTestForm.vue
│  (phase:    │  - 选择代表自己/父亲/母亲的图版
│  postTest)  │  - 选择最喜欢/最讨厌的图版
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  数据上传   │  UploadingView.vue
│  (phase:    │  - 上传 6 个数据文件
│  uploading) │  - 显示上传进度
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  等待报告   │  WaitingReportView.vue
│  (phase:    │  - 显示处理进度
│  waiting)   │  - 报告生成后可下载
└─────────────┘
```

---

## 5. API 接口文档

### 5.1 认证相关

#### 手机号登录
```
POST /rorschach/user_login_phone

请求体:
{
  "phone": "13800138000",
  "verification_code": "123456"
}

响应:
{
  "code": 0,
  "msg": "登录成功",
  "data": {
    "access_token": "eyJhbGc..."
  }
}
```

#### 用户名密码登录
```
POST /rorschach/user_login

请求体:
{
  "username": "testuser",
  "password": "password123"
}

响应:
{
  "code": 0,
  "msg": "登录成功",
  "data": {
    "access_token": "eyJhbGc..."
  }
}
```

#### 发送验证码
```
POST /rorschach/send_verification_code

请求体:
{
  "phone": "13800138000"
}

响应:
{
  "code": 0,
  "msg": "验证码已发送"
}
```

### 5.2 用户信息

#### 设置基本信息
```
POST /rorschach/user/set_basic_info

请求体:
{
  "user_id": "username",
  "basic_info": {
    "sex": "男",
    "age": "25",
    "education": "本科",
    "occupation": "程序员",
    "mood": "平静"
  }
}

响应:
{
  "code": 0,
  "msg": "设置成功"
}
```

### 5.3 数据上传

#### 上传缩放数据
```
POST /rorschach/user/upload_scale

请求体: FormData
  - file: scale.json

文件格式:
{
  "1": [1, 1, -1],
  "2": [],
  ...
  "10": [1]
}

响应:
{
  "code": 0,
  "msg": "上传成功"
}
```

#### 上传旋转数据
```
POST /rorschach/user/upload_rotate

请求体: FormData
  - file: rotate.json

文件格式:
{
  "1": 0,
  "2": 4,
  ...
  "10": 2
}
```

#### 上传画笔轨迹
```
POST /rorschach/user/upload_trajectory

请求体: FormData
  - file: trajectory.json
  - user_id: string

文件格式:
{
  "canvas_size": [800, 600],
  "data": {
    "1": {
      "0": [
        {
          "coords": [100, 200, 110, 210],
          "color": "green",
          "time": "00:15"
        }
      ]
    },
    ...
  }
}
```

#### 上传时间戳
```
POST /rorschach/user/upload_seg_time

请求体: FormData
  - file: video_clip.json

文件格式:
{
  "start": "00:00",
  "1": "01:53",
  "2": "03:45",
  ...
  "10": "25:00",
  "select": "25:15",
  "stop": "30:29"
}
```

#### 上传后测问卷
```
POST /rorschach/user/upload_5_questions

请求体: FormData
  - file: 5_questions.json

文件格式:
{
  "self": [3],
  "father": [7],
  "mother": [2],
  "favorite": [8],
  "dislike": [4]
}
```

#### 上传音频文件
```
POST /rorschach/user/upload_media

请求体: FormData
  - file: audio.mp3

响应:
{
  "code": 0,
  "msg": "上传成功"
}
```

### 5.4 报告相关

#### 检查上传状态
```
POST /rorschach/user/get_upload_files_status

请求体:
{
  "user_id": "username"
}

响应:
{
  "code": 0,
  "msg": "查验成功",
  "data": true  // true=已上传, false=未上传
}
```

#### 检查报告状态
```
POST /rorschach/user/get_report_status

请求体:
{
  "user_id": "username"
}

响应:
{
  "code": 0,
  "msg": "报告已生成",
  "data": true  // true=已生成, false=未生成
}
```

#### 下载报告 PDF
```
POST /rorschach/user/get_report_new

请求体:
{
  "user_id": "username"
}

响应: application/pdf (Blob)
```

#### 获取报告解读版
```
POST /rorschach/user/get_report_publicity

请求体:
{
  "user_id": "username"
}

响应: text/html
```

---

## 6. 状态管理

### 6.1 authStore（认证状态）

**文件**：`src/stores/authStore.js`

| 状态 | 类型 | 描述 |
|------|------|------|
| `token` | string | 用户认证令牌 |
| `userInfo` | object | 用户信息 |
| `isLoggingIn` | boolean | 登录中状态 |
| `isLoggedIn` | computed | 是否已登录 |

**主要方法**：
- `login(phone, code)` - 手机号登录
- `loginWithUsername(username, password)` - 用户名登录
- `logout()` - 登出
- `setToken(token)` - 设置令牌

### 6.2 testStore（测试状态）

**文件**：`src/stores/testStore.js`

| 状态 | 类型 | 描述 | 持久化 |
|------|------|------|--------|
| `phase` | string | 当前测试阶段 | 否 |
| `currentPlate` | number | 当前图版索引 (0-9) | 否 |
| `basicInfo` | object | 用户基本信息 | 是 |
| `interactionData` | object | 交互数据 | 是 |
| `postTestAnswers` | object | 后测问卷答案 | 是 |
| `dialogHistory` | array | 对话历史 | 是 |
| `reportStatus` | object | 报告状态 | 是 |

**测试阶段枚举**：
```javascript
PHASES = {
  INFO: 'info',           // 基本信息填写
  INTRO: 'intro',         // 介绍预览
  OPERATION_TEST: 'operationTest',  // 操作测试
  TEST: 'test',           // 正式测试
  POST_TEST: 'postTest',  // 后测问卷
  UPLOADING: 'uploading', // 数据上传
  WAITING: 'waiting'      // 等待报告
}
```

### 6.3 sessionStore（会话状态）

**文件**：`src/stores/sessionStore.js`

用于会话持久化和断点续测：

| 方法 | 描述 |
|------|------|
| `saveSnapshot()` | 保存当前会话快照 |
| `loadSnapshot()` | 加载会话快照 |
| `restoreSession()` | 恢复会话 |
| `clearSnapshot()` | 清除快照 |

### 6.4 uiStore（UI 状态）

**文件**：`src/stores/uiStore.js`

| 状态 | 描述 |
|------|------|
| `isLoading` | 全局加载状态 |
| `loadingMessage` | 加载提示文本 |
| `backgroundTheme` | 背景主题 (0-9) |
| `modalState` | 弹窗状态 |
| `toastState` | Toast 提示状态 |

**主要方法**：
- `showLoading(message)` / `hideLoading()`
- `showConfirm({ title, message })`
- `showToast(message, type)`
- `showSuccess(message)` / `showError(message)`

---

## 7. 开发指南

### 7.1 环境要求

- **Node.js**：18.x 或更高版本
- **包管理器**：pnpm（推荐）或 npm
- **浏览器**：Chrome/Edge/Safari 最新版本

### 7.2 安装步骤

```bash
# 克隆项目
git clone <repository-url>

# 进入 Vue 3 目录
cd vue3

# 安装依赖
pnpm install
```

### 7.3 开发/构建命令

```bash
# 开发模式（本地开发服务器）
pnpm dev

# 生产构建
pnpm build

# 预览构建结果
pnpm preview
```

### 7.4 环境变量配置

#### 开发环境 `.env.development`

```bash
# API 代理地址
VITE_API_BASE_URL=/api

# 是否显示用户名登录
VITE_SHOW_USERNAME_LOGIN=true

# 路由基础路径
VITE_BASE_URL=/
```

#### 生产环境 `.env.production`

```bash
# API 地址
VITE_API_BASE_URL=/xlcp/api

# 是否显示用户名登录
VITE_SHOW_USERNAME_LOGIN=true

# 路由基础路径（部署在子目录时配置）
VITE_BASE_URL=/xlcp
```

### 7.5 代理配置

开发环境下，API 请求通过 Vite 代理转发：

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://14.103.237.160:29876',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

---

## 8. 部署注意事项

1. **静态资源**：确保 `public/` 目录下的图片和音频资源正确部署
2. **路由配置**：使用 history 模式路由，需配置服务器将所有路由指向 `index.html`
3. **HTTPS**：WebRTC 功能在生产环境必须使用 HTTPS
4. **CORS**：确保后端 API 正确配置跨域策略
5. **子路径部署**：如部署在 `/xlcp` 子路径，需配置 `VITE_BASE_URL=/xlcp`

---

## 9. 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2024-01 | Vue 3 版本初始发布 |

---

*文档最后更新：2026-01-30*
