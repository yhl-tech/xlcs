import { imagePlaceholder, imagePlaceholderText } from "./domRefs.js"

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

export function isPageReloaded() {
  return pageReloaded
}

export function showImagePlaceholder(
  message = "正在加载图版，请稍候...",
  options = {}
) {
  if (!imagePlaceholder) {
    return
  }
  const { force = false } = options
  if (!force && !allowLoadingOverlay) {
    imagePlaceholder.classList.add("hidden")
    return
  }
  if (message && imagePlaceholderText) {
    imagePlaceholderText.textContent = message
  }
  imagePlaceholder.classList.remove("hidden")
  if (!force) {
    transientLoadingOverlayVisible = true
  }
}

export function hideImagePlaceholder(options = {}) {
  if (!imagePlaceholder) {
    return
  }
  imagePlaceholder.classList.add("hidden")
  if (transientLoadingOverlayVisible || options.disableFuture === true) {
    allowLoadingOverlay = false
    transientLoadingOverlayVisible = false
  }
}


