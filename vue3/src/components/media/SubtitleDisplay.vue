<template>
  <Transition name="fade">
    <div v-if="text" class="subtitle-container">
      <div class="subtitle-content">
        <span class="subtitle-text">{{ displayText }}</span>
        <span v-if="isTyping" class="typing-cursor">|</span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  text: {
    type: String,
    default: ''
  },
  typingSpeed: {
    type: Number,
    default: 50 // ms per character
  }
})

const displayText = ref('')
const isTyping = ref(false)
let typingTimer = null

// 打字机效果
watch(() => props.text, (newText) => {
  if (!newText) {
    displayText.value = ''
    isTyping.value = false
    return
  }

  // 清除之前的定时器
  if (typingTimer) {
    clearInterval(typingTimer)
  }

  // 开始打字效果
  displayText.value = ''
  isTyping.value = true
  let index = 0

  typingTimer = setInterval(() => {
    if (index < newText.length) {
      displayText.value += newText[index]
      index++
    } else {
      clearInterval(typingTimer)
      isTyping.value = false
    }
  }, props.typingSpeed)
}, { immediate: true })
</script>

<style scoped>
.subtitle-container {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 80%;
  z-index: 80;
}

.subtitle-content {
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  padding: 16px 24px;
  display: inline-flex;
  align-items: center;
}

.subtitle-text {
  color: white;
  font-size: 16px;
  line-height: 1.6;
}

.typing-cursor {
  color: #8b5cf6;
  font-weight: bold;
  animation: blink 1s infinite;
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

@media (max-width: 768px) {
  .subtitle-container {
    max-width: 90%;
    bottom: 80px;
  }

  .subtitle-text {
    font-size: 14px;
  }

  .subtitle-content {
    padding: 12px 16px;
  }
}
</style>
