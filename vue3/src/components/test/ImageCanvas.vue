<template>
  <div
    ref="containerRef"
    class="image-canvas-container"
  >
    <!-- 图片层 - 与原始 #rorschach-image 一致 -->
    <img
      ref="imageRef"
      :src="currentImageSrc"
      :style="imageTransformStyle"
      class="rorschach-image"
      draggable="false"
      @load="handleImageLoad"
      @error="handleImageLoadError"
    >

    <!-- 画布层 - 与原始 #drawing-canvas 一致 -->
    <canvas
      ref="canvasRef"
      class="drawing-canvas"
      :style="canvasTransformStyle"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointerleave="handlePointerUp"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useImagePreloader } from '@/composables/useImagePreloader'

const imagePreloader = useImagePreloader()

const props = defineProps({
  plateIndex: {
    type: Number,
    required: true
  },
  brushColor: {
    type: String,
    default: '#ef4444' // 默认红色
  }
})

const emit = defineEmits([
  'drawing-complete', 
  'transform-change',
  'drawing-start',   // 开始绘制
  'drawing-move',    // 绘制移动
  'drawing-end'      // 结束绘制
])

// refs
const containerRef = ref(null)
const imageRef = ref(null)
const canvasRef = ref(null)

// 图片变换状态
const scale = ref(1)
const rotation = ref(0)
const panOffset = ref({ x: 0, y: 0 }) // 平移偏移

// 拖拽状态
const isPanning = ref(false)
let panStartX = 0
let panStartY = 0
let panStartOffsetX = 0
let panStartOffsetY = 0

// 绘图状态
const isDrawing = ref(false)
const currentTool = ref('none') // none, pen, eraser
const brushSize = ref(3)

// 绘图数据
const drawingHistory = ref([])
const currentStroke = ref([])

// 内部画笔颜色（可被 setBrushColor 更新）
const internalBrushColor = ref('#ef4444')

// 图片切换状态
const displayedPlateIndex = ref(props.plateIndex) // 当前显示的图片索引
const imageOpacity = ref(1) // 图片透明度
const isTransitioning = ref(false) // 是否正在切换

// 计算属性 - 使用 displayedPlateIndex 而不是 props.plateIndex
const currentImageSrc = computed(() => {
  // 使用懒加载器获取图片 URL（优先返回缓存的 Blob URL）
  return imagePreloader.getImageUrl(displayedPlateIndex.value)
})

// 图片变换样式 - 包含平移、缩放、旋转
const imageTransformStyle = computed(() => ({
  transform: `translate(${panOffset.value.x}px, ${panOffset.value.y}px) scale(${scale.value}) rotate(${rotation.value}deg)`,
  opacity: imageOpacity.value,
  cursor: canPan() ? (isPanning.value ? 'grabbing' : 'grab') : 'default'
}))

// 画布变换样式 - 与图片保持同步
const canvasTransformStyle = computed(() => ({
  transform: `translate(calc(-50% + ${panOffset.value.x}px), calc(-50% + ${panOffset.value.y}px)) scale(${scale.value}) rotate(${rotation.value}deg)`
}))

// 判断是否可以拖拽
function canPan() {
  // 只有在非绘图工具且放大时才能拖拽
  return currentTool.value === 'none' && scale.value > 1
}

// 监听外部 brushColor 变化
watch(() => props.brushColor, (newColor) => {
  internalBrushColor.value = newColor
})

// 初始化画布
onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  internalBrushColor.value = props.brushColor
  
  // 添加拖拽事件监听（在容器上）
  const container = containerRef.value
  if (container) {
    container.addEventListener('mousedown', handleContainerMouseDown)
    container.addEventListener('mousemove', handleContainerMouseMove)
    container.addEventListener('mouseup', handleContainerMouseUp)
    container.addEventListener('mouseleave', handleContainerMouseUp)
    container.addEventListener('touchstart', handleContainerTouchStart, { passive: false })
    container.addEventListener('touchmove', handleContainerTouchMove, { passive: false })
    container.addEventListener('touchend', handleContainerTouchEnd)
    container.addEventListener('touchcancel', handleContainerTouchEnd)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  
  // 移除拖拽事件监听
  const container = containerRef.value
  if (container) {
    container.removeEventListener('mousedown', handleContainerMouseDown)
    container.removeEventListener('mousemove', handleContainerMouseMove)
    container.removeEventListener('mouseup', handleContainerMouseUp)
    container.removeEventListener('mouseleave', handleContainerMouseUp)
    container.removeEventListener('touchstart', handleContainerTouchStart)
    container.removeEventListener('touchmove', handleContainerTouchMove)
    container.removeEventListener('touchend', handleContainerTouchEnd)
    container.removeEventListener('touchcancel', handleContainerTouchEnd)
  }
})

// 预加载图片（使用懒加载器）
function preloadImage(index) {
  return new Promise((resolve) => {
    // 如果已经缓存，直接返回
    if (imagePreloader.isImageLoaded(index)) {
      resolve(true)
      return
    }
    
    // 触发预加载
    imagePreloader.preloadImage(index)
    
    // 等待加载完成
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = imagePreloader.getImageUrl(index)
  })
}

// 监听图版变化 - 添加平滑切换动画
watch(() => props.plateIndex, async (newIndex, oldIndex) => {
  if (oldIndex !== undefined && newIndex !== oldIndex && !isTransitioning.value) {
    isTransitioning.value = true
    
    // 1. 预加载新图片
    await preloadImage(newIndex)
    
    // 2. 先快速淡出（让图片不可见）
    imageOpacity.value = 0
    
    // 3. 等淡出完成后，再重置变换（此时图片已不可见，用户看不到旋转）
    setTimeout(() => {
      // 禁用过渡，瞬间重置变换
      const image = imageRef.value
      const canvas = canvasRef.value
      if (image) image.style.transition = 'none'
      if (canvas) canvas.style.transition = 'none'
      
      // 重置变换
      scale.value = 1
      rotation.value = 0
      panOffset.value = { x: 0, y: 0 }
      
      // 清空画布
      clearCanvas()
      
      // 切换到新图片
      displayedPlateIndex.value = newIndex
      
      // 强制重绘后恢复过渡动画并淡入
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (image) image.style.transition = ''
          if (canvas) canvas.style.transition = ''
          
          // 淡入新图片
          imageOpacity.value = 1
          isTransitioning.value = false
        })
      })
    }, 350) // 等待淡出动画完成
  } else if (oldIndex === undefined) {
    // 首次加载
    displayedPlateIndex.value = newIndex
    resetTransform()
    clearCanvas()
  }
})

function resizeCanvas() {
  nextTick(() => {
    const container = containerRef.value
    const canvas = canvasRef.value
    const image = imageRef.value
    if (!container || !canvas) return

    // 使画布大小与图片显示尺寸一致
    if (image && image.complete && image.naturalWidth) {
      const containerWidth = container.clientWidth * 0.9
      const containerHeight = container.clientHeight * 0.9
      const aspectRatio = image.naturalWidth / image.naturalHeight
      
      let canvasWidth, canvasHeight
      if (containerWidth / containerHeight > aspectRatio) {
        canvasHeight = containerHeight
        canvasWidth = canvasHeight * aspectRatio
      } else {
        canvasWidth = containerWidth
        canvasHeight = canvasWidth / aspectRatio
      }
      
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      
      // 设置画布 CSS 尺寸
      canvas.style.width = `${canvasWidth}px`
      canvas.style.height = `${canvasHeight}px`
    }

    // 重绘历史
    redrawHistory()
  })
}

function handleImageLoad() {
  resizeCanvas()
}

// 图片加载失败处理
function handleImageLoadError(event) {
  console.error('[ImageCanvas] 图片加载失败:', event.target.src)
}

// 颜色映射（从 hex 到颜色名称）
const COLOR_NAME_MAP = {
  '#ef4444': 'red',
  '#22c55e': 'green',
  '#3b82f6': 'blue',
  '#ffffff': 'white'
}

function getColorName(hexColor) {
  return COLOR_NAME_MAP[hexColor] || 'red'
}

// 绘图事件处理
function handlePointerDown(e) {
  if (currentTool.value === 'none') return

  isDrawing.value = true
  const point = getCanvasPoint(e)
  currentStroke.value = [point]

  const ctx = canvasRef.value.getContext('2d')
  ctx.beginPath()
  ctx.moveTo(point.x, point.y)
  
  // 仅画笔模式触发追踪事件
  if (currentTool.value === 'pen') {
    emit('drawing-start', {
      x: point.x,
      y: point.y,
      color: getColorName(internalBrushColor.value)
    })
  }
}

function handlePointerMove(e) {
  if (!isDrawing.value || currentTool.value === 'none') return

  const point = getCanvasPoint(e)
  currentStroke.value.push(point)

  const ctx = canvasRef.value.getContext('2d')

  if (currentTool.value === 'pen') {
    ctx.strokeStyle = internalBrushColor.value
    ctx.lineWidth = brushSize.value
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    // 触发追踪事件，同时传递屏幕坐标用于粒子效果
    emit('drawing-move', { 
      x: point.x, 
      y: point.y,
      clientX: e.clientX,
      clientY: e.clientY
    })
  } else if (currentTool.value === 'eraser') {
    ctx.strokeStyle = 'rgba(0,0,0,1)'
    ctx.lineWidth = brushSize.value * 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalCompositeOperation = 'destination-out'
  }

  ctx.lineTo(point.x, point.y)
  ctx.stroke()

  if (currentTool.value === 'eraser') {
    ctx.globalCompositeOperation = 'source-over'
  }
}

function handlePointerUp() {
  if (!isDrawing.value) return

  const wasPenMode = currentTool.value === 'pen'
  isDrawing.value = false

  if (currentStroke.value.length > 0) {
    drawingHistory.value.push({
      tool: currentTool.value,
      color: internalBrushColor.value,
      size: brushSize.value,
      points: [...currentStroke.value]
    })

    emit('drawing-complete', getDrawingData())
  }

  // 仅画笔模式触发追踪事件
  if (wasPenMode) {
    emit('drawing-end')
  }

  currentStroke.value = []
}

function getCanvasPoint(e) {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  
  // 获取画布视觉中心点（屏幕坐标）
  // 注意：getBoundingClientRect() 已经包含了所有 CSS 变换（包括 translate/scale/rotate）
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  
  // 鼠标相对于画布视觉中心的位置（屏幕坐标）
  // 不需要减去 panOffset，因为 rect 已经反映了平移后的位置
  let dx = e.clientX - centerX
  let dy = e.clientY - centerY
  
  // 反向旋转鼠标坐标（抵消 CSS 旋转）
  const angleRad = -rotation.value * Math.PI / 180
  const rotatedX = dx * Math.cos(angleRad) - dy * Math.sin(angleRad)
  const rotatedY = dx * Math.sin(angleRad) + dy * Math.cos(angleRad)
  
  // 反向缩放（抵消 CSS 缩放）
  const unscaledX = rotatedX / scale.value
  const unscaledY = rotatedY / scale.value
  
  // 转换到画布坐标（画布中心 -> 画布左上角）
  const canvasX = unscaledX + canvas.width / 2
  const canvasY = unscaledY + canvas.height / 2
  
  return {
    x: canvasX,
    y: canvasY
  }
}

function redrawHistory() {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  drawingHistory.value.forEach(stroke => {
    if (stroke.points.length < 2) return

    ctx.beginPath()
    ctx.strokeStyle = stroke.tool === 'eraser' ? 'rgba(0,0,0,1)' : stroke.color
    ctx.lineWidth = stroke.tool === 'eraser' ? stroke.size * 3 : stroke.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
    }

    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    stroke.points.forEach(point => {
      ctx.lineTo(point.x, point.y)
    })
    ctx.stroke()

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'source-over'
    }
  })
}

// ==================== 拖拽平移功能 ====================

// 计算平移边界（防止拖出可视区域）
function getClampedOffset(rawX, rawY) {
  const container = containerRef.value
  const image = imageRef.value
  if (!container || !image) return { x: 0, y: 0 }
  
  const containerRect = container.getBoundingClientRect()
  const cw = containerRect.width
  const ch = containerRect.height
  
  // 图片实际显示尺寸
  const displayWidth = image.offsetWidth * scale.value
  const displayHeight = image.offsetHeight * scale.value
  
  // 计算最大偏移量
  let maxOffsetX = 0
  let maxOffsetY = 0
  
  if (displayWidth > cw) {
    maxOffsetX = (displayWidth - cw) / 2
  }
  if (displayHeight > ch) {
    maxOffsetY = (displayHeight - ch) / 2
  }
  
  // 限制偏移范围
  let x = rawX
  let y = rawY
  
  if (maxOffsetX === 0) {
    x = 0
  } else {
    x = Math.max(-maxOffsetX, Math.min(maxOffsetX, x))
  }
  
  if (maxOffsetY === 0) {
    y = 0
  } else {
    y = Math.max(-maxOffsetY, Math.min(maxOffsetY, y))
  }
  
  return { x, y }
}

// 开始拖拽
function startPan(clientX, clientY) {
  if (!canPan()) return
  
  isPanning.value = true
  panStartX = clientX
  panStartY = clientY
  panStartOffsetX = panOffset.value.x
  panStartOffsetY = panOffset.value.y
}

// 拖拽移动
function movePan(clientX, clientY) {
  if (!isPanning.value) return
  
  const deltaX = clientX - panStartX
  const deltaY = clientY - panStartY
  
  const rawX = panStartOffsetX + deltaX
  const rawY = panStartOffsetY + deltaY
  
  const clamped = getClampedOffset(rawX, rawY)
  panOffset.value = { x: clamped.x, y: clamped.y }
}

// 结束拖拽
function endPan() {
  isPanning.value = false
}

// 容器鼠标事件
function handleContainerMouseDown(e) {
  if (e.button !== 0) return
  if (!canPan()) return
  e.preventDefault()
  startPan(e.clientX, e.clientY)
}

function handleContainerMouseMove(e) {
  if (!isPanning.value) return
  e.preventDefault()
  movePan(e.clientX, e.clientY)
}

function handleContainerMouseUp() {
  endPan()
}

// 容器触摸事件
function handleContainerTouchStart(e) {
  if (!e.touches || e.touches.length === 0) return
  if (!canPan()) return
  const touch = e.touches[0]
  e.preventDefault()
  startPan(touch.clientX, touch.clientY)
}

function handleContainerTouchMove(e) {
  if (!isPanning.value || !e.touches || e.touches.length === 0) return
  const touch = e.touches[0]
  e.preventDefault()
  movePan(touch.clientX, touch.clientY)
}

function handleContainerTouchEnd() {
  endPan()
}

// 缩放或重置时更新平移边界
function updatePanBounds() {
  const clamped = getClampedOffset(panOffset.value.x, panOffset.value.y)
  panOffset.value = { x: clamped.x, y: clamped.y }
}

// 公开方法
function zoomIn() {
  scale.value = Math.min(scale.value + 0.1, 3)
  nextTick(() => updatePanBounds())
  emitTransformChange()
}

function zoomOut() {
  scale.value = Math.max(scale.value - 0.1, 0.5)
  nextTick(() => updatePanBounds())
  emitTransformChange()
}

function rotateLeft() {
  rotation.value -= 15
  emitTransformChange()
}

function rotateRight() {
  rotation.value += 15
  emitTransformChange()
}

function resetTransform() {
  scale.value = 1
  rotation.value = 0
  panOffset.value = { x: 0, y: 0 }
}

function clearCanvas() {
  const canvas = canvasRef.value
  if (canvas) {
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
  drawingHistory.value = []
  currentStroke.value = []
}

function setTool(tool) {
  currentTool.value = tool
}

function setBrushColor(color) {
  internalBrushColor.value = color
}

function getDrawingData() {
  return {
    history: drawingHistory.value,
    canvasWidth: canvasRef.value?.width || 0,
    canvasHeight: canvasRef.value?.height || 0
  }
}

function emitTransformChange() {
  emit('transform-change', {
    scale: scale.value,
    rotation: rotation.value
  })
}

// 暴露方法
defineExpose({
  zoomIn,
  zoomOut,
  rotateLeft,
  rotateRight,
  resetTransform,
  clearCanvas,
  setTool,
  setBrushColor,
  getDrawingData
})
</script>

<style lang="less" scoped>
// 容器样式 - 与原始 #image-container 一致
.image-canvas-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: transparent;
  padding: 24px 24px 0 24px;
  min-height: min(70vh, 640px);
  box-sizing: border-box;
  margin-top: -30px; // 图片整体上移 30px
}

// 图片样式 - 与原始 #rorschach-image 一致
.rorschach-image {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  border-radius: 8px;
  transform-origin: center center;
  // 平滑的透明度过渡，缩放/旋转变换更快
  transition: opacity 0.3s ease-in-out, transform 0.2s ease-out;
  will-change: transform, opacity;
  user-select: none;
  pointer-events: none;
}

// 画布样式 - 与原始 #drawing-canvas 一致
.drawing-canvas {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transform-origin: center center;
  transition: opacity 0.8s ease-in-out, transform 0.2s ease-out;
  will-change: transform;
  touch-action: none;
  cursor: crosshair;
}

@media (max-width: 768px) {
  .image-canvas-container {
    padding: 16px;
    min-height: min(60vh, 400px);
  }

  .rorschach-image {
    max-width: 95%;
    max-height: 95%;
  }
}
</style>
