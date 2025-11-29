import { CANVAS_BASE_TRANSFORM } from "./appState.js"

export const infoScreen = document.getElementById("info-screen")
export const appWindow = document.getElementById("app-window")
export const mainContent = document.getElementById("main-content")
export const testLoadingOverlay = document.getElementById(
  "test-loading-overlay"
)
export const testLoadingText = document.getElementById("test-loading-text")
export const startTestBtn = document.getElementById("start-test-btn")
export const resumeTestBtn = document.getElementById("resume-test-btn")
export const introOverlay = document.getElementById("intro-overlay")
export const introText = document.getElementById("intro-text")
export const enterBtn = document.getElementById("enter-btn")
export const introPreviewImage = document.getElementById("intro-preview-image")
export const previewCanvas = document.querySelector(".test-preview-canvas")
export const previewCtx = previewCanvas ? previewCanvas.getContext("2d") : null
export const audioPlayer = document.getElementById("audio-player")
export const controlsBar = document.getElementById("controls-bar")
export const rorschachImage = document.getElementById("rorschach-image")
export const canvas = document.getElementById("drawing-canvas")
export const imagePlaceholder = document.getElementById("image-placeholder")
export const imagePlaceholderText = document.getElementById(
  "image-placeholder-text"
)
export const postTestView = document.getElementById("post-test-view")
export const summaryView = document.getElementById("summary-view")
export const questionText = document.getElementById("question-text")
export const finishBtn = document.getElementById("finish-btn")
export const nextBtn = document.getElementById("next-btn")
export const prevBtn = document.getElementById("prev-btn")
export const progressText = document.getElementById("progress-text")

if (canvas) {
  canvas.style.transform = CANVAS_BASE_TRANSFORM
}

export const ctx = canvas ? canvas.getContext("2d") : null


