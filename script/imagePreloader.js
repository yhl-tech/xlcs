/**
 * 图片预加载管理器
 * 用于优化图片加载性能，提前加载用户可能查看的图片到浏览器缓存
 */

import { state } from "./appState.js"

/**
 * 图片预加载管理器
 */
export const ImagePreloader = {
  // 预加载缓存：存储已创建的 Image 对象
  preloadCache: new Map(), // key: 图片索引, value: Image 对象

  // 预加载状态：跟踪哪些图片正在加载或已加载
  loadingStatus: new Map(), // key: 图片索引, value: 'loading' | 'loaded' | 'error'

  // 当前正在加载的图片数量（用于并发控制）
  currentLoadingCount: 0,

  // 待加载队列（当达到并发限制时使用）
  loadingQueue: [],

  // 配置参数
  config: {
    preloadAhead: 2, // 预加载前几张（当前图片的前2张）
    initialPreload: 3, // 初始预加载数量（页面加载时预加载前3张）
    maxConcurrent: 3, // 最大并发预加载数
    enableNetworkAware: true, // 是否启用网络感知
  },

  /**
   * 初始化预加载器
   */
  init() {
    // 网络感知预加载配置
    if (this.config.enableNetworkAware) {
      this._applyNetworkAwareConfig()
    }

    console.log("[ImagePreloader] 预加载器已初始化", {
      preloadAhead: this.config.preloadAhead,
      initialPreload: this.config.initialPreload,
      maxConcurrent: this.config.maxConcurrent,
    })
  },

  /**
   * 根据网络速度调整预加载策略
   * @private
   */
  _applyNetworkAwareConfig() {
    try {
      const connection =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection

      if (connection) {
        const effectiveType = connection.effectiveType

        if (effectiveType === "slow-2g" || effectiveType === "2g") {
          // 慢速网络：只预加载下一张
          this.config.preloadAhead = 1
          this.config.initialPreload = 2
          this.config.maxConcurrent = 1
          console.log("[ImagePreloader] 检测到慢速网络，调整预加载策略")
        } else if (effectiveType === "3g") {
          // 3G 网络：预加载 2 张
          this.config.preloadAhead = 2
          this.config.initialPreload = 3
          this.config.maxConcurrent = 2
          console.log("[ImagePreloader] 检测到 3G 网络，调整预加载策略")
        } else {
          // 4G/WiFi：使用默认配置
          console.log("[ImagePreloader] 检测到快速网络，使用默认预加载策略")
        }
      }
    } catch (error) {
      console.warn("[ImagePreloader] 网络检测失败，使用默认配置:", error)
    }
  },

  /**
   * 核心方法：预加载单张图片
   * @param {number} index - 图片索引（0-9）
   * @returns {boolean} 是否成功启动预加载
   */
  preloadImage(index) {
    // 参数验证
    if (index < 0 || index >= state.totalImages) {
      console.warn(
        `[ImagePreloader] 无效的图片索引: ${index}，总图片数: ${state.totalImages}`
      )
      return false
    }

    // 检查是否已预加载
    if (this.preloadCache.has(index)) {
      return true // 已预加载，直接返回
    }

    // 检查是否正在加载
    const status = this.loadingStatus.get(index)
    if (status === "loading") {
      return false // 正在加载中，避免重复
    }

    // 检查并发限制
    if (this.currentLoadingCount >= this.config.maxConcurrent) {
      // 达到并发限制，加入队列
      this.loadingQueue.push(index)
      return false
    }

    // 创建新的 Image 对象进行预加载
    const img = new Image()

    // 标记为加载中
    this.loadingStatus.set(index, "loading")
    this.currentLoadingCount++

    // 设置加载成功回调
    img.onload = () => {
      this.loadingStatus.set(index, "loaded")
      this.preloadCache.set(index, img)
      this.currentLoadingCount--

      console.log(
        `[ImagePreloader] 图片 ${index + 1} (rorschach-blot-${index + 1}.png) 预加载完成`
      )

      // 处理队列中的下一个
      this._processQueue()
    }

    // 设置加载失败回调
    img.onerror = () => {
      this.loadingStatus.set(index, "error")
      this.currentLoadingCount--

      console.warn(
        `[ImagePreloader] 图片 ${index + 1} (rorschach-blot-${index + 1}.png) 预加载失败`
      )

      // 处理队列中的下一个
      this._processQueue()
    }

    // 开始加载（设置 src 触发加载）
    img.src = `./images/rorschach-blot-${index + 1}.png`

    return true
  },

  /**
   * 处理预加载队列
   * @private
   */
  _processQueue() {
    if (this.loadingQueue.length === 0) {
      return
    }

    if (this.currentLoadingCount >= this.config.maxConcurrent) {
      return // 仍在并发限制内，等待
    }

    // 从队列中取出下一个
    const nextIndex = this.loadingQueue.shift()
    this.preloadImage(nextIndex)
  },

  /**
   * 批量预加载：预加载指定范围的图片
   * @param {number} startIndex - 起始索引
   * @param {number} endIndex - 结束索引（包含）
   */
  preloadRange(startIndex, endIndex) {
    // 参数验证和修正
    startIndex = Math.max(0, startIndex)
    endIndex = Math.min(state.totalImages - 1, endIndex)

    if (startIndex > endIndex) {
      console.warn(
        `[ImagePreloader] 无效的范围: [${startIndex}, ${endIndex}]`
      )
      return
    }

    console.log(
      `[ImagePreloader] 开始批量预加载图片 ${startIndex + 1} 到 ${endIndex + 1}`
    )

    // 遍历范围内的所有图片
    for (let i = startIndex; i <= endIndex; i++) {
      this.preloadImage(i)
    }
  },

  /**
   * 智能预加载：根据当前图片索引预加载后续图片
   * @param {number} currentIndex - 当前图片索引
   */
  preloadAhead(currentIndex) {
    // 计算需要预加载的范围
    const startIndex = currentIndex + 1
    const endIndex = Math.min(
      state.totalImages - 1,
      currentIndex + this.config.preloadAhead
    )

    if (startIndex <= endIndex) {
      // 预加载后续图片
      this.preloadRange(startIndex, endIndex)
    }

    // 可选：预加载前一张图片（支持后退）
    if (currentIndex > 0) {
      this.preloadImage(currentIndex - 1)
    }
  },

  /**
   * 初始预加载：页面加载时预加载前几张
   */
  initialPreload() {
    const count = Math.min(
      this.config.initialPreload,
      state.totalImages
    )

    console.log(
      `[ImagePreloader] 开始初始预加载前 ${count} 张图片`
    )

    // 预加载前 N 张图片
    this.preloadRange(0, count - 1)
  },

  /**
   * 检查图片是否已预加载
   * @param {number} index - 图片索引
   * @returns {boolean} 是否已预加载
   */
  isPreloaded(index) {
    return this.loadingStatus.get(index) === "loaded"
  },

  /**
   * 获取预加载的图片对象（如果已加载）
   * @param {number} index - 图片索引
   * @returns {HTMLImageElement|null} 预加载的图片对象，如果未加载则返回 null
   */
  getPreloadedImage(index) {
    return this.preloadCache.get(index) || null
  },

  /**
   * 获取图片的 URL（用于直接设置 src）
   * @param {number} index - 图片索引
   * @returns {string} 图片 URL
   */
  getImageUrl(index) {
    return `./images/rorschach-blot-${index + 1}.png`
  },

  /**
   * 清理预加载缓存（可选，节省内存）
   * @param {Array<number>} keepIndices - 要保留的图片索引数组
   */
  clearCache(keepIndices = []) {
    const keepSet = new Set(keepIndices)

    // 清理不在保留列表中的缓存
    for (const [index, img] of this.preloadCache.entries()) {
      if (!keepSet.has(index)) {
        this.preloadCache.delete(index)
        this.loadingStatus.delete(index)
      }
    }

    console.log(
      `[ImagePreloader] 已清理缓存，保留 ${keepIndices.length} 张图片`
    )
  },

  /**
   * 获取预加载统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    let loadedCount = 0
    let loadingCount = 0
    let errorCount = 0

    for (const status of this.loadingStatus.values()) {
      if (status === "loaded") loadedCount++
      else if (status === "loading") loadingCount++
      else if (status === "error") errorCount++
    }

    return {
      total: state.totalImages,
      loaded: loadedCount,
      loading: loadingCount,
      error: errorCount,
      cached: this.preloadCache.size,
      queueLength: this.loadingQueue.length,
    }
  },

  /**
   * 重置预加载器（清除所有缓存和状态）
   */
  reset() {
    this.preloadCache.clear()
    this.loadingStatus.clear()
    this.currentLoadingCount = 0
    this.loadingQueue = []

    console.log("[ImagePreloader] 预加载器已重置")
  },
}

// 自动初始化
ImagePreloader.init()

