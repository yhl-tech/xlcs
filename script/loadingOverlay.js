import { state } from "./appState.js"
import { mainContent, testLoadingOverlay, testLoadingText } from "./domRefs.js"

export function showTestLoadingOverlay(
  message = "正在准备测试环境，请稍候..."
) {
  if (testLoadingOverlay) {
    testLoadingOverlay.classList.remove("hidden")
    testLoadingOverlay.setAttribute("aria-hidden", "false")
  }
  if (message && testLoadingText) {
    testLoadingText.textContent = message
  }
  if (mainContent) {
    mainContent.style.display = "none"
  }
}

export function hideTestLoadingOverlay(options = {}) {
  const { keepMainHidden = false } = options
  if (testLoadingOverlay) {
    testLoadingOverlay.classList.add("hidden")
    testLoadingOverlay.setAttribute("aria-hidden", "true")
  }
  if (!keepMainHidden && mainContent && state.stage === "test") {
    mainContent.style.display = "flex"
  }
}


