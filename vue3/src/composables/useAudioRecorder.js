/**
 * 音频录制器
 * 收集 PCM 数据并转换为 MP3 格式
 */
import { ref, computed, onUnmounted } from 'vue'

// lamejs 通过 CDN script 标签加载到 window.lamejs

export function useAudioRecorder() {
  // ==================== 状态 ====================
  
  // 录制状态
  const isRecording = ref(false)
  
  // 采样率
  const sampleRate = ref(24000)
  
  // PCM 缓冲区
  const pcmBuffers = ref([])
  const totalSamples = ref(0)
  
  // ==================== 计算属性 ====================
  
  // 录制时长（秒）
  const duration = computed(() => {
    if (sampleRate.value === 0) return 0
    return totalSamples.value / sampleRate.value
  })
  
  // 状态信息
  const status = computed(() => ({
    isRecording: isRecording.value,
    bufferCount: pcmBuffers.value.length,
    totalSamples: totalSamples.value,
    duration: duration.value,
    sampleRate: sampleRate.value
  }))
  
  // ==================== 方法 ====================
  
  /**
   * 开始录制
   */
  function start() {
    pcmBuffers.value = []
    totalSamples.value = 0
    isRecording.value = true
    console.log('[AudioRecorder] 开始录制')
  }
  
  /**
   * 停止录制
   */
  function stop() {
    isRecording.value = false
    console.log('[AudioRecorder] 停止录制，共收集', pcmBuffers.value.length, '个音频片段')
  }
  
  /**
   * 添加 PCM 音频数据
   * @param {ArrayBuffer|Int16Array} pcmData - PCM 音频数据
   * @param {number} rate - 采样率（默认 24000）
   */
  function addPCMData(pcmData, rate = 24000) {
    if (!isRecording.value) return
    
    // 确保是 Int16Array
    let int16Data
    if (pcmData instanceof Int16Array) {
      int16Data = pcmData
    } else if (pcmData instanceof ArrayBuffer) {
      int16Data = new Int16Array(pcmData)
    } else {
      console.warn('[AudioRecorder] 不支持的 PCM 数据格式')
      return
    }
    
    // 保存采样率（使用第一个片段的采样率）
    if (pcmBuffers.value.length === 0) {
      sampleRate.value = rate
    }
    
    // 保存 PCM 数据
    pcmBuffers.value.push(int16Data)
    totalSamples.value += int16Data.length
  }
  
  /**
   * 合并所有 PCM 数据
   * @returns {Int16Array}
   */
  function mergePCMData() {
    if (pcmBuffers.value.length === 0) {
      return new Int16Array(0)
    }
    
    const merged = new Int16Array(totalSamples.value)
    let offset = 0
    
    for (const buffer of pcmBuffers.value) {
      merged.set(buffer, offset)
      offset += buffer.length
    }
    
    console.log('[AudioRecorder] 合并完成，总采样数:', totalSamples.value)
    return merged
  }
  
  /**
   * 将 PCM 转换为 MP3
   * @param {Int16Array} pcmData - PCM 数据
   * @param {number} rate - 采样率
   * @returns {Promise<Blob>}
   */
  async function convertPCMToMP3(pcmData, rate = 24000) {
    return new Promise((resolve, reject) => {
      try {
        // 使用通过 CDN 加载的 window.lamejs
        if (!window.lamejs || !window.lamejs.Mp3Encoder) {
          throw new Error('lamejs 库未正确加载')
        }
        const mp3encoder = new window.lamejs.Mp3Encoder(1, rate, 128) // 单声道，128kbps
        const sampleBlockSize = 1152 // MP3 编码块大小
        const mp3Data = []
        
        // 分块编码
        for (let i = 0; i < pcmData.length; i += sampleBlockSize) {
          const sampleChunk = pcmData.subarray(
            i,
            Math.min(i + sampleBlockSize, pcmData.length)
          )
          const mp3buf = mp3encoder.encodeBuffer(sampleChunk)
          if (mp3buf.length > 0) {
            mp3Data.push(new Int8Array(mp3buf))
          }
        }
        
        // 刷新编码器
        const mp3buf = mp3encoder.flush()
        if (mp3buf.length > 0) {
          mp3Data.push(new Int8Array(mp3buf))
        }
        
        // 合并所有 MP3 数据块
        const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' })
        console.log('[AudioRecorder] MP3 转换完成，大小:', mp3Blob.size, 'bytes')
        resolve(mp3Blob)
      } catch (error) {
        console.error('[AudioRecorder] MP3 转换失败:', error)
        reject(error)
      }
    })
  }
  
  /**
   * 导出为 MP3
   * @returns {Promise<Blob>}
   */
  async function exportMP3() {
    if (pcmBuffers.value.length === 0) {
      throw new Error('没有录制的音频数据')
    }
    
    console.log('[AudioRecorder] 开始导出 MP3...')
    const mergedPCM = mergePCMData()
    const mp3Blob = await convertPCMToMP3(mergedPCM, sampleRate.value)
    return mp3Blob
  }
  
  /**
   * 下载 MP3 文件
   * @param {string} filename - 文件名
   */
  async function downloadMP3(filename = 'recording.mp3') {
    try {
      const mp3Blob = await exportMP3()
      const url = URL.createObjectURL(mp3Blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
      console.log('[AudioRecorder] MP3 文件已下载:', filename)
    } catch (error) {
      console.error('[AudioRecorder] 下载 MP3 文件失败:', error)
      throw error
    }
  }
  
  /**
   * 重置录制器
   */
  function reset() {
    pcmBuffers.value = []
    totalSamples.value = 0
    isRecording.value = false
    console.log('[AudioRecorder] 已重置')
  }
  
  // 清理
  onUnmounted(() => {
    reset()
  })
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    isRecording,
    sampleRate,
    duration,
    status,
    
    // 方法
    start,
    stop,
    addPCMData,
    mergePCMData,
    convertPCMToMP3,
    exportMP3,
    downloadMP3,
    reset
  }
}

export default useAudioRecorder
