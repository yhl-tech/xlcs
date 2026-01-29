# 知己心探测试系统 - Vue 3 版本

基于 Vue 3 + Vite + Pinia 构建的心理测评系统前端应用。

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue | 3.4.x | 前端框架 |
| Vite | 5.x | 构建工具 |
| Pinia | 2.1.x | 状态管理 |
| Vue Router | 4.2.x | 路由管理 |
| Axios | 1.13.x | HTTP 请求 |
| Three.js | 0.182.x | 3D 背景效果 |
| Driver.js | 1.4.x | 新手引导 |
| lamejs | 1.2.x | MP3 编码 |
| Less | 4.5.x | CSS 预处理器 |

## 项目结构

```
vue3/
├── public/                    # 静态资源
│   ├── audio/                 # 音频文件（欢迎语、操作提示音等）
│   └── images/                # 图片资源（墨迹图版、logo等）
├── src/
│   ├── assets/               # 项目资源
│   │   └── styles/           # 全局样式
│   ├── components/           # 组件
│   │   ├── common/           # 通用组件
│   │   │   ├── AppHeader.vue       # 应用头部
│   │   │   ├── BaseButton.vue      # 基础按钮
│   │   │   ├── BaseModal.vue       # 基础弹窗
│   │   │   ├── LoadingOverlay.vue  # 加载遮罩
│   │   │   └── UserBar.vue         # 用户信息栏
│   │   ├── effects/          # 特效组件
│   │   │   ├── BlackHoleBackground.vue  # 黑洞背景动画
│   │   │   ├── UploadingView.vue        # 上传进度视图
│   │   │   └── WaitingReportView.vue    # 等待报告视图
│   │   ├── forms/            # 表单组件
│   │   │   ├── BasicInfoForm.vue   # 基本信息表单
│   │   │   └── PostTestForm.vue    # 后测问卷表单
│   │   ├── media/            # 媒体组件
│   │   │   └── SubtitleDisplay.vue # 字幕显示
│   │   └── test/             # 测试相关组件
│   │       ├── ControlsBar.vue     # 控制栏
│   │       ├── EnergyPillar.vue    # 能量柱进度
│   │       ├── ImageCanvas.vue     # 图版画布
│   │       └── IntroOverlay.vue    # 介绍覆盖层
│   ├── composables/          # 组合式函数
│   │   ├── useApi.js              # API 请求
│   │   ├── useAudioRecorder.js    # 音频录制
│   │   ├── useCanvas.js           # 画布操作
│   │   ├── useDeviceCheck.js      # 设备检测
│   │   ├── useGuide.js            # 新手引导
│   │   ├── useImagePreloader.js   # 图片预加载
│   │   ├── useInteractionTracker.js # 交互追踪
│   │   ├── useRealtimeDialog.js   # WebRTC 实时对话
│   │   ├── useSession.js          # 会话管理
│   │   └── useSubtitle.js         # 字幕管理
│   ├── router/               # 路由配置
│   │   └── index.js
│   ├── stores/               # Pinia 状态仓库
│   │   ├── authStore.js      # 认证状态
│   │   ├── sessionStore.js   # 会话状态
│   │   ├── testStore.js      # 测试状态
│   │   └── uiStore.js        # UI 状态
│   ├── utils/                # 工具函数
│   │   ├── audioManager.js   # 音频管理
│   │   ├── constants.js      # 常量配置
│   │   └── helpers.js        # 辅助函数
│   ├── views/                # 页面视图
│   │   ├── HomeView.vue      # 首页
│   │   ├── IntroView.vue     # 测试说明页
│   │   ├── LoginView.vue     # 登录页
│   │   ├── PrepView.vue      # 测试准备页
│   │   ├── ReportView.vue    # 报告页
│   │   └── TestView.vue      # 测试页
│   ├── App.vue               # 根组件
│   └── main.js               # 入口文件
├── index.html                # HTML 模板
├── vite.config.js            # Vite 配置
└── package.json              # 项目配置
```

## 快速开始

### 环境要求

- Node.js >= 18.x
- pnpm >= 8.x（推荐）或 npm

### 安装依赖

```bash
cd vue3
pnpm install
```

### 开发模式

```bash
pnpm dev
```

访问 http://localhost:8080

### 生产构建

```bash
pnpm build
# 或
pnpm build:prod
```

### 预览构建结果

```bash
pnpm preview
```

## 页面流程

```
首页 (/) 
  ↓
登录 (/login)
  ↓
测试准备 (/prep)
  ├── 基本信息填写
  ├── 测试说明介绍
  └── 操作练习
  ↓
正式测试 (/test)
  ├── 10张墨迹图版测试（可缩放、旋转、标注）
  ├── WebRTC 语音对话
  └── 综合测试问卷（五个问题）
  ↓
数据上传
  ↓
等待报告生成
  ↓
查看报告 (/report)
```

## 核心功能

### 1. WebRTC 实时语音对话

通过 `useRealtimeDialog.js` 实现与 OpenAI Realtime API 的 WebRTC 连接：

- 麦克风输入捕获
- AI 语音回复播放
- 混合音频录制（用户 + AI）
- MP3 格式转换

### 2. 交互数据追踪

通过 `useInteractionTracker.js` 记录用户操作：

- 缩放操作记录
- 旋转操作记录
- 画笔轨迹记录
- 时间戳记录

### 3. 图版画布

`ImageCanvas.vue` 提供：

- 图片缩放（0.5x - 3x）
- 图片旋转（支持任意角度）
- 画笔标注（多色）
- 触摸/鼠标手势支持

### 4. 数据上传

测试完成后，上传以下数据到后端。

## API 接口详情

### 1. 缩放数据 - `uploadZoom`

| 项目 | 值 |
|------|-----|
| 接口路径 | `POST /rorschach/user/upload_scale` |
| 文件名 | `scale.json` |
| FormData | `file` |

**数据格式：**

```json
{
  "1": [1, 1, -1],
  "2": [],
  "3": [1],
  ...
  "10": [-1, -1]
}
```

- 键：图版编号 `"1"` - `"10"`
- 值：操作数组，`1` = 放大，`-1` = 缩小

---

### 2. 旋转数据 - `uploadRotate`

| 项目 | 值 |
|------|-----|
| 接口路径 | `POST /rorschach/user/upload_rotate` |
| 文件名 | `rotate.json` |
| FormData | `file` |

**数据格式：**

```json
{
  "1": 0,
  "2": 4,
  "3": 22,
  ...
  "10": 6
}
```

- 键：图版编号 `"1"` - `"10"`
- 值：**旋转次数（整数）**，不是旋转角度

> ⚠️ 注意：后端期望的是旋转次数，不是角度数组

---

### 3. 画笔轨迹 - `uploadDrawingTracks`

| 项目 | 值 |
|------|-----|
| 接口路径 | `POST /rorschach/user/upload_trajectory` |
| 文件名 | `trajectory.json` |
| FormData | `file` + `user_id` |
| Headers | `User-Id: {userId}` |

**数据格式：**

```json
{
  "canvas_size": [800, 600],
  "data": {
    "1": {
      "0": [
        {
          "coords": [100, 200, 150, 250],
          "color": "red",
          "time": "00:07"
        }
      ]
    },
    "2": {},
    ...
    "10": {}
  }
}
```

- `canvas_size`: `[高度, 宽度]`
- `data`: 按图版分组的轨迹数据
  - 键：图版编号 `"1"` - `"10"`
  - 值：轨迹组对象，键为轨迹组索引 `"0"`, `"1"`, ...
    - `coords`: `[y1, x1, y2, x2, ...]` 坐标点数组
    - `color`: 颜色名称 `"red"` / `"green"` / `"blue"` / `"white"`
    - `time`: 相对时间 `"MM:SS"` 格式

---

### 4. 时间戳数据 - `uploadSegTime`

| 项目 | 值 |
|------|-----|
| 接口路径 | `POST /rorschach/user/upload_seg_time` |
| 文件名 | `video_clip.json` |
| FormData | `file` |

**数据格式：**

```json
{
  "start": "00:00",
  "1": "01:53",
  "2": "03:45",
  "3": "05:12",
  ...
  "10": "23:08",
  "select": "25:15",
  "stop": "30:29"
}
```

- `start`: 测试开始时间
- `"1"` - `"10"`: 各图版开始时间
- `select`: 进入综合测试时间
- `stop`: 测试结束时间
- 时间格式：`"MM:SS"`（分钟和秒数均为两位数）

---

### 5. 五个问题 - `upload5Questions`

| 项目 | 值 |
|------|-----|
| 接口路径 | `POST /rorschach/user/upload_5_questions` |
| 文件名 | `5_questions.json` |
| FormData | `file` |

**数据格式：**

```json
{
  "self": [3],
  "father": [5],
  "mother": [7],
  "favorite": [1, 8],
  "dislike": [4, 6]
}
```

- `self`: 代表自己的图版（可多选）
- `father`: 代表父亲的图版（可多选）
- `mother`: 代表母亲的图版（可多选）
- `favorite`: 最喜欢的图版（可多选）⚠️ 前端使用 `like`，上传时转换为 `favorite`
- `dislike`: 最不喜欢的图版（可多选）
- 值为图版编号数组 `[1-10]`

> ⚠️ 注意：不包含 `mood` 字段；键名必须与后端一致

---

### 6. 音频文件 - `uploadMedia`

| 项目 | 值 |
|------|-----|
| 接口路径 | `POST /rorschach/user/upload_media` |
| 文件名 | `audio_{userId}_{timestamp}.mp3` |
| FormData | `file` |
| 超时时间 | 300000ms (5分钟) |

**支持格式：**
- MP3
- MP4

---

### 7. 检查报告状态 - `checkReportStatus`

| 项目 | 值 |
|------|-----|
| 接口路径 | `POST /rorschach/user/get_report_status` |
| 请求体 | `{ "user_id": "{userId}" }` |

**返回格式：**

```json
{
  "ready": true,
  "report_url": "..."
}
```

---

## 接口汇总表

| 功能 | 接口路径 | 方法 | 文件名 | FormData 字段 |
|------|----------|------|--------|--------------|
| 缩放数据 | `/rorschach/user/upload_scale` | POST | `scale.json` | `file` |
| 旋转数据 | `/rorschach/user/upload_rotate` | POST | `rotate.json` | `file` |
| 画笔轨迹 | `/rorschach/user/upload_trajectory` | POST | `trajectory.json` | `file`, `user_id` |
| 时间戳 | `/rorschach/user/upload_seg_time` | POST | `video_clip.json` | `file` |
| 五个问题 | `/rorschach/user/upload_5_questions` | POST | `5_questions.json` | `file` |
| 音频文件 | `/rorschach/user/upload_media` | POST | `*.mp3` | `file` |
| 报告状态 | `/rorschach/user/get_report_status` | POST | - | `user_id` (JSON) |

---

## 空数据处理策略

| 数据类型 | 空数据处理 | 说明 |
|---------|-----------|------|
| 缩放数据 | **上传** | 补齐所有10个图版为空数组 `[]` |
| 旋转数据 | **上传** | 补齐所有10个图版为 `0` |
| 画笔轨迹 | **上传** | 补齐所有10个图版为空对象 `{}` |
| 时间戳 | **上传** | 补齐所有键为 `"00:00"` |
| 五个问题 | **上传** | 补齐所有5个字段为空数组 `[]` |
| 音频文件 | **跳过** | 无录音数据时跳过 |

## 状态管理

### authStore

管理用户认证状态：

```javascript
{
  isLoggedIn: boolean,
  token: string,
  userInfo: { username, phone, ... }
}
```

### testStore

管理测试流程状态：

```javascript
{
  phase: 'info' | 'intro' | 'operationTest' | 'test' | 'postTest' | 'uploading' | 'waiting',
  currentPlate: 0-9,
  postTestAnswers: { ... }
}
```

### uiStore

管理 UI 状态：

```javascript
{
  isLoading: boolean,
  loadingMessage: string,
  backgroundTheme: number
}
```

## 环境配置

在项目根目录创建 `.env` 文件：

```env
# API 地址
VITE_API_BASE_URL=http://your-api-server.com

# OpenAI API Key
VITE_OPENAI_API_KEY=your-openai-api-key
```

## API 代理配置

开发环境的 API 代理在 `vite.config.js` 中配置：

```javascript
proxy: {
  '/api': {
    target: 'http://14.103.237.160:29876',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}
```

## 代码规范

- ESLint + Prettier 格式化
- Vue 3 Composition API + `<script setup>` 语法
- 组件命名使用 PascalCase
- Composables 使用 `use` 前缀

```bash
# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

## 浏览器支持

- Chrome >= 90
- Firefox >= 90
- Safari >= 14
- Edge >= 90

> 需要支持 WebRTC、MediaRecorder API

## 开发注意事项

1. **WebRTC 连接**：需要 HTTPS 或 localhost 环境
2. **麦克风权限**：首次使用需要用户授权
3. **lamejs**：在 `main.js` 中通过 `lamejs/lame.min.js?url` 注入 script，挂载到 `window.lamejs`
4. **图片预加载**：进入测试前会预加载所有墨迹图版

## License

MIT
