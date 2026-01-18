// 画布触屏绘制模块

/**
 * 初始化画布触屏绘制功能
 * @param {Object} options
 * @param {HTMLCanvasElement} options.canvas - 画布元素
 * @param {Function} options.onTouchStart - 触屏开始回调
 * @param {Function} options.onTouchMove - 触屏移动回调
 * @param {Function} options.onTouchEnd - 触屏结束回调
 */
export function initCanvasTouchDraw({
  canvas,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
} = {}) {
  if (!canvas || !onTouchStart || !onTouchMove || !onTouchEnd) {
    console.warn("[canvasTouchDraw] 初始化参数不完整")
    return
  }

  function handleTouchStart(e) {
    if (!e.touches || e.touches.length === 0) return
    e.preventDefault()
    const touch = e.touches[0]
    const mockEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
    }
    onTouchStart(mockEvent)
  }

  function handleTouchMove(e) {
    if (!e.touches || e.touches.length === 0) return
    e.preventDefault()
    const touch = e.touches[0]
    const mockEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
    }
    onTouchMove(mockEvent)
  }

  function handleTouchEnd(e) {
    e.preventDefault()
    onTouchEnd()
  }

  canvas.addEventListener("touchstart", handleTouchStart, { passive: false })
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false })
  canvas.addEventListener("touchend", handleTouchEnd)
  canvas.addEventListener("touchcancel", handleTouchEnd)
}
