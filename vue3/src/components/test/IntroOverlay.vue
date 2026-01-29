<template>
  <div class="intro-overlay">
    <div class="intro-preview-layout">
      <!-- 左侧：预览窗口 -->
      <div class="intro-preview-panel test-preview-panel">
        <div class="test-preview-window">
          <div class="test-preview-body">
            <!-- 图片预览区域 -->
            <div class="test-preview-image-area">
              <div class="test-preview-image-frame">
                <img
                  ref="imageRef"
                  src="/images/rorschach-blot-example.webp"
                  alt="示例墨迹图"
                  class="intro-preview-image"
                  :style="imageTransform"
                />
                <canvas 
                  ref="canvasRef" 
                  class="test-preview-canvas"
                  @mousedown="handleMouseDown"
                  @mousemove="handleMouseMove"
                  @mouseup="handleMouseUp"
                  @mouseleave="handleMouseUp"
                  @touchstart="handleTouchStart"
                  @touchmove="handleTouchMove"
                  @touchend="handleTouchEnd"
                ></canvas>
              </div>
            </div>

            <!-- 控制按钮 -->
            <div class="test-preview-controls">
              <div class="control-group">
                <button 
                  ref="zoomInBtn"
                  :disabled="!operationEnabled"
                  :class="{ 'operation-hint-blink': currentStep === 'zoom-in' }"
                  data-action="zoom-in"
                  @click="handleZoomIn"
                >
                  🔍+ 放大
                </button>
                <button 
                  ref="zoomOutBtn"
                  :disabled="!operationEnabled"
                  :class="{ 'operation-hint-blink': currentStep === 'zoom-out' }"
                  data-action="zoom-out"
                  @click="handleZoomOut"
                >
                  🔍- 缩小
                </button>
                <button 
                  ref="rotateLeftBtn"
                  :disabled="!operationEnabled"
                  :class="{ 'operation-hint-blink': currentStep === 'rotate-left' }"
                  data-action="rotate-left"
                  @click="handleRotateLeft"
                >
                  ↶ 左转
                </button>
                <button 
                  ref="rotateRightBtn"
                  :disabled="!operationEnabled"
                  :class="{ 'operation-hint-blink': currentStep === 'rotate-right' }"
                  data-action="rotate-right"
                  @click="handleRotateRight"
                >
                  ↷ 右转
                </button>
              </div>
              <div class="control-group">
                <button 
                  ref="penBtn"
                  :disabled="!operationEnabled"
                  :class="{ 
                    selected: currentTool === 'pen', 
                    'operation-hint-blink': currentStep === 'pen' 
                  }"
                  data-action="pen"
                  @click="handleSelectPen"
                >
                  ✏️ 画笔
                </button>
                <div class="color-selector">
                  <div 
                    class="color-option" 
                    :class="{ selected: currentColor === 'red' }"
                    style="background-color: #ef4444"
                    data-color="red"
                    @click="handleSelectColor('red')"
                  ></div>
                  <div 
                    class="color-option" 
                    :class="{ 
                      selected: currentColor === 'green',
                      'color-hint-blink': currentStep === 'pen' && needsGreenColor
                    }"
                    style="background-color: #10b981"
                    data-color="green"
                    @click="handleSelectColor('green')"
                  ></div>
                  <div 
                    class="color-option" 
                    :class="{ selected: currentColor === 'blue' }"
                    style="background-color: #3b82f6"
                    data-color="blue"
                    @click="handleSelectColor('blue')"
                  ></div>
                </div>
                <button 
                  :disabled="!operationEnabled"
                  data-action="erase"
                  @click="handleSelectEraser"
                >
                  🗑️ 擦除
                </button>
                <button 
                  ref="clearBtn"
                  :disabled="!operationEnabled"
                  :class="{ 'operation-hint-blink': currentStep === 'clear' }"
                  data-action="clear"
                  @click="handleClear"
                >
                  🧹 一键擦除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：说明文本 -->
      <div class="intro-info-panel">
        <div class="intro-info-header">
          <div class="intro-info-icon">🎧</div>
          <div>
            <p class="intro-info-label">测试说明与反应测试</p>
          </div>
        </div>

        <div class="intro-info-text">
          <p>
            <strong>1</strong>.现在我来介绍一下这个测试是如何进行的。在页面的左侧，您可以看到一张墨迹图片，它是一张样例图片，在正式测试过程中，我会依次给您展示好多张类似的墨迹图片，这些图片的绘制都是随机的，也都是抽象的，每个人从墨迹中看到的东西都各不一样。您要做的，就是通过语音告诉我，您在图中看到了什么，并且向我描述一下您所看到的东西，联想到的东西。不管看见什么，都可以自由地表述，没有什么标准答案可言。
          </p>
          <p>
            <strong>2</strong>.在页面的墨迹图片下方，有多个控制按钮，分别可以控制图片放大、缩小、向左旋转、向右旋转图片，并且还可以利用画笔，圈出来您是从图片的哪些部分看出来您所看到的东西的。请注意，我是AI数字人，在测试过程中，需要您时常利用画笔来向我勾画您所看到的东西，这样我才能够看到您指示的图片位置。
          </p>
          <p>
            <strong>3</strong>.接下来，请随我的指示，点击各个按钮。
          </p>
          <p v-if="showEnterTip">
            <strong>4</strong>.如果您确认清楚了测试的流程，那就可以点击"进入"按钮，开始本次正式的心理测试。
          </p>
        </div>

        <button 
          v-if="showEnterButton"
          class="intro-enter-btn" 
          @click="handleStart"
        >
          进入
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { stopAllAudios } from '@/utils/audioManager'

const emit = defineEmits(['start'])

const imageRef = ref(null)
const canvasRef = ref(null)

// 预览状态
const zoom = ref(1)
const rotation = ref(0)
const currentTool = ref('pen')
const currentColor = ref('red')
const isDrawing = ref(false)

// 操作反应测试状态
const currentStep = ref(null)
const operationEnabled = ref(true) // 初始就启用，方便用户探索
const showEnterButton = ref(false)
const showEnterTip = ref(false)
const needsGreenColor = ref(false)

// 绘画检测
let drawingDetected = false

// 操作步骤
const OPERATION_STEPS = [
  { id: 'zoom-in', text: '请点击放大按钮' },
  { id: 'zoom-out', text: '请点击缩小按钮' },
  { id: 'rotate-left', text: '请点击左转按钮' },
  { id: 'rotate-right', text: '请点击右转按钮' },
  { id: 'pen', text: '请点击绿色画笔，按照图中的轨迹画画', requiresDrawing: true, targetColor: 'green' },
  { id: 'clear', text: '请点击一键擦除按钮' }
]

let ctx = null

// 计算图片变换
const imageTransform = computed(() => {
  return {
    transform: `scale(${zoom.value}) rotate(${rotation.value}deg)`,
    transition: 'transform 0.3s ease'
  }
})

onMounted(async () => {
  console.log('[IntroOverlay] 组件已挂载')
  
  // 初始化画布
  if (canvasRef.value && imageRef.value) {
    const canvas = canvasRef.value
    const img = imageRef.value
    
    const initCanvas = () => {
      canvas.width = img.naturalWidth || 800
      canvas.height = img.naturalHeight || 800
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      ctx = canvas.getContext('2d')
      console.log('[IntroOverlay] 画布已初始化，尺寸:', canvas.width, 'x', canvas.height)
    }
    
    if (img.complete) {
      initCanvas()
    } else {
      img.onload = initCanvas
    }
  }

  // 开始操作反应测试
  await startOperationTest()
})

onUnmounted(() => {
  console.log('[IntroOverlay] 组件卸载，清理所有资源')
  
  // 停止所有音频
  stopAllAudios()
  
  ctx = null
})

// 开始操作反应测试
async function startOperationTest() {
  try {
    console.log('[IntroOverlay] 开始操作反应测试')
    
    // 立即显示进入按钮（允许用户跳过操作测试）
    showEnterTip.value = true
    showEnterButton.value = true
    
    // 第一步：播放介绍音频
    console.log('[IntroOverlay] 播放介绍音频...')
    await playAudioFile('intro')
    
    // 等待播报完成
    await new Promise(resolve => setTimeout(resolve, 500))

    // 操作已经在初始化时启用
    console.log('[IntroOverlay] 操作已启用，开始引导')

    // 执行操作步骤
    for (let i = 0; i < OPERATION_STEPS.length; i++) {
      const step = OPERATION_STEPS[i]
      console.log(`[IntroOverlay] 步骤 ${i + 1}/${OPERATION_STEPS.length}: ${step.id}`)
      
      currentStep.value = step.id
      
      // 画笔步骤需要提示切换绿色
      if (step.id === 'pen') {
        needsGreenColor.value = true
      }
      
      // 播放操作指令音频
      console.log(`[IntroOverlay] 播放步骤音频: ${step.id}`)
      await playAudioFile(step.id)
      
      // 等待500ms后开始等待操作
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 等待用户完成操作
      await waitForUserAction(step)
      
      // 操作完成，播放反馈音频
      console.log('[IntroOverlay] 播放完成反馈')
      await playAudioFile('complete')
      
      // 等待1秒再进入下一步
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      currentStep.value = null
      needsGreenColor.value = false
    }

    // 所有操作完成，播放最终提示
    console.log('[IntroOverlay] 播放最终提示')
    await playAudioFile('final')
    
    console.log('[IntroOverlay] 操作反应测试完成')
  } catch (error) {
    console.error('[IntroOverlay] 操作反应测试失败:', error)
    // 确保按钮可用
    operationEnabled.value = true
    showEnterTip.value = true
    showEnterButton.value = true
  }
}

// 音频文件映射（与原始代码保持一致）
const AUDIO_FILES = {
  intro: '/audio/intro_part1.MP3',
  complete: '/audio/step_complete.MP3',
  final: '/audio/intro_part2.MP3',
  steps: {
    'zoom-in': '/audio/step_zoom_in.MP3',
    'zoom-out': '/audio/step_zoom_out.MP3',
    'rotate-left': '/audio/step_rotate_left.MP3',
    'rotate-right': '/audio/step_rotate_right.MP3',
    'pen': '/audio/step_pen.MP3',
    'clear': '/audio/step_clear.MP3'
  }
}

// 播放音频文件（使用全局音频管理器）
async function playAudioFile(audioKey) {
  try {
    // 获取音频路径
    let audioPath = null
    if (audioKey === 'intro' || audioKey === 'complete' || audioKey === 'final') {
      audioPath = AUDIO_FILES[audioKey]
    } else {
      audioPath = AUDIO_FILES.steps[audioKey]
    }
    
    if (!audioPath) {
      console.warn('[IntroOverlay] 音频映射不存在:', audioKey)
      // 使用延迟模拟播放
      await new Promise(resolve => setTimeout(resolve, 2000))
      return
    }

    console.log('[IntroOverlay] 播放音频:', audioPath)
    
    // 使用全局音频管理器播放
    // 注意：全局管理器会自动追踪并在需要时停止
    const audio = new Audio(audioPath)
    const { playAudio: playGlobalAudio } = await import('@/utils/audioManager')
    await playGlobalAudio(audioPath).catch(error => {
      console.warn('[IntroOverlay] 音频播放失败，使用降级策略')
      // 降级：使用延迟模拟播放时间
      const estimatedDuration = audioKey === 'intro' ? 30000 : (audioKey === 'final' ? 10000 : 2000)
      return new Promise(resolve => setTimeout(resolve, estimatedDuration))
    })
    
    console.log('[IntroOverlay] 音频播放完成:', audioKey)
  } catch (error) {
    console.error('[IntroOverlay] 播放音频时出错:', error)
  }
}


// 存储等待 resolve 函数
const waitResolvers = new Map()

// 等待用户操作
function waitForUserAction(step) {
  return new Promise((resolve) => {
    if (step.requiresDrawing) {
      // 画笔操作：需要检测绘画
      console.log('[IntroOverlay] 等待绘画操作...')
      const checkDrawing = () => {
        if (drawingDetected) {
          drawingDetected = false
          console.log('[IntroOverlay] 绘画操作完成')
          resolve()
        } else {
          setTimeout(checkDrawing, 100)
        }
      }
      checkDrawing()
    } else {
      // 其他操作：点击即完成
      console.log('[IntroOverlay] 等待按钮点击:', step.id)
      waitResolvers.set(step.id, resolve)
    }
  })
}

// 控制按钮处理
function handleZoomIn() {
  zoom.value = Math.min(zoom.value * 1.2, 3)
  console.log('[IntroOverlay] 放大，当前缩放:', zoom.value)
  
  // 如果是当前步骤，完成步骤
  if (currentStep.value === 'zoom-in') {
    completeCurrentStep()
  }
}

function handleZoomOut() {
  zoom.value = Math.max(zoom.value / 1.2, 0.5)
  console.log('[IntroOverlay] 缩小，当前缩放:', zoom.value)
  
  if (currentStep.value === 'zoom-out') {
    completeCurrentStep()
  }
}

function handleRotateLeft() {
  rotation.value -= 15
  console.log('[IntroOverlay] 左转，当前角度:', rotation.value)
  
  if (currentStep.value === 'rotate-left') {
    completeCurrentStep()
  }
}

function handleRotateRight() {
  rotation.value += 15
  console.log('[IntroOverlay] 右转，当前角度:', rotation.value)
  
  if (currentStep.value === 'rotate-right') {
    completeCurrentStep()
  }
}

function handleSelectPen() {
  currentTool.value = 'pen'
  console.log('[IntroOverlay] 选择画笔')
  
  if (currentStep.value === 'pen') {
    console.log('[IntroOverlay] 画笔已选择，请绘画...')
  }
}

function handleSelectColor(color) {
  currentColor.value = color
  console.log('[IntroOverlay] 选择颜色:', color)
  
  if (currentStep.value === 'pen' && color === 'green') {
    currentTool.value = 'pen'
    needsGreenColor.value = false
    console.log('[IntroOverlay] 绿色画笔已就绪，请在图片上绘画...')
  }
}

function handleSelectEraser() {
  currentTool.value = 'eraser'
  console.log('[IntroOverlay] 选择擦除')
}

function handleClear() {
  // 清除画布
  if (ctx) {
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  }
  drawingDetected = false
  console.log('[IntroOverlay] 清除画布')
  
  // 如果是当前步骤，完成步骤
  if (currentStep.value === 'clear') {
    completeCurrentStep()
  }
}

// 画布交互
let lastX = 0
let lastY = 0

function handleMouseDown(e) {
  if (currentTool.value === 'pen' && operationEnabled.value) {
    isDrawing.value = true
    const rect = canvasRef.value.getBoundingClientRect()
    const scaleX = canvasRef.value.width / rect.width
    const scaleY = canvasRef.value.height / rect.height
    lastX = (e.clientX - rect.left) * scaleX
    lastY = (e.clientY - rect.top) * scaleY
  }
}

function handleMouseMove(e) {
  if (!isDrawing.value || !ctx) return

  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = canvasRef.value.width / rect.width
  const scaleY = canvasRef.value.height / rect.height
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY

  ctx.strokeStyle = currentColor.value === 'red' ? '#ef4444' : (currentColor.value === 'green' ? '#10b981' : '#3b82f6')
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(x, y)
  ctx.stroke()

  lastX = x
  lastY = y

  // 标记已检测到绘画
  if (!drawingDetected) {
    drawingDetected = true
    console.log('[IntroOverlay] 检测到绘画动作')
  }
}

function handleMouseUp() {
  isDrawing.value = false
}

// 触摸事件
function handleTouchStart(e) {
  e.preventDefault()
  if (currentTool.value === 'pen' && operationEnabled.value && e.touches.length > 0) {
    isDrawing.value = true
    const rect = canvasRef.value.getBoundingClientRect()
    const scaleX = canvasRef.value.width / rect.width
    const scaleY = canvasRef.value.height / rect.height
    const touch = e.touches[0]
    lastX = (touch.clientX - rect.left) * scaleX
    lastY = (touch.clientY - rect.top) * scaleY
  }
}

function handleTouchMove(e) {
  e.preventDefault()
  if (!isDrawing.value || !ctx || e.touches.length === 0) return

  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = canvasRef.value.width / rect.width
  const scaleY = canvasRef.value.height / rect.height
  const touch = e.touches[0]
  const x = (touch.clientX - rect.left) * scaleX
  const y = (touch.clientY - rect.top) * scaleY

  ctx.strokeStyle = currentColor.value === 'red' ? '#ef4444' : (currentColor.value === 'green' ? '#10b981' : '#3b82f6')
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(x, y)
  ctx.stroke()

  lastX = x
  lastY = y

  if (!drawingDetected) {
    drawingDetected = true
    console.log('[IntroOverlay] 检测到绘画动作（触摸）')
  }
}

function handleTouchEnd() {
  isDrawing.value = false
}

// 完成当前步骤
function completeCurrentStep() {
  const stepId = currentStep.value
  console.log('[IntroOverlay] 步骤完成:', stepId)
  
  // 调用等待中的 resolve
  const resolver = waitResolvers.get(stepId)
  if (resolver) {
    resolver()
    waitResolvers.delete(stepId)
  }
}

// 开始测试
function handleStart() {
  console.log('[IntroOverlay] 用户点击进入按钮')
  
  // 停止所有音频
  stopAllAudios()
  
  emit('start')
}
</script>

<style lang="less" scoped>
// 变量
@glass-bg: rgba(15, 23, 42, 0.75);
@glass-border: rgba(99, 102, 241, 0.3);

.intro-overlay {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 6px 10px;
  box-sizing: border-box;
  animation: fadeIn 0.5s ease-out;
  overflow: hidden;
  position: relative;
  z-index: 10;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.intro-preview-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 20px;
  width: 100%;
  max-width: 1200px;
  max-height: 100%;
  align-items: stretch;
  min-height: 0;
  overflow: hidden;
  position: relative;
  z-index: 10;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

// 预览面板
.intro-preview-panel {
  background: @glass-bg;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid @glass-border;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(99, 102, 241, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.6), rgba(139, 92, 246, 0.6), transparent);
    opacity: 0.8;
    z-index: 1;
    animation: shimmer 3s ease-in-out infinite;
  }
}

@keyframes shimmer {
  0%, 100% { opacity: 0.4; transform: translateX(-100%); }
  50% { opacity: 0.8; transform: translateX(100%); }
}

.test-preview-window {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(15, 23, 42, 0.4);
  border-radius: 12px;
  padding: 12px;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.2);
}

.test-preview-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.test-preview-image-area {
  background: rgba(15, 23, 42, 0.5);
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 8px;
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.test-preview-image-frame {
  width: 100%;
  flex: 1;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  background: rgba(0, 0, 0, 0.3);
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.intro-preview-image {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
}

.test-preview-canvas {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  cursor: crosshair;
  background: transparent;
  max-width: 90%;
  max-height: 90%;
}

// 控制按钮
.test-preview-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 6px;
  background: transparent;
}

.control-group {
  background: rgba(30, 41, 59, 0.5);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  padding: 4px 6px;
  display: flex;
  align-items: center;
  gap: 10px;

  button {
    background: rgba(51, 65, 85, 0.8);
    color: rgba(226, 232, 240, 0.95);
    border: none;
    border-radius: 6px;
    padding: 4px 8px;
    min-width: 70px;
    font-size: 12px;
    font-weight: 500;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    transition: all 0.2s ease;
    cursor: pointer;

    &:not(:disabled):hover {
      background: rgba(71, 85, 105, 0.9);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15) inset;
      transform: translateY(-1px);
      color: rgba(255, 255, 255, 1);
    }

    &:not(:disabled):active {
      transform: translateY(0);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    }

    &.selected {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.7), rgba(99, 102, 241, 0.7));
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
      color: white;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: rgba(30, 41, 59, 0.5);
      color: rgba(148, 163, 184, 0.6);
    }
  }
}

// 闪烁提示动画
.operation-hint-blink {
  animation: operationHintPulse 1s ease-in-out infinite;
  position: relative;

  &::before {
    content: "👆";
    position: absolute;
    top: -30px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 24px;
    animation: operationHintBounce 1s ease-in-out infinite;
    pointer-events: none;
    z-index: 1000;
  }
}

@keyframes operationHintPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
  }
}

@keyframes operationHintBounce {
  0%, 100% {
    transform: translateX(-50%) translateY(0);
  }
  50% {
    transform: translateX(-50%) translateY(-10px);
  }
}

.color-selector {
  display: flex;
  gap: 6px;
}

.color-option {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3), 0 2px 8px rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.5), 0 4px 12px rgba(99, 102, 241, 0.4);
  }

  &.selected {
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.7), 0 0 16px rgba(99, 102, 241, 0.6), 0 4px 12px rgba(99, 102, 241, 0.5);
    transform: scale(1.15);
  }
}

// 绿色画笔闪烁提示
.color-hint-blink {
  animation: colorHintPulse 1s ease-in-out infinite;
}

@keyframes colorHintPulse {
  0%, 100% {
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.7), 0 0 16px rgba(16, 185, 129, 0.6);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 1), 0 0 24px rgba(16, 185, 129, 0.9);
  }
}

// 说明面板
.intro-info-panel {
  background: @glass-bg;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid @glass-border;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(99, 102, 241, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.6), rgba(139, 92, 246, 0.6), transparent);
    opacity: 0.8;
    z-index: 1;
    animation: shimmer 3s ease-in-out infinite;
  }
}

.intro-info-header {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}

.intro-info-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(99, 102, 241, 0.8));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}

.intro-info-label {
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(147, 197, 253, 0.9);
  font-weight: 700;
  margin: 0;
}

.intro-info-text {
  position: relative;
  z-index: 2;
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(99, 102, 241, 0.2);
  color: rgba(226, 232, 240, 0.95);
  font-size: 13px;
  line-height: 1.7;
  border-radius: 14px;
  padding: 10px 12px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.06);
  letter-spacing: 0.015em;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #38bdf8 0%, #6366f1 50%, #8b5cf6 100%);
    border-radius: 16px 16px 0 0;
    opacity: 0.85;
  }

  p {
    margin: 0 0 10px 0;
    position: relative;
    padding-left: 24px;
    padding-top: 3px;
    text-align: justify;

    &::before {
      content: "✦";
      position: absolute;
      left: 0;
      top: 3px;
      font-size: 18px;
      opacity: 0.8;
      color: #8b5cf6;
    }

    &:last-child {
      margin-bottom: 0;
    }

    strong {
      color: rgba(147, 197, 253, 0.95);
      font-weight: 600;
      margin-right: 4px;
    }
  }

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.3);
    border-radius: 2px;
  }
}

.intro-enter-btn {
  align-self: center;
  margin-top: 4px;
  padding: 8px 22px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6);
  color: white;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  transition: all 0.3s ease;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);

  &:hover {
    background: linear-gradient(135deg, #2563eb, #4f46e5, #7c3aed);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.2) inset;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  }
}

@media (max-width: 768px) {
  .intro-overlay {
    padding: 12px;
  }

  .intro-info-text {
    font-size: 12px;
    padding: 8px 10px;
  }

  .intro-enter-btn {
    width: 100%;
  }
}
</style>
