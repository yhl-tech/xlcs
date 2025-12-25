import {
  INTRO_STEPS,
  INTRO_STEP_VALUES,
  PROMPT_TEXTS,
  FINAL_PROMPT_TEXT,
  POST_TEST_QUESTIONS,
  SESSION_VERSION,
  SESSION_SAVE_DEBOUNCE,
  INACTIVITY_THRESHOLD_1,
  INACTIVITY_THRESHOLD_2,
  NEXT_BUTTON_COOLDOWN,
  CANVAS_BASE_TRANSFORM,
  INTRO_TEXT,
  getEmptyBasicInfoDraft,
  state,
  sessionState,
  TTS,
  buildTTSQuery,
  getRandomPromptText,
  isWhyQuestion,
  findWhyQuestion,
  shouldDisplayQuestion,
} from "./appState.js"
import { formatDateTime } from "./utils.js"

// 判断是否为生产环境（从 appState.js 导入或本地定义）
const isProduction =
  typeof import.meta !== "undefined" &&
  (import.meta.env?.PROD === true || import.meta.env?.MODE === "production")
import { DEV_CONFIG } from "./config.js"
import { initDeviceCheck, isDeviceCheckReady } from "./deviceCheck.js"
import {
  updateQuestionProgress,
  initQuestionProgressPillar,
  hideQuestionProgressPillar,
} from "./questionProgress.js"
import { startIntroGuide, destroyIntroGuide } from "./driverGuide.js"
import {
  startOperationReactionTest,
  detectDrawingAction,
} from "./operationReactionTest.js"
import { waitingReportManager } from "./waitingReport.js"
import { initImagePan } from "./imagePan.js"

let sessionSaveTimer = null
let pendingSessionSnapshot = null
let sessionManagerReady = false
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
let latestSnapshotVersion = 0
let restoreSnapshotCache = null
let restoringFromSnapshot = false
let shouldPlayWelcomeMessage = true
let welcomeMessageTimer = null
let isCheckingReportStatus = false
let introResumeInProgress = false
let inactivityTimer = null
let inactivityActive = false
let nextButtonCooldownTimer = null // "下一张"按钮冷却定时器

let currentQuestionIndex = 0

const REPORT_READY_STATUSES = new Set([
  "ready",
  "completed",
  "done",
  "available",
  "finished",
  "success",
])

const REPORT_PROCESSING_STATUSES = new Set([
  "processing",
  "pending",
  "waiting",
  "generating",
  "in_progress",
  "queued",
])

const DEFAULT_REPORT_WAITING_STATUS = {
  status: "processing",
  message: "测试后大约 1～2天会生成测试报告，请耐心等待。",
}

const SKIP_REPORT_REDIRECT_FLAG = "xlcs_skip_report_redirect"

let latestReportStatus = null
let retestFlowActive = false

function shouldSkipReportRedirect() {
  try {
    return sessionStorage.getItem(SKIP_REPORT_REDIRECT_FLAG) === "1"
  } catch (error) {
    console.warn("[Report] 读取重测跳转标记失败:", error)
    return false
  }
}

function setSkipReportRedirectFlag(enabled = false) {
  try {
    if (enabled) {
      sessionStorage.setItem(SKIP_REPORT_REDIRECT_FLAG, "1")
    } else {
      sessionStorage.removeItem(SKIP_REPORT_REDIRECT_FLAG)
    }
  } catch (error) {
    console.warn("[Report] 设置重测跳转标记失败:", error)
  }
}

if (window.dialogClient) {
  window.dialogClient.onDisconnect = () => {
    TTS.inited = false
    TTS.currentMode = null
    TTS.currentPhase = null
  }
}

// 根据当前应用阶段推断默认的对话 phase
function getCurrentDiagPhase() {
  if (TTS.currentPhase) {
    return TTS.currentPhase
  }
  switch (state.stage) {
    case "intro":
      return "pretest"
    case "test":
      // 根据当前图片索引判断是第一张还是后面几张
      return state.currentIndex === 0 ? "intest1" : "intest2to10"
    case "post":
    case "summary":
      return "posttest"
    default:
      return null
  }
}

async function ensureTTSInit(mode = "audio", phase = null) {
  if (!window.dialogClient) {
    throw new Error("dialogClient 未加载")
  }

  // 如果调用方未显式指定 phase，则根据当前阶段或已有状态推断
  if (!phase) {
    phase = getCurrentDiagPhase()
  }

  // 修复：确保连接状态干净，避免文案过长导致的状态异常
  if (window.dialogClient.isConnected) {
    // 检查模式与阶段是否都匹配
    if (
      TTS.inited &&
      TTS.currentMode === mode &&
      (TTS.currentPhase || null) === (phase || null)
    ) {
      return
    }
    // 模式或阶段不匹配，需要重新初始化
    console.log(
      "[TTS] 配置不匹配，重新初始化",
      "mode:",
      TTS.currentMode,
      "->",
      mode,
      "phase:",
      TTS.currentPhase,
      "->",
      phase
    )
    window.dialogClient.disconnect()
    TTS.inited = false
    TTS.currentMode = null
    TTS.currentPhase = null
    // 等待连接完全关闭
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  // 确保连接已完全关闭后再重新连接
  if (!window.dialogClient.isConnected) {
    console.log("[TTS] 建立新连接")
    await window.dialogClient.connect()
  }

  try {
    window.dialogClient.sendInitMessage(TTS.speaker, mode, phase || null)
    TTS.inited = true
    TTS.currentMode = mode
    TTS.currentPhase = phase || null
    console.log("[TTS] 初始化完成，模式:", mode, "阶段:", TTS.currentPhase)
  } catch (e) {
    console.warn("发送 TTS 初始化失败：", e)
    // 即使初始化消息发送失败，也标记为已初始化以避免阻塞
    TTS.inited = true
    TTS.currentMode = mode
    TTS.currentPhase = phase || null
  }
}

async function sendTTSText(
  text,
  opts = { start: true, end: true, is_user_querying: false }
) {
  if (!window.dialogClient) {
    throw new Error("dialogClient 未加载")
  }
  if (!window.dialogClient.isConnected) {
    await window.dialogClient.connect()
  }

  // 获取当前阶段（如果 opts 中没有指定）
  const phase = opts.phase || TTS.currentPhase || null

  window.dialogClient.sendTTSText(String(text || ""), {
    start: Boolean(opts.start),
    end: Boolean(opts.end),
    is_user_querying: Boolean(opts.is_user_querying),
    phase: phase,
  })
}

async function sendTextQuery(text, { ensure = true } = {}) {
  if (!window.dialogClient) {
    throw new Error("dialogClient 未加载")
  }

  // 修复：增强连接检查和重试机制
  if (ensure) {
    await ensureTTSInit("audio")
  } else if (!window.dialogClient.isConnected) {
    // 即使ensure=false，也要确保连接是活动的
    console.log("[sendTextQuery] 检测到连接断开，尝试重新连接")
    try {
      await window.dialogClient.connect()
    } catch (e) {
      console.warn("[sendTextQuery] 重新连接失败:", e)
      // 如果连接失败，尝试重新初始化
      await ensureTTSInit("audio")
    }
  }

  // 双重检查连接状态
  if (
    !window.dialogClient.isConnected ||
    !window.dialogClient.ws ||
    window.dialogClient.ws.readyState !== WebSocket.OPEN
  ) {
    console.warn("[sendTextQuery] WebSocket连接异常，尝试修复")
    try {
      await window.dialogClient.connect()
    } catch (e) {
      throw new Error("无法建立WebSocket连接: " + e.message)
    }
  }

  // 获取当前阶段（自动推断）
  const phase = TTS.currentPhase || getCurrentDiagPhase()

  window.dialogClient.sendTextQuery(String(text || ""), phase)
}

// 暴露 sendTextQuery 和 buildTTSQuery 到全局，供其他模块使用
window.sendTextQuery = sendTextQuery
window.buildTTSQuery = buildTTSQuery

// DOM Elements
const infoScreen = document.getElementById("info-screen")
const appWindow = document.getElementById("app-window")
const mainContent = document.getElementById("main-content")
const testLoadingOverlay = document.getElementById("test-loading-overlay")
const testLoadingText = document.getElementById("test-loading-text")
const startTestBtn = document.getElementById("start-test-btn")
const resumeTestBtn = document.getElementById("resume-test-btn")
const introOverlay = document.getElementById("intro-overlay")
const introText = document.getElementById("intro-text")
const enterBtn = document.getElementById("enter-btn")
const introPreviewImage = document.getElementById("intro-preview-image")
const previewCanvas = document.querySelector(".test-preview-canvas")
const previewCtx = previewCanvas ? previewCanvas.getContext("2d") : null
let deviceCheckContainer = null
let deviceCheckTip = null

// 预览窗口的独立状态管理（不记录到 interactionTracker）
const previewState = {
  zoom: 1,
  rotation: 0,
  tool: "pen",
  color: "#ef4444", // red
  drawing: false,
  currentImageIndex: 0, // 预览窗口显示的图片索引（0-9）
  canvasStates: new Array(10).fill(null), // 每张图片的画布状态
}

// 暴露到全局，供其他模块使用
window.previewState = previewState

// 预览图片错误处理函数
function handlePreviewImageError(img) {
  if (!img) return
  // 隐藏图片，避免显示破裂图标
  img.style.display = "none"
}

// 为初始图片添加错误处理
if (introPreviewImage) {
  introPreviewImage.onerror = () => handlePreviewImageError(introPreviewImage)
}

// 预览窗口交互函数
function initPreviewCanvasInteractions() {
  if (!previewCanvas || !previewCtx) return

  // 初始化画布尺寸 - 使用容器的尺寸而不是图片的尺寸
  const introPreviewImage = document.getElementById("intro-preview-image")
  const imageFrame = previewCanvas.closest(".test-preview-image-frame")

  const resizePreviewCanvas = () => {
    if (!previewCanvas || !imageFrame) return
    // 获取容器的实际尺寸
    const rect = imageFrame.getBoundingClientRect()
    previewCanvas.width = rect.width || 400
    previewCanvas.height = rect.height || 400
  }

  if (introPreviewImage && previewCanvas && imageFrame) {
    // 添加错误处理
    introPreviewImage.onerror = () => handlePreviewImageError(introPreviewImage)

    // 初始化画布尺寸
    const initCanvasSize = () => {
      // 等待一帧确保布局完成
      requestAnimationFrame(() => {
        resizePreviewCanvas()
      })
    }

    if (introPreviewImage.complete) {
      initCanvasSize()
    } else {
      introPreviewImage.onload = initCanvasSize
    }

    // 添加resize监听器
    const resizeObserver = new ResizeObserver(() => {
      resizePreviewCanvas()
    })
    resizeObserver.observe(imageFrame)
  }

  // 保存当前画布状态
  function savePreviewCanvasState() {
    if (previewCanvas) {
      previewState.canvasStates[previewState.currentImageIndex] =
        previewCanvas.toDataURL()
    }
  }

  // 恢复画布状态
  function restorePreviewCanvasState() {
    const savedState = previewState.canvasStates[previewState.currentImageIndex]
    if (savedState && previewCanvas) {
      const img = new Image()
      img.onload = () => {
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
        previewCtx.drawImage(img, 0, 0)
      }
      img.src = savedState
    } else {
      previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
    }
  }

  // 应用变换到画布
  function applyPreviewTransform() {
    if (!previewCanvas) return
    const frame = previewCanvas.closest(".test-preview-image-frame")
    if (frame) {
      frame.style.transform = `scale(${previewState.zoom}) rotate(${previewState.rotation}deg)`
    }
  }

  // 切换图片
  function switchPreviewImage(direction) {
    savePreviewCanvasState()
    if (direction === "next") {
      if (previewState.currentImageIndex < 9) {
        previewState.currentImageIndex++
      }
    } else {
      if (previewState.currentImageIndex > 0) {
        previewState.currentImageIndex--
      }
    }

    // 切换背景主题（立即切换，不延迟）
    if (
      window.BlackHoleBackground &&
      typeof window.BlackHoleBackground.switchTheme === "function"
    ) {
      console.log("[图片切换] 切换到图片索引:", previewState.currentImageIndex)
      window.BlackHoleBackground.switchTheme(previewState.currentImageIndex)
    } else {
      console.warn("[图片切换] BlackHoleBackground.switchTheme 不可用")
    }

    // 更新图片
    const introPreviewImage = document.getElementById("intro-preview-image")
    if (introPreviewImage) {
      // 添加错误处理
      introPreviewImage.onerror = () =>
        handlePreviewImageError(introPreviewImage)
      introPreviewImage.style.display = ""
      introPreviewImage.src = `./images/rorschach-blot-1.webp`
    }
    // 重置画布尺寸并恢复状态
    if (introPreviewImage && previewCanvas) {
      const imageFrame = previewCanvas.closest(".test-preview-image-frame")
      introPreviewImage.onload = () => {
        // 使用容器的尺寸而不是图片的尺寸
        if (imageFrame) {
          requestAnimationFrame(() => {
            const rect = imageFrame.getBoundingClientRect()
            previewCanvas.width = rect.width || 400
            previewCanvas.height = rect.height || 400
            restorePreviewCanvasState()
            applyPreviewTransform()
          })
        } else {
          restorePreviewCanvasState()
          applyPreviewTransform()
        }
      }
    } else {
      restorePreviewCanvasState()
      applyPreviewTransform()
    }
  }

  // 缩放
  function zoomPreview(direction) {
    if (direction === "in") {
      previewState.zoom = Math.min(previewState.zoom + 0.1, 3)
    } else {
      previewState.zoom = Math.max(previewState.zoom - 0.1, 0.5)
    }
    applyPreviewTransform()
  }

  // 旋转
  function rotatePreview(direction) {
    if (direction === "left") {
      previewState.rotation -= 30
    } else {
      previewState.rotation += 30
    }
    applyPreviewTransform()
  }

  // 切换工具
  function setPreviewTool(tool) {
    previewState.tool = tool
    const penBtn = document.querySelector('[data-action="pen"]')
    const eraseBtn = document.querySelector('[data-action="erase"]')
    if (penBtn) penBtn.classList.toggle("selected", tool === "pen")
    if (eraseBtn) eraseBtn.classList.toggle("selected", tool === "erase")
  }

  // 清除画布
  function clearPreviewCanvas() {
    if (previewCtx && previewCanvas) {
      // 停止当前绘制（如果有）
      previewState.drawing = false

      // 清除画布
      previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)

      // 重置画布上下文状态，确保画笔可以正常使用
      previewCtx.globalCompositeOperation = "source-over"
      previewCtx.strokeStyle = previewState.color
      previewCtx.lineWidth = 3
      previewCtx.lineCap = "round"
      previewCtx.beginPath()

      // 保存画布状态
      savePreviewCanvasState()

      // 清除后自动切换到画笔工具，方便继续绘画
      setPreviewTool("pen")
    }
  }

  // 设置颜色
  function setPreviewColor(color) {
    previewState.color = color
    // 更新颜色选择器的选中状态
    const colorMap = {
      "#ef4444": "red",
      "#10b981": "green",
      "#3b82f6": "blue",
    }
    const colorName = colorMap[color]
    if (colorName) {
      const colorOptions = document.querySelectorAll(
        ".color-selector .color-option"
      )
      colorOptions.forEach((opt) => {
        opt.classList.remove("selected")
        if (opt.getAttribute("data-color") === colorName) {
          opt.classList.add("selected")
        }
      })
    }
  }

  // 暴露函数供按钮使用
  window.previewActions = {
    prev: () => switchPreviewImage("prev"),
    next: () => switchPreviewImage("next"),
    zoomIn: () => zoomPreview("in"),
    zoomOut: () => zoomPreview("out"),
    rotateLeft: () => rotatePreview("left"),
    rotateRight: () => rotatePreview("right"),
    pen: () => setPreviewTool("pen"),
    erase: () => setPreviewTool("erase"),
    clear: clearPreviewCanvas,
    setColor: setPreviewColor,
  }

  // 绘制函数
  function drawPreview(e) {
    if (!previewState.drawing) return
    const rect = previewCanvas.getBoundingClientRect()
    // 考虑缩放和旋转，将屏幕坐标转换为画布坐标
    const scale = previewState.zoom
    const rotation = (previewState.rotation * Math.PI) / 180
    let x = (e.clientX || e.touches[0].clientX) - rect.left
    let y = (e.clientY || e.touches[0].clientY) - rect.top

    // 转换为相对于画布中心的坐标
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    x = (x - centerX) / scale
    y = (y - centerY) / scale

    // 反向旋转
    const cos = Math.cos(-rotation)
    const sin = Math.sin(-rotation)
    const rotatedX = x * cos - y * sin
    const rotatedY = x * sin + y * cos

    // 转换回画布坐标
    x = rotatedX + previewCanvas.width / 2
    y = rotatedY + previewCanvas.height / 2

    previewCtx.lineWidth = previewState.tool === "erase" ? 20 : 3
    previewCtx.lineCap = "round"

    if (previewState.tool === "erase") {
      previewCtx.globalCompositeOperation = "destination-out"
    } else {
      previewCtx.globalCompositeOperation = "source-over"
      previewCtx.strokeStyle = previewState.color
    }

    previewCtx.lineTo(x, y)
    previewCtx.stroke()
    previewCtx.beginPath()
    previewCtx.moveTo(x, y)
  }

  // 鼠标/触摸事件
  previewCanvas.addEventListener("mousedown", (e) => {
    previewState.drawing = true
    const rect = previewCanvas.getBoundingClientRect()
    const scale = previewState.zoom
    const rotation = (previewState.rotation * Math.PI) / 180
    let x = e.clientX - rect.left
    let y = e.clientY - rect.top

    const centerX = rect.width / 2
    const centerY = rect.height / 2
    x = (x - centerX) / scale
    y = (y - centerY) / scale

    const cos = Math.cos(-rotation)
    const sin = Math.sin(-rotation)
    const rotatedX = x * cos - y * sin
    const rotatedY = x * sin + y * cos

    x = rotatedX + previewCanvas.width / 2
    y = rotatedY + previewCanvas.height / 2

    previewCtx.beginPath()
    previewCtx.moveTo(x, y)
  })

  previewCanvas.addEventListener("mousemove", drawPreview)
  previewCanvas.addEventListener("mouseup", () => {
    if (previewState.drawing) {
      previewState.drawing = false
      savePreviewCanvasState()
      // 检测绘画操作（用于操作反应测试）
      detectDrawingAction()
    }
  })

  previewCanvas.addEventListener("touchstart", (e) => {
    e.preventDefault()
    previewState.drawing = true
    const rect = previewCanvas.getBoundingClientRect()
    const scale = previewState.zoom
    const rotation = (previewState.rotation * Math.PI) / 180
    let x = e.touches[0].clientX - rect.left
    let y = e.touches[0].clientY - rect.top

    const centerX = rect.width / 2
    const centerY = rect.height / 2
    x = (x - centerX) / scale
    y = (y - centerY) / scale

    const cos = Math.cos(-rotation)
    const sin = Math.sin(-rotation)
    const rotatedX = x * cos - y * sin
    const rotatedY = x * sin + y * cos

    x = rotatedX + previewCanvas.width / 2
    y = rotatedY + previewCanvas.height / 2

    previewCtx.beginPath()
    previewCtx.moveTo(x, y)
  })

  previewCanvas.addEventListener("touchmove", (e) => {
    e.preventDefault()
    drawPreview(e)
  })

  previewCanvas.addEventListener("touchend", () => {
    if (previewState.drawing) {
      previewState.drawing = false
      savePreviewCanvasState()
      // 检测绘画操作（用于操作反应测试）
      detectDrawingAction()
    }
  })
}

// 初始化预览窗口控制按钮
function initPreviewControlButtons() {
  // 确保 previewActions 已初始化
  if (!window.previewActions) {
    console.warn("[预览窗口] previewActions 未初始化，先初始化画布交互")
    initPreviewCanvasInteractions()
  }

  // 启用预览窗口控制按钮并添加事件监听
  const previewControlButtons = document.querySelectorAll(
    ".test-preview-controls button"
  )

  if (previewControlButtons.length === 0) {
    console.warn("[预览窗口] 未找到预览窗口按钮")
    return
  }

  // 存储已绑定的事件监听器，避免重复绑定
  if (!window._previewButtonHandlers) {
    window._previewButtonHandlers = new Map()
  }

  previewControlButtons.forEach((btn) => {
    // 强制启用按钮（无论之前是什么状态）
    btn.disabled = false

    const action = btn.getAttribute("data-action")
    if (!action) {
      console.warn("[预览窗口] 按钮缺少 data-action 属性:", btn)
      return
    }

    if (!window.previewActions) {
      console.error("[预览窗口] previewActions 未初始化，无法绑定按钮事件")
      return
    }

    // 移除旧的事件监听器（如果存在）
    const oldHandler = window._previewButtonHandlers.get(btn)
    if (oldHandler) {
      btn.removeEventListener("click", oldHandler)
    }

    // 创建新的事件处理器
    const handler = (e) => {
      // 防止按钮被禁用时触发
      if (btn.disabled) {
        console.warn(`[预览窗口] 按钮 ${action} 被禁用，忽略点击`)
        return
      }

      console.log(`[预览窗口] 点击按钮: ${action}`)

      try {
        switch (action) {
          case "prev":
            if (window.previewActions.prev) window.previewActions.prev()
            break
          case "next":
            if (window.previewActions.next) window.previewActions.next()
            break
          case "zoom-in":
            if (window.previewActions.zoomIn) window.previewActions.zoomIn()
            break
          case "zoom-out":
            if (window.previewActions.zoomOut) window.previewActions.zoomOut()
            break
          case "rotate-left":
            if (window.previewActions.rotateLeft)
              window.previewActions.rotateLeft()
            break
          case "rotate-right":
            if (window.previewActions.rotateRight)
              window.previewActions.rotateRight()
            break
          case "pen":
            if (window.previewActions.pen) window.previewActions.pen()
            break
          case "erase":
            if (window.previewActions.erase) window.previewActions.erase()
            break
          case "clear":
            if (window.previewActions.clear) window.previewActions.clear()
            break
          default:
            console.warn(`[预览窗口] 未知的按钮操作: ${action}`)
        }
      } catch (error) {
        console.error(`[预览窗口] 执行按钮操作 ${action} 时出错:`, error)
      }
    }

    // 绑定新的事件监听器
    btn.addEventListener("click", handler)
    window._previewButtonHandlers.set(btn, handler)
  })

  // 颜色选择器
  const colorOptions = document.querySelectorAll(
    ".color-selector .color-option"
  )

  // 存储颜色选择器的事件监听器
  if (!window._colorOptionHandlers) {
    window._colorOptionHandlers = new Map()
  }

  colorOptions.forEach((option) => {
    // 移除旧的事件监听器（如果存在）
    const oldHandler = window._colorOptionHandlers.get(option)
    if (oldHandler) {
      option.removeEventListener("click", oldHandler)
    }

    // 创建新的事件处理器
    const handler = () => {
      colorOptions.forEach((opt) => opt.classList.remove("selected"))
      option.classList.add("selected")
      const color = option.getAttribute("data-color")
      const colorMap = {
        red: "#ef4444",
        green: "#10b981",
        blue: "#3b82f6",
      }
      if (window.previewState && colorMap[color]) {
        window.previewState.color = colorMap[color]
        // 如果 previewActions 有 setColor 方法，也调用它
        if (window.previewActions && window.previewActions.setColor) {
          window.previewActions.setColor(colorMap[color])
        }
        console.log(`[预览窗口] 选择颜色: ${color} (${colorMap[color]})`)
      }
    }

    // 绑定新的事件监听器
    option.addEventListener("click", handler)
    window._colorOptionHandlers.set(option, handler)
  })

  console.log("[预览窗口] 按钮和颜色选择器已初始化")
}

// 暴露到全局，供其他模块使用
window.initPreviewControlButtons = initPreviewControlButtons

const audioPlayer = document.getElementById("audio-player")
const controlsBar = document.getElementById("controls-bar")
const rorschachImage = document.getElementById("rorschach-image")
const canvas = document.getElementById("drawing-canvas")
const postTestView = document.getElementById("post-test-view")
const summaryView = document.getElementById("summary-view")
const waitingReportView = document.getElementById("waiting-report-view")
const questionText = document.getElementById("question-text")
const nextQuestionBtn = document.getElementById("next-question-btn")
const nextBtn = document.getElementById("next-btn")
const prevBtn = document.getElementById("prev-btn")
const progressText = document.getElementById("progress-text")
const ctx = canvas.getContext("2d")
const BASIC_INFO_FIELDS = ["sex", "age", "education", "occupation", "mood"]
const BASIC_INFO_LABELS = Object.freeze({
  sex: "性别",
  age: "年龄",
  education: "学历",
  occupation: "职业",
  mood: "当前心情",
})
const VALID_SEX_OPTIONS = Object.freeze(["男", "女"])
const basicInfoErrorElements = BASIC_INFO_FIELDS.reduce((acc, field) => {
  acc[field] = document.getElementById(`${field}-error`)
  return acc
}, {})
canvas.style.transform = CANVAS_BASE_TRANSFORM

// 图片平移偏移量（仅在当前会话中使用，不参与快照）
let panOffsetX = 0
let panOffsetY = 0

// 图片平移控制器（来自 imagePan 模块）
let imagePanController = null

// 是否已经通过“放大/缩小”与图片进行过缩放交互
// 仅用于控制：在用户首次使用缩放前，不启用拖拽平移
let hasInteractedWithZoom = false

// 根据当前工具与缩放状态更新画布光标样式
function updateCanvasCursor() {
  if (!canvas) return
  if (state.tool === "pen" || state.tool === "eraser") {
    // 绘图模式下使用十字光标
    canvas.style.cursor = "crosshair"
  } else if (hasInteractedWithZoom) {
    // 只要用户使用过缩放，且当前不是画笔/橡皮，就提示可以拖拽查看图片
    canvas.style.cursor = "grab"
  } else {
    // 其他情况使用默认光标
    canvas.style.cursor = "default"
  }
}

// 退出当前绘图工具（用于在缩放时与画笔/橡皮互斥）
function exitDrawingTools() {
  // 将工具状态切回“无工具”，只保留颜色设置
  state.tool = "none"
  const penBtn = document.getElementById("pen-tool")
  const eraserBtn = document.getElementById("eraser-tool")
  if (penBtn) penBtn.classList.remove("selected")
  if (eraserBtn) eraserBtn.classList.remove("selected")
  updateCanvasCursor()
}

function getBasicInfoInputMap() {
  return BASIC_INFO_FIELDS.reduce((acc, field) => {
    acc[field] = document.getElementById(field)
    return acc
  }, {})
}

function applyBasicInfoDraftToInputs(draft = state.basicInfoDraft) {
  const inputs = getBasicInfoInputMap()
  BASIC_INFO_FIELDS.forEach((field) => {
    if (inputs[field]) {
      inputs[field].value = draft?.[field] ?? ""
    }
  })
}

function syncBasicInfoDraftFromInputs() {
  const inputs = getBasicInfoInputMap()
  const nextDraft = getEmptyBasicInfoDraft()
  BASIC_INFO_FIELDS.forEach((field) => {
    if (inputs[field]) {
      const rawValue =
        typeof inputs[field].value === "string" ? inputs[field].value : ""
      nextDraft[field] = rawValue.trim()
    }
  })
  state.basicInfoDraft = nextDraft
  return nextDraft
}

function setupBasicInfoDraftListeners() {
  const inputs = getBasicInfoInputMap()
  BASIC_INFO_FIELDS.forEach((field) => {
    const input = inputs[field]
    if (!input) {
      return
    }
    input.addEventListener("input", () => {
      const rawValue = typeof input.value === "string" ? input.value : ""
      state.basicInfoDraft[field] = rawValue.trim()
      clearInputValidationState(input)
      saveSessionSnapshot("basic_info")
    })
  })
}

function getFieldErrorElement(field) {
  if (!field) {
    return null
  }
  if (!basicInfoErrorElements[field]) {
    basicInfoErrorElements[field] = document.getElementById(`${field}-error`)
  }
  return basicInfoErrorElements[field]
}

function setFieldErrorMessage(field, message = "") {
  const errorElement = getFieldErrorElement(field)
  if (!errorElement) {
    return
  }
  errorElement.textContent = message
  if (message) {
    errorElement.classList.add("visible")
  } else {
    errorElement.classList.remove("visible")
  }
}

function clearFieldErrorMessage(field) {
  setFieldErrorMessage(field, "")
}

function clearInputValidationState(input, fieldId = input?.id) {
  if (input) {
    input.classList.remove("input-invalid")
    input.removeAttribute("aria-invalid")
  }
  if (fieldId) {
    clearFieldErrorMessage(fieldId)
  }
}

function clearBasicInfoValidationState() {
  BASIC_INFO_FIELDS.forEach((field) => {
    const input = document.getElementById(field)
    clearInputValidationState(input, field)
  })
}

function markFieldInvalid(input, message, errors) {
  const fieldId = input?.id
  if (input) {
    input.classList.add("input-invalid")
    input.setAttribute("aria-invalid", "true")
  }
  if (fieldId) {
    if (message) {
      setFieldErrorMessage(fieldId, message)
    } else {
      clearFieldErrorMessage(fieldId)
    }
  }
  if (message) {
    errors.push(message)
  }
}

function validateBasicInfoForm() {
  const inputs = getBasicInfoInputMap()
  const errors = []
  const sanitizedValues = {}
  clearBasicInfoValidationState()

  const sexInput = inputs.sex
  const sexValue = (sexInput?.value || "").trim()
  if (!sexValue || !VALID_SEX_OPTIONS.includes(sexValue)) {
    markFieldInvalid(sexInput, `${BASIC_INFO_LABELS.sex}为必填项`, errors)
  } else {
    sanitizedValues.sex = sexValue
  }

  const ageInput = inputs.age
  const ageValue = (ageInput?.value || "").trim()
  const hasInvalidNumberInput = ageInput && ageInput.validity.badInput

  if (hasInvalidNumberInput || (ageValue && !/^-?\d+$/.test(ageValue))) {
    markFieldInvalid(ageInput, `${BASIC_INFO_LABELS.age}只能填写数字`, errors)
  } else if (!ageValue) {
    markFieldInvalid(ageInput, `${BASIC_INFO_LABELS.age}为必填项`, errors)
  } else if (Number(ageValue) < 0) {
    markFieldInvalid(ageInput, `${BASIC_INFO_LABELS.age}不能小于 0`, errors)
  } else {
    sanitizedValues.age = ageValue
  }

  ;["education", "occupation", "mood"].forEach((field) => {
    const input = inputs[field]
    const value = (input?.value || "").trim()
    if (!value) {
      markFieldInvalid(input, `${BASIC_INFO_LABELS[field]}为必填项`, errors)
    } else {
      sanitizedValues[field] = value
    }
  })

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, values: sanitizedValues }
}

function ensureSessionId() {
  if (!state.sessionId) {
    const restoredSessionId =
      window.SessionManager &&
      typeof window.SessionManager.getSessionId === "function"
        ? window.SessionManager.getSessionId()
        : null
    if (restoredSessionId) {
      state.sessionId = restoredSessionId
    } else {
      const randomPart = Math.random().toString(36).slice(2, 8)
      state.sessionId = `sess_${Date.now().toString(36)}_${randomPart}`
    }
    sessionState.sessionId = state.sessionId
  }
  if (
    window.SessionManager &&
    typeof window.SessionManager.setSessionId === "function" &&
    state.sessionId
  ) {
    window.SessionManager.setSessionId(state.sessionId)
  }
  return state.sessionId
}

function configureSessionPersistence() {
  if (
    !window.SessionManager ||
    typeof window.SessionManager.configure !== "function"
  ) {
    return
  }
  try {
    window.SessionManager.configure({
      getUserId: () => {
        try {
          const userInfo = window.auth?.getUserInfo?.()
          return userInfo?.userId || userInfo?.username || null
        } catch (error) {
          console.warn("[Session] 获取用户信息失败:", error)
          return null
        }
      },
      getSessionId: () => state.sessionId || sessionState.sessionId,
    })
    sessionManagerReady = window.SessionManager.isReady()
    if (sessionManagerReady && state.sessionId) {
      window.SessionManager.setSessionId(state.sessionId)
    }
  } catch (error) {
    console.warn("[Session] SessionManager 配置失败:", error)
  }
}

function showTestLoadingOverlay(message = "正在准备测试环境，请稍候...") {
  if (testLoadingOverlay) {
    // 确保背景为渐变（与黑洞风格一致），防止被其他样式覆盖
    testLoadingOverlay.style.background =
      "linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(30, 58, 138, 0.85) 50%, rgba(0, 0, 0, 0.9) 100%)"
    testLoadingOverlay.style.color = "rgba(255, 255, 255, 0.95)"
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

function hideTestLoadingOverlay(options = {}) {
  const { keepMainHidden = false } = options
  if (testLoadingOverlay) {
    testLoadingOverlay.classList.add("hidden")
    testLoadingOverlay.setAttribute("aria-hidden", "true")
  }
  // 报告检查或其它场景结束后，只要不要求保持隐藏，就恢复 main-content 显示
  if (!keepMainHidden && mainContent) {
    mainContent.style.display = "flex"
  }
}

// 登录后检查报告状态时使用的全屏 Loading 控制
function showReportCheckLoading() {
  isCheckingReportStatus = true

  // 如果欢迎语定时器还没触发，先取消，避免检查期间自动播报
  if (welcomeMessageTimer) {
    clearTimeout(welcomeMessageTimer)
    welcomeMessageTimer = null
  }
  // 如果已经开始播报欢迎语或其他音频，立即停止
  stopAllPlayback()

  // 隐藏左侧信息表单，展示应用窗口，然后显示全屏 loading
  if (infoScreen) {
    infoScreen.style.display = "none"
  }
  if (appWindow) {
    appWindow.style.display = "flex"
  }
  showTestLoadingOverlay("正在检查您的测试报告状态，请稍候...")
}

function hideReportCheckLoading() {
  // 结束检查阶段
  isCheckingReportStatus = false

  // 如果已经进入测试或报告汇总阶段，交由现有逻辑处理主内容区域
  // 如果是页面刷新，先检查快照中的 stage，避免在快照恢复前错误显示介绍页
  let inMainFlow = state.stage === "test" || state.stage === "summary"
  if (pageReloaded && !inMainFlow) {
    // 页面刷新时，检查快照中的 stage，避免在快照恢复前错误显示介绍页
    const snapshot = getStoredSnapshot()
    if (snapshot && canRestoreSnapshot(snapshot)) {
      const payload = snapshot.payload || {}
      const snapshotStage = payload.stage
      if (snapshotStage === "test" || snapshotStage === "summary") {
        inMainFlow = true
      }
    }
  }

  hideTestLoadingOverlay({ keepMainHidden: inMainFlow })

  // 仍在登录后初始阶段：恢复介绍页布局
  if (!inMainFlow) {
    console.log("[hideReportCheckLoading] 恢复介绍页布局")
    if (infoScreen) {
      infoScreen.style.display = "flex"
    }
    if (appWindow) {
      // 这里保持 app-window 可见，用于在右侧展示欢迎内容和语音检测
      appWindow.style.display = "flex"
    }

    // 此时介绍页已经可见，如果允许播报欢迎语，则在检查结束后再播
    if (shouldPlayWelcomeMessage) {
      // 异步调用，避免阻塞 UI
      playWelcomeMessage().catch((error) => {
        console.warn("[欢迎页] 播放欢迎语失败:", error)
      })
    }
  } else {
    console.log("[hideReportCheckLoading] 已在主流程中，不恢复介绍页")
  }
}

function buildSessionSnapshot(reason = "manual") {
  if (!sessionManagerReady || !window.SessionManager) {
    return null
  }
  ensureSessionId()
  const trackerSnapshot =
    window.InteractionTracker &&
    typeof window.InteractionTracker.serialize === "function"
      ? window.InteractionTracker.serialize()
      : null

  const payload = {
    currentIndex: state.currentIndex,
    totalImages: state.totalImages,
    zoom: state.zoom,
    rotation: state.rotation,
    canvasStates: state.canvasStates,
    visitedImages: Array.from(state.visitedImages || []),
    postTestAnswers: state.postTestAnswers,
    stage: state.stage,
    introStep: state.introStep,
    basicInfoDraft: { ...state.basicInfoDraft },
    currentQuestionIndex,
    inactivityLevel: state.inactivityLevel,
    nextButtonCooldown: state.nextButtonCooldown,
    imageCooldowns: { ...state.imageCooldowns },
    isSpeaking: state.isSpeaking,
    sessionVersion: latestSnapshotVersion + 1,
    timestamp: Date.now(),
    tracker: trackerSnapshot,
    tts: {
      inited: TTS.inited,
      currentMode: TTS.currentMode,
      currentPhase: TTS.currentPhase || null,
    },
    audio: {
      hasMediaRecorder: Boolean(state.mediaRecorder),
      recorderState: state.mediaRecorder
        ? state.mediaRecorder.state
        : "inactive",
      hasAudioBlob: Boolean(state.audioBlob),
    },
    ui: {
      controlsVisible: controlsBar.style.display !== "none",
      postViewVisible: postTestView.style.display !== "none",
      summaryVisible: summaryView.style.display !== "none",
      progressText: progressText.textContent,
      preTest: {
        infoScreenVisible: infoScreen.style.display !== "none",
        appWindowVisible: appWindow.style.display !== "none",
        introOverlayVisible: introOverlay.style.display !== "none",
        enterButton: enterBtn
          ? {
              visible: enterBtn.style.display !== "none",
              disabled: enterBtn.disabled,
              text: enterBtn.textContent,
            }
          : null,
      },
    },
    energy:
      window.EnergyPillar && typeof window.EnergyPillar.getEnergy === "function"
        ? window.EnergyPillar.getEnergy()
        : 0,
  }

  sessionState.payload = payload
  sessionState.version = SESSION_VERSION
  sessionState.sessionId = state.sessionId
  sessionState.completed = Boolean(state.completed)
  sessionState.lastTrigger = reason
  sessionState.snapshotVersion = latestSnapshotVersion + 1
  sessionState.updatedAt = Date.now()

  return JSON.parse(JSON.stringify(sessionState))
}

function flushPendingSessionSnapshot(force = false) {
  if (
    !pendingSessionSnapshot ||
    !sessionManagerReady ||
    !window.SessionManager
  ) {
    return
  }

  if (!force) {
    try {
      const latestStored = window.SessionManager.loadSnapshot()
      if (
        latestStored &&
        latestStored.snapshotVersion > latestSnapshotVersion
      ) {
        latestSnapshotVersion = latestStored.snapshotVersion
        state.sessionVersion = latestSnapshotVersion
      }
    } catch (error) {
      console.warn("[Session] 读取最新快照失败:", error)
    }
  }

  if (
    !force &&
    pendingSessionSnapshot.snapshotVersion <= latestSnapshotVersion
  ) {
    pendingSessionSnapshot = null
    return
  }

  const saved = window.SessionManager.saveSnapshot(pendingSessionSnapshot)
  if (saved) {
    latestSnapshotVersion = pendingSessionSnapshot.snapshotVersion
    state.sessionVersion = latestSnapshotVersion
  }
  pendingSessionSnapshot = null
}

function scheduleSessionSave(reason = "manual", immediate = false) {
  if (!sessionManagerReady || !window.SessionManager) {
    return
  }
  const snapshot = buildSessionSnapshot(reason)
  if (!snapshot) {
    return
  }
  pendingSessionSnapshot = snapshot

  if (immediate) {
    flushPendingSessionSnapshot(true)
    return
  }

  clearTimeout(sessionSaveTimer)
  sessionSaveTimer = setTimeout(() => {
    flushPendingSessionSnapshot()
  }, SESSION_SAVE_DEBOUNCE)
}

function saveSessionSnapshot(reason = "manual", options = {}) {
  const { immediate = false } = options || {}
  state.lastSnapshotReason = reason
  scheduleSessionSave(reason, immediate)
}

function loadSessionSnapshot(options = {}) {
  const { snapshot = null, applyState = false } = options || {}
  const targetSnapshot = snapshot || getStoredSnapshot()
  if (!canRestoreSnapshot(targetSnapshot)) {
    return null
  }
  if (applyState) {
    return applySnapshotToState(targetSnapshot) ? targetSnapshot : null
  }
  return targetSnapshot
}

function getStoredSnapshot() {
  if (!sessionManagerReady || !window.SessionManager) {
    return null
  }
  try {
    return window.SessionManager.loadSnapshot()
  } catch (error) {
    console.warn("[Session] 读取快照失败:", error)
    return null
  }
}

function canRestoreSnapshot(snapshot) {
  if (!snapshot || snapshot.completed) {
    return false
  }
  if (snapshot.version && snapshot.version !== SESSION_VERSION) {
    console.warn("[Session] 快照版本不匹配，忽略恢复")
    return false
  }
  return Boolean(snapshot.payload)
}

function applySnapshotToState(snapshot) {
  if (!canRestoreSnapshot(snapshot)) {
    return false
  }
  const payload = snapshot.payload || {}
  latestSnapshotVersion = snapshot.snapshotVersion || latestSnapshotVersion

  state.sessionId = snapshot.sessionId || state.sessionId
  sessionState.sessionId = state.sessionId
  if (
    window.SessionManager &&
    typeof window.SessionManager.setSessionId === "function" &&
    state.sessionId
  ) {
    window.SessionManager.setSessionId(state.sessionId)
  }

  state.currentIndex = payload.currentIndex ?? 0
  state.zoom = payload.zoom ?? 1
  state.rotation = payload.rotation ?? 0
  state.canvasStates =
    Array.isArray(payload.canvasStates) &&
    payload.canvasStates.length === state.totalImages
      ? payload.canvasStates
      : new Array(state.totalImages).fill(null)
  state.visitedImages = new Set(
    Array.isArray(payload.visitedImages) ? payload.visitedImages : []
  )
  state.visitedImages.add(state.currentIndex)
  state.postTestAnswers = payload.postTestAnswers || {}
  const restoredIntroStep = payload.introStep
  if (restoredIntroStep && INTRO_STEP_VALUES.includes(restoredIntroStep)) {
    state.introStep = restoredIntroStep
  } else {
    state.introStep = INTRO_STEPS.INFO_FORM
  }
  state.basicInfoDraft = {
    ...getEmptyBasicInfoDraft(),
    ...(payload.basicInfoDraft || {}),
  }
  applyBasicInfoDraftToInputs()
  state.stage = payload.stage || "test"
  currentQuestionIndex =
    payload.currentQuestionIndex ?? payload.questionIndex ?? 0
  state.inactivityLevel = payload.inactivityLevel || 0
  state.nextButtonCooldown = payload.nextButtonCooldown || 0
  state.imageCooldowns = payload.imageCooldowns || {}
  // isSpeaking 是实时状态，不应该从快照恢复，应该重置为 false
  state.isSpeaking = false
  state.sessionVersion = latestSnapshotVersion
  state.completed = Boolean(snapshot.completed)

  // 尝试恢复 TTS 阶段信息（仅用于调试和日志，不强制依赖）
  if (snapshot.payload?.tts) {
    const ttsPayload = snapshot.payload.tts
    TTS.inited = Boolean(ttsPayload.inited)
    TTS.currentMode = ttsPayload.currentMode || null
    TTS.currentPhase = ttsPayload.currentPhase || null
  } else {
    TTS.inited = false
    TTS.currentMode = null
    TTS.currentPhase = null
  }

  return true
}

function disableWelcomeMessagePlayback() {
  shouldPlayWelcomeMessage = false
  if (welcomeMessageTimer) {
    clearTimeout(welcomeMessageTimer)
    welcomeMessageTimer = null
  }
  stopAllPlayback()
}

// 开发环境：自动填充默认基本信息并启动测试
async function autoStartTestInDev() {
  // 检查是否应该自动启动（仅在开发环境且配置为跳过介绍页时）
  if (isProduction || !DEV_CONFIG?.skipIntroInDev) {
    console.log("[开发环境] 自动启动已禁用（skipIntroInDev = false）")
    return
  }

  console.log("[开发环境] 自动填充默认基本信息并启动测试")

  // 重置实时状态，确保不会因为之前的状态影响新测试
  state.isSpeaking = false
  state.inactivityLevel = 0

  // 填充默认基本信息（使用 DEV_CONFIG 中的配置）
  const defaultDraft = DEV_CONFIG?.defaultBasicInfo || {
    sex: "男",
    age: "25",
    education: "本科",
    occupation: "工程师",
    mood: "平静",
  }
  state.basicInfoDraft = { ...getEmptyBasicInfoDraft(), ...defaultDraft }
  applyBasicInfoDraftToInputs()

  // 验证并获取用户信息
  const validation = validateBasicInfoForm()
  if (!validation.valid) {
    console.warn("[开发环境] 基本信息验证失败:", validation.errors)
    return
  }
  fetchUserInfo(validation.values)

  // 隐藏信息表单，显示测试窗口
  // 注意：不要提前移除 intro-mode 类，让 prepareIntroExperience() 根据配置来控制
  infoScreen.style.display = "none"
  appWindow.style.display = "flex"
  // 不在这里移除 intro-mode，让 prepareIntroExperience() 根据配置决定
  hideWelcomeText()

  // 调用 prepareIntroExperience，它会根据配置决定是否跳过介绍页面
  try {
    await prepareIntroExperience()
  } catch (err) {
    console.error("[开发环境] 自动启动测试失败:", err)
  }
}

function showResumeOptionIfAvailable(autoResume = false) {
  const snapshot = loadSessionSnapshot()
  if (!resumeTestBtn) {
    applyBasicInfoDraftToInputs()
    // 开发环境：如果没有快照，且配置为跳过介绍页，自动跳过信息表单页面
    if (!snapshot && !isProduction && DEV_CONFIG?.skipIntroInDev) {
      setTimeout(() => {
        autoStartTestInDev()
      }, 100)
    }
    return
  }
  if (!snapshot) {
    resumeTestBtn.style.display = "none"
    resumeTestBtn.disabled = false
    applyBasicInfoDraftToInputs()
    // 开发环境：如果没有快照，且配置为跳过介绍页，自动跳过信息表单页面
    if (!isProduction && DEV_CONFIG?.skipIntroInDev) {
      setTimeout(() => {
        autoStartTestInDev()
      }, 100)
    }
    return
  }

  restoreSnapshotCache = snapshot
  const payload = snapshot.payload || {}

  // 如果配置为不跳过介绍页，且快照中的 introStep 是 TEST，则重置为 INFO_FORM
  // 这样可以强制重新显示介绍页
  let restoredIntroStep = INTRO_STEP_VALUES.includes(payload.introStep)
    ? payload.introStep
    : INTRO_STEPS.INFO_FORM

  if (
    !isProduction &&
    !DEV_CONFIG.skipIntroInDev &&
    restoredIntroStep === INTRO_STEPS.TEST
  ) {
    console.log(
      "[配置检查] 检测到快照中 introStep 为 TEST，但配置为不跳过，重置为 INFO_FORM"
    )
    restoredIntroStep = INTRO_STEPS.INFO_FORM
  }

  state.introStep = restoredIntroStep

  state.basicInfoDraft = {
    ...getEmptyBasicInfoDraft(),
    ...(payload.basicInfoDraft || {}),
  }
  applyBasicInfoDraftToInputs()

  const restoredStage = payload.stage || "intro"

  if (restoredStage === "intro" && restoredIntroStep !== INTRO_STEPS.TEST) {
    if (restoredIntroStep === INTRO_STEPS.INTRO_OVERLAY) {
      resumeTestBtn.style.display = "block"
      resumeTestBtn.disabled = false
      resumeTestBtn.textContent = "继续语音引导"

      if (autoResume && !restoringFromSnapshot && !introResumeInProgress) {
        disableWelcomeMessagePlayback()
        resumeTestBtn.disabled = true
        resumeTestBtn.textContent = "恢复中..."
        resumeTestFromSnapshot(snapshot)
      }
    } else {
      resumeTestBtn.style.display = "none"
      resumeTestBtn.disabled = false
    }
    return
  }

  resumeTestBtn.style.display = "block"
  resumeTestBtn.disabled = false
  resumeTestBtn.textContent = "恢复未完成测试"

  if (autoResume && !restoringFromSnapshot) {
    disableWelcomeMessagePlayback()
    resumeTestBtn.disabled = true
    resumeTestBtn.textContent = "恢复中..."
    resumeTestFromSnapshot(snapshot)
  }
}

async function resumeTestFromSnapshot(snapshot = null) {
  if (restoringFromSnapshot || introResumeInProgress) {
    return
  }
  disableWelcomeMessagePlayback()
  const targetSnapshot = loadSessionSnapshot({
    snapshot: snapshot || restoreSnapshotCache,
    applyState: true,
  })
  if (!targetSnapshot) {
    console.warn("[Session] 没有可恢复的快照")
    return
  }
  restoreSnapshotCache = targetSnapshot

  const payload = targetSnapshot.payload || {}
  const restoredStage = payload.stage || state.stage || "intro"
  const restoredIntroStep = INTRO_STEP_VALUES.includes(payload.introStep)
    ? payload.introStep
    : state.introStep || INTRO_STEPS.INFO_FORM

  if (restoredStage === "intro" && restoredIntroStep !== INTRO_STEPS.TEST) {
    if (restoredIntroStep === INTRO_STEPS.INTRO_OVERLAY) {
      await resumeIntroExperienceFromSnapshot(targetSnapshot)
    } else {
      if (resumeTestBtn) {
        resumeTestBtn.style.display = "none"
        resumeTestBtn.disabled = false
        resumeTestBtn.textContent = "恢复未完成测试"
      }
      infoScreen.style.display = "flex"
      appWindow.style.display = "none"
    }
    return
  }

  try {
    restoringFromSnapshot = true
    infoScreen.style.display = "none"
    appWindow.style.display = "flex"
    showTestLoadingOverlay("正在恢复上一张图版，请稍候...")
    hideWelcomeText()
    introOverlay.style.display = "none"
    enterBtn.style.display = "none"

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    initAudio(stream)

    await enterTestExperience({
      skipOpeningSpeech: true,
      restoredSnapshot: targetSnapshot,
    })

    resumeTestBtn.style.display = "none"
    saveSessionSnapshot("resume", { immediate: true })
  } catch (error) {
    console.error("[Session] 恢复测试失败:", error)
    if (resumeTestBtn) {
      resumeTestBtn.disabled = false
      resumeTestBtn.textContent = "恢复未完成测试"
    }
    alert("恢复测试失败，请重新开始。")
  } finally {
    hideTestLoadingOverlay({ keepMainHidden: true })
    restoringFromSnapshot = false
  }
}

async function resumeIntroExperienceFromSnapshot(snapshot) {
  if (introResumeInProgress) {
    return
  }
  introResumeInProgress = true
  try {
    if (resumeTestBtn) {
      resumeTestBtn.disabled = true
    }
    await prepareIntroExperience({ resume: true })
    if (resumeTestBtn) {
      resumeTestBtn.style.display = "none"
    }
    saveSessionSnapshot("intro_resume", { immediate: true })
  } catch (error) {
    console.error("[Session] 恢复语音引导失败:", error)
    alert("恢复语音引导失败，请重新开始。")
    if (resumeTestBtn) {
      resumeTestBtn.disabled = false
      resumeTestBtn.textContent = "继续语音引导"
    }
  } finally {
    introResumeInProgress = false
  }
}

function ensureDeviceCheckCompleted() {
  if (isDeviceCheckReady()) {
    return true
  }
  if (deviceCheckContainer) {
    deviceCheckContainer.dataset.status = "error"
    const resultEl = deviceCheckContainer.querySelector(
      '[data-role="device-check-result"]'
    )
    if (resultEl) {
      resultEl.textContent = "请先完成设备检测"
    }
    deviceCheckContainer.classList.remove("device-check-alert")
    // 触发一次重排以便重新应用动画
    void deviceCheckContainer.offsetWidth
    deviceCheckContainer.classList.add("device-check-alert")
  }
  if (deviceCheckTip) {
    deviceCheckTip.textContent = "请先完成语音播放与麦克风检测"
  }
  return false
}

// 启动测试
async function startTest() {
  if (!ensureDeviceCheckCompleted()) {
    return
  }
  const validation = validateBasicInfoForm()
  if (!validation.valid) {
    return
  }
  fetchUserInfo(validation.values)
  try {
    await prepareIntroExperience()
  } catch (err) {
    console.error("麦克风授权失败:", err)
    alert("需要麦克风权限才能开始测试。请刷新页面并允许访问。")
  }
}

async function prepareIntroExperience({ resume = false } = {}) {
  console.log("[prepareIntroExperience] 开始执行，resume:", resume)
  console.log(
    "[prepareIntroExperience] DEV_CONFIG 是否存在:",
    typeof DEV_CONFIG !== "undefined"
  )
  console.log("[prepareIntroExperience] DEV_CONFIG 内容:", DEV_CONFIG)
  console.log("[prepareIntroExperience] isProduction:", isProduction)
  console.log(
    "[prepareIntroExperience] skipIntroInDev 值:",
    DEV_CONFIG?.skipIntroInDev
  )

  disableWelcomeMessagePlayback()
  stopAllPlayback()
  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    initAudio(stream)
  } catch (err) {
    console.error("麦克风授权失败:", err)
    throw err
  }

  // 根据配置决定是否跳过介绍页面和预览窗口（仅在开发环境生效）
  const shouldSkip =
    !isProduction && DEV_CONFIG && DEV_CONFIG.skipIntroInDev === true
  console.log(
    "[配置检查] 判断条件: !isProduction =",
    !isProduction,
    ", DEV_CONFIG =",
    DEV_CONFIG,
    ", skipIntroInDev =",
    DEV_CONFIG?.skipIntroInDev,
    ", shouldSkip =",
    shouldSkip
  )
  if (shouldSkip) {
    console.log("[开发环境] 跳过介绍页面和预览窗口，直接进入测试")
    // 确保窗口已显示
    infoScreen.style.display = "none"
    appWindow.style.display = "flex"
    appWindow.classList.remove("intro-mode")
    hideWelcomeText()

    // 初始化 TTS（必要的）
    try {
      if (window.dialogClient && window.dialogClient.isConnected) {
        window.dialogClient.disconnect()
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      await ensureTTSInit("audio")
    } catch (e) {
      console.warn("[开发环境] TTS 初始化失败，已忽略：", e)
    }

    // 重置实时状态，确保不会因为之前的状态影响新测试
    state.isSpeaking = false
    state.inactivityLevel = 0

    // 设置状态并直接进入测试
    state.introStep = INTRO_STEPS.TEST
    saveSessionSnapshot("intro_step", { immediate: true })

    // 直接进入测试体验
    await enterTestExperience({ skipOpeningSpeech: true })
    return
  }

  // 正常显示介绍页面和预览窗口（生产环境或开发环境配置为不跳过时）
  console.log("[正常流程] 显示介绍页面和预览窗口")
  console.log("[正常流程] introOverlay 元素:", introOverlay)
  // 确保窗口已显示（可能已经在 autoStartTestInDev 中设置了）
  if (infoScreen.style.display !== "none") {
    infoScreen.style.display = "none"
  }
  if (appWindow.style.display !== "flex") {
    appWindow.style.display = "flex"
  }
  appWindow.classList.add("intro-mode")

  // 初始化黑洞粒子背景（介绍页和预览窗口页显示背景）
  const bgInitSuccess = initBlackHoleBackground({
    themeIndex: 0,
    logPrefix: "[介绍页]",
  })

  if (!bgInitSuccess) {
    // 如果 BlackHoleBackground 还未加载，延迟重试
    console.warn("[介绍页] BlackHoleBackground 未加载，延迟初始化")
    setTimeout(() => {
      initBackgroundForIntro()
    }, 200)
  }

  // 移除 test-mode 类，恢复非测试模式样式
  document.body.classList.remove("test-mode")

  // 隐藏能量柱容器
  const energyPillarContainer = document.getElementById(
    "energy-pillar-container"
  )
  if (energyPillarContainer) {
    energyPillarContainer.style.display = "none"
    energyPillarContainer.classList.remove("visible")
  }

  // 隐藏测试页的图片容器（介绍页和预览窗口页不显示）
  const imageContainer = document.getElementById("image-container")
  if (imageContainer) {
    imageContainer.style.display = "none"
    console.log("[介绍页] image-container 已隐藏")
  }

  console.log(
    "[正常流程] 已添加 intro-mode 类，appWindow.classList:",
    appWindow.classList.toString()
  )
  hideWelcomeText()
  // 格式化文字为段落，添加样式
  const formattedText = INTRO_TEXT.split(/\n+/)
    .filter((line) => line.trim())
    .map((line) => `<p>${line.trim()}</p>`)
    .join("")
  introText.innerHTML = formattedText
  if (introOverlay) {
    introOverlay.style.display = "flex"
    console.log("[正常流程] 已设置 introOverlay.style.display = 'flex'")
    console.log(
      "[正常流程] introOverlay.style.display 实际值:",
      introOverlay.style.display
    )
  } else {
    console.error("[正常流程] 错误：introOverlay 元素不存在！")
  }
  showIntroImage()

  state.introStep = INTRO_STEPS.INTRO_OVERLAY
  saveSessionSnapshot("intro_step", { immediate: true })

  try {
    if (window.dialogClient && window.dialogClient.isConnected) {
      console.log("[介绍页] 主动断开现有连接，准备重新连接")
      window.dialogClient.disconnect()
      // 等待连接完全关闭
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    // 重新连接并初始化（此时仍在用户交互上下文中，phase 为测试前）
    TTS.currentPhase = "pretest"
    await ensureTTSInit("audio", "pretest")

    // 此时仍在用户点击"开始测试"的交互上下文中
    if (window.dialogClient) {
      // 如果 audioContext 不存在，提前创建它（使用与 playQueue 相同的配置）
      if (!window.dialogClient.audioContext) {
        const sampleRate =
          window.dialogClient.config?.outputAudio?.sampleRate || 24000
        window.dialogClient.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)({
          sampleRate: sampleRate,
        })
        window.dialogClient.nextPlayTime =
          window.dialogClient.audioContext.currentTime
        console.log("[介绍页] 提前创建音频上下文，采样率:", sampleRate)
      }

      // 如果 audioContext 处于 suspended 状态，立即恢复（利用用户交互时机）
      if (window.dialogClient.audioContext.state === "suspended") {
        try {
          await window.dialogClient.audioContext.resume()
          console.log(
            "[介绍页] 音频上下文已恢复，状态:",
            window.dialogClient.audioContext.state
          )
        } catch (e) {
          console.warn("[介绍页] AudioContext resume 失败:", e)
        }
      } else {
        console.log(
          "[介绍页] 音频上下文状态:",
          window.dialogClient.audioContext.state
        )
      }
    }

    // 发送消息后，再次检查并恢复音频上下文（防止在发送过程中状态变化）
    // 使用 setTimeout 确保在音频数据开始到达时检查
    setTimeout(async () => {
      if (window.dialogClient && window.dialogClient.audioContext) {
        if (window.dialogClient.audioContext.state === "suspended") {
          try {
            await window.dialogClient.audioContext.resume()
            console.log("[介绍页] 音频上下文已恢复（延迟检查）")
          } catch (e) {
            console.warn("[介绍页] AudioContext resume 失败（延迟检查）:", e)
          }
        }
      }
    }, 250)
  } catch (e) {
    console.warn("[启动页介绍] 初始化失败，已忽略：", e)
  }

  // 显示"进入"按钮，但在操作反应测试完成前禁用
  enterBtn.style.display = "block"
  enterBtn.disabled = true
  enterBtn.textContent = "进入"

  // 设置"进入"按钮的点击事件（只在操作反应测试完成后才可点击）
  const handleEnterClick = () => {
    if (!enterBtn.disabled) {
      enterBtn.removeEventListener("click", handleEnterClick)
      enterTestExperience()
    }
  }
  enterBtn.addEventListener("click", handleEnterClick)

  // 先初始化预览窗口交互，确保画布和previewActions已初始化
  initPreviewCanvasInteractions()

  // 立即初始化预览窗口按钮，确保按钮在操作反应测试期间可用
  initPreviewControlButtons()

  // 等待一小段时间，确保按钮已完全初始化
  await new Promise((resolve) => setTimeout(resolve, 100))
  // startIntroGuide()
  // 自动开始操作反应测试（包含第一段播报、6个操作步骤、第二段播报）
  try {
    // 执行操作反应测试
    await startOperationReactionTest(() => {
      // 测试完成后，重新初始化预览窗口按钮（确保按钮状态正确）
      initPreviewControlButtons()
      // 第二段播报完成后，启用"进入"按钮，等待用户点击
      // 使用 requestAnimationFrame 确保 DOM 更新
      requestAnimationFrame(() => {
        if (enterBtn) {
          enterBtn.disabled = false
          enterBtn.textContent = "进入"
          console.log("[操作反应测试] 第二段播报完成，进入按钮已启用")
        } else {
          console.error("[操作反应测试] enterBtn 未找到")
        }
      })
    })
  } catch (error) {
    console.error("[进入测试] 操作反应测试失败:", error)
    // 即使测试失败，也重新初始化按钮并允许进入测试
    initPreviewControlButtons()
    enterBtn.disabled = false
    enterBtn.textContent = "进入"
  }
}

async function enterTestExperience({
  skipOpeningSpeech = false,
  restoredSnapshot = null,
} = {}) {
  destroyIntroGuide()
  try {
    showTestLoadingOverlay(
      skipOpeningSpeech
        ? "正在恢复测试进度，请稍候..."
        : "正在准备测试环境，请稍候..."
    )
    if (enterBtn) {
      enterBtn.disabled = true
      enterBtn.textContent = skipOpeningSpeech ? "恢复中..." : "连接中..."
    }

    if (window.AudioRecorder) {
      window.AudioRecorder.start()
      console.log("[测试] 音频录制器已启动")
    }

    if (window.dialogClient) {
      window.dialogClient.disconnect()
      await new Promise((resolve) => setTimeout(resolve, 100))

      let retryCount = 0
      const maxRetries = 3
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )

      while (retryCount < maxRetries) {
        try {
          // 测试阶段初始为第一张图，使用 intest1 phase
          TTS.currentPhase = "intest1"
          await ensureTTSInit("audio", "intest1")
          break
        } catch (error) {
          retryCount++
          console.warn(
            `[连接重试] 第 ${retryCount}/${maxRetries} 次尝试失败:`,
            error
          )
          if (retryCount >= maxRetries) {
            throw error
          }
          const retryDelay = isMobile ? 2000 : 1000
          await new Promise((resolve) => setTimeout(resolve, retryDelay))
        }
      }

      if (window.dialogClient.ws) {
        try {
          window.dialogClient.ws.binaryType = "arraybuffer"
        } catch (e) {
          console.warn("binaryType 设置失败:", e)
        }
      }
      if (
        window.dialogClient.audioContext &&
        window.dialogClient.audioContext.state === "suspended"
      ) {
        try {
          await window.dialogClient.audioContext.resume()
        } catch (e) {
          console.warn("AudioContext resume 失败:", e)
        }
      }
      try {
        await window.dialogClient.startRecording()
      } catch (err) {
        console.warn("开始录音失败:", err)
      }

      // 启动混合录音（同时录制 TTS 和麦克风）
      try {
        await window.dialogClient.startMixedRecording()
        console.log("[测试] 混合录音已启动")
      } catch (err) {
        console.warn("启动混合录音失败:", err)
      }

      if (!skipOpeningSpeech) {
        try {
          console.log("[进入测试页] 发送开场白")
          const openingText = "这是第一张墨迹图片，你可以看到一些什么？"
          const introQuery = buildTTSQuery(openingText)
          await sendTextQuery(introQuery, { ensure: false })
          console.log("[进入测试页] 开场白已发送")
        } catch (err) {
          console.warn("发送开场白失败:", err)
        }
      }
    }

    introOverlay.style.display = "none"
    appWindow.classList.remove("intro-mode")

    // 显示测试页的图片容器
    const imageContainer = document.getElementById("image-container")
    if (imageContainer) {
      imageContainer.style.display = "flex"
      console.log("[进入测试] image-container 已显示")
    }

    const shouldShowControls =
      state.stage !== "post" && state.stage !== "summary"
    if (shouldShowControls) {
      controlsBar.style.display = "flex"
      // 显示字幕
      if (window.subtitleManager) {
        window.subtitleManager.show()
      }
    }

    if (!["post", "summary"].includes(state.stage)) {
      const previousStage = state.stage
      state.stage = "test"
      state.introStep = INTRO_STEPS.TEST
      if (previousStage !== "test") {
        saveSessionSnapshot("stage_change", { immediate: true })
      }
    }
    updateProgress()

    if (state.mediaRecorder && state.mediaRecorder.state === "inactive") {
      state.mediaRecorder.start()
    }

    if (window.InteractionTracker && state.stage === "test") {
      window.InteractionTracker.start()
    }

    initTest(restoredSnapshot)
    hideTestLoadingOverlay()
  } catch (error) {
    console.error("连接 WebSocket 失败:", error)
    hideTestLoadingOverlay({ keepMainHidden: true })

    let errorMessage = "连接语音服务失败。"
    if (error.isTimeout) {
      errorMessage = "连接超时，请检查网络连接。"
    } else if (error.message) {
      errorMessage = `连接失败: ${error.message}`
    }

    if (error.isMobile) {
      errorMessage +=
        "\n\n提示：移动端连接可能需要更长时间，请确保：\n1. 网络连接正常\n2. 已允许浏览器访问网络\n3. 尝试切换到 WiFi 网络"
    } else {
      errorMessage += "\n\n请检查后端服务器是否已启动。"
    }

    alert(errorMessage)
    if (enterBtn) {
      enterBtn.disabled = false
      enterBtn.textContent = "进入"
    }
    throw error
  }
}

// 暴露 enterTestExperience 到全局，供测试按钮使用
window.enterTestExperience = enterTestExperience

function fetchUserInfo(validatedValues = null) {
  const draft = validatedValues
    ? { ...validatedValues }
    : syncBasicInfoDraftFromInputs()
  state.basicInfoDraft = {
    ...state.basicInfoDraft,
    ...draft,
  }

  const basicInfo = {
    性别: draft.sex,
    年龄: draft.age,
    学历: draft.education,
    职业: draft.occupation,
    当前心情: draft.mood,
    测试时间: formatDateTime(),
  }
  const userInfo = window.auth.getUserInfo()
  state.basicInfo = basicInfo
  state.userInfo = userInfo
  saveSessionSnapshot("basic_info")
  window.API.setBasicInfo(userInfo.username, basicInfo)
}

function initTest(restoredSnapshot = null) {
  const trackerSnapshot = restoredSnapshot?.payload?.tracker
  const isRestored = Boolean(restoredSnapshot)

  if (window.InteractionTracker) {
    window.InteractionTracker.init({
      autoTrack: true,
      trackZoom: true,
      trackRotate: true,
      trackDrawing: true,
      trackNavigation: true,
      includeTimestamp: false,
    })
    if (
      trackerSnapshot &&
      typeof window.InteractionTracker.restore === "function"
    ) {
      window.InteractionTracker.restore(trackerSnapshot)
    }
    window.InteractionTracker._updateCurrentPlate(state.currentIndex)
  }

  // 初始化黑洞粒子背景（仅在测试阶段显示）
  // 测试阶段强制重新初始化，确保背景正确显示
  initBlackHoleBackground({
    themeIndex: 0,
    forceInit: true,
    logPrefix: "[测试页]",
  })

  // 添加 test-mode 类，切换样式为测试模式
  document.body.classList.add("test-mode")

  // 显示能量柱容器（测试阶段显示）
  const energyPillarContainer = document.getElementById(
    "energy-pillar-container"
  )
  if (energyPillarContainer) {
    energyPillarContainer.style.display = "block"
    energyPillarContainer.classList.add("visible")
  }

  // 恢复能量值（如果有快照）
  if (isRestored && restoredSnapshot?.payload?.energy !== undefined) {
    const savedEnergy = restoredSnapshot.payload.energy
    if (
      window.EnergyPillar &&
      typeof window.EnergyPillar.setEnergy === "function"
    ) {
      window.EnergyPillar.setEnergy(savedEnergy)
      console.log("[恢复快照] 能量值已恢复:", savedEnergy)
    }
  }

  setupEventListeners()

  if (state.stage === "post") {
    showPostTestView({ restoredSnapshot })
    return
  }

  if (state.stage === "summary") {
    showSummary()
    return
  }

  // 确保测试页的图片容器显示（测试阶段）
  const imageContainer = document.getElementById("image-container")
  if (imageContainer) {
    imageContainer.style.display = "flex"
    console.log("[initTest] image-container 已显示")
  }

  // 初始化或重置图片平移状态
  panOffsetX = 0
  panOffsetY = 0
  loadImage(state.currentIndex)
  if (isRestored) {
    updateTransform({ zoom: state.zoom, rotation: state.rotation }, true)
  }
  updateNavButtons()

  if (!isRestored && state.currentIndex === 0) {
    disableNextButton()
  } else if (isRestored) {
    // 优先恢复保存的冷却时间（如果存在）
    if (state.imageCooldowns[state.currentIndex] !== undefined) {
      const savedCooldown = state.imageCooldowns[state.currentIndex]
      disableNextButton(savedCooldown, true)
      // 清除保存的冷却时间（避免重复恢复）
      delete state.imageCooldowns[state.currentIndex]
    } else if (state.nextButtonCooldown > 0) {
      disableNextButton(state.nextButtonCooldown, true)
    }
  }

  const resizeObserver = new ResizeObserver(() => {
    if (rorschachImage.complete && rorschachImage.naturalWidth > 0) {
      resizeCanvas()
      loadCanvasState(state.currentIndex)
    }
  })
  resizeObserver.observe(rorschachImage)

  if (rorschachImage.complete && rorschachImage.naturalWidth > 0) {
    resizeCanvas()
    loadCanvasState(state.currentIndex)
  }

  // 初始化图片平移交互（只需初始化一次）
  if (!imagePanController) {
    const imageContainer = document.getElementById("image-container")
    if (rorschachImage && imageContainer) {
      const getPanOffset = () => ({ x: panOffsetX, y: panOffsetY })
      const setPanOffset = ({ x, y }) => {
        panOffsetX = typeof x === "number" ? x : 0
        panOffsetY = typeof y === "number" ? y : 0
        updateTransform(
          {
            zoom: state.zoom,
            rotation: state.rotation,
            offsetX: panOffsetX,
            offsetY: panOffsetY,
          },
          true
        )
      }

      imagePanController = initImagePan({
        imageElement: rorschachImage,
        containerElement: imageContainer,
        getZoom: () => state.zoom,
        getCurrentTool: () => state.tool,
        getPanOffset,
        setPanOffset,
        canStartPan: () => hasInteractedWithZoom,
      })
    }
  }

  if (state.stage === "test") {
    startInactivityMonitoring()
  }
}

function resizeCanvas() {
  canvas.width = rorschachImage.clientWidth
  canvas.height = rorschachImage.clientHeight
  canvas.style.width = rorschachImage.clientWidth + "px"
  canvas.style.height = rorschachImage.clientHeight + "px"
  // 保存图版尺寸到 state
  if (rorschachImage.clientHeight > 0 && rorschachImage.clientWidth > 0) {
    state.canvasSize = [rorschachImage.clientHeight, rorschachImage.clientWidth]
  }
}

// 音频和语音检测
function initAudio(stream) {
  state.mediaRecorder = new MediaRecorder(stream)
  state.mediaRecorder.ondataavailable = (event) =>
    state.audioChunks.push(event.data)

  state.mediaRecorder.onstop = () => {
    const audioBlob = new Blob(state.audioChunks, { type: "audio/webm" })

    // 保存音频Blob到state，供finishAndSave使用
    state.audioBlob = audioBlob

    // 注释掉自动下载webm文件的逻辑
    /*
        const audioUrl = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = audioUrl;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `rorschach_recording_${timestamp}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(audioUrl);
        */
    state.audioChunks = []
  }

  // 优化：降低前端语音检测敏感度，提高阈值以减少误判
  // 前端检测仅用于不活动监控，真正的语音检测由后端豆包VAD处理
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 512
  analyser.smoothingTimeConstant = 0.8 // 增加平滑，减少波动
  const source = audioContext.createMediaStreamSource(stream)
  source.connect(analyser)
  const dataArray = new Uint8Array(analyser.frequencyBinCount)

  // 使用更保守、带自适应基线的检测逻辑，避免在无语音时被环境噪音误判
  let speakingCount = 0 // 连续检测到语音的帧数
  let baselineNoise = 0 // 环境噪音基线
  let baselineSamples = 0 // 已采样的基线帧数
  const MAX_BASELINE_SAMPLES = 120 // 约2秒（60fps）采样，用来估计环境噪音
  const MIN_SPEAKING_FRAMES = 5 // 需要连续多帧才认为在说话，减少瞬时噪音影响

  function getDynamicThreshold() {
    // 动态阈值 = 噪音基线 + 15，且至少为 35，避免过低
    const base = baselineSamples > 0 ? baselineNoise : 20
    return Math.max(35, base + 15)
  }

  function updateBaseline(average) {
    // 只在未判定为说话时、且采样数量未达上限时更新基线
    if (!state.isSpeaking && baselineSamples < MAX_BASELINE_SAMPLES) {
      baselineNoise =
        (baselineNoise * baselineSamples + average) / (baselineSamples + 1)
      baselineSamples++
    }
  }

  function checkSpeaking() {
    analyser.getByteFrequencyData(dataArray)
    let sum = dataArray.reduce((a, b) => a + b, 0)
    const average = sum / dataArray.length

    // 更新环境噪音基线（仅在非说话状态下）
    updateBaseline(average)

    const SPEAKING_THRESHOLD = getDynamicThreshold()

    // 使用更保守、基于动态阈值的检测逻辑
    if (average > SPEAKING_THRESHOLD) {
      speakingCount++
      // 只有连续检测到语音才认为在说话
      if (speakingCount >= MIN_SPEAKING_FRAMES) {
        state.isSpeaking = true
        resetInactivityTimer()
      }
    } else {
      speakingCount = 0
      // 延迟清除状态，避免短暂停顿误判
      if (state.isSpeaking) {
        setTimeout(() => {
          if (speakingCount === 0) {
            state.isSpeaking = false
          }
        }, 200)
      }
    }
    requestAnimationFrame(checkSpeaking)
  }
  checkSpeaking()
}

async function playAudio(src, onendedCallback = null, options = {}) {
  if (
    typeof src === "string" &&
    (src.startsWith("./audio/") || src.startsWith("audio/"))
  ) {
    audioPlayer.src = src
    audioPlayer.onended = onendedCallback
    audioPlayer.play().catch((e) => console.error("音频播放失败:", e))
    return
  }

  // 否则使用实时对话客户端发送文本查询
  if (window.dialogClient) {
    try {
      if (!window.dialogClient.isConnected || TTS.currentMode !== "audio") {
        await ensureTTSInit("audio")
      }
      // 确保已连接
      if (!window.dialogClient.isConnected) {
        await window.dialogClient.connect()
      }

      // 实际发送 TTS 文本进行播报
      const ttsQuery = buildTTSQuery(src)
      await sendTextQuery(ttsQuery, { ensure: false })
      console.log("[播放音频] TTS 文本已发送:", src)

      // 由于实时对话是流式播放，无法准确判断播放完成时间
      // 根据文本长度估算播放时间（平均语速约 3-4 字/秒）
      if (onendedCallback) {
        const estimatedDuration = Math.max(2000, src.length * 250) // 至少 2 秒，每字约 300ms
        setTimeout(() => {
          if (onendedCallback) {
            onendedCallback()
          }
        }, estimatedDuration)
      }
    } catch (error) {
      console.error("[播放音频] 实时对话失败:", error)
      // 错误处理：显示文本或使用其他降级方案
      if (options.onError) {
        options.onError(error)
      } else {
        // 降级方案：显示文本内容
        console.warn("[播放音频] 无法播放，文本内容:", src)
      }
    }
  } else {
    console.warn("[播放音频] 实时对话客户端未加载，无法播放文本:", src)
    if (options.onError) {
      options.onError(new Error("实时对话客户端未加载"))
    }
  }
}

// 暴露 playAudio 到全局，供其他模块使用
window.playAudio = playAudio

// 优化的不活动逻辑
// 优化：添加AI播放状态检测，避免在AI说话时触发提示
function isAIPlaying() {
  // 检查dialogClient是否正在播放音频
  if (window.dialogClient && window.dialogClient.isPlaying) {
    return true
  }
  // 检查audioPlayer是否正在播放
  if (audioPlayer && !audioPlayer.paused) {
    return true
  }
  return false
}

function playRandomPrompt() {
  if (isAIPlaying()) {
    console.log("[不活动提示] AI正在播放，延迟重试")
    resetInactivityTimer()
    return
  }

  if (state.isSpeaking) {
    console.log("[不活动提示] 用户正在说话，延迟重试")
    resetInactivityTimer()
    return
  }

  if (state.inactivityLevel === 0) {
    // 第一次提示：使用TTS播放智能选择的提示文本（根据当前图片索引）
    const promptText = getRandomPromptText(state.currentIndex)
    console.log(
      "[不活动提示] 播放第一次提示，图片索引:",
      state.currentIndex,
      "提示文本:",
      promptText
    )
    showPromptIndicator(promptText)
    playAudio(
      promptText,
      () => {
        console.log("[不活动提示] 第一次提示播放完成")
        state.inactivityLevel = 1
        resetInactivityTimer()
      },
      {
        onError: (error) => {
          console.error("[不活动提示] 第一次提示播放失败:", error)
          // 即使播放失败，也更新状态，避免卡住
          state.inactivityLevel = 1
          resetInactivityTimer()
        },
      }
    )
  } else if (state.inactivityLevel === 1) {
    // 第二次提示：使用TTS播放最终提示文本
    console.log("[不活动提示] 播放第二次提示，提示文本:", FINAL_PROMPT_TEXT)
    showPromptIndicator(FINAL_PROMPT_TEXT)
    playAudio(
      FINAL_PROMPT_TEXT,
      () => {
        console.log("[不活动提示] 第二次提示播放完成")
        state.inactivityLevel = 0
        resetInactivityTimer()
      },
      {
        onError: (error) => {
          console.error("[不活动提示] 第二次提示播放失败:", error)
          // 即使播放失败，也重置状态
          state.inactivityLevel = 0
          resetInactivityTimer()
        },
      }
    )
  }
}

function resetInactivityTimer() {
  if (!inactivityActive) {
    // 未启用时静默返回，避免频繁日志输出造成性能问题
    return
  }
  clearTimeout(inactivityTimer)
  state.inactivityLevel = 0

  // 优化：检查AI是否正在播放，如果正在播放则延迟启动不活动检测
  if (isAIPlaying()) {
    console.log("[不活动检测] AI正在播放，延迟启动检测")
    // 延迟一小段时间后重试
    setTimeout(() => {
      if (inactivityActive && !isAIPlaying() && !state.isSpeaking) {
        resetInactivityTimer()
      }
    }, 1000)
    return
  }

  // console.log(
  //   `[不活动检测] 启动定时器，${INACTIVITY_THRESHOLD_1}ms 后触发第一次提示`
  // )

  // 第一次提示：10秒（INACTIVITY_THRESHOLD_1）
  inactivityTimer = setTimeout(() => {
    // 双重检查：确保AI不在播放且用户不在说话
    if (!isAIPlaying() && !state.isSpeaking && inactivityActive) {
      console.log("[不活动检测] 触发第一次提示")
      playRandomPrompt()
    } else {
      console.log(
        "[不活动检测] 第一次提示被跳过，AI播放:",
        isAIPlaying(),
        "用户说话:",
        state.isSpeaking,
        "检测激活:",
        inactivityActive
      )
    }
  }, INACTIVITY_THRESHOLD_1)

  // 第二次提示：20秒（INACTIVITY_THRESHOLD_2，从重置时开始计算）
  setTimeout(() => {
    // 双重检查：确保AI不在播放且用户不在说话，且已经触发过第一次提示
    if (
      state.inactivityLevel === 1 &&
      !isAIPlaying() &&
      !state.isSpeaking &&
      inactivityActive
    ) {
      console.log("[不活动检测] 触发第二次提示")
      playRandomPrompt()
    } else {
      // console.log(
      //   "[不活动检测] 第二次提示被跳过，inactivityLevel:",
      //   state.inactivityLevel,
      //   "AI播放:",
      //   isAIPlaying(),
      //   "用户说话:",
      //   state.isSpeaking,
      //   "检测激活:",
      //   inactivityActive
      // )
    }
  }, INACTIVITY_THRESHOLD_2)
}

function showPromptIndicator(message) {
  const existing = document.querySelector(".prompt-indicator")
  if (existing) existing.remove()

  const indicator = document.createElement("div")
  indicator.className = "prompt-indicator"
  indicator.textContent = message
  document.body.appendChild(indicator)
  setTimeout(() => indicator.remove(), 3000)
}

// 事件监听器
// 标记事件监听器是否已绑定
let eventListenersSetup = false

function setupEventListeners() {
  // 防止重复绑定事件监听器
  if (eventListenersSetup) {
    return
  }
  eventListenersSetup = true
  setupBasicInfoDraftListeners()

  startTestBtn.addEventListener("click", startTest)
  if (resumeTestBtn) {
    resumeTestBtn.addEventListener("click", () => {
      if (resumeTestBtn.disabled) return
      disableWelcomeMessagePlayback()
      resumeTestBtn.disabled = true
      resumeTestFromSnapshot()
    })
  }
  prevBtn.addEventListener("click", () => navigate(-1))
  nextBtn.addEventListener("click", () => navigate(1))
  if (nextQuestionBtn) {
    nextQuestionBtn.addEventListener("click", goToNextQuestion)
  }

  document.getElementById("zoom-in-btn").addEventListener("click", () => {
    console.log("[按钮事件] 放大按钮被点击，当前 zoom:", state.zoom)
    // 放大时退出画笔/橡皮工具，切换为“查看/拖拽图片”模式
    exitDrawingTools()
    hasInteractedWithZoom = true
    updateTransform({ zoom: state.zoom * 1.2 })
    if (imagePanController && imagePanController.handleZoomOrResize) {
      imagePanController.handleZoomOrResize()
    }
    resetInactivityTimer()
  })
  document.getElementById("zoom-out-btn").addEventListener("click", () => {
    console.log("[按钮事件] 缩小按钮被点击，当前 zoom:", state.zoom)
    // 缩小时同样退出画笔/橡皮工具，保持缩放与绘图互斥
    exitDrawingTools()
    hasInteractedWithZoom = true
    updateTransform({ zoom: Math.max(0.2, state.zoom / 1.2) })
    if (imagePanController && imagePanController.handleZoomOrResize) {
      imagePanController.handleZoomOrResize()
    }
    resetInactivityTimer()
  })
  document.getElementById("rotate-left-btn").addEventListener("click", () => {
    console.log("[按钮事件] 左旋转按钮被点击，当前 rotation:", state.rotation)
    updateTransform({ rotation: state.rotation - 30 })
    resetInactivityTimer()
  })
  document.getElementById("rotate-right-btn").addEventListener("click", () => {
    console.log("[按钮事件] 右旋转按钮被点击，当前 rotation:", state.rotation)
    updateTransform({ rotation: state.rotation + 30 })
    resetInactivityTimer()
  })
  document.getElementById("pen-tool").addEventListener("click", () => {
    selectTool("pen")
    resetInactivityTimer()
  })
  document.getElementById("eraser-tool").addEventListener("click", () => {
    selectTool("eraser")
    resetInactivityTimer()
  })
  document.getElementById("clear-all-tool").addEventListener("click", () => {
    clearAllDrawing()
    // 清除后自动切换到画笔工具，方便继续绘画
    selectTool("pen")
    // 确保一键擦除按钮不被选中
    document.getElementById("clear-all-tool").classList.remove("selected")
    resetInactivityTimer()
  })
  document.querySelectorAll(".color-option").forEach((opt) => {
    opt.addEventListener("click", (e) => {
      selectColor(e.target.dataset.color)
      resetInactivityTimer()
    })
  })

  // 初始化颜色选择器状态
  syncColorSelectorState()

  canvas.addEventListener("mousedown", startDrawing)
  canvas.addEventListener("mousemove", draw)
  canvas.addEventListener("mouseup", stopDrawing)
  canvas.addEventListener("mouseout", stopDrawing)
}

/**
 * 禁用"下一张"按钮并开始冷却倒计时
 * @param {number} initialCooldown - 初始冷却时间（秒）
 * @param {boolean} force - 是否强制设置（用于恢复状态时）
 */
function disableNextButton(
  initialCooldown = NEXT_BUTTON_COOLDOWN,
  force = false
) {
  // 如果已经在冷却中且不是强制设置，直接返回
  if (state.nextButtonCooldown > 0 && !force) {
    return
  }

  // 如果强制设置，先清除现有定时器
  if (force && nextButtonCooldownTimer) {
    clearInterval(nextButtonCooldownTimer)
    nextButtonCooldownTimer = null
  }

  // 禁用按钮
  nextBtn.disabled = true
  state.nextButtonCooldown = Math.max(1, initialCooldown)

  // 更新按钮文本显示倒计时
  function updateCooldownDisplay() {
    if (state.nextButtonCooldown > 0) {
      nextBtn.textContent = `下一张 ▶ (${state.nextButtonCooldown}秒)`
      state.nextButtonCooldown--
    } else {
      // 冷却结束，恢复按钮
      nextBtn.disabled = false
      nextBtn.textContent = "下一张 ▶"
      if (nextButtonCooldownTimer) {
        clearInterval(nextButtonCooldownTimer)
        nextButtonCooldownTimer = null
      }
    }
  }

  // 立即更新一次显示
  updateCooldownDisplay()

  // 每秒更新一次倒计时
  nextButtonCooldownTimer = setInterval(updateCooldownDisplay, 1000)
}

// 导航和状态
function navigate(direction) {
  console.log("[调试] navigate 被调用:", {
    direction,
    currentIndex: state.currentIndex,
    newIndex: state.currentIndex + direction,
  })

  // 如果正在绘制，先结束绘制状态和轨迹记录
  if (state.drawing) {
    stopDrawing()
  }

  saveCanvasState(state.currentIndex)
  const newIndex = state.currentIndex + direction
  const previousIndex = state.currentIndex

  // 如果点击"上一张"按钮，且当前图片有冷却时间，保存冷却时间并立即结束冷却
  if (direction === -1 && state.nextButtonCooldown > 0) {
    // 保存当前图片的冷却时间
    state.imageCooldowns[previousIndex] = state.nextButtonCooldown
    // 清除冷却定时器
    if (nextButtonCooldownTimer) {
      clearInterval(nextButtonCooldownTimer)
      nextButtonCooldownTimer = null
    }
    // 立即结束冷却
    state.nextButtonCooldown = 0
    nextBtn.disabled = false
    nextBtn.textContent = "下一张 ▶"
  }

  // 检查是否需要冷却豁免（如果是已浏览过的图片）
  const isVisitedImage = state.visitedImages.has(newIndex)

  if (direction === 1 && state.nextButtonCooldown > 0 && !isVisitedImage) {
    // 如果即将进入选择阶段，允许操作并清除冷却
    if (newIndex === state.totalImages) {
      // 清除冷却定时器
      if (nextButtonCooldownTimer) {
        clearInterval(nextButtonCooldownTimer)
        nextButtonCooldownTimer = null
      }
      state.nextButtonCooldown = 0
    } else {
      // 在冷却中且不是最后一张，不允许操作
      return
    }
  }

  if (direction === 1 && newIndex === state.totalImages) {
    // 确保结束最后一张图的未完成轨迹（进入选择阶段前）
    if (
      window.InteractionTracker &&
      window.InteractionTracker._updateCurrentPlate
    ) {
      // 调用 updateCurrentPlate 会结束未完成的轨迹
      // 传入当前索引，确保最后一张图的轨迹被正确保存
      window.InteractionTracker._updateCurrentPlate(state.currentIndex)
    }

    // 记录最后一张图的导航操作（进入选择阶段）
    if (
      window.InteractionTracker &&
      window.InteractionTracker._trackNavigation
    ) {
      window.InteractionTracker._trackNavigation("next")
    }

    // 打印最后一张图的数据（离开前的图版数据）
    if (
      window.InteractionTracker &&
      window.InteractionTracker.printDataStructures
    ) {
      window.InteractionTracker.printDataStructures(state.currentIndex)
    }

    // 清除冷却定时器（如果存在）
    if (nextButtonCooldownTimer) {
      clearInterval(nextButtonCooldownTimer)
      nextButtonCooldownTimer = null
    }
    state.nextButtonCooldown = 0
    nextBtn.disabled = false
    nextBtn.textContent = "下一张 ▶"
    saveSessionSnapshot("stage_change", { immediate: true })
    showPostTestView()
    return
  }

  if (newIndex >= 0 && newIndex < state.totalImages) {
    // 记录导航操作（在切换之前，记录的是当前图版的导航操作）
    if (
      window.InteractionTracker &&
      window.InteractionTracker._trackNavigation
    ) {
      window.InteractionTracker._trackNavigation(
        direction === 1 ? "next" : "prev"
      )
    }

    // 保存离开前的图版索引（用于打印日志）
    const previousIndex = state.currentIndex

    state.currentIndex = newIndex
    console.log("[调试] state.currentIndex 更新为:", state.currentIndex)

    // 更新 TTS 阶段：第一张图用 intest1，后面的图用 intest2to10
    if (state.currentIndex === 0) {
      TTS.currentPhase = "intest1"
      console.log("[TTS] 阶段更新为: intest1")
    } else if (state.currentIndex >= 1) {
      TTS.currentPhase = "intest2to10"
      console.log("[TTS] 阶段更新为: intest2to10")
    }

    // 检查是否有保存的冷却时间需要恢复
    let hasRestoredCooldown = false
    if (state.imageCooldowns[state.currentIndex] !== undefined) {
      const savedCooldown = state.imageCooldowns[state.currentIndex]
      // 恢复冷却时间
      disableNextButton(savedCooldown, true)
      // 清除保存的冷却时间（避免重复恢复）
      delete state.imageCooldowns[state.currentIndex]
      hasRestoredCooldown = true
    }

    // 将当前图片标记为已浏览
    state.visitedImages.add(state.currentIndex)
    saveSessionSnapshot("navigate")

    // 更新追踪器的当前图版索引（记录时间戳）
    // 注意：这里记录的是切换到新图版的时间，即新图版开始的时间
    if (
      window.InteractionTracker &&
      window.InteractionTracker._updateCurrentPlate
    ) {
      window.InteractionTracker._updateCurrentPlate(state.currentIndex)
    }

    // 先切换背景主题颜色，让用户看到背景动画过渡
    if (
      window.BlackHoleBackground &&
      typeof window.BlackHoleBackground.switchTheme === "function"
    ) {
      console.log("[图片切换] 切换到图片索引:", state.currentIndex)
      window.BlackHoleBackground.switchTheme(state.currentIndex)
    } else {
      console.warn("[图片切换] BlackHoleBackground.switchTheme 不可用")
    }

    // 如果是点击"下一张"按钮，且目标图片未浏览过，在图片渐隐时生成粒子效果
    if (
      direction === 1 &&
      !isVisitedImage &&
      state.stage === "test" &&
      window.EnergyPillar &&
      typeof window.EnergyPillar.spawnParticlesFromArea === "function" &&
      rorschachImage
    ) {
      const imageRect = rorschachImage.getBoundingClientRect()
      if (imageRect.width > 0 && imageRect.height > 0) {
        window.EnergyPillar.spawnParticlesFromArea(imageRect)
      }
    }

    // 延迟加载图片，让用户能看到背景动画过渡效果和渐隐渐显效果
    setTimeout(() => {
      loadImage(state.currentIndex)
      updateProgress()
    }, 800)

    console.log("[调试] updateProgress 后，currentIndex:", state.currentIndex)

    // 如果是点击下一张（包括从第一张切换到第二张），切换到新图版后立即启动冷却
    // 但如果目标图片已浏览过，则不启动冷却
    // 如果已经恢复了冷却时间，则不再启动新的冷却
    if (direction === 1) {
      if (
        window.InteractionTracker &&
        window.InteractionTracker.printDataStructures
      ) {
        window.InteractionTracker.printDataStructures(previousIndex)
      }
    }

    if (direction === 1 && !isVisitedImage && !hasRestoredCooldown) {
      disableNextButton()

      // 播报当前图片的提示语音
      ;(async () => {
        try {
          const imageNumber = state.currentIndex + 1 // 图片编号从1开始
          const promptText = `这张图你可以看到什么？`
          console.log("[切换图片] 播报提示:", promptText)
          const introQuery = buildTTSQuery(promptText)
          await sendTextQuery(introQuery, { ensure: false })
          console.log("[切换图片] 提示已发送")
        } catch (err) {
          console.warn("[切换图片] 播报提示失败:", err)
        }
      })()
    }
  }
  resetInactivityTimer()
}

function loadImage(index) {
  // 注意：时间戳已在 navigate() 或 startTest() 中记录
  // 这里不需要再次记录，只需要确保图版索引同步
  if (
    window.InteractionTracker &&
    window.InteractionTracker._updateCurrentPlate
  ) {
    // 只更新索引，不记录时间戳（因为已经记录过了）
    window.InteractionTracker._updateCurrentPlate(index)
  }
  // 切换到新图版时，重置缩放、旋转和拖拽偏移，让图片回到居中初始位置
  panOffsetX = 0
  panOffsetY = 0
  updateTransform({ zoom: 1, rotation: 0, offsetX: 0, offsetY: 0 }, true)

  // 切换图版时立即清除画布（避免显示上一张图的轨迹）
  clearCanvas()

  // 移除之前的 onload 事件处理器，避免冲突
  rorschachImage.onload = null
  rorschachImage.onerror = null

  // 渐隐效果：先让当前图片淡出
  rorschachImage.classList.add("image-fade-out")

  // 等待淡出动画完成后再加载新图片（增加延迟时间，让渐隐效果更慢）
  setTimeout(() => {
    rorschachImage.src = `./images/rorschach-blot-${index + 1}.webp`
    rorschachImage.onerror = () => {
      rorschachImage.classList.remove("image-fade-out")
    }

    // 确保图片加载后加载该图版的画布状态
    if (rorschachImage.complete) {
      // 图片已缓存，立即加载画布状态
      resizeCanvas()
      loadCanvasState(index)
      // 渐显效果：移除淡出类，触发淡入
      rorschachImage.classList.remove("image-fade-out")
      rorschachImage.classList.add("image-fade-in")
      setTimeout(() => {
        rorschachImage.classList.remove("image-fade-in")
      }, 800) // 增加渐显动画时间到800ms，让效果更慢
    } else {
      // 图片需要加载，等待加载完成
      rorschachImage.onload = () => {
        resizeCanvas()
        loadCanvasState(index)
        // 渐显效果：移除淡出类，触发淡入
        rorschachImage.classList.remove("image-fade-out")
        rorschachImage.classList.add("image-fade-in")
        setTimeout(() => {
          rorschachImage.classList.remove("image-fade-in")
        }, 800) // 增加渐显动画时间到800ms，让效果更慢
        rorschachImage.onload = null
      }
    }
  }, 800) // 增加淡出动画时间到800ms，让渐隐效果更慢

  updateNavButtons()
}

function updateNavButtons() {
  prevBtn.disabled = state.currentIndex === 0
  // "下一张"按钮的禁用状态由冷却时间控制
  // 如果是最后一张图，始终允许点击（进入选择阶段不受冷却限制）
  if (state.currentIndex === state.totalImages - 1) {
    nextBtn.disabled = false
    nextBtn.textContent = "下一张 ▶"
  } else if (state.nextButtonCooldown === 0) {
    // 如果冷却时间为0，确保按钮可用
    nextBtn.disabled = false
    nextBtn.textContent = "下一张 ▶"
  }
  // 其他情况下，禁用状态由冷却定时器控制
}

function updateProgress() {
  console.log(
    "[调试] updateProgress 被调用，currentIndex:",
    state.currentIndex,
    "显示:",
    state.currentIndex + 1
  )
  progressText.textContent = `第 ${state.currentIndex + 1} / ${
    state.totalImages
  } 张图片`
}

// 后测试视图
function showPostTestView(options = {}) {
  const restoredSnapshot = options.restoredSnapshot || null
  state.stage = "post"
  stopInactivityMonitoring()
  clearTimeout(inactivityTimer)
  hideTestLoadingOverlay({ keepMainHidden: true })
  mainContent.style.display = "none"
  controlsBar.style.display = "none"
  // 隐藏字幕
  if (window.subtitleManager) {
    window.subtitleManager.hide()
  }
  // 确保 image-container 隐藏（后测试阶段不显示）
  const imageContainer = document.getElementById("image-container")
  if (imageContainer) {
    imageContainer.style.display = "none"
  }
  postTestView.style.display = "block"
  progressText.textContent = "第三项测试"

  // 隐藏背景动画（后测试阶段不显示背景）
  const bgContainer = document.getElementById("blackhole-bg-container")
  if (bgContainer) {
    bgContainer.style.display = "none"
  }

  // 移除 test-mode 类，恢复非测试模式样式
  document.body.classList.remove("test-mode")

  // 隐藏能量柱容器
  const energyPillarContainer = document.getElementById(
    "energy-pillar-container"
  )
  if (energyPillarContainer) {
    energyPillarContainer.style.display = "none"
    energyPillarContainer.classList.remove("visible")
  }

  // 记录进入选择阶段的时间
  if (
    window.InteractionTracker &&
    window.InteractionTracker.recordSelectPhase
  ) {
    window.InteractionTracker.recordSelectPhase()
  }

  // 重置所有相关元素到初始状态，确保重新测试时与第一次测试一致
  const grid = document.getElementById("post-test-grid")
  grid.innerHTML = ""
  grid.style.display = "" // 重置显示状态

  // 重新获取按钮元素（防止页面刷新后元素丢失）
  const nextBtn = document.getElementById("next-question-btn")
  if (nextBtn) {
    nextBtn.style.display = "none" // 隐藏下一页按钮
    nextBtn.disabled = false // 重置按钮禁用状态
  }
  questionText.textContent = "" // 清空问题文本

  // 初始化答案数组格式（如果还没有初始化）
  POST_TEST_QUESTIONS.forEach((q) => {
    if (shouldDisplayQuestion(q)) {
      if (
        !state.postTestAnswers[q.key] ||
        !Array.isArray(state.postTestAnswers[q.key])
      ) {
        state.postTestAnswers[q.key] = []
      }
    }
  })

  for (let i = 0; i < state.totalImages; i++) {
    const item = document.createElement("div")
    item.className = "grid-item"
    item.dataset.index = i
    item.innerHTML = `<img src="./images/rorschach-blot-${
      i + 1
    }.webp" alt="Image ${i + 1}"><h4>图 ${i + 1}</h4>`
    item.addEventListener("click", handleImageSelection)
    grid.appendChild(item)
  }
  currentQuestionIndex = restoredSnapshot?.payload?.currentQuestionIndex ?? 0

  // 初始化问题进度柱
  initQuestionProgressPillar()

  askNextQuestion()
  saveSessionSnapshot("stage_change", { immediate: true })
}

async function askNextQuestion() {
  // 跳过 why 问题，找到下一个应该显示的问题
  let question = null
  while (currentQuestionIndex < POST_TEST_QUESTIONS.length) {
    const candidate = POST_TEST_QUESTIONS[currentQuestionIndex]
    if (shouldDisplayQuestion(candidate)) {
      question = candidate
      break
    }
    currentQuestionIndex++
  }

  // 如果没有找到可显示的问题，说明所有问题都已处理完毕
  if (!question || currentQuestionIndex >= POST_TEST_QUESTIONS.length) {
    const finishText =
      "再次感谢您的时间，测试报告将会交给模型进行分析，为时大约1-2天, 请您耐心等待"

    // 不显示文案，移除背景色
    questionText.textContent = ""
    questionText.style.background = "none"
    document.getElementById("post-test-grid").style.display = "none"

    // 隐藏下一页按钮
    const nextBtn = document.getElementById("next-question-btn")
    if (nextBtn) {
      nextBtn.style.display = "none"
    }

    // 隐藏问题进度柱
    hideQuestionProgressPillar()

    // 立即显示等待报告页面
    console.log("[askNextQuestion] 显示等待报告页面，同时播报结束语")
    console.log("[askNextQuestion] 结束文案:", finishText)
    showWaitingReportOnly()

    // 播报结束文案（不阻塞）
    ;(async () => {
      try {
        console.log("[askNextQuestion] 准备发送 TTS 播报请求")
        // 测试后阶段使用 posttest phase
        TTS.currentPhase = "posttest"
        const ttsQuery = buildTTSQuery(finishText)
        console.log("[askNextQuestion] TTS Query:", ttsQuery)
        await sendTextQuery(ttsQuery, { ensure: false })
        console.log("[askNextQuestion] TTS 播报请求已发送")

        // 估算 TTS 播放时间（每字约 220-250ms）
        const estimatedDuration = Math.max(2000, finishText.length * 220)
        console.log(
          "[askNextQuestion] 等待播报完成，预计时长:",
          estimatedDuration,
          "ms"
        )
        await new Promise((resolve) => setTimeout(resolve, estimatedDuration))

        // 播报完成后再断开连接和提交数据
        console.log("[askNextQuestion] 播报完成，开始提交数据")
        finishAndSaveData()
      } catch (error) {
        console.error("[askNextQuestion] 结束文案 TTS 播报失败:", error)
        // 即使播报失败，也要提交数据
        finishAndSaveData()
      }
    })()

    return
  }

  // 显示主问题的文本（why问题不显示在页面上）
  questionText.textContent = question.text
  const gridContainer = document.getElementById("post-test-grid")

  // 先清除所有选中状态的视觉显示
  document.querySelectorAll(".grid-item").forEach((el) => {
    el.classList.remove("selected")
  })

  // 保持图片选择可用，不禁用
  gridContainer.style.pointerEvents = "auto"
  gridContainer.style.marginTop = "10px"

  // 获取下一页按钮元素（重新获取，防止页面刷新后丢失）
  let nextQuestionButton = document.getElementById("next-question-btn")

  // 确保按钮容器也是可见的
  const actionsContainer = document.querySelector(".post-test-actions")
  if (actionsContainer) {
    actionsContainer.style.display = "flex"
    actionsContainer.style.visibility = "visible"
    actionsContainer.style.opacity = "1"
  }

  // 显示下一页按钮（如果之前没获取到，再次尝试获取）
  if (!nextQuestionButton) {
    nextQuestionButton = document.getElementById("next-question-btn")
  }

  if (nextQuestionButton) {
    // 强制显示按钮，使用!important确保覆盖所有样式
    nextQuestionButton.style.setProperty("display", "inline-block", "important")
    // 确保按钮可见
    nextQuestionButton.style.setProperty("visibility", "visible", "important")
    nextQuestionButton.style.setProperty("opacity", "1", "important")

    // 先禁用按钮，等待TTS播报完成
    nextQuestionButton.disabled = true
    nextQuestionButton.style.opacity = "0.5"
    nextQuestionButton.style.cursor = "not-allowed"
    nextQuestionButton.textContent = "播报中..."
  }

  // 恢复当前问题的选中状态（从答案数组中恢复）
  const questionKey = question.key
  const selectedImages = state.postTestAnswers[questionKey] || []
  document.querySelectorAll(".grid-item").forEach((el) => {
    const index = parseInt(el.dataset.index)
    const imageNumber = index + 1
    if (selectedImages.includes(imageNumber)) {
      el.classList.add("selected")
    }
  })

  // 查找why问题（如果存在）
  const whyQuestion = findWhyQuestion(question.key)

  // 合并主问题和why问题文本用于TTS播报（why问题不显示在页面）
  const mainText = question.text
  const whyText = whyQuestion ? whyQuestion.text : ""
  const combinedText = whyText ? `${mainText} ${whyText}` : mainText

  // 检查是否是最后一个问题
  let nextDisplayableIndex = currentQuestionIndex + 1
  while (
    nextDisplayableIndex < POST_TEST_QUESTIONS.length &&
    !shouldDisplayQuestion(POST_TEST_QUESTIONS[nextDisplayableIndex])
  ) {
    nextDisplayableIndex++
  }
  const isLastQuestion = nextDisplayableIndex >= POST_TEST_QUESTIONS.length

  // 一次性播报合并后的文本（不等待播报完成，允许用户随时操作）
  try {
    const ttsQuery = buildTTSQuery(combinedText)
    await sendTextQuery(ttsQuery, { ensure: false })
    console.log(
      "[askNextQuestion] 开始播报问题，当前问题索引:",
      currentQuestionIndex
    )

    // 估算TTS播放时间（每字约220-250ms）
    const estimatedDuration = Math.max(2000, combinedText.length * 250)
    console.log("[askNextQuestion] 预计播报时长:", estimatedDuration, "ms")

    // 等待TTS播报完成后，启动15秒倒计时
    setTimeout(() => {
      if (nextQuestionButton) {
        let countdown = 1
        const originalText = isLastQuestion ? "提交" : "下一页"
        nextQuestionButton.textContent = `${originalText} (${countdown}s)`

        const countdownInterval = setInterval(() => {
          countdown--
          if (countdown > 0) {
            nextQuestionButton.textContent = `${originalText} (${countdown}s)`
          } else {
            clearInterval(countdownInterval)
            nextQuestionButton.disabled = false
            nextQuestionButton.style.opacity = "1"
            nextQuestionButton.style.cursor = "pointer"
            nextQuestionButton.textContent = originalText
          }
        }, 1000)
      }
    }, estimatedDuration)
  } catch (error) {
    console.warn("[askNextQuestion] TTS 播报失败:", error)
    // 如果播报失败，直接启动倒计时
    if (nextQuestionButton) {
      let countdown = 1
      const originalText = isLastQuestion ? "提交" : "下一页"
      nextQuestionButton.textContent = `${originalText} (${countdown}s)`

      const countdownInterval = setInterval(() => {
        countdown--
        if (countdown > 0) {
          nextQuestionButton.textContent = `${originalText} (${countdown}s)`
        } else {
          clearInterval(countdownInterval)
          nextQuestionButton.disabled = false
          nextQuestionButton.style.opacity = "1"
          nextQuestionButton.style.cursor = "pointer"
          nextQuestionButton.textContent = originalText
        }
      }, 1000)
    }
  }
}

function handleImageSelection(event) {
  const selectedIndex = parseInt(event.currentTarget.dataset.index)
  const imageNumber = selectedIndex + 1
  const questionKey = POST_TEST_QUESTIONS[currentQuestionIndex].key

  // 确保答案数组存在
  if (!Array.isArray(state.postTestAnswers[questionKey])) {
    state.postTestAnswers[questionKey] = []
  }

  const selectedImages = state.postTestAnswers[questionKey]

  // Toggle选择状态：如果已选中则移除，未选中则添加
  const index = selectedImages.indexOf(imageNumber)
  if (index > -1) {
    // 已选中，取消选择
    selectedImages.splice(index, 1)
    event.currentTarget.classList.remove("selected")
  } else {
    // 未选中，添加选择
    selectedImages.push(imageNumber)
    // 保持数组排序
    selectedImages.sort((a, b) => a - b)
    event.currentTarget.classList.add("selected")
  }

  // 保存会话快照
  saveSessionSnapshot("post_test")
}

// 处理下一页按钮点击
function goToNextQuestion() {
  // 保存当前问题的答案
  const questionKey = POST_TEST_QUESTIONS[currentQuestionIndex].key
  saveSessionSnapshot("post_test")

  // 清空上一个问题的 TTS 播报
  if (
    window.dialogClient &&
    typeof window.dialogClient.stopPlayback === "function"
  ) {
    window.dialogClient.stopPlayback()
    console.log("[goToNextQuestion] 已停止上一个问题的 TTS 播报")
  }

  // 清除所有选中状态的视觉显示（为下一个问题做准备）
  document.querySelectorAll(".grid-item").forEach((el) => {
    el.classList.remove("selected")
  })

  // 保持图片选择可用，不禁用
  const gridContainer = document.getElementById("post-test-grid")
  if (gridContainer) {
    gridContainer.style.pointerEvents = "auto"
  }

  // 检查是否是最后一个问题
  let nextDisplayableIndex = currentQuestionIndex + 1
  while (
    nextDisplayableIndex < POST_TEST_QUESTIONS.length &&
    !shouldDisplayQuestion(POST_TEST_QUESTIONS[nextDisplayableIndex])
  ) {
    nextDisplayableIndex++
  }
  const isLastQuestion = nextDisplayableIndex >= POST_TEST_QUESTIONS.length

  // 如果是最后一个问题，直接完成测试
  if (isLastQuestion) {
    console.log("[goToNextQuestion] 这是最后一个问题，完成测试")
    // 递增索引以触发完成逻辑
    currentQuestionIndex++
    askNextQuestion()
    return
  }

  // 递增到下一个问题，如果下一个是 why 问题则继续跳过
  currentQuestionIndex++
  while (
    currentQuestionIndex < POST_TEST_QUESTIONS.length &&
    !shouldDisplayQuestion(POST_TEST_QUESTIONS[currentQuestionIndex])
  ) {
    currentQuestionIndex++
  }

  // 更新问题进度柱
  const totalQuestions = POST_TEST_QUESTIONS.length
  updateQuestionProgress(currentQuestionIndex, totalQuestions)

  // 立即显示下一个问题（不再延迟）
  askNextQuestion()
}

// 只处理数据提交和清理（不处理视图切换）
async function finishAndSaveData() {
  // 先停止混合录音，获取混合音频
  let mixedAudioBlob = null
  if (window.dialogClient && window.dialogClient.isMixedRecording) {
    try {
      mixedAudioBlob = await window.dialogClient.stopMixedRecording()
      console.log("[测试完成] 混合录音已停止，大小:", (mixedAudioBlob?.size / 1024 / 1024).toFixed(2), "MB")
    } catch (err) {
      console.warn("[测试完成] 停止混合录音失败:", err)
    }
  }

  // 断开TTS连接
  if (window.dialogClient) {
    window.dialogClient.disconnect()
    console.log("[测试完成] TTS连接已断开")
  }

  // 等待 MediaRecorder 停止并生成 audioBlob（备用）
  if (state.mediaRecorder && state.mediaRecorder.state === "recording") {
    await new Promise((resolve) => {
      const originalOnStop = state.mediaRecorder.onstop
      state.mediaRecorder.onstop = (event) => {
        if (originalOnStop) {
          originalOnStop(event)
        }
        console.log("[录音] MediaRecorder 已停止，audioBlob 已生成")
        resolve()
      }
      state.mediaRecorder.stop()
    })
  }

  // 保存混合录音到 state（优先使用混合录音）
  if (mixedAudioBlob) {
    state.audioBlob = mixedAudioBlob
    console.log("[测试完成] 使用混合录音作为最终音频")
  }

  // 导出交互追踪数据
  if (window.InteractionTracker) {
    try {
      // 在停止追踪前，确保结束所有未完成的轨迹
      if (state.currentIndex >= 0 && state.currentIndex < state.totalImages) {
        window.InteractionTracker._updateCurrentPlate(state.currentIndex)
      }
      window.InteractionTracker.stop()

      // 输出所有版图的统计信息（完整数据）
      window.InteractionTracker.printAllPlatesStatistics()

      const interactionData = window.InteractionTracker.exportJSON({
        pretty: true,
        includeStats: true,
        includeMetadata: true,
      })
      console.log("[交互追踪数据]", JSON.parse(interactionData))

      // 获取旋转次数统计数据
      const rotationCounts = window.InteractionTracker.getRotationCounts()
      console.log("[旋转次数统计]", rotationCounts)

      // 获取画笔轨迹数据
      const drawingTracks = window.InteractionTracker.getDrawingTracks()
      console.log("[画笔轨迹数据]", drawingTracks)

      // 获取音频时间戳统计数据
      const audioTimestamps = window.InteractionTracker.getAudioTimestamps()
      console.log("[音频时间戳统计（相对时间）]", audioTimestamps)

      // 获取绝对时间戳统计数据
      const absoluteTimestamps =
        window.InteractionTracker.getAbsoluteTimestamps()
      console.log("[绝对时间戳统计]", absoluteTimestamps)
    } catch (error) {
      console.error("[交互追踪] 导出数据失败:", error)
    }
  }

  // 跳转到汇总页面的函数
  const goToSummary = () => {
    console.log("[上传完成] 准备跳转到汇总页面")

    // 停止词云动画
    waitingReportManager.stop()

    // 隐藏字幕
    if (window.subtitleManager) {
      window.subtitleManager.hide()
    }

    // 隐藏等待报告视图
    waitingReportView.style.display = "none"

    // 显示汇总页面
    showSummary({ reportStatus: { ...DEFAULT_REPORT_WAITING_STATUS } })
  }

  // 调用接口提交数据到服务器
  if (window.submitTestDataToServer && window.InteractionTracker) {
    // 获取进度显示元素
    const uploadFill = document.getElementById("upload-fill")
    const uploadPercent = document.getElementById("upload-percent")
    const uploadStatusText = document.getElementById("upload-status-text")
    const uploadRetryBtn = document.getElementById("upload-retry-btn")
    const uploadRetestBtn = document.getElementById("upload-retest-btn")

    // 记录失败的项目和重试次数
    let hasFailure = false
    let successCount = 0
    let retryCount = 0
    const MAX_RETRY = 2 // 最多重试2次（共3次尝试）

    // 进度回调函数
    const onUploadProgress = (current, total, name, success) => {
      console.log(`[上传进度] ${current}/${total} - ${name} - ${success ? '成功' : '失败'}`)

      // 记录是否有失败
      if (!success) {
        hasFailure = true
      } else {
        // 只有成功才增加进度
        successCount++
      }

      const percent = Math.round((successCount / total) * 100)

      if (uploadFill) {
        uploadFill.style.height = `${percent}%`
      }
      if (uploadPercent) {
        uploadPercent.textContent = `${percent}%`
      }
      if (uploadStatusText) {
        uploadStatusText.textContent = `正在上传数据 (${current}/${total})...`
      }
    }

    // 执行上传的函数（支持重试）
    const executeUpload = async () => {
      // 重置状态
      hasFailure = false
      successCount = 0
      if (uploadFill) {
        uploadFill.style.height = "0%"
        uploadFill.classList.remove("failed", "success")
      }
      if (uploadPercent) {
        uploadPercent.textContent = "0%"
      }
      if (uploadStatusText) {
        uploadStatusText.textContent = "正在准备上传..."
      }
      if (uploadRetryBtn) {
        uploadRetryBtn.style.display = "none"
      }

      try {
        console.log("[API] 开始提交数据到服务器...")

        // 获取音频数据
        let audioBlob = null
        if (state.audioBlob) {
          audioBlob = state.audioBlob
        } else if (state.audioChunks && state.audioChunks.length > 0) {
          audioBlob = new Blob(state.audioChunks, { type: "audio/webm" })
        }

        // 调用接口提交数据（带进度回调）
        const result = await window.InteractionTracker.submitAllData(
          window.auth?.getUserInfo()?.username || "unknown",
          audioBlob,
          onUploadProgress
        )

        console.log("[API] 数据提交结果:", result)

        if (hasFailure) {
          // 有失败项目
          console.error("[API] 部分数据提交失败，重试次数:", retryCount)
          if (uploadFill) {
            uploadFill.classList.add("failed")
          }
          if (uploadStatusText) {
            uploadStatusText.textContent = "上传失败，请重试"
          }
          // 根据重试次数显示不同按钮
          if (retryCount >= MAX_RETRY) {
            // 已达到最大重试次数，显示重新测试按钮
            if (uploadRetryBtn) {
              uploadRetryBtn.style.display = "none"
            }
            if (uploadRetestBtn) {
              uploadRetestBtn.style.display = "block"
            }
            if (uploadStatusText) {
              uploadStatusText.textContent = "上传失败，请重新测试"
            }
          } else {
            // 还可以重试
            if (uploadRetryBtn) {
              uploadRetryBtn.style.display = "block"
            }
            if (uploadRetestBtn) {
              uploadRetestBtn.style.display = "none"
            }
          }
        } else {
          // 全部成功
          if (uploadFill) {
            uploadFill.classList.add("success")
          }
          if (uploadStatusText) {
            uploadStatusText.textContent = "数据上传完成"
          }
          // 上传成功后延迟 1 秒跳转到汇总页面
          setTimeout(goToSummary, 1000)
        }
      } catch (error) {
        console.error("[API] 提交数据失败:", error, "重试次数:", retryCount)
        if (uploadFill) {
          uploadFill.classList.add("failed")
        }
        if (uploadStatusText) {
          uploadStatusText.textContent = "上传失败，请重试"
        }
        // 根据重试次数显示不同按钮
        if (retryCount >= MAX_RETRY) {
          if (uploadRetryBtn) {
            uploadRetryBtn.style.display = "none"
          }
          if (uploadRetestBtn) {
            uploadRetestBtn.style.display = "block"
          }
          if (uploadStatusText) {
            uploadStatusText.textContent = "上传失败，请重新测试"
          }
        } else {
          if (uploadRetryBtn) {
            uploadRetryBtn.style.display = "block"
          }
          if (uploadRetestBtn) {
            uploadRetestBtn.style.display = "none"
          }
        }
      }
    }

    // 绑定重试按钮事件
    if (uploadRetryBtn) {
      uploadRetryBtn.onclick = () => {
        retryCount++
        executeUpload()
      }
    }

    // 绑定重新测试按钮事件
    if (uploadRetestBtn) {
      uploadRetestBtn.onclick = handleRetestClick
    }

    // 执行上传
    executeUpload()
  }
}

// 只显示等待报告页面（不启动倒计时，等待上传完成后跳转）
function showWaitingReportOnly() {
  console.log("[showWaitingReportOnly] 显示等待报告页面")

  // 隐藏其他视图
  infoScreen.style.display = "none"
  mainContent.style.display = "none"
  controlsBar.style.display = "none"
  postTestView.style.display = "none"
  summaryView.style.display = "none"

  // 保持字幕显示（等待报告时需要显示语音播报字幕）
  // 字幕会在语音播报完成后自动隐藏

  // 隐藏背景动画
  const bgContainer = document.getElementById("blackhole-bg-container")
  if (bgContainer) {
    bgContainer.style.display = "none"
  }

  // 隐藏能量柱
  const energyPillarContainer = document.getElementById(
    "energy-pillar-container"
  )
  if (energyPillarContainer) {
    energyPillarContainer.style.display = "none"
    energyPillarContainer.classList.remove("visible")
  }

  // 确保 image-container 隐藏
  const imageContainer = document.getElementById("image-container")
  if (imageContainer) {
    imageContainer.style.display = "none"
  }

  // 显示等待报告视图
  appWindow.style.display = "flex"
  waitingReportView.style.display = "block"

  // 启动等待报告动画（词云动画会在上传完成后由 finishAndSaveData 中的 goToSummary 停止）
  waitingReportManager.start()
}

function showWaitingReport() {
  console.log("[showWaitingReport] 显示等待报告页面")

  // 隐藏其他视图
  infoScreen.style.display = "none"
  mainContent.style.display = "none"
  controlsBar.style.display = "none"
  postTestView.style.display = "none"
  summaryView.style.display = "none"

  // 隐藏字幕
  if (window.subtitleManager) {
    window.subtitleManager.hide()
  }

  // 隐藏背景动画
  const bgContainer = document.getElementById("blackhole-bg-container")
  if (bgContainer) {
    bgContainer.style.display = "none"
  }

  // 隐藏能量柱
  const energyPillarContainer = document.getElementById(
    "energy-pillar-container"
  )
  if (energyPillarContainer) {
    energyPillarContainer.style.display = "none"
    energyPillarContainer.classList.remove("visible")
  }

  // 确保 image-container 隐藏
  const imageContainer = document.getElementById("image-container")
  if (imageContainer) {
    imageContainer.style.display = "none"
  }

  // 显示等待报告视图
  appWindow.style.display = "flex"
  waitingReportView.style.display = "block"

  // 启动等待报告动画
  waitingReportManager.start()

  // 15秒后跳转到汇总页面（可以改为轮询报告状态）
  setTimeout(() => {
    console.log("[showWaitingReport] 准备跳转到汇总页面")

    // 停止动画
    waitingReportManager.stop()

    // 隐藏等待报告视图
    waitingReportView.style.display = "none"

    // 显示汇总页面
    showSummary({ reportStatus: { ...DEFAULT_REPORT_WAITING_STATUS } })
  }, 12000)
}

function showSummary(options = {}) {
  console.log("[showSummary] 开始执行，当前 state.stage:", state.stage)
  const { reportStatus = null } = options || {}
  if (reportStatus) {
    latestReportStatus = normalizeReportStatusPayload(reportStatus)
  }
  if (!latestReportStatus) {
    latestReportStatus = { ...DEFAULT_REPORT_WAITING_STATUS }
  }

  setSkipReportRedirectFlag(false)
  console.log(
    "[showSummary] 设置 state.stage = 'summary' 前，当前值:",
    state.stage
  )
  state.stage = "summary"
  console.log(
    "[showSummary] 设置 state.stage = 'summary' 后，当前值:",
    state.stage
  )
  state.completed = true
  hideTestLoadingOverlay({ keepMainHidden: true })
  if (
    window.SessionManager &&
    typeof window.SessionManager.markCompleted === "function"
  ) {
    window.SessionManager.markCompleted()
  }
  infoScreen.style.display = "none"
  appWindow.style.display = "flex"
  mainContent.style.display = "none"
  controlsBar.style.display = "none"
  // 隐藏字幕
  if (window.subtitleManager) {
    window.subtitleManager.hide()
  }
  postTestView.style.display = "none"
  // 确保 image-container 隐藏（汇总阶段不显示）
  const imageContainer = document.getElementById("image-container")
  if (imageContainer) {
    imageContainer.style.display = "none"
  }
  summaryView.style.display = "block"
  progressText.textContent = "测试已完成！"

  // 隐藏背景动画（汇总阶段不显示背景）
  const bgContainer = document.getElementById("blackhole-bg-container")
  if (bgContainer) {
    bgContainer.style.display = "none"
  }

  // 移除 test-mode 类，恢复非测试模式样式
  document.body.classList.remove("test-mode")

  // 隐藏能量柱容器
  const energyPillarContainer = document.getElementById(
    "energy-pillar-container"
  )
  if (energyPillarContainer) {
    energyPillarContainer.style.display = "none"
    energyPillarContainer.classList.remove("visible")
  }

  const grid = document.getElementById("summary-grid")
  if (!grid) {
    return
  }
  grid.innerHTML = ""
  renderSummaryReportSection(summaryView, grid, latestReportStatus)

  const canvasStates = Array.isArray(state.canvasStates)
    ? state.canvasStates
    : new Array(state.totalImages).fill(null)
  state.canvasStates = canvasStates

  for (let i = 0; i < state.totalImages; i++) {
    const item = document.createElement("div")
    item.className = "summary-item"
    const compositeContainer = document.createElement("div")
    compositeContainer.style.position = "relative"
    const baseImage = document.createElement("img")
    baseImage.src = `./images/rorschach-blot-${i + 1}.webp`
    compositeContainer.appendChild(baseImage)
    if (canvasStates[i]) {
      const drawingImage = document.createElement("img")
      drawingImage.src = canvasStates[i]
      drawingImage.style.position = "absolute"
      drawingImage.style.top = 0
      drawingImage.style.left = 0
      drawingImage.style.width = "100%"
      drawingImage.style.height = "100%"
      compositeContainer.appendChild(drawingImage)
    }
    item.appendChild(compositeContainer)
    const heading = document.createElement("h4")
    heading.textContent = `图 ${i + 1}`
    item.appendChild(heading)
    grid.appendChild(item)
  }
  saveSessionSnapshot("stage_change", { immediate: true })
}

function handleRetestClick(event) {
  if (event) {
    event.preventDefault()
  }
  if (retestFlowActive) {
    return
  }
  const confirmed = window.confirm(
    "重新测试将清空当前测验的过程数据，需要重新填写信息并开始。是否继续？"
  )
  if (!confirmed) {
    return
  }
  retestFlowActive = true
  ;(async () => {
    try {
      setSkipReportRedirectFlag(true)
      await prepareForRetest()
      await startRetestFlow()
    } catch (error) {
      console.error("[Retest] 初始化失败:", error)
      setSkipReportRedirectFlag(false)
      alert("重新测试准备失败，请刷新页面或稍后重试。")
      showInfoScreenForRetest()
    } finally {
      retestFlowActive = false
    }
  })()
}

async function prepareForRetest() {
  cleanupResourcesForRetest()
  resetStateToInitialValues({ preserveBasicInfo: true })
}

async function startRetestFlow() {
  disableWelcomeMessagePlayback()
  hideWelcomeText()
  if (infoScreen) {
    infoScreen.style.display = "none"
  }
  if (appWindow) {
    appWindow.style.display = "flex"
    appWindow.classList.remove("intro-mode")
  }
  if (mainContent) {
    mainContent.style.display = "none"
  }
  if (summaryView) {
    summaryView.style.display = "none"
  }
  if (postTestView) {
    postTestView.style.display = "none"
  }
  if (introOverlay) {
    introOverlay.style.display = "none"
  }
  if (enterBtn) {
    enterBtn.style.display = "none"
  }
  if (controlsBar) {
    controlsBar.style.display = "none"
  }
  // 隐藏等待报告视图和词云
  if (waitingReportView) {
    waitingReportView.style.display = "none"
  }
  if (waitingReportManager) {
    waitingReportManager.stop()
  }
  // 重置上传进度
  const uploadFill = document.getElementById("upload-fill")
  const uploadPercent = document.getElementById("upload-percent")
  const uploadRetryBtn = document.getElementById("upload-retry-btn")
  const uploadRetestBtn = document.getElementById("upload-retest-btn")
  if (uploadFill) {
    uploadFill.style.height = "0%"
    uploadFill.classList.remove("failed", "success")
  }
  if (uploadPercent) {
    uploadPercent.textContent = "0%"
  }
  if (uploadRetryBtn) {
    uploadRetryBtn.style.display = "none"
  }
  if (uploadRetestBtn) {
    uploadRetestBtn.style.display = "none"
  }
  // 隐藏字幕
  if (window.subtitleManager) {
    window.subtitleManager.hide()
  }
  if (progressText) {
    progressText.textContent = "准备中..."
  }
  showTestLoadingOverlay("正在准备重新测试，请稍候...")

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    initAudio(stream)
  } catch (error) {
    console.error("[Retest] 获取麦克风失败:", error)
    alert("需要麦克风权限才能重新开始测试，请检查设备设置。")
    showInfoScreenForRetest()
    throw error
  }

  try {
    await enterTestExperience({ skipOpeningSpeech: false })
  } catch (error) {
    console.error("[Retest] 进入测试失败:", error)
    alert("重新开始测试失败，请刷新页面后重试。")
    showInfoScreenForRetest()
    throw error
  }
}

function cleanupResourcesForRetest() {
  stopInactivityMonitoring()
  stopAllPlayback()
  if (downloadProgressInterval) {
    clearInterval(downloadProgressInterval)
    downloadProgressInterval = null
  }
  if (
    window.dialogClient &&
    typeof window.dialogClient.disconnect === "function"
  ) {
    try {
      window.dialogClient.disconnect()
    } catch (error) {
      console.warn("[Retest] 断开对话客户端失败:", error)
    }
  }
  if (window.AudioRecorder) {
    try {
      window.AudioRecorder.stop()
    } catch (error) {
      console.warn("[Retest] 停止音频录制器失败:", error)
    }
    try {
      window.AudioRecorder.reset()
    } catch (error) {
      console.warn("[Retest] 重置音频录制器失败:", error)
    }
  }
  if (state.mediaRecorder) {
    try {
      if (state.mediaRecorder.state !== "inactive") {
        state.mediaRecorder.stop()
      }
    } catch (error) {
      console.warn("[Retest] 停止浏览器录音失败:", error)
    }
    try {
      const tracks =
        state.mediaRecorder.stream &&
        typeof state.mediaRecorder.stream.getTracks === "function"
          ? state.mediaRecorder.stream.getTracks()
          : []
      tracks.forEach((track) => track.stop())
    } catch (error) {
      console.warn("[Retest] 释放录音轨道失败:", error)
    }
  }
  state.mediaRecorder = null
  state.audioChunks = []
  state.audioBlob = null
  if (window.InteractionTracker) {
    try {
      window.InteractionTracker.stop()
      window.InteractionTracker.reset()
    } catch (error) {
      console.warn("[Retest] 重置交互追踪失败:", error)
    }
  }
}

function resetStateToInitialValues(options = {}) {
  const { preserveBasicInfo = false } = options || {}
  const retainedDraft = preserveBasicInfo
    ? { ...state.basicInfoDraft }
    : getEmptyBasicInfoDraft()
  const retainedBasicInfo = preserveBasicInfo ? { ...state.basicInfo } : null
  latestReportStatus = null
  state.currentIndex = 0
  state.zoom = 1
  state.rotation = 0
  state.drawing = false
  state.tool = "pen"
  state.color = "#ef4444"
  state.canvasStates = new Array(state.totalImages).fill(null)
  state.visitedImages = new Set()
  state.postTestAnswers = {}
  state.introStep = INTRO_STEPS.INFO_FORM
  state.stage = "intro"
  state.completed = false
  state.inactivityLevel = 0
  state.nextButtonCooldown = 0
  state.isSpeaking = false
  state.audioChunks = []
  state.audioBlob = null
  state.basicInfoDraft = preserveBasicInfo
    ? { ...getEmptyBasicInfoDraft(), ...retainedDraft }
    : getEmptyBasicInfoDraft()
  state.basicInfo = preserveBasicInfo ? retainedBasicInfo : null
  state.lastSnapshotReason = null
  state.sessionVersion = 0
  state.sessionId = null
  sessionState.sessionId = null
  sessionState.snapshotVersion = 0
  sessionState.completed = false
  sessionState.payload = null
  sessionState.lastTrigger = null
  pendingSessionSnapshot = null
  latestSnapshotVersion = 0
  restoreSnapshotCache = null
  currentQuestionIndex = 0
  applyBasicInfoDraftToInputs()
  clearBasicInfoValidationState()
  if (
    window.SessionManager &&
    typeof window.SessionManager.clearSnapshot === "function"
  ) {
    try {
      window.SessionManager.clearSnapshot()
    } catch (error) {
      console.warn("[Session] 清除历史快照失败:", error)
    }
  }
  ensureSessionId()
}

function showInfoScreenForRetest() {
  hideTestLoadingOverlay({ keepMainHidden: true })
  if (infoScreen) {
    infoScreen.style.display = "flex"
  }
  if (appWindow) {
    appWindow.style.display = "none"
    appWindow.classList.remove("intro-mode")
  }
  if (mainContent) {
    mainContent.style.display = "none"
  }
  if (controlsBar) {
    controlsBar.style.display = "none"
  }
  // 隐藏字幕
  if (window.subtitleManager) {
    window.subtitleManager.hide()
  }
  if (postTestView) {
    postTestView.style.display = "none"
  }
  if (summaryView) {
    summaryView.style.display = "none"
  }
  if (introOverlay) {
    introOverlay.style.display = "none"
  }
  if (progressText) {
    progressText.textContent = "准备中..."
  }
  if (startTestBtn) {
    startTestBtn.disabled = false
    startTestBtn.textContent = "开始测试"
  }
  if (resumeTestBtn) {
    resumeTestBtn.style.display = "none"
    resumeTestBtn.disabled = false
    resumeTestBtn.textContent = "恢复未完成测试"
  }
  if (rorschachImage) {
    rorschachImage.src = ""
  }
  clearCanvas()
  renderWelcomeText()
  showWelcomeCardContainer()
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function showWelcomeCardContainer() {
  const welcomeTextContainer = document.getElementById("welcome-text-container")
  if (welcomeTextContainer) {
    welcomeTextContainer.style.removeProperty("display")
    welcomeTextContainer.classList.remove("hidden")
  }
  if (deviceCheckContainer) {
    deviceCheckContainer.dataset.status = "pending"
    deviceCheckContainer.classList.remove("device-check-alert")
  }
  if (deviceCheckTip) {
    deviceCheckTip.textContent = "请先测试语音播放和麦克风，确保设备正常。"
  }
}

function getCurrentUserId() {
  const userInfo = window.auth ? window.auth.getUserInfo() : null
  if (userInfo?.userId) {
    return String(userInfo.userId)
  }
  if (userInfo?.username) {
    return userInfo.username
  }
  return ""
}

/**
 * 隐藏下载报告相关的UI元素
 * 当显示下载按钮时，隐藏"📈 完整测试汇总"标签和download-report-status元素
 */
function hideSummaryElementsForDownload() {
  // 隐藏"📈 完整测试汇总"标签（summary-view中的h2）
  const summaryView = document.getElementById("summary-view")
  if (summaryView) {
    const h2Elements = summaryView.querySelectorAll("h2")
    h2Elements.forEach((h2) => {
      if (h2.textContent.includes("📈 完整测试汇总")) {
        h2.style.display = "none"
      }
    })
  }

  // 隐藏download-report-status元素
  const statusEl = document.getElementById("download-report-status")
  if (statusEl) {
    statusEl.style.display = "none"
  }
}

function renderSummaryReportSection(container, grid, statusInfo) {
  if (!container || !grid) return
  const reportCard = document.createElement("div")
  reportCard.className = "summary-report-card"

  const retestBtn = document.createElement("button")
  retestBtn.id = "restart-test-btn"
  retestBtn.type = "button"
  retestBtn.textContent = "重新测试"
  retestBtn.addEventListener("click", handleRetestClick)
  reportCard.appendChild(retestBtn)

  const title = document.createElement("h3")
  title.textContent = "感谢您的参与！"
  reportCard.appendChild(title)

  const message = document.createElement("p")
  message.textContent = getReportStatusMessage(statusInfo)
  reportCard.appendChild(message)

  if (statusInfo?.updatedAt) {
    const updated = document.createElement("div")
    updated.textContent = `最近更新：${statusInfo.updatedAt}`
    reportCard.appendChild(updated)
  }

  if (isReportReadyStatus(statusInfo)) {
    const statusEl = document.createElement("div")
    statusEl.id = "download-report-status"
    statusEl.style.display = "none" // 直接隐藏 download-report-status 元素
    reportCard.appendChild(statusEl)

    const downloadBtn = document.createElement("button")
    downloadBtn.id = "download-report-btn"
    downloadBtn.textContent = "📥 下载测试报告"
    downloadBtn.addEventListener("click", downloadReport)
    reportCard.appendChild(downloadBtn)
  }

  // 将 reportCard 插入到 summary-view 中，在 grid 之前
  container.insertBefore(reportCard, grid)

  // 在元素插入到 DOM 后，隐藏"📈 完整测试汇总"标签
  if (isReportReadyStatus(statusInfo)) {
    hideSummaryElementsForDownload()
  }
}

function normalizeReportStatus(value) {
  if (!value) {
    return null
  }
  return String(value).trim().toLowerCase()
}

function isReportReadyStatus(statusInfo) {
  const status = normalizeReportStatus(
    statusInfo?.status || statusInfo?.rawStatus
  )
  return status ? REPORT_READY_STATUSES.has(status) : false
}

function isReportProcessingStatus(statusInfo) {
  const status = normalizeReportStatus(
    statusInfo?.status || statusInfo?.rawStatus
  )
  return status ? REPORT_PROCESSING_STATUSES.has(status) : false
}

function getReportStatusMessage(statusInfo = null) {
  if (statusInfo?.message) {
    return statusInfo.message
  }
  if (isReportReadyStatus(statusInfo)) {
    return "报告已生成，可下载查看"
  }
  return DEFAULT_REPORT_WAITING_STATUS.message
}

function normalizeReportStatusPayload(statusInfo = {}) {
  if (!statusInfo || typeof statusInfo !== "object") {
    return { ...DEFAULT_REPORT_WAITING_STATUS }
  }
  const normalizedStatus = normalizeReportStatus(
    statusInfo.status || statusInfo.rawStatus
  )
  const normalized = {
    ...statusInfo,
    status: normalizedStatus || statusInfo.status || null,
  }
  normalized.message = getReportStatusMessage(normalized)
  return normalized
}

function buildReportStatusFromResponse(response) {
  if (!response) {
    return null
  }

  // 如果响应是 Blob，说明报告已准备好
  if (response instanceof Blob) {
    return normalizeReportStatusPayload({
      status: "ready",
      rawStatus: "ready",
      message: "报告已生成，可下载查看",
      updatedAt: new Date().toLocaleString(),
    })
  }

  if (typeof response !== "object") {
    return null
  }

  // 处理 data 字段：false 或不存在返回 null，true 表示文件存在
  if (
    response.data === false ||
    response.data === undefined ||
    response.data === null
  ) {
    return null
  }
  if (response.data === true) {
    // data 为 true 表示文件存在，返回报告已准备好的状态
    return normalizeReportStatusPayload({
      status: "ready",
      rawStatus: "ready",
      message: "报告已生成，可下载查看",
      updatedAt: new Date().toLocaleString(),
    })
  }

  // 获取 payload：优先从 data/result 获取，如果不存在或不是对象，则使用 response 本身
  let payload = response.data || response.result || response
  if (typeof payload !== "object" || payload === null) {
    return null
  }

  // 提取状态字段
  const rawStatus =
    payload.status ||
    payload.report_status ||
    payload.reportStatus ||
    payload.state ||
    null
  const normalizedStatus = normalizeReportStatus(rawStatus)

  // 检查是否有报告
  const hasReport =
    payload.has_report ||
    payload.hasReport ||
    payload.available ||
    payload.completed ||
    payload.reportReady ||
    payload.report_ready ||
    false

  // 如果状态不在已知状态集中，且没有 hasReport 标志，返回 null
  if (
    !hasReport &&
    !normalizedStatus &&
    !REPORT_READY_STATUSES.has(normalizedStatus || "") &&
    !REPORT_PROCESSING_STATUSES.has(normalizedStatus || "")
  ) {
    return null
  }

  // 构建状态信息对象
  const statusInfo = {
    status: normalizedStatus || rawStatus,
    rawStatus: rawStatus,
    message:
      payload.message || payload.msg || response.message || response.msg || "",
    progress:
      payload.progress ??
      payload.percent ??
      payload.percentage ??
      payload.progress_percent ??
      null,
    updatedAt:
      payload.updated_at ||
      payload.update_time ||
      payload.updatedAt ||
      payload.updateTime ||
      payload.updated_at_time ||
      null,
  }

  return normalizeReportStatusPayload(statusInfo)
}

// 下载报告进度模拟定时器
let downloadProgressInterval = null
let prefetchedReportBlob = null

// 下载报告功能
async function downloadReport() {
  try {
    // 获取用户ID
    const userId = getCurrentUserId()
    if (!userId) {
      alert("用户信息不存在，请重新登录")
      return
    }

    // 更新按钮状态与提示
    const downloadBtn = document.getElementById("download-report-btn")
    const statusEl = document.getElementById("download-report-status")
    if (!downloadBtn) {
      alert("报告尚未生成，当前无法下载。")
      return
    }
    const originalText = downloadBtn.innerHTML
    const estimatedMinSeconds = 10
    const estimatedMaxSeconds = 30
    let blob = null
    let usedPrefetchedBlob = false

    if (prefetchedReportBlob instanceof Blob) {
      blob = prefetchedReportBlob
      prefetchedReportBlob = null
      usedPrefetchedBlob = true
      downloadBtn.innerHTML = "📄 正在准备下载..."
      downloadBtn.disabled = true
      if (statusEl) {
        statusEl.textContent = "✅ 报告已生成，正在准备下载..."
      }
    } else {
      downloadBtn.innerHTML = "📄 报告生成中..."
      downloadBtn.disabled = true

      // 清理旧的进度定时器
      if (downloadProgressInterval) {
        clearInterval(downloadProgressInterval)
        downloadProgressInterval = null
      }

      const startTime = Date.now()

      if (statusEl) {
        statusEl.textContent = `⏳ 正在生成报告，预计约 ${estimatedMinSeconds}~${estimatedMaxSeconds} 秒完成，请耐心等待...`
      }

      // 模拟进度：前 60% 较快，后面缓慢接近 90%
      let fakeProgress = 0
      downloadProgressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime
        if (elapsed < 5000) {
          // 0-5 秒：0% → 60%
          fakeProgress = Math.min(60, (elapsed / 5000) * 60)
        } else if (elapsed < 20000) {
          // 5-20 秒：60% → 90%
          const t = (elapsed - 5000) / 15000
          fakeProgress = 60 + t * 30
        } else {
          // 20 秒后保持在 90%，等待真实完成
          fakeProgress = 90
        }

        const usedSeconds = Math.floor(elapsed / 1000)
        const textParts = [
          `⏳ 正在生成报告（模拟进度 ${Math.round(fakeProgress)}%）`,
          `已用时约 ${usedSeconds} 秒，通常需要 ${estimatedMinSeconds}~${estimatedMaxSeconds} 秒`,
        ]

        if (statusEl) {
          statusEl.textContent = textParts.join("，")
        }
      }, 800)

      blob = await window.API.downloadReport(userId)
    }

    // 清理进度定时器并更新提示
    if (downloadProgressInterval) {
      clearInterval(downloadProgressInterval)
      downloadProgressInterval = null
    }

    if (!(blob instanceof Blob)) {
      throw new Error("服务器返回的数据格式不正确，期望 PDF 文件")
    }

    if (blob.size < 1024) {
      throw new Error("下载的文件大小异常，可能不是有效的 PDF 文件")
    }

    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.style.display = "none"
    a.href = url
    a.download = `rorschach-test-report-${userId}.pdf`
    document.body.appendChild(a)
    a.click()

    // 延迟清理，确保下载开始
    setTimeout(() => {
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }, 100)

    if (statusEl) {
      statusEl.textContent =
        "✅ 报告已生成并开始下载，如浏览器未自动弹出保存，请检查下载栏或稍后重试。"
    }

    // 恢复按钮状态
    downloadBtn.innerHTML = originalText
    downloadBtn.disabled = false

    console.log("[报告下载] 下载成功")
  } catch (error) {
    console.error("[报告下载] 下载失败:", error)

    // 恢复按钮状态
    const downloadBtn = document.getElementById("download-report-btn")
    const statusEl = document.getElementById("download-report-status")

    if (downloadProgressInterval) {
      clearInterval(downloadProgressInterval)
      downloadProgressInterval = null
    }

    if (downloadBtn) {
      downloadBtn.innerHTML = "📥 下载测试报告"
      downloadBtn.disabled = false
    }

    // 提取错误消息，优先显示服务器返回的具体错误信息
    let errorMessage = "报告下载失败，请稍后重试"
    if (error instanceof window.APIError) {
      errorMessage = error.message || errorMessage
    } else if (error.message) {
      errorMessage = error.message
    }

    if (statusEl) {
      statusEl.textContent = `⚠️ ${errorMessage}`
    }

    alert(errorMessage)
  }
}

// 将 downloadReport 函数暴露到全局作用域，以便在需要时可以从外部调用
window.downloadReport = downloadReport

function startInactivityMonitoring() {
  console.log("[不活动检测] 启用不活动检测")
  inactivityActive = true
  resetInactivityTimer()
}

function stopInactivityMonitoring() {
  console.log("[不活动检测] 停用不活动检测")
  inactivityActive = false
  clearTimeout(inactivityTimer)
  state.inactivityLevel = 0
}

// 绘图和变换
function updateTransform(newTransforms = {}, force = false) {
  const startTime = performance.now()

  if (!force) {
    if (typeof newTransforms.zoom === "number") {
      state.zoom = Math.max(0.2, newTransforms.zoom)
    }
    if (typeof newTransforms.rotation === "number") {
      state.rotation = newTransforms.rotation
    }
    if (typeof newTransforms.offsetX === "number") {
      panOffsetX = newTransforms.offsetX
    }
    if (typeof newTransforms.offsetY === "number") {
      panOffsetY = newTransforms.offsetY
    }
  } else {
    if (typeof newTransforms.zoom === "number") {
      state.zoom = newTransforms.zoom
    }
    if (typeof newTransforms.rotation === "number") {
      state.rotation = newTransforms.rotation
    }
    if (typeof newTransforms.offsetX === "number") {
      panOffsetX = newTransforms.offsetX
    }
    if (typeof newTransforms.offsetY === "number") {
      panOffsetY = newTransforms.offsetY
    }
  }

  const translateValue =
    panOffsetX || panOffsetY
      ? `translate(${panOffsetX}px, ${panOffsetY}px) `
      : ""
  const transformValue = `${translateValue}scale(${state.zoom}) rotate(${state.rotation}deg)`

  // 同步更新图片和画布的变换，确保它们在同一调用栈中更新
  // 注意：保持与 main.js 相同的更新顺序和方式
  if (rorschachImage) {
    const beforeImage = rorschachImage.style.transform
    rorschachImage.style.transform = transformValue
  } else {
    console.warn("[updateTransform] rorschachImage 元素不存在")
  }

  if (canvas) {
    const beforeCanvas = canvas.style.transform
    canvas.style.transform = `${CANVAS_BASE_TRANSFORM} ${transformValue}`
  } else {
    console.warn("[updateTransform] canvas 元素不存在")
  }

  // 缩放或旋转变化后，同步更新光标状态
  updateCanvasCursor()

  const elapsed = performance.now() - startTime
}

let lastX = 0,
  lastY = 0

/**
 * 将屏幕坐标转换为画布坐标，考虑当前的缩放与旋转
 * @param {MouseEvent} event
 * @returns {{x: number, y: number}}
 */
function getCanvasCoordinates(event) {
  const rect = canvas.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  const dx = event.clientX - centerX
  const dy = event.clientY - centerY

  const rotationRad = ((state.rotation || 0) * Math.PI) / 180
  const cos = Math.cos(-rotationRad)
  const sin = Math.sin(-rotationRad)
  const scale = state.zoom || 1

  const transformedX = (dx * cos - dy * sin) / scale
  const transformedY = (dx * sin + dy * cos) / scale

  return {
    x: transformedX + canvas.width / 2,
    y: transformedY + canvas.height / 2,
  }
}

function startDrawing(e) {
  // 如果工具状态无效，不开始绘制
  if (state.tool !== "pen" && state.tool !== "eraser") {
    return
  }

  state.drawing = true
  const point = getCanvasCoordinates(e)
  lastX = point.x
  lastY = point.y

  // 追踪画笔轨迹开始（仅记录画笔，不记录橡皮擦）
  if (
    state.tool === "pen" &&
    window.InteractionTracker &&
    window.InteractionTracker._trackDrawingStart
  ) {
    // 获取颜色名称
    const colorName = COLOR_REVERSE_MAP[state.color] || "red"
    window.InteractionTracker._trackDrawingStart(lastX, lastY, colorName)
  }

  // 触发能量柱粒子效果（仅画笔模式）
  if (state.tool === "pen" && window.EnergyPillar) {
    window.EnergyPillar.startDrawing()
  }

  resetInactivityTimer()
}

function draw(e) {
  if (!state.drawing) return
  // 如果工具状态无效，不执行绘制
  if (state.tool !== "pen" && state.tool !== "eraser") {
    return
  }

  const point = getCanvasCoordinates(e)
  const x = point.x
  const y = point.y

  ctx.beginPath()
  if (state.tool === "pen") {
    ctx.globalCompositeOperation = "source-over"
    ctx.strokeStyle = state.color
    ctx.lineWidth = 5
  } else if (state.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out"
    ctx.lineWidth = 20
  }
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(x, y)
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.stroke()

  // 追踪画笔轨迹点（仅记录画笔，不记录橡皮擦）
  if (
    state.tool === "pen" &&
    window.InteractionTracker &&
    window.InteractionTracker._trackDrawingPoint
  ) {
    window.InteractionTracker._trackDrawingPoint(x, y)
  }

  // 能量柱粒子效果：从画笔位置飞向能量柱（仅画笔模式）
  if (
    state.tool === "pen" &&
    window.EnergyPillar &&
    window.EnergyPillar.onDrawMove
  ) {
    // 使用鼠标在视口中的坐标
    window.EnergyPillar.onDrawMove(e.clientX, e.clientY)
  }

  // 擦除时减少能量（擦除轨迹时）
  if (
    state.tool === "eraser" &&
    window.EnergyPillar &&
    typeof window.EnergyPillar.removeEnergy === "function"
  ) {
    // 擦除时减少能量，使用节流避免减少过快
    const now = Date.now()
    if (!window._lastEraseTime) window._lastEraseTime = 0
    if (now - window._lastEraseTime >= 100) {
      // 每 100ms 减少一次能量
      window.EnergyPillar.removeEnergy(5) // 每次减少 5 点能量
      window._lastEraseTime = now
    }
  }

  lastX = x
  lastY = y
  resetInactivityTimer()
}

function stopDrawing() {
  state.drawing = false

  // 追踪画笔轨迹结束（仅画笔模式才记录）
  if (
    state.tool === "pen" &&
    window.InteractionTracker &&
    window.InteractionTracker._trackDrawingEnd
  ) {
    window.InteractionTracker._trackDrawingEnd()
  }

  // 停止能量柱粒子效果
  if (window.EnergyPillar) {
    window.EnergyPillar.stopDrawing()
  }

  saveCanvasState(state.currentIndex)
}

function selectTool(tool) {
  state.tool = tool
  document
    .getElementById("pen-tool")
    .classList.toggle("selected", tool === "pen")
  document
    .getElementById("eraser-tool")
    .classList.toggle("selected", tool === "eraser")
  // 确保一键擦除按钮不被选中
  document.getElementById("clear-all-tool").classList.remove("selected")
  updateCanvasCursor()
}

// 添加专门处理一键擦除按钮选中状态的函数
function selectClearAllTool(selected) {
  // 确保只选中一键擦除按钮
  document
    .getElementById("clear-all-tool")
    .classList.toggle("selected", selected)
  // 确保其他工具按钮不被选中
  if (selected) {
    document.getElementById("pen-tool").classList.remove("selected")
    document.getElementById("eraser-tool").classList.remove("selected")
  }
}

// 颜色映射：将颜色名称转换为十六进制值
const COLOR_MAP = {
  red: "#ef4444",
  green: "#10b981",
  blue: "#3b82f6",
}

// 反向映射：从十六进制值映射回颜色名称
const COLOR_REVERSE_MAP = {
  "#ef4444": "red",
  "#10b981": "green",
  "#3b82f6": "blue",
}

function selectColor(color) {
  // 如果传入的是颜色名称，转换为十六进制值；否则直接使用
  state.color = COLOR_MAP[color] || color
  document.querySelectorAll(".color-option").forEach((opt) => {
    opt.classList.toggle("selected", opt.dataset.color === color)
  })
  // 确保一键擦除按钮不被选中
  document.getElementById("clear-all-tool").classList.remove("selected")
}

// 初始化颜色选择器状态，确保与 state.color 一致
function syncColorSelectorState() {
  const colorName = COLOR_REVERSE_MAP[state.color] || "red"
  document.querySelectorAll(".color-option").forEach((opt) => {
    opt.classList.toggle("selected", opt.dataset.color === colorName)
  })
}

function saveCanvasState(index) {
  if (canvas.width > 0 && canvas.height > 0) {
    state.canvasStates[index] = canvas.toDataURL()
    saveSessionSnapshot("drawing")
  }
}

function loadCanvasState(index) {
  clearCanvas()
  const dataUrl = state.canvasStates[index]
  if (dataUrl) {
    const img = new Image()
    img.src = dataUrl
    img.onload = () => ctx.drawImage(img, 0, 0)
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

// 一键清除所有绘图
function clearAllDrawing() {
  // 停止当前绘制（如果有），并结束轨迹记录
  if (state.drawing) {
    stopDrawing()
  }

  clearCanvas()

  // 重置画布上下文状态，确保画笔可以正常使用
  ctx.globalCompositeOperation = "source-over"
  ctx.strokeStyle = state.color || "#ef4444"
  ctx.lineWidth = 5
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.beginPath()

  // 保存空的画布状态
  saveCanvasState(state.currentIndex)

  // 一键擦除时减少能量（减少当前能量的 50%，但至少减少 50 点）
  if (
    window.EnergyPillar &&
    typeof window.EnergyPillar.getEnergy === "function" &&
    typeof window.EnergyPillar.removeEnergy === "function"
  ) {
    const currentEnergy = window.EnergyPillar.getEnergy()
    if (currentEnergy > 0) {
      // 减少当前能量的 50%，但至少减少 50 点
      const reduceAmount = Math.max(50, Math.floor(currentEnergy * 0.5))
      window.EnergyPillar.removeEnergy(reduceAmount)
      console.log(
        "[一键擦除] 能量减少:",
        reduceAmount,
        "当前能量:",
        currentEnergy - reduceAmount
      )
    }
  }

  // 记录一键擦除操作
  if (window.InteractionTracker && window.InteractionTracker._trackClearAll) {
    window.InteractionTracker._trackClearAll()
  }
}

// 等待模块加载完成
function waitForModules(callback, maxRetries = 50) {
  let retries = 0
  const checkModules = () => {
    // 检查所有必需的模块：auth、apiClient 和 API
    if (window.auth && window.apiClient && window.API) {
      callback()
    } else if (retries < maxRetries) {
      retries++
      setTimeout(checkModules, 100)
    } else {
      console.error("模块加载超时，跳转到登录页")
      window.location.href = "./login.html"
    }
  }
  checkModules()
}

function stopAllPlayback() {
  try {
    if (
      window.dialogClient &&
      typeof window.dialogClient.stopPlayback === "function"
    ) {
      window.dialogClient.stopPlayback()
    }
  } catch (err) {
    console.warn("[播放控制] 停止实时播报失败:", err)
  }
  if (audioPlayer && !audioPlayer.paused) {
    try {
      audioPlayer.pause()
      audioPlayer.currentTime = 0
    } catch (err) {
      console.warn("[播放控制] 停止音频元素失败:", err)
    }
  }
}

async function playWelcomeMessage() {
  if (!shouldPlayWelcomeMessage || isCheckingReportStatus) {
    return
  }
  hideIntroImage()
  // displayWelcomeText()
  const welcomeText = getWelcomeText()

  try {
    // 欢迎语属于测试前阶段，使用 pretest phase；确保TTS已初始化
    TTS.currentPhase = "pretest"
    await ensureTTSInit("audio", "pretest")

    // 构造播报查询
    const welcomeQuery = buildTTSQuery(welcomeText)

    // 发送播报请求
    await sendTextQuery(welcomeQuery, { ensure: false })

    console.log("[欢迎页] 欢迎信息播报已发送")
  } catch (error) {
    console.warn("[欢迎页] 欢迎信息播报失败:", error)
  }
}

//知己心探心理测试需要坐在电脑前，使用本网站，采用语音交互完成。
//首先，确定您的电脑话筒和音响正常，测试期间，您需要根据 AI 语音的指示进行测试。
//心理测试全程时长大概 30 min 至最长约 2 小时，测试时需要保持安静，在一个安静、放松的环境里，不被外界电话、信息打扰。
//测试后大约 1~3 天会收到测试报告。

const WELCOME_TEXT_CONTENT = Object.freeze({
  intro:
    "Hello，亲爱的用户您好，欢迎来到知己心探心理测试，在测试前，需要跟您确认以下几点：",
  points: [
    "1.首先，请先在网页左侧，填写您的个人信息",
    "2.测试需要在台式电脑或笔记本电脑上进行，请确保您的电脑麦克风和音响正常。您可以在浏览器上配置您的麦克风，并利用下方的设备测试按钮，检测您的麦克风和音响状态。",
    "3.需要提醒您的是，测试时需要保持您周围的环境安静，避免被外界的电话、微信消息打扰，只有这样才能达到最好的测试效果",
    "4.整个心理测试过程采用数字人语音交互完成，确保您的信息隐私安全，请放心。",
    "5.如果以上信息确认完毕，那么请点击蓝色的开始测试按钮，我们将向您介绍心理测试的具体操作流程",
  ],
})

function getWelcomeText() {
  // TTS 播报时去掉英文品牌 InnerScan，只保留页面展示中的完整文案
  const introForTTS = WELCOME_TEXT_CONTENT.intro.replace("（InnerScan）", "")
  const bulletLines = WELCOME_TEXT_CONTENT.points.map((point) => `- ${point}`)
  return [introForTTS, ...bulletLines].join("\n")
}

function renderWelcomeText() {
  const welcomeTextContainer = document.getElementById("welcome-text-container")
  if (!welcomeTextContainer) {
    return
  }
  const bulletItems = WELCOME_TEXT_CONTENT.points
    .map(
      (point) => `<li><span class="welcome-dot"></span><div>${point}</div></li>`
    )
    .join("")
  welcomeTextContainer.innerHTML = `
        <div class="welcome-card">
            <div class="welcome-badge">
                <div class="welcome-icon">🎧</div>
                <div>
                    <p class="welcome-label">测试准备</p>
                    <h2>开始之前，请先确认这些事项</h2>
                </div>
            </div>
            <p class="welcome-intro">${WELCOME_TEXT_CONTENT.intro}</p>
            <ul class="welcome-list">${bulletItems}</ul>
            <div id="device-check-container" class="device-check" data-status="pending">
                <div class="device-check-header">
                    <div class="device-check-icon">🎧</div>
                    <div>
                        <p class="device-check-title">设备检测</p>
                        <p id="device-check-tip" class="device-check-tip">请先测试语音播放和麦克风，确保设备正常。</p>
                    </div>
                </div>
                <p class="device-check-desc">
                    点击下方按钮播放测试音，并在浏览器弹出提示时允许使用麦克风，然后对着麦克风说一句平时说话的句子。
                </p>
                <div class="device-check-actions">
                    <button type="button" data-action="speaker-test">🔊 测试语音（音响）播放</button>
                    <button type="button" data-action="mic-test">🎙️ 检测麦克风（测试时请说话）</button>
                </div>
                <div class="device-check-result" data-role="device-check-result">等待检测</div>
            </div>
        </div>
    `
  welcomeTextContainer.style.removeProperty("display")
  welcomeTextContainer.classList.remove("hidden")
  // welcome-card 渲染完成后初始化设备检测
  deviceCheckContainer = document.getElementById("device-check-container")
  deviceCheckTip = document.getElementById("device-check-tip")
  if (deviceCheckContainer && deviceCheckTip) {
    initDeviceCheck({
      startButton: startTestBtn,
      resumeButton: resumeTestBtn,
      tipElement: deviceCheckTip,
      container: deviceCheckContainer,
    })
  }
}

function hideWelcomeText() {
  const welcomeTextContainer = document.getElementById("welcome-text-container")
  if (!welcomeTextContainer) {
    return
  }
  welcomeTextContainer.classList.add("hidden")
  setTimeout(() => {
    welcomeTextContainer.style.display = "none"
  }, 250)
}

// 隐藏intro-image元素
function hideIntroImage() {
  if (introPreviewImage) {
    introPreviewImage.style.visibility = "hidden"
  }
}

// 显示intro-image元素
function showIntroImage() {
  if (introPreviewImage) {
    introPreviewImage.style.visibility = "visible"
  }
}

// 更新登录/退出UI显示
function updateAuthUI() {
  const authControls = document.getElementById("auth-controls")
  const loginBtn = document.getElementById("login-btn")
  const logoutBtn = document.getElementById("logout-btn")
  const usernameDisplay = document.getElementById("username-display")

  if (!authControls || !loginBtn || !logoutBtn || !usernameDisplay) {
    return
  }

  if (window.auth && window.auth.isLoggedIn()) {
    // 已登录：显示用户名和退出按钮
    const userInfo = window.auth.getUserInfo()
    const username = userInfo?.username || userInfo?.phone
    usernameDisplay.textContent = username
    authControls.style.display = "flex"
    loginBtn.style.display = "none"
  } else {
    // 未登录：显示登录按钮
    authControls.style.display = "none"
    loginBtn.style.display = "block"
  }
}

// 绑定登录/退出按钮事件
function setupAuthControls() {
  const loginBtn = document.getElementById("login-btn")
  const logoutBtn = document.getElementById("logout-btn")

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      window.location.href = "./login.html"
    })
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (!window.auth) {
        console.error("认证模块未加载")
        return
      }

      // 标记正在退出，阻止 beforeunload 保存会话数据
      window._isLoggingOut = true

      try {
        // 显示退出中状态
        logoutBtn.disabled = true
        logoutBtn.textContent = "退出中..."

        // 调用登出接口
        await window.auth.logout()

        // 跳转到登录页
        window.location.href = "./login.html"
      } catch (error) {
        console.error("退出失败:", error)
        // 即使出错，也跳转到登录页
        window.location.href = "./login.html"
      }
    })
  }

  // 测试提交按钮 - 用于测试混合音频上传功能
  const testSubmitBtn = document.getElementById("test-audio-btn")
  if (testSubmitBtn) {
    testSubmitBtn.addEventListener("click", async () => {
      console.log("[测试音频] ========== 开始测试 ==========")

      const userId = getCurrentUserId()
      if (!userId) {
        alert("请先登录")
        return
      }

      // 检查 dialogClient 是否存在（用于混合录音）
      const hasDialogClient = !!window.dialogClient

      // 检查混合录音状态
      if (hasDialogClient) {
        const mixedStatus = window.dialogClient.getMixedRecordingStatus?.() || {}
        console.log("[测试音频] 混合录音状态:", mixedStatus)

        // 如果正在混合录音，停止并上传
        if (mixedStatus.isRecording) {
          console.log("[测试音频] 停止混合录音...")
          testSubmitBtn.disabled = true
          testSubmitBtn.textContent = "处理中..."

          try {
            const mixedBlob = await window.dialogClient.stopMixedRecording()
            console.log("[测试音频] 混合录音已停止，大小:", (mixedBlob?.size / 1024 / 1024).toFixed(2), "MB")

            if (mixedBlob && mixedBlob.size > 0) {
              testSubmitBtn.textContent = "上传中..."
              const result = await window.API.uploadMedia(mixedBlob, userId)
              console.log("[测试音频] 上传结果:", result)

              testSubmitBtn.textContent = "✅ 成功"
              testSubmitBtn.style.background = "#10b981"
              alert("混合音频上传成功!\n文件大小: " + (mixedBlob.size / 1024 / 1024).toFixed(2) + "MB\n包含: AI语音 + 用户语音")
            } else {
              alert("混合录音数据为空")
            }
          } catch (error) {
            console.error("[测试音频] 处理失败:", error)
            testSubmitBtn.textContent = "❌ 失败"
            testSubmitBtn.style.background = "#ef4444"
            alert("失败: " + error.message)
          } finally {
            setTimeout(() => {
              testSubmitBtn.disabled = false
              testSubmitBtn.textContent = "测试音频"
              testSubmitBtn.style.background = "#4CAF50"
            }, 2000)
          }
          return
        }

        // 如果没有在混合录音，启动混合录音
        console.log("[测试音频] 启动混合录音...")
        try {
          await window.dialogClient.startMixedRecording()
          testSubmitBtn.textContent = "混合录音中(点击停止)"
          testSubmitBtn.style.background = "#ef4444"
          alert("混合录音已开始！\n正在录制: AI语音 + 用户语音\n请说几句话，然后再次点击按钮停止并上传。")
        } catch (err) {
          console.error("[测试音频] 启动混合录音失败:", err)
          alert("启动混合录音失败: " + err.message)
        }
        return
      }

      // 如果没有 dialogClient，使用普通 MediaRecorder
      console.log("[测试音频] 使用普通 MediaRecorder")

      if (!state.mediaRecorder) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          state.mediaRecorder = new MediaRecorder(stream)
          state.mediaRecorder.ondataavailable = (event) => {
            state.audioChunks.push(event.data)
          }
          state.mediaRecorder.onstop = () => {
            state.audioBlob = new Blob(state.audioChunks, { type: "audio/webm" })
          }
        } catch (err) {
          alert("无法访问麦克风: " + err.message)
          return
        }
      }

      if (state.mediaRecorder.state === "inactive") {
        state.audioChunks = []
        state.mediaRecorder.start()
        testSubmitBtn.textContent = "录音中(点击停止)"
        testSubmitBtn.style.background = "#ef4444"
        return
      }

      if (state.mediaRecorder.state === "recording") {
        testSubmitBtn.disabled = true
        testSubmitBtn.textContent = "处理中..."

        await new Promise((resolve) => {
          const orig = state.mediaRecorder.onstop
          state.mediaRecorder.onstop = (e) => { if (orig) orig(e); resolve() }
          state.mediaRecorder.stop()
        })

        const blob = state.audioBlob || new Blob(state.audioChunks, { type: "audio/webm" })
        if (blob && blob.size > 0) {
          try {
            testSubmitBtn.textContent = "上传中..."
            await window.API.uploadMedia(blob, userId)
            testSubmitBtn.textContent = "✅ 成功"
            testSubmitBtn.style.background = "#10b981"
            alert("上传成功! 大小: " + (blob.size / 1024 / 1024).toFixed(2) + "MB")
          } catch (error) {
            testSubmitBtn.textContent = "❌ 失败"
            testSubmitBtn.style.background = "#ef4444"
            alert("上传失败: " + error.message)
          }
        }

        setTimeout(() => {
          testSubmitBtn.disabled = false
          testSubmitBtn.textContent = "测试音频"
          testSubmitBtn.style.background = "#4CAF50"
        }, 2000)
      }
    })
  }

  // 测试轨迹上传按钮
  const testTracksBtn = document.getElementById("test-tracks-btn")
  if (testTracksBtn) {
    testTracksBtn.addEventListener("click", async () => {
      console.log("[测试] 点击测试轨迹上传按钮")
      try {
        const userId = getCurrentUserId()
        if (!userId) {
          alert("请先登录")
          return
        }

        const drawingTracks = window.InteractionTracker?.getDrawingTracks?.()
        console.log("[测试] 获取到的轨迹数据:", drawingTracks)

        if (!drawingTracks || Object.keys(drawingTracks).length === 0) {
          alert("没有轨迹数据可上传")
          return
        }

        const result = await window.API.uploadDrawingTracks(drawingTracks, userId)
        console.log("[测试] uploadDrawingTracks 结果:", result)
        alert("轨迹上传成功，请查看控制台")
      } catch (error) {
        console.error("[测试] uploadDrawingTracks 错误:", error)
        alert("轨迹上传失败: " + error.message)
      }
    })
  }
}

async function routeToReportSummaryIfAvailable() {
  if (!window.API) {
    return false
  }
  const userId = getCurrentUserId()
  if (!userId) {
    return false
  }

  try {
    // 1. 先检查用户是否已提交过测试数据
    if (typeof window.API.checkUploadFilesStatus === "function") {
      const uploadStatus = await window.API.checkUploadFilesStatus(userId)
    
      // 如果用户未提交数据（data 不为 true），不跳转
      if (uploadStatus.code != 0 || uploadStatus.data !== true) {
        return false
      }
    } else {
      // 接口不存在，不跳转
      return false
    }

    // 2. 用户已提交数据，获取报告状态（用于设置提示文案）
    let statusInfo = null
    if (typeof window.API.checkReportStatus === "function") {
      const response = await window.API.checkReportStatus(userId)

      statusInfo = buildReportStatusFromResponse(response)
    }

    // 3. 如果没有状态信息，使用默认等待状态
    if (!statusInfo) {
      statusInfo = {
        status: "processing",
        message: "报告生成中，请稍候...",
        uploaded: true,
      }
    }

    latestReportStatus = statusInfo
    showSummary({ reportStatus: statusInfo })
    return true
  } catch (error) {
    console.warn("[Report] 检查报告状态失败:", error)
    return false
  }
}

// 登录检查和初始化
async function checkLoginAndInit() {
  // 先更新UI（无论是否登录）
  updateAuthUI()

  if (!window.auth.isLoggedIn()) {
    // 未登录：跳转到登录页
    window.location.href = "./login.html"
    return
  }

  // 如果存在token，验证token是否有效
  try {
    const result = await window.API.validateToken()
    if (!result.valid) {
      if (result.cleared) {
        console.log(
          "[AppMain] Token已过期或无效，API已清除本地存储，跳转到登录页"
        )
      } else {
        console.log("[AppMain] Token验证失败，清除本地token，跳转到登录页")
        if (window.auth && typeof window.auth.clearAllStorage === "function") {
          window.auth.clearAllStorage()
        }
      }
      // 跳转到登录页
      window.location.href = "./login.html"
      return
    }
  } catch (error) {
    console.warn("[AppMain] Token验证异常，但继续流程:", error)
  }

  // 正常登录时，清除重测标记（确保报告检查不会被跳过）
  // 只有在重测流程中才会重新设置这个标记
  if (!retestFlowActive) {
    setSkipReportRedirectFlag(false)
  }

  // 获取用户基本信息并填充表单
  try {
    const userInfo = window.auth.getUserInfo()
    if (userInfo?.username) {
      const response = await window.API.getBasicInfo(userInfo.username)
      if (response?.code === 0 && response?.data) {
        const basicInfo = response.data
        // 填充到 state.basicInfoDraft
        if (basicInfo.sex) state.basicInfoDraft.sex = basicInfo.sex
        if (basicInfo.age) state.basicInfoDraft.age = String(basicInfo.age)
        if (basicInfo.education)
          state.basicInfoDraft.education = basicInfo.education
        if (basicInfo.occupation)
          state.basicInfoDraft.occupation = basicInfo.occupation
        if (basicInfo.mood) state.basicInfoDraft.mood = basicInfo.mood
        // 应用到表单
        applyBasicInfoDraftToInputs()
        console.log("[AppMain] 已填充用户基本信息:", basicInfo)
      }
    }
  } catch (error) {
    console.warn("[AppMain] 获取用户基本信息失败:", error)
  }

  // 已登录：先显示全屏加载状态，再根据下载报告接口结果决定是否跳转报告页
  showReportCheckLoading()
  try {
    // 优先尝试跳转报告页（除非正在准备重新测试）
    let routedToSummary = false
    if (!shouldSkipReportRedirect()) {
      routedToSummary = await routeToReportSummaryIfAvailable()
    }
    if (routedToSummary) {
      // 已跳转报告页，不再播报欢迎语
      disableWelcomeMessagePlayback()
      return
    }
  } finally {
    // 无论是否跳转到报告页，都结束登录后的加载状态
    hideReportCheckLoading()
  }

  // 继续初始化测试流程
  configureSessionPersistence()
  ensureSessionId()
  setupEventListeners()
  showResumeOptionIfAvailable(true)
}

window.addEventListener("beforeunload", () => {
  // 如果正在退出登录，不保存会话数据
  if (window._isLoggingOut) {
    return
  }
  saveSessionSnapshot("beforeunload", { immediate: true })
})

/**
 * 初始化黑洞粒子背景（通用函数，可被其他函数复用）
 * @param {Object} options - 初始化选项
 * @param {number} options.themeIndex - 主题索引（默认0）
 * @param {boolean} options.forceInit - 是否强制重新初始化（默认false）
 * @param {string} options.logPrefix - 日志前缀（用于标识调用来源）
 * @param {boolean} options.showContainer - 是否显示背景容器（默认true）
 * @returns {boolean} 是否初始化成功
 */
function initBlackHoleBackground(options = {}) {
  const {
    themeIndex = 0,
    forceInit = false,
    logPrefix = "[背景初始化]",
    showContainer = true,
  } = options

  // 检查 BlackHoleBackground 模块是否加载
  if (!window.BlackHoleBackground || !window.BlackHoleBackground.init) {
    return false
  }

  const bgContainer = document.getElementById("blackhole-bg-container")
  if (!bgContainer) {
    console.warn(`${logPrefix} 背景容器未找到`)
    return false
  }

  // 如果已初始化且不强制重新初始化，只确保显示
  if (bgContainer.dataset.initialized === "true" && !forceInit) {
    if (showContainer) {
      bgContainer.style.display = "block"
    }
    // 如果提供了主题索引，切换主题
    if (window.BlackHoleBackground.switchTheme && themeIndex !== undefined) {
      window.BlackHoleBackground.switchTheme(themeIndex)
    }
    return true
  }

  // 执行初始化
  try {
    window.BlackHoleBackground.init("blackhole-bg-container")
    bgContainer.dataset.initialized = "true"

    // 设置主题
    if (window.BlackHoleBackground.switchTheme && themeIndex !== undefined) {
      window.BlackHoleBackground.switchTheme(themeIndex)
    }

    // 显示背景容器
    if (showContainer) {
      bgContainer.style.display = "block"
    }

    console.log(`${logPrefix} 黑洞粒子背景已初始化，主题索引: ${themeIndex}`)
    return true
  } catch (error) {
    console.warn(`${logPrefix} 背景初始化失败:`, error)
    return false
  }
}

/**
 * 初始化背景（在页面加载时，带延迟重试机制）
 */
function initBackgroundForIntro() {
  const success = initBlackHoleBackground({
    themeIndex: 0,
    logPrefix: "[初始化-信息填写页]",
  })

  if (!success) {
    // 如果 BlackHoleBackground 还未加载，延迟重试
    setTimeout(initBackgroundForIntro, 100)
  }
}

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  // 初始化背景（信息填写页和介绍页都需要显示）
  initBackgroundForIntro()

  // 确保能量柱容器初始状态为隐藏
  const energyPillarContainer = document.getElementById(
    "energy-pillar-container"
  )
  if (energyPillarContainer) {
    energyPillarContainer.style.display = "none"
    energyPillarContainer.classList.remove("visible")
  }

  // 确保初始状态不是测试模式
  document.body.classList.remove("test-mode")

  renderWelcomeText()
  // 先设置登录/退出按钮事件（不依赖模块加载）
  setupAuthControls()
  // 等待模块加载完成后检查登录状态
  waitForModules(() => {
    // 先更新UI（即使未登录也显示登录按钮）
    updateAuthUI()
    // 然后执行原有的初始化逻辑
    checkLoginAndInit().catch((error) => {
      console.error("[Init] 初始化失败:", error)
    })
  })
  welcomeMessageTimer = setTimeout(() => {
    if (shouldPlayWelcomeMessage) {
      playWelcomeMessage()
    }
  }, 1000)

  // 开发调试：直接进入 mood 问题
  setTimeout(() => {
    showPostTestView()
    currentQuestionIndex = 10
    askNextQuestion()
  }, 100)
})
