/**
 * 精简版图片预加载管理器
 * 目的：删除复杂且未必被外部直接依赖的逻辑，保留 appMain.js 依赖的公共 API。
 */
import { state } from "./appState.js"

const preloadCache = new Map() // key: index(number) 或 path(string) -> HTMLImageElement
const loadingStatus = new Map() // key -> 'loading' | 'loaded' | 'error'

const specialImages = {
  example: "rorschach-blot-example.png",
}

// Download queue to serialize setting `img.src` so only one image starts downloading at a time.
const downloadQueue = []
let isDownloading = false

function _processDownloadQueue() {
  if (isDownloading) return
  const task = downloadQueue.shift()
  if (!task) return
  isDownloading = true
  const { href, key, img, onLoad, onError } = task
  try {
    console.debug &&
      console.debug(
        "[ImagePreloader] _processDownloadQueue START",
        "key:",
        key,
        "href:",
        href,
        "queueLength:",
        downloadQueue.length
      )
  } catch (e) {
    /* noop */
  }
  // Attach handlers and start download
  img.onload = function () {
    try {
      console.debug && console.debug("[ImagePreloader] img.onload", key, href)
      onLoad && onLoad()
    } finally {
      isDownloading = false
    }
  }
  img.onerror = function () {
    try {
      console.warn && console.warn("[ImagePreloader] img.onerror", key, href)
      onError && onError()
    } finally {
      isDownloading = false
    }
  }
  try {
    console.debug && console.debug("[ImagePreloader] setting img.src", href)
    img.src = href
  } catch (e) {
    // 如果立即抛错，标记为 error 并继续处理队列
    loadingStatus.set(key, "error")
    isDownloading = false
    setTimeout(_processDownloadQueue, 0)
  }
}

function _createAndLoadImage(href, key) {
  if (!href) return null
  // 如果已创建或正在加载，直接返回已创建的对象（避免重复）
  if (preloadCache.has(key) && loadingStatus.get(key) === "loaded")
    return preloadCache.get(key)
  if (loadingStatus.get(key) === "loading") return null

  try {
    const img = new Image()
    // 标记为正在加载并在缓存中存一个占位 image 对象
    loadingStatus.set(key, "loading")
    preloadCache.set(key, img)

    // 准备队列任务：实际赋 src 的逻辑将在队列中串行执行
    const onLoad = () => {
      try {
        loadingStatus.set(key, "loaded")
        preloadCache.set(key, img)
        console.debug &&
          console.debug("[ImagePreloader] onLoad handler (loaded)", key, href)
      } catch (err) {
        /* noop */
      } finally {
        img.onload = null
        img.onerror = null
        _processDownloadQueue()
      }
    }
    const onError = () => {
      try {
        loadingStatus.set(key, "error")
        console.warn &&
          console.warn("[ImagePreloader] onError handler (error)", key, href)
      } catch (err) {
        /* noop */
      } finally {
        img.onload = null
        img.onerror = null
        _processDownloadQueue()
      }
    }

    console.debug &&
      console.debug("[ImagePreloader] enqueue", {
        key,
        href,
        queueBefore: downloadQueue.length,
      })
    downloadQueue.push({ href, key, img, onLoad, onError })
    _processDownloadQueue()
    return img
  } catch (e) {
    console.warn("[ImagePreloader] 创建 Image 失败:", e)
    return null
  }
}

export const ImagePreloader = {
  preloadCache,
  loadingStatus,
  specialImages,

  preloadImage(index) {
    if (typeof index !== "number" || index < 0) return false
    if (
      typeof state === "object" &&
      Number.isFinite(state.totalImages) &&
      index >= state.totalImages
    )
      return false
    if (preloadCache.has(index) && loadingStatus.get(index) === "loaded")
      return true
    const href = `./images/rorschach-blot-${index + 1}.png`
    console.debug &&
      console.debug("[ImagePreloader] preloadImage requested", index, href)
    _createAndLoadImage(href, index)
    return true
  },

  preloadRange(startIndex, endIndex) {
    startIndex = Math.max(0, Math.floor(startIndex || 0))
    endIndex = Math.min(
      typeof state === "object" ? state.totalImages - 1 : endIndex,
      Math.floor(endIndex || startIndex)
    )
    if (startIndex > endIndex) return

    console.debug &&
      console.debug("[ImagePreloader] preloadRange", { startIndex, endIndex })
    // Sequentially preload images one-by-one to avoid queuing many at once.
    const self = this
    let current = startIndex

    function loadNext() {
      if (current > endIndex) return
      // 如果已加载或正在加载，等待其完成再继续
      if (
        preloadCache.has(current) &&
        loadingStatus.get(current) === "loaded"
      ) {
        current++
        // next tick
        setTimeout(loadNext, 0)
        return
      }
      if (loadingStatus.get(current) === "loading") {
        // poll until finished
        const poll = setInterval(() => {
          const s = loadingStatus.get(current)
          if (s === "loaded" || s === "error") {
            clearInterval(poll)
            current++
            setTimeout(loadNext, 0)
          }
        }, 120)
        return
      }
      // start loading this index
      console.debug &&
        console.debug("[ImagePreloader] preloadRange start index", current)
      self.preloadImage(current)
      // poll for completion then proceed
      const poll2 = setInterval(() => {
        const s = loadingStatus.get(current)
        if (s === "loaded" || s === "error") {
          clearInterval(poll2)
          current++
          setTimeout(loadNext, 0)
        }
      }, 120)
    }

    loadNext()
  },

  preloadAhead(currentIndex) {
    // 预加载下一张作为轻量策略（只预加载 1 张，避免同时触发多张下载）
    this.preloadRange(currentIndex + 1, currentIndex + 1)
  },

  preloadSpecialImage(imageKey) {
    const name = specialImages[imageKey]
    if (!name) return false
    // 尝试常见位置，优先 images，然后 public/images
    // 仅使用 public 目录下的静态资源路径，避免打包时重复输出相同文件
    const candidates = [`./public/images/${name}`]
    for (const href of candidates) {
      if (loadingStatus.get(href) === "loaded" || preloadCache.has(href)) {
        return true
      }
      _createAndLoadImage(href, href)
      // 如果是示例图（intro-preview-image），在示例图加载完成后再开始按序预加载 rorschach-blot-1..N
      try {
        if (imageKey === "example" && typeof document !== "undefined") {
          // Ensure we only trigger once
          if (!window._imagePreloader_exampleTriggered) {
            const el = document.getElementById("intro-preview-image")
            const triggerPreloadRange = () => {
              try {
                window._imagePreloader_exampleTriggered = true
                // preload numbered images sequentially (indexes 0..totalImages-1)
                if (
                  typeof state === "object" &&
                  Number.isFinite(state.totalImages)
                ) {
                  const last = Math.max(0, state.totalImages - 1)
                  // start from 0 (rorschach-blot-1.png corresponds to index 0)
                  this.preloadRange(0, last)
                }
              } catch (err) {
                /* noop */
              }
            }

            if (el) {
              if (el.complete && el.naturalWidth > 0) {
                triggerPreloadRange()
              } else {
                const onLoad = () => {
                  try {
                    el.removeEventListener("load", onLoad)
                  } catch (e) {}
                  triggerPreloadRange()
                }
                el.addEventListener("load", onLoad)
              }
            } else {
              // no DOM element available; rely on the created Image to trigger queue handlers
              // the _createAndLoadImage call above will enqueue download and eventually call preloadRange via its onLoad
            }
          }
        }
      } catch (e) {
        // noop
      }
    }
    return true
  },

  preloadAll() {
    // 轻量预加载：优先加载关键资源（示例图与 logo）并预加载首张
    this.preloadSpecialImage("example")
    this.preloadSpecialImage("logo")
    if (
      state &&
      typeof state.totalImages === "number" &&
      state.totalImages > 0
    ) {
      // 仅预加载第一张，避免在初始化时并行下载多张图片
      this.preloadRange(0, Math.min(0, state.totalImages - 1))
    }
  },

  initialPreload() {
    // 兼容旧调用：预加载第一张
    this.preloadRange(
      0,
      Math.min(0, typeof state === "object" ? state.totalImages - 1 : 0)
    )
  },

  isPreloaded(index) {
    return loadingStatus.get(index) === "loaded"
  },

  isPreloadingOrLoaded(index) {
    const s = loadingStatus.get(index)
    return s === "loading" || s === "loaded"
  },

  getPreloadedImage(key) {
    return preloadCache.get(key) || null
  },

  getImageUrl(index) {
    return `./images/rorschach-blot-${index + 1}.png`
  },

  clearCache(keepIndices = []) {
    const keepSet = new Set(keepIndices)
    for (const k of Array.from(preloadCache.keys())) {
      if (typeof k === "number" && !keepSet.has(k)) {
        preloadCache.delete(k)
        loadingStatus.delete(k)
      }
    }
  },

  reset() {
    preloadCache.clear()
    loadingStatus.clear()
  },
}
