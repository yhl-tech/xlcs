/**
 * 实时语音对话
 * 通过 WebRTC 连接到 OpenAI Realtime API 实现语音对话
 * 单例模式：所有组件共享同一个 WebRTC 连接
 */
import { ref, reactive } from 'vue'
import { OPENAI_CONFIG } from '@/utils/constants'

// lamejs 通过 script 标签加载到 window.lamejs
// lamejs ES Module 有兼容性问题（MPEGMode is not defined），必须使用 script 方式

// 获取 lamejs 库
function getLamejs() {
  if (window.lamejs && window.lamejs.Mp3Encoder) {
    return window.lamejs
  }
  throw new Error('lamejs 库未正确加载，请确保 script 已加载')
}

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

// 混合录音相关
const isMixedRecording = ref(false)
let mixedStreamDestination = null
let mixedMediaRecorder = null
let mixedAudioChunks = []
let micSource = null
let remoteAudioSource = null

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
        
        // 如果混合录音已经开始但远程音频源还没连接，立即连接
        if (isMixedRecording.value && mixedStreamDestination && !remoteAudioSource) {
          try {
            remoteAudioSource = audioContext.createMediaStreamSource(event.streams[0])
            remoteAudioSource.connect(mixedStreamDestination)
            console.log('[Dialog] 远程音频已延迟连接到混合流')
          } catch (err) {
            console.warn('[Dialog] 连接远程音频到混合流失败:', err)
          }
        }
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
          threshold: 0.6,          // 提高阈值，减少误触发
          prefix_padding_ms: 300,
          silence_duration_ms: 1000 // 增加静音时长，让 AI 更不容易被打断
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
  
  // ==================== 混合录音功能 ====================
  
  /**
   * 开始混合录音（麦克风 + AI 回复）
   */
  async function startMixedRecording() {
    if (isMixedRecording.value) {
      console.warn('[Dialog] 混合录音已在进行中，当前数据块数:', mixedAudioChunks.length)
      return
    }
    
    // 如果有已存在的数据，不要清空（可能是之前的录音数据）
    if (mixedAudioChunks.length > 0) {
      console.log('[Dialog] 发现已有录音数据，块数:', mixedAudioChunks.length, '，继续使用')
    }
    
    if (!audioContext) {
      console.error('[Dialog] AudioContext 未初始化，请先连接')
      throw new Error('[Dialog] AudioContext 未初始化，请先连接')
    }
    
    // 确保 AudioContext 是活动状态
    if (audioContext.state === 'suspended') {
      console.log('[Dialog] AudioContext 处于暂停状态，正在恢复...')
      await audioContext.resume()
    }
    
    console.log('[Dialog] 开始设置混合录音...')
    console.log('[Dialog] - AudioContext 状态:', audioContext.state)
    console.log('[Dialog] - 麦克风流:', mediaStream ? '存在' : '不存在')
    console.log('[Dialog] - 音频元素:', audioElement ? '存在' : '不存在')
    console.log('[Dialog] - 音频元素 srcObject:', audioElement?.srcObject ? '存在' : '不存在')
    
    // 创建混合流目标
    if (!mixedStreamDestination) {
      mixedStreamDestination = audioContext.createMediaStreamDestination()
      console.log('[Dialog] 创建了新的混合流目标')
    }
    
    // 检查混合流状态
    const mixedTracks = mixedStreamDestination.stream.getTracks()
    console.log('[Dialog] 混合流当前轨道数:', mixedTracks.length)
    
    // 连接麦克风音频
    if (mediaStream && !micSource) {
      try {
        const micTracks = mediaStream.getTracks()
        console.log('[Dialog] 麦克风轨道数:', micTracks.length, '活动状态:', micTracks.map(t => t.readyState))
        micSource = audioContext.createMediaStreamSource(mediaStream)
        micSource.connect(mixedStreamDestination)
        console.log('[Dialog] ✓ 麦克风已连接到混合流')
      } catch (err) {
        console.error('[Dialog] 连接麦克风失败:', err)
      }
    } else if (!mediaStream) {
      console.warn('[Dialog] 麦克风流不存在，无法录制麦克风音频')
    } else if (micSource) {
      console.log('[Dialog] 麦克风源已存在，跳过连接')
    }
    
    // 连接远程音频（AI 回复）- 如果已准备好
    if (audioElement && audioElement.srcObject && !remoteAudioSource) {
      try {
        remoteAudioSource = audioContext.createMediaStreamSource(audioElement.srcObject)
        remoteAudioSource.connect(mixedStreamDestination)
        console.log('[Dialog] ✓ 远程音频已连接到混合流')
      } catch (err) {
        console.error('[Dialog] 连接远程音频失败:', err)
      }
    } else if (!audioElement?.srcObject) {
      console.log('[Dialog] 远程音频尚未准备好，将在 ontrack 时连接')
    }
    
    // 检查支持的 mimeType
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ]
    
    let selectedMimeType = null
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType
        break
      }
    }
    
    if (!selectedMimeType) {
      console.error('[Dialog] 没有支持的音频格式')
      throw new Error('没有支持的音频录制格式')
    }
    
    console.log('[Dialog] 使用音频格式:', selectedMimeType)
    
    // 创建 MediaRecorder 录制混合流
    // 注意：不再清空 mixedAudioChunks，保留已有数据
    // 只有在确实没有数据时才初始化
    if (mixedAudioChunks.length === 0) {
      mixedAudioChunks = []
    } else {
      console.log('[Dialog] 保留已有录音数据，块数:', mixedAudioChunks.length)
    }
    mixedMediaRecorder = new MediaRecorder(mixedStreamDestination.stream, {
      mimeType: selectedMimeType
    })
    
    mixedMediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        mixedAudioChunks.push(event.data)
        console.log('[Dialog] 收到音频数据块，大小:', event.data.size, '总块数:', mixedAudioChunks.length)
      }
    }
    
    mixedMediaRecorder.onerror = (event) => {
      console.error('[Dialog] MediaRecorder 错误:', event.error)
    }
    
    // 每秒收集一次数据，确保数据不丢失
    mixedMediaRecorder.start(1000)
    isMixedRecording.value = true
    
    // 检查最终的混合流轨道
    const finalTracks = mixedStreamDestination.stream.getTracks()
    console.log('[Dialog] ✓ 混合录音已开始')
    console.log('[Dialog] - MediaRecorder 状态:', mixedMediaRecorder.state)
    console.log('[Dialog] - 混合流轨道数:', finalTracks.length)
    console.log('[Dialog] - 轨道详情:', finalTracks.map(t => ({ kind: t.kind, readyState: t.readyState, enabled: t.enabled })))
  }
  
  /**
   * 停止混合录音并返回音频 Blob
   */
  async function stopMixedRecording() {
    console.log('[Dialog] 停止混合录音...')
    console.log('[Dialog] - isMixedRecording:', isMixedRecording.value)
    console.log('[Dialog] - mixedMediaRecorder:', mixedMediaRecorder ? mixedMediaRecorder.state : '不存在')
    console.log('[Dialog] - mixedAudioChunks 数量:', mixedAudioChunks.length)
    
    if (!isMixedRecording.value || !mixedMediaRecorder) {
      console.warn('[Dialog] 混合录音未在进行中')
      // 即使没有在录音，如果有数据块也返回
      if (mixedAudioChunks.length > 0) {
        const audioBlob = new Blob(mixedAudioChunks, { type: 'audio/webm' })
        console.log('[Dialog] 返回已有的音频数据，大小:', (audioBlob.size / 1024 / 1024).toFixed(2), 'MB')
        mixedAudioChunks = []
        return audioBlob
      }
      return null
    }
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('[Dialog] 停止录音超时，强制返回已有数据')
        const audioBlob = new Blob(mixedAudioChunks, { type: 'audio/webm' })
        isMixedRecording.value = false
        mixedAudioChunks = []
        resolve(audioBlob)
      }, 5000)
      
      mixedMediaRecorder.onstop = () => {
        clearTimeout(timeout)
        const audioBlob = new Blob(mixedAudioChunks, { type: 'audio/webm' })
        console.log('[Dialog] ✓ 混合录音已停止')
        console.log('[Dialog] - 音频块数量:', mixedAudioChunks.length)
        console.log('[Dialog] - 音频大小:', (audioBlob.size / 1024 / 1024).toFixed(2), 'MB')
        isMixedRecording.value = false
        mixedAudioChunks = []
        resolve(audioBlob)
      }
      
      try {
        if (mixedMediaRecorder.state === 'recording') {
          mixedMediaRecorder.stop()
        } else {
          console.log('[Dialog] MediaRecorder 不在录音状态:', mixedMediaRecorder.state)
          clearTimeout(timeout)
          const audioBlob = new Blob(mixedAudioChunks, { type: 'audio/webm' })
          isMixedRecording.value = false
          mixedAudioChunks = []
          resolve(audioBlob)
        }
      } catch (err) {
        console.error('[Dialog] 停止 MediaRecorder 失败:', err)
        clearTimeout(timeout)
        const audioBlob = new Blob(mixedAudioChunks, { type: 'audio/webm' })
        isMixedRecording.value = false
        mixedAudioChunks = []
        resolve(audioBlob)
      }
    })
  }
  
  /**
   * 获取混合录音状态
   */
  function getMixedRecordingStatus() {
    const status = {
      isRecording: isMixedRecording.value,
      chunksCount: mixedAudioChunks.length,
      recorderState: mixedMediaRecorder ? mixedMediaRecorder.state : 'none',
      hasData: mixedAudioChunks.length > 0
    }
    console.log('[Dialog] 混合录音状态:', status)
    return status
  }
  
  /**
   * 将 WebM Blob 转换为 MP3 Blob
   */
  async function convertWebMToMP3(webmBlob) {
    try {
      console.log('[Dialog] 开始转换 WebM 到 MP3')
      console.log('[Dialog] - WebM 大小:', (webmBlob.size / 1024 / 1024).toFixed(2), 'MB')
      
      if (!webmBlob || webmBlob.size === 0) {
        console.warn('[Dialog] WebM blob 为空，跳过转换')
        return null
      }
      
      // 1. 读取并解码 WebM
      console.log('[Dialog] 步骤 1: 读取 WebM 数据...')
      const arrayBuffer = await webmBlob.arrayBuffer()
      console.log('[Dialog] - ArrayBuffer 大小:', arrayBuffer.byteLength)
      
      // 创建新的 AudioContext（避免使用可能已关闭的）
      console.log('[Dialog] 步骤 2: 创建 AudioContext 并解码...')
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 })
      
      let audioBuffer
      try {
        audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0))
        console.log('[Dialog] - 解码成功，时长:', audioBuffer.duration.toFixed(2), '秒')
        console.log('[Dialog] - 采样率:', audioBuffer.sampleRate)
        console.log('[Dialog] - 声道数:', audioBuffer.numberOfChannels)
      } catch (decodeError) {
        console.error('[Dialog] 解码 WebM 失败:', decodeError)
        ctx.close()
        throw new Error(`解码音频失败: ${decodeError.message}`)
      }
      
      // 2. 提取并转换 PCM 数据
      console.log('[Dialog] 步骤 3: 提取 PCM 数据...')
      const float32Data = audioBuffer.getChannelData(0)
      const sampleRate = audioBuffer.sampleRate
      const int16Data = new Int16Array(float32Data.length)
      
      for (let i = 0; i < float32Data.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Data[i]))
        int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
      }
      console.log('[Dialog] - PCM 样本数:', int16Data.length)
      
      // 3. 使用 lamejs 编码为 MP3
      console.log('[Dialog] 步骤 4: 初始化 lamejs...')
      
      // 获取 lamejs
      const Lame = getLamejs()
      console.log('[Dialog] - lamejs 状态: 已加载')
      
      const mp3encoder = new Lame.Mp3Encoder(1, sampleRate, 128)
      const sampleBlockSize = 1152
      const mp3Data = []
      
      let processedSamples = 0
      for (let i = 0; i < int16Data.length; i += sampleBlockSize) {
        const sampleChunk = int16Data.subarray(
          i,
          Math.min(i + sampleBlockSize, int16Data.length)
        )
        const mp3buf = mp3encoder.encodeBuffer(sampleChunk)
        if (mp3buf.length > 0) {
          mp3Data.push(new Int8Array(mp3buf))
        }
        processedSamples += sampleChunk.length
      }
      
      const mp3buf = mp3encoder.flush()
      if (mp3buf.length > 0) {
        mp3Data.push(new Int8Array(mp3buf))
      }
      
      console.log('[Dialog] - 处理了', processedSamples, '个样本')
      console.log('[Dialog] - 生成了', mp3Data.length, '个 MP3 数据块')
      
      // 4. 创建 MP3 Blob
      const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' })
      console.log('[Dialog] ✓ MP3 转换完成，大小:', (mp3Blob.size / 1024 / 1024).toFixed(2), 'MB')
      
      // 关闭临时创建的 AudioContext
      ctx.close()
      
      return mp3Blob
      
    } catch (error) {
      console.error('[Dialog] WebM 转 MP3 失败:', error)
      throw new Error(`WebM 转 MP3 失败: ${error.message}`)
    }
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
    isMixedRecording,
    transcripts,
    currentTranscript,
    
    // 方法
    connect,
    disconnect,
    sendEvent,
    sendTextMessage,
    updateSession,
    setCallbacks,
    clearTranscripts,
    
    // 混合录音方法
    startMixedRecording,
    stopMixedRecording,
    getMixedRecordingStatus,
    convertWebMToMP3
  }
}

export default useRealtimeDialog
