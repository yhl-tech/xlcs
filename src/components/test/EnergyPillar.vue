<template>
  <div ref="containerRef" class="energy-pillar-container">
    <div class="energy-pillar-inner">
      <!-- 刻度标签 -->
      <div class="energy-scale">
        <span class="scale-label">100</span>
        <span class="scale-label">50</span>
        <span class="scale-label">0</span>
      </div>
      
      <div ref="pillarRef" class="energy-pillar" :class="{ pulse: isPulsing }">
        <!-- 10 个分段格子 -->
        <div class="energy-segments">
          <div 
            v-for="i in 10" 
            :key="i" 
            class="energy-segment"
            :class="{ 
              filled: progress >= (11 - i) * 10,
              partial: progress > (10 - i) * 10 && progress < (11 - i) * 10
            }"
          >
            <div 
              v-if="progress > (10 - i) * 10 && progress < (11 - i) * 10"
              class="segment-fill"
              :style="{ height: `${(progress - (10 - i) * 10) * 10}%` }"
            ></div>
          </div>
        </div>
        
        <!-- 能量填充层（覆盖在分段上） -->
        <div class="energy-fill-overlay" :style="{ height: `${progress}%` }">
          <div class="energy-glow"></div>
        </div>
        
        <!-- 波纹效果 -->
        <div class="energy-ripple" :class="{ active: isDrawingActive }"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useTestStore } from '@/stores/testStore'

defineProps({
  progress: {
    type: Number,
    default: 0
  }
})

const testStore = useTestStore()

// 配置
const PARTICLE_COLORS = ['cyan', 'magenta', 'blue', 'white']

// 状态
const containerRef = ref(null)
const pillarRef = ref(null)
const isDrawingActive = ref(false)
const isPulsing = ref(false)
let lastParticleTime = 0

// 开始绘画 - 激活波纹效果
function startDrawing() {
  isDrawingActive.value = true
}

// 停止绘画
function stopDrawing() {
  isDrawingActive.value = false
}

// 触发脉冲效果（已禁用抖动）
function triggerPulse() {
  // 不再触发抖动效果
}

// 绘画过程中生成粒子（节流：每80ms一个）
function onDrawMove(clientX, clientY) {
  if (!isDrawingActive.value || !containerRef.value) return
  
  const now = Date.now()
  if (now - lastParticleTime < 80) return
  lastParticleTime = now
  
  spawnParticle(clientX, clientY)
}

// 生成单个粒子（画笔模式，增加默认能量）
function spawnParticle(x, y) {
  if (!containerRef.value) return
  
  // 增加能量（每次绘画增加 ENERGY_PER_STROKE）
  testStore.addEnergy(testStore.ENERGY_PER_STROKE)
  
  // 获取能量柱位置
  const pillarRect = containerRef.value.getBoundingClientRect()
  const pillarCenterX = pillarRect.left + pillarRect.width / 2
  const pillarBottomY = pillarRect.bottom - 30
  
  // 创建粒子元素
  const particle = document.createElement('div')
  particle.className = 'energy-particle'
  
  // 随机颜色
  const colorIndex = Math.floor(Math.random() * PARTICLE_COLORS.length)
  particle.classList.add(PARTICLE_COLORS[colorIndex])
  
  // 设置粒子初始位置
  particle.style.position = 'fixed'
  particle.style.left = `${x}px`
  particle.style.top = `${y}px`
  particle.style.zIndex = '9999'
  
  // 计算飞行距离
  const endX = pillarCenterX - x
  const endY = pillarBottomY - y
  
  particle.style.setProperty('--end-x', `${endX}px`)
  particle.style.setProperty('--end-y', `${endY}px`)
  
  // 添加到 body
  document.body.appendChild(particle)
  
  // 触发脉冲
  triggerPulse()
  
  // 动画结束后移除粒子
  setTimeout(() => {
    if (particle.parentNode) {
      particle.parentNode.removeChild(particle)
    }
  }, 1500)
}

// 从指定区域批量生成粒子（用于图片切换效果）
function spawnParticlesFromArea(rect, options = {}) {
  if (!containerRef.value || !rect || rect.width <= 0 || rect.height <= 0) return
  
  const count = options.count || Math.floor(Math.random() * 6) + 25
  const stagger = options.stagger || 20
  
  // 预先获取能量柱位置
  const pillarRect = containerRef.value.getBoundingClientRect()
  const pillarPos = {
    centerX: pillarRect.left + pillarRect.width / 2,
    bottomY: pillarRect.bottom - 30
  }
  
  // 分批生成粒子
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const x = rect.left + Math.random() * rect.width
      const y = rect.top + Math.random() * rect.height
      spawnParticleWithPos(x, y, pillarPos)
    }, i * stagger)
  }
}

// 生成粒子（使用预计算的能量柱位置，批量模式增加更多能量）
function spawnParticleWithPos(x, y, pillarPos) {
  // 批量粒子每个增加更多能量
  testStore.addEnergy(testStore.ENERGY_PER_PARTICLE)
  
  const particle = document.createElement('div')
  particle.className = 'energy-particle'
  
  const colorIndex = Math.floor(Math.random() * PARTICLE_COLORS.length)
  particle.classList.add(PARTICLE_COLORS[colorIndex])
  
  particle.style.position = 'fixed'
  particle.style.left = `${x}px`
  particle.style.top = `${y}px`
  particle.style.zIndex = '9999'
  
  const endX = pillarPos.centerX - x
  const endY = pillarPos.bottomY - y
  
  particle.style.setProperty('--end-x', `${endX}px`)
  particle.style.setProperty('--end-y', `${endY}px`)
  
  document.body.appendChild(particle)
  
  triggerPulse()
  
  setTimeout(() => {
    if (particle.parentNode) {
      particle.parentNode.removeChild(particle)
    }
  }, 1500)
}

// 暴露方法
defineExpose({
  startDrawing,
  stopDrawing,
  onDrawMove,
  spawnParticle,
  spawnParticlesFromArea
})
</script>

<style scoped>
.energy-pillar-container {
  position: fixed;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 50;
}

.energy-pillar-inner {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

/* 刻度标签 */
.energy-scale {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 240px;
  padding: 2px 0;
}

.scale-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  text-align: right;
}

.energy-pillar {
  width: 24px;
  height: 240px;
  background: rgba(15, 23, 42, 0.8);
  border: 2px solid rgba(139, 92, 246, 0.4);
  border-radius: 6px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 10px rgba(139, 92, 246, 0.2);
}

.energy-pillar.pulse {
  animation: pillar-pulse 0.6s ease-out;
}

@keyframes pillar-pulse {
  0% { transform: scale(1); box-shadow: 0 0 10px rgba(139, 92, 246, 0.2); }
  50% { transform: scale(1.08); box-shadow: 0 0 25px rgba(139, 92, 246, 0.7); }
  100% { transform: scale(1); box-shadow: 0 0 10px rgba(139, 92, 246, 0.2); }
}

/* 10 个分段 */
.energy-segments {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px;
}

.energy-segment {
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.energy-segment.filled {
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  border-color: rgba(139, 92, 246, 0.6);
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
}

.energy-segment.partial {
  background: rgba(139, 92, 246, 0.2);
  border-color: rgba(139, 92, 246, 0.4);
}

.segment-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  border-radius: 2px;
  transition: height 0.3s ease;
}

/* 能量填充覆盖层 */
.energy-fill-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: transparent;
  pointer-events: none;
  transition: height 0.5s ease-out;
}

.energy-glow {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  height: 12px;
  background: linear-gradient(to bottom, rgba(139, 92, 246, 0.8), transparent);
  border-radius: 4px 4px 0 0;
  animation: glow-pulse 2s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.energy-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 6px;
  pointer-events: none;
  opacity: 0;
}

.energy-ripple.active {
  animation: ripple-effect 1s ease-out infinite;
}

@keyframes ripple-effect {
  0% {
    box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.5);
    opacity: 1;
  }
  100% {
    box-shadow: 0 0 0 15px rgba(139, 92, 246, 0);
    opacity: 0;
  }
}


@media (max-width: 768px) {
  .energy-pillar-container {
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 40;
  }

  .energy-pillar {
    width: 16px;
    height: min(40vh, 220px);
    height: min(40dvh, 220px);
  }

  .energy-scale {
    height: min(40vh, 220px);
    height: min(40dvh, 220px);
  }

  .scale-label {
    font-size: 8px;
  }
}

@media (max-width: 420px) {
  .energy-pillar-container {
    right: 2px;
  }

  .energy-pillar {
    width: 14px;
    height: min(36vh, 180px);
    height: min(36dvh, 180px);
  }

  .energy-scale {
    height: min(36vh, 180px);
    height: min(36dvh, 180px);
  }

  .scale-label {
    font-size: 7px;
  }
}
</style>

<!-- 全局样式：粒子动画 -->
<style>
/* 能量粒子 */
.energy-particle {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  pointer-events: none;
  animation: fly-to-pillar 1.2s ease-in forwards;
}

.energy-particle.cyan {
  background: radial-gradient(circle, #00ffff, #00cccc);
  box-shadow: 0 0 6px #00ffff, 0 0 12px #00ffff;
}

.energy-particle.magenta {
  background: radial-gradient(circle, #ff00ff, #cc00cc);
  box-shadow: 0 0 6px #ff00ff, 0 0 12px #ff00ff;
}

.energy-particle.blue {
  background: radial-gradient(circle, #3b82f6, #2563eb);
  box-shadow: 0 0 6px #3b82f6, 0 0 12px #3b82f6;
}

.energy-particle.white {
  background: radial-gradient(circle, #ffffff, #e0e0e0);
  box-shadow: 0 0 6px #ffffff, 0 0 12px #ffffff;
}

@keyframes fly-to-pillar {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  70% {
    opacity: 0.8;
    transform: translate(var(--end-x), var(--end-y)) scale(0.8);
  }
  100% {
    opacity: 0;
    transform: translate(var(--end-x), var(--end-y)) scale(0.3);
  }
}
</style>
