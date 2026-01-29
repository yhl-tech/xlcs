/**
 * 实时语音对话
 * 通过 WebRTC 连接到 OpenAI Realtime API 实现语音对话
 * 单例模式：所有组件共享同一个 WebRTC 连接
 */
import { ref, reactive } from 'vue'
import { OPENAI_CONFIG } from '@/utils/constants'

// 对话配置
const DIALOG_CONFIG = {
  openai: OPENAI_CONFIG,
  inputAudio: {
    sampleRate: 24000,
    channels: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  outputAudio: {
    sampleRate: 24000,
    channels: 1
  }
}

// ==================== 单例状态（所有组件共享） ====================

// 连接状态
const isConnected = ref(false)
const isConnecting = ref(false)
const connectionError = ref(null)

// 对话状态
const isSpeaking = ref(false)
const isListening = ref(false)

// 转录文本
const transcripts = reactive([])
const currentTranscript = ref('')

// WebRTC 相关
let pc = null
let dc = null
let audioElement = null
let audioContext = null
let mediaStream = null

// 回调
const callbacks = {
  onConnect: null,
  onDisconnect: null,
  onError: null,
  onMessage: null,
  onTranscript: null
}

export function useRealtimeDialog() {
  // ==================== 返回单例状态和方法 ====================
  
  // ==================== 方法 ====================
  
  /**
   * 连接到 OpenAI Realtime API
   * @param {string} systemPrompt - 系统提示词
   * @param {string} speaker - 语音角色
   */
  async function connect(systemPrompt = null, speaker = 'alloy') {
    if (isConnected.value || isConnecting.value) {
      console.log('[Dialog] 已连接或正在连接')
      return
    }
    
    isConnecting.value = true
    connectionError.value = null
    
    try {
      console.log('[Dialog] ========== 开始建立 WebRTC 连接 ==========')
      
      // 1. 获取临时令牌
      console.log('[Dialog] 步骤 1/10: 获取临时令牌...')
      const session = await getEphemeralToken(systemPrompt, speaker)
      const ephemeralKey = session.client_secret.value
      console.log('[Dialog] ✓ 步骤 1/10: 已获取临时令牌')
      
      // 2. 获取麦克风权限
      console.log('[Dialog] 步骤 2/10: 请求麦克风权限...')
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: DIALOG_CONFIG.inputAudio
      })
      console.log('[Dialog] ✓ 步骤 2/10: 麦克风已启用')
      
      // 3. 初始化音频上下文
      console.log('[Dialog] 步骤 3/10: 初始化音频上下文...')
      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000
      })
      console.log('[Dialog] ✓ 步骤 3/10: 音频上下文已初始化')
      
      // 4. 创建 RTCPeerConnection
      console.log('[Dialog] 步骤 4/10: 创建 RTCPeerConnection...')
      pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })
      console.log('[Dialog] ✓ 步骤 4/10: RTCPeerConnection 已创建')
      
      // 5. 设置音频播放
      console.log('[Dialog] 步骤 5/10: 设置音频播放元素...')
      audioElement = document.createElement('audio')
      audioElement.autoplay = true
      
      pc.ontrack = (event) => {
        console.log('[Dialog] 收到远程音频轨道')
        audioElement.srcObject = event.streams[0]
        isSpeaking.value = true
      }
      console.log('[Dialog] ✓ 步骤 5/10: 音频播放元素已创建')
      
      // 6. 添加本地音频轨道
      console.log('[Dialog] 步骤 6/10: 添加本地音频轨道...')
      mediaStream.getTracks().forEach(track => {
        pc.addTrack(track, mediaStream)
      })
      console.log('[Dialog] ✓ 步骤 6/10: 本地音频轨道已添加')
      
      // 7. 创建数据通道
      console.log('[Dialog] 步骤 7/10: 创建数据通道...')
      dc = pc.createDataChannel('oai-events')
      console.log('[Dialog] ✓ 步骤 7/10: 数据通道已创建')
      
      // 等待数据通道打开
      const dataChannelReady = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('数据通道打开超时'))
        }, 10000)
        
        dc.onopen = () => {
          clearTimeout(timeout)
          console.log('[Dialog] 数据通道已打开')
          resolve()
        }
        
        dc.onerror = (error) => {
          clearTimeout(timeout)
          console.error('[Dialog] 数据通道错误:', error)
          reject(error)
        }
      })
      
      setupDataChannel()
      
      // 8. 创建 SDP offer
      console.log('[Dialog] 步骤 8/10: 创建 SDP offer...')
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      console.log('[Dialog] ✓ 步骤 8/10: SDP offer 已创建')
      
      // 9. 发送 SDP 到 OpenAI
      console.log('[Dialog] 步骤 9/10: 发送 SDP 到 OpenAI...')
      const model = DIALOG_CONFIG.openai.model || 'gpt-4o-realtime-preview-2024-12-17'
      const baseUrl = 'https://api.openai.com/v1/realtime'
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp'
        },
        body: offer.sdp
      })
      
      console.log('[Dialog] SDP 响应状态:', sdpResponse.status, sdpResponse.statusText)
      
      if (!sdpResponse.ok) {
        const error = await sdpResponse.text()
        console.error('[Dialog] SDP 交换失败:', error)
        throw new Error(`SDP 交换失败: ${sdpResponse.status} - ${error}`)
      }
      
      // 10. 设置远程 SDP
      console.log('[Dialog] 步骤 10/10: 设置远程 SDP...')
      const answerSdp = await sdpResponse.text()
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp
      })
      console.log('[Dialog] ✓ 步骤 10/10: 远程 SDP 已设置')
      
      // 11. 等待数据通道打开
      console.log('[Dialog] 等待数据通道打开...')
      await dataChannelReady
      console.log('[Dialog] ✓ 数据通道已打开')
      
      isConnected.value = true
      isConnecting.value = false
      console.log('[Dialog] ========== WebRTC 连接成功 ==========')
      
      if (callbacks.onConnect) {
        callbacks.onConnect()
      }
      
    } catch (error) {
      console.error('[Dialog] 连接失败:', error)
      connectionError.value = error.message
      isConnecting.value = false
      await disconnect()
      
      if (callbacks.onError) {
        callbacks.onError(error)
      }
      throw error
    }
  }
  
  /**
   * 获取临时令牌
   */
  async function getEphemeralToken(systemPrompt, speaker) {
    const apiKey = DIALOG_CONFIG.openai.apiKey
    console.log('[Dialog] getEphemeralToken - API Key:', apiKey ? `存在 (前10位: ${apiKey.substring(0, 10)}...)` : '不存在')
    
    if (!apiKey) {
      throw new Error('未配置 OpenAI API Key')
    }
    
    const model = DIALOG_CONFIG.openai.model || 'gpt-4o-realtime-preview-2024-12-17'
    const instructions = systemPrompt || DIALOG_CONFIG.openai.systemPrompt || '你是一个友好的AI助手。'
    
    console.log('[Dialog] 请求令牌参数:', { model, voice: speaker, instructions: instructions.substring(0, 50) + '...' })
    
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        voice: speaker || 'alloy',
        instructions: instructions,
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800
        }
      })
    })
    
    console.log('[Dialog] 令牌响应状态:', response.status, response.statusText)
    
    if (!response.ok) {
      const error = await response.text()
      console.error('[Dialog] 令牌请求失败，响应内容:', error)
      throw new Error(`获取令牌失败: ${response.status} - ${error}`)
    }
    
    const session = await response.json()
    console.log('[Dialog] 成功获取令牌，会话ID:', session.id)
    return session
  }
  
  /**
   * 设置数据通道事件
   */
  function setupDataChannel() {
    dc.onclose = () => {
      console.log('[Dialog] 数据通道已关闭')
    }
    
    dc.onmessage = (event) => {
      handleServerEvent(JSON.parse(event.data))
    }
  }
  
  /**
   * 处理服务器事件
   */
  function handleServerEvent(event) {
    console.log('[Dialog] 服务器事件:', event.type)
    
    if (callbacks.onMessage) {
      callbacks.onMessage(event)
    }
    
    switch (event.type) {
      case 'session.created':
        console.log('[Dialog] 会话已创建')
        break
        
      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          const transcript = {
            speaker: 'user',
            text: event.transcript,
            timestamp: Date.now()
          }
          transcripts.push(transcript)
          currentTranscript.value = event.transcript
          
          if (callbacks.onTranscript) {
            callbacks.onTranscript(transcript)
          }
        }
        break
        
      case 'response.audio_transcript.done':
        if (event.transcript) {
          const transcript = {
            speaker: 'assistant',
            text: event.transcript,
            timestamp: Date.now()
          }
          transcripts.push(transcript)
          currentTranscript.value = event.transcript
          
          if (callbacks.onTranscript) {
            callbacks.onTranscript(transcript)
          }
        }
        isSpeaking.value = false
        break
        
      case 'input_audio_buffer.speech_started':
        isListening.value = true
        break
        
      case 'input_audio_buffer.speech_stopped':
        isListening.value = false
        break
        
      case 'error':
        console.error('[Dialog] 服务器错误:', event.error)
        if (callbacks.onError) {
          callbacks.onError(new Error(event.error?.message || JSON.stringify(event.error)))
        }
        break
    }
  }
  
  /**
   * 发送事件
   */
  function sendEvent(event) {
    if (!dc || dc.readyState !== 'open') {
      console.warn('[Dialog] 数据通道未就绪')
      return false
    }
    
    try {
      dc.send(JSON.stringify(event))
      console.log('[Dialog] 事件已发送:', event.type)
      return true
    } catch (error) {
      console.error('[Dialog] 发送事件失败:', error)
      return false
    }
  }
  
  /**
   * 更新会话配置
   */
  function updateSession(options = {}) {
    if (!isConnected.value) {
      console.warn('[Dialog] 未连接，无法更新会话')
      return false
    }
    
    const sessionConfig = {}
    
    if (options.systemPrompt !== undefined) {
      sessionConfig.instructions = options.systemPrompt
    }
    
    if (options.speaker !== undefined) {
      sessionConfig.voice = options.speaker
    }
    
    if (options.turnDetection !== undefined) {
      sessionConfig.turn_detection = options.turnDetection
    }
    
    return sendEvent({
      type: 'session.update',
      session: sessionConfig
    })
  }
  
  /**
   * 发送文本消息
   */
  function sendTextMessage(text) {
    if (!isConnected.value) {
      console.warn('[Dialog] 未连接')
      return false
    }
    
    return sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      }
    }) && sendEvent({
      type: 'response.create'
    })
  }
  
  /**
   * 断开连接
   */
  async function disconnect() {
    isConnected.value = false
    isConnecting.value = false
    isSpeaking.value = false
    isListening.value = false
    
    if (dc) {
      dc.close()
      dc = null
    }
    
    if (pc) {
      pc.close()
      pc = null
    }
    
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
      mediaStream = null
    }
    
    if (audioContext) {
      try {
        await audioContext.close()
      } catch (err) {
        console.error('[Dialog] 关闭 AudioContext 失败:', err)
      }
      audioContext = null
    }
    
    if (audioElement) {
      audioElement.srcObject = null
      audioElement = null
    }
    
    console.log('[Dialog] 已断开连接')
    
    if (callbacks.onDisconnect) {
      callbacks.onDisconnect()
    }
  }
  
  /**
   * 设置回调
   */
  function setCallbacks(newCallbacks) {
    Object.assign(callbacks, newCallbacks)
  }
  
  /**
   * 清空转录记录
   */
  function clearTranscripts() {
    transcripts.splice(0, transcripts.length)
    currentTranscript.value = ''
  }
  
  // 注意：不在 onUnmounted 中断开连接，因为这是全局单例
  // 连接的生命周期由 App.vue 管理
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    isConnected,
    isConnecting,
    connectionError,
    isSpeaking,
    isListening,
    transcripts,
    currentTranscript,
    
    // 方法
    connect,
    disconnect,
    sendEvent,
    sendTextMessage,
    updateSession,
    setCallbacks,
    clearTranscripts
  }
}

export default useRealtimeDialog
