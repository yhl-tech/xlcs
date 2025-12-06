/**
 * 能量柱控制器
 * 当用户绘画时，产生粒子飞向能量柱，累计进度
 */

;(function () {
  "use strict"

  // 配置
  const CONFIG = {
    MAX_ENERGY: 1000, // 最大能量值
    ENERGY_PER_STROKE: 5, // 每次绘画增加的能量（提高以让填充高度更明显）
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
   * 增加能量
   */
  function addEnergy(amount = CONFIG.ENERGY_PER_STROKE) {
    if (!initialized) return

    energy = Math.min(energy + amount, CONFIG.MAX_ENERGY)
    updateFillLevel()

    // 触发脉冲效果
    triggerPulse()
  }

  /**
   * 更新填充高度
   */
  function updateFillLevel() {
    if (!elements.fill) return

    const percentage = (energy / CONFIG.MAX_ENERGY) * 100
    elements.fill.style.height = `${percentage}%`
  }

  /**
   * 生成粒子 (从指定位置飞向能量柱)
   * @param {number} x - 画笔在页面上的X坐标
   * @param {number} y - 画笔在页面上的Y坐标
   */
  function spawnParticle(x, y) {
    if (!elements.container) return

    // 增加能量
    addEnergy()

    // 创建粒子元素
    const particle = document.createElement("div")
    particle.className = "energy-particle"

    // 随机颜色
    const colorIndex = Math.floor(Math.random() * CONFIG.PARTICLE_COLORS.length)
    particle.classList.add(CONFIG.PARTICLE_COLORS[colorIndex])

    // 获取能量柱的位置
    const pillarRect = elements.container.getBoundingClientRect()
    const pillarCenterX = pillarRect.left + pillarRect.width / 2
    const pillarBottomY = pillarRect.bottom - 30

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
    reset,
    getEnergy,
    setEnergy,
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
