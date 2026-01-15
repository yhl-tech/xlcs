# 🌐 Window 挂载策略文档

## 📋 概述

本文档详细说明在 `appMain.js` 拆分过程中如何处理 `window` 对象的函数和状态挂载，确保系统的向后兼容性和稳定性。

---

## 🔍 **当前 Window 挂载分析**

### **挂载统计**
- **总挂载数量**：30+ 个函数/对象
- **主要类别**：音频、画布、会话、UI、测试流程
- **依赖模块**：operationReactionTest.js, interactionTracker.js 等

### **核心挂载清单**

#### 🎵 **音频相关**
```javascript
window.sendTextQuery = sendTextQuery           // TTS 文本发送
window.buildTTSQuery = buildTTSQuery           // TTS 查询构建
window.playAudio = playAudio                   // 音频播放
window.playTTSAudio = playTTSAudio             // TTS 音频播放
window.isAIPlaying = isAIPlaying               // AI 播放状态检查
window.stopAllPlayback = stopAllPlayback         // 停止所有播放
```

#### 🎨 **画布和预览相关**
```javascript
window.previewState = previewState             // 预览状态对象
window.previewActions = previewActions         // 预览操作对象
window.initPreviewControlButtons = initPreviewControlButtons  // 预览控制按钮初始化
window.resizeCanvas = resizeCanvas             // 画布尺寸调整
window.clearCanvas = clearCanvas               // 画布清理
window.startDrawing = startDrawing             // 开始绘画
window.stopDrawing = stopDrawing               // 停止绘画
window.selectTool = selectTool                 // 选择工具
window.selectColor = selectColor               // 选择颜色
window.clearAllDrawing = clearAllDrawing       // 清除所有绘画
```

#### 📝 **会话管理相关**
```javascript
window.buildSessionSnapshot = buildSessionSnapshot     // 构建会话快照
window.saveSessionSnapshot = saveSessionSnapshot       // 保存会话快照
window.loadSessionSnapshot = loadSessionSnapshot       // 加载会话快照
window.ensureSessionId = ensureSessionId             // 确保会话ID
window.configureSessionPersistence = configureSessionPersistence  // 配置会话持久化
```

#### 🧪 **测试流程相关**
```javascript
window.enterTestExperience = enterTestExperience     // 进入测试体验
window.startTest = startTest                         // 开始测试
window.prepareIntroExperience = prepareIntroExperience // 准备介绍体验
window.resumeTestFromSnapshot = resumeTestFromSnapshot // 从快照恢复测试
window.navigate = navigate                             // 导航
window.updateProgress = updateProgress                 // 更新进度
```

#### 📊 **报告和下载相关**
```javascript
window.downloadReport = downloadReport               // 下载报告
window.showWaitingReport = showWaitingReport         // 显示等待报告
window.showSummary = showSummary                     // 显示汇总
window.getCurrentUserId = getCurrentUserId           // 获取当前用户ID
```

#### 🎮 **工具函数**
```javascript
window.getWelcomeText = getWelcomeText               // 获取欢迎文本
window.getCurrentDiagPhase = getCurrentDiagPhase     // 获取当前诊断阶段
window.shouldSkipReportRedirect = shouldSkipReportRedirect  // 是否跳过报告重定向
window.setSkipReportRedirectFlag = setSkipReportRedirectFlag  // 设置跳过报告标志
```

---

## 📊 **依赖关系分析**

### **被其他模块引用的挂载**

#### **operationReactionTest.js 依赖**
```javascript
window.sendTextQuery    // 发送TTS文本
window.buildTTSQuery    // 构建TTS查询  
window.playAudio         // 播放音频
window.initPreviewControlButtons  // 初始化预览控制
window.previewState.color  // 获取预览颜色
```

#### **interactionTracker.js 依赖**
```javascript
window.previewState  // 访问预览状态
window.sessionState   // 访问会话状态
```

#### **其他模块依赖**
```javascript
window.EnergyPillar.getEnergy()      // 获取能量值
window.EnergyPillar.removeEnergy()   // 移除能量
window.InteractionTracker._trackClearAll()  // 记录清除操作
```

---

## 🎯 **Window 挂载策略**

### **策略选择：保持兼容的渐进式拆分**

#### **核心原则**
1. ✅ **100% 向后兼容** - 保持所有现有 window 挂载
2. ✅ **零风险迁移** - 不破坏任何现有功能
3. ✅ **渐进式重构** - 逐步迁移到模块化
4. ✅ **统一管理** - 集中管理所有全局挂载

---

## 🔧 **实施方案**

### **Phase 1: 保持兼容的模块拆分**

#### **1.1 创建全局挂载管理器**
```javascript
// utils/globalExportsManager.js
export class GlobalExportsManager {
  constructor() {
    this.exports = new Map()
    this.deprecatedExports = new Set()
  }
  
  register(name, exportFunction, module = 'unknown', deprecated = false) {
    // 注册到 window
    window[name] = exportFunction
    
    // 记录导出信息
    this.exports.set(name, {
      function: exportFunction,
      module,
      deprecated,
      usageCount: 0
    })
    
    if (deprecated) {
      this.deprecatedExports.add(name)
      console.warn(`[GlobalExports] ${name} is deprecated`)
    }
  }
  
  registerObject(name, object, module = 'unknown') {
    window[name] = object
    this.exports.set(name, {
      object,
      module,
      isObject: true
    })
  }
  
  trackUsage(name) {
    const exportInfo = this.exports.get(name)
    if (exportInfo) {
      exportInfo.usageCount++
    }
  }
  
  getUsageStats() {
    const stats = {}
    this.exports.forEach((info, name) => {
      stats[name] = {
        module: info.module,
        usageCount: info.usageCount || 0,
        deprecated: info.deprecated || false,
        isObject: info.isObject || false
      }
    })
    return stats
  }
}

// 全局实例
export const globalExportsManager = new GlobalExportsManager()
```

#### **1.2 模块级挂载注册**
```javascript
// audioManager.js
import { globalExportsManager } from '../utils/globalExportsManager.js'

export class AudioManager {
  sendTextQuery(text, options = {}) {
    // 实现
  }
  
  buildTTSQuery(text, options = {}) {
    // 实现
  }
  
  playAudio(src, callback, options = {}) {
    // 实现
  }
}

// 注册全局挂载
const audioManager = new AudioManager()
globalExportsManager.register('sendTextQuery', audioManager.sendTextQuery.bind(audioManager), 'AudioManager')
globalExportsManager.register('buildTTSQuery', audioManager.buildTTSQuery.bind(audioManager), 'AudioManager')  
globalExportsManager.register('playAudio', audioManager.playAudio.bind(audioManager), 'AudioManager')
```

#### **1.3 状态对象管理**
```javascript
// previewStateManager.js
import { globalExportsManager } from '../utils/globalExportsManager.js'

export class PreviewStateManager {
  constructor() {
    this.state = {
      zoom: 1,
      rotation: 0,
      tool: "pen",
      color: "#ef4444",
      drawing: false,
      currentImageIndex: 0,
      canvasStates: new Array(10).fill(null)
    }
    
    this.actions = {
      zoomIn: () => this.zoomIn(),
      zoomOut: () => this.zoomOut(),
      rotateLeft: () => this.rotateLeft(),
      rotateRight: () => this.rotateRight(),
      pen: () => this.selectTool('pen'),
      erase: () => this.selectTool('eraser'),
      clear: () => this.clearCanvas(),
      setColor: (color) => this.setColor(color)
    }
  }
  
  getState() {
    return this.state
  }
  
  getActions() {
    return this.actions
  }
}

// 注册状态对象
const previewStateManager = new PreviewStateManager()
globalExportsManager.registerObject('previewState', previewStateManager.getState(), 'PreviewStateManager')
globalExportsManager.registerObject('previewActions', previewStateManager.getActions(), 'PreviewStateManager')
```

---

### **Phase 2: 智能挂载优化**

#### **2.1 使用追踪和警告**
```javascript
// 添加使用追踪
function createTrackedFunction(name, originalFunction) {
  return function(...args) {
    // 记录使用情况
    globalExportsManager.trackUsage(name)
    
    // 如果是过时的函数，显示警告
    if (globalExportsManager.deprecatedExports.has(name)) {
      console.warn(`[Deprecated] ${name} is deprecated. Consider using module import instead.`)
    }
    
    return originalFunction.apply(this, args)
  }
}

// 注册带追踪的函数
globalExportsManager.register(
  'playAudio', 
  createTrackedFunction('playAudio', audioManager.playAudio.bind(audioManager)),
  'AudioManager',
  false // not deprecated
)
```

#### **2.2 开发环境增强**
```javascript
// 只在开发环境启用额外的检查和日志
if (process.env.NODE_ENV === 'development') {
  // 添加函数调用堆栈追踪
  function createDebugFunction(name, originalFunction) {
    return function(...args) {
      console.group(`[Global Call] ${name}`)
      console.trace('Call stack')
      console.log('Arguments:', args)
      const result = originalFunction.apply(this, args)
      console.log('Result:', result)
      console.groupEnd()
      return result
    }
  }
  
  // 在开发环境使用调试版本
  globalExportsManager.register(
    'sendTextQuery',
    createDebugFunction('sendTextQuery', audioManager.sendTextQuery.bind(audioManager)),
    'AudioManager'
  )
}
```

---

### **Phase 3: 统一初始化管理**

#### **3.1 自动化挂载注册**
```javascript
// core/globalExports.js
export function setupGlobalExports() {
  // 音频模块
  import('../audio/audioManager.js').then(({ audioManager, globalExportsManager }) => {
    audioManager.registerGlobalExports()
  })
  
  // 画布模块  
  import('../canvas/canvasManager.js').then(({ canvasManager }) => {
    canvasManager.registerGlobalExports()
  })
  
  // 预览状态管理
  import('../ui/previewStateManager.js').then(({ previewStateManager }) => {
    previewStateManager.registerGlobalExports()
  })
  
  // 其他模块...
}

// 在 appController.js 中调用
document.addEventListener('DOMContentLoaded', () => {
  setupGlobalExports()
  // 其他初始化...
})
```

#### **3.2 兼容性验证**
```javascript
// utils/compatibilityChecker.js
export function verifyGlobalExports() {
  const requiredExports = [
    'sendTextQuery',
    'buildTTSQuery', 
    'playAudio',
    'previewState',
    'previewActions',
    'resizeCanvas',
    'clearCanvas',
    'downloadReport',
    'enterTestExperience'
    // ... 其他必需导出
  ]
  
  const missingExports = requiredExports.filter(name => typeof window[name] === 'undefined')
  
  if (missingExports.length > 0) {
    console.error('[Compatibility] Missing global exports:', missingExports)
    return false
  }
  
  console.log('[Compatibility] All required global exports are available')
  return true
}
```

---

## 📈 **使用统计和分析**

### **获取使用数据**
```javascript
// 获取所有全局导出的使用统计
const stats = globalExportsManager.getUsageStats()

console.log('Global Exports Usage Statistics:')
Object.entries(stats).forEach(([name, info]) => {
  console.log(`${name}:`)
  console.log(`  - Module: ${info.module}`)
  console.log(`  - Usage: ${info.usageCount} times`)
  console.log(`  - Type: ${info.isObject ? 'Object' : 'Function'}`)
  console.log(`  - Deprecated: ${info.deprecated ? 'Yes' : 'No'}`)
})
```

### **识别低使用率的导出**
```javascript
// 识别可以标记为过时的导出
function identifyLowUsageExports(threshold = 10) {
  const stats = globalExportsManager.getUsageStats()
  const lowUsageExports = []
  
  Object.entries(stats).forEach(([name, info]) => {
    if (!info.isObject && info.usageCount < threshold && !info.deprecated) {
      lowUsageExports.push({
        name,
        usageCount: info.usageCount,
        module: info.module
      })
    }
  })
  
  return lowUsageExports
}
```

---

## 🔄 **迁移路径规划**

### **短期（0-2个月）**
1. ✅ 创建 `GlobalExportsManager`
2. ✅ 保持所有现有挂载
3. ✅ 添加使用统计
4. ✅ 创建兼容性检查

### **中期（2-6个月）**
1. ✅ 标记低使用率的导出为过时
2. ✅ 逐步迁移新代码使用模块化接口
3. ✅ 添加开发环境警告
4. ✅ 优化挂载性能

### **长期（6个月+）**
1. ✅ 移除零使用率的导出
2. ✅ 保留核心导出于向后兼容
3. ✅ 考虑完全模块化的时机
4. ✅ 文档化和最佳实践

---

## 🚨 **风险控制**

### **主要风险**
1. **挂载失败** - 导致其他模块调用错误
2. **循环依赖** - 模块间相互引用
3. **时机问题** - DOM 元素未加载时访问
4. **内存泄漏** - 事件监听器未清理

### **缓解措施**
```javascript
// 1. 挂载失败时的降级处理
function safeRegister(name, fallback, module) {
  try {
    const exportFunction = getModuleFunction(module, name)
    window[name] = exportFunction
  } catch (error) {
    console.warn(`[SafeRegister] ${name} registration failed, using fallback`, error)
    window[name] = fallback
  }
}

// 2. 循环依赖检测
const registrationOrder = ['audioManager', 'canvasManager', 'uiManager', 'testFlowManager']

// 3. DOM 可用性检查
function safeDOMAccess(callback, elementId) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => callback())
  } else {
    const element = document.getElementById(elementId)
    if (element) {
      callback()
    } else {
      console.warn(`[DOM] Element ${elementId} not found`)
    }
  }
}
```

---

## 📝 **最佳实践**

### **1. 挂载命名规范**
```javascript
// 推荐：模块前缀 + 功能名称
window.audioPlay = AudioManager.play        // ❌ 避免
window.playAudio = AudioManager.play       // ✅ 推荐

window.canvasResize = CanvasManager.resize // ❌ 避免  
window.resizeCanvas = CanvasManager.resize // ✅ 推荐
```

### **2. 挂载时机**
```javascript
// 推荐：在 DOM 加载完成后
document.addEventListener('DOMContentLoaded', () => {
  setupGlobalExports()
})

// 避免：在模块加载时立即挂载
window.someFunction = someFunction // ❌ 可能导致时序问题
```

### **3. 错误处理**
```javascript
// 推荐：提供降级方案
function createSafeExport(name, implementation, fallback) {
  const safeImplementation = function(...args) {
    try {
      return implementation.apply(this, args)
    } catch (error) {
      console.error(`[SafeExport] ${name} failed, using fallback:`, error)
      return fallback.apply(this, args)
    }
  }
  
  window[name] = safeImplementation
}
```

---

## 📋 **检查清单**

### **拆分前检查**
- [ ] 统计所有 window 挂载
- [ ] 分析依赖关系图
- [ ] 识别核心导出和可选导出
- [ ] 制定迁移优先级

### **拆分过程中检查**
- [ ] 每个模块的挂载注册
- [ ] 兼容性测试
- [ ] 使用统计正常工作
- [ ] 开发环境警告显示

### **拆分后验证**
- [ ] 所有全局导出可用
- [ ] 功能测试通过
- [ ] 性能影响评估
- [ ] 文档更新完成

---

## 🎊 **总结**

保持 `window` 挂载的策略可以确保：

1. **零风险迁移** - 现有代码无需修改
2. **渐进式重构** - 逐步优化到模块化
3. **可观测性** - 通过使用统计指导优化
4. **向后兼容** - 保持系统稳定性

通过 `GlobalExportsManager` 的统一管理，我们可以在保持兼容性的同时，为未来的模块化重构奠定基础。

---

*文档更新时间：2026-01-14*
*文档版本：v1.0*