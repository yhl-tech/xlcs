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
      >
        {{ isLastQuestion ? '确认提交' : '下一页' }}
      </button>
    </div>

    <!-- 问题文本框 -->
    <div class="ptf-instruction-box">
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
            :src="`/images/rorschach-blot-${i}.webp`"
            :alt="`Image ${i}`"
          >
        </div>
        <span class="ptf-card-label">图 {{ i }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRealtimeDialog } from '@/composables/useRealtimeDialog'
import { 
  POST_TEST_QUESTIONS, 
  shouldDisplayQuestion, 
  findWhyQuestion 
} from '@/utils/constants'

const emit = defineEmits(['submit'])

// 获取可显示的问题列表
const displayableQuestions = computed(() => {
  return POST_TEST_QUESTIONS.filter(shouldDisplayQuestion)
})

// 状态
const currentQuestionIndex = ref(0)
const answers = reactive({})

// WebRTC 对话
const dialog = useRealtimeDialog()

// 初始化答案为数组格式
onMounted(() => {
  displayableQuestions.value.forEach(q => {
    answers[q.key] = []
  })
  
  // 播报第一个问题
  askCurrentQuestion()
})

// 当前问题
const currentQuestion = computed(() => {
  return displayableQuestions.value[currentQuestionIndex.value] || null
})

// 当前问题文本
const currentQuestionText = computed(() => {
  return currentQuestion.value?.text || ''
})

// 是否是最后一个问题
const isLastQuestion = computed(() => {
  return currentQuestionIndex.value >= displayableQuestions.value.length - 1
})

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
  if (!currentQuestion.value) return
  
  const question = currentQuestion.value
  const whyQuestion = findWhyQuestion(question.key)
  
  // 合并主问题和 why 问题的文本
  const mainText = question.text
  const whyText = whyQuestion ? whyQuestion.text : ''
  const combinedText = whyText ? `${mainText} ${whyText}` : mainText
  
  // 使用 WebRTC 播报
  try {
    if (dialog.isConnected.value) {
      const ttsQuery = `[TTS-READ-ONLY] ${combinedText}`
      await dialog.sendTextMessage(ttsQuery)
      console.log('[PostTestForm] 播报问题:', currentQuestionIndex.value)
    }
  } catch (error) {
    console.warn('[PostTestForm] TTS 播报失败:', error)
  }
}

// 下一个问题
function goToNextQuestion() {
  if (isLastQuestion.value) {
    // 完成所有问题
    finishQuestionnaire()
  } else {
    currentQuestionIndex.value++
    // 播报下一个问题
    askCurrentQuestion()
  }
}

// 完成问卷
function finishQuestionnaire() {
  console.log('[PostTestForm] 问卷完成，准备提交')
  
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
  padding: 20px 40px;
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

.ptf-next-btn {
  position: absolute;
  right: 0;
  background: rgba(16, 23, 42, 0.6);
  border: 1px solid rgba(64, 224, 255, 0.5);
  color: #fff;
  padding: 8px 24px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    background: rgba(64, 224, 255, 0.2);
    border-color: rgba(64, 224, 255, 0.8);
  }
  
  &:active {
    transform: translateY(1px);
  }
}

/* Instruction Box */
.ptf-instruction-box {
  background: transparent;
  padding: 16px 0;
  margin-bottom: 16px;
}

.ptf-question-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
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
