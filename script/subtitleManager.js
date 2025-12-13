/**
 * 字幕管理器 - 实时语音转文字显示
 * 功能：
 * 1. 接收后端返回的文本消息（豆包和用户语音）
 * 2. 使用 Web Speech API 识别用户语音
 * 3. 打字机效果显示字幕
 * 4. 存储对话记录到 sessionStorage
 */

;(function (window) {
  "use strict"

  // 配置
  const CONFIG = {
    typingSpeed: 15, // 打字机速度（毫秒/字符）
    maxHistoryLength: 1000, // 最大历史记录数
    storageKey: "subtitleHistory", // sessionStorage 键名
    storageStatsKey: "subtitleStats", // 统计信息键名
  }

  class SubtitleManager {
    constructor() {
      // DOM 元素
      this.container = null
      this.textElement = null
      this.indicatorElement = null

      // 状态
      this.isInitialized = false
      this.isVisible = false
      this.currentText = ""
      this.currentSpeaker = null
      this.typingTimer = null
      this.isTyping = false // 是否正在打字机效果
      this.pendingText = null // 待显示的文本（当打字机效果进行时）
      this.pendingSpeaker = null // 待显示的说话人

      // Web Speech API
      this.recognition = null
      this.isRecognizing = false
      this.speechSupported = false
      this.errorCount = 0 // 错误计数
      this.maxRetries = 3 // 最大重试次数
      this.retryDelay = 2000 // 重试延迟（毫秒）

      // 存储
      this.history = []
      this.stats = {
        totalMessages: 0,
        userMessages: 0,
        assistantMessages: 0,
        lastUpdate: null,
      }

      // 中间结果缓存（用于去重）
      this.interimCache = {}

      // 已显示的累积文本缓存（用于去重，避免重复显示）
      this.displayedAccumulatedTexts = new Set()
      this.lastReplyId = null // 上次的 reply_id

      // 标记 Web Speech API 是否正常工作
      // 优先使用 Web Speech API，后端识别作为备用
      this.webSpeechWorking = false
      this.backendCheckTimer = null

      // 初始化
      this.init()
    }

    /**
     * 初始化字幕管理器
     */
    init() {
      // 获取 DOM 元素（HTML 中已存在）
      this.getDOM()

      // 初始化 Web Speech API
      this.initSpeechRecognition()

      // 加载历史记录
      this.loadHistory()

      // 绑定事件
      this.bindEvents()

      this.isInitialized = true
    }

    /**
     * 获取 DOM 元素（从 HTML 中获取，不创建）
     */
    getDOM() {
      if (!this.container || !this.textElement) {
        this.container = document.getElementById("subtitle-container")
        this.textElement = document.getElementById("subtitle-text")
        this.indicatorElement = document.getElementById("subtitle-indicator")

        if (!this.container || !this.textElement) {
          console.warn("[Subtitle] DOM 元素未找到")
        }
      }
    }

    /**
     * 初始化 Web Speech API
     */
    initSpeechRecognition() {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition

      if (!SpeechRecognition) {
        console.warn("[Subtitle] 浏览器不支持 Web Speech API，将使用后端识别")
        this.speechSupported = false
        return
      }

      try {
        this.recognition = new SpeechRecognition()
        this.recognition.continuous = true // 持续识别
        this.recognition.interimResults = true // 返回中间结果
        this.recognition.lang = "zh-CN" // 中文识别

        // 注意：Web Speech API 需要连接到 Google 的语音识别服务
        // 在某些网络环境下（如中国大陆），可能无法访问，会出现 network 错误
        // 如果遇到 network 错误，将自动使用后端识别

        // 识别结果事件
        this.recognition.onresult = (event) => {
          // 标记 Web Speech API 正常工作
          this.webSpeechWorking = true
          // 识别成功时重置错误计数
          this.errorCount = 0

          let interimTranscript = ""
          let finalTranscript = ""
          let hasFinal = false

          // 处理所有结果（从 resultIndex 开始的新结果）
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            const transcript = result[0].transcript

            if (result.isFinal) {
              finalTranscript += transcript
              hasFinal = true
            } else {
              interimTranscript += transcript
            }
          }

          // 优先处理最终结果
          if (finalTranscript) {
            const text = finalTranscript.trim()
            if (text) {
              // 清除中间结果缓存
              delete this.interimCache.user_interim
              // 使用打字机效果显示最终结果
              this.addText(text, "user", true, { skipDuplicateCheck: true })
            }
          } else if (interimTranscript) {
            const text = interimTranscript.trim()
            if (text) {
              // 中间结果：使用打字机效果显示（实时更新）
              this.addText(text, "user", false, { skipDuplicateCheck: true })
            }
          }
        }

        // 错误处理
        this.recognition.onerror = (event) => {
          const error = event.error
          const errorMessages = {
            "not-allowed": "麦克风权限被拒绝",
            network: "网络连接错误（可能无法访问 Google 服务）",
            "audio-capture": "无法捕获音频",
            "service-not-allowed": "服务不可用",
          }

          // 需要禁用的错误类型
          const disableErrors = [
            "network",
            "not-allowed",
            "audio-capture",
            "service-not-allowed",
          ]

          if (disableErrors.includes(error)) {
            console.warn(
              `[Subtitle] Web Speech API ${
                errorMessages[error] || error
              }，将使用后端识别`
            )
            this.speechSupported =
              error === "network" ? false : this.speechSupported
            this.webSpeechWorking = false
            this.isRecognizing = false
          } else if (error === "aborted") {
            this.isRecognizing = false
          }
          // "no-speech" 是正常情况，不需要处理
        }

        // 识别结束
        this.recognition.onend = () => {
          this.isRecognizing = false
          // 如果还在运行，自动重启（用于持续识别）
          if (this.isVisible && this.speechSupported) {
            try {
              this.recognition.start()
            } catch (e) {
              // 可能已经在运行，忽略错误
            }
          }
        }

        this.speechSupported = true
      } catch (error) {
        console.warn("[Subtitle] Web Speech API 初始化失败:", error)
        this.speechSupported = false
      }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
      // 延迟绑定，等待 dialogClient 加载
      const tryBindEvents = () => {
        if (window.dialogClient && window.dialogClient.startRecording) {
          // 当开始录音时，优先启动 Web Speech API
          // Web Speech API 是主要识别方式，后端识别作为备用
          const originalStartRecording =
            window.dialogClient.startRecording.bind(window.dialogClient)
          window.dialogClient.startRecording = async function (...args) {
            const result = await originalStartRecording(...args)
            // 立即启动 Web Speech API（优先使用）
            if (
              window.subtitleManager &&
              window.subtitleManager.speechSupported
            ) {
              window.subtitleManager.startUserRecognition()
            }
            return result
          }

          // 当停止录音时，停止语音识别
          const originalStopRecording = window.dialogClient.stopRecording.bind(
            window.dialogClient
          )
          window.dialogClient.stopRecording = function (...args) {
            const result = originalStopRecording(...args)
            // 停止用户语音识别
            if (window.subtitleManager) {
              window.subtitleManager.stopUserRecognition()
            }
            return result
          }
        } else {
          // 如果 dialogClient 还未加载，延迟重试
          setTimeout(tryBindEvents, 100)
        }
      }

      // 立即尝试绑定，如果失败则延迟重试
      tryBindEvents()
    }

    /**
     * 显示字幕容器
     */
    show() {
      // 确保 DOM 元素已获取
      if (!this.container) {
        this.getDOM()
      }
      if (this.container) {
        this.container.style.display = "block"
        this.isVisible = true

        // 启动 Web Speech API（优先使用）
        this.startUserRecognition()
      }
    }

    /**
     * 隐藏字幕容器
     */
    hide() {
      if (this.container) {
        this.container.style.display = "none"
        this.isVisible = false

        // 停止用户语音识别
        this.stopUserRecognition()
      }
    }

    /**
     * 启动用户语音识别
     */
    startUserRecognition() {
      if (!this.speechSupported || !this.recognition || this.isRecognizing) {
        return
      }

      try {
        this.recognition.start()
        this.isRecognizing = true
        this.errorCount = 0
      } catch (error) {
        if (error.name !== "InvalidStateError") {
          this.speechSupported = false
          this.webSpeechWorking = false
        } else {
          this.isRecognizing = true
        }
      }
    }

    /**
     * 停止用户语音识别
     */
    stopUserRecognition() {
      if (!this.recognition || !this.isRecognizing) return

      try {
        this.recognition.stop()
        this.isRecognizing = false
      } catch (error) {
        // 忽略停止错误
      }
    }

    /**
     * 添加文本（从后端或 Web Speech API）
     * @param {string} text - 文本内容
     * @param {string} speaker - 说话人 ('user' | 'assistant')
     * @param {boolean} isFinal - 是否为最终结果
     * @param {object} options - 额外选项
     */
    addText(text, speaker, isFinal = true, options = {}) {
      if (!text || !text.trim()) {
        return
      }

      // 确保 DOM 已获取
      if (!this.container || !this.textElement) {
        this.getDOM()
      }

      const trimmedText = text.trim()
      const timestamp = Date.now()

      // 去重检查：对于中间结果，避免存储完全相同的文本
      // 但允许文本更新（因为中间结果会不断变化）
      if (!isFinal) {
        const cacheKey = `${speaker}_interim`
        const lastInterim = this.interimCache[cacheKey]

        // 如果文本完全相同且当前已显示，只显示不存储（避免重复存储和显示）
        if (
          lastInterim === trimmedText &&
          this.currentText === trimmedText &&
          this.currentSpeaker === speaker
        ) {
          this.displayText(trimmedText, speaker, false)
          return
        }

        // 更新缓存（只保留最新的中间结果）
        this.interimCache[cacheKey] = trimmedText
      } else {
        // 最终结果到达时，清除对应的中间结果缓存
        const cacheKey = `${speaker}_interim`
        delete this.interimCache[cacheKey]
      }

      // 存储到历史记录
      this.history.push({
        id: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp,
        speaker,
        text: trimmedText,
        isFinal,
        duration: options.duration || 0,
        reply_id: options.reply_id || null,
        question_id: options.question_id || null,
        accumulated_text: options.accumulated_text || null,
      })

      this.updateStats(speaker)
      this.saveHistory()

      // 显示逻辑
      const textToShow = text.trim()

      // 用户和助手语音都使用打字机效果
      if (speaker === "user" || speaker === "assistant") {
        // 如果当前显示的文本已经是完整的目标文本，先清空再开始打字机效果
        if (
          this.currentText === textToShow &&
          this.currentSpeaker === speaker &&
          !this.isTyping
        ) {
          // 当前已显示完整文本，清空后重新开始打字机效果
          this.currentText = ""
          this.displayText("", speaker, false)
        }

        // 如果正在打字机效果，且新文本与当前不同
        if (
          this.isTyping &&
          this.currentText !== textToShow &&
          this.currentSpeaker === speaker
        ) {
          // 如果新文本是当前文本的扩展（累积文本更新），继续打字机效果
          if (
            textToShow.startsWith(this.currentText) &&
            textToShow.length > this.currentText.length
          ) {
            // 累积文本更新：继续打字机效果，从当前位置继续
            this.typeText(textToShow, speaker, options)
          } else {
            // 新文本完全不同，停止当前打字机效果，重新开始
            if (this.typingTimer) {
              clearTimeout(this.typingTimer)
              this.typingTimer = null
            }
            this.isTyping = false
            this.typeText(textToShow, speaker, options)
          }
        } else {
          // 没有正在打字机效果，或者说话人不同，直接开始
          this.typeText(textToShow, speaker, options)
        }
      } else {
        // 其他说话人：直接显示
        this.displayText(textToShow, speaker, false)
      }
    }

    /**
     * 打字机效果显示文本
     * @param {string} text - 文本内容
     * @param {string} speaker - 说话人
     * @param {object} options - 选项
     */
    typeText(text, speaker, options = {}) {
      this.getDOM()
      if (!this.textElement) return

      // 打字机效果
      const speed = options.typingSpeed || CONFIG.typingSpeed
      const targetText = text // 保存目标文本，防止被覆盖

      // 如果说话人改变，清空当前文本并停止之前的打字机效果
      if (this.currentSpeaker && this.currentSpeaker !== speaker) {
        if (this.isTyping && this.typingTimer) {
          clearTimeout(this.typingTimer)
          this.typingTimer = null
          this.isTyping = false
        }
        this.currentText = ""
        this.displayText("", speaker, false)
      }

      // 如果当前显示的文本是目标文本的前缀，从当前位置继续（累积文本更新）
      // 否则，停止之前的打字机效果（如果有）并从头开始
      let index = 0
      if (
        this.currentText &&
        this.currentSpeaker === speaker &&
        targetText.startsWith(this.currentText)
      ) {
        // 当前文本是目标文本的前缀，从当前位置继续（累积文本更新）
        // 停止旧的打字机效果（如果有），然后从当前位置继续
        if (this.isTyping && this.typingTimer) {
          clearTimeout(this.typingTimer)
          this.typingTimer = null
        }
        index = this.currentText.length
      } else {
        // 文本完全不同，停止之前的打字机效果（如果有）并从头开始
        if (this.isTyping && this.typingTimer) {
          clearTimeout(this.typingTimer)
          this.typingTimer = null
          this.isTyping = false
        }
        this.currentText = ""
        this.displayText("", speaker, false)
        index = 0
      }

      this.currentSpeaker = speaker
      this.isTyping = true

      const type = () => {
        if (index < targetText.length) {
          this.currentText = targetText.substring(0, index + 1)
          this.displayText(this.currentText, speaker, false)
          this.typingTimer = setTimeout(type, speed)
          index++
        } else {
          // 打字机效果完成
          this.displayText(targetText, speaker, true)
          this.typingTimer = null
          this.isTyping = false
        }
      }

      type()
    }

    /**
     * 显示文本（无动画）
     * @param {string} text - 文本内容
     * @param {string} speaker - 说话人
     * @param {boolean} isComplete - 是否完成
     */
    displayText(text, speaker, isComplete) {
      this.getDOM()
      if (!this.textElement) return

      // 确保容器可见
      if (this.container?.style.display === "none") {
        this.container.style.display = "block"
        this.isVisible = true
      }

      this.currentText = text
      this.textElement.textContent = text

      // 设置样式类
      this.textElement.className = `subtitle-text ${
        speaker === "user"
          ? "subtitle-user"
          : speaker === "assistant"
          ? "subtitle-assistant"
          : ""
      }`.trim()

      // 处理光标
      if (this.indicatorElement) {
        const shouldShow = !isComplete && text?.trim()
        if (shouldShow) {
          this.textElement.appendChild(this.indicatorElement)
          this.indicatorElement.style.display = "inline-block"
        } else {
          this.indicatorElement.style.display = "none"
        }
      }
    }

    /**
     * 更新统计信息
     */
    updateStats(speaker) {
      this.stats.totalMessages++
      this.stats.lastUpdate = Date.now()
      if (speaker === "user" || speaker === "assistant") {
        this.stats[`${speaker}Messages`]++
      }
    }

    /**
     * 保存历史记录到 sessionStorage
     */
    saveHistory() {
      try {
        // 限制历史记录长度（保留最新的记录）
        if (this.history.length > CONFIG.maxHistoryLength) {
          // 保留最新的记录，删除最旧的
          const removeCount = this.history.length - CONFIG.maxHistoryLength
          this.history = this.history.slice(removeCount)
        }

        // 保存历史记录
        sessionStorage.setItem(CONFIG.storageKey, JSON.stringify(this.history))

        // 保存统计信息
        sessionStorage.setItem(
          CONFIG.storageStatsKey,
          JSON.stringify(this.stats)
        )
      } catch (error) {
        console.warn("[Subtitle] 保存历史记录失败:", error)
        // sessionStorage 可能已满，尝试清理旧数据
        if (error.name === "QuotaExceededError") {
          this.history = this.history.slice(
            -Math.floor(CONFIG.maxHistoryLength / 2)
          )
          try {
            sessionStorage.setItem(
              CONFIG.storageKey,
              JSON.stringify(this.history)
            )
          } catch (e) {
            console.error("[Subtitle] 清理后仍无法保存:", e)
          }
        }
      }
    }

    /**
     * 从 sessionStorage 加载历史记录
     */
    loadHistory() {
      try {
        const historyStr = sessionStorage.getItem(CONFIG.storageKey)
        if (historyStr) {
          this.history = JSON.parse(historyStr)
        }

        const statsStr = sessionStorage.getItem(CONFIG.storageStatsKey)
        if (statsStr) {
          this.stats = { ...this.stats, ...JSON.parse(statsStr) }
        }
      } catch (error) {
        console.warn("[Subtitle] 加载历史记录失败:", error)
        this.history = []
      }
    }

    /**
     * 获取历史记录
     * @returns {Array} 历史记录数组
     */
    getHistory() {
      return [...this.history]
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
      return { ...this.stats }
    }

    /**
     * 清空历史记录
     */
    clearHistory() {
      this.history = []
      this.stats = {
        totalMessages: 0,
        userMessages: 0,
        assistantMessages: 0,
        lastUpdate: null,
      }
      this.interimCache = {}
      this.displayedAccumulatedTexts.clear()
      this.lastReplyId = null
      this.currentText = ""
      this.currentSpeaker = null
      if (this.typingTimer) {
        clearTimeout(this.typingTimer)
        this.typingTimer = null
      }
      this.isTyping = false
      this.pendingText = null
      this.pendingSpeaker = null
      sessionStorage.removeItem(CONFIG.storageKey)
      sessionStorage.removeItem(CONFIG.storageStatsKey)
    }

    /**
     * 获取所有存储的文本内容
     */
    getAllTexts(speaker = null, finalOnly = false) {
      return this.history.filter((item) => {
        return (
          (!speaker || item.speaker === speaker) && (!finalOnly || item.isFinal)
        )
      })
    }

    /**
     * 获取对话记录（按时间顺序，合并相邻的相同说话人）
     * @returns {Array} 合并后的对话记录
     */
    getConversation() {
      const conversation = []
      let currentItem = null

      for (const item of this.history) {
        // 如果是最终结果，或者与当前项不同说话人，创建新项
        if (
          item.isFinal ||
          !currentItem ||
          currentItem.speaker !== item.speaker
        ) {
          if (currentItem) {
            conversation.push(currentItem)
          }
          currentItem = {
            ...item,
            texts: item.isFinal ? [item.text] : [],
          }
        } else {
          // 中间结果累积到当前项
          if (!currentItem.texts) {
            currentItem.texts = []
          }
          currentItem.texts.push(item.text)
        }
      }

      // 添加最后一项
      if (currentItem) {
        conversation.push(currentItem)
      }

      return conversation
    }

    /**
     * 处理来自后端的文本消息
     * @param {Object} message - 文本消息对象
     */
    handleTextMessage(message) {
      if (!message || message.type !== "text_transcription") {
        console.warn("[Subtitle] 无效的消息类型:", message?.type)
        return
      }

      const speaker = message.speaker || "unknown"
      const text = message.text || message.accumulated_text || ""
      const isFinal = message.is_final !== false // 默认为 true

      // 用户语音且 Web Speech API 正常工作时，优先使用 Web Speech API
      // 但如果后端文本与当前显示不同且更长，可能是更准确的识别结果，允许更新
      if (speaker === "user" && this.webSpeechWorking) {
        // 如果后端文本比当前显示的文本更长或完全不同，可能是更准确的识别，允许更新
        const backendText = text.trim()
        const currentUserText =
          this.currentSpeaker === "user" ? this.currentText : ""

        // 如果后端文本明显不同且更长，可能是更准确的识别结果
        if (
          backendText.length > currentUserText.length + 5 ||
          (backendText !== currentUserText && backendText.length > 10)
        ) {
          // 允许后端识别覆盖（可能是更准确的结果）
        } else {
          // 否则忽略后端文本，使用 Web Speech API 的结果
          return
        }
      }

      if (!text?.trim()) return

      if (!this.isVisible) this.show()

      // 助手语音：如果有累积文本，优先显示累积文本（实时更新）
      if (speaker === "assistant" && message.accumulated_text) {
        const accumulatedText = message.accumulated_text.trim()

        // 如果累积文本与当前显示的文本完全相同，跳过（避免重复显示）
        if (
          this.currentText === accumulatedText &&
          this.currentSpeaker === speaker
        ) {
          return
        }

        // 如果这是新的回复（不同的 reply_id），清空去重缓存和当前文本
        if (message.reply_id) {
          const lastReplyId = this.lastReplyId
          if (lastReplyId && lastReplyId !== message.reply_id) {
            // 新的回复，清空去重缓存和当前状态
            this.displayedAccumulatedTexts.clear()
            this.currentText = ""
            this.currentSpeaker = null
            // 停止当前打字机效果
            if (this.typingTimer) {
              clearTimeout(this.typingTimer)
              this.typingTimer = null
            }
            this.isTyping = false
          }
          this.lastReplyId = message.reply_id
        }

        // 使用 reply_id 作为去重键（同一回复的累积文本允许更新）
        const dedupeKey = message.reply_id
          ? `assistant_${message.reply_id}`
          : `assistant_${accumulatedText}`

        // 如果累积文本比当前显示的文本更长，说明有新内容，需要更新
        const shouldUpdate =
          accumulatedText.length > this.currentText.length ||
          this.currentText !== accumulatedText

        // 立即显示累积文本（实时更新，不等待打字机效果完成）
        this.addText(accumulatedText, speaker, true, {
          reply_id: message.reply_id,
          question_id: message.question_id,
          accumulated_text: accumulatedText,
          skipDuplicateCheck: true,
        })
      } else {
        // 用户语音或没有累积文本的助手语音
        this.addText(text, speaker, isFinal, {
          accumulated_text: message.accumulated_text,
          reply_id: message.reply_id,
          question_id: message.question_id,
          skipDuplicateCheck: true,
        })
      }
    }

    /**
     * 销毁实例
     */
    destroy() {
      // 停止语音识别
      this.stopUserRecognition()

      // 清除定时器
      if (this.typingTimer) {
        clearTimeout(this.typingTimer)
        this.typingTimer = null
      }

      // 清理状态
      this.isTyping = false
      this.pendingText = null
      this.pendingSpeaker = null
      this.currentText = ""
      this.currentSpeaker = null

      // 隐藏容器
      this.hide()

      this.isInitialized = false
    }
  }

  // 创建单例
  const subtitleManager = new SubtitleManager()

  // 导出到全局
  window.SubtitleManager = SubtitleManager
  window.subtitleManager = subtitleManager
})(window)
