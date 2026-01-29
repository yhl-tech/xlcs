/**
 * 全局音频管理器
 * 用于统一管理所有音频播放，支持一键停止
 */

// 存储所有正在播放的音频对象
const activeAudios = new Set()

/**
 * 播放音频
 * @param {string} src - 音频文件路径
 * @returns {Promise} 播放完成的 Promise
 */
export function playAudio(src) {
  return new Promise((resolve) => {
    console.log('[AudioManager] 播放音频:', src)
    
    const audio = new Audio(src)
    activeAudios.add(audio)
    
    let resolved = false
    const doResolve = () => {
      if (!resolved) {
        resolved = true
        activeAudios.delete(audio)
        resolve()
      }
    }
    
    audio.onended = () => {
      console.log('[AudioManager] 音频播放完成:', src)
      doResolve()
    }
    
    audio.onerror = (error) => {
      console.warn('[AudioManager] 音频播放失败:', src, error)
      doResolve()
    }
    
    audio.play().catch(error => {
      console.warn('[AudioManager] 音频播放出错:', error)
      doResolve()
    })
  })
}

/**
 * 停止所有音频播放
 */
export function stopAllAudios() {
  console.log('[AudioManager] 停止所有音频播放，当前活跃音频数:', activeAudios.size)
  
  activeAudios.forEach(audio => {
    try {
      audio.pause()
      audio.src = ''
    } catch (error) {
      console.warn('[AudioManager] 停止音频时出错:', error)
    }
  })
  
  activeAudios.clear()
  console.log('[AudioManager] 所有音频已停止')
}

/**
 * 获取当前活跃的音频数量
 */
export function getActiveAudioCount() {
  return activeAudios.size
}
