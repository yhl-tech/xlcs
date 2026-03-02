/**
 * 全局音频管理器
 * 用于统一管理所有音频播放，支持一键停止
 */

// 存储所有正在播放的音频对象
const activeAudios = new Set()

/**
 * 获取正确的资源路径（兼容开发环境和生产环境）
 * @param {string} path - 原始路径（如 /audio/welcome.MP3）
 * @returns {string} 处理后的路径
 */
function getAssetPath(path) {
  // 如果是绝对路径（以 / 开头），转换为相对于 BASE_URL 的路径
  if (path.startsWith('/')) {
    const base = import.meta.env.BASE_URL || '/'
    // 移除路径开头的 /，然后拼接 base
    return base + path.slice(1)
  }
  return path
}

/**
 * 播放音频
 * @param {string} src - 音频文件路径
 * @returns {Promise} 播放完成的 Promise
 */
export function playAudio(src) {
  return new Promise((resolve) => {
    const actualSrc = getAssetPath(src)
    console.log('[AudioManager] 播放音频:', actualSrc, '(原始路径:', src, ')')
    
    const audio = new Audio(actualSrc)
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
      console.log('[AudioManager] 音频播放完成:', actualSrc)
      doResolve()
    }
    
    audio.onerror = (error) => {
      console.warn('[AudioManager] 音频播放失败:', actualSrc, error)
      // 尝试使用绝对路径作为回退
      if (actualSrc.startsWith('./')) {
        const fallbackSrc = actualSrc.replace('./', '/')
        console.log('[AudioManager] 尝试回退路径:', fallbackSrc)
        const fallbackAudio = new Audio(fallbackSrc)
        fallbackAudio.onended = doResolve
        fallbackAudio.onerror = () => {
          console.warn('[AudioManager] 回退路径也失败')
          doResolve()
        }
        fallbackAudio.play().catch(() => doResolve())
        return
      }
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
