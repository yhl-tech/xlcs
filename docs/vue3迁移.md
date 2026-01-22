# Vue 3 迁移计划

## 项目概况

**当前状态**: 纯原生 JavaScript (ES6+) + Vite 项目
**目标**: 迁移到 Vue 3 + Composition API + Pinia + Vue Router

**代码规模**:
- 核心文件: `script/appMain.js` (5607 行)
- 30+ 独立模块
- 总代码量: ~16,600 行

## Vue 3 项目结构

```
src/
├── main.js                    # Vue 应用入口
├── App.vue                    # 根组件
├── router/index.js            # 路由配置
├── stores/                    # Pinia 状态管理
│   ├── auth.js                # 认证状态
│   ├── test.js                # 测试流程状态
│   ├── audio.js               # 音频状态
│   ├── interaction.js         # 交互追踪
│   └── ui.js                  # UI 状态
├── composables/               # 组合式函数
│   ├── useApi.js              # API 请求
│   ├── useWebSocket.js        # WebSocket 连接
│   ├── useTTS.js              # 语音合成
│   ├── useAudioRecorder.js    # 音频录制
│   ├── useCanvas.js           # Canvas 绘图
│   └── useSessionManager.js   # 会话管理
├── views/                     # 页面组件
│   ├── LoginView.vue          # 登录页
│   ├── TestView.vue           # 测试主页
│   └── ReportWaitingView.vue  # 报告等待页
├── components/                # 可复用组件
│   ├── test/
│   │   ├── BasicInfoForm.vue
│   │   ├── TestCanvas.vue     # 核心画布组件
│   │   ├── ControlPanel.vue
│   │   └── ProgressIndicator.vue
│   ├── audio/
│   │   ├── AudioRecorder.vue
│   │   ├── SubtitleDisplay.vue
│   │   └── DeviceCheck.vue
│   └── visual/
│       ├── BlackHoleBackground.vue  # Three.js 背景
│       └── EnergyPillar.vue
└── utils/                     # 工具函数
```

## 核心迁移策略

### 1. 状态管理迁移
**从**: `script/appState.js` (自定义状态管理)
**到**: Pinia stores

**关键 Stores**:
- `authStore`: 认证、token、用户信息
- `testStore`: 测试流程、图片状态、画布状态、冷却时间
- `audioStore`: 录音、TTS、字幕
- `interactionStore`: 交互追踪数据
- `uiStore`: 加载状态、弹窗控制

### 2. 组件拆分策略
**从**: `script/appMain.js` (5607 行单文件)
**到**: 15+ Vue 组件

**核心组件**:
1. **TestCanvas.vue** - 图片展示 + Canvas 绘图
   - 图片缩放、旋转、平移
   - Canvas 画笔、擦除
   - 触摸事件支持

2. **ControlPanel.vue** - 控制按钮
   - 放大、缩小、旋转
   - 画笔、擦除、下一张
   - 冷却时间管理

3. **AudioRecorder.vue** - 音频录制
   - MediaRecorder API
   - PCM 转 MP3 (lamejs)
   - 实时波形

4. **BlackHoleBackground.vue** - Three.js 背景
   - 粒子系统
   - 主题切换动画

### 3. Composables 设计

**useCanvas.js** - Canvas 绘图逻辑
```javascript
// 封装绘图、擦除、保存/恢复画布状态
const { startDrawing, draw, stopDrawing, saveState, restoreState } = useCanvas(canvasRef)
```

**useWebSocket.js** - WebSocket 管理
```javascript
// 连接、断开、发送消息、自动清理
const { connect, disconnect, send, isConnected } = useWebSocket(url)
```

**useTTS.js** - 语音合成
```javascript
// TTS 初始化、语音播放
const { init, speak } = useTTS()
```

**useAudioRecorder.js** - 音频录制
```javascript
// 录音、停止、上传
const { startRecording, stopRecording, uploadAudio } = useAudioRecorder()
```

## 分阶段实施计划

### 阶段 1: 基础架构 (P0)
**目标**: 搭建 Vue 3 项目骨架

1. 创建 Vue 3 + Vite 项目
2. 安装依赖: `vue`, `vue-router`, `pinia`, `axios`, `three`, `driver.js`, `lamejs`
3. 配置 Vue Router (3 个路由)
4. 创建 5 个 Pinia stores (空架构)
5. 配置 axios 拦截器 (从 `script/api.js` 迁移)
6. 环境变量配置 (从 `script/config.js` 迁移)

**关键文件**:
- `src/main.js`
- `src/router/index.js`
- `src/stores/*.js`
- `vite.config.js`

### 阶段 2: 认证模块 (P0)
**目标**: 实现登录功能

1. 创建 `LoginView.vue` (从 `login.html` 迁移)
2. 实现 `authStore` (从 `script/auth.js` 迁移)
3. 实现 `useApi` composable
4. 配置路由守卫
5. Token 自动刷新机制

**关键文件**:
- `src/views/LoginView.vue`
- `src/stores/auth.js`
- `src/composables/useApi.js`
- 原始文件: `login.html`, `script/auth.js`

### 阶段 3: 测试界面核心 (P0)
**目标**: 实现核心测试功能

1. 创建 `TestView.vue` 主框架
2. 实现 `BasicInfoForm.vue` (基本信息表单)
3. 实现 `TestCanvas.vue` (图片展示 + Canvas 绘图)
   - 从 `script/canvasTouchDraw.js` 迁移绘图逻辑
   - 图片变换逻辑
4. 实现 `ControlPanel.vue` (控制按钮)
5. 实现 `testStore` (测试流程状态)
6. 实现 `useCanvas` composable

**关键文件**:
- `src/views/TestView.vue`
- `src/components/test/TestCanvas.vue`
- `src/components/test/ControlPanel.vue`
- `src/stores/test.js`
- `src/composables/useCanvas.js`
- 原始文件: `script/appMain.js` (图片展示部分), `script/canvasTouchDraw.js`

### 阶段 4: 音频系统 (P1)
**目标**: 实现语音交互功能

1. 实现 `useWebSocket` composable
2. 实现 `useTTS` composable (从 `script/ttsClient.js` 迁移)
3. 实现 `useAudioRecorder` composable (从 `script/audioRecorder.js` 迁移)
4. 创建 `AudioRecorder.vue`
5. 创建 `SubtitleDisplay.vue` (从 `script/subtitleManager.js` 迁移)
6. 创建 `DeviceCheck.vue`
7. 实现 `audioStore`

**关键文件**:
- `src/composables/useWebSocket.js`
- `src/composables/useTTS.js`
- `src/composables/useAudioRecorder.js`
- `src/components/audio/*.vue`
- `src/stores/audio.js`
- 原始文件: `script/ttsClient.js`, `script/audioRecorder.js`, `script/subtitleManager.js`

### 阶段 5: 视觉效果 (P2)
**目标**: 实现 3D 背景和动画

1. 创建 `BlackHoleBackground.vue` (从 `script/blackHoleBackground.js` 迁移)
   - Three.js 场景初始化
   - 粒子系统
   - 主题切换动画
2. 创建 `EnergyPillar.vue` (从 `script/energyPillar.js` 迁移)
3. 创建 `IntroOverlay.vue` (集成 Driver.js)
4. 实现 `useInteractionTracker` composable (从 `script/interactionTracker.js` 迁移)
5. 实现 `interactionStore`

**关键文件**:
- `src/components/visual/BlackHoleBackground.vue`
- `src/components/visual/EnergyPillar.vue`
- `src/composables/useInteractionTracker.js`
- `src/stores/interaction.js`
- 原始文件: `script/blackHoleBackground.js`, `script/energyPillar.js`, `script/interactionTracker.js`

### 阶段 6: 测试与优化 (P1)
**目标**: 确保功能完整性和性能

1. 完整流程测试
2. 会话恢复功能 (从 `script/sessionManager.js` 迁移)
3. 性能优化
   - 路由懒加载
   - 组件异步加载
   - 代码分割
4. 浏览器兼容性测试
5. 错误处理完善
6. 生产构建配置

**关键文件**:
- `src/composables/useSessionManager.js`
- `vite.config.js` (构建优化)
- 原始文件: `script/sessionManager.js`

## 技术难点与解决方案

### 1. Three.js 与 Vue 3 集成
**方案**:
- 使用 `ref` 管理 DOM 容器
- `onMounted` 初始化场景
- `onUnmounted` 清理资源
- `watch` 响应主题切换

### 2. Canvas 状态管理
**方案**:
- `useCanvas` composable 封装绘图逻辑
- `testStore.canvasStates` 数组保存每张图的画布状态
- `watch` 监听图片切换，自动保存/恢复画布

### 3. WebSocket 生命周期
**方案**:
- `useWebSocket` composable 管理连接
- `onUnmounted` 自动断开
- 重连机制
- 错误处理

### 4. 会话恢复
**方案**:
- `useSessionManager` composable
- localStorage 持久化关键状态
- 页面刷新时从 localStorage 恢复 Pinia state

## 关键原始文件映射

| 原始文件 | 迁移目标 | 优先级 |
|---------|---------|-------|
| `script/appMain.js` | 拆分为 15+ 组件 | P0 |
| `script/auth.js` | `stores/auth.js` + `composables/useApi.js` | P0 |
| `script/appState.js` | 5 个 Pinia stores | P0 |
| `script/canvasTouchDraw.js` | `composables/useCanvas.js` + `TestCanvas.vue` | P0 |
| `script/ttsClient.js` | `composables/useTTS.js` | P1 |
| `script/audioRecorder.js` | `composables/useAudioRecorder.js` | P1 |
| `script/subtitleManager.js` | `components/audio/SubtitleDisplay.vue` | P1 |
| `script/blackHoleBackground.js` | `components/visual/BlackHoleBackground.vue` | P2 |
| `script/sessionManager.js` | `composables/useSessionManager.js` | P1 |
| `script/interactionTracker.js` | `composables/useInteractionTracker.js` | P2 |

## appMain.js 详细迁移计划

`script/appMain.js` 是项目中最复杂的文件（5607 行），包含了应用的核心业务逻辑。以下是详细的拆分和迁移策略。

### 功能模块划分

#### 1. TTS/语音系统（~150 行）
**代码位置**: 131-283 行
**核心函数**:
- `ensureTTSInit()` - TTS 初始化
- `sendTTSText()` - 发送 TTS 文本
- `sendTextQuery()` - 发送文本查询
- `getCurrentDiagPhase()` - 获取当前对话阶段

**迁移目标**:
- Composable: `composables/useTTS.js`
- Store: `stores/ttsStore.js`

#### 2. 预览窗口系统（~526 行）
**代码位置**: 285-811 行
**核心功能**:
- `initPreviewCanvasInteractions()` - 画布交互初始化
- `initPreviewControlButtons()` - 控制按钮初始化
- 预览状态管理、图片切换、缩放、旋转、绘图

**迁移目标**:
- 组件: `components/PreviewWindow.vue`
- Composable: `composables/usePreviewCanvas.js`
- Store: `stores/previewStore.js`

#### 3. 会话管理系统（~630 行）
**代码位置**: 1031-1661 行
**核心函数**:
- `ensureSessionId()` - 会话 ID 管理
- `buildSessionSnapshot()` - 构建快照
- `saveSessionSnapshot()` - 保存快照
- `loadSessionSnapshot()` - 加载快照
- `resumeTestFromSnapshot()` - 从快照恢复

**迁移目标**:
- Store: `stores/sessionStore.js`
- Composable: `composables/useSession.js`

**风险**: 高 - 复杂的快照恢复逻辑，需要仔细测试

#### 4. 测试流程控制（~621 行）
**代码位置**: 1687-2308 行
**核心函数**:
- `startTest()` - 启动测试
- `prepareIntroExperience()` - 准备介绍体验
- `enterTestExperience()` - 进入测试体验
- `initTest()` - 初始化测试

**迁移目标**:
- Store: `stores/testFlowStore.js`
- 组件: `components/TestFlow.vue`

#### 5. 音频录制系统（~146 行）
**代码位置**: 2322-2468 行
**核心函数**:
- `initAudio()` - 初始化音频
- `playAudio()` - 播放音频
- 语音检测逻辑

**迁移目标**:
- Composable: `composables/useAudio.js`

#### 6. 不活动监控（~153 行）
**代码位置**: 2473-2626 行
**核心函数**:
- `playRandomPrompt()` - 播放随机提示
- `resetInactivityTimer()` - 重置不活动定时器
- `startInactivityMonitoring()` - 启动监控

**迁移目标**:
- Composable: `composables/useInactivity.js`

#### 7. 图片导航系统（~287 行）
**代码位置**: 2774-3061 行
**核心函数**:
- `navigate()` - 导航函数
- `loadImage()` - 加载图片
- `updateNavButtons()` - 更新导航按钮

**迁移目标**:
- Composable: `composables/useImageNavigation.js`
- Store: `stores/imageStore.js`

#### 8. 后测试问答系统（~336 行）
**代码位置**: 3091-3427 行
**核心函数**:
- `showPostTestView()` - 显示后测试视图
- `askNextQuestion()` - 询问下一个问题
- `handleImageSelection()` - 处理图片选择
- `goToNextQuestion()` - 进入下一个问题

**迁移目标**:
- 组件: `components/PostTestView.vue`
- Store: `stores/postTestStore.js`

#### 9. 数据提交系统（~273 行）
**代码位置**: 3430-3703 行
**核心函数**:
- `finishAndSaveData()` - 完成并保存数据
- 上传进度管理
- 重试逻辑

**迁移目标**:
- Composable: `composables/useDataSubmit.js`

**风险**: 高 - 上传重试逻辑，错误处理复杂

#### 10. 报告系统（~822 行）
**代码位置**: 3754-4576 行
**核心函数**:
- `showSummary()` - 显示汇总
- `downloadReport()` - 下载报告
- `openPublicityReport()` - 打开报告解读版
- 报告状态管理

**迁移目标**:
- 组件: `components/ReportView.vue`
- Store: `stores/reportStore.js`
- Composable: `composables/useReport.js`

#### 11. 绘图系统（~329 行）
**代码位置**: 4594-4923 行
**核心函数**:
- `updateTransform()` - 更新变换
- `startDrawing()` - 开始绘图
- `draw()` - 绘图
- `stopDrawing()` - 停止绘图
- `selectTool()` - 选择工具
- `selectColor()` - 选择颜色

**迁移目标**:
- Composable: `composables/useDrawing.js`
- Store: `stores/drawingStore.js`

**风险**: 高 - Canvas 操作，坐标转换逻辑复杂

#### 12. 重测流程（~280 行）
**代码位置**: 3857-4137 行
**核心函数**:
- `handleRetestClick()` - 处理重测点击
- `prepareForRetest()` - 准备重测
- `startRetestFlow()` - 启动重测流程
- `cleanupResourcesForRetest()` - 清理资源

**迁移目标**:
- Composable: `composables/useRetest.js`

#### 13. 认证和 UI（~230 行）
**代码位置**: 4926-5156 行
**核心函数**:
- `updateAuthUI()` - 更新认证 UI
- `setupAuthControls()` - 设置认证控制
- 登录/登出逻辑

**迁移目标**:
- Store: `stores/authStore.js`
- 组件: `components/AuthControls.vue`

#### 14. 欢迎页面（~127 行）
**代码位置**: 4964-5091 行
**核心函数**:
- `playWelcomeMessage()` - 播放欢迎消息
- `renderWelcomeText()` - 渲染欢迎文本
- `hideWelcomeText()` - 隐藏欢迎文本

**迁移目标**:
- 组件: `components/WelcomeView.vue`

#### 15. 初始化和路由（~264 行）
**代码位置**: 5343-5607 行
**核心函数**:
- `checkLoginAndInit()` - 检查登录并初始化
- `routeToReportSummaryIfAvailable()` - 路由到报告页
- `initBlackHoleBackground()` - 初始化背景
- DOMContentLoaded 事件处理

**迁移目标**:
- 主应用入口: `App.vue`
- 路由配置: `router/index.js`

### appMain.js 迁移优先级

#### 第一批（核心基础，必须先迁移）
1. **会话管理系统**（630 行）- 依赖：无
2. **认证系统**（230 行）- 依赖：无
3. **TTS 系统**（150 行）- 依赖：会话管理
4. **测试流程控制**（621 行）- 依赖：会话、TTS、认证

#### 第二批（主要功能）
5. **图片导航系统**（287 行）- 依赖：测试流程
6. **绘图系统**（329 行）- 依赖：图片导航
7. **音频录制系统**（146 行）- 依赖：测试流程
8. **预览窗口系统**（526 行）- 依赖：绘图系统

#### 第三批（辅助功能）
9. **不活动监控**（153 行）- 依赖：测试流程
10. **后测试问答系统**（336 行）- 依赖：测试流程
11. **数据提交��统**（273 行）- 依赖：后测试
12. **报告系统**（822 行）- 依赖：数据提交

#### 第四批（扩展功能）
13. **重测流程**（280 行）- 依赖：所有系统
14. **欢迎页面**（127 行）- 依赖：认证
15. **初始化和路由**（264 行）- 依赖：所有系统

### appMain.js 迁移风险评估

#### 高风险区域
- **会话管理**：复杂的快照恢复逻辑，需要仔细测试状态恢复
- **TTS 系统**：WebSocket 连接管理，状态同步复杂
- **���图系统**：Canvas 操作，坐标转换逻辑复杂
- **数据提交**：上传重试逻辑，错误处理复杂

#### 中风险区域
- **测试流程控制**：多个阶段切换，状态管理复杂
- **图片导航**：冷却时间管理，状态恢复
- **报告系统**：多种状态判断，UI 更新复杂

#### 低风险区域
- **欢迎页面**：纯展示逻辑
- **认证 UI**：简单的登录/登出
- **不活动监控**：独立的定时器逻辑

### appMain.js 迁移检查清单

迁移每个功能模块时，确保：

- [ ] 所有全局变量已迁移到 Pinia store
- [ ] 所有事件监听器已转换为 Vue 事件或 composable
- [ ] 所有 DOM 操作已转换为 Vue 模板或 ref
- [ ] 所有定时器在组件卸载时正确清理
- [ ] 所有 WebSocket 连接在组件卸载时正确关闭
- [ ] 所有 localStorage 操作已封装到 composable
- [ ] 所有函数依赖关系已正确处理
- [ ] 单元测试覆盖核心逻辑
- [ ] 集成测试验证功能完整性

## 高难度迁移模块详解

以下模块在迁移过程中会遇到特殊困难，需要特别注意。

### 1. Canvas 绘图系统（最高难度）

**难点分析**:
- **直接 DOM 操作**: 大量使用 `canvas.getContext('2d')` 进行底层绘图
- **坐标系转换**: 图片缩放、旋转后的坐标计算复杂
- **状态保存/恢复**: 需要保存每张图的画布状态（ImageData）
- **触摸事件处理**: 移动端触摸事件与鼠标事件的兼容
- **性能敏感**: 频繁的绘图操作需要优化

**迁移策略**:

```javascript
// composables/useCanvas.js
import { ref, onMounted, onUnmounted } from 'vue'

export function useCanvas(canvasRef) {
  const ctx = ref(null)
  const isDrawing = ref(false)

  // 关键点 1: 在 onMounted 中初始化 context
  onMounted(() => {
    if (canvasRef.value) {
      ctx.value = canvasRef.value.getContext('2d')
      // 设置画布尺寸
      const rect = canvasRef.value.getBoundingClientRect()
      canvasRef.value.width = rect.width * window.devicePixelRatio
      canvasRef.value.height = rect.height * window.devicePixelRatio
      ctx.value.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
  })

  // 关键点 2: 坐标转换函数
  const getCanvasCoordinates = (e, transform) => {
    const rect = canvasRef.value.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 考虑缩放和旋转的逆变换
    // 这里需要实现复杂的矩阵变换
    return { x, y }
  }

  // 关键点 3: 状态保存
  const saveState = () => {
    if (!canvasRef.value) return null
    return canvasRef.value.toDataURL('image/png')
  }

  // 关键点 4: 状态恢复
  const restoreState = (dataUrl) => {
    if (!ctx.value || !dataUrl) return
    const img = new Image()
    img.onload = () => {
      ctx.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
      ctx.value.drawImage(img, 0, 0)
    }
    img.src = dataUrl
  }

  return {
    ctx,
    isDrawing,
    saveState,
    restoreState,
    getCanvasCoordinates
  }
}
```

**注意事项**:
- Canvas 尺寸需要考虑 `devicePixelRatio` 以支持高清屏
- 坐标转换必须考虑图片的缩放、旋转、平移
- 画布状态保存使用 `toDataURL()` 会占用大量内存，需要优化
- 触摸事件需要 `preventDefault()` 防止页面滚动

### 2. Three.js 背景系统（高难度）

**难点分析**:
- **生命周期管理**: Three.js 场景需要正确初始化和清理
- **内存泄漏风险**: Geometry、Material、Texture 需要手动 dispose
- **动画循环**: `requestAnimationFrame` 需要在组件卸载时停止
- **响应式调整**: 窗口大小变化时需要更新相机和渲染器

**迁移策略**:

```vue
<!-- components/visual/BlackHoleBackground.vue -->
<template>
  <div ref="containerRef" class="blackhole-container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  themeIndex: Number
})

const containerRef = ref(null)
let scene, camera, renderer, particles
let animationId = null

onMounted(() => {
  initThreeJS()
  animate()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  // 关键点 1: 停止动画循环
  if (animationId) {
    cancelAnimationFrame(animationId)
  }

  // 关键点 2: 清理 Three.js 资源
  cleanup()

  window.removeEventListener('resize', handleResize)
})

function initThreeJS() {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })

  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  containerRef.value.appendChild(renderer.domElement)

  createParticles()
}

function createParticles() {
  // 粒子系统创建逻辑
  const geometry = new THREE.BufferGeometry()
  const material = new THREE.PointsMaterial({ size: 2, color: 0xffffff })
  particles = new THREE.Points(geometry, material)
  scene.add(particles)
}

function animate() {
  animationId = requestAnimationFrame(animate)

  // 更新粒子位置
  if (particles) {
    particles.rotation.y += 0.001
  }

  renderer.render(scene, camera)
}

function cleanup() {
  // 关键点 3: 释放所有资源
  if (particles) {
    particles.geometry.dispose()
    particles.material.dispose()
    scene.remove(particles)
  }

  if (renderer) {
    renderer.dispose()
    if (containerRef.value && renderer.domElement) {
      containerRef.value.removeChild(renderer.domElement)
    }
  }

  scene = null
  camera = null
  renderer = null
  particles = null
}

function handleResize() {
  if (!camera || !renderer) return

  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

// 关键点 4: 主题切换
watch(() => props.themeIndex, (newIndex) => {
  // 平滑过渡到新主题
  switchTheme(newIndex)
})
</script>
```

**注意事项**:
- 必须在 `onUnmounted` 中调用 `dispose()` 释放资源
- `requestAnimationFrame` 必须在组件卸载时取消
- 窗口 resize 事件监听器必须清理
- 避免在 reactive 对象中存储 Three.js 对象（会导致性能问题）

### 3. WebSocket/TTS 系统（高难度）

**难点分析**:
- **连接状态管理**: 连接、断开、重连的状态同步
- **消息队列**: 连接未建立时的消息需要缓存
- **音频播放**: PCM 音频流的实时播放
- **并发控制**: 多个组件可能同时使用 TTS
- **错误恢复**: 网络异常时的自动重连

**迁移策略**:

```javascript
// composables/useTTS.js
import { ref, onUnmounted } from 'vue'

export function useTTS() {
  const ws = ref(null)
  const isConnected = ref(false)
  const messageQueue = ref([])
  const reconnectTimer = ref(null)
  const reconnectAttempts = ref(0)
  const MAX_RECONNECT_ATTEMPTS = 5

  // 关键点 1: 连接管理
  const connect = async () => {
    return new Promise((resolve, reject) => {
      try {
        ws.value = new WebSocket(import.meta.env.VITE_WS_URL)

        ws.value.onopen = () => {
          isConnected.value = true
          reconnectAttempts.value = 0

          // 发送队列中的消息
          flushMessageQueue()
          resolve()
        }

        ws.value.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        ws.value.onclose = () => {
          isConnected.value = false
          // 关键点 2: 自动重连
          attemptReconnect()
        }

        ws.value.onmessage = handleMessage
      } catch (error) {
        reject(error)
      }
    })
  }

  // 关键点 3: 重连机制
  const attemptReconnect = () => {
    if (reconnectAttempts.value >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnect attempts reached')
      return
    }

    reconnectAttempts.value++
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.value), 30000)

    reconnectTimer.value = setTimeout(() => {
      console.log(`Reconnecting... (attempt ${reconnectAttempts.value})`)
      connect()
    }, delay)
  }

  // 关键点 4: 消息队列
  const send = (data) => {
    if (isConnected.value && ws.value) {
      ws.value.send(data)
    } else {
      // 连接未建立，加入队列
      messageQueue.value.push(data)
    }
  }

  const flushMessageQueue = () => {
    while (messageQueue.value.length > 0 && isConnected.value) {
      const message = messageQueue.value.shift()
      ws.value.send(message)
    }
  }

  const handleMessage = (event) => {
    const data = JSON.parse(event.data)

    if (data.type === 'audio') {
      // 播放 PCM 音频
      playPCMAudio(data.pcm, data.sampleRate)
    }
  }

  // 关键点 5: 清理
  const disconnect = () => {
    if (reconnectTimer.value) {
      clearTimeout(reconnectTimer.value)
    }

    if (ws.value) {
      ws.value.close()
      ws.value = null
    }

    isConnected.value = false
    messageQueue.value = []
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    connect,
    disconnect,
    send,
    isConnected
  }
}
```

**注意事项**:
- WebSocket 必须在组件卸载时关闭
- 重连定时器必须清理
- 消息队列需要考虑内存限制
- 音频播放需要处理浏览器自动播放策略

### 4. 会话快照恢复系统（高难度）

**难点分析**:
- **状态序列化**: 复杂对象（Canvas ImageData、音频状态）的序列化
- **恢复顺序**: 多个 store 的恢复顺序有依赖关系
- **版本兼容**: 快照格式变化时的向后兼容
- **数据完整性**: localStorage 容量限制和数据损坏处理

**迁移策略**:

```javascript
// composables/useSession.js
import { useTestStore } from '@/stores/test'
import { useAudioStore } from '@/stores/audio'
import { useAuthStore } from '@/stores/auth'

export function useSession() {
  const SNAPSHOT_VERSION = '1.0'
  const SNAPSHOT_KEY = 'test_session_snapshot'

  // 关键点 1: 构建快照
  const buildSnapshot = () => {
    const testStore = useTestStore()
    const audioStore = useAudioStore()

    const snapshot = {
      version: SNAPSHOT_VERSION,
      timestamp: Date.now(),
      test: {
        currentIndex: testStore.currentIndex,
        visitedImages: Array.from(testStore.visitedImages),
        stage: testStore.stage,
        // Canvas 状态需要特殊处理
        canvasStates: testStore.canvasStates.map(state =>
          state ? { dataUrl: state, compressed: true } : null
        )
      },
      audio: {
        subtitleHistory: audioStore.subtitleHistory.slice(-50) // 只保留最近 50 条
      }
    }

    return snapshot
  }

  // 关键点 2: 保存快照
  const saveSnapshot = () => {
    try {
      const snapshot = buildSnapshot()
      const serialized = JSON.stringify(snapshot)

      // 检查大小限制（localStorage 通常 5-10MB）
      if (serialized.length > 5 * 1024 * 1024) {
        console.warn('Snapshot too large, compressing...')
        // 压缩策略：移除部分 canvas 状态
        snapshot.test.canvasStates = snapshot.test.canvasStates.map((state, i) =>
          i === snapshot.test.currentIndex ? state : null
        )
      }

      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot))
    } catch (error) {
      console.error('Failed to save snapshot:', error)
      // 处理 QuotaExceededError
      if (error.name === 'QuotaExceededError') {
        clearOldSnapshots()
      }
    }
  }

  // 关键点 3: 加载快照
  const loadSnapshot = () => {
    try {
      const serialized = localStorage.getItem(SNAPSHOT_KEY)
      if (!serialized) return null

      const snapshot = JSON.parse(serialized)

      // 版本检查
      if (snapshot.version !== SNAPSHOT_VERSION) {
        console.warn('Snapshot version mismatch, migrating...')
        return migrateSnapshot(snapshot)
      }

      return snapshot
    } catch (error) {
      console.error('Failed to load snapshot:', error)
      return null
    }
  }

  // 关键点 4: 恢复状态（注意顺序）
  const restoreFromSnapshot = async (snapshot) => {
    if (!snapshot) return false

    const testStore = useTestStore()
    const audioStore = useAudioStore()

    try {
      // 1. 先恢复基础状态
      testStore.currentIndex = snapshot.test.currentIndex
      testStore.visitedImages = new Set(snapshot.test.visitedImages)
      testStore.stage = snapshot.test.stage

      // 2. 再恢复 Canvas 状态（异步）
      await restoreCanvasStates(snapshot.test.canvasStates)

      // 3. 最后恢复音频状态
      audioStore.subtitleHistory = snapshot.audio.subtitleHistory

      return true
    } catch (error) {
      console.error('Failed to restore snapshot:', error)
      return false
    }
  }

  // 关键点 5: Canvas 状态恢复
  const restoreCanvasStates = async (canvasStates) => {
    const testStore = useTestStore()

    for (let i = 0; i < canvasStates.length; i++) {
      if (canvasStates[i]) {
        testStore.canvasStates[i] = canvasStates[i].dataUrl
      }
    }
  }

  // 版本迁移
  const migrateSnapshot = (snapshot) => {
    // 处理旧版本快照格式
    return snapshot
  }

  return {
    saveSnapshot,
    loadSnapshot,
    restoreFromSnapshot
  }
}
```

**注意事项**:
- localStorage 有容量限制（通常 5-10MB）
- Canvas ImageData 转 DataURL 会占用大量空间
- 恢复顺序很重要，避免状态不一致
- 需要处理 `QuotaExceededError` 异常
- 考虑版本兼容性和数据迁移

### 5. 预览窗口系统（中高难度）

**难点分析**:
- **多模式状态**: 预览模式、绘图模式、缩放模式的切换
- **事件冲突**: 鼠标事件、触摸事件、键盘事件的协调
- **性能优化**: 频繁的图片变换需要节流
- **状态同步**: 预览窗口与主测试界面的状态同步

**迁移策略**:

```javascript
// stores/previewStore.js
import { defineStore } from 'pinia'

export const usePreviewStore = defineStore('preview', {
  state: () => ({
    isOpen: false,
    mode: 'view', // view | draw | zoom
    currentImage: null,
    transform: {
      scale: 1,
      rotation: 0,
      translateX: 0,
      translateY: 0
    },
    drawingTool: null, // pen | erase
    history: [] // 操作历史，支持撤销
  }),

  actions: {
    // 关键点 1: 模式切换
    setMode(mode) {
      // 切换模式时清理上一个模式的状态
      if (this.mode === 'draw') {
        this.saveDrawingState()
      }
      this.mode = mode
    },

    // 关键点 2: 变换操作（需要节流）
    updateTransform(delta) {
      this.transform.scale = Math.max(0.5, Math.min(3, this.transform.scale + delta.scale))
      this.transform.rotation = (this.transform.rotation + delta.rotation) % 360
      this.transform.translateX += delta.translateX || 0
      this.transform.translateY += delta.translateY || 0
    },

    // 关键点 3: 操作历史
    pushHistory(action) {
      this.history.push({
        action,
        timestamp: Date.now(),
        state: { ...this.transform }
      })

      // 限制历史记录数量
      if (this.history.length > 50) {
        this.history.shift()
      }
    }
  }
})
```

**注意事项**:
- 图片变换操作需要使用 `throttle` 或 `debounce`
- 触摸事件需要处理多点触控（缩放、旋转）
- 操作历史需要限制数量，避免内存泄漏
- 模式切换时需要清理事件监听器

### 迁移难度总结

| 模块 | 难度 | 主要挑战 | 预估时间 |
|------|------|---------|---------|
| Canvas 绘图系统 | ⭐⭐⭐⭐⭐ | DOM 操作、坐标转换、状态保存 | 3-4 天 |
| Three.js 背景 | ⭐⭐⭐⭐ | 生命周期、内存管理、动画循环 | 2-3 天 |
| WebSocket/TTS | ⭐⭐⭐⭐ | 连接管理、重连机制、消息队列 | 2-3 天 |
| 会话快照恢复 | ⭐⭐⭐⭐ | 序列化、恢复顺序、版本兼容 | 2-3 天 |
| 预览窗口系统 | ⭐⭐⭐ | 多模式状态、事件协调 | 2 天 |

### 通用迁移陷阱

1. **响应式陷阱**: 不要将 Canvas context、Three.js 对象放入 reactive
2. **内存泄漏**: 定时器、事件监听器、WebSocket 必须清理
3. **异步时序**: 组件可能在异步操作完成前卸载
4. **性能问题**: 频繁的状态更新会触发不必要的重渲染
5. **浏览器兼容**: Safari 对某些 API 的支持不同

## 依赖配置

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
    "vite": "^5.0.0"
  }
}
```

## 预估工作量

- **阶段 1**: 基础架构 - 1-2 天
- **阶段 2**: 认证模块 - 2-3 天
- **阶段 3**: 测试界面核心 - 5-7 天 (最复杂)
- **阶段 4**: 音频系统 - 4-5 天
- **阶段 5**: 视觉效果 - 3-4 天
- **阶段 6**: 测试与优化 - 3-4 天

**总计**: 约 18-25 天

## 风险与注意事项

1. **appMain.js 复杂度高**: 5600+ 行代码，需要仔细拆分，避免遗漏逻辑
2. **状态同步**: 确保 Pinia stores 之间的状态同步正确
3. **WebSocket 稳定性**: 需要完善重连和错误处理机制
4. **Canvas 性能**: 大量绘图操作需要优化性能
5. **会话恢复**: 确保刷新页面后状态正确恢复
6. **浏览器兼容性**: 测试 Safari、Chrome、移动端浏览器

## 下一步行动

1. 将此计划保存到项目文档 (`docs/vue3迁移.md`)
2. 确认迁移计划
3. 创建 Vue 3 项目骨架
4. 按阶段逐步实施
5. 每个阶段完成后进行功能测试

---

**计划状态**: 已完成，待保存到项目文档目录
