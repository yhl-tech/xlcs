<template>
  <div class="controls-bar">
    <!-- 上一张按钮组 -->
    <div class="control-group">
      <button 
        :disabled="currentPlate <= 1" 
        @click="emit('previous')"
      >
        ◀ 上一张
      </button>
    </div>

    <!-- 缩放旋转按钮组 -->
    <div class="control-group">
      <button @click="emit('zoom-in')">🔍+ 放大</button>
      <button @click="emit('zoom-out')">🔍- 缩小</button>
      <button @click="emit('rotate-left')">↶ 左转</button>
      <button @click="emit('rotate-right')">↷ 右转</button>
    </div>

    <!-- 画笔工具组 -->
    <div class="control-group">
      <button 
        :class="{ selected: currentTool === 'pen' }"
        @click="toggleTool('pen')"
      >
        ✏️ 画笔
      </button>
      <div class="color-selector">
        <div 
          class="color-option"
          :class="{ selected: currentColor === 'red' }"
          data-color="red"
          style="background-color: #ef4444"
          @click="selectColor('red')"
        ></div>
        <div 
          class="color-option"
          :class="{ selected: currentColor === 'green' }"
          data-color="green"
          style="background-color: #10b981"
          @click="selectColor('green')"
        ></div>
        <div 
          class="color-option"
          :class="{ selected: currentColor === 'blue' }"
          data-color="blue"
          style="background-color: #3b82f6"
          @click="selectColor('blue')"
        ></div>
        <div 
          class="color-option"
          :class="{ selected: currentColor === 'white' }"
          data-color="white"
          style="background-color: #ffffff"
          @click="selectColor('white')"
        ></div>
      </div>
      <button 
        :class="{ selected: currentTool === 'eraser' }"
        @click="toggleTool('eraser')"
      >
        🗑️ 擦除
      </button>
      <button @click="emit('clear-all')">🧹 一键擦除</button>
    </div>

    <!-- 下一张按钮组 -->
    <div class="control-group">
      <button 
        class="next-btn"
        :class="{ pulse: countdown > 0 }"
        @click="handleNext"
      >
        {{ nextButtonText }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onUnmounted } from 'vue'

const props = defineProps({
  currentPlate: {
    type: Number,
    required: true
  },
  totalPlates: {
    type: Number,
    default: 10
  },
  minViewTime: {
    type: Number,
    default: 1 // 最小观看时间（秒）
  }
})

const emit = defineEmits([
  'tool-change',
  'color-change',
  'zoom-in',
  'zoom-out',
  'rotate-left',
  'rotate-right',
  'next',
  'previous',
  'clear-all'
])

const currentTool = ref('none')
const currentColor = ref('red')
const countdown = ref(0)
let countdownTimer = null

// 计算下一张按钮文本
const nextButtonText = computed(() => {
  if (countdown.value > 0) {
    return `下一张 ▶ (${countdown.value}秒)`
  }
  return props.currentPlate >= props.totalPlates ? '完成 ▶' : '下一张 ▶'
})

// 切换工具
function toggleTool(tool) {
  if (currentTool.value === tool) {
    currentTool.value = 'none'
  } else {
    currentTool.value = tool
  }
  emit('tool-change', currentTool.value)
}

// 选择颜色
function selectColor(color) {
  currentColor.value = color
  // 自动切换到画笔模式
  if (currentTool.value !== 'pen') {
    currentTool.value = 'pen'
    emit('tool-change', 'pen')
  }
  emit('color-change', color)
}

// 处理下一张按钮点击
function handleNext() {
  if (countdown.value > 0) return
  emit('next')
}

// 启动倒计时
function startCountdown() {
  countdown.value = props.minViewTime
  
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
  
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

// 切换图版时重置工具和倒计时
watch(() => props.currentPlate, () => {
  currentTool.value = 'none'
  emit('tool-change', 'none')
  startCountdown()
}, { immediate: true })

// 清理
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})
</script>

<style lang="less" scoped>
.controls-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);

  button {
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s ease;
    color: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    gap: 6px;

    &:hover:not(:disabled) {
      border-color: rgba(147, 197, 253, 0.6);
      background: rgba(59, 130, 246, 0.3);
      color: white;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &.selected {
      background: rgba(147, 197, 253, 0.4);
      border-color: #3b82f6;
      color: white;
      box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.2);
    }
  }
}

.next-btn {
  min-width: 100px;
  
  &.pulse {
    animation: pulse-glow 1s ease-in-out infinite;
  }
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.6);
  }
}

.color-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-option {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  &:hover {
    transform: scale(1.15);
  }

  &.selected {
    border-color: #333;
    box-shadow: 0 0 0 2px white, 0 0 0 4px #333;
  }
}

@media (max-width: 768px) {
  .controls-bar {
    gap: 8px;
    padding-bottom: 12px;
  }

  .control-group {
    padding: 6px 8px;

    button {
      padding: 6px 10px;
      font-size: 12px;
    }
  }

  .color-option {
    width: 20px;
    height: 20px;
  }
}

@media (max-width: 480px) {
  .controls-bar {
    flex-direction: column;
    gap: 6px;
  }

  .control-group {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
