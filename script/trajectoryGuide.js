/**
 * 预览页面轨迹引导功能模块
 * 在用户首次使用画笔时显示圆形轨迹线并播放语音提示
 */

// 轨迹线配置
const TRAJECTORY_CONFIG = {
  color: "rgba(16, 185, 129, 0.4)", // 绿色 (#10b981)，半透明
  lineWidth: 2,
  lineDash: [5, 5], // 虚线样式
  sizeRatio: 0.2, // 圆形半径占画布最小边的比例
  fadeOutDuration: 300, // 淡出动画时长（毫秒）
}

/**
 * 创建圆形轨迹数据
 * @param {number} canvasWidth - 画布宽度
 * @param {number} canvasHeight - 画布高度
 * @returns {Object} 轨迹数据对象 { centerX, centerY, radius }
 */
function createCircleTrajectory(canvasWidth, canvasHeight) {
  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2
  const radius =
    Math.min(canvasWidth, canvasHeight) * TRAJECTORY_CONFIG.sizeRatio
  return { centerX, centerY, radius }
}

/**
 * 绘制轨迹线
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @param {Object} trajectoryData - 轨迹数据
 * @param {Object} state - 预览状态对象（包含 zoom, rotation）
 * @param {number} opacity - 透明度（0-1），用于淡出动画
 */
function drawTrajectoryLine(ctx, canvas, trajectoryData, state, opacity = 1) {
  if (!ctx || !canvas || !trajectoryData) return

  // 保存当前上下文状态
  ctx.save()

  // 设置轨迹线样式
  const color = TRAJECTORY_CONFIG.color.replace(
    /[\d.]+\)$/,
    `${opacity * 0.4})`
  )
  ctx.strokeStyle = color
  ctx.lineWidth = TRAJECTORY_CONFIG.lineWidth
  ctx.setLineDash(TRAJECTORY_CONFIG.lineDash)
  ctx.lineCap = "round"

  // 计算画布中心（用于坐标转换）
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2

  // 应用缩放和旋转变换
  const scale = state.zoom || 1
  const rotation = ((state.rotation || 0) * Math.PI) / 180

  // 将轨迹中心点转换为相对于画布中心的坐标
  let x = trajectoryData.centerX - centerX
  let y = trajectoryData.centerY - centerY

  // 应用缩放
  x = x * scale
  y = y * scale

  // 应用旋转
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const rotatedX = x * cos - y * sin
  const rotatedY = x * sin + y * cos

  // 转换回画布坐标
  const finalX = rotatedX + centerX
  const finalY = rotatedY + centerY
  const finalRadius = trajectoryData.radius * scale

  // 绘制圆形
  ctx.beginPath()
  ctx.arc(finalX, finalY, finalRadius, 0, Math.PI * 2)
  ctx.stroke()

  // 恢复上下文状态
  ctx.restore()
}

/**
 * 显示轨迹引导
 * @param {Object} params - 参数对象
 * @param {HTMLCanvasElement} params.canvas - 画布元素
 * @param {CanvasRenderingContext2D} params.ctx - 画布上下文
 * @param {Object} params.state - 预览状态对象
 * @param {Function} params.onShow - 显示回调（用于播放语音等）
 */
function showTrajectoryGuide({ canvas, ctx, state, onShow }) {
  if (!canvas || !ctx || !state) return

  // 检查是否已显示过
  if (state.trajectoryShown) return

  // 创建轨迹数据
  const trajectoryData = createCircleTrajectory(canvas.width, canvas.height)

  // 保存轨迹数据到状态
  state.trajectoryPath = trajectoryData
  state.trajectoryVisible = true
  state.trajectoryShown = true

  // 绘制轨迹线（初始透明度为1）
  drawTrajectoryLine(ctx, canvas, trajectoryData, state, 1)

  // 触发显示回调（播放语音等）
  if (typeof onShow === "function") {
    onShow()
  }
}

/**
 * 隐藏轨迹线（带淡出动画）
 * @param {Object} params - 参数对象
 * @param {HTMLCanvasElement} params.canvas - 画布元素
 * @param {CanvasRenderingContext2D} params.ctx - 画布上下文
 * @param {Object} params.state - 预览状态对象
 * @param {Function} params.onRedraw - 重绘回调（用于在淡出过程中重绘用户绘制的内容）
 */
function hideTrajectoryLine({ canvas, ctx, state, onRedraw }) {
  if (!canvas || !ctx || !state || !state.trajectoryVisible) return

  // 清除之前的淡出定时器
  if (state.trajectoryFadeOutTimer) {
    cancelAnimationFrame(state.trajectoryFadeOutTimer)
    state.trajectoryFadeOutTimer = null
  }

  // 在动画开始前，先保存当前画布状态（包括用户刚画的轨迹）
  // 这样在淡出过程中，用户画的轨迹不会消失
  let savedCanvasState = null
  try {
    savedCanvasState = canvas.toDataURL()
  } catch (e) {
    console.warn("[轨迹引导] 保存画布状态失败:", e)
  }

  // 如果无法保存状态，使用回调函数保存
  if (!savedCanvasState && typeof onRedraw === "function") {
    // 先调用一次回调，确保状态已保存
    onRedraw()
    // 然后再保存当前状态
    try {
      savedCanvasState = canvas.toDataURL()
    } catch (e) {
      console.warn("[轨迹引导] 保存画布状态失败:", e)
    }
  }

  // 预加载保存的画布状态到 Image 对象（避免在动画循环中重复创建）
  let preloadedImage = null
  if (savedCanvasState) {
    preloadedImage = new Image()
    preloadedImage.src = savedCanvasState
  }

  const startTime = Date.now()
  const duration = TRAJECTORY_CONFIG.fadeOutDuration

  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const opacity = 1 - progress

    // 先恢复用户绘制的内容（从预加载的 Image）
    if (preloadedImage && preloadedImage.complete) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(preloadedImage, 0, 0)
      // 绘制轨迹线（逐渐降低透明度）
      if (state.trajectoryPath && opacity > 0) {
        drawTrajectoryLine(ctx, canvas, state.trajectoryPath, state, opacity)
      }
    } else if (savedCanvasState && preloadedImage) {
      // 如果图片还在加载中，等待加载完成
      if (preloadedImage.complete) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(preloadedImage, 0, 0)
        if (state.trajectoryPath && opacity > 0) {
          drawTrajectoryLine(ctx, canvas, state.trajectoryPath, state, opacity)
        }
      }
    } else {
      // 如果没有保存的状态，使用回调函数
      if (typeof onRedraw === "function") {
        onRedraw()
      }
      // 绘制轨迹线（逐渐降低透明度）
      if (state.trajectoryPath && opacity > 0) {
        drawTrajectoryLine(ctx, canvas, state.trajectoryPath, state, opacity)
      }
    }

    if (progress < 1) {
      state.trajectoryFadeOutTimer = requestAnimationFrame(animate)
    } else {
      // 动画完成，清除轨迹线状态
      state.trajectoryVisible = false
      state.trajectoryPath = null
      state.trajectoryFadeOutTimer = null

      // 最后恢复一次用户内容（确保轨迹线完全消失，用户轨迹保留）
      if (preloadedImage && preloadedImage.complete) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(preloadedImage, 0, 0)
      } else if (typeof onRedraw === "function") {
        onRedraw()
      }
    }
  }

  // 如果图片已加载，立即开始动画；否则等待加载完成
  if (preloadedImage && preloadedImage.complete) {
    animate()
  } else if (preloadedImage) {
    preloadedImage.onload = () => {
      animate()
    }
  } else {
    animate()
  }
}

/**
 * 重绘轨迹线（如果需要）
 * 在画布缩放或旋转时调用，确保轨迹线位置正确
 * @param {Object} params - 参数对象
 * @param {HTMLCanvasElement} params.canvas - 画布元素
 * @param {CanvasRenderingContext2D} params.ctx - 画布上下文
 * @param {Object} params.state - 预览状态对象
 * @param {Function} params.onRedraw - 重绘回调（用于先绘制用户内容）
 */
function redrawTrajectoryIfNeeded({ canvas, ctx, state, onRedraw }) {
  if (
    !canvas ||
    !ctx ||
    !state ||
    !state.trajectoryVisible ||
    !state.trajectoryPath
  ) {
    return
  }

  // 如果正在绘制中，不重绘轨迹线（避免影响用户绘制性能）
  if (state.drawing) {
    return
  }

  // 先重绘用户内容
  if (typeof onRedraw === "function") {
    onRedraw()
  }

  // 再绘制轨迹线
  drawTrajectoryLine(ctx, canvas, state.trajectoryPath, state, 1)
}

/**
 * 清除轨迹线状态
 * 在清除画布或重置状态时调用
 * @param {Object} state - 预览状态对象
 */
function clearTrajectoryState(state) {
  if (!state) return

  // 清除淡出动画定时器
  if (state.trajectoryFadeOutTimer) {
    cancelAnimationFrame(state.trajectoryFadeOutTimer)
    state.trajectoryFadeOutTimer = null
  }

  // 重置轨迹线状态
  state.trajectoryVisible = false
  state.trajectoryPath = null
  // 注意：不重置 trajectoryShown，确保每个会话只显示一次
}

/**
 * 初始化轨迹引导功能
 * 返回一个对象，包含需要在外部调用的方法
 * @param {Object} params - 参数对象
 * @param {HTMLCanvasElement} params.canvas - 画布元素
 * @param {CanvasRenderingContext2D} params.ctx - 画布上下文
 * @param {Object} params.state - 预览状态对象
 * @param {Function} params.onShow - 显示回调（用于播放语音）
 * @param {Function} params.onRedraw - 重绘回调（用于重绘用户内容）
 * @returns {Object} 轨迹引导控制器对象
 */
export function initTrajectoryGuide({ canvas, ctx, state, onShow, onRedraw }) {
  if (!canvas || !ctx || !state) {
    console.warn("[轨迹引导] 初始化参数不完整")
    return null
  }

  // 确保状态对象有必要的属性
  if (state.trajectoryShown === undefined) {
    state.trajectoryShown = false
  }
  if (state.trajectoryVisible === undefined) {
    state.trajectoryVisible = false
  }
  if (state.trajectoryPath === undefined) {
    state.trajectoryPath = null
  }
  if (state.trajectoryFadeOutTimer === undefined) {
    state.trajectoryFadeOutTimer = null
  }

  // 返回控制器对象
  return {
    /**
     * 显示轨迹引导（首次绘制时调用）
     */
    show: () => {
      showTrajectoryGuide({ canvas, ctx, state, onShow })
    },

    /**
     * 隐藏轨迹线（完成绘制时调用）
     */
    hide: () => {
      hideTrajectoryLine({ canvas, ctx, state, onRedraw })
    },

    /**
     * 重绘轨迹线（缩放/旋转时调用）
     */
    redraw: () => {
      redrawTrajectoryIfNeeded({ canvas, ctx, state, onRedraw })
    },

    /**
     * 清除轨迹线状态（清除画布时调用）
     */
    clear: () => {
      clearTrajectoryState(state)
    },

    /**
     * 检查是否应该显示轨迹引导
     * @returns {boolean}
     */
    shouldShow: () => {
      return !state.trajectoryShown && state.tool === "pen"
    },
  }
}

// 导出工具函数（供外部直接使用）
export { createCircleTrajectory, drawTrajectoryLine, clearTrajectoryState }
