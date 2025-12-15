// 图片平移交互模块：仅负责拖拽和平移边界约束，不依赖业务状态

/**
 * 初始化图片平移（拖拽）功能
 * @param {Object} options
 * @param {HTMLImageElement} options.imageElement - 显示的图片元素
 * @param {HTMLElement} options.containerElement - 图片外层容器（用于计算可视区域）
 * @param {Function} options.getZoom - () => number，返回当前缩放比例
 * @param {Function} options.getCurrentTool - () => string，返回当前工具名称
 * @param {Function} options.getPanOffset - () => { x: number, y: number }，当前平移偏移
 * @param {Function} options.setPanOffset - ({ x, y }) => void，设置新的平移偏移并应用变换
 * @param {Function} [options.canStartPan] - () => boolean，额外的开始平移条件（例如是否已使用过缩放）
 * @returns {{ handleZoomOrResize: () => void }} 控制器对象
 */
export function initImagePan({
  imageElement,
  containerElement,
  getZoom,
  getCurrentTool,
  getPanOffset,
  setPanOffset,
  canStartPan,
} = {}) {
  if (
    !imageElement ||
    !containerElement ||
    typeof getZoom !== "function" ||
    typeof getCurrentTool !== "function" ||
    typeof getPanOffset !== "function" ||
    typeof setPanOffset !== "function"
  ) {
    console.warn("[imagePan] 初始化参数不完整，已跳过平移功能初始化")
    return {
      handleZoomOrResize() {},
    }
  }

  let isPanning = false
  let startMouseX = 0
  let startMouseY = 0
  let startOffsetX = 0
  let startOffsetY = 0

  function canPan() {
    const tool = String(getCurrentTool() || "").toLowerCase()
    // 在画笔 / 橡皮工具下禁用平移
    if (tool === "pen" || tool === "eraser") {
      return false
    }
    // 如果提供了额外的开始条件（例如：必须先点过缩放按钮），也要满足
    if (typeof canStartPan === "function" && !canStartPan()) {
      return false
    }
    return true
  }

  function getClampedOffset(rawX, rawY) {
    const zoom = Number(getZoom() || 1)
    const containerRect = containerElement.getBoundingClientRect()

    const cw = containerRect.width || 0
    const ch = containerRect.height || 0

    if (!cw || !ch) {
      return { x: 0, y: 0 }
    }

    const naturalWidth = imageElement.naturalWidth || cw
    const naturalHeight = imageElement.naturalHeight || ch

    const displayWidth = naturalWidth * zoom
    const displayHeight = naturalHeight * zoom

    let maxOffsetX = 0
    let maxOffsetY = 0

    if (displayWidth > cw) {
      maxOffsetX = (displayWidth - cw) / 2
    }
    if (displayHeight > ch) {
      maxOffsetY = (displayHeight - ch) / 2
    }

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

  function startPan(clientX, clientY) {
    if (!canPan()) {
      return
    }
    isPanning = true
    startMouseX = clientX
    startMouseY = clientY
    const currentOffset = getPanOffset() || { x: 0, y: 0 }
    startOffsetX = Number(currentOffset.x || 0)
    startOffsetY = Number(currentOffset.y || 0)

    containerElement.style.cursor = "grabbing"
  }

  function movePan(clientX, clientY) {
    if (!isPanning) return

    const deltaX = clientX - startMouseX
    const deltaY = clientY - startMouseY

    const rawX = startOffsetX + deltaX
    const rawY = startOffsetY + deltaY

    const clamped = getClampedOffset(rawX, rawY)
    setPanOffset({ x: clamped.x, y: clamped.y })
  }

  function endPan() {
    if (!isPanning) return
    isPanning = false
    containerElement.style.cursor = ""
  }

  // 鼠标事件
  function onMouseDown(e) {
    if (e.button !== 0) return
    if (!canPan()) return
    e.preventDefault()
    startPan(e.clientX, e.clientY)
  }

  function onMouseMove(e) {
    if (!isPanning) return
    e.preventDefault()
    movePan(e.clientX, e.clientY)
  }

  function onMouseUpOrLeave() {
    endPan()
  }

  containerElement.addEventListener("mousedown", onMouseDown)
  containerElement.addEventListener("mousemove", onMouseMove)
  containerElement.addEventListener("mouseup", onMouseUpOrLeave)
  containerElement.addEventListener("mouseleave", onMouseUpOrLeave)

  // 触摸事件（移动端）
  function onTouchStart(e) {
    if (!e.touches || e.touches.length === 0) return
    if (!canPan()) return
    const touch = e.touches[0]
    e.preventDefault()
    startPan(touch.clientX, touch.clientY)
  }

  function onTouchMove(e) {
    if (!isPanning || !e.touches || e.touches.length === 0) return
    const touch = e.touches[0]
    e.preventDefault()
    movePan(touch.clientX, touch.clientY)
  }

  function onTouchEnd() {
    endPan()
  }

  containerElement.addEventListener("touchstart", onTouchStart, {
    passive: false,
  })
  containerElement.addEventListener("touchmove", onTouchMove, {
    passive: false,
  })
  containerElement.addEventListener("touchend", onTouchEnd)
  containerElement.addEventListener("touchcancel", onTouchEnd)

  function handleZoomOrResize() {
    const currentOffset = getPanOffset() || { x: 0, y: 0 }
    const clamped = getClampedOffset(
      Number(currentOffset.x || 0),
      Number(currentOffset.y || 0)
    )
    setPanOffset({ x: clamped.x, y: clamped.y })
  }

  return {
    handleZoomOrResize,
  }
}
