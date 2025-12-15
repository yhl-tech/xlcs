// 问题进度柱管理模块

/**
 * 更新问题进度柱
 * @param {number} currentIndex - 当前问题索引
 * @param {number} totalQuestions - 总问题数
 */
export function updateQuestionProgress(currentIndex, totalQuestions) {
  const container = document.getElementById("question-progress-pillar-container")
  const fill = document.getElementById("question-progress-fill")
  const ripple = document.getElementById("question-progress-ripple")
  const pillar = document.getElementById("question-progress-pillar")
  const particlesContainer = document.getElementById("question-progress-particles")

  if (!container || !fill) return
  console.log(currentIndex, totalQuestions);
  

  // 计算当前进度百分比（currentIndex 表示当前正在显示的问题，所以已完成的是 currentIndex 个）
  const progress = Math.min(100, (currentIndex / totalQuestions) * 100)

  // 更新进度条高度
  fill.style.height = `${progress}%`

  // 添加脉冲效果
  if (pillar) {
    pillar.classList.add("pulse")
    setTimeout(() => pillar.classList.remove("pulse"), 600)
  }

  // 激活波纹效果
  if (ripple) {
    ripple.classList.add("active")
    setTimeout(() => ripple.classList.remove("active"), 500)
  }

  // 生成粒子效果
  if (particlesContainer) {
    createQuestionProgressParticles(particlesContainer)
  }

  // 移除 empty 类
  if (progress > 0) {
    fill.classList.remove("empty")
  }
}

/**
 * 创建问题进度粒子效果
 * @param {HTMLElement} container - 粒子容器
 */
function createQuestionProgressParticles(container) {
  const colors = ["cyan", "magenta", "blue", "white"]
  const particleCount = 8

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("div")
    particle.className = `question-progress-particle ${colors[Math.floor(Math.random() * colors.length)]}`

    // 随机起始位置（从左侧飞入）
    const startX = Math.random() * -150 - 50
    const startY = Math.random() * 280
    particle.style.left = `${startX}px`
    particle.style.top = `${startY}px`

    // 随机终点位置（飞向能量柱）
    const endX = 150 + Math.random() * 30
    const endY = (Math.random() - 0.5) * 100
    particle.style.setProperty("--end-x", `${endX}px`)
    particle.style.setProperty("--end-y", `${endY}px`)

    container.appendChild(particle)

    // 动画结束后移除粒子
    setTimeout(() => particle.remove(), 1500)
  }
}

/**
 * 初始化问题进度柱
 */
export function initQuestionProgressPillar() {
  const container = document.getElementById("question-progress-pillar-container")
  const fill = document.getElementById("question-progress-fill")

  if (!container || !fill) return

  // 显示容器
  container.classList.add("visible")

  // 初始化为空状态
  fill.style.height = "0%"
  fill.classList.add("empty")
}

/**
 * 隐藏问题进度柱
 */
export function hideQuestionProgressPillar() {
  const container = document.getElementById("question-progress-pillar-container")
  if (container) {
    container.classList.remove("visible")
  }
}
