/**
 * 知己心探测试 - 实时语音对话客户端
 * 通过 WebSocket 连接到后端服务器，实现实时语音对话
 */

import { getWebSocketUrl } from "./config.js"
;(function (window) {
  "use strict"

  const DIALOG_CONFIG = {
    wsUrl: getWebSocketUrl(),
    inputAudio: {
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
    },
    outputAudio: {
      sampleRate: 24000,
      channels: 1,
      bitsPerSample: 16,
    },
    bufferSize: 4096,
  }

  function convertFloat32ToS16le(input) {
    const buffer = new ArrayBuffer(input.length * 2)
    const view = new DataView(buffer)
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]))
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }
    return buffer
  }

<<<<<<< HEAD
  /**
   * 简单线性重采样 Int16Array，从 srcRate 到 dstRate
   * 质量足够用于短语音片段，保持顺序与时长近似
   */
  function resampleInt16Array(srcInt16, srcRate, dstRate) {
    if (!srcInt16 || srcInt16.length === 0) return new Int16Array(0)
    if (srcRate === dstRate) return srcInt16
    const ratio = dstRate / srcRate
    const newLen = Math.round(srcInt16.length * ratio)
    const out = new Int16Array(newLen)
    for (let i = 0; i < newLen; i++) {
      const srcPos = i / ratio
      const i0 = Math.floor(srcPos)
      const frac = srcPos - i0
      const s0 = srcInt16[i0] || 0
      const s1 = srcInt16[i0 + 1] || 0
      out[i] = Math.round(s0 + (s1 - s0) * frac)
    }
    return out
  }

  function shouldWriteAIToRecorder() {
    return !Boolean(window._skipWritingAIToAudioRecorder)
  }

  window.setSkipWritingAIToAudioRecorder = function (
    skip = true,
    timeoutMs = 30000
  ) {
    try {
      window._skipWritingAIToAudioRecorder = Boolean(skip)
      console.log(
        "[AudioFix] setSkipWritingAIToAudioRecorder:",
        window._skipWritingAIToAudioRecorder
      )
      if (window._skipAIWriteTimer) {
        clearTimeout(window._skipAIWriteTimer)
        window._skipAIWriteTimer = null
      }
      if (skip && timeoutMs > 0) {
        window._skipAIWriteTimer = setTimeout(() => {
          window._skipWritingAIToAudioRecorder = false
          window._skipAIWriteTimer = null
          console.log(
            "[AudioFix] auto restored write-AI-to-recorder = false (timeout)"
          )
        }, timeoutMs)
      }
    } catch (e) {
      console.warn("[AudioFix] setSkipWritingAIToAudioRecorder failed:", e)
    }
  }

=======
>>>>>>> parent of 5886162 ('feat:用户录音处理')
  async function playPCMWithWebAudio(
    pcmData,
    sampleRate,
    onendedCallback = null
  ) {
<<<<<<< HEAD
=======
    // 在播放前保存PCM数据到录制器
>>>>>>> parent of 5886162 ('feat:用户录音处理')
    if (
      window.AudioRecorder &&
      window.AudioRecorder._instance &&
      window.AudioRecorder._instance.isRecording
    ) {
      try {
        const int16View = new Int16Array(pcmData)
        window.AudioRecorder.addPCMData(int16View, sampleRate)
      } catch (error) {
        console.warn("[TTS] 保存音频数据失败:", error)
      }
    }

    const audioContext = new (window.AudioContext || window.webkitAudioContext)(
      {
        sampleRate: sampleRate,
      }
    )

    if (audioContext.state === "suspended") {
      await audioContext.resume()
    }

    const int16View = new Int16Array(pcmData)
    const float32Array = new Float32Array(int16View.length)
    for (let i = 0; i < int16View.length; i++) {
      float32Array[i] = int16View[i] / 32768.0
    }

    const audioBuffer = audioContext.createBuffer(
      1,
      float32Array.length,
      sampleRate
    )
    audioBuffer.copyToChannel(float32Array, 0)

    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(audioContext.destination)

    if (onendedCallback) {
      source.onended = () => {
        if (typeof onendedCallback === "function") {
          onendedCallback()
        }
      }
    }

    source.start(0)
    return source
  }

  class RealtimeDialogClient {
    constructor(config = {}) {
      this.config = { ...DIALOG_CONFIG, ...config }
      this.ws = null
      this.audioContext = null
      this.mediaStream = null
      this.scriptProcessor = null
      this.isRecording = false
      this.isConnected = false

      this.audioQueue = []
      this.isPlaying = false
      this.nextPlayTime = 0
      this.currentSource = null

      this.onConnect = null
      this.onDisconnect = null
      this.onError = null
      this.onRecordingStart = null
      this.onRecordingStop = null
    }

    async connect() {
      // 修复：如果已有连接，先断开以确保干净状态
      if (
        this.ws &&
        (this.ws.readyState === WebSocket.OPEN ||
          this.ws.readyState === WebSocket.CONNECTING)
      ) {
        console.log("[Dialog] 关闭现有WebSocket连接")
        this.ws.close()
        // 等待连接关闭
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      return new Promise((resolve, reject) => {
        // 检测是否为移动端
        const isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          )
        const connectionTimeout = isMobile ? 15000 : 10000 // 移动端使用更长的超时时间

        let timeoutId
        let hasResolved = false

        try {
          console.log("[Dialog] 开始连接 WebSocket:", this.config.wsUrl)
          console.log("[Dialog] 设备类型:", isMobile ? "移动端" : "桌面端")

          this.ws = new WebSocket(this.config.wsUrl)

          // 设置连接超时
          timeoutId = setTimeout(() => {
            if (!hasResolved) {
              console.error("[Dialog] WebSocket 连接超时")
              if (this.ws) {
                this.ws.close()
              }
              const error = new Error(
                `连接超时（${connectionTimeout}ms），请检查网络连接`
              )
              error.isTimeout = true
              error.isMobile = isMobile
              this.isConnected = false
              if (this.onError) {
                this.onError(error)
              }
              reject(error)
            }
          }, connectionTimeout)

          this.ws.onopen = () => {
            if (hasResolved) return
            hasResolved = true
            clearTimeout(timeoutId)

            try {
              this.ws.binaryType = "arraybuffer"
            } catch (e) {
              console.warn("[Dialog] 设置 binaryType 失败:", e)
            }
            console.log("[Dialog] WebSocket 连接成功")
            this.isConnected = true
            if (this.onConnect) {
              this.onConnect()
            }
            resolve()
          }

          this.ws.onmessage = (event) => {
            this.handleMessage(event)
          }

          this.ws.onclose = (event) => {
            console.log("[Dialog] WebSocket 连接已关闭", {
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean,
            })
            this.isConnected = false
            this.stopRecording()
            this.audioQueue = []
            this.isPlaying = false
            this.nextPlayTime = 0
            if (this.onDisconnect) {
              this.onDisconnect()
            }
          }

          this.ws.onerror = (error) => {
            if (hasResolved) return
            hasResolved = true
            clearTimeout(timeoutId)

            console.error("[Dialog] WebSocket 错误:", error)
            console.error(
              "[Dialog] WebSocket 状态:",
              this.ws ? this.ws.readyState : "null"
            )
            console.error("[Dialog] WebSocket URL:", this.config.wsUrl)

            this.isConnected = false

            // 创建更详细的错误信息
            const detailedError = new Error("WebSocket 连接失败")
            detailedError.originalError = error
            detailedError.url = this.config.wsUrl
            detailedError.isMobile = isMobile
            detailedError.readyState = this.ws ? this.ws.readyState : null

            if (this.onError) {
              this.onError(detailedError)
            }
            reject(detailedError)
          }
        } catch (error) {
          if (timeoutId) clearTimeout(timeoutId)
          console.error("[Dialog] 连接失败:", error)
          console.error("[Dialog] 错误详情:", {
            message: error.message,
            stack: error.stack,
            url: this.config.wsUrl,
            isMobile: isMobile,
          })

          const detailedError = new Error(
            `无法创建 WebSocket 连接: ${error.message}`
          )
          detailedError.originalError = error
          detailedError.url = this.config.wsUrl
          detailedError.isMobile = isMobile
          reject(detailedError)
        }
      })
    }

    handleMessage(event) {
      // 优先处理文本消息（JSON 字符串）
      if (typeof event.data === "string") {
        try {
          const textData = JSON.parse(event.data)
          if (textData && textData.type === "text_transcription") {
            // 调试日志
            // console.log("[TTS] 收到文本转录消息:", {
            //   speaker: textData.speaker,
            //   hasText: !!textData.text,
            //   hasAccumulated: !!textData.accumulated_text,
            //   isFinal: textData.is_final,
            // })
            // 转发给字幕管理器
            if (window.subtitleManager) {
              window.subtitleManager.handleTextMessage(textData)
            } else {
              console.warn("[TTS] subtitleManager 未初始化，无法显示文本")
            }
            return // 文本消息处理完成，不继续处理音频
          }
        } catch (e) {
          // 不是 JSON 文本，继续处理为音频
        }
      }

      // 处理音频数据（二进制）
      let dataPromise
      if (event.data instanceof Blob) {
        dataPromise = event.data.arrayBuffer()
      } else if (event.data instanceof ArrayBuffer) {
        dataPromise = Promise.resolve(event.data)
      }

      if (dataPromise) {
        dataPromise
          .then((arrayBuffer) => {
            this.audioQueue.push(arrayBuffer)
            if (!this.isPlaying) {
              this.playQueue()
            }
          })
          .catch((err) => {
            console.error("[Dialog] 处理消息数据失败:", err)
          })
      }
    }

    async playQueue() {
      if (this.audioQueue.length === 0) {
        this.isPlaying = false
        return
      }

      this.isPlaying = true
      const arrayBuffer = this.audioQueue.shift()

      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)({
          sampleRate: this.config.outputAudio.sampleRate,
        })
        this.nextPlayTime = this.audioContext.currentTime
      }

      if (!this.audioContext || arrayBuffer.byteLength === 0) {
        this.playQueue()
        return
      }

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume()
      }

      const int16View = new Int16Array(arrayBuffer)

      // 在播放前保存PCM数据到录制器
      if (
        window.AudioRecorder &&
        window.AudioRecorder._instance &&
        window.AudioRecorder._instance.isRecording
      ) {
        try {
          window.AudioRecorder.addPCMData(
            int16View,
            this.config.outputAudio.sampleRate
          )
        } catch (error) {
          console.warn("[TTS] 保存音频数据失败:", error)
        }
      }

      const float32Array = new Float32Array(int16View.length)
      for (let i = 0; i < int16View.length; i++) {
        float32Array[i] = int16View[i] / 32768.0
      }

      const audioBuffer = this.audioContext.createBuffer(
        1,
        float32Array.length,
        this.audioContext.sampleRate
      )
      audioBuffer.copyToChannel(float32Array, 0)

      const source = this.audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(this.audioContext.destination)
      this.currentSource = source

      const currentTime = this.audioContext.currentTime
      const startTime = Math.max(currentTime, this.nextPlayTime)
      source.start(startTime)

      this.nextPlayTime = startTime + audioBuffer.duration
      source.onended = () => {
        if (this.currentSource === source) {
          this.currentSource = null
        }
        this.playQueue()
      }
    }

    async initAudio() {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)({
          sampleRate: this.config.outputAudio.sampleRate,
        })
        this.nextPlayTime = this.audioContext.currentTime
      }

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume()
      }

      if (!this.mediaStream) {
        try {
          this.mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              sampleRate: this.config.inputAudio.sampleRate,
              channelCount: 1,
              echoCancellation: true,
            },
          })
        } catch (err) {
          console.error("[Dialog] 获取麦克风失败:", err)
          if (this.onError) {
            this.onError(new Error("无法访问麦克风，请检查权限设置"))
          }
          return false
        }
      }
      return true
    }

    async startRecording() {
      if (this.isRecording) {
        console.warn("[Dialog] 已在录音中")
        return
      }

      if (
        !this.isConnected ||
        !this.ws ||
        this.ws.readyState !== WebSocket.OPEN
      ) {
        throw new Error("WebSocket 未连接，请先调用 connect()")
      }

      const success = await this.initAudio()
      if (!success) {
        throw new Error("无法初始化音频输入")
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream)
      this.scriptProcessor = this.audioContext.createScriptProcessor(
        this.config.bufferSize,
        1,
        1
      )

      this.scriptProcessor.onaudioprocess = (event) => {
        if (!this.isRecording) return

        const inputData = event.inputBuffer.getChannelData(0)
        const pcmData = convertFloat32ToS16le(inputData)

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(pcmData)
        }
      }

      source.connect(this.scriptProcessor)
      this.scriptProcessor.connect(this.audioContext.destination)

      this.isRecording = true
      console.log("[Dialog] 开始录音")

      if (this.onRecordingStart) {
        this.onRecordingStart()
      }
    }

    stopRecording() {
      if (!this.isRecording) {
        return
      }

      this.isRecording = false

      if (this.scriptProcessor) {
        this.scriptProcessor.disconnect()
        this.scriptProcessor = null
      }

      console.log("[Dialog] 停止录音")

      if (this.onRecordingStop) {
        this.onRecordingStop()
      }
    }

    /**
     * 发送初始化消息
     * @param {string} speaker - 说话人
     * @param {string} mode - 模式 (audio/text)
     * @param {string|null} phase - 阶段 (pretest/intest/posttest)
     */
    sendInitMessage(speaker, mode, phase = null) {
      if (
        !this.isConnected ||
        !this.ws ||
        this.ws.readyState !== WebSocket.OPEN
      ) {
        throw new Error("WebSocket未连接，无法发送初始化消息")
      }

      const payload = {
        type: "init",
        speaker: speaker,
        mode: mode,
      }
      if (phase) {
        payload.phase = phase
      }

      const message = JSON.stringify(payload)
      try {
        console.log("[Dialog] 发送初始化消息:", payload)
      } catch (e) {
        console.log("[Dialog] 发送初始化消息（原始）:", message)
      }
      this.ws.send(message)
    }

    /**
     * 发送 TTS 文本消息
     * @param {string} content - 文本内容
     * @param {Object} options - 选项
     * @param {boolean} options.start - 是否开始
     * @param {boolean} options.end - 是否结束
     * @param {boolean} options.is_user_querying - 是否用户查询
     * @param {string|null} options.phase - 阶段 (pretest/intest/posttest)
     */
    sendTTSText(content, options = {}) {
      const {
        start = true,
        end = true,
        is_user_querying = false,
        phase = null,
      } = options

      if (
        !this.isConnected ||
        !this.ws ||
        this.ws.readyState !== WebSocket.OPEN
      ) {
        throw new Error("WebSocket未连接，无法发送TTS文本")
      }

      const payload = {
        type: "tts_text",
        start: Boolean(start),
        end: Boolean(end),
        is_user_querying: Boolean(is_user_querying),
        content: String(content || ""),
      }
      if (phase) {
        payload.phase = phase
      }

      const message = JSON.stringify(payload)
      try {
        console.log("[Dialog] 发送TTS文本消息:", payload)
      } catch (e) {
        console.log("[Dialog] 发送TTS文本消息（原始）:", message)
      }
      this.ws.send(message)
    }

    async sendTextQuery(text, phase = null) {
      // 修复：添加连接状态检查和自动重连机制
      if (
        !this.isConnected ||
        !this.ws ||
        this.ws.readyState !== WebSocket.OPEN
      ) {
        console.warn("[Dialog] WebSocket未连接，尝试重新连接...")
        try {
          await this.connect()
        } catch (err) {
          throw new Error("WebSocket重新连接失败: " + err.message)
        }
      }

      const payload = {
        type: "text_query",
        content: String(text || ""),
      }
      if (phase) {
        payload.phase = phase
      }

      const message = JSON.stringify(payload)
      try {
        console.log("[Dialog] 发送文本查询:", payload)
      } catch (e) {
        console.log("[Dialog] 发送文本查询（原始）:", message)
      }
      this.ws.send(message)
    }

    disconnect() {
      this.stopRecording()

      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop())
        this.mediaStream = null
      }

      if (this.audioContext) {
        this.audioContext.close().catch((err) => {
          console.error("[Dialog] 关闭 AudioContext 失败:", err)
        })
        this.audioContext = null
      }

      if (this.ws) {
        this.ws.close()
        this.ws = null
      }

      this.isConnected = false
      this.audioQueue = []
      this.isPlaying = false
      this.nextPlayTime = 0

      console.log("[Dialog] 已断开所有连接")
    }

    stopPlayback() {
      this.audioQueue = []
      this.isPlaying = false
      if (this.currentSource) {
        try {
          this.currentSource.stop()
        } catch (err) {
          console.warn("[Dialog] 停止当前音频失败:", err)
        }
        this.currentSource = null
      }
      if (this.audioContext) {
        this.nextPlayTime = this.audioContext.currentTime
      } else {
        this.nextPlayTime = 0
      }
      console.log("[Dialog] 已清空音频播放队列")
    }
  }

  const dialogClient = new RealtimeDialogClient()

  window.RealtimeDialogClient = RealtimeDialogClient
  window.dialogClient = dialogClient

  window.playTTSAudio = async function (
    text,
    audioElement,
    onendedCallback = null,
    options = {}
  ) {
    if (typeof text === "string" && text.startsWith("audio/")) {
      if (audioElement) {
        audioElement.src = text
        audioElement.onended = onendedCallback
        audioElement.play().catch((e) => console.error("音频播放失败:", e))
      }
      return
    }

    console.warn(
      "[TTS] 文本转语音功能已迁移到实时对话模式，请使用 dialogClient 进行实时对话"
    )
    if (options.onError) {
      options.onError(
        new Error(
          "请使用 dialogClient.connect() 和 dialogClient.startRecording() 进行实时语音对话"
        )
      )
    }
  }

  if (typeof console !== "undefined") {
    console.log("[Dialog] 实时语音对话客户端模块已加载")
  }
})(window)
