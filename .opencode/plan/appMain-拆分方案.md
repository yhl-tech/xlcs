# 📋 appMain.js 拆分方案

## 🔍 **当前文件结构分析**

`script/appMain.js` 文件包含 **5650 行代码**，承担了过多职责，需要进行拆分。

### 📊 **功能模块统计**

| 功能类别 | 函数数量 | 代码行数 | 耦合度 |
|---------|---------|---------|--------|
| 画布和绘图 | ~15 | ~800 | 高 |
| 音频和TTS | ~8 | ~600 | 中 |
| 会话管理 | ~10 | ~700 | 中 |
| 测试流程 | ~12 | ~900 | 高 |
| UI状态管理 | ~20 | ~1000 | 高 |
| 报告处理 | ~8 | ~400 | 低 |
| 认证和用户 | ~6 | ~350 | 低 |
| 事件监听 | ~15 | ~500 | 高 |

---

## 🎯 **拆分策略**

采用**按功能职责拆分**的策略，确保每个模块：
- ✅ 职责单一
- ✅ 依赖明确  
- ✅ 接口清晰
- ✅ 便于测试

---

## 📁 **拆分后的文件结构**

```
script/
├── core/                    # 核心控制模块
│   ├── appController.js      # 主应用控制器 (替换 appMain.js)
│   ├── eventManager.js       # 事件管理器
│   ├── moduleLoader.js       # 模块加载器
│   └── initialization.js      # 初始化管理
│
├── ui/                      # UI 状态管理
│   ├── uiStateManager.js     # UI 状态管理器
│   ├── loadingManager.js    # 加载状态管理
│   ├── authUI.js            # 认证相关 UI
│   ├── infoFormManager.js    # 信息表单管理
│   └── displayManager.js     # 显示管理器
│
├── canvas/                  # 画布和绘图功能
│   ├── canvasManager.js     # 画布管理器
│   ├── drawingTools.js      # 绘图工具管理
│   ├── drawingEvents.js     # 绘图事件处理
│   ├── canvasState.js       # 画布状态管理
│   └── transformManager.js  # 图像变换管理
│
├── audio/                   # 音频和语音功能
│   ├── audioManager.js      # 音频管理器
│   ├── ttsManager.js        # TTS 管理器
│   ├── playbackController.js # 播放控制器
│   └── audioEffects.js      # 音频效果
│
├── session/                 # 会话和持久化
│   ├── sessionManager.js    # 会话管理器
│   ├── persistenceManager.js # 持久化管理器
│   ├── snapshotManager.js   # 快照管理器
│   └── stateSynchronizer.js # 状态同步器
│
├── test/                    # 测试流程管理
│   ├── testFlowController.js  # 测试流程控制器
│   ├── navigationManager.js   # 导航管理器
│   ├── inactivityMonitor.js  # 不活动监控
│   ├── testInitializer.js     # 测试初始化器
│   └── testStateManager.js  # 测试状态管理
│
├── report/                  # 报告处理
│   ├── reportManager.js     # 报告管理器
│   ├── reportStatusChecker.js # 报告状态检查器
│   ├── downloadManager.js   # 下载管理器
│   └── reportRenderer.js   # 报告渲染器
│
├── visual/                  # 背景和视觉效果
│   ├── backgroundManager.js  # 背景管理器
│   ├── visualEffects.js     # 视觉效果管理器
│   └── themeManager.js      # 主题管理器
│
└── utils/                   # 工具函数
    ├── constants.js         # 常量定义
    ├── validators.js        # 验证函数
    └── helpers.js           # 辅助函数
```

---

## 🔧 **详细拆分内容**

### 📄 **core/appController.js** (新的主文件)
```javascript
/**
 * 主应用控制器
 * 替代原来的 appMain.js
 */
import { ModuleLoader } from './moduleLoader.js'
import { EventManager } from './eventManager.js'
import { UIStateManager } from '../ui/uiStateManager.js'

export class AppController {
  constructor() {
    this.moduleLoader = new ModuleLoader()
    this.eventManager = new EventManager()
    this.uiStateManager = new UIStateManager()
    this.isInitialized = false
  }

  async initialize() {
    console.log('[AppController] 开始初始化应用...')
    
    try {
      // 1. 加载必需模块
      await this.moduleLoader.loadRequiredModules()
      
      // 2. 设置事件监听器
      this.eventManager.setupEventListeners()
      
      // 3. 初始化UI状态
      await this.uiStateManager.initialize()
      
      // 4. 初始化认证状态
      await this.initializeAuthentication()
      
      // 5. 初始化背景
      await this.initializeBackground()
      
      this.isInitialized = true
      console.log('[AppController] 应用初始化完成')
      
    } catch (error) {
      console.error('[AppController] 初始化失败:', error)
      throw error
    }
  }

  async initializeAuthentication() {
    // 认证初始化逻辑
  }

  async initializeBackground() {
    // 背景初始化逻辑
  }
}

// 全局实例
const appController = new AppController()

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  appController.initialize().catch(console.error)
})

export default appController
```

### 📄 **canvas/canvasManager.js**
```javascript
/**
 * 画布管理器
 * 从 appMain.js 提取的画布相关函数
 */
export class CanvasManager {
  constructor() {
    this.canvas = null
    this.ctx = null
    this.isInitialized = false
  }

  initialize() {
    this.canvas = document.getElementById('drawing-canvas')
    this.ctx = this.canvas.getContext('2d')
    this.isInitialized = true
  }

  resizeCanvas() {
    // 原始 resizeCanvas 函数
    if (!this.canvas || !this.ctx) return
    
    // ... 原有逻辑
  }

  clearCanvas() {
    // 原始 clearCanvas 函数
    if (!this.ctx) return
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  saveCanvasState(index) {
    // 原始 saveCanvasState 函数
    if (this.canvas.width > 0 && this.canvas.height > 0) {
      state.canvasStates[index] = this.canvas.toDataURL()
      saveSessionSnapshot("drawing")
    }
  }

  loadCanvasState(index) {
    // 原始 loadCanvasState 函数
    this.clearCanvas()
    const dataUrl = state.canvasStates[index]
    if (dataUrl) {
      const img = new Image()
      img.src = dataUrl
      img.onload = () => this.ctx.drawImage(img, 0, 0)
    }
  }

  updateCanvasCursor() {
    // 原始 updateCanvasCursor 函数
    if (state.tool === "none") {
      this.canvas.style.cursor = "default"
    } else if (state.tool === "pen") {
      this.canvas.style.cursor = "crosshair"
    } else if (state.tool === "eraser") {
      this.canvas.style.cursor = "grab"
    }
  }

  getCanvasCoordinates(event) {
    // 原始 getCanvasCoordinates 函数
    const rect = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width / rect.width
    const scaleY = this.canvas.height / rect.height
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    }
  }
}

export const canvasManager = new CanvasManager()
```

### 📄 **canvas/drawingTools.js**
```javascript
/**
 * 绘图工具管理器
 * 从 appMain.js 提取的绘图相关函数
 */
import { canvasManager } from './canvasManager.js'

export class DrawingTools {
  constructor() {
    this.isDrawing = false
    this.lastX = 0
    this.lastY = 0
  }

  startDrawing(e) {
    // 原始 startDrawing 函数
    if (state.tool !== "pen" && state.tool !== "eraser") {
      return
    }

    state.drawing = true
    const coords = canvasManager.getCanvasCoordinates(e)
    this.lastX = coords.x
    this.lastY = coords.y

    // 检测绘画操作（操作反应测试需要）
    if (window.operationReactionTest?.detectDrawingAction) {
      window.operationReactionTest.detectDrawingAction()
    }

    canvasManager.ctx.beginPath()
    canvasManager.ctx.moveTo(this.lastX, this.lastY)
  }

  draw(e) {
    // 原始 draw 函数
    if (!state.drawing) return

    const coords = canvasManager.getCanvasCoordinates(e)
    
    canvasManager.ctx.globalCompositeOperation = 
      state.tool === "eraser" ? "destination-out" : "source-over"
    canvasManager.ctx.strokeStyle = state.tool === "eraser" ? "#000000" : state.color
    canvasManager.ctx.lineWidth = state.tool === "eraser" ? 20 : 5
    canvasManager.ctx.lineCap = "round"
    canvasManager.ctx.lineJoin = "round"

    canvasManager.ctx.beginPath()
    canvasManager.ctx.moveTo(this.lastX, this.lastY)
    canvasManager.ctx.lineTo(coords.x, coords.y)
    canvasManager.ctx.stroke()

    this.lastX = coords.x
    this.lastY = coords.y
  }

  stopDrawing() {
    // 原始 stopDrawing 函数
    if (!state.drawing) return
    
    state.drawing = false
    canvasManager.saveCanvasState(state.currentIndex)
  }

  selectTool(tool) {
    // 原始 selectTool 函数
    state.tool = tool
    canvasManager.updateCanvasCursor()
    
    // 更新按钮状态
    document.querySelectorAll(".control-group button").forEach(btn => {
      btn.classList.remove("selected")
    })
    document.getElementById(`${tool}-tool`)?.classList.add("selected")
  }

  selectColor(color) {
    // 原始 selectColor 函数
    state.color = color
    
    // 更新颜色选择器
    document.querySelectorAll(".color-option").forEach(opt => {
      opt.classList.remove("selected")
    })
    document.querySelector(`[data-color="${color}"]`)?.classList.add("selected")
  }

  selectClearAllTool(selected) {
    // 原始 selectClearAllTool 函数
    this.clearAllDrawing()
  }

  syncColorSelectorState() {
    // 原始 syncColorSelectorState 函数
    // 同步颜色选择器状态
  }

  clearAllDrawing() {
    // 原始 clearAllDrawing 函数
    if (state.drawing) {
      this.stopDrawing()
    }

    canvasManager.clearCanvas()
    
    // 重置画布上下文状态
    canvasManager.ctx.globalCompositeOperation = "source-over"
    canvasManager.ctx.strokeStyle = state.color || "#ef4444"
    canvasManager.ctx.lineWidth = 5
    canvasManager.ctx.lineCap = "round"
    canvasManager.ctx.lineJoin = "round"
    canvasManager.ctx.beginPath()

    // 保存空的画布状态
    canvasManager.saveCanvasState(state.currentIndex)

    // 一键擦除时减少能量
    if (window.EnergyPillar?.getEnergy && window.EnergyPillar?.removeEnergy) {
      const currentEnergy = window.EnergyPillar.getEnergy()
      if (currentEnergy > 0) {
        const reduceAmount = Math.max(50, Math.floor(currentEnergy * 0.5))
        window.EnergyPillar.removeEnergy(reduceAmount)
      }
    }

    // 记录一键擦除操作
    if (window.InteractionTracker?._trackClearAll) {
      window.InteractionTracker._trackClearAll()
    }
  }
}

export const drawingTools = new DrawingTools()
```

### 📄 **audio/audioManager.js**
```javascript
/**
 * 音频管理器
 * 从 appMain.js 提取的音频相关函数
 */
export class AudioManager {
  constructor() {
    this.audioPlayer = document.getElementById("audio-player")
    this.isInitialized = false
  }

  initialize() {
    this.isInitialized = true
  }

  async playAudio(src, onendedCallback = null, options = {}) {
    // 原始 playAudio 函数
    if (!window.dialogClient || !window.dialogClient.isConnected) {
      // 降级到音频元素播放
      this.playAudioElement(src, onendedCallback, options)
      return
    }

    try {
      // 确保已连接
      if (!window.dialogClient.isConnected) {
        await window.dialogClient.connect()
      }

      // 发送 TTS 文本进行播报
      const ttsQuery = window.buildTTSQuery(src)
      await window.sendTextQuery(ttsQuery, { ensure: false })
      console.log("[播放音频] TTS 文本已发送:", src)

      // 估算播放时间
      if (onendedCallback) {
        const estimatedDuration = Math.max(2000, src.length * 250)
        setTimeout(() => {
          if (onendedCallback) {
            onendedCallback()
          }
        }, estimatedDuration)
      }
    } catch (error) {
      console.error("[播放音频] 实时对话失败:", error)
      if (options.onError) {
        options.onError(error)
      }
    }
  }

  playAudioElement(src, onendedCallback = null, options = {}) {
    // 原始音频元素播放逻辑
    if (src && src.includes && src.includes(".MP3")) {
      // 预录制的 MP3 文件
      this.audioPlayer.src = src
      this.audioPlayer.onended = onendedCallback
      this.audioPlayer.play().catch((e) => console.error("音频播放失败:", e))
    } else {
      console.warn("[播放音频] 实时对话客户端未加载，无法播放文本:", src)
    }
  }

  isAIPlaying() {
    // 原始 isAIPlaying 函数
    // 检查dialogClient是否正在播放音频
    if (window.dialogClient?.isPlaying) {
      return true
    }
    
    // 检查audioPlayer是否正在播放
    if (this.audioPlayer && !this.audioPlayer.paused) {
      return true
    }
    
    return false
  }

  stopAllPlayback() {
    // 原始 stopAllPlayback 函数
    try {
      if (window.dialogClient?.stopPlayback) {
        window.dialogClient.stopPlayback()
      }
    } catch (err) {
      console.warn("[播放控制] 停止实时播报失败:", err)
    }
    
    if (this.audioPlayer && !this.audioPlayer.paused) {
      try {
        this.audioPlayer.pause()
        this.audioPlayer.currentTime = 0
      } catch (err) {
        console.warn("[播放控制] 停止音频元素失败:", err)
      }
    }
  }

  async playWelcomeMessage() {
    // 原始 playWelcomeMessage 函数
    if (!window.shouldPlayWelcomeMessage || window.isCheckingReportStatus) {
      return
    }
    
    const welcomeText = window.getWelcomeText?.()
    if (!welcomeText) return

    try {
      // 使用TTS播报欢迎信息
      await this.playAudio(welcomeText)
      console.log("[欢迎页] 欢迎信息播报已发送")
    } catch (error) {
      console.warn("[欢迎页] 欢迎信息播报失败:", error)
    }
  }

  playRandomPrompt() {
    // 原始 playRandomPrompt 函数
    const prompts = window.getRandomPromptText?.()
    if (prompts) {
      this.playAudio(prompts)
    }
  }
}

export const audioManager = new AudioManager()
```

### 📄 **session/sessionManager.js**
```javascript
/**
 * 会话管理器
 * 从 appMain.js 提取的会话相关函数
 */
export class SessionManager {
  constructor() {
    this.sessionSaveTimer = null
    this.pendingSessionSnapshot = null
    this.sessionManagerReady = false
    this.latestSnapshotVersion = 0
    this.restoreSnapshotCache = null
    this.restoringFromSnapshot = false
  }

  initialize() {
    this.sessionManagerReady = true
  }

  buildSessionSnapshot(reason = "manual") {
    // 原始 buildSessionSnapshot 函数
    return {
      sessionId: state.sessionId,
      sessionVersion: state.sessionVersion,
      currentIndex: state.currentIndex,
      zoom: state.zoom,
      rotation: state.rotation,
      tool: state.tool,
      color: state.color,
      canvasStates: state.canvasStates,
      basicInfoDraft: state.basicInfoDraft,
      completed: state.completed,
      lastSnapshotReason: reason,
      timestamp: new Date().getTime()
    }
  }

  saveSessionSnapshot(reason = "manual", options = {}) {
    // 原始 saveSessionSnapshot 函数
    const { immediate = false } = options || {}
    state.lastSnapshotReason = reason
    this.scheduleSessionSave(reason, immediate)
  }

  scheduleSessionSave(reason = "manual", immediate = false) {
    // 原始 scheduleSessionSave 函数
    if (!this.sessionManagerReady || !window.SessionManager) {
      return
    }
    
    const snapshot = this.buildSessionSnapshot(reason)
    if (!snapshot) return
    
    this.pendingSessionSnapshot = snapshot

    if (immediate) {
      this.flushPendingSessionSnapshot(true)
      return
    }

    clearTimeout(this.sessionSaveTimer)
    this.sessionSaveTimer = setTimeout(() => {
      this.flushPendingSessionSnapshot()
    }, window.SESSION_SAVE_DEBOUNCE || 1000)
  }

  flushPendingSessionSnapshot(force = false) {
    // 原始 flushPendingSessionSnapshot 函数
    // ... 原有逻辑
  }

  loadSessionSnapshot(options = {}) {
    // 原始 loadSessionSnapshot 函数
    // ... 原有逻辑
  }

  getStoredSnapshot() {
    // 原始 getStoredSnapshot 函数
    // ... 原有逻辑
  }

  canRestoreSnapshot(snapshot) {
    // 原始 canRestoreSnapshot 函数
    // ... 原有逻辑
  }

  applySnapshotToState(snapshot) {
    // 原始 applySnapshotToState 函数
    // ... 原有逻辑
  }
}

export const sessionManager = new SessionManager()
```

---

## 🚀 **迁移步骤**

### **第一阶段：基础架构搭建**
1. ✅ 创建新的目录结构
2. ✅ 创建 `core/appController.js` 作为新的主文件
3. ✅ 创建 `core/eventManager.js` 和 `core/moduleLoader.js`
4. ✅ 创建 `utils/constants.js` 存放常量

### **第二阶段：UI 模块拆分**
1. ✅ 拆分认证 UI 到 `ui/authUI.js`
2. ✅ 拆分信息表单管理到 `ui/infoFormManager.js`
3. ✅ 拆分加载状态管理到 `ui/loadingManager.js`
4. ✅ 拆分 UI 状态管理到 `ui/uiStateManager.js`

### **第三阶段：核心功能拆分**
1. ✅ 拆分画布功能到 `canvas/canvasManager.js`
2. ✅ 拆分绘图工具到 `canvas/drawingTools.js`
3. ✅ 拆分图像变换到 `canvas/transformManager.js`
4. ✅ 拆分音频功能到 `audio/audioManager.js`
5. ✅ 拆分 TTS 功能到 `audio/ttsManager.js`

### **第四阶段：状态管理拆分**
1. ✅ 拆分会话管理到 `session/sessionManager.js`
2. ✅ 拆分持久化管理到 `session/persistenceManager.js`
3. ✅ 拆分快照管理到 `session/snapshotManager.js`

### **第五阶段：流程管理拆分**
1. ✅ 拆分测试流程到 `test/testFlowController.js`
2. ✅ 拆分导航功能到 `test/navigationManager.js`
3. ✅ 拆分不活动监控到 `test/inactivityMonitor.js`

### **第六阶段：报告处理拆分**
1. ✅ 拆分报告管理到 `report/reportManager.js`
2. ✅ 拆分下载功能到 `report/downloadManager.js`
3. ✅ 拆分背景管理到 `visual/backgroundManager.js`

### **第七阶段：测试和优化**
1. ✅ 测试每个拆分后的模块
2. ✅ 优化模块间的依赖关系
3. ✅ 性能测试和优化
4. ✅ 文档更新

---

## 📊 **拆分优势**

### ✅ **代码可维护性**
- 🎯 每个文件职责单一，易于理解
- 🔄 降低代码耦合度，减少修改影响范围
- 👥 便于团队协作开发，减少冲突

### ✅ **性能优化**
- ⚡ 按需加载模块，减少初始加载时间
- 📦 减少主文件体积，提高加载速度
- 🗂️ 支持代码分割和懒加载

### ✅ **测试友好**
- 🧪 单元测试更容易编写和维护
- 🔒 模块间隔离测试，避免测试干扰
- 🎭 Mock 依赖更简单，测试更稳定

### ✅ **扩展性**
- 🆕 新功能更容易添加，不影响现有代码
- 🔄 模块可以独立升级和替换
- 🎨 支持插件化架构

---

## ⚠️ **注意事项**

### **依赖管理**
- 📋 需要明确模块间的依赖关系图
- 📦 使用 ES6 模块化导入/导出
- 🚫 避免循环依赖，使用依赖注入

### **全局状态**
- 🏪 状态管理需要统一，避免状态不一致
- 🔄 使用状态管理器管理共享状态
- 🎯 避免直接操作 DOM，通过管理器操作

### **事件系统**
- 📡 使用统一的事件总线进行模块间通信
- 🔗 避免直接函数调用，降低耦合
- 🎪 支持事件解耦和异步处理

### **向后兼容**
- 🔄 保持 API 接口不变
- 📚 确保现有功能正常工作
- 🚀 渐进式重构，降低风险

---

## 🎯 **推荐的实施顺序**

### **优先级 1：核心架构**
1. 创建新的目录结构
2. 创建核心控制器和事件管理器
3. 提取常量和工具函数

### **优先级 2：独立模块**
1. 拆分画布相关功能（最独立）
2. 拆分音频相关功能
3. 拆分会话管理功能

### **优先级 3：UI 模块**
1. 拆分认证和表单管理
2. 拆分加载状态管理
3. 拆分整体 UI 状态管理

### **优先级 4：流程管理**
1. 拆分测试流程控制
2. 拆分导航和状态管理
3. 拆分报告处理功能

### **优先级 5：优化整合**
1. 测试所有拆分后的模块
2. 优化模块间的依赖关系
3. 性能测试和优化

---

## 🔗 **模块依赖关系图**

```
appController.js
├── moduleLoader.js
├── eventManager.js
├── uiStateManager.js
├── canvasManager.js
├── audioManager.js
├── sessionManager.js
└── testFlowController.js

uiStateManager.js
├── authUI.js
├── infoFormManager.js
└── loadingManager.js

canvasManager.js
├── drawingTools.js
├── transformManager.js
└── canvasState.js

audioManager.js
├── ttsManager.js
└── playbackController.js

sessionManager.js
├── persistenceManager.js
├── snapshotManager.js
└── stateSynchronizer.js

testFlowController.js
├── navigationManager.js
├── inactivityMonitor.js
└── testStateManager.js
```

---

## 📝 **实施检查清单**

### **准备阶段**
- [ ] 备份原始代码
- [ ] 创建新的目录结构
- [ ] 制定详细的实施计划
- [ ] 设置测试环境

### **实施阶段**
- [ ] 按优先级拆分模块
- [ ] 每个模块拆分后进行测试
- [ ] 更新模块间的导入/导出
- [ ] 处理依赖关系

### **测试阶段**
- [ ] 单元测试每个模块
- [ ] 集成测试模块间协作
- [ ] 端到端测试完整流程
- [ ] 性能测试和优化

### **部署阶段**
- [ ] 代码审查
- [ ] 文档更新
- [ ] 部署到测试环境
- [ ] 生产环境部署

---

## 🎊 **总结**

这个拆分方案将把一个 **5650 行的巨大文件** 拆分为 **20+ 个职责明确的模块**，每个模块平均 **200-300 行**，大大提高了代码的：

- 🧹 **可维护性** - 每个模块职责单一
- ⚡ **性能** - 支持按需加载
- 🧪 **可测试性** - 便于单元测试
- 🔄 **可扩展性** - 易于添加新功能

通过这个重构，项目将变得更加现代化、模块化，为后续的功能扩展和维护奠定了坚实的基础。

---

*本文档生成时间：2026-01-14*
*方案制定者：AI Assistant*