/**
 * 图片预加载
 * 提前加载罗夏墨迹图，支持进度回调
 */
import { ref, computed } from 'vue'

// 获取 BASE_URL 用于资源路径
const baseUrl = import.meta.env.BASE_URL

// 默认罗夏墨迹图列表
const DEFAULT_IMAGES = [
  `${baseUrl}images/rorschach-blot-1.webp`,
  `${baseUrl}images/rorschach-blot-2.webp`,
  `${baseUrl}images/rorschach-blot-3.webp`,
  `${baseUrl}images/rorschach-blot-4.webp`,
  `${baseUrl}images/rorschach-blot-5.webp`,
  `${baseUrl}images/rorschach-blot-6.webp`,
  `${baseUrl}images/rorschach-blot-7.webp`,
  `${baseUrl}images/rorschach-blot-8.webp`,
  `${baseUrl}images/rorschach-blot-9.webp`,
  `${baseUrl}images/rorschach-blot-10.webp`
]

export function useImagePreloader() {
  // ==================== 状态 ====================
  
  // 加载进度
  const loadedCount = ref(0)
  const totalCount = ref(0)
  const failedCount = ref(0)
  
  // 是否正在加载
  const isLoading = ref(false)
  
  // 已加载的图片缓存
  const imageCache = ref(new Map())
  
  // 失败的图片列表
  const failedImages = ref([])
  
  // ==================== 计算属性 ====================
  
  // 加载进度百分比
  const progress = computed(() => {
    if (totalCount.value === 0) return 0
    return Math.round((loadedCount.value / totalCount.value) * 100)
  })
  
  // 是否全部加载完成
  const isComplete = computed(() => {
    return loadedCount.value === totalCount.value && totalCount.value > 0
  })
  
  // ==================== 方法 ====================
  
  /**
   * 加载单张图片
   * @param {string} src - 图片路径
   * @returns {Promise<HTMLImageElement>}
   */
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      // 检查缓存
      if (imageCache.value.has(src)) {
        resolve(imageCache.value.get(src))
        return
      }
      
      const img = new Image()
      
      img.onload = () => {
        imageCache.value.set(src, img)
        resolve(img)
      }
      
      img.onerror = (error) => {
        reject(new Error(`Failed to load image: ${src}`))
      }
      
      img.src = src
    })
  }
  
  /**
   * 预加载多张图片
   * @param {string[]} images - 图片路径数组
   * @param {Object} options - 配置选项
   * @returns {Promise<{success: number, failed: number}>}
   */
  async function preloadImages(images = DEFAULT_IMAGES, options = {}) {
    const {
      onProgress = null,
      onComplete = null,
      onError = null,
      concurrent = 3  // 并发数量
    } = options
    
    // 重置状态
    loadedCount.value = 0
    failedCount.value = 0
    totalCount.value = images.length
    failedImages.value = []
    isLoading.value = true
    
    // 创建加载任务队列
    const queue = [...images]
    const results = []
    
    // 并发加载
    async function loadNext() {
      if (queue.length === 0) return
      
      const src = queue.shift()
      
      try {
        const img = await loadImage(src)
        loadedCount.value++
        results.push({ src, success: true, image: img })
        
        if (onProgress) {
          onProgress(loadedCount.value, totalCount.value, progress.value)
        }
      } catch (error) {
        failedCount.value++
        failedImages.value.push(src)
        results.push({ src, success: false, error })
        
        if (onError) {
          onError(src, error)
        }
      }
      
      // 继续加载下一张
      await loadNext()
    }
    
    // 启动并发加载
    const workers = []
    for (let i = 0; i < Math.min(concurrent, images.length); i++) {
      workers.push(loadNext())
    }
    
    await Promise.all(workers)
    
    isLoading.value = false
    
    const result = {
      success: loadedCount.value,
      failed: failedCount.value,
      total: totalCount.value
    }
    
    if (onComplete) {
      onComplete(result)
    }
    
    return result
  }
  
  /**
   * 预加载默认罗夏墨迹图
   */
  async function preloadRorschachImages(options = {}) {
    return preloadImages(DEFAULT_IMAGES, options)
  }
  
  /**
   * 获取已缓存的图片
   * @param {string} src - 图片路径
   * @returns {HTMLImageElement|null}
   */
  function getCachedImage(src) {
    return imageCache.value.get(src) || null
  }
  
  /**
   * 检查图片是否已缓存
   * @param {string} src - 图片路径
   * @returns {boolean}
   */
  function isCached(src) {
    return imageCache.value.has(src)
  }
  
  /**
   * 清除缓存
   */
  function clearCache() {
    imageCache.value.clear()
    loadedCount.value = 0
    totalCount.value = 0
    failedCount.value = 0
    failedImages.value = []
  }
  
  /**
   * 重试加载失败的图片
   */
  async function retryFailed(options = {}) {
    if (failedImages.value.length === 0) return { success: 0, failed: 0, total: 0 }
    
    const imagesToRetry = [...failedImages.value]
    failedImages.value = []
    
    return preloadImages(imagesToRetry, options)
  }
  
  /**
   * 获取图片源列表
   */
  function getImageSources() {
    return [...DEFAULT_IMAGES]
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
    loadImage,
    preloadImages,
    preloadRorschachImages,
    getCachedImage,
    isCached,
    clearCache,
    retryFailed,
    getImageSources
  }
}

export default useImagePreloader
