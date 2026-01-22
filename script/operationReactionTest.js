/**
 * 操作反应测试模块
 * 在预览窗口引导用户完成6个基本操作：放大、缩小、左转、右转、画笔、擦除
 */

import { initTrajectoryGuide } from "./trajectoryGuide.js"

// 操作步骤配置
const OPERATION_STEPS = [
  {
    id: "zoom-in",
    action: "zoom-in",
    text: "请点击放大按钮",
    buttonSelector: '[data-action="zoom-in"]',
  },
  {
    id: "zoom-out",
    action: "zoom-out",
    text: "请点击缩小按钮",
    buttonSelector: '[data-action="zoom-out"]',
  },
  {
    id: "rotate-left",
    action: "rotate-left",
    text: "请点击左转按钮",
    buttonSelector: '[data-action="rotate-left"]',
  },
  {
    id: "rotate-right",
    action: "rotate-right",
    text: "请点击右转按钮",
    buttonSelector: '[data-action="rotate-right"]',
  },
  {
    id: "pen",
    action: "pen",
    text: "请点击绿色画笔，按照图中的轨迹画画",
    buttonSelector: '[data-action="pen"]',
    // 画笔操作需要特殊处理：需要先切换到绿色，然后检测是否有绘画操作
    requiresColorSwitch: true,
    targetColor: "green",
    requiresDrawing: true,
  },
  {
    id: "clear",
    action: "clear",
    text: "请点击一键擦除按钮",
    buttonSelector: '[data-action="clear"]',
  },
]

// 测试状态
let testState = {
  isRunning: false,
  currentStepIndex: -1,
  completionCallback: null,
  buttonClickListeners: new Map(), // 存储临时事件监听器
  blinkingIntervals: new Map(), // 存储闪烁动画定时器
  drawingDetected: false, // 用于检测画笔操作
  originalButtonStates: new Map(), // 保存按钮原始状态
  ttsPlayCount: 0, // 记录 TTS 播报次数
}

// 预览窗口轨迹引导控制器（懒初始化）
let previewTrajectoryGuide = null

/**
 * 初始化预览窗口的轨迹引导控制器（仅在需要时调用一次）
 * 使用预览画布和 previewState，失败时静默降级
 */
function initPreviewTrajectoryGuideIfNeeded() {
  if (previewTrajectoryGuide) {
    return previewTrajectoryGuide
  }

  try {
    const canvas = document.querySelector(".test-preview-canvas")
    if (!canvas) {
      console.warn("[操作反应测试] 未找到预览画布，跳过轨迹引导初始化")
      return null
    }
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      console.warn("[操作反应测试] 无法获取预览画布上下文，跳过轨迹引导初始化")
      return null
    }

    // 优先使用全局的预览状态对象
    const state = window.previewState || {
      zoom: 1,
      rotation: 0,
      tool: "pen",
      drawing: false,
    }

    previewTrajectoryGuide = initTrajectoryGuide({
      canvas,
      ctx,
      state,
      // 语音播报仍由 playTTS 负责，这里不做任何播报
      onShow: null,
      // 预览画布的用户内容由 appMain 管理，这里不做额外重绘
      onRedraw: null,
    })

    if (!previewTrajectoryGuide) {
      console.warn("[操作反应测试] 轨迹引导初始化失败")
      return null
    }

    return previewTrajectoryGuide
  } catch (error) {
    console.warn("[操作反应测试] 初始化轨迹引导时出错:", error)
    return null
  }
}

/**
 * 开始操作反应测试
 * @param {Function} onComplete - 所有操作完成后的回调函数
 */
export async function startOperationReactionTest(onComplete = null) {
  if (testState.isRunning) {
    console.warn("[操作反应测试] 测试已在运行中")
    return
  }

  console.log("[操作反应测试] 开始测试")
  testState.isRunning = true
  testState.currentStepIndex = -1
  testState.completionCallback = onComplete
  testState.drawingDetected = false
  testState.ttsPlayCount = 0

  try {
    // 第一步：播报介绍文本
    const introText =
      `1.现在我来介绍一下这个测试是如何进行的。在页面的左侧，您可以看到一张墨迹图片，它是一张样例图片，在正式测试过程中，我会依次给您展示好多张类似的墨迹图片，这些图片的绘制都是随机的，也都是抽象的，每个人从墨迹中看到的东西都各不一样。您要做的，就是通过语音告诉我，您在图中看到了什么，并且向我描述一下您所看到的东西，联想到的东西。不管看见什么，都可以自由地表述，没有什么标准答案可言。
      2.在页面的墨迹图片下方，有多个控制按钮，分别可以控制图片放大、缩小、向左旋转、向右旋转图片，并且还可以利用画笔，圈出来您是从图片的哪些部分看出来您所看到的东西的。请注意，我是AI数字人，在测试过程中，需要您时常利用画笔来向我勾画您所看到的东西，这样我才能够看到您指示的图片位置。
      3.接下来，请随我的指示，点击各个按钮。`
    await playTTS(introText)

    // 等待播报完成后，开始操作步骤
    await new Promise((resolve) => setTimeout(resolve, 500))

    // 执行操作步骤
    await executeOperationSteps()

    // 所有操作完成后，播报第二段文本
    const finalText =
      "4.如果您确认清楚了测试的流程，那就可以点击“进入“按钮,开始本次正式的心理测试。"

      
    await playTTS(finalText)

    // // 等待一小段时间确保播报完全完成
    // await new Promise((resolve) => setTimeout(resolve))

    // 测试完成
    console.log("[操作反应测试] 测试完成")
    if (testState.completionCallback) {
      testState.completionCallback()
    }
  } catch (error) {
    console.error("[操作反应测试] 测试过程中出错:", error)
  } finally {
    // 清理资源
    cleanup()
  }
}

/**
 * 执行所有操作步骤
 */
async function executeOperationSteps() {
  for (let i = 0; i < OPERATION_STEPS.length; i++) {
    testState.currentStepIndex = i
    const step = OPERATION_STEPS[i]
    console.log(
      `[操作反应测试] 执行步骤 ${i + 1}/${OPERATION_STEPS.length}: ${step.id}`
    )

    try {
      await executeStep(step)
    } catch (error) {
      console.error(`[操作反应测试] 步骤 ${step.id} 执行失败:`, error)
      // 继续执行下一步
    }
  }
}

/**
 * 执行单个操作步骤
 * @param {Object} step - 操作步骤配置
 */
async function executeStep(step) {
  // 对画笔步骤：在播报前显示轨迹引导圈
  if (step.requiresDrawing) {
    const guide = initPreviewTrajectoryGuideIfNeeded()
    if (guide && typeof guide.show === "function") {
      guide.show()
    }
  }

  // 1. 播报操作指令
  await playTTS(step.text)

  // 2. 等待播报完成后，显示闪烁提示
  await new Promise((resolve) => setTimeout(resolve, 500))

  // 3. 获取目标按钮（尝试多次查找，因为按钮可能在动态加载中）
  let button = document.querySelector(step.buttonSelector)
  if (!button) {
    // 如果第一次没找到，等待一下再试
    console.log(
      `[操作反应测试] 首次未找到按钮: ${step.buttonSelector}，等待后重试...`
    )
    await new Promise((resolve) => setTimeout(resolve, 200))
    button = document.querySelector(step.buttonSelector)
  }

  if (!button) {
    console.error(`[操作反应测试] 未找到按钮: ${step.buttonSelector}`)
    console.error(
      `[操作反应测试] 当前页面中所有 data-action 按钮:`,
      Array.from(document.querySelectorAll("[data-action]")).map((btn) => ({
        action: btn.getAttribute("data-action"),
        disabled: btn.disabled,
        visible: btn.offsetParent !== null,
      }))
    )
    return
  }

  console.log(`[操作反应测试] 找到按钮: ${step.id}`, {
    disabled: button.disabled,
    visible: button.offsetParent !== null,
    text: button.textContent?.trim(),
  })

  // 4. 启用按钮（如果被禁用）
  enableButton(button)

  // 5. 显示闪烁提示
  showBlinkingHint(button)

  // 6. 等待用户操作
  await waitForUserAction(step)

  // 7. 隐藏闪烁提示
  hideBlinkingHint(button)

  // 8. 播报完成提示
  await playTTS("好的，操作完成")
  // 9. 等待一小段时间再进入下一步
  await new Promise((resolve) => setTimeout(resolve, 1500))
}

/**
 * 等待用户完成操作
 * @param {Object} step - 操作步骤配置
 */
function waitForUserAction(step) {
  return new Promise((resolve) => {
    const button = document.querySelector(step.buttonSelector)
    if (!button) {
      resolve()
      return
    }

    // 特殊处理：画笔操作需要检测绘画动作
    if (step.requiresDrawing) {
      // 先切换到指定颜色
      if (step.requiresColorSwitch && step.targetColor) {
        switchToColor(step.targetColor)
      }

      // 检测绘画操作
      const checkDrawing = () => {
        if (testState.drawingDetected) {
          testState.drawingDetected = false

          // 用户完成绘画后，淡出轨迹引导圈
          if (
            previewTrajectoryGuide &&
            typeof previewTrajectoryGuide.hide === "function"
          ) {
            previewTrajectoryGuide.hide()
          }

          resolve()
        } else {
          setTimeout(checkDrawing, 100)
        }
      }
      checkDrawing()

      // 设置超时（避免无限等待）
      // 注意：超时后不自动 resolve，需要用户完成操作才能继续
      setTimeout(() => {
        if (!testState.drawingDetected) {
          console.warn(
            `[操作反应测试] 步骤 ${step.id} 超时（30秒），但继续等待用户操作`
          )
          // 不调用 resolve()，继续等待用户操作
          // 可以在这里添加提示，但不自动跳过
        }
      }, 30000) // 30秒超时（仅用于日志记录，不自动跳过）
    } else {
      // 普通按钮操作：监听点击事件
      const handleClick = (e) => {
        console.log(`[操作反应测试] 检测到按钮点击: ${step.id}`)
        // 不阻止事件冒泡，让正常的按钮功能也能执行
        // 移除监听器
        button.removeEventListener("click", handleClick)
        testState.buttonClickListeners.delete(step.id)
        resolve()
      }

      // 确保按钮可点击
      if (button.disabled) {
        console.warn(`[操作反应测试] 按钮 ${step.id} 仍被禁用，尝试启用...`)
        button.disabled = false
      }

      console.log(`[操作反应测试] 等待用户点击按钮: ${step.id}`)
      // 使用 capture: false 确保不干扰正常的事件流
      button.addEventListener("click", handleClick, {
        once: true,
        capture: false,
      })
      testState.buttonClickListeners.set(step.id, handleClick)

      // 设置超时（避免无限等待）
      // 注意：超时后不自动 resolve，需要用户完成操作才能继续
      setTimeout(() => {
        if (testState.buttonClickListeners.has(step.id)) {
          console.warn(
            `[操作反应测试] 步骤 ${step.id} 超时（30秒），但继续等待用户操作`
          )
          // 不调用 resolve()，继续等待用户操作
          // 可以在这里添加提示，但不自动跳过
        }
      }, 30000) // 30秒超时（仅用于日志记录，不自动跳过）
    }
  })
}

/**
 * 启用按钮
 * @param {HTMLElement} button - 按钮元素
 */
function enableButton(button) {
  if (button.disabled) {
    testState.originalButtonStates.set(button, true)
    button.disabled = false
  }
}

/**
 * 显示闪烁提示
 * @param {HTMLElement} button - 按钮元素
 */
function showBlinkingHint(button) {
  // 移除之前的闪烁效果（如果有）
  hideBlinkingHint(button)

  // 添加闪烁样式类
  button.classList.add("operation-hint-blink")

  // 创建闪烁动画
  const style = document.createElement("style")
  style.id = "operation-hint-style"
  style.textContent = `
    .operation-hint-blink {
      position: relative;
      animation: operation-hint-pulse 1s ease-in-out infinite;
    }
    .operation-hint-blink::before {
      content: "👆";
      position: absolute;
      top: 5px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 24px;
      animation: operation-hint-bounce 1s ease-in-out infinite;
      pointer-events: none;
      z-index: 1000;
    }
    @keyframes operation-hint-pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
      }
      50% {
        box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
      }
    }
    @keyframes operation-hint-bounce {
      0%, 100% {
        transform: translateX(-50%) translateY(0);
      }
      50% {
        transform: translateX(-50%) translateY(-10px);
      }
    }
  `
  if (!document.getElementById("operation-hint-style")) {
    document.head.appendChild(style)
  }
}

/**
 * 隐藏闪烁提示
 * @param {HTMLElement} button - 按钮元素
 */
function hideBlinkingHint(button) {
  button.classList.remove("operation-hint-blink")
}

/**
 * 切换到指定颜色
 * @param {string} colorName - 颜色名称 (red, green, blue)
 */
function switchToColor(colorName) {
  const colorMap = {
    red: "#ef4444",
    green: "#10b981",
    blue: "#3b82f6",
  }

  const colorOption = document.querySelector(
    `.color-selector .color-option[data-color="${colorName}"]`
  )
  if (colorOption) {
    // 移除其他颜色的选中状态
    document
      .querySelectorAll(".color-selector .color-option")
      .forEach((opt) => opt.classList.remove("selected"))
    // 选中目标颜色
    colorOption.classList.add("selected")

    // 更新预览状态（如果存在）
    if (window.previewActions && window.previewActions.setColor) {
      window.previewActions.setColor(colorMap[colorName])
    } else if (window.previewState) {
      window.previewState.color = colorMap[colorName]
    }
  }
}

/**
 * 确保 dialogClient 连接正常（仅在必要时重连）
 * @returns {Promise<boolean>} 连接是否成功
 */
async function ensureDialogClientConnected() {
  if (!window.dialogClient) {
    console.warn("[操作反应测试] dialogClient 不存在")
    return false
  }

  // 检查连接状态
  const isConnected = window.dialogClient.isConnected
  const wsReady = window.dialogClient.ws?.readyState === WebSocket.OPEN

  // 如果已连接且 WebSocket 状态正常，直接返回
  if (isConnected && wsReady) {
    console.log("[操作反应测试] 连接已就绪，复用现有连接")
    return true
  }

  // 需要重连
  try {
    // 如果已连接但 WebSocket 状态异常，先断开
    if (isConnected) {
      console.log("[操作反应测试] 检测到连接状态异常，断开重连...")
      try {
        window.dialogClient.disconnect()
        // 等待连接完全关闭（减少等待时间）
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (e) {
        console.warn("[操作反应测试] 断开连接时出错:", e)
      }
    }

    // 重新连接
    console.log("[操作反应测试] 连接 dialogClient...")
    await window.dialogClient.connect()
    console.log("[操作反应测试] dialogClient 连接成功")

    // 发送初始化消息
    if (
      window.dialogClient.ws &&
      window.dialogClient.ws.readyState === WebSocket.OPEN
    ) {
      const initMsg = JSON.stringify({
        type: "init",
        speaker: "alloy",
        mode: "audio",
      })
      window.dialogClient.ws.send(initMsg)
      console.log("[操作反应测试] TTS 初始化消息已发送")
      // 减少初始化等待时间
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    return true
  } catch (error) {
    console.error("[操作反应测试] TTS 连接/初始化失败:", error)
    return false
  }
}

/**
 * 播放TTS语音
 * @param {string} text - 要播报的文本
 */
async function playTTS(text) {
  return new Promise(async (resolve) => {
    try {
      console.log("[操作反应测试] 开始播报:", text)
      console.log("[操作反应测试] 文本长度:", text.length, "字符")

      // 优先使用全局的 playAudio 函数（如果存在）
      if (typeof window.playAudio === "function") {
        console.log("[操作反应测试] 使用 playAudio 播报")
        console.log("[操作反应测试] 完整文本:", text)

        // 确保音频上下文已创建并激活（在发送文本前）
        try {
          if (window.dialogClient) {
            // 确保音频上下文已创建
            if (!window.dialogClient.audioContext) {
              console.log("[操作反应测试] 创建音频上下文")
              const sampleRate =
                window.dialogClient.config?.outputAudio?.sampleRate || 24000
              window.dialogClient.audioContext = new (window.AudioContext ||
                window.webkitAudioContext)({
                sampleRate: sampleRate,
              })
            }

            // 确保音频上下文已激活
            if (window.dialogClient.audioContext) {
              if (window.dialogClient.audioContext.state === "suspended") {
                console.log("[操作反应测试] 激活音频上下文")
                await window.dialogClient.audioContext.resume()
              }
              console.log(
                "[操作反应测试] 音频上下文状态:",
                window.dialogClient.audioContext.state
              )
            }

            // 记录连接状态
            console.log("[操作反应测试] 连接状态:", {
              isConnected: window.dialogClient.isConnected,
              wsReady: window.dialogClient.ws?.readyState === WebSocket.OPEN,
              wsState: window.dialogClient.ws?.readyState,
            })
          }
        } catch (error) {
          console.warn("[操作反应测试] 音频上下文检查失败:", error)
        }

        // 估算播放时间（每字约 300ms，但至少 2.5 秒，增加缓冲时间）
        const estimatedDuration = Math.max(2500, text.length * 300)
        console.log(`[操作反应测试] 预计播放时间: ${estimatedDuration}ms`)

        let resolved = false
        const doResolve = () => {
          if (!resolved) {
            resolved = true
            console.log("[操作反应测试] 播报完成")
            resolve()
          }
        }

        // 等待前一个播报完全完成（包括音频队列清空）
        if (window.dialogClient) {
          const maxWaitTime = 3000 // 最多等待 3 秒
          const startWaitTime = Date.now()
          while (
            (window.dialogClient.isPlaying ||
              (window.dialogClient.audioQueue &&
                window.dialogClient.audioQueue.length > 0)) &&
            Date.now() - startWaitTime < maxWaitTime
          ) {
            console.log("[操作反应测试] 等待前一个播报完成...", {
              isPlaying: window.dialogClient.isPlaying,
              queueLength: window.dialogClient.audioQueue?.length || 0,
            })
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
          if (Date.now() - startWaitTime >= maxWaitTime) {
            console.warn("[操作反应测试] 等待前一个播报超时，继续发送新请求")
          } else {
            console.log("[操作反应测试] 前一个播报已完成")
          }

          // 如果不是第一次播报，强制重新初始化 TTS 连接（解决服务端状态异常问题）
          // 已注释：服务端已修复接收循环自动恢复问题，不再需要客户端强制重连
          if (testState.ttsPlayCount > 0) {
            console.log(
              "[操作反应测试] 重新初始化 TTS 连接以确保服务端状态正常"
            )
            try {
              // 断开现有连接
              if (window.dialogClient.isConnected) {
                window.dialogClient.disconnect()
                await new Promise((resolve) => setTimeout(resolve, 200))
              }
              // 重新连接
              await window.dialogClient.connect()
              // 重新发送初始化消息
              if (
                window.dialogClient.ws &&
                window.dialogClient.ws.readyState === WebSocket.OPEN
              ) {
                const initMsg = JSON.stringify({
                  type: "init",
                  speaker: "alloy",
                  mode: "audio",
                })
                window.dialogClient.ws.send(initMsg)
                console.log("[操作反应测试] TTS 重新初始化消息已发送")
                await new Promise((resolve) => setTimeout(resolve, 100))
              }
            } catch (error) {
              console.error("[操作反应测试] TTS 重新初始化失败:", error)
            }
          } else {
            // 第一次播报，只等待一小段时间
            await new Promise((resolve) => setTimeout(resolve, 200))
          }

          // 等待一小段时间，确保前一个播报完成
          await new Promise((resolve) => setTimeout(resolve, 200))

          // 增加播报计数
          testState.ttsPlayCount++
        }

        // 记录开始时间和初始状态
        const startTime = Date.now()
        const initialQueueLength = window.dialogClient?.audioQueue?.length || 0
        console.log("[操作反应测试] 初始音频队列长度:", initialQueueLength)

        // 调用 playAudio（不依赖其回调，因为回调可能不准确）
        try {
          await window.playAudio(
            text,
            null, // 不使用回调，改为监听实际播放状态
            {
              onError: (error) => {
                console.error("[操作反应测试] playAudio 失败:", error)
                // 即使失败也等待最小时间
                setTimeout(() => doResolve(), 1000)
              },
            }
          )
          console.log("[操作反应测试] playAudio 调用完成")

          // 监听实际播放状态
          let playbackStarted = false
          let audioDataReceived = false
          const checkPlaybackStatus = () => {
            const elapsed = Date.now() - startTime
            const dialogClient = window.dialogClient

            // 检查是否收到音频数据
            if (!audioDataReceived && dialogClient) {
              const currentQueueLength = dialogClient.audioQueue?.length || 0
              if (currentQueueLength > initialQueueLength) {
                audioDataReceived = true
                console.log(
                  "[操作反应测试] 检测到音频数据已接收，队列长度:",
                  currentQueueLength
                )
              }
            }

            // 检查音频是否已开始播放
            if (!playbackStarted && dialogClient && dialogClient.isPlaying) {
              playbackStarted = true
              console.log("[操作反应测试] 检测到音频开始播放")
            }

            // 如果发送后 1 秒内没有收到音频数据，可能是连接问题
            if (elapsed > 1000 && !audioDataReceived && !playbackStarted) {
              console.warn(
                "[操作反应测试] 警告：发送文本后 1 秒内未收到音频数据"
              )
              console.warn("[操作反应测试] 连接状态:", {
                isConnected: dialogClient?.isConnected,
                wsReady: dialogClient?.ws?.readyState === WebSocket.OPEN,
                audioContextState: dialogClient?.audioContext?.state,
                queueLength: dialogClient?.audioQueue?.length || 0,
              })
            }

            // 如果已经过了估算时间，直接完成（防止无限等待）
            if (elapsed >= estimatedDuration) {
              console.log(
                `[操作反应测试] 达到估算时间（${elapsed}ms），完成播报`
              )
              if (!audioDataReceived && !playbackStarted) {
                console.warn(
                  "[操作反应测试] 警告：整个播报过程中未检测到音频数据或播放"
                )
              }
              doResolve()
              return
            }

            // 如果音频已开始播放，检查是否播放完成
            if (playbackStarted) {
              const isStillPlaying = dialogClient?.isPlaying || false
              const hasQueueData = dialogClient?.audioQueue?.length > 0 || false

              if (!isStillPlaying && !hasQueueData) {
                // 播放已完成，但再等待一小段时间确保音频完全结束
                const waitAfterFinish = 300
                console.log(
                  `[操作反应测试] 播放已完成，等待 ${waitAfterFinish}ms 后完成（总等待 ${elapsed}ms）`
                )
                setTimeout(() => doResolve(), waitAfterFinish)
                return
              }
            }

            // 继续检查
            setTimeout(checkPlaybackStatus, 200)
          }

          // 延迟开始检查，给音频一些时间开始播放
          setTimeout(() => {
            checkPlaybackStatus()
          }, 500)

          // 设置最大超时（防止无限等待）
          setTimeout(() => {
            console.log("[操作反应测试] 达到最大等待时间，强制完成")
            doResolve()
          }, estimatedDuration + 2000) // 额外增加 2 秒缓冲
        } catch (error) {
          console.error("[操作反应测试] playAudio 调用异常:", error)
          // 即使出错也等待最小时间
          setTimeout(() => doResolve(), 1000)
        }
      } else if (
        window.dialogClient &&
        typeof window.sendTextQuery === "function" &&
        typeof window.buildTTSQuery === "function"
      ) {
        console.log("[操作反应测试] 使用 sendTextQuery 播报")
        // 确保连接正常（仅在必要时重连）
        const connected = await ensureDialogClientConnected()
        if (!connected) {
          console.error("[操作反应测试] dialogClient 连接失败")
          resolve()
          return
        }

        // 使用 sendTextQuery 和 buildTTSQuery
        try {
          const ttsQuery = window.buildTTSQuery(text)
          console.log(
            "[操作反应测试] 构建 TTS 查询:",
            ttsQuery.substring(0, 100) + "..."
          )

          await window.sendTextQuery(ttsQuery, { ensure: true })
          console.log("[操作反应测试] TTS 查询已发送")

          // 估算播放时间
          const estimatedDuration = Math.max(2000, text.length * 300)
          console.log(
            `[操作反应测试] TTS已发送，预计播放时间: ${estimatedDuration}ms`
          )

          setTimeout(() => {
            console.log("[操作反应测试] 播报完成（超时）")
            resolve()
          }, estimatedDuration)
        } catch (error) {
          console.error("[操作反应测试] TTS播报失败:", error)
          // 即使失败也继续
          resolve()
        }
      } else {
        console.warn("[操作反应测试] 未找到TTS播放方法，跳过播报")
        console.warn("[操作反应测试] playAudio:", typeof window.playAudio)
        console.warn("[操作反应测试] dialogClient:", !!window.dialogClient)
        console.warn(
          "[操作反应测试] sendTextQuery:",
          typeof window.sendTextQuery
        )
        console.warn(
          "[操作反应测试] buildTTSQuery:",
          typeof window.buildTTSQuery
        )
        resolve()
      }
    } catch (error) {
      console.error("[操作反应测试] TTS播报出错:", error)
      resolve() // 即使出错也继续
    }
  })
}

/**
 * 检测绘画操作（需要在外部调用）
 * 当用户在预览画布上绘画时，调用此函数
 */
export function detectDrawingAction() {
  if (
    testState.isRunning &&
    testState.currentStepIndex >= 0 &&
    OPERATION_STEPS[testState.currentStepIndex]?.requiresDrawing
  ) {
    testState.drawingDetected = true
    console.log("[操作反应测试] 检测到绘画操作")
  }
}

/**
 * 清理资源
 */
function cleanup() {
  // 移除所有事件监听器
  testState.buttonClickListeners.forEach((listener, stepId) => {
    const step = OPERATION_STEPS.find((s) => s.id === stepId)
    if (step) {
      const button = document.querySelector(step.buttonSelector)
      if (button) {
        button.removeEventListener("click", listener)
      }
    }
  })
  testState.buttonClickListeners.clear()

  // 清除所有闪烁提示
  document
    .querySelectorAll(".operation-hint-blink")
    .forEach((btn) => btn.classList.remove("operation-hint-blink"))

  // 不恢复按钮状态，确保所有按钮保持启用
  // 因为操作反应测试完成后，用户需要继续使用这些按钮
  // 只清除原始状态记录，不恢复禁用状态
  testState.originalButtonStates.clear()

  // 确保所有预览窗口按钮都是启用的，并重新初始化按钮事件监听器
  if (typeof window.initPreviewControlButtons === "function") {
    window.initPreviewControlButtons()
    console.log("[操作反应测试] 已重新初始化预览窗口按钮")
  } else {
    // 降级方案：只启用按钮
    const previewControlButtons = document.querySelectorAll(
      ".test-preview-controls button"
    )
    previewControlButtons.forEach((btn) => {
      btn.disabled = false
    })
    console.log("[操作反应测试] 已确保所有预览窗口按钮启用")
  }

  // 清除闪烁动画定时器
  testState.blinkingIntervals.forEach((interval) => clearInterval(interval))
  testState.blinkingIntervals.clear()

  // 清理预览轨迹引导状态
  if (
    previewTrajectoryGuide &&
    typeof previewTrajectoryGuide.clear === "function"
  ) {
    previewTrajectoryGuide.clear()
  }

  // 重置状态
  testState.isRunning = false
  testState.currentStepIndex = -1
  testState.drawingDetected = false
  testState.completionCallback = null
  testState.ttsPlayCount = 0

  console.log("[操作反应测试] 资源已清理")
}

/**
 * 停止测试（外部调用）
 */
export function stopOperationReactionTest() {
  if (testState.isRunning) {
    console.log("[操作反应测试] 停止测试")
    cleanup()
  }
}
