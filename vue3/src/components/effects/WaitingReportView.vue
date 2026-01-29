<template>
  <div class="waiting-report-view">
    <div class="waiting-content">
      <!-- 标题 -->
      <h2 class="waiting-title">报告生成中</h2>
      
      <!-- 进度指示 -->
      <div class="progress-ring">
        <svg viewBox="0 0 100 100">
          <circle
            class="progress-bg"
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            stroke-width="8"
          />
          <circle
            class="progress-fill"
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#progressGradient)"
            stroke-width="8"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="progressOffset"
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#8b5cf6" />
              <stop offset="100%" stop-color="#6366f1" />
            </linearGradient>
          </defs>
        </svg>
        <div class="progress-text">
          <span class="progress-value">{{ currentStep }}</span>
          <span class="progress-label">/ {{ totalSteps }}</span>
        </div>
      </div>

      <!-- 步骤列表 -->
      <div class="steps-list">
        <div
          v-for="(step, index) in steps"
          :key="step.id"
          class="step-item"
          :class="{
            completed: index < currentStepIndex,
            active: index === currentStepIndex
          }"
        >
          <div class="step-icon">
            <svg v-if="index < currentStepIndex" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <div v-else-if="index === currentStepIndex" class="loading-spinner"></div>
            <span v-else class="step-number">{{ index + 1 }}</span>
          </div>
          <div class="step-content">
            <span class="step-label">{{ step.label }}</span>
            <span class="step-desc">{{ step.desc }}</span>
          </div>
        </div>
      </div>

      <!-- 提示信息 -->
      <div class="waiting-hint">
        <p>预计等待时间：6-8 小时</p>
        <p class="hint-secondary">报告生成完成后，您可以登录查看</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  sessionId: {
    type: String,
    default: ''
  }
})

const steps = [
  { id: 'submit', label: '提交数据', desc: '测评数据已安全传输' },
  { id: 'validate', label: '数据校验', desc: '系统正在校验数据完整性' },
  { id: 'ai', label: 'AI 模型分析', desc: '心理大模型深度解析中' },
  { id: 'review', label: '专家复核', desc: '心理师团队双重复核' },
  { id: 'generate', label: '报告生成', desc: '生成个性化评估报告' }
]

const currentStepIndex = ref(2) // 模拟当前在 AI 分析阶段
const totalSteps = steps.length
const currentStep = computed(() => currentStepIndex.value + 1)

// 进度环计算
const circumference = 2 * Math.PI * 45
const progressOffset = computed(() => {
  const progress = (currentStepIndex.value + 1) / totalSteps
  return circumference * (1 - progress)
})

// 模拟进度更新（实际应该从后端获取）
let progressTimer = null

onMounted(() => {
  // 模拟进度更新
  progressTimer = setInterval(() => {
    if (currentStepIndex.value < totalSteps - 1) {
      // 实际项目中应该调用 API 查询状态
    }
  }, 5000)
})

onUnmounted(() => {
  if (progressTimer) {
    clearInterval(progressTimer)
  }
})
</script>

<style scoped>
.waiting-report-view {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.waiting-content {
  max-width: 500px;
  width: 100%;
  text-align: center;
}

.waiting-title {
  color: white;
  font-size: 28px;
  margin-bottom: 40px;
}

.progress-ring {
  width: 160px;
  height: 160px;
  margin: 0 auto 40px;
  position: relative;
}

.progress-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-fill {
  transition: stroke-dashoffset 0.5s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: baseline;
}

.progress-value {
  color: white;
  font-size: 36px;
  font-weight: 700;
}

.progress-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 18px;
  margin-left: 4px;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 40px;
  text-align: left;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: all 0.3s;
}

.step-item.active {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
}

.step-item.completed {
  opacity: 0.6;
}

.step-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  flex-shrink: 0;
}

.step-item.completed .step-icon {
  background: linear-gradient(135deg, #22c55e, #10b981);
}

.step-item.active .step-icon {
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
}

.step-icon svg {
  width: 16px;
  height: 16px;
  color: white;
}

.step-number {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.step-label {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.step-desc {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.waiting-hint {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.waiting-hint p {
  margin: 8px 0;
}

.hint-secondary {
  font-size: 12px;
  opacity: 0.7;
}
</style>
