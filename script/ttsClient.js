/**
 * 知己心探测试 - 实时语音对话客户端
 * 通过 WebRTC 直接连接到 OpenAI Realtime API，实现实时语音对话
 */

import { getOpenAIConfig } from "./config.js"
;(function (window) {
  "use strict"

  const DIALOG_CONFIG = {
    openai: getOpenAIConfig(),
    inputAudio: {
      sampleRate: 24000,
      channels: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    outputAudio: {
      sampleRate: 24000,
      channels: 1,
    },
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

  async function playPCMWithWebAudio(
    pcmData,
    sampleRate,
    onendedCallback = null
  ) {
    // 在播放前保存PCM数据到录制器
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

      // WebRTC 相关
      this.pc = null
      this.dc = null
      this.audioElement = null

      // 音频相关
      this.audioContext = null
      this.mediaStream = null
      this.isConnected = false

      // 混合录音相关
      this.isMixedRecording = false
      this.mixedStreamDestination = null
      this.mixedMediaRecorder = null
      this.mixedAudioChunks = []
      this.micSource = null
      this.remoteAudioSource = null

      // 回调
      this.onConnect = null
      this.onDisconnect = null
      this.onError = null
      this.onMessage = null
      this.onTranscript = null
    }

    async connect(systemPrompt = null, speaker = "alloy", phase = null) {
      if (this.isConnected) {
        console.log("[Dialog] 已连接，先断开现有连接")
        await this.disconnect()
      }

      try {
        console.log("[Dialog] 开始建立 WebRTC 连接到 OpenAI")

        // 1. 获取临时令牌
        const session = await this.getEphemeralToken(systemPrompt, speaker)
        const ephemeralKey = session.client_secret.value
        console.log("[Dialog] 已获取临时令牌")

        // 2. 获取麦克风权限
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: this.config.inputAudio
        })
        console.log("[Dialog] 麦克风已启用")

        // 3. 初始化音频上下文
        this.audioContext = new AudioContext({ sampleRate: 24000 })

        // 4. 创建 RTCPeerConnection
        this.pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        })

        // 5. 设置音频播放
        this.audioElement = document.createElement("audio")
        this.audioElement.autoplay = true

        this.pc.ontrack = (event) => {
          console.log("[Dialog] 收到远程音频轨道")
          this.audioElement.srcObject = event.streams[0]
        }

        // 6. 添加本地音频轨道
        this.mediaStream.getTracks().forEach(track => {
          this.pc.addTrack(track, this.mediaStream)
        })

        // 7. 创建数据通道
        this.dc = this.pc.createDataChannel("oai-events")

        // 等待数据通道打开
        const dataChannelReady = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("数据通道打开超时"))
          }, 10000) // 10秒超时

          this.dc.onopen = () => {
            clearTimeout(timeout)
            console.log("[Dialog] 数据通道已打开")
            resolve()
          }

          this.dc.onerror = (error) => {
            clearTimeout(timeout)
            console.error("[Dialog] 数据通道错误:", error)
            reject(error)
          }
        })

        this.setupDataChannel()

        // 8. 创建 SDP offer
        const offer = await this.pc.createOffer()
        await this.pc.setLocalDescription(offer)

        // 9. 发送 SDP 到 OpenAI
        const model = this.config.openai.model || "gpt-4o-realtime-preview-2024-12-17"
        const baseUrl = "https://api.openai.com/v1/realtime"
        const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp"
          },
          body: offer.sdp
        })

        if (!sdpResponse.ok) {
          const error = await sdpResponse.text()
          throw new Error(`SDP 交换失败: ${sdpResponse.status} - ${error}`)
        }

        // 10. ���置远程 SDP
        const answerSdp = await sdpResponse.text()
        await this.pc.setRemoteDescription({
          type: "answer",
          sdp: answerSdp
        })

        // 11. 等待数据通道打开
        console.log("[Dialog] 等待数据通道打开...")
        await dataChannelReady
        console.log("[Dialog] 数据通道已就绪")

        this.isConnected = true
        console.log("[Dialog] WebRTC 连接成功")

        if (this.onConnect) {
          this.onConnect()
        }

      } catch (error) {
        console.error("[Dialog] 连接失败:", error)
        this.isConnected = false
        await this.disconnect()
        if (this.onError) {
          this.onError(error)
        }
        throw error
      }
    }

    async getEphemeralToken(systemPrompt, speaker) {
      const apiKey = this.config.openai.apiKey
      if (!apiKey) {
        throw new Error("未配置 OpenAI API Key")
      }

      const model = this.config.openai.model || "gpt-4o-realtime-preview-2024-12-17"
      const instructions = systemPrompt || this.config.openai.systemPrompt || "你是一个友好的AI助手。"

      const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          voice: speaker || "alloy",
          instructions: instructions,
          input_audio_transcription: {
            model: "whisper-1"
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 800
          }
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`获取令牌失败: ${response.status} - ${error}`)
      }

      return await response.json()
    }

    setupDataChannel() {
      // onopen 和 onerror 已在 connect 方法中设置，这里只设置其他事件

      this.dc.onclose = () => {
        console.log("[Dialog] 数据通道已关闭")
      }

      this.dc.onmessage = (event) => {
        this.handleServerEvent(JSON.parse(event.data))
      }
    }

    handleServerEvent(event) {
      console.log("[Dialog] 服务器事件:", event.type)

      if (this.onMessage) {
        this.onMessage(event)
      }

      switch (event.type) {
        case "session.created":
          console.log("[Dialog] 会话已创建")
          break

        case "conversation.item.input_audio_transcription.completed":
          if (event.transcript && this.onTranscript) {
            this.onTranscript({
              speaker: "user",
              text: event.transcript,
              is_final: true
            })
          }
          // 同时转发给字幕管理器
          if (window.subtitleManager && event.transcript) {
            window.subtitleManager.handleTextMessage({
              type: "text_transcription",
              speaker: "user",
              text: event.transcript,
              accumulated_text: event.transcript,
              is_final: true
            })
          }
          break

        case "response.audio_transcript.done":
          if (event.transcript && this.onTranscript) {
            this.onTranscript({
              speaker: "assistant",
              text: event.transcript,
              is_final: true
            })
          }
          // 同时转发给字幕管理器
          if (window.subtitleManager && event.transcript) {
            window.subtitleManager.handleTextMessage({
              type: "text_transcription",
              speaker: "assistant",
              text: event.transcript,
              accumulated_text: event.transcript,
              is_final: true
            })
          }
          break

        case "error":
          console.error("[Dialog] 服务器错误:", event.error)
          if (this.onError) {
            this.onError(new Error(event.error?.message || JSON.stringify(event.error)))
          }
          break
      }
    }

    sendEvent(event) {
      if (!this.dc) {
        console.error("[Dialog] 数据通道不存在")
        return false
      }

      if (this.dc.readyState !== "open") {
        console.warn("[Dialog] 数据通道未就绪，状态:", this.dc.readyState)
        return false
      }

      try {
        const eventStr = JSON.stringify(event)
        this.dc.send(eventStr)
        console.log("[Dialog] 事件已发送:", event.type)
        return true
      } catch (error) {
        console.error("[Dialog] 发送事件失败:", error)
        return false
      }
    }

    async disconnect() {
      this.isConnected = false

      if (this.dc) {
        this.dc.close()
        this.dc = null
      }

      if (this.pc) {
        this.pc.close()
        this.pc = null
      }

      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop())
        this.mediaStream = null
      }

      if (this.audioContext) {
        await this.audioContext.close().catch(err => {
          console.error("[Dialog] 关闭 AudioContext 失败:", err)
        })
        this.audioContext = null
      }

      if (this.audioElement) {
        this.audioElement.srcObject = null
        this.audioElement = null
      }

      console.log("[Dialog] 已断开所有连接")

      if (this.onDisconnect) {
        this.onDisconnect()
      }
    }

    // 兼容旧接口的方法
    async sendInitMessage(speaker, mode, phase = null) {
      console.log("[Dialog] sendInitMessage 在 WebRTC 模式下不需要，已自动初始化")
    }

    async sendTTSText(content, options = {}) {
      // WebRTC 模式下通过文本消息发送
      await this.sendTextQuery(content, options.phase)
    }

    async sendTextQuery(text, phase = null) {
      if (!this.isConnected) {
        console.warn("[Dialog] 未连接，无法发送文本")
        throw new Error("DialogClient 未连接")
      }

      console.log("[Dialog] 发送文本查询:", text.substring(0, 100) + (text.length > 100 ? "..." : ""))

      // 通过数据通道发送文本消息
      const success1 = this.sendEvent({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{
            type: "input_text",
            text: text
          }]
        }
      })

      if (!success1) {
        throw new Error("发送 conversation.item.create 事件失败")
      }

      // 触发响应
      const success2 = this.sendEvent({
        type: "response.create"
      })

      if (!success2) {
        throw new Error("发送 response.create 事件失败")
      }

      console.log("[Dialog] 文本查询已发送，等待 AI 响应")
    }

    // 兼容方法：startRecording 和 stopRecording
    async startRecording() {
      console.log("[Dialog] WebRTC 模式下音频自动传输，无需手动开始录音")
    }

    stopRecording() {
      console.log("[Dialog] WebRTC 模式下音频自动传输，无需手动停止录音")
    }

    stopPlayback() {
      if (this.audioElement) {
        this.audioElement.pause()
        this.audioElement.currentTime = 0
      }
      console.log("[Dialog] 已停止音频播放")
    }

    // 开始混合录音（麦克风 + AI 回复）
    async startMixedRecording() {
      if (this.isMixedRecording) {
        console.warn("[Dialog] 混合录音已在进行中")
        return
      }

      if (!this.audioContext) {
        throw new Error("[Dialog] AudioContext 未初始化，请先连接")
      }

      // 创建混合流目标
      if (!this.mixedStreamDestination) {
        this.mixedStreamDestination = this.audioContext.createMediaStreamDestination()
      }

      // 连接麦克风音频
      if (this.mediaStream && !this.micSource) {
        this.micSource = this.audioContext.createMediaStreamSource(this.mediaStream)
        this.micSource.connect(this.mixedStreamDestination)
        console.log("[Dialog] 麦克风已连接到混合流")
      }

      // 连接远程音频（AI 回复）
      if (this.audioElement && this.audioElement.srcObject && !this.remoteAudioSource) {
        this.remoteAudioSource = this.audioContext.createMediaStreamSource(this.audioElement.srcObject)
        this.remoteAudioSource.connect(this.mixedStreamDestination)
        console.log("[Dialog] 远程音频已连接到混合流")
      }

      // 创建 MediaRecorder 录制混合流
      this.mixedAudioChunks = []
      this.mixedMediaRecorder = new MediaRecorder(this.mixedStreamDestination.stream, {
        mimeType: "audio/webm;codecs=opus"
      })

      this.mixedMediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.mixedAudioChunks.push(event.data)
        }
      }

      this.mixedMediaRecorder.start()
      this.isMixedRecording = true
      console.log("[Dialog] 混合录音已开始")
    }

    // 停止混合录音并返回音频 Blob
    async stopMixedRecording() {
      if (!this.isMixedRecording || !this.mixedMediaRecorder) {
        console.warn("[Dialog] 混合录音未在进行中")
        return null
      }

      return new Promise((resolve) => {
        this.mixedMediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.mixedAudioChunks, { type: "audio/webm" })
          console.log("[Dialog] 混合录音已停止，大小:", (audioBlob.size / 1024 / 1024).toFixed(2), "MB")
          this.isMixedRecording = false
          this.mixedAudioChunks = []
          resolve(audioBlob)
        }
        this.mixedMediaRecorder.stop()
      })
    }

    // 获取混合录音状态
    getMixedRecordingStatus() {
      return {
        isRecording: this.isMixedRecording,
        chunksCount: this.mixedAudioChunks.length
      }
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
