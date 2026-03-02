/**
 * 音频录制器
 * 收集 PCM 数据并转换为 MP3 格式
 */
import { ref, computed, onUnmounted } from 'vue'

// lamejs 通过 script 标签加载到 window.lamejs

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
  
  // 转换进度
  const convertProgress = ref(0)

  /**
   * 将 PCM 转换为 MP3（使用 Web Worker 避免阻塞主线程）
   * @param {Int16Array} pcmData - PCM 数据
   * @param {number} rate - 采样率
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<Blob>}
   */
  async function convertPCMToMP3(pcmData, rate = 24000, onProgress) {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(
          new URL('../workers/mp3Encoder.worker.js', import.meta.url),
          { type: 'classic' }
        )

        let initialized = false

        worker.onmessage = (e) => {
          const { type, progress, blob, error } = e.data

          if (type === 'ready') {
            initialized = true
            // 发送编码任务
            worker.postMessage(
              { type: 'encode', pcmData: pcmData.buffer, sampleRate: rate },
              [pcmData.buffer.slice(0)]
            )
            return
          }

          if (type === 'progress') {
            convertProgress.value = progress
            onProgress?.(progress)
          } else if (type === 'complete') {
            console.log('[AudioRecorder] MP3 转换完成，大小:', blob.size, 'bytes')
            convertProgress.value = 100
            worker.terminate()
            resolve(blob)
          } else if (type === 'error') {
            worker.terminate()
            if (!initialized) {
              // Worker 初始化失败，回退到主线程
              convertPCMToMP3Sync(pcmData, rate).then(resolve).catch(reject)
            } else {
              reject(new Error(error))
            }
          }
        }

        worker.onerror = (err) => {
          console.warn('[AudioRecorder] Worker 出错，回退到主线程:', err)
          worker.terminate()
          convertPCMToMP3Sync(pcmData, rate).then(resolve).catch(reject)
        }

        // 先初始化 Worker，传入 lamejs URL（与 main.js 中相同的方式）
        import('lamejs/lame.min.js?url').then(module => {
          worker.postMessage({ type: 'init', lamejsUrl: module.default })
        })
      } catch (error) {
        console.warn('[AudioRecorder] Worker 创建失败，回退到主线程:', error)
        convertPCMToMP3Sync(pcmData, rate).then(resolve).catch(reject)
      }
    })
  }

  /**
   * 同步方式转换（回退方案）
   */
  function convertPCMToMP3Sync(pcmData, rate) {
    return new Promise((resolve, reject) => {
      // 使用 requestIdleCallback 分片处理，减少卡顿
      if (!window.lamejs?.Mp3Encoder) {
        reject(new Error('lamejs 库未正确加载'))
        return
      }

      const mp3encoder = new window.lamejs.Mp3Encoder(1, rate, 128)
      const sampleBlockSize = 1152
      const mp3Data = []
      let offset = 0

      function processChunk(deadline) {
        while (offset < pcmData.length && deadline.timeRemaining() > 0) {
          const sampleChunk = pcmData.subarray(
            offset,
            Math.min(offset + sampleBlockSize, pcmData.length)
          )
          const mp3buf = mp3encoder.encodeBuffer(sampleChunk)
          if (mp3buf.length > 0) {
            mp3Data.push(new Int8Array(mp3buf))
          }
          offset += sampleBlockSize
        }

        if (offset < pcmData.length) {
          requestIdleCallback(processChunk)
        } else {
          const mp3buf = mp3encoder.flush()
          if (mp3buf.length > 0) {
            mp3Data.push(new Int8Array(mp3buf))
          }
          resolve(new Blob(mp3Data, { type: 'audio/mpeg' }))
        }
      }

      requestIdleCallback(processChunk)
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
    convertProgress,

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
