/**
 * 字幕管理
 * 处理实时语音对话的字幕显示
 */
import { ref, computed, watch } from 'vue'

export function useSubtitle() {
  // ==================== 状态 ====================
  
  // 当前字幕文本
  const currentText = ref('')
  
  // 当前说话者
  const currentSpeaker = ref('') // 'user' | 'assistant' | ''
  
  // 是否正在显示
  const isVisible = ref(false)
  
  // 字幕历史
  const history = ref([])
  
  // 打字机效果
  const displayText = ref('')
  const isTyping = ref(false)
  
  // 自动隐藏定时器
  let hideTimer = null
  let typeTimer = null
  
  // 配置
  const config = ref({
    typingSpeed: 50,      // 打字速度（毫秒/字）
    autoHideDelay: 3000,  // 自动隐藏延迟（毫秒）
    enableTypingEffect: true,
    maxHistoryLength: 50
  })
  
  // ==================== 计算属性 ====================
  
  // 当前说话者标签
  const speakerLabel = computed(() => {
    switch (currentSpeaker.value) {
      case 'user':
        return '你'
      case 'assistant':
        return 'AI'
      default:
        return ''
    }
  })
  
  // ==================== 方法 ====================
  
  /**
   * 显示字幕
   * @param {string} text - 字幕文本
   * @param {string} speaker - 说话者
   * @param {Object} options - 选项
   */
  function show(text, speaker = '', options = {}) {
    const { useTypingEffect = config.value.enableTypingEffect, autoHide = true } = options
    
    // 清除之前的定时器
    clearTimers()
    
    currentText.value = text
    currentSpeaker.value = speaker
    isVisible.value = true
    
    // 添加到历史
    if (text) {
      history.value.push({
        text,
        speaker,
        timestamp: Date.now()
      })
      
      // 限制历史长度
      if (history.value.length > config.value.maxHistoryLength) {
        history.value.shift()
      }
    }
    
    // 打字机效果
    if (useTypingEffect && text) {
      startTypingEffect(text)
    } else {
      displayText.value = text
    }
    
    // 自动隐藏
    if (autoHide && config.value.autoHideDelay > 0) {
      hideTimer = setTimeout(() => {
        hide()
      }, config.value.autoHideDelay + (text.length * config.value.typingSpeed))
    }
  }
  
  /**
   * 隐藏字幕
   */
  function hide() {
    isVisible.value = false
    clearTimers()
  }
  
  /**
   * 更新字幕（增量更新，用于流式输出）
   * @param {string} text - 新增文本
   * @param {string} speaker - 说话者
   */
  function update(text, speaker = '') {
    currentText.value = text
    if (speaker) {
      currentSpeaker.value = speaker
    }
    isVisible.value = true
    
    // 直接更新显示文本（不使用打字机效果）
    displayText.value = text
    
    // 重置自动隐藏定时器
    if (hideTimer) {
      clearTimeout(hideTimer)
    }
  }
  
  /**
   * 追加文本
   * @param {string} text - 追加的文本
   */
  function append(text) {
    currentText.value += text
    displayText.value += text
    isVisible.value = true
  }
  
  /**
   * 开始打字机效果
   */
  function startTypingEffect(text) {
    isTyping.value = true
    displayText.value = ''
    let index = 0
    
    const type = () => {
      if (index < text.length) {
        displayText.value += text[index]
        index++
        typeTimer = setTimeout(type, config.value.typingSpeed)
      } else {
        isTyping.value = false
      }
    }
    
    type()
  }
  
  /**
   * 清除定时器
   */
  function clearTimers() {
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
    if (typeTimer) {
      clearTimeout(typeTimer)
      typeTimer = null
    }
    isTyping.value = false
  }
  
  /**
   * 清空字幕
   */
  function clear() {
    currentText.value = ''
    currentSpeaker.value = ''
    displayText.value = ''
    isVisible.value = false
    clearTimers()
  }
  
  /**
   * 清空历史
   */
  function clearHistory() {
    history.value = []
  }
  
  /**
   * 处理转录消息（兼容原始 subtitleManager 接口）
   * @param {Object} message - 消息对象
   */
  function handleTextMessage(message) {
    const { type, speaker, text, accumulated_text, is_final } = message
    
    if (type === 'text_transcription' && text) {
      show(accumulated_text || text, speaker, {
        useTypingEffect: is_final,
        autoHide: is_final
      })
    }
  }
  
  /**
   * 更新配置
   */
  function setConfig(newConfig) {
    Object.assign(config.value, newConfig)
  }
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    currentText,
    currentSpeaker,
    isVisible,
    displayText,
    isTyping,
    history,
    speakerLabel,
    config,
    
    // 方法
    show,
    hide,
    update,
    append,
    clear,
    clearHistory,
    handleTextMessage,
    setConfig
  }
}

export default useSubtitle
