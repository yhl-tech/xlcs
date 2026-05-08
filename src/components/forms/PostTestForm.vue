<template>
  <div class="ptf-container">
    <!-- 页面标题栏 -->
    <div class="ptf-title-bar">
      <h2 class="ptf-title">
        综合测试
      </h2>
      <button 
        class="ptf-next-btn"
        @click="goToNextQuestion"
        :disabled="timeLeft > 0"
      >
        <span>{{ isLastQuestion ? '确认提交' : '下一页' }}</span>
        <span class="ptf-next-timer">({{ timeLeft }}s)</span>
      </button>
    </div>


    <!-- 问题文本框 -->
    <div
      class="ptf-instruction-box"
      :style="{ '--ptf-question-bg': currentQuestionBg }"
    >
      <p class="ptf-question-text">
        {{ currentQuestionText }}
      </p>
    </div>

    <!-- 图版网格 -->
    <div class="ptf-grid">
      <div
        v-for="i in 10"
        :key="i"
        class="ptf-card"
        :class="{ selected: isImageSelected(i) }"
        @click="handleImageSelection(i)"
      >
        <div class="ptf-card-image-wrapper">
          <img
            :src="getImageSrc(i)"
            :alt="`Image ${i}`"
            @error="handleImageError"
          >
        </div>
        <span class="ptf-card-label">图 {{ i }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRealtimeDialog } from '@/composables/useRealtimeDialog'
import { 
  POST_TEST_QUESTIONS, 
  shouldDisplayQuestion, 
  findWhyQuestion,
  buildTTSQuery
} from '@/utils/constants'

const emit = defineEmits(['submit'])

const QUESTION_DURATION = 20

// 获取可显示的问题列表
const displayableQuestions = computed(() => {
  return POST_TEST_QUESTIONS.filter(shouldDisplayQuestion)
})

// 状态
const currentQuestionIndex = ref(0)
const answers = reactive({})
const timeLeft = ref(QUESTION_DURATION)
let timerId = null

// WebRTC 对话
const dialog = useRealtimeDialog()

// 初始化答案为数组格式
onMounted(() => {
  console.log('[PostTestForm] 组件已挂载')
  console.log('[PostTestForm] 可显示问题数:', displayableQuestions.value.length)
  console.log('[PostTestForm] WebRTC 连接状态:', dialog.isConnected.value)

  displayableQuestions.value.forEach(q => {
    answers[q.key] = []
  })
})

onUnmounted(() => {
  clearQuestionTimer()
})

// 当前问题
const currentQuestion = computed(() => {
  return displayableQuestions.value[currentQuestionIndex.value] || null
})

// 用于确保第一个问题只播报一次（mount 时若已连接立即触发，否则等 watch 检测到 isConnected 变 true 时再触发）
let firstQuestionAsked = false

// 当前问题背景色（每题一个淡色）
const QUESTION_COLORS = [
  'rgba(56, 189, 248, 0.45)', // 青色
  'rgba(129, 140, 248, 0.50)', // 靛蓝
  'rgba(52, 211, 153, 0.48)', // 绿色
  'rgba(251, 191, 36, 0.48)', // 黄色
  'rgba(244, 114, 182, 0.50)' // 粉色
]

const currentQuestionBg = computed(() => {
  const idx = currentQuestionIndex.value % QUESTION_COLORS.length
  return QUESTION_COLORS[idx]
})

// 当前问题文本
const currentQuestionText = computed(() => {
  return currentQuestion.value?.text || ''
})

// 是否是最后一个问题
const isLastQuestion = computed(() => {
  return currentQuestionIndex.value >= displayableQuestions.value.length - 1
})

// 获取图片路径
function getImageSrc(imageNumber) {
  // 使用 BASE_URL 确保路径正确
  return `${import.meta.env.BASE_URL}images/rorschach-blot-${imageNumber}.webp`
}

// 图片加载失败处理
function handleImageError(event) {
  console.error('[PostTestForm] 图片加载失败:', event.target.src)
}

// 图片是否被选中
function isImageSelected(imageNumber) {
  if (!currentQuestion.value) return false
  const selected = answers[currentQuestion.value.key] || []
  return selected.includes(imageNumber)
}

// 处理图片选择（多选模式）
function handleImageSelection(imageNumber) {
  if (!currentQuestion.value || currentQuestion.value.key === 'mood') return
  
  const questionKey = currentQuestion.value.key
  if (!Array.isArray(answers[questionKey])) {
    answers[questionKey] = []
  }
  
  const selectedImages = answers[questionKey]
  const index = selectedImages.indexOf(imageNumber)
  
  if (index > -1) {
    // 已选中，取消选择
    selectedImages.splice(index, 1)
  } else {
    // 未选中，添加选择
    selectedImages.push(imageNumber)
    // 保持数组排序
    selectedImages.sort((a, b) => a - b)
  }
}

// 播报当前问题
async function askCurrentQuestion() {
  if (!currentQuestion.value) {
    console.warn('[PostTestForm] 当前问题为空，跳过播报')
    return
  }
  
  const question = currentQuestion.value
  const whyQuestion = findWhyQuestion(question.key)
  
  // 合并主问题和 why 问题的文本
  const mainText = question.text
  const whyText = whyQuestion ? whyQuestion.text : ''
  const combinedText = whyText ? `${mainText} ${whyText}` : mainText
  
  console.log('[PostTestForm] 准备播报问题:', currentQuestionIndex.value)
  console.log('[PostTestForm] 问题内容:', combinedText.substring(0, 50) + '...')
  console.log('[PostTestForm] WebRTC 连接状态:', dialog.isConnected.value)
  
  // 使用 WebRTC 播报（使用统一的 TTS 格式）
  try {
    if (dialog.isConnected.value) {
      const ttsQuery = buildTTSQuery(combinedText)
      await dialog.sendTextMessage(ttsQuery)
      console.log('[PostTestForm] ✓ 问题已发送到 WebRTC')
    } else {
      console.warn('[PostTestForm] WebRTC 未连接，无法播报')
    }
  } catch (error) {
    console.warn('[PostTestForm] TTS 播报失败:', error)
  }
}

function clearQuestionTimer() {
  if (timerId) {
    clearInterval(timerId)
    timerId = null
  }
}

// WebRTC 连接就绪后播报第一题
// 注意：这里 immediate: true 会在 setup 同步阶段触发回调；watch 必须放在
// askCurrentQuestion / startQuestionTimer / currentQuestion 等被引用的依赖
// 都声明完之后，否则会触发 TDZ（Cannot access ... before initialization）。
watch(
  () => dialog.isConnected.value,
  async (connected) => {
    if (connected && !firstQuestionAsked) {
      firstQuestionAsked = true
      console.log('[PostTestForm] WebRTC 已连接，开始播报第一个问题')
      await askCurrentQuestion()
      startQuestionTimer()
    }
  },
  { immediate: true }
)

function startQuestionTimer() {
  clearQuestionTimer()
  timeLeft.value = QUESTION_DURATION
  
  timerId = window.setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    }
    if (timeLeft.value <= 0) {
      // 仅停止计时，不自动切换问题
      clearQuestionTimer()
    }
  }, 1000)
}

// 下一个问题
function goToNextQuestion(isAuto = false) {
  // 无论是自动还是手动，都先清理当前计时器
  clearQuestionTimer()
  
  if (isLastQuestion.value) {
    // 完成所有问题
    finishQuestionnaire()
  } else {
    currentQuestionIndex.value++
    // 播报下一个问题
    askCurrentQuestion()
    startQuestionTimer()
  }
}

// 完成问卷
async function finishQuestionnaire() {
  console.log('[PostTestForm] 问卷完成，准备提交')
  
  // 播报结束语
  // const finishText = '再次感谢您的时间，测试报告将会交给模型进行分析，为时大约6 -8小时，请您耐心等待。'
  // try {
  //   if (dialog.isConnected.value) {
  //     const ttsQuery = buildTTSQuery(finishText)
  //     await dialog.sendTextMessage(ttsQuery)
  //     console.log('[PostTestForm] 播报结束语')
  //   }
  // } catch (error) {
  //   console.warn('[PostTestForm] 结束语播报失败:', error)
  // }
  
  // 转换答案格式以匹配 API 要求
  const formattedAnswers = {
    self: answers.self || [],
    father: answers.father || [],
    mother: answers.mother || [],
    like: answers.like || [],
    dislike: answers.dislike || []
  }
  
  console.log('[PostTestForm] 提交答案:', formattedAnswers)
  
  // 立即提交，让父组件处理后续流程
  emit('submit', formattedAnswers)
}
</script>

<style lang="less" scoped>
.ptf-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px 40px 120px 40px; // 底部多加100px使内容整体上移
  box-sizing: border-box;
  overflow: hidden;
  max-width: 1400px;
  margin: 0 auto;
}

/* Title Bar */
.ptf-title-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
  position: relative;
}

.ptf-title {
  font-size: 26px;
  font-weight: 700;
  color: #fff;
  margin: 0;
  text-align: center;
  letter-spacing: 2px;
}

.ptf-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 16px;
}

.ptf-subtitle {
  margin: 0;
  font-size: 14px;
  color: rgba(226, 232, 240, 0.9);
}

.ptf-timer {
  font-size: 14px;
  color: #bfdbfe;
}

.ptf-timer-number {
  font-size: 18px;
  font-weight: 700;
  color: #fbbf24;
  margin: 0 4px;
}

.ptf-next-btn {
  position: absolute;
  right: 0;
  background: rgba(16, 23, 42, 0.6);
  border: 1px solid rgba(64, 224, 255, 0.5);
  color: #fff;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &:hover {
    background: rgba(64, 224, 255, 0.2);
    border-color: rgba(64, 224, 255, 0.8);
  }
  
  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    border-color: rgba(148, 163, 184, 0.7);
  }
}

.ptf-next-timer {
  font-size: 12px;
  color: #fbbf24;
}

/* Instruction Box */
.ptf-instruction-box {
  background: var(--ptf-question-bg, rgba(15, 23, 42, 0.95));
  padding: 14px 18px;
  margin-bottom: 18px;
  border-radius: 14px;
  box-shadow: 0 0 24px rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(248, 250, 252, 0.25);
  transition: background 0.25s ease, transform 0.25s ease, border-color 0.25s ease;
}

.ptf-question-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 18px;
  line-height: 1.6;
  margin: 0;
  font-weight: 500;
}

/* Grid */
.ptf-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  align-content: start; /* Align items to top */
}

/* Card */
.ptf-card {
  background: #0f172a; /* Dark background matching the image roughly */
  border: 1px solid rgba(64, 224, 255, 0.3);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  &:hover {
    transform: translateY(-2px);
    border-color: rgba(64, 224, 255, 0.8);
    box-shadow: 0 0 15px rgba(64, 224, 255, 0.2);
  }
  
  &.selected {
    border: 2px solid #38bdf8;
    box-shadow: 0 0 20px rgba(56, 189, 248, 0.4);
    
    .ptf-card-label {
      color: #38bdf8;
      font-weight: 700;
    }
  }
}

.ptf-card-image-wrapper {
  background: #fff; /* White background for image */
  border-radius: 8px;
  overflow: hidden;
}

.ptf-card-image-wrapper img {
  width: 100%;
  height: auto;
  display: block;
  padding: 4px;
}

.ptf-card-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  text-align: center;
  font-weight: 500;
  display: block;
  margin-top: 6px;
}

/* Responsive adjustments */
@media (max-height: 800px) {
  .ptf-grid {
    gap: 10px;
  }
  
  .ptf-container {
    padding: 16px;
  }
  
  .ptf-instruction-box {
    padding: 12px 20px;
    margin-bottom: 16px;
  }
  
  .header-title {
    font-size: 24px;
  }
}

@media (max-width: 1024px) {
  .ptf-grid {
    grid-template-columns: repeat(3, 1fr);
    overflow-y: auto;
  }
}
</style>
