import { driver as createDriver } from "https://esm.run/driver.js@1.3.2"

const INTRO_GUIDE_STORAGE_KEY = "xlcs:introGuideSeen"

let introDriver = null
let introGuideResizeObserver = null
let introGuideImageListenerCleanup = null
let introRefreshRaf = null
let autoAdvanceTimer = null
let arrowPositionObserver = null
let lastArrowTop = null

const driverOptions = {
  animate: true,
  showProgress: true,
  stageBackground: "rgba(15, 23, 42, 0.85)",
  padding: 12,
  showButtons: false,
  allowClose: true,
  opacity: 0.85,
  popoverClass: "intro-driver-popover",
  nextBtnText: "下一步",
  prevBtnText: "上一步",
  doneBtnText: "开始体验",
}

function buildIntroSteps() {
  const steps = []

  const imageArea = document.querySelector(".test-preview-image-frame")
  if (imageArea) {
    steps.push({
      element: imageArea,
      popover: {
        title: "图版预览区",
        description:
          "这里展示当前的墨迹图版，可在预览中体验画笔和旋转缩放等操作。",
        showButtons: [], // 不显示任何按钮
        popoverClass: "intro-step-1-popover", // 自定义类名，用于区分第一步
      },
    })
  }

  // const prevGroup = document.querySelector(
  //   ".test-preview-controls .control-group:first-child"
  // )
  // if (prevGroup) {
  //   steps.push({
  //     element: prevGroup,
  //     popover: {
  //       title: "切换图版",
  //       description: "通过上一张按钮回顾之前的图版，逐步熟悉作答节奏。",
  //     },
  //   })
  // }

  // const nextGroup = document.querySelector(
  //   ".test-preview-controls .control-group:last-child"
  // )
  // if (nextGroup) {
  //   steps.push({
  //     element: nextGroup,
  //     popover: {
  //       title: "继续下一张",
  //       description: "完成记录后点击下一张进入新的图版，保持稳定作答节奏。",
  //     },
  //   })
  // }

  // 使用更稳定的选择器：通过按钮的data-action属性定位父元素
  const zoomInBtn = document.querySelector(
    ".test-preview-controls button[data-action='zoom-in']"
  )
  const zoomGroup = zoomInBtn?.closest(".control-group")
  if (zoomGroup) {
    steps.push({
      element: zoomGroup,
      popover: {
        title: "缩放与旋转",
        description: "通过放大、缩小、旋转按钮调整视角，便于观察细节。",
        showButtons: [], // 不显示任何按钮
        side: "right", // 箭头在右侧
        align: "end", // 箭头对齐到底部，生成 driver-popover-arrow-align-end class
        popoverClass: "intro-step-2-popover", // 自定义类名，用于区分第二步
      },
    })
  }

  // 合并画笔相关步骤：将画笔工具、颜色选择、擦除工具、一键擦除合并为一个步骤
  const penBtn = document.querySelector(
    ".test-preview-controls button[data-action='pen']"
  )
  const penGroup = penBtn?.closest(".control-group")
  if (penGroup) {
    steps.push({
      element: penGroup,
      popover: {
        title: "绘图工具组",
        description:
          "画笔用于标记观察到的区域，支持三种标注颜色切换。轻点擦除工具可修正笔迹，一键擦除可清空画布。进入正式测试前先在预览里熟悉这些操作。",
        showButtons: [], // 不显示任何按钮
        side: "right", // 箭头在右侧
        align: "end", // 箭头对齐到底部
        popoverClass: "intro-step-3-popover", // 自定义类名，用于区分第三步
      },
    })
  }

  return steps
}

function getIntroGuideStorageKey() {
  try {
    const authUser = window?.auth?.getUserInfo?.()
    if (authUser?.username) {
      return `${INTRO_GUIDE_STORAGE_KEY}:${authUser.username}`
    }

    const storedUserInfo = localStorage.getItem("userInfo")
    if (storedUserInfo) {
      const parsedUserInfo = JSON.parse(storedUserInfo)
      if (parsedUserInfo?.username) {
        return `${INTRO_GUIDE_STORAGE_KEY}:${parsedUserInfo.username}`
      }
    }
  } catch (error) {
    // 解析用户信息失败，使用默认存储键
  }

  return INTRO_GUIDE_STORAGE_KEY
}

function hasSeenIntroGuide() {
  const storageKey = getIntroGuideStorageKey()
  try {
    return localStorage.getItem(storageKey) === "1"
  } catch (error) {
    return false
  }
}

function markIntroGuideSeen() {
  const storageKey = getIntroGuideStorageKey()
  try {
    localStorage.setItem(storageKey, "1")
  } catch (error) {
    // 记录引导提示状态失败
  }
}

// 辅助函数：查找当前活动的 popover（支持自定义 popoverClass）
function findActivePopover() {
  return (
    document.querySelector(".intro-driver-popover") ||
    document.querySelector(".intro-step-1-popover") ||
    document.querySelector(".intro-step-2-popover") ||
    document.querySelector(".intro-step-3-popover") ||
    document.querySelector('[class*="intro-step"][class*="popover"]')
  )
}

export function startIntroGuide() {
  if (hasSeenIntroGuide()) {
    return
  }

  const introOverlay = document.getElementById("intro-overlay")
  if (!introOverlay || introOverlay.style.display === "none") {
    return
  }

  const steps = buildIntroSteps()
  if (!steps.length) {
    return
  }

  if (introDriver) {
    introDriver.destroy()
    introDriver = null
  }
  teardownGuideSyncHooks()

  const config = createAutoAdvanceConfig()

  introDriver = createDriver({
    ...driverOptions,
    steps,
    onHighlightStarted: (element, step, options) => {
      // 通过 element 提前识别步骤
      let stepNumber = null
      let stepTitle = null
      if (element) {
        if (
          element.classList.contains("test-preview-image-frame") ||
          element.id === "intro-preview-image"
        ) {
          stepNumber = "1"
          stepTitle = "图版预览区"
        } else if (
          element.querySelector('button[data-action="zoom-in"]') ||
          element.querySelector('button[data-action="zoom-out"]')
        ) {
          stepNumber = "2"
          stepTitle = "缩放与旋转"
          const zoomInBtn = element.querySelector(
            'button[data-action="zoom-in"]'
          )
        } else if (
          element.querySelector('button[data-action="pen"]') ||
          element.querySelector('button[data-action="erase"]')
        ) {
          stepNumber = "3"
          stepTitle = "绘图工具组"
        }
      }

      // 清理之前的观察器
      if (arrowPositionObserver) {
        arrowPositionObserver.disconnect()
        arrowPositionObserver = null
      }
      lastArrowTop = null

      // 等待 popover 创建后一次性设置所有属性
      const setupPopoverOnce = () => {
        const popover = findActivePopover()
        if (!popover) {
          return false
        }

        // 如果已经设置过，不再重复设置，但确保关闭按钮显示
        const popoverId = popover.getAttribute("data-step-id")
        if (popoverId === stepNumber) {
          // 即使已设置过，也要确保关闭按钮显示（可能被 driver.js 覆盖）
          const closeBtn =
            popover.querySelector(".driver-popover-close-btn") ||
            popover.querySelector(".driver-close-btn")
          if (closeBtn) {
            closeBtn.style.display = "block"
          }
          return true
        }

        // 设置 data-step 属性
        if (stepNumber) {
          popover.setAttribute("data-step", stepNumber)
          popover.setAttribute("data-step-id", stepNumber)
        } else {
          // 备用方案：通过标题识别
          const title = popover.querySelector(".driver-popover-title")
          if (title) {
            const titleText = title.textContent?.trim()
            if (titleText === "图版预览区") {
              stepNumber = "1"
              popover.setAttribute("data-step", "1")
              popover.setAttribute("data-step-id", "1")
            } else if (titleText === "缩放与旋转") {
              stepNumber = "2"
              popover.setAttribute("data-step", "2")
              popover.setAttribute("data-step-id", "2")
            } else if (titleText === "绘图工具组") {
              stepNumber = "3"
              popover.setAttribute("data-step", "3")
              popover.setAttribute("data-step-id", "3")
            }
          }
        }

        // 隐藏按钮
        const nextButtons = popover.querySelectorAll(
          '[data-action="next"], .driver-next-btn'
        )
        const prevButtons = popover.querySelectorAll(
          '[data-action="prev"], .driver-prev-btn'
        )
        ;[...nextButtons, ...prevButtons].forEach((btn) => {
          if (btn) {
            btn.style.display = "none"
          }
        })

        // 确保关闭按钮显示
        const closeBtn =
          popover.querySelector(".driver-popover-close-btn") ||
          popover.querySelector(".driver-close-btn")
        if (closeBtn) {
          closeBtn.style.display = "block"
        }

        // 设置箭头 class（只设置一次）
        const arrow = popover.querySelector(".driver-popover-arrow")
        if (arrow && stepNumber) {
          const arrowClasses = arrow.className
          const computedStyle = window.getComputedStyle(arrow)
          const arrowTop = arrow.style.top || "未设置"
          const arrowTransform = arrow.style.transform || "未设置"
          const computedTop = computedStyle.top
          const computedTransform = computedStyle.transform

          // 移除旧的步骤 class
          arrow.classList.remove("intro-step-1", "intro-step-2", "intro-step-3")
          // 添加新的步骤 class
          arrow.classList.add(`intro-step-${stepNumber}`)

          const newClass = `intro-step-${stepNumber}`
          const allClasses = arrow.className

          // 记录箭头位置变化
          const currentTop = computedStyle.top
          lastArrowTop = currentTop

          // 强制设置箭头位置的函数（针对第二步）
          const forceArrowPosition = () => {
            if (stepNumber === "2") {
              const finalArrow = popover.querySelector(".driver-popover-arrow")
              if (!finalArrow) {
                return
              }

              const finalComputedStyle = window.getComputedStyle(finalArrow)
              const currentTop = finalComputedStyle.top
              const currentBottom = finalComputedStyle.bottom
              const currentTransform = finalComputedStyle.transform
              const arrowClasses = finalArrow.className
              const targetTop = "55px"

              // 检查位置是否正确（处理空字符串、auto等情况）
              const currentTopNum = parseFloat(currentTop)
              const targetTopNum = 55
              const needsFix =
                !currentTop ||
                currentTop === "auto" ||
                currentTop === "" ||
                (currentTop !== targetTop &&
                  (isNaN(currentTopNum) ||
                    Math.abs(currentTopNum - targetTopNum) > 0.1))

              if (needsFix) {
                // 直接设置内联样式，优先级最高
                finalArrow.style.top = targetTop
                finalArrow.style.bottom = "auto"
                finalArrow.style.transform = "none"
              }
            }
          }

          // 监听箭头位置变化
          arrowPositionObserver = new MutationObserver((mutations) => {
            const newTop = window.getComputedStyle(arrow).top
            if (lastArrowTop !== null && lastArrowTop !== newTop) {
              lastArrowTop = newTop

              // 如果是第二步且位置不正确，强制修正
              if (stepNumber === "2") {
                setTimeout(() => forceArrowPosition(), 10)
              }
            }
          })

          arrowPositionObserver.observe(arrow, {
            attributes: true,
            attributeFilter: ["style", "class"],
          })

          // 也监听 popover 的变化
          arrowPositionObserver.observe(popover, {
            attributes: true,
            attributeFilter: ["style", "class"],
          })

          // 等待driver.js完成初始位置计算后再应用位置修正
          // 延迟更长时间，确保 driver.js 完成所有位置计算
          if (stepNumber === "2") {
            // 第一次尝试：在 onHighlighted 之前
            setTimeout(() => forceArrowPosition(), 300)
            // 第二次尝试：在 onHighlighted 之后（作为备用）
            setTimeout(() => forceArrowPosition(), 500)
          }
        }

        return true
      }

      // 立即尝试设置
      if (!setupPopoverOnce()) {
        // 如果 popover 还没创建，使用 MutationObserver 监听
        const observer = new MutationObserver((mutations) => {
          if (setupPopoverOnce()) {
            observer.disconnect()
          }
        })
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        })
        setTimeout(() => {
          observer.disconnect()
          setupPopoverOnce() // 最后一次尝试
        }, 1000)
      }

      // 不再在 onHighlightStarted 中调用 scheduleDriverRefresh
      // 因为此时 driver.js 还在初始化，刷新会导致位置重新计算
      // 只在 ResizeObserver 等真正需要时才刷新
    },
    onHighlighted: (element, step, options) => {
      // 不再在这里调用 scheduleDriverRefresh
      // 因为 driver.js 已经完成了位置计算，刷新会导致位置重新计算
      // 只在 ResizeObserver 等真正需要时才刷新

      // 不再在这里修改箭头 class，避免二次移动
      // 箭头 class 已经在 onHighlightStarted 中设置完成

      // 记录箭头最终位置并修正第二步位置（用于调试）
      setTimeout(() => {
        const popover = findActivePopover()
        if (popover) {
          // 确保关闭按钮显示（driver.js 可能在步骤显示后重新设置）
          const closeBtn =
            popover.querySelector(".driver-popover-close-btn") ||
            popover.querySelector(".driver-close-btn")
          if (closeBtn) {
            closeBtn.style.display = "block"
          }

          const arrow = popover.querySelector(".driver-popover-arrow")
          if (arrow) {
            // 识别步骤号并修正第二步位置
            const dataStep = popover.getAttribute("data-step")
            const classes = arrow.className
            const isStep2 = dataStep === "2" || classes.includes("intro-step-2")

            if (isStep2) {
              const computedStyle = window.getComputedStyle(arrow)
              const finalTop = computedStyle.top
              const targetTop = "55px"
              const finalTopNum = parseFloat(finalTop)
              const targetTopNum = 55
              const needsFix =
                !finalTop ||
                finalTop === "auto" ||
                finalTop === "" ||
                (finalTop !== targetTop &&
                  (isNaN(finalTopNum) ||
                    Math.abs(finalTopNum - targetTopNum) > 0.1))

              if (needsFix) {
                arrow.style.top = targetTop
                arrow.style.bottom = "auto"
                arrow.style.transform = "none"
              }
            }
          }
        }
      }, 200)

      // 获取当前步骤索引
      let currentStepIndex = 0
      // 方法1: 从 step 对象获取
      if (step && typeof step === "object" && step.index !== undefined) {
        currentStepIndex = step.index
      } else if (options && options.stepIndex !== undefined) {
        currentStepIndex = options.stepIndex
      } else {
        // 方法2: 通过 DOM 查询进度指示器（延迟查询确保 DOM 已更新）
        setTimeout(() => {
          const popover = findActivePopover()
          const progressItems = popover
            ? popover.querySelectorAll(".driver-progress-item")
            : document.querySelectorAll(
                ".intro-driver-popover .driver-progress-item, .intro-step-1-popover .driver-progress-item, .intro-step-2-popover .driver-progress-item, .intro-step-3-popover .driver-progress-item"
              )
          if (progressItems.length > 0) {
            const activeIndex = Array.from(progressItems).findIndex((item) =>
              item.classList.contains("driver-progress-item-active")
            )
            if (activeIndex >= 0) {
              currentStepIndex = activeIndex
              setupStepAutoAdvance(currentStepIndex)
            }
          } else {
            // 如果找不到进度指示器，使用步骤在数组中的位置
            const stepIndex = steps.findIndex((s) => s.element === element)
            if (stepIndex >= 0) {
              currentStepIndex = stepIndex
              setupStepAutoAdvance(currentStepIndex)
            }
          }
        }, 100)
        return // 延迟查询时先返回
      }

      setupStepAutoAdvance(currentStepIndex)
    },
  })

  // 设置步骤自动推进的辅助函数
  function setupStepAutoAdvance(currentStepIndex) {
    // 设置自动推进定时器
    clearAutoAdvanceTimer()

    if (currentStepIndex >= steps.length - 1) {
      // 最后一步，延迟后自动完成
      const stepConfig = config.steps[currentStepIndex]
      const delay = stepConfig ?? config.default
      autoAdvanceTimer = setTimeout(() => {
        if (introDriver && typeof introDriver.destroy === "function") {
          introDriver.destroy()
        }
        clearAutoAdvanceTimer()
      }, delay)
    } else {
      // 不是最后一步，延迟后自动推进到下一步
      const stepConfig = config.steps[currentStepIndex]
      const delay = stepConfig ?? config.default
      autoAdvanceTimer = setTimeout(() => {
        if (introDriver) {
          try {
            if (typeof introDriver.moveNext === "function") {
              introDriver.moveNext()
            } else if (typeof introDriver.next === "function") {
              introDriver.next()
            } else {
              // 备用方案：通过 DOM 触发
              const popover = findActivePopover()
              const nextBtn = popover
                ? popover.querySelector(
                    '[data-action="next"], .driver-next-btn'
                  )
                : document.querySelector(
                    ".intro-driver-popover [data-action='next'], .intro-driver-popover .driver-next-btn, .intro-step-1-popover [data-action='next'], .intro-step-2-popover [data-action='next'], .intro-step-3-popover [data-action='next']"
                  )
              if (nextBtn) {
                nextBtn.click()
              }
            }
          } catch (error) {
            // 自动推进失败
          }
        }
        clearAutoAdvanceTimer()
      }, delay)
    }
  }
  introDriver.drive()
  markIntroGuideSeen()
  // 延迟刷新，确保 driver.js 完成初始渲染后再刷新
  // 只在必要时刷新（如窗口大小变化），避免触发位置重新计算
  setTimeout(() => {
    scheduleDriverRefresh("startIntroGuide")
  }, 300)
  setupGuideSyncHooks()
}

export function destroyIntroGuide() {
  if (introDriver) {
    introDriver.destroy()
    introDriver = null
  }
  teardownGuideSyncHooks()
}

function scheduleDriverRefresh(caller = "未知") {
  if (!introDriver || !introDriver.isActive || !introDriver.isActive()) {
    return
  }
  if (introRefreshRaf) {
    cancelAnimationFrame(introRefreshRaf)
  }
  introRefreshRaf = requestAnimationFrame(() => {
    introDriver.refresh()
    introRefreshRaf = null
  })
}

function setupGuideSyncHooks() {
  const previewPanel = document.querySelector(".intro-preview-panel")
  const controls = document.querySelector(".test-preview-controls")
  const imageFrame = document.querySelector(".test-preview-image-frame")
  const targets = [previewPanel, controls, imageFrame].filter(Boolean)

  if (targets.length) {
    introGuideResizeObserver = new ResizeObserver(() => {
      scheduleDriverRefresh("ResizeObserver")
    })
    targets.forEach((target) => introGuideResizeObserver.observe(target))
  }

  const introImage = document.getElementById("intro-preview-image")
  if (introImage) {
    const handleImageMutation = () => scheduleDriverRefresh("ImageLoad/Error")
    introImage.addEventListener("load", handleImageMutation)
    introImage.addEventListener("error", handleImageMutation)
    introGuideImageListenerCleanup = () => {
      introImage.removeEventListener("load", handleImageMutation)
      introImage.removeEventListener("error", handleImageMutation)
      introGuideImageListenerCleanup = null
    }
  }
}

function createAutoAdvanceConfig() {
  // 配置每个步骤的停留时间（毫秒）
  return {
    default: 4000, // 默认2秒
    steps: {
      0: 2000, // 图版预览区 - 2秒
      1: 2000, // 缩放与旋转 - 2秒      2: 20000, // 绘图工具组 - 2秒
    },
  }
}

// setupAutoAdvance 函数已移除，自动推进逻辑已集成到 onHighlightStarted 回调中

function clearAutoAdvanceTimer() {
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer)
    autoAdvanceTimer = null
  }
}

function cleanupAutoAdvance() {
  clearAutoAdvanceTimer()
}

function teardownGuideSyncHooks() {
  if (introGuideResizeObserver) {
    introGuideResizeObserver.disconnect()
    introGuideResizeObserver = null
  }
  if (introGuideImageListenerCleanup) {
    introGuideImageListenerCleanup()
    introGuideImageListenerCleanup = null
  }
  if (introRefreshRaf) {
    cancelAnimationFrame(introRefreshRaf)
    introRefreshRaf = null
  }
  // 清理箭头位置观察器
  if (arrowPositionObserver) {
    arrowPositionObserver.disconnect()
    arrowPositionObserver = null
  }
  lastArrowTop = null
  cleanupAutoAdvance()
}
