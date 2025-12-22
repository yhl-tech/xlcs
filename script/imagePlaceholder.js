// Lightweight, non-blocking image placeholder utilities.
// Avoid static imports of DOM refs so module evaluation cannot fail
// if `domRefs.js` is missing or empty.

const pageReloaded = (() => {
  try {
    const [navEntry] =
      window.performance?.getEntriesByType?.("navigation") || []
    if (navEntry && navEntry.type) {
      return navEntry.type === "reload"
    }
    if (window.performance && window.performance.navigation) {
      return (
        window.performance.navigation.type ===
        window.performance.navigation.TYPE_RELOAD
      )
    }
  } catch (error) {
    console.warn("[Session] 检测页面刷新状态失败:", error)
  }
  return false
})()

let allowLoadingOverlay = pageReloaded
let transientLoadingOverlayVisible = false

// Concurrency limiter for placeholder displays
// - maxConcurrentPlaceholders: maximum simultaneous visible placeholders (0 = unlimited)
let maxConcurrentPlaceholders = 1
let currentActivePlaceholders = 0
const placeholderQueue = []

// (removed unused setter for max concurrent placeholders; default is 1)

function _processQueue() {
  try {
    console.debug &&
      console.debug(
        "[ImagePlaceholder] _processQueue start",
        "queueLength:",
        placeholderQueue.length,
        "currentActive:",
        currentActivePlaceholders
      )
    while (
      (maxConcurrentPlaceholders === 0 ||
        currentActivePlaceholders < maxConcurrentPlaceholders) &&
      placeholderQueue.length > 0
    ) {
      const { message, options } = placeholderQueue.shift()
      console.debug &&
        console.debug("[ImagePlaceholder] dequeue item", { message, options })
      // show queued item (respect its options)
      _doShowImagePlaceholder(message, options)
    }
  } catch (e) {
    // noop
  }
}

function _doShowImagePlaceholder(message, options = {}) {
  const { imagePlaceholder, imagePlaceholderText } = _getPlaceholderElements()
  if (!imagePlaceholder) return

  const { force = false } = options

  try {
    console.debug &&
      console.debug("[ImagePlaceholder] _doShowImagePlaceholder called", {
        message,
        options,
      })
    if (message && imagePlaceholderText)
      imagePlaceholderText.textContent = message
    imagePlaceholder.classList.remove("hidden")
    if (!force) transientLoadingOverlayVisible = true
    if (!force) currentActivePlaceholders += 1
    console.debug &&
      console.debug(
        "[ImagePlaceholder] shown",
        "currentActivePlaceholders:",
        currentActivePlaceholders,
        "transient:",
        transientLoadingOverlayVisible
      )
  } catch (e) {
    // noop
  }
}

export function isPageReloaded() {
  return pageReloaded
}

function _getPlaceholderElements() {
  if (typeof document === "undefined")
    return { imagePlaceholder: null, imagePlaceholderText: null }
  const imagePlaceholder = document.getElementById("image-placeholder")
  const imagePlaceholderText = document.getElementById("image-placeholder-text")
  return { imagePlaceholder, imagePlaceholderText }
}

function _isAudioReady() {
  try {
    if (window.dialogClient && window.dialogClient.isConnected) return true
    const ap =
      typeof document !== "undefined"
        ? document.getElementById("audio-player")
        : null
    if (ap) {
      if (ap.src) return true
    }
  } catch (e) {
    // ignore
  }
  return false
}

/**
 * 显示图片占位（非阻塞）。
 * options:
 *  - force: boolean (立即显示，忽略 allowLoadingOverlay)
 *  - waitForAudio: boolean (如果 true，在音频就绪后再显示占位)
 */
export function showImagePlaceholder(
  message = "正在加载图版，请稍候...",
  options = {}
) {
  const { force = false, waitForAudio = false } = options

  console.debug &&
    console.debug("[ImagePlaceholder] showImagePlaceholder called", {
      message,
      options,
      allowLoadingOverlay,
    })

  // If waiting for audio, defer until audioReady; when fired, re-run show logic.
  if (waitForAudio && !_isAudioReady()) {
    const onAudioReady = () => {
      try {
        window.removeEventListener("audioReady", onAudioReady)
        // When audio is ready, attempt to show (respecting concurrency and force)
        if (force) {
          _doShowImagePlaceholder(message, options)
        } else {
          // enqueue to follow concurrency rules (may show immediately)
          console.debug &&
            console.debug(
              "[ImagePlaceholder] enqueue (waitForAudio resolved)",
              {
                message,
                options,
              }
            )
          placeholderQueue.push({ message, options })
          _processQueue()
        }
      } catch (e) {
        // noop
      }
    }
    window.addEventListener("audioReady", onAudioReady)
    console.debug &&
      console.debug("[ImagePlaceholder] waiting for audioReady, listener added")
    return
  }

  // If overlays are globally disabled and not forced, keep hidden.
  if (!force && !allowLoadingOverlay) {
    const { imagePlaceholder } = _getPlaceholderElements()
    if (imagePlaceholder) imagePlaceholder.classList.add("hidden")
    return
  }

  // If force, show immediately bypassing limiter.
  if (force || maxConcurrentPlaceholders === 0) {
    console.debug &&
      console.debug("[ImagePlaceholder] force show bypassing limiter")
    _doShowImagePlaceholder(message, options)
    return
  }

  // Otherwise follow concurrency limiter: show now if slot available, else enqueue.
  if (currentActivePlaceholders < maxConcurrentPlaceholders) {
    _doShowImagePlaceholder(message, options)
  } else {
    console.debug &&
      console.debug("[ImagePlaceholder] enqueue (limit reached)", {
        message,
        options,
      })
    placeholderQueue.push({ message, options })
  }
}

export function hideImagePlaceholder(options = {}) {
  const { imagePlaceholder } = _getPlaceholderElements()
  if (!imagePlaceholder) return
  try {
    console.debug &&
      console.debug("[ImagePlaceholder] hideImagePlaceholder called", {
        options,
      })
    imagePlaceholder.classList.add("hidden")
    // If this hide corresponds to a transient non-forced placeholder, free a slot.
    if (transientLoadingOverlayVisible || options.disableFuture === true) {
      allowLoadingOverlay = false
      transientLoadingOverlayVisible = false
    }
    // Decrement active counter (guard to avoid negative)
    if (currentActivePlaceholders > 0) currentActivePlaceholders -= 1
    console.debug &&
      console.debug(
        "[ImagePlaceholder] after hide currentActivePlaceholders:",
        currentActivePlaceholders
      )
    // Try to show queued placeholders if any
    _processQueue()
  } catch (e) {
    // noop
  }
}

// External hook: mark audio as ready (triggers any waiting placeholders)
export function markAudioReady() {
  try {
    console.debug && console.debug("[ImagePlaceholder] markAudioReady dispatch")
    window.dispatchEvent(new Event("audioReady"))
  } catch (e) {
    // noop
  }
}
