/**
 * 画布绑制逻辑
 * 处理画笔绑制、橡皮擦、触屏交互等
 */
import { ref, shallowRef, markRaw, onUnmounted } from 'vue'

export function useCanvas(canvasRef) {
  // ==================== 状态 ====================
  
  // 绑制状态
  const isDrawing = ref(false)
  
  // 当前工具：none, pen, eraser
  const currentTool = ref('none')
  
  // 画笔设置
  const brushColor = ref('#ff0000')
  const brushSize = ref(3)
  const eraserSize = ref(10)
  
  // 绘制历史（使用 shallowRef 避免深度响应）
  const drawingHistory = shallowRef([])
  const currentStroke = shallowRef([])
  
  // Canvas 2D 上下文（使用 markRaw 避免响应式）
  let ctx = null
  
  // ==================== 方法 ====================
  
  /**
   * 初始化 Canvas
   */
  function initCanvas() {
    const canvas = canvasRef.value
    if (!canvas) return null
    
    ctx = markRaw(canvas.getContext('2d'))
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    return ctx
  }
  
  /**
   * 调整画布大小
   */
  function resizeCanvas(width, height) {
    const canvas = canvasRef.value
    if (!canvas) return
    
    canvas.width = width
    canvas.height = height
    
    // 重绘历史
    redrawHistory()
  }
  
  /**
   * 获取画布坐标
   */
  function getCanvasPoint(event) {
    const canvas = canvasRef.value
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    // 处理触摸事件
    const clientX = event.touches ? event.touches[0].clientX : event.clientX
    const clientY = event.touches ? event.touches[0].clientY : event.clientY
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    }
  }
  
  /**
   * 开始绘制
   */
  function startDrawing(event) {
    if (currentTool.value === 'none') return
    
    if (!ctx) {
      initCanvas()
    }
    
    isDrawing.value = true
    const point = getCanvasPoint(event)
    currentStroke.value = [{ ...point, time: Date.now() }]
    
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
    
    // 设置绘制样式
    if (currentTool.value === 'pen') {
      ctx.strokeStyle = brushColor.value
      ctx.lineWidth = brushSize.value
      ctx.globalCompositeOperation = 'source-over'
    } else if (currentTool.value === 'eraser') {
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.lineWidth = eraserSize.value
      ctx.globalCompositeOperation = 'destination-out'
    }
  }
  
  /**
   * 绘制中
   */
  function draw(event) {
    if (!isDrawing.value || currentTool.value === 'none' || !ctx) return
    
    event.preventDefault()
    
    const point = getCanvasPoint(event)
    currentStroke.value = [...currentStroke.value, { ...point, time: Date.now() }]
    
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
  }
  
  /**
   * 结束绘制
   */
  function stopDrawing() {
    if (!isDrawing.value) return
    
    isDrawing.value = false
    
    // 重置混合模式
    if (ctx) {
      ctx.globalCompositeOperation = 'source-over'
    }
    
    // 保存到历史
    if (currentStroke.value.length > 1) {
      const stroke = {
        tool: currentTool.value,
        color: brushColor.value,
        size: currentTool.value === 'pen' ? brushSize.value : eraserSize.value,
        points: [...currentStroke.value]
      }
      drawingHistory.value = [...drawingHistory.value, stroke]
    }
    
    currentStroke.value = []
  }
  
  /**
   * 重绘历史记录
   */
  function redrawHistory() {
    const canvas = canvasRef.value
    if (!canvas || !ctx) return
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 重绘每一笔
    drawingHistory.value.forEach(stroke => {
      if (stroke.points.length < 2) return
      
      ctx.beginPath()
      ctx.strokeStyle = stroke.tool === 'eraser' ? 'rgba(0,0,0,1)' : stroke.color
      ctx.lineWidth = stroke.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
      } else {
        ctx.globalCompositeOperation = 'source-over'
      }
      
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      stroke.points.forEach(point => {
        ctx.lineTo(point.x, point.y)
      })
      ctx.stroke()
    })
    
    // 重置混合模式
    ctx.globalCompositeOperation = 'source-over'
  }
  
  /**
   * 清空画布
   */
  function clearCanvas() {
    const canvas = canvasRef.value
    if (!canvas) return
    
    if (!ctx) {
      initCanvas()
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawingHistory.value = []
    currentStroke.value = []
  }
  
  /**
   * 撤销上一笔
   */
  function undo() {
    if (drawingHistory.value.length === 0) return
    
    drawingHistory.value = drawingHistory.value.slice(0, -1)
    redrawHistory()
  }
  
  /**
   * 设置工具
   */
  function setTool(tool) {
    currentTool.value = tool
  }
  
  /**
   * 设置画笔颜色
   */
  function setBrushColor(color) {
    brushColor.value = color
  }
  
  /**
   * 设置画笔大小
   */
  function setBrushSize(size) {
    brushSize.value = size
  }
  
  /**
   * 获取绘制数据（用于上传）
   */
  function getDrawingData() {
    const canvas = canvasRef.value
    return {
      history: drawingHistory.value,
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      timestamp: Date.now()
    }
  }
  
  /**
   * 导出为图片
   */
  function exportAsImage(format = 'image/png') {
    const canvas = canvasRef.value
    if (!canvas) return null
    return canvas.toDataURL(format)
  }
  
  // 清理
  onUnmounted(() => {
    ctx = null
  })
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    isDrawing,
    currentTool,
    brushColor,
    brushSize,
    eraserSize,
    drawingHistory,
    
    // 方法
    initCanvas,
    resizeCanvas,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
    undo,
    setTool,
    setBrushColor,
    setBrushSize,
    getDrawingData,
    exportAsImage,
    redrawHistory
  }
}

export default useCanvas
