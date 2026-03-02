/**
 * 图片预加载（懒加载版本）
 * 支持按需加载、预加载下一张、范围加载
 * 参考原始 script/imagePreloader.js 实现
 */
import { ref, computed } from 'vue'

// 获取 BASE_URL 用于资源路径
const baseUrl = import.meta.env.BASE_URL

// 总图片数量
const TOTAL_IMAGES = 10

// 获取图片 URL（索引从 0 开始，但文件名从 1 开始）
function getImagePath(index) {
  const fileIndex = index + 1 // 文件名从 1 开始
  return `${baseUrl}images/rorschach-blot-${fileIndex}.webp`
}

// ==================== 单例状态（所有组件共享） ====================

// 已加载的图片缓存 (index -> blobUrl)
const imageCache = new Map()

// 加载状态 (index -> 'loading' | 'loaded' | 'error')
const loadingStatus = new Map()

// 加载队列
let loadingQueue = []

// 是否正在加载
let isLoadingNow = false

// 当前正在加载的索引
let currentLoadingIndex = null

// 进度回调
let progressCallback = null

// ==================== 内部方法 ====================

/**
 * 处理加载队列
 */
function processQueue() {
  if (isLoadingNow || loadingQueue.length === 0) {
    return
  }
  
  const index = loadingQueue.shift()
  
  // 跳过已加载或正在加载的图片
  if (imageCache.has(index) || loadingStatus.get(index) === 'loading') {
    processQueue()
    return
  }
  
  isLoadingNow = true
  currentLoadingIndex = index
  loadingStatus.set(index, 'loading')
  
  const src = getImagePath(index)
  
  // 使用 fetch 加载图片并转为 Blob URL
  fetch(src)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return response.blob()
    })
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob)
      imageCache.set(index, blobUrl)
      loadingStatus.set(index, 'loaded')
      
      // 触发进度回调
      if (progressCallback) {
        const loadedCount = Array.from(loadingStatus.values()).filter(s => s === 'loaded').length
        progressCallback({
          loaded: loadedCount,
          total: TOTAL_IMAGES,
          current: index
        })
      }
      
      isLoadingNow = false
      currentLoadingIndex = null
      processQueue()
    })
    .catch(error => {
      console.error(`[ImagePreloader] 加载图片 ${index} 失败:`, error)
      loadingStatus.set(index, 'error')
      
      if (progressCallback) {
        const loadedCount = Array.from(loadingStatus.values()).filter(s => s === 'loaded').length
        progressCallback({
          loaded: loadedCount,
          total: TOTAL_IMAGES,
          current: index,
          error: true
        })
      }
      
      isLoadingNow = false
      currentLoadingIndex = null
      processQueue()
    })
}

// ==================== Composable ====================

export function useImagePreloader() {
  // 响应式状态
  const loadedCount = ref(0)
  const totalCount = ref(TOTAL_IMAGES)
  const failedCount = ref(0)
  const isLoading = ref(false)
  const failedImages = ref([])
  
  // 计算属性
  const progress = computed(() => {
    if (totalCount.value === 0) return 0
    return Math.round((loadedCount.value / totalCount.value) * 100)
  })
  
  const isComplete = computed(() => {
    return loadedCount.value === totalCount.value && totalCount.value > 0
  })
  
  /**
   * 更新响应式状态
   */
  function updateReactiveState() {
    loadedCount.value = Array.from(loadingStatus.values()).filter(s => s === 'loaded').length
    failedCount.value = Array.from(loadingStatus.values()).filter(s => s === 'error').length
    isLoading.value = isLoadingNow
  }
  
  /**
   * 预加载单张图片（懒加载）
   * @param {number} index - 图片索引（从 0 开始）
   */
  function preloadImage(index) {
    if (index < 0 || index >= TOTAL_IMAGES) return
    if (imageCache.has(index) || loadingStatus.get(index) === 'loading') return
    
    // 添加到队列（优先级：放到队首）
    if (!loadingQueue.includes(index)) {
      loadingQueue.unshift(index)
    }
    
    processQueue()
  }
  
  /**
   * 预加载当前图片及后续几张（智能预加载）
   * @param {number} currentIndex - 当前图片索引
   * @param {number} ahead - 预加载后面几张，默认 2
   */
  function preloadAhead(currentIndex, ahead = 2) {
    // 先加载当前图片
    preloadImage(currentIndex)
    
    // 再加载后面的图片
    for (let i = 1; i <= ahead; i++) {
      const nextIndex = currentIndex + i
      if (nextIndex < TOTAL_IMAGES) {
        // 延迟添加到队列，优先当前图片
        setTimeout(() => {
          if (!imageCache.has(nextIndex) && loadingStatus.get(nextIndex) !== 'loading') {
            loadingQueue.push(nextIndex)
            processQueue()
          }
        }, i * 100)
      }
    }
  }
  
  /**
   * 预加载指定范围的图片
   * @param {number} startIndex - 起始索引
   * @param {number} endIndex - 结束索引
   */
  function preloadRange(startIndex, endIndex) {
    for (let i = Math.max(0, startIndex); i <= Math.min(TOTAL_IMAGES - 1, endIndex); i++) {
      if (!imageCache.has(i) && loadingStatus.get(i) !== 'loading') {
        loadingQueue.push(i)
      }
    }
    processQueue()
  }
  
  /**
   * 预加载所有图片
   */
  function preloadAll(options = {}) {
    const { onProgress = null } = options
    
    // 设置进度回调
    if (onProgress) {
      progressCallback = (info) => {
        updateReactiveState()
        onProgress(info.loaded, info.total, progress.value)
      }
    }
    
    isLoading.value = true
    
    // 添加所有未加载的图片到队列
    for (let i = 0; i < TOTAL_IMAGES; i++) {
      if (!imageCache.has(i) && loadingStatus.get(i) !== 'loading') {
        loadingQueue.push(i)
      }
    }
    
    processQueue()
    
    // 返回 Promise，等待全部加载完成
    return new Promise((resolve) => {
      const checkComplete = setInterval(() => {
        updateReactiveState()
        if (loadedCount.value + failedCount.value >= TOTAL_IMAGES) {
          clearInterval(checkComplete)
          isLoading.value = false
          progressCallback = null
          resolve({
            success: loadedCount.value,
            failed: failedCount.value,
            total: TOTAL_IMAGES
          })
        }
      }, 100)
    })
  }
  
  /**
   * 预加载默认罗夏墨迹图（兼容旧接口）
   */
  async function preloadRorschachImages(options = {}) {
    return preloadAll(options)
  }
  
  /**
   * 获取图片 URL
   * @param {number} index - 图片索引（从 0 开始）
   * @returns {string} - 图片 URL（优先返回缓存的 Blob URL）
   */
  function getImageUrl(index) {
    if (index < 0 || index >= TOTAL_IMAGES) {
      return getImagePath(Math.max(0, Math.min(TOTAL_IMAGES - 1, index)))
    }
    
    // 如果已缓存，返回 Blob URL
    if (imageCache.has(index)) {
      return imageCache.get(index)
    }
    
    // 否则返回原始 URL，并触发后台加载
    preloadImage(index)
    return getImagePath(index)
  }
  
  /**
   * 检查图片是否已加载
   * @param {number} index - 图片索引
   * @returns {boolean}
   */
  function isImageLoaded(index) {
    return imageCache.has(index)
  }
  
  /**
   * 获取加载统计
   */
  function getLoadingStats() {
    const loaded = Array.from(loadingStatus.values()).filter(s => s === 'loaded').length
    const errors = Array.from(loadingStatus.values()).filter(s => s === 'error').length
    
    return {
      loaded,
      total: TOTAL_IMAGES,
      errors,
      pending: TOTAL_IMAGES - loaded - errors,
      cacheSize: imageCache.size,
      isLoading: isLoadingNow,
      currentIndex: currentLoadingIndex
    }
  }
  
  /**
   * 清除缓存
   */
  function clearCache() {
    // 释放 Blob URLs
    for (const blobUrl of imageCache.values()) {
      URL.revokeObjectURL(blobUrl)
    }
    imageCache.clear()
    loadingStatus.clear()
    loadingQueue = []
    isLoadingNow = false
    currentLoadingIndex = null
    
    loadedCount.value = 0
    failedCount.value = 0
    failedImages.value = []
  }
  
  /**
   * 获取图片源列表（兼容旧接口）
   */
  function getImageSources() {
    return Array.from({ length: TOTAL_IMAGES }, (_, i) => getImagePath(i))
  }
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    loadedCount,
    totalCount,
    failedCount,
    isLoading,
    progress,
    isComplete,
    failedImages,
    
    // 方法
    preloadImage,      // 懒加载单张
    preloadAhead,      // 智能预加载（当前 + 后续几张）
    preloadRange,      // 预加载范围
    preloadAll,        // 预加载全部
    preloadRorschachImages, // 兼容旧接口
    getImageUrl,       // 获取图片 URL
    isImageLoaded,     // 检查是否已加载
    getLoadingStats,   // 获取加载统计
    clearCache,        // 清除缓存
    getImageSources    // 获取所有图片路径
  }
}

export default useImagePreloader
