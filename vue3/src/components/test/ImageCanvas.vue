<template>
  <div class="image-canvas-container" ref="containerRef">
    <!-- 图片层 - 与原始 #rorschach-image 一致 -->
    <img
      ref="imageRef"
      :src="currentImageSrc"
      :style="imageTransformStyle"
      class="rorschach-image"
      @load="handleImageLoad"
      @error="handleImageLoadError"
      draggable="false"
    />

    <!-- 画布层 - 与原始 #drawing-canvas 一致 -->
    <canvas
      ref="canvasRef"
      class="drawing-canvas"
      :style="canvasTransformStyle"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointerleave="handlePointerUp"
    ></canvas>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

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
  // 使用相对路径，兼容不同的 base 配置
  return `./images/rorschach-blot-${displayedPlateIndex.value + 1}.webp`
})

// 图片变换样式 - 与原始 #rorschach-image 保持一致
const imageTransformStyle = computed(() => ({
  transform: `scale(${scale.value}) rotate(${rotation.value}deg)`,
  opacity: imageOpacity.value
}))

// 画布变换样式 - 与原始 #drawing-canvas 保持一致
const canvasTransformStyle = computed(() => ({
  transform: `translate(-50%, -50%) scale(${scale.value}) rotate(${rotation.value}deg)`
}))

// 监听外部 brushColor 变化
watch(() => props.brushColor, (newColor) => {
  internalBrushColor.value = newColor
})

// 初始化画布
onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  internalBrushColor.value = props.brushColor
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
})

// 预加载图片
function preloadImage(index) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = `/images/rorschach-blot-${index + 1}.webp`
  })
}

// 监听图版变化 - 添加平滑切换动画
watch(() => props.plateIndex, async (newIndex, oldIndex) => {
  if (oldIndex !== undefined && newIndex !== oldIndex && !isTransitioning.value) {
    isTransitioning.value = true
    
    // 1. 预加载新图片
    await preloadImage(newIndex)
    
    // 2. 淡出当前图片
    imageOpacity.value = 0
    
    // 3. 等待淡出动画完成后切换图片
    setTimeout(() => {
      // 重置变换和画布
      resetTransform()
      clearCanvas()
      
      // 切换到新图片
      displayedPlateIndex.value = newIndex
      
      // 4. 淡入新图片
      nextTick(() => {
        imageOpacity.value = 1
        isTransitioning.value = false
      })
    }, 300) // 淡出时间
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
  // 尝试使用绝对路径作为备选
  const currentSrc = event.target.src
  if (currentSrc.includes('./images/')) {
    const newSrc = currentSrc.replace('./images/', '/images/')
    console.log('[ImageCanvas] 尝试备选路径:', newSrc)
    event.target.src = newSrc
  }
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
    
    // 触发追踪事件
    emit('drawing-move', { x: point.x, y: point.y })
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
  
  // 考虑缩放因素
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
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

// 公开方法
function zoomIn() {
  scale.value = Math.min(scale.value + 0.1, 3)
  emitTransformChange()
}

function zoomOut() {
  scale.value = Math.max(scale.value - 0.1, 0.5)
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
