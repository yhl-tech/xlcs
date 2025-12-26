class ImagePreloader {
  constructor() {
    this.worker = null
    this.cache = new Map()
    this.isInitialized = false
    this.loadingProgress = new Map()
    this.onProgressCallback = null
    this.onErrorCallback = null

    this.init()
  }

  init() {
    if (this.isInitialized) return

    try {
      this.worker = new Worker(
        new URL("./imagePreloaderWorker.js", import.meta.url),
        { type: "module" }
      )

      this.worker.onmessage = this.handleWorkerMessage.bind(this)
      this.worker.onerror = this.handleWorkerError.bind(this)

      this.isInitialized = true

      this.startPreloading()
    } catch (error) {
      this.fallbackMode = true
    }
  }

  handleWorkerMessage(event) {
    const {
      type,
      index,
      blob,
      buffer,
      blobUrl,
      contentType,
      error,
      progress,
      diagnostic,
    } = event.data

    switch (type) {
      case "IMAGE_FETCH_DIAGNOSTIC":
        break
      case "IMAGE_LOADED":
        this.handleImageLoaded(index, blob || buffer, contentType, blobUrl)
        break
      case "IMAGE_ERROR":
        this.handleImageError(index, error)
        break
      case "PRELOAD_PROGRESS":
        this.handleProgressUpdate(progress)
        break
      case "PRELOAD_COMPLETE":
        this.handlePreloadComplete()
        break
      default:
    }
  }

  handleWorkerError(error) {
    this.fallbackMode = true
    if (this.onErrorCallback) {
      this.onErrorCallback(error)
    }
  }

  handleImageLoaded(index, data, contentType, blobUrl = null) {
    try {
      let finalBlobUrl = blobUrl
      if (!finalBlobUrl) {
        let blobObj = null
        if (data instanceof ArrayBuffer) {
          blobObj = new Blob([data], { type: contentType || "image/webp" })
        } else {
          blobObj = data
        }
        finalBlobUrl = URL.createObjectURL(blobObj)
      }

      this.cache.set(index, finalBlobUrl)
      this.loadingProgress.set(index, "loaded")

      if (this.onProgressCallback) {
        const loadedCount = Array.from(this.loadingProgress.values()).filter(
          (status) => status === "loaded"
        ).length
        this.onProgressCallback({
          loaded: loadedCount,
          total: 10,
          current: index,
        })
      }
    } catch (error) {}
  }

  handleImageError(index, error) {
    this.loadingProgress.set(index, "error")
    if (this.onProgressCallback) {
      const loadedCount = Array.from(this.loadingProgress.values()).filter(
        (status) => status === "loaded"
      ).length
      this.onProgressCallback({
        loaded: loadedCount,
        total: 10,
        current: index,
        error: true,
      })
    }
  }

  handleProgressUpdate(progress) {}

  handlePreloadComplete() {
    if (this.onProgressCallback) {
      this.onProgressCallback({
        loaded: 10,
        total: 10,
        complete: true,
      })
    }
  }

  startPreloading() {
    if (!this.worker) return
    const imagesBase = new URL("images/", document.baseURI).toString()
    this.worker.postMessage({
      type: "START_PRELOAD",
      imageCount: 10,
      imagesBase,
    })
  }

  getImageUrl(index) {
    if (index < 1 || index > 10) {
      return `./images/rorschach-blot-${Math.max(1, Math.min(10, index))}.webp`
    }
    if (this.cache.has(index)) {
      return this.cache.get(index)
    }
    return new URL(
      `images/rorschach-blot-${index}.webp`,
      document.baseURI
    ).toString()
  }

  isImageLoaded(index) {
    return this.cache.has(index)
  }

  getLoadingStats() {
    const loaded = Array.from(this.loadingProgress.values()).filter(
      (status) => status === "loaded"
    ).length
    const errors = Array.from(this.loadingProgress.values()).filter(
      (status) => status === "error"
    ).length

    const stats = {
      loaded,
      total: 10,
      errors,
      pending: 10 - loaded - errors,
      cacheSize: this.cache.size,
    }

    return stats
  }

  setProgressCallback(callback) {
    this.onProgressCallback = callback
  }

  setErrorCallback(callback) {
    this.onErrorCallback = callback
  }

  destroy() {
    for (const blobUrl of this.cache.values()) {
      URL.revokeObjectURL(blobUrl)
    }
    this.cache.clear()
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.isInitialized = false
  }
}

const imagePreloaderInstance = new ImagePreloader()

ImagePreloader.getImageUrl = (index) =>
  imagePreloaderInstance.getImageUrl(index)
ImagePreloader.preloadAll = () => imagePreloaderInstance.startPreloading()
ImagePreloader.preloadRange = (start, end) => {
  imagePreloaderInstance.startPreloading()
}
ImagePreloader.isImageLoaded = (index) =>
  imagePreloaderInstance.isImageLoaded(index)
ImagePreloader.getLoadingStats = () => imagePreloaderInstance.getLoadingStats()

// 导出到全局作用域，使HTML中的代码可以访问
window.ImagePreloader = ImagePreloader

export { ImagePreloader, imagePreloaderInstance as default }
