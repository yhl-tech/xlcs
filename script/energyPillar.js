/**
 * 能量柱控制器
 * 当用户绘画时，产生粒子飞向能量柱，累计进度
 */

;(function () {
  "use strict"

  // 配置
  const CONFIG = {
    MAX_ENERGY: 1000, // 最大能量值
    ENERGY_PER_STROKE: 2, // 每次绘画增加的能量（提高以让填充高度更明显）
    PARTICLE_INTERVAL: 100, // 粒子生成间隔 (ms)
    PARTICLE_COLORS: ["cyan", "magenta", "blue", "white"],
    RIPPLE_DURATION: 500, // 波纹持续时间 (ms)
  }

  // 状态
  let energy = 0
  let isDrawing = false
  let particleTimer = null
  let elements = {}
  let initialized = false
  let maxEnergyForCurrentPage = 100 // 当前页面的能量上限
  let lastDetectedIndex = 0 // 上次检测到的图片索引，用于自动检测切换

  /**
   * 初始化能量柱
   */
  function init() {
    elements = {
      container: document.getElementById("energy-pillar-container"),
      pillar: document.getElementById("energy-pillar"),
      fill: document.getElementById("energy-fill"),
      ripple: document.getElementById("energy-ripple"),
      particles: document.getElementById("energy-particles"),
    }

    if (!elements.container) {
      console.warn("[EnergyPillar] 未找到能量柱容器")
      return false
    }

    initialized = true
    // 初始化时更新填充状态，确保 empty 类正确设置
    updateFillLevel()
    console.log("[EnergyPillar] 初始化成功")
    return true
  }

  /**
   * 显示能量柱
   */
  function show() {
    if (!initialized) init()
    if (elements.container) {
      elements.container.classList.add("visible")
    }
  }

  /**
   * 隐藏能量柱
   */
  function hide() {
    if (elements.container) {
      elements.container.classList.remove("visible")
    }
  }

  /**
   * 开始绘画 - 激活波纹效果
   */
  function startDrawing() {
    if (!initialized) return

    isDrawing = true

    // 激活波纹效果
    if (elements.ripple) {
      elements.ripple.classList.add("active")
    }
  }

  /**
   * 停止绘画 - 停止粒子生成
   */
  function stopDrawing() {
    isDrawing = false

    // 停止波纹效果
    if (elements.ripple) {
      elements.ripple.classList.remove("active")
    }
  }

  // 粒子生成节流
  let lastParticleTime = 0

  /**
   * 绘画过程中记录位置并生成粒子
   * @param {number} clientX - 鼠标在视口中的X坐标
   * @param {number} clientY - 鼠标在视口中的Y坐标
   */
  function onDrawMove(clientX, clientY) {
    if (!isDrawing || !initialized) return

    const now = Date.now()
    // 节流：每 80ms 生成一个粒子
    if (now - lastParticleTime < 80) return
    lastParticleTime = now

    spawnParticle(clientX, clientY)
  }

  /**
   * 检测并更新当前页码（自动检测图片切换）
   */
  function detectAndUpdatePage() {
    if (window.state && typeof window.state.currentIndex === "number") {
      const stateIndex = window.state.currentIndex
      if (stateIndex !== lastDetectedIndex) {
        lastDetectedIndex = stateIndex
        const pageNumber = stateIndex // currentIndex 是 0-9，页码是 1-10
        maxEnergyForCurrentPage = pageNumber * 100
        console.log(
          `[EnergyPillar] 自动检测到图片切换，当前第${pageNumber}页，能量上限：${maxEnergyForCurrentPage}`
        )
      }
    }
  }

  /**
   * 增加能量
   */
  function addEnergy(amount = CONFIG.ENERGY_PER_STROKE) {
    if (!initialized) return

    // 自动检测图片切换
    detectAndUpdatePage()

    // 限制能量不超过当前页面的上限和总上限
    energy = Math.min(energy + amount, maxEnergyForCurrentPage, CONFIG.MAX_ENERGY)
    updateFillLevel()

    // 触发脉冲效果
    triggerPulse()
  }

  /**
   * 减少能量
   */
  function removeEnergy(amount = CONFIG.ENERGY_PER_STROKE) {
    if (!initialized) return

    energy = Math.max(energy - amount, 0)
    updateFillLevel()

    // 触发脉冲效果（即使减少也触发，提供视觉反馈）
    triggerPulse()
  }

  /**
   * 更新填充高度
   */
  function updateFillLevel() {
    if (!elements.fill) return

    const percentage = (energy / CONFIG.MAX_ENERGY) * 100
    elements.fill.style.height = `${percentage}%`

    // 当没有能量时，添加 empty 类使 border-top 透明
    if (energy === 0) {
      elements.fill.classList.add("empty")
    } else {
      elements.fill.classList.remove("empty")
    }
  }

  /**
   * 创建粒子元素（内部辅助函数）
   * @param {number} x - 粒子在页面上的X坐标
   * @param {number} y - 粒子在页面上的Y坐标
   * @param {boolean} shouldAddEnergy - 是否增加能量
   * @param {Object} pillarPos - 能量柱位置（可选，用于性能优化）
   * @param {number} pillarPos.centerX - 能量柱中心X坐标
   * @param {number} pillarPos.bottomY - 能量柱底部Y坐标
   */
  function createParticleElement(
    x,
    y,
    shouldAddEnergy = true,
    pillarPos = null
  ) {
    if (!elements.container) return null

    // 如果需要，增加能量，画笔和下一页的时候生效
    if (shouldAddEnergy) {
      if (pillarPos) {
        // 使用预先传递的位置
        addEnergy(5)
      } else {
        addEnergy()
      }
    }

    // 创建粒子元素
    const particle = document.createElement("div")
    particle.className = "energy-particle"

    // 随机颜色
    const colorIndex = Math.floor(Math.random() * CONFIG.PARTICLE_COLORS.length)
    particle.classList.add(CONFIG.PARTICLE_COLORS[colorIndex])

    // 获取能量柱的位置（如果未提供，则重新获取）
    let pillarCenterX, pillarBottomY
    if (pillarPos) {
      pillarCenterX = pillarPos.centerX
      pillarBottomY = pillarPos.bottomY
    } else {
      const pillarRect = elements.container.getBoundingClientRect()
      pillarCenterX = pillarRect.left + pillarRect.width / 2
      pillarBottomY = pillarRect.bottom - 30
    }

    // 设置粒子初始位置（相对于视口）
    particle.style.position = "fixed"
    particle.style.left = `${x}px`
    particle.style.top = `${y}px`
    particle.style.zIndex = "9999"

    // 计算飞行距离
    const endX = pillarCenterX - x
    const endY = pillarBottomY - y

    particle.style.setProperty("--end-x", `${endX}px`)
    particle.style.setProperty("--end-y", `${endY}px`)

    // 添加到 body 而不是容器内，这样可以从任意位置飞行
    document.body.appendChild(particle)

    // 动画结束后移除粒子
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle)
      }
    }, 1500)

    return particle
  }

  /**
   * 画笔画画时， 生成粒子 (从指定位置飞向能量柱)
   * @param {number} x - 画笔在页面上的X坐标
   * @param {number} y - 画笔在页面上的Y坐标
   */
  function spawnParticle(x, y) {
    createParticleElement(x, y, true)
  }

  /**
   * 从指定区域批量生成粒子飞向能量柱（用于图片切换效果）
   * @param {DOMRect} rect - 源区域的边界矩形
   * @param {Object} options - 配置选项
   * @param {number} options.count - 粒子数量（默认25-30随机）
   * @param {number} options.stagger - 粒子生成间隔（ms，默认20）
   */
  function spawnParticlesFromArea(rect, options = {}) {
    if (!initialized || !elements.container) return
    if (!rect || rect.width <= 0 || rect.height <= 0) return

    const {
      count = Math.floor(Math.random() * 6) + 25, // 25-30 随机
      stagger = 20, // 每个粒子间隔20ms
    } = options

    // 预先获取能量柱位置（性能优化：避免25-30次重复调用 getBoundingClientRect）
    const pillarRect = elements.container.getBoundingClientRect()
    const pillarPos = {
      centerX: pillarRect.left + pillarRect.width / 2,
      bottomY: pillarRect.bottom - 30,
    }

    // 分批生成粒子，错开时间让效果更自然
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        // 在区域内随机位置生成粒子
        const x = rect.left + Math.random() * rect.width
        const y = rect.top + Math.random() * rect.height

        // 创建粒子并增加能量（传递预先获取的能量柱位置）
        createParticleElement(x, y, true, pillarPos)
      }, i * stagger)
    }
  }

  /**
   * 触发脉冲效果
   */
  function triggerPulse() {
    if (!elements.pillar) return

    elements.pillar.classList.remove("pulse")
    // 强制重绘
    void elements.pillar.offsetWidth
    elements.pillar.classList.add("pulse")

    setTimeout(() => {
      elements.pillar.classList.remove("pulse")
    }, 600)
  }

  /**
   * 重置能量
   */
  function reset() {
    energy = 0
    updateFillLevel()
  }

  /**
   * 获取当前能量
   */
  function getEnergy() {
    return energy
  }

  /**
   * 设置能量 (用于恢复状态)
   */
  function setEnergy(value) {
    energy = Math.min(Math.max(0, value), CONFIG.MAX_ENERGY)
    updateFillLevel()
  }

  // 暴露到全局
  window.EnergyPillar = {
    init,
    show,
    hide,
    startDrawing,
    stopDrawing,
    onDrawMove,
    addEnergy,
    removeEnergy,
    reset,
    getEnergy,
    setEnergy,
    spawnParticlesFromArea,
  }

  // DOM 加载完成后自动初始化并显示
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      init()
      show()
    })
  } else {
    // DOM 已经加载完成
    setTimeout(() => {
      init()
      show()
    }, 100)
  }

  console.log("[EnergyPillar] 模块已加载")
})()
