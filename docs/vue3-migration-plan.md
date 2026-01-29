# 知己心探测试系统 - Vue 3 迁移详细计划

> **文档版本**: v2.0  
> **创建时间**: 2026-01-29  
> **状态**: 待执行

---

## 1. 项目现状分析

### 1.1 当前技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vite | 5.0.0 | 构建工具 |
| Vanilla JavaScript | ES Module | 核心逻辑 |
| Three.js | 0.182.0 | 3D 黑洞粒子背景 |
| Driver.js | 1.4.0 | 用户引导 |
| Axios | 1.13.2 | HTTP 请求 |
| lamejs | 1.2.1 | MP3 编码 |

### 1.2 代码规模统计

| 模块 | 文件 | 行数 | 迁移复杂度 |
|------|------|------|-----------|
| 主应用逻辑 | `appMain.js` | 5278 | 高 |
| 交互追踪 | `interactionTracker.js` | 1488 | 中 |
| API 交互 | `api.js` | 1405 | 低 |
| 字幕管理 | `subtitleManager.js` | 1227 | 中 |
| 黑洞背景 | `blackHoleBackground.js` | 1384 | 中 |
| 报告等待 | `waitingReport.js` | 1071 | 中 |
| 操作测试 | `operationReactionTest.js` | 956 | 中 |
| 用户引导 | `driverGuide.js` | 698 | 低 |
| TTS 客户端 | `ttsClient.js` | 596 | 高 |
| 能量柱 | `energyPillar.js` | 281 | 低 |
| 状态管理 | `appState.js` | 314 | 低 |
| 认证模块 | `auth.js` | 310 | 低 |
| 轨迹引导 | `trajectoryGuide.js` | 356 | 低 |
| 设备检测 | `deviceCheck.js` | 292 | 低 |
| 会话管理 | `sessionManager.js` | 207 | 低 |
| 音频录制 | `audioRecorder.js` | 206 | 中 |
| 报告等待流程 | `reportWaitingFlow.js` | 207 | 中 |
| 测试按钮 | `testButtons.js` | 287 | 低 |
| 图片平移 | `imagePan.js` | 200 | 低 |
| 图片预加载 | `imagePreloader.js` | ~200 | 低 |
| 问题进度 | `questionProgress.js` | 101 | 低 |
| 基本信息表单 | `basicInfoForm.js` | 183 | 低 |
| 画布触摸绘制 | `canvasTouchDraw.js` | ~150 | 中 |
| 提示词配置 | `prompts.js` | 48 | 低 |
| 工具函数 | `utils.js` | 19 | 低 |
| 加载遮罩 | `loadingOverlay.js` | 29 | 低 |
| **总计** | **约 26 个核心文件** | **约 18000 行** | - |

### 1.3 模块依赖关系

```
appMain.js (核心协调器)
├── appState.js (状态定义)
├── api.js (HTTP 请求)
│   └── axios
├── auth.js (认证)
│   └── api.js
├── ttsClient.js (语音对话)
│   ├── config.js
│   ├── audioRecorder.js
│   └── subtitleManager.js
├── sessionManager.js (会话管理)
│   └── localStorage
├── canvasTouchDraw.js (触屏绘制)
├── interactionTracker.js (交互追踪)
├── imagePan.js (图片平移)
├── imagePreloader.js (图片预加载)
├── deviceCheck.js (设备检查)
├── questionProgress.js (问题进度)
├── prompts.js (提示词)
└── utils.js (工具函数)
```

---

## 2. 迁移策略

### 2.1 总体原则

1. **并行开发**: 创建新 Vue 3 分支，不影响现有系统运行
2. **渐进式迁移**: 按模块逐步迁移，优先迁移独立性强的模块
3. **保持 API 兼容**: 后端接口不变，仅重构前端
4. **复用 CSS**: 大部分样式可直接复用，减少工作量
5. **功能对等**: 确保迁移后功能完全一致

### 2.2 目标技术栈

```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0",
    "axios": "^1.13.2",
    "three": "^0.182.0",
    "driver.js": "^1.4.0",
    "lamejs": "^1.2.1",
    "vconsole": "^3.15.1"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0",
    "eslint": "^8.0.0",
    "eslint-plugin-vue": "^9.0.0",
    "prettier": "^3.0.0"
  }
}
```

---

## 3. 目录结构设计

```
xlcs-vue3/
├── src/
│   ├── App.vue                    # 根组件
│   ├── main.js                    # 入口文件
│   │
│   ├── router/                    # 路由配置
│   │   └── index.js
│   │
│   ├── stores/                    # Pinia 状态管理
│   │   ├── authStore.js           # 认证状态
│   │   ├── testStore.js           # 测试流程状态
│   │   ├── uiStore.js             # UI 状态（弹窗、加载等）
│   │   └── sessionStore.js        # 会话状态
│   │
│   ├── composables/               # 组合式函数
│   │   ├── useApi.js              # API 调用封装
│   │   ├── useAudio.js            # 音频录制处理
│   │   ├── useCanvas.js           # 画布绘制逻辑
│   │   ├── useTTS.js              # TTS 语音合成
│   │   ├── useWebRTC.js           # WebRTC 连接管理
│   │   ├── useInteractionTracker.js  # 交互追踪
│   │   ├── useSession.js          # 会话管理
│   │   ├── useImagePreloader.js   # 图片预加载
│   │   └── useDeviceCheck.js      # 设备检测
│   │
│   ├── views/                     # 页面组件
│   │   ├── HomeView.vue           # 首页（原 home.html）
│   │   ├── LoginView.vue          # 登录页（原 login.html）
│   │   ├── TestView.vue           # 主测试页（原 index.html）
│   │   └── ReportView.vue         # 报告页面
│   │
│   ├── components/                # 可复用组件
│   │   ├── common/                # 通用组件
│   │   │   ├── BaseButton.vue
│   │   │   ├── BaseModal.vue
│   │   │   ├── BaseInput.vue
│   │   │   └── LoadingOverlay.vue
│   │   │
│   │   ├── forms/                 # 表单组件
│   │   │   ├── BasicInfoForm.vue  # 基本信息表单
│   │   │   ├── LoginForm.vue      # 登录表单
│   │   │   └── PostTestForm.vue   # 后测问卷
│   │   │
│   │   ├── test/                  # 测试相关组件
│   │   │   ├── ImageCanvas.vue    # 图版画布
│   │   │   ├── ControlsBar.vue    # 控制栏
│   │   │   ├── EnergyPillar.vue   # 能量柱
│   │   │   ├── ProgressIndicator.vue  # 进度指示器
│   │   │   ├── IntroOverlay.vue   # 介绍预览层
│   │   │   └── PostTestView.vue   # 后测视图
│   │   │
│   │   ├── media/                 # 媒体组件
│   │   │   ├── AudioRecorder.vue  # 音频录制
│   │   │   └── SubtitleDisplay.vue # 字幕显示
│   │   │
│   │   └── effects/               # 特效组件
│   │       ├── BlackHoleBackground.vue  # Three.js 背景
│   │       ├── WaitingReportView.vue    # 等待报告页
│   │       └── WordCloudCanvas.vue      # 词云动画
│   │
│   ├── utils/                     # 工具函数
│   │   ├── constants.js           # 常量定义
│   │   ├── helpers.js             # 辅助函数
│   │   └── prompts.js             # 提示语配置
│   │
│   └── assets/                    # 静态资源
│       └── styles/                # 样式文件（复用现有 CSS）
│           ├── app.css
│           ├── intro-preview-background.css
│           ├── login-background.css
│           ├── waiting-report.css
│           └── question-progress.css
│
├── public/                        # 公共资源
│   └── images/
│       └── rorschach-blot-*.webp
│
├── index.html                     # HTML 模板
├── vite.config.js                 # Vite 配置
├── .env.development               # 开发环境变量
├── .env.production                # 生产环境变量
└── package.json
```

---

## 4. 模块迁移映射

### 4.1 状态管理迁移

| 原模块 | 迁移目标 | 说明 |
|--------|---------|------|
| `appState.js` → `state` | `stores/testStore.js` | 测试流程状态 |
| `appState.js` → `sessionState` | `stores/sessionStore.js` | 会话状态 |
| `auth.js` → 用户信息 | `stores/authStore.js` | 认证状态 |
| UI 相关状态 | `stores/uiStore.js` | 弹窗、加载、主题等 |

### 4.2 Composables 迁移

| 原模块 | 迁移目标 | 复杂度 |
|--------|---------|--------|
| `api.js` | `composables/useApi.js` | 低 |
| `ttsClient.js` + `prompts.js` | `composables/useTTS.js` + `useWebRTC.js` | 高 |
| `audioRecorder.js` | `composables/useAudio.js` | 中 |
| `sessionManager.js` | `composables/useSession.js` | 低 |
| `interactionTracker.js` + `trajectoryGuide.js` | `composables/useInteractionTracker.js` | 中 |
| `canvasTouchDraw.js` + `imagePan.js` | `composables/useCanvas.js` | 中 |
| `imagePreloader.js` + `imagePreloaderWorker.js` | `composables/useImagePreloader.js` | 低 |
| `deviceCheck.js` | `composables/useDeviceCheck.js` | 低 |
| `driverGuide.js` | `composables/useGuide.js` | 低 |
| `utils.js` | `utils/helpers.js` | 低 |
| `prompts.js` | `utils/constants.js` | 低 |

### 4.3 组件迁移

| 原 HTML/JS | Vue 组件 | 说明 |
|------------|---------|------|
| `home.html` | `views/HomeView.vue` | 首页 Landing Page |
| `login.html` | `views/LoginView.vue` | 登录页面 |
| `index.html` + `appMain.js` | `views/TestView.vue` | 主测试页 |
| `#info-screen` + `basicInfoForm.js` | `components/forms/BasicInfoForm.vue` | 基本信息表单 |
| `#intro-overlay` | `components/test/IntroOverlay.vue` | 介绍预览层 |
| `#image-container` + 画布 | `components/test/ImageCanvas.vue` | 画布组件 |
| `#controls-bar` | `components/test/ControlsBar.vue` | 控制栏 |
| `#post-test-view` | `components/test/PostTestView.vue` | 后测视图 |
| `#waiting-report-view` + `waitingReport.js` | `components/effects/WaitingReportView.vue` | 等待报告页（含词云） |
| `reportWaitingFlow.js` | `components/effects/ReportFlowSteps.vue` | 报告流程步骤 |
| `blackHoleBackground.js` | `components/effects/BlackHoleBackground.vue` | Three.js 背景 |
| `energyPillar.js` | `components/test/EnergyPillar.vue` | 能量柱动画 |
| `questionProgress.js` | `components/test/QuestionProgress.vue` | 问题进度柱 |
| `subtitleManager.js` | `components/media/SubtitleDisplay.vue` | 字幕显示 |
| `loadingOverlay.js` | `components/common/LoadingOverlay.vue` | 加载遮罩 |
| `operationReactionTest.js` | 集成到 `TestView.vue` | 操作反应测试 |
| `testButtons.js` | 集成到 `TestView.vue` | 测试按钮（开发用） |

---

## 5. 实施周期规划

### 5.1 总体时间规划

| 阶段 | 内容 | 周期 | 累计 |
|------|------|------|------|
| 第 1 周 | 基础架构搭建 | 5 天 | 第 1 周 |
| 第 2 周 | 认证和 API 模块迁移 | 5 天 | 第 2 周 |
| 第 3 周 | 核心测试界面迁移 | 5 天 | 第 3 周 |
| 第 4 周 | 音频和语音系统迁移 | 5 天 | 第 4 周 |
| 第 5 周 | 视觉效果和交互系统 | 5 天 | 第 5 周 |
| 第 6 周 | 测试、优化和部署准备 | 5 天 | 第 6 周 |

**总周期**: 6 周（30 个工作日）

---

### 5.2 第 1 周：基础架构搭建

**目标**: 建立 Vue 3 项目骨架，配置开发环境

| 任务 | 预计时间 | 产出 |
|------|----------|------|
| 创建 Vue 3 项目结构 | 0.5 天 | 项目模板 |
| 配置 Vite + Vue 插件 | 0.5 天 | vite.config.js |
| 配置 Vue Router | 0.5 天 | 路由配置 |
| 配置 Pinia 状态管理 | 0.5 天 | stores 目录结构 |
| 迁移 config.js 配置 | 0.5 天 | 环境配置 |
| 设置 ESLint + Prettier | 0.5 天 | 代码规范 |
| 基础组件库搭建 | 1 天 | BaseButton、BaseModal 等 |
| 代理服务器配置 | 0.5 天 | 开发环境 API 代理 |
| 复制现有 CSS 文件 | 0.5 天 | 样式迁移 |

**关键产出文件**:

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://14.103.237.160:29876',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          vendor: ['axios', 'lamejs', 'driver.js']
        }
      }
    }
  }
})
```

```javascript
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue')
  },
  {
    path: '/test',
    name: 'Test',
    component: () => import('@/views/TestView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/report',
    name: 'Report',
    component: () => import('@/views/ReportView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})

export default router
```

---

### 5.3 第 2 周：认证和 API 模块迁移

**目标**: 完成用户认证系统和 API 通信层

| 任务 | 预计时间 | 产出 |
|------|----------|------|
| 迁移 api.js → useApi.js | 1 天 | API 调用封装 |
| 创建 authStore.js | 1 天 | 认证状态管理 |
| 创建 LoginView.vue | 1 天 | 登录页面 |
| 创建 LoginForm.vue | 0.5 天 | 登录表单组件 |
| 实现路由守卫 | 0.5 天 | 认证保护 |
| 全局错误处理 | 0.5 天 | 错误拦截器 |
| Token 自动刷新 | 0.5 天 | Token 管理 |

**关键代码示例**:

```javascript
// stores/authStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null)
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const userId = computed(() => userInfo.value?.id || null)

  async function login(phone, verificationCode) {
    const { useApi } = await import('@/composables/useApi')
    const api = useApi()
    const result = await api.phoneLogin(phone, verificationCode)
    
    token.value = result.token
    userInfo.value = result.userInfo
    
    localStorage.setItem('token', result.token)
    localStorage.setItem('userInfo', JSON.stringify(result.userInfo))
    
    return result
  }

  function logout() {
    token.value = null
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    userId,
    login,
    logout
  }
})
```

```javascript
// composables/useApi.js
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

export function useApi() {
  const authStore = useAuthStore()

  const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 30000
  })

  // 请求拦截器
  client.interceptors.request.use(config => {
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  })

  // 响应拦截器
  client.interceptors.response.use(
    response => response.data,
    error => {
      if (error.response?.status === 401) {
        authStore.logout()
      }
      return Promise.reject(error)
    }
  )

  // API 方法
  const phoneLogin = (phone, code) => client.post('/user/phoneLogin', { phone, verificationCode: code })
  const getVerificationCode = (phone) => client.post('/user/sendCode', { phone })
  const uploadMedia = (formData) => client.post('/test/uploadMedia', formData)
  const submitTestData = (data) => client.post('/test/submit', data)
  const downloadReport = (sessionId) => client.get(`/test/report/${sessionId}`)
  const checkReportStatus = (sessionId) => client.get(`/test/reportStatus/${sessionId}`)

  return {
    phoneLogin,
    getVerificationCode,
    uploadMedia,
    submitTestData,
    downloadReport,
    checkReportStatus
  }
}
```

---

### 5.4 第 3 周：核心测试界面迁移

**目标**: 完成罗夏克测试主界面和画布系统

| 任务 | 预计时间 | 产出 |
|------|----------|------|
| 创建 testStore.js | 0.5 天 | 测试流程状态 |
| 创建 TestView.vue 主框架 | 1 天 | 测试主页面 |
| 创建 BasicInfoForm.vue | 0.5 天 | 基本信息表单 |
| 创建 ImageCanvas.vue | 1.5 天 | 画布绑制组件 |
| 迁移 useCanvas.js | 0.5 天 | 画布绑制逻辑 |
| 创建 ControlsBar.vue | 0.5 天 | 控制面板 |
| 迁移 useInteractionTracker.js | 0.5 天 | 交互追踪 |

**关键代码示例**:

```javascript
// stores/testStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useTestStore = defineStore('test', () => {
  // 测试阶段
  const phase = ref('info') // info | intro | test | postTest | summary | waiting
  
  // 图版状态
  const currentPlate = ref(0)
  const totalPlates = ref(10)
  
  // 交互数据
  const interactionData = ref({
    zoom: {},
    rotate: {},
    drawingTracks: {},
    timestamps: {}
  })
  
  // 基本信息
  const basicInfo = ref({
    sex: '',
    age: '',
    education: '',
    occupation: '',
    mood: ''
  })
  
  // 后测答案
  const postTestAnswers = ref({})

  // 计算属性
  const progress = computed(() => (currentPlate.value / totalPlates.value) * 100)
  const isTestComplete = computed(() => currentPlate.value >= totalPlates.value)

  // 方法
  function setPhase(newPhase) {
    phase.value = newPhase
  }

  function nextPlate() {
    if (currentPlate.value < totalPlates.value) {
      currentPlate.value++
    }
  }

  function previousPlate() {
    if (currentPlate.value > 0) {
      currentPlate.value--
    }
  }

  function recordInteraction(type, plateIndex, data) {
    if (!interactionData.value[type][plateIndex]) {
      interactionData.value[type][plateIndex] = []
    }
    interactionData.value[type][plateIndex].push(data)
  }

  function resetTest() {
    phase.value = 'info'
    currentPlate.value = 0
    interactionData.value = { zoom: {}, rotate: {}, drawingTracks: {}, timestamps: {} }
    basicInfo.value = { sex: '', age: '', education: '', occupation: '', mood: '' }
    postTestAnswers.value = {}
  }

  return {
    phase,
    currentPlate,
    totalPlates,
    interactionData,
    basicInfo,
    postTestAnswers,
    progress,
    isTestComplete,
    setPhase,
    nextPlate,
    previousPlate,
    recordInteraction,
    resetTest
  }
})
```

```vue
<!-- components/test/ImageCanvas.vue -->
<template>
  <div class="image-container" ref="containerRef">
    <img 
      :src="currentImageSrc" 
      :style="imageStyle" 
      @load="onImageLoad"
      draggable="false"
    />
    <canvas 
      ref="canvasRef" 
      :width="canvasSize.width" 
      :height="canvasSize.height"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointerleave="handlePointerUp"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useCanvas } from '@/composables/useCanvas'
import { useTestStore } from '@/stores/testStore'

const props = defineProps({
  plateIndex: { type: Number, required: true }
})

const emit = defineEmits(['drawing-complete', 'transform-change'])

const testStore = useTestStore()
const containerRef = ref(null)
const canvasRef = ref(null)

// 图片源
const currentImageSrc = computed(() => {
  return `/images/rorschach-blot-${props.plateIndex + 1}.webp`
})

// 画布逻辑
const {
  isDrawing,
  currentTool,
  brushColor,
  brushSize,
  startDrawing,
  draw,
  stopDrawing,
  clearCanvas,
  getDrawingData
} = useCanvas(canvasRef)

// 图片变换
const scale = ref(1)
const rotation = ref(0)
const position = ref({ x: 0, y: 0 })

const imageStyle = computed(() => ({
  transform: `translate(${position.value.x}px, ${position.value.y}px) scale(${scale.value}) rotate(${rotation.value}deg)`,
  transformOrigin: 'center center'
}))

const canvasSize = ref({ width: 800, height: 600 })

// 事件处理
function handlePointerDown(e) {
  if (currentTool.value !== 'none') {
    startDrawing(e)
  }
}

function handlePointerMove(e) {
  if (isDrawing.value) {
    draw(e)
  }
}

function handlePointerUp() {
  if (isDrawing.value) {
    stopDrawing()
    // 记录绑制轨迹
    const drawingData = getDrawingData()
    testStore.recordInteraction('drawingTracks', props.plateIndex, drawingData)
  }
}

// 缩放方法
function zoomIn() {
  scale.value = Math.min(scale.value + 0.1, 3)
  testStore.recordInteraction('zoom', props.plateIndex, 1)
  emit('transform-change', { scale: scale.value, rotation: rotation.value })
}

function zoomOut() {
  scale.value = Math.max(scale.value - 0.1, 0.5)
  testStore.recordInteraction('zoom', props.plateIndex, -1)
  emit('transform-change', { scale: scale.value, rotation: rotation.value })
}

// 旋转方法
function rotateLeft() {
  rotation.value -= 15
  testStore.recordInteraction('rotate', props.plateIndex, -15)
  emit('transform-change', { scale: scale.value, rotation: rotation.value })
}

function rotateRight() {
  rotation.value += 15
  testStore.recordInteraction('rotate', props.plateIndex, 15)
  emit('transform-change', { scale: scale.value, rotation: rotation.value })
}

// 重置变换
function resetTransform() {
  scale.value = 1
  rotation.value = 0
  position.value = { x: 0, y: 0 }
}

// 图片加载
function onImageLoad() {
  // 调整画布尺寸
}

// 监听图版变化，重置状态
watch(() => props.plateIndex, () => {
  resetTransform()
  clearCanvas()
})

// 暴露方法给父组件
defineExpose({
  zoomIn,
  zoomOut,
  rotateLeft,
  rotateRight,
  resetTransform,
  clearCanvas,
  setTool: (tool) => { currentTool.value = tool }
})
</script>

<style scoped>
.image-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.image-container img {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 100%;
  max-height: 100%;
  user-select: none;
  pointer-events: none;
}

.image-container canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
}
</style>
```

---

### 5.5 第 4 周：音频和语音系统迁移

**目标**: 完成音频录制和语音对话功能

| 任务 | 预计时间 | 产出 |
|------|----------|------|
| 迁移 useAudio.js | 1 天 | 音频录制逻辑 |
| 迁移 useTTS.js | 1.5 天 | TTS 客户端 |
| 迁移 useWebRTC.js | 1 天 | WebRTC 连接 |
| 创建 SubtitleDisplay.vue | 0.5 天 | 字幕组件 |
| 创建 AudioRecorder.vue | 0.5 天 | 录音组件 |
| 音频权限处理 | 0.5 天 | 权限检查 |

**关键代码示例**:

```javascript
// composables/useTTS.js
import { ref, onUnmounted } from 'vue'

export function useTTS() {
  const isConnected = ref(false)
  const isPlaying = ref(false)
  const currentText = ref('')
  const connectionState = ref('disconnected')

  let peerConnection = null
  let dataChannel = null
  let audioElement = null

  // 获取 OpenAI 配置
  async function getConfig() {
    const response = await fetch(import.meta.env.VITE_OPENAI_CONFIG_URL)
    return response.json()
  }

  // 建立 WebRTC 连接
  async function connect(systemPrompt, speaker = 'alloy') {
    try {
      connectionState.value = 'connecting'
      const config = await getConfig()

      peerConnection = new RTCPeerConnection()

      // 添加音频轨道
      audioElement = new Audio()
      audioElement.autoplay = true
      peerConnection.ontrack = (e) => {
        audioElement.srcObject = e.streams[0]
      }

      // 创建数据通道
      dataChannel = peerConnection.createDataChannel('oai-events')
      dataChannel.onopen = () => {
        // 发送会话配置
        dataChannel.send(JSON.stringify({
          type: 'session.update',
          session: {
            instructions: systemPrompt,
            voice: speaker,
            input_audio_transcription: { model: 'whisper-1' }
          }
        }))
      }

      dataChannel.onmessage = handleMessage

      // 创建 offer
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      // 发送到 OpenAI
      const response = await fetch(config.realtimeUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/sdp'
        },
        body: offer.sdp
      })

      const answer = await response.text()
      await peerConnection.setRemoteDescription({ type: 'answer', sdp: answer })

      isConnected.value = true
      connectionState.value = 'connected'
    } catch (error) {
      connectionState.value = 'error'
      console.error('WebRTC connection failed:', error)
      throw error
    }
  }

  // 处理消息
  function handleMessage(event) {
    const message = JSON.parse(event.data)
    
    switch (message.type) {
      case 'response.audio_transcript.delta':
        currentText.value += message.delta
        break
      case 'response.audio_transcript.done':
        // 语音转录完成
        break
      case 'response.done':
        isPlaying.value = false
        break
    }
  }

  // 发送文本查询
  function sendTextQuery(text) {
    if (!isConnected.value || !dataChannel) return

    isPlaying.value = true
    currentText.value = ''

    dataChannel.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      }
    }))

    dataChannel.send(JSON.stringify({ type: 'response.create' }))
  }

  // 断开连接
  function disconnect() {
    dataChannel?.close()
    peerConnection?.close()
    audioElement?.pause()
    
    isConnected.value = false
    connectionState.value = 'disconnected'
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected,
    isPlaying,
    currentText,
    connectionState,
    connect,
    disconnect,
    sendTextQuery
  }
}
```

---

### 5.6 第 5 周：视觉效果和交互系统

**目标**: 完成 3D 背景、动画效果和交互追踪

| 任务 | 预计时间 | 产出 |
|------|----------|------|
| 创建 BlackHoleBackground.vue | 1.5 天 | Three.js 背景 |
| 创建 EnergyPillar.vue | 0.5 天 | 能量柱组件 |
| 创建 WaitingReportView.vue | 1 天 | 等待报告页 |
| 集成 driver.js 用户引导 | 0.5 天 | 用户引导 |
| 创建 HomeView.vue | 1 天 | 首页 |
| 响应式布局适配 | 0.5 天 | 移动端适配 |

**关键代码示例**:

```vue
<!-- components/effects/BlackHoleBackground.vue -->
<template>
  <div ref="containerRef" class="blackhole-container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  theme: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true }
})

const containerRef = ref(null)

let scene, camera, renderer, particles
let animationId = null

// 主题配色
const themes = [
  { primary: 0x6366f1, secondary: 0x8b5cf6 }, // 默认紫色
  { primary: 0xf43f5e, secondary: 0xec4899 }, // 粉红
  { primary: 0x22c55e, secondary: 0x10b981 }, // 绿色
  // ... 更多主题
]

onMounted(() => {
  if (props.enabled) {
    initThreeJS()
    animate()
  }
})

onUnmounted(() => {
  cleanup()
})

watch(() => props.enabled, (enabled) => {
  if (enabled) {
    initThreeJS()
    animate()
  } else {
    cleanup()
  }
})

watch(() => props.theme, (themeIndex) => {
  updateTheme(themeIndex)
})

function initThreeJS() {
  const container = containerRef.value
  if (!container) return

  // 场景
  scene = new THREE.Scene()
  
  // 相机
  camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  )
  camera.position.z = 50

  // 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  // 创建粒子系统
  createParticles()

  // 窗口调整
  window.addEventListener('resize', handleResize)
}

function createParticles() {
  const geometry = new THREE.BufferGeometry()
  const count = 5000
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  const theme = themes[props.theme] || themes[0]
  const color1 = new THREE.Color(theme.primary)
  const color2 = new THREE.Color(theme.secondary)

  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const radius = Math.random() * 50 + 10
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i3 + 2] = radius * Math.cos(phi)

    const mixRatio = Math.random()
    const color = color1.clone().lerp(color2, mixRatio)
    colors[i3] = color.r
    colors[i3 + 1] = color.g
    colors[i3 + 2] = color.b
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.8
  })

  particles = new THREE.Points(geometry, material)
  scene.add(particles)
}

function animate() {
  animationId = requestAnimationFrame(animate)

  if (particles) {
    particles.rotation.y += 0.001
    particles.rotation.x += 0.0005
  }

  renderer.render(scene, camera)
}

function handleResize() {
  const container = containerRef.value
  if (!container || !camera || !renderer) return

  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}

function updateTheme(themeIndex) {
  if (!particles) return
  // 更新粒子颜色
}

function cleanup() {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  
  window.removeEventListener('resize', handleResize)
  
  if (renderer) {
    renderer.dispose()
    containerRef.value?.removeChild(renderer.domElement)
  }
  
  if (particles) {
    particles.geometry.dispose()
    particles.material.dispose()
  }
}
</script>

<style scoped>
.blackhole-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}
</style>
```

---

### 5.7 第 6 周：测试、优化和部署

**目标**: 全面测试、性能优化和生产部署准备

| 任务 | 预计时间 | 产出 |
|------|----------|------|
| 功能完整性测试 | 1.5 天 | 测试报告 |
| 性能优化 | 1 天 | 组件懒加载、代码分割 |
| 浏览器兼容性测试 | 0.5 天 | 兼容性报告 |
| 生产环境构建配置 | 0.5 天 | 构建配置 |
| 部署脚本和文档 | 0.5 天 | 部署指南 |
| 回滚方案准备 | 0.5 天 | 回滚脚本 |
| 灰度发布准备 | 0.5 天 | 灰度策略 |

**功能测试清单**:

- [ ] 用户登录（手机号 + 验证码）
- [ ] 基本信息表单提交
- [ ] 罗夏克图版显示（10 张）
- [ ] 画布绑制功能（画笔、橡皮擦）
- [ ] 图片缩放、旋转
- [ ] 音频录制和播放
- [ ] TTS 语音对话
- [ ] 实时字幕显示
- [ ] 测试进度保存和恢复
- [ ] 后测问卷提交
- [ ] 报告生成等待页面
- [ ] 3D 背景效果
- [ ] 能量柱动画
- [ ] 移动端触屏适配
- [ ] 设备检测（麦克风、扬声器）

---

## 6. 关键技术决策

### 6.1 Composition API vs Options API

**选择**: Composition API

**原因**:
- 更好的代码组织和逻辑复用
- 更清晰的响应式数据流
- 更好的 TypeScript 支持（未来扩展）
- 与现有函数式代码风格一致

### 6.2 状态管理方案

**选择**: Pinia

**原因**:
- Vue 3 官方推荐
- 更简洁的 API
- 支持 Composition API 风格
- 更好的 DevTools 集成

### 6.3 CSS 方案

**选择**: 保留原生 CSS + Scoped Styles

**原因**:
- 复用现有约 4666 行 CSS
- 减少迁移工作量
- 避免引入额外复杂度

### 6.4 Three.js 集成方案

**选择**: 自定义封装（非 TroisJS）

**原因**:
- 现有代码复杂度较高
- 自定义封装更灵活
- 更好的性能控制

---

## 7. 风险与应对

| 风险 | 影响程度 | 应对策略 |
|------|---------|---------|
| Three.js 与 Vue 3 生命周期冲突 | 中 | 使用 `shallowRef`，手动管理内存，在 `onUnmounted` 中清理 |
| WebRTC 连接状态管理复杂 | 中 | 使用独立 composable，实现清晰的状态机 |
| Canvas 绑定性能问题 | 中 | 避免响应式包装大对象，使用 `markRaw` |
| 会话恢复逻辑复杂 | 中 | 序列化时验证数据完整性，添加版本标识 |
| 移动端触屏事件兼容 | 低 | 使用 Pointer Events API，统一处理 |
| 音频 API 浏览器差异 | 中 | 充分测试 Safari/Chrome，提供降级方案 |

---

## 8. 验收标准

### 8.1 功能验收

- 所有现有功能正常工作
- 与原系统行为一致
- 无功能缺失

### 8.2 性能指标

| 指标 | 目标值 |
|------|--------|
| 首屏加载时间 | < 3 秒 |
| 首次内容绘制 (FCP) | < 1.5 秒 |
| 组件渲染帧率 | ≥ 60 fps |
| 内存使用 | < 100 MB |
| JS Bundle 大小 | < 500 KB (gzip) |

### 8.3 兼容性要求

- Chrome 90+
- Safari 14+
- Firefox 90+
- Edge 90+
- iOS Safari 14+
- Android Chrome 90+

### 8.4 用户体验

- 无明显 UI 抖动
- 动画流畅
- 响应式布局正常
- 触屏操作流畅

---

## 9. 附录

### 9.1 参考资源

- [Vue 3 官方文档](https://vuejs.org/)
- [Pinia 官方文档](https://pinia.vuejs.org/)
- [Vue Router 4 文档](https://router.vuejs.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [Three.js 文档](https://threejs.org/docs/)

### 9.2 联系方式

如有问题，请联系项目负责人。

---

## 10. 重要补充说明

### 10.1 关键模块详解

#### prompts.js - 提示词配置
**重要性**: ⭐⭐⭐⭐⭐

包含后测访谈阶段的完整系统提示词，定义了 AI 主试的角色、行为准则和交互逻辑。

**迁移建议**:
- 作为常量配置文件迁移到 `utils/constants.js`
- 提示词内容需要完整保留，这是 TTS 系统的核心配置
- 在 `useTTS.js` 中引用

```javascript
// utils/constants.js
export const POSTTEST_PROMPT = `# 核心身份与角色
你是一个专业的罗夏墨迹测试线上AI主试...`

export function getPromptForPhase(phase) {
  switch (phase) {
    case 'posttest':
      return POSTTEST_PROMPT
    default:
      return null
  }
}
```

#### reportWaitingFlow.js - 报告流程管理
**重要性**: ⭐⭐⭐⭐

管理报告生成等待页面的步骤显示，包含：
- 5 个流程步骤（提交数据、数据校验、AI 模型计算、心理师复核、报告生成）
- 每个步骤的图标和描述文案
- ETA（预计剩余时间）计算
- 安全提示框

**迁移建议**:
- 创建 `components/effects/ReportFlowSteps.vue` 组件
- 步骤数据可以提取到 Pinia store 中管理
- 与 `WaitingReportView.vue` 配合使用

#### imagePreloaderWorker.js - Web Worker
**重要性**: ⭐⭐⭐

使用 Web Worker 在后台线程预加载图片，避免阻塞主线程。

**迁移建议**:
- Vue 3 中继续使用 Web Worker
- 在 `composables/useImagePreloader.js` 中创建和管理 Worker
- 注意 Vite 中 Worker 的导入方式：`new Worker(new URL('./worker.js', import.meta.url))`

#### trajectoryGuide.js - 轨迹引导
**重要性**: ⭐⭐⭐

首次使用画笔时显示圆形轨迹引导，帮助用户了解如何使用绘图工具。

**迁移建议**:
- 集成到 `ImageCanvas.vue` 组件中
- 使用 Canvas API 绘制引导线
- 通过 Pinia store 记录是否已显示过引导

#### basicInfoForm.js - 表单验证
**重要性**: ⭐⭐⭐⭐

包含完整的基本信息表单验证逻辑：
- 性别、年龄、学历、职业、心情字段验证
- 错误提示显示
- 表单状态同步

**迁移建议**:
- 在 `BasicInfoForm.vue` 组件中使用 Vue 3 的表单验证
- 可以使用 VeeValidate 或自定义验证逻辑
- 错误提示使用响应式状态管理

### 10.2 特别注意事项

#### 1. TTS 系统的提示词管理
TTS 系统依赖 `prompts.js` 中的提示词配置，这些提示词定义了 AI 的行为规则，**必须完整迁移，一字不差**。

#### 2. Web Worker 在 Vite 中的使用
Vite 对 Web Worker 有特殊的处理方式，需要使用：
```javascript
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
```

#### 3. Canvas 性能优化
- 避免在 Vue 响应式系统中包装大型 Canvas 对象
- 使用 `markRaw()` 或 `shallowRef()` 来存储 Canvas 相关对象
- 绘图数据不要直接存入响应式状态

#### 4. Three.js 内存管理
- 在组件卸载时必须手动清理 Three.js 资源
- 调用 `geometry.dispose()`, `material.dispose()`, `renderer.dispose()`
- 取消动画循环 `cancelAnimationFrame()`

#### 5. 图片预加载策略
- 10 张罗夏克图版需要提前预加载
- 使用 Web Worker 避免阻塞主线程
- 显示加载进度给用户

#### 6. 会话恢复的数据完整性
- 序列化数据时要验证完整性
- 添加版本标识，便于后续升级兼容
- 对大对象（如绘图轨迹）考虑压缩存储

#### 7. 移动端触屏事件
- 使用 Pointer Events API 统一处理鼠标和触摸
- 注意 `passive: false` 的使用，避免滚动冲突
- 画布绘制需要阻止默认行为

### 10.3 缺失功能清单

以下功能在现有代码中存在，但文档主体中未详细说明，请在实施时注意：

- [ ] **操作反应测试** (`operationReactionTest.js`) - 测试开始前的 6 种操作训练
- [ ] **测试按钮** (`testButtons.js`) - 开发环境的测试功能（音频录制测试、轨迹上传测试）
- [ ] **加载遮罩** (`loadingOverlay.js`) - 测试准备阶段的加载提示
- [ ] **DOM 引用** (`domRefs.js`) - 集中管理 DOM 元素引用
- [ ] **登录配置** (`loginConfig.js`) - 登录页面的配置常量
- [ ] **工具函数** (`utils.js`) - 日期格式化等辅助函数

### 10.4 数据流关键点

#### 交互数据收集
```javascript
interactionData: {
  zoom: { "1": [1, 1, -1], "2": [1] },      // 每个图版的缩放操作
  rotate: { "1": [30, -30], "2": [15] },     // 旋转角度记录
  drawingTracks: { "1": {...}, "2": {...} }, // 绘图轨迹（支持鼠标轨迹上传）
  timestamps: { "1": {...}, "2": {...} }     // 时间戳记录
}
```

#### 会话快照结构
```javascript
snapshot: {
  version: "1.0",
  timestamp: Date.now(),
  userId: "xxx",
  sessionId: "yyy",
  basicInfo: { sex, age, education, occupation, mood },
  currentPlate: 3,
  phase: "test",
  interactionData: {...},
  dialogHistory: [...],
  hasUsedZoom: true,
  // ... 更多状态
}
```

---

**文档维护**: 本文档将随项目进展持续更新。

**最后更新**: 2026-01-29  
**文档完整性**: 已补充所有关键模块和注意事项
