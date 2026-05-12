# 塞拉测试系统 - 技术文档

## 1. 项目概述

**塞拉测试系统**是一个基于罗夏墨迹测试的在线心理测评系统。系统通过展示 10 张标准罗夏墨迹图版，结合 AI 语音对话和用户交互数据采集，对用户进行深度心理分析并生成专业报告。

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
vue3/                                                    总计: 21,805 行
├── src/
│   ├── App.vue                 # 根组件                      212 行
│   ├── main.js                 # 入口文件                     55 行
│   │
│   ├── assets/                 # 静态资源
│   │   └── styles/             # CSS 样式文件
│   │       ├── app.css                                     2,832 行
│   │       ├── intro-preview-background.css                  800 行
│   │       ├── question-progress.css                         215 行
│   │       └── waiting-report.css                            862 行
│   │
│   ├── components/             # 组件
│   │   ├── common/             # 通用组件
│   │   │   ├── AppHeader.vue       # 顶部导航栏              253 行
│   │   │   ├── BaseButton.vue      # 基础按钮                154 行
│   │   │   ├── BaseModal.vue       # 基础弹窗                213 行
│   │   │   ├── LoadingOverlay.vue  # 加载遮罩                 73 行
│   │   │   └── UserBar.vue         # 用户信息栏              186 行
│   │   │
│   │   ├── effects/            # 特效组件
│   │   │   ├── BlackHoleBackground.vue  # 黑洞背景动画       659 行
│   │   │   ├── UploadingView.vue        # 上传进度视图     1,275 行
│   │   │   └── WaitingReportView.vue    # 等待报告视图     1,145 行
│   │   │
│   │   ├── forms/              # 表单组件
│   │   │   ├── BasicInfoForm.vue   # 基本信息表单            249 行
│   │   │   └── PostTestForm.vue    # 后测问卷表单（含倒计时）  480 行
│   │   │
│   │   ├── media/              # 媒体组件
│   │   │   └── SubtitleDisplay.vue # 字幕显示                127 行
│   │   │
│   │   └── test/               # 测试相关组件
│   │       ├── ControlsBar.vue     # 控制栏（缩放/旋转/画笔） 322 行
│   │       ├── EnergyPillar.vue    # 能量柱（含粒子效果）    430 行
│   │       ├── ImageCanvas.vue     # 墨迹图版画布            680 行
│   │       └── IntroOverlay.vue    # 操作说明引导          1,110 行
│   │
│   ├── composables/            # 组合式函数
│   │   ├── data.js                 # 数据处理                111 行
│   │   ├── useApi.js               # API 请求封装            669 行
│   │   ├── useAudioRecorder.js     # 音频录制                229 行
│   │   ├── useCanvas.js            # 画布操作                289 行
│   │   ├── useDeviceCheck.js       # 设备检测                301 行
│   │   ├── useGuide.js             # 新手引导                250 行
│   │   ├── useImagePreloader.js    # 图片预加载              239 行
│   │   ├── useInteractionTracker.js # 交互追踪               555 行
│   │   ├── useRealtimeDialog.js    # WebRTC 实时对话         1,017 行
│   │   ├── useSession.js           # 会话管理                255 行
│   │   └── useSubtitle.js          # 字幕管理                239 行
│   │
│   ├── router/                 # 路由配置
│   │   └── index.js                                          100 行
│   │
│   ├── stores/                 # Pinia 状态管理
│   │   ├── authStore.js        # 认证状态                    151 行
│   │   ├── sessionStore.js     # 会话状态                    205 行
│   │   ├── testStore.js        # 测试状态（含能量系统）      459 行
│   │   └── uiStore.js          # UI 状态                     196 行
│   │
│   ├── utils/                  # 工具函数
│   │   ├── audioManager.js     # 音频管理                    100 行
│   │   ├── constants.js        # 常量定义                    296 行
│   │   └── helpers.js          # 辅助函数                    195 行
│   │
│   └── views/                  # 页面视图
│       ├── HomeView.vue        # 首页                      1,174 行
│       ├── LoginView.vue       # 登录页                      889 行
│       ├── PrepView.vue        # 测试准备页                1,238 行
│       ├── IntroView.vue       # 介绍说明页                   51 行
│       ├── TestView.vue        # 正式测试页                  1,217 行
│       └── ReportView.vue      # 报告页                      252 行
│
├── public/                     # 静态资源（直接复制）
│   ├── images/                 # 墨迹图版图片
│   └── audio/                  # 音频文件
│
├── .env.development            # 开发环境配置                   4 行
├── .env.production             # 生产环境配置                   4 行
├── vite.config.js              # Vite 配置                   102 行
└── package.json                # 项目依赖                      33 行
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

连接流程（关键调用链）：
1. `TestView.vue`：`startVoiceDialog()` 在未连接时调用 `dialog.connect(currentPrompt, 'alloy')`，并在连接成功后调用 `dialog.startMixedRecording()` 开始“麦克风 + AI 回复”的混合录音。
2. `useRealtimeDialog.js`：`connect()` 内依次完成 `POST /realtime/token` 获取临时密钥、`getUserMedia()` 申请麦克风、创建 `RTCPeerConnection`（含 TURN relay，`iceTransportPolicy: 'relay'`）与 dataChannel `oai-events`、进行 SDP offer/answer（`POST /realtime/sdp`），并等待 `dc.onopen`。
3. 会话配置：dataChannel 打开后通过 `updateSession()` 发送 `instructions`（systemPrompt）、`turn_detection(server_vad)`，并设置 `max_response_output_tokens` 控制回复长度以降低音频输出成本。
4. 逐图重连：`TestView.vue` 切图时先 `stopMixedRecording()`（转码上传），再 `disconnect(true)` + `connect(对应图版prompt)`，保证每张图的会话独立。

```javascript
// 使用示例
const { connect, disconnect, sendTextMessage, isConnected } = useRealtimeDialog()

// 连接对话服务
await connect()

// 发送文本消息
sendTextMessage('用户输入的内容')

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

**核心特性**：
- **图片懒加载**：10 张墨迹图版采用懒加载机制，优先使用缓存的 Blob URL，提升加载性能
- **坐标转换**：支持缩放、旋转、平移后的精确坐标转换，确保画笔轨迹位置准确
- **图片切换动画**：切换图版时先淡出再重置变换，避免看到"图片转回来"的视觉问题
- **位置优化**：测试图片显示区域整体上移 30px，优化视觉布局

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

### 3.4 能量柱系统

**文件位置**：`src/components/test/EnergyPillar.vue`

能量柱可视化系统，通过粒子效果和分段显示增强用户交互反馈：

**核心功能**：
- **10 格分段显示**：能量柱分为 10 个明确的格子，每格代表 10%，左侧显示 100/50/0 刻度标签
- **粒子汇聚效果**：画笔绘制时，小星点从画笔位置飞向能量柱，增强视觉反馈
- **能量增长逻辑**：
  - 每次画笔移动生成粒子，增加 2 点能量
  - 批量粒子（图片切换时）每个增加 5 点能量
  - 能量上限按页码递增（第 N 页上限 = N × 100）
- **波纹效果**：画笔激活时显示能量柱波纹动画
- **无抖动设计**：粒子汇聚时能量柱不抖动，保持视觉稳定

**状态管理**：能量值存储在 `testStore` 中，支持持久化，最大能量值为 1000。

### 3.5 后测问卷系统

**文件位置**：`src/components/forms/PostTestForm.vue`

后测问卷包含 5 个问题，用户需要从 10 张图版中选择答案：

**核心功能**：
- **20 秒倒计时**：每道题限时 20 秒，倒计时显示在"下一页"按钮上
- **按钮禁用逻辑**：倒计时结束前"下一页"按钮不可点击，确保用户充分思考
- **问题背景变化**：每切换一题，问题区域背景颜色改变（青/靛蓝/绿/黄/粉），提醒用户问题已更新
- **文字优化**：问题文本字号适中（18px），标题字号 26px，提升可读性
- **AI 语音引导**：通过 WebRTC 实时对话播报问题，引导用户操作
- **答案收集**：收集用户选择的图版编号，格式化为 JSON 上传

**问题列表**：
1. 选择代表自己的图版
2. 选择代表父亲的图版
3. 选择代表母亲的图版
4. 选择最喜欢的图版
5. 选择最讨厌的图版

### 3.6 数据上传流程

**文件位置**：`src/components/effects/UploadingView.vue`

测试完成后，系统会依次上传以下 6 个数据文件：

| 序号 | 文件名 | 内容 | 接口 |
|------|--------|------|------|
| 1 | scale.json | 缩放操作记录 | `/rorschach/user/upload_scale` |
| 2 | rotate.json | 旋转次数统计 | `/rorschach/user/upload_rotate` |
| 3 | trajectory.json | 画笔轨迹数据 | `/rorschach/user/upload_trajectory` |
| 4 | video_clip.json | 时间戳切分 | `/rorschach/user/upload_seg_time` |
| 5 | 5_questions.json | 后测问卷答案 | `/rorschach/user/upload_5_questions` |
| 6 | audio.mp3 | 对话录音文件 | `/rorschach/user/upload_media` |

**上传页面特性**：
- **醒目标题**：渐变色动画标题 + 警示图标，提醒用户不要关闭页面
- **专业提示文字**：使用"数据解析"、"多维融合"等术语替代"上传中"，提升专业感
  - 缩放数据：解析视觉交互数据
  - 旋转数据：解析空间认知数据
  - 画笔轨迹：解析笔迹轨迹特征
  - 时间戳：多维时序数据融合
  - 问卷：整合心理问卷数据
  - 音频：语音数据传输/同步/校验/写入
- **真实上传进度**：音频上传使用 axios `onUploadProgress` 回调显示实时进度，每 50kb 更新一次
- **进度可视化**：黑洞动画效果 + 进度百分比显示，增强视觉反馈

### 3.7 报告等待页面

**文件位置**：`src/components/effects/WaitingReportView.vue`

报告生成过程中的等待页面，显示处理进度：

**核心功能**：
- **步骤进度显示**：显示报告生成的 6 个处理步骤
- **完成状态标识**：已完成的步骤右侧显示**绿色对号 ✓** 而非"已核准"文字
- **进度轮询**：定期检查报告生成状态，完成后自动跳转
- **视觉效果**：词云动画、粒子效果、数据流等丰富的视觉反馈

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
| `energy` | number | 当前能量值 (0-1000) | 是 |

**能量系统常量**：
```javascript
MAX_ENERGY = 1000          // 最大能量值
ENERGY_PER_STROKE = 2      // 每次画笔增加的能量
ENERGY_PER_PARTICLE = 5    // 批量粒子每个增加的能量
```

**能量计算属性**：
- `energyProgress`：能量百分比 (0-100)
- `maxEnergyForCurrentPage`：当前页能量上限 = (currentPlate + 1) × 100

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

## 9. 其他功能特性

### 9.1 AI 语音对话

**文件位置**：`src/composables/useRealtimeDialog.js`

- **WebRTC 实时通信**：基于 OpenAI Realtime API 实现低延迟语音对话
- **语音转文字**：实时显示用户语音和 AI 回复的文字内容
- **字幕显示**：单行字幕显示，支持打字机效果，宽度自适应
- **模型配置**：当前默认使用 `gpt-realtime-1.5`（在 `src/utils/constants.js` 的 `OPENAI_CONFIG.model`）
- **VAD 参数配置**（服务端语音检测触发回复）：
  - `type: 'server_vad'`
  - `threshold: 0.6`
  - `prefix_padding_ms: 500`：语音开始前的缓冲时间
  - `silence_duration_ms: 1500`：需要 1.5 秒静音才认为用户说完
- **音频延迟**：用户语音延迟 1 秒发送，确保完整采集
- **回复长度控制（降成本）**：在 `session.update` 中设置 `max_response_output_tokens = 200`，避免模型过度啰嗦导致输出音频过长。
- **Prompt 缓存（降成本）**：只要系统提示词内容在同类会话中保持一致，instructions 前缀会更容易命中缓存，从而降低系统提示词的输入成本（缓存由 Realtime 自动处理，非你手动开启）。
- **AI 提示词优化**：
  - **测试阶段提示词**：引导用户描述看到的图版内容，保持中立、客观、温和的语气
  - **后测问卷提示词**：引导用户完成 5 个问题，等待用户完整回答后再提示操作
  - **礼貌用语**：使用"好的，我了解了。如果您没有其他想要分享的，可以点击右上角的"下一页"按钮，我们继续下一个问题。"等礼貌用语

### 9.2 图片预加载系统

**文件位置**：`src/composables/useImagePreloader.js`

- **懒加载机制**：10 张墨迹图版采用懒加载，按需加载
- **Blob URL 缓存**：加载后的图片转换为 Blob URL 缓存，提升后续访问速度
- **Worker 线程处理**：使用 Web Worker 进行图片解码，不阻塞主线程

### 9.3 设备检测

**文件位置**：`src/composables/useDeviceCheck.js`

- **摄像头检测**：检测设备是否支持摄像头
- **麦克风检测**：检测设备是否支持麦克风
- **权限请求**：自动请求必要的媒体设备权限

### 9.4 新手引导

**文件位置**：`src/composables/useGuide.js` + `src/components/test/IntroOverlay.vue`

- **操作演示**：引导用户学习缩放、旋转、画笔等基本操作
- **Driver.js 集成**：使用 Driver.js 实现高亮引导效果
- **操作练习**：提供练习模式，让用户熟悉操作流程

### 9.5 会话持久化

**文件位置**：`src/stores/sessionStore.js`

- **断点续测**：支持保存和恢复测试会话
- **LocalStorage 存储**：测试数据自动保存到本地存储
- **状态恢复**：页面刷新后自动恢复测试进度

### 9.6 音频管理

**文件位置**：`src/utils/audioManager.js`

- **音频播放**：统一管理音频播放逻辑
- **音量控制**：支持音量调节
- **播放队列**：支持音频播放队列管理

---

*文档最后更新：2026-03-25*

docker build \
  --platform linux/amd64 \
  --build-arg VITE_BASE_URL=/xlcp/ \
  --build-arg VITE_API_BASE_URL=/xlcp/api \
  --build-arg VITE_SHOW_USERNAME_LOGIN=true \
  -t xlcs-vue3:latest \
  .

docker build --platform linux/amd64 -t xlcs-vue3:latest .
docker save -o xlcs-vue3.tar xlcs-vue3:latest
cp -r /root/xlpc/frontEnd/xlcs-vue3.tar /root/xlpc/frontEnd/xlcs-vue3-0406.tar


docker stop xlcs-vue3
docker rm xlcs-vue3
cd /root/xlpc/frontEnd
docker load -i xlcs-vue3.tar
docker run -d -p 8081:80 --name xlcs-vue3 xlcs-vue3:latest