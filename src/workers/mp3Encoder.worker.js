/**
 * MP3 编码 Web Worker
 * 在后台线程执行 PCM 到 MP3 的转换，避免阻塞主线程
 */
/* eslint-disable no-undef */

let lamejsLoaded = false

self.onmessage = function(e) {
  const { type, pcmData, sampleRate, lamejsUrl } = e.data

  // 初始化：加载 lamejs
  if (type === 'init') {
    importScripts(lamejsUrl)
    lamejsLoaded = true
    self.postMessage({ type: 'ready' })
    return
  }

  if (!lamejsLoaded) {
    self.postMessage({ type: 'error', error: 'lamejs 未初始化' })
    return
  }

  if (type !== 'encode') return

  try {
    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128)
    const sampleBlockSize = 1152
    const mp3Data = []

    const int16Data = new Int16Array(pcmData)
    const totalBlocks = Math.ceil(int16Data.length / sampleBlockSize)

    // 分块编码并报告进度
    for (let i = 0; i < int16Data.length; i += sampleBlockSize) {
      const sampleChunk = int16Data.subarray(
        i,
        Math.min(i + sampleBlockSize, int16Data.length)
      )
      const mp3buf = mp3encoder.encodeBuffer(sampleChunk)
      if (mp3buf.length > 0) {
        mp3Data.push(new Int8Array(mp3buf))
      }

      // 每处理 100 个块报告一次进度
      if ((i / sampleBlockSize) % 100 === 0) {
        const progress = Math.round((i / sampleBlockSize / totalBlocks) * 100)
        self.postMessage({ type: 'progress', progress })
      }
    }

    const mp3buf = mp3encoder.flush()
    if (mp3buf.length > 0) {
      mp3Data.push(new Int8Array(mp3buf))
    }

    const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' })
    self.postMessage({ type: 'complete', blob: mp3Blob })
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message })
  }
}
