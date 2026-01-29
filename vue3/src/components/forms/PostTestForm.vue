<template>
  <div class="post-test-view">
    <!-- 头部 -->
    <div class="post-test-header">
      <h2>综合测试</h2>
      <button 
        v-if="!isComplete" 
        class="next-question-btn"
        :disabled="isButtonDisabled"
        @click="goToNextQuestion"
      >
        {{ isLastQuestion ? '确认提交' : '下一页' }}
      </button>
    </div>

    <!-- 问题文本 -->
    <p class="question-text">{{ currentQuestionText }}</p>

    <!-- 图版网格 -->
    <div v-if="!isComplete" class="image-grid" id="post-test-grid">
      <div
        v-for="i in 10"
        :key="i"
        class="grid-item"
        :class="{ selected: isImageSelected(i) }"
        @click="handleImageSelection(i)"
      >
        <img :src="`/images/rorschach-blot-${i}.webp`" :alt="`Image ${i}`" />
        <h4>图 {{ i }}</h4>
      </div>
    </div>

    <!-- 完成提示 -->
    <div v-else class="complete-message">
      <p>感谢您完成问卷！正在提交数据...</p>
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
const isComplete = ref(false)

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

// 按钮是否禁用（mood问题不需要选择图片）
const isButtonDisabled = computed(() => {
  if (!currentQuestion.value) return true
  // mood 问题不需要选择图片
  if (currentQuestion.value.key === 'mood') return false
  // 其他问题需要至少选择一张图片
  return answers[currentQuestion.value.key]?.length === 0
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
  isComplete.value = true
  
  // 转换答案格式以匹配 API 要求
  // 原始格式: { self: [1, 2], father: [3], ... }
  // API 格式: { represent: [1, 2], father: [3], ... }
  const formattedAnswers = {
    representSelf: answers.self?.[0] || null,
    representFather: answers.father?.[0] || null,
    representMother: answers.mother?.[0] || null,
    mostLiked: answers.like || [],
    mostDisliked: answers.dislike || []
  }
  
  // 播报结束语
  const finishText = '再次感谢您的时间，测试报告将会交给模型进行分析，为时大约1-2天，请您耐心等待'
  if (dialog.isConnected.value) {
    const ttsQuery = `[TTS-READ-ONLY] ${finishText}`
    dialog.sendTextMessage(ttsQuery).catch(() => {})
  }
  
  // 延迟提交，让用户看到完成提示
  setTimeout(() => {
    emit('submit', formattedAnswers)
  }, 2000)
}
</script>

<style lang="less" scoped>
.post-test-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  overflow-y: auto;
}

.post-test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  margin-bottom: 20px;

  h2 {
    color: #fff;
    font-size: 20px;
    margin: 0;
    background: linear-gradient(135deg, #8b5cf6, #06b6d4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.next-question-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.question-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  line-height: 1.6;
  padding: 20px 24px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 12px;
  border-left: 4px solid #8b5cf6;
  margin-bottom: 24px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  flex: 1;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

.grid-item {
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  img {
    width: 80%;
    height: 70%;
    object-fit: contain;
  }

  h4 {
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    margin: 8px 0 0;
  }

  &:hover {
    border-color: rgba(139, 92, 246, 0.5);
    transform: scale(1.02);
    background: rgba(139, 92, 246, 0.1);
  }

  &.selected {
    border-color: #8b5cf6;
    background: rgba(139, 92, 246, 0.2);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);

    h4 {
      color: #fff;
    }
  }
}

.complete-message {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;

  p {
    color: rgba(255, 255, 255, 0.8);
    font-size: 18px;
    text-align: center;
  }
}
</style>
