/**
 * 操作反应测试模块
 * 在预览窗口引导用户完成6个基本操作：放大、缩小、左转、右转、画笔、擦除
 */

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
    text: "请点击绿色画笔，跟随图中的轨迹进行画画",
    buttonSelector: '[data-action="pen"]',
    // 画笔操作需要特殊处理：需要先切换到绿色，然后检测是否有绘画操作
    requiresColorSwitch: true,
    targetColor: "green",
    requiresDrawing: true,
  },
  {
    id: "erase",
    action: "erase",
    text: "请点击擦除按钮",
    buttonSelector: '[data-action="erase"]',
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

  try {
    // 第一步：播报介绍文本
    const introText =
      "知己心探（InnerScan）是一种多模态测试方法，通过你的操作、反应、回答等数据融合计算出结果。现在开始测试，首先是操作反应测试。请先观察左边测试界面上的各种按钮，并根据我的提示进行操作。"
    await playTTS(introText)

    // 等待播报完成后，开始操作步骤
    await new Promise((resolve) => setTimeout(resolve, 500))

    // 执行操作步骤
    await executeOperationSteps()

    // 所有操作完成后，播报第二段文本
    const finalText =
      "现在开始第二项测试，测试时我会依次给你展示 10 张图片，你只需要告诉我在图片中看到了什么，并描述你看到的东西、联想到的东西。不管看见什么，都可以直接描述，没有正确与错误。在一张图片中你可能会看到多个物体和场景，描述得越详细越好。测试过程中，你可以旋转调整图像画面，观察不同的角度，用画笔标记出你看到的物体或场景。"
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
      top: -30px;
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

        // 播报前先断开再连接，确保连接状态干净
        if (window.dialogClient) {
          console.log("[操作反应测试] 播报前断开现有连接...")
          try {
            // 如果已连接，先断开
            if (window.dialogClient.isConnected) {
              window.dialogClient.disconnect()
              console.log("[操作反应测试] 已断开连接")
              // 等待连接完全关闭
              await new Promise((resolve) => setTimeout(resolve, 200))
            }

            // 重新连接
            console.log("[操作反应测试] 重新连接 dialogClient...")
            await window.dialogClient.connect()
            console.log("[操作反应测试] dialogClient 连接成功")

            // 发送初始化消息
            if (
              window.dialogClient.ws &&
              window.dialogClient.ws.readyState === WebSocket.OPEN
            ) {
              const initMsg = JSON.stringify({
                type: "init",
                speaker: "zh_female_vv_jupiter_bigtts",
                mode: "audio",
              })
              window.dialogClient.ws.send(initMsg)
              console.log("[操作反应测试] TTS 初始化消息已发送")
              // 等待初始化完成
              await new Promise((resolve) => setTimeout(resolve, 100))
            }
          } catch (error) {
            console.error("[操作反应测试] TTS 连接/初始化失败:", error)
          }
        }

        // 估算播放时间（每字约 300ms，但至少 2 秒）
        const estimatedDuration = Math.max(2000, text.length * 220)
        console.log(`[操作反应测试] 预计播放时间: ${estimatedDuration}ms`)

        let resolved = false
        const doResolve = () => {
          if (!resolved) {
            resolved = true
            console.log("[操作反应测试] 播报完成")
            resolve()
          }
        }

        // 调用 playAudio，传入回调
        try {
          await window.playAudio(
            text,
            () => {
              console.log("[操作反应测试] playAudio 回调触发")
              doResolve()
            },
            {
              onError: (error) => {
                console.error("[操作反应测试] playAudio 失败:", error)
                doResolve()
              },
            }
          )
          console.log("[操作反应测试] playAudio 调用完成")
        } catch (error) {
          console.error("[操作反应测试] playAudio 调用异常:", error)
          doResolve()
        }

        // 设置超时作为备用（防止回调未触发）
        setTimeout(() => {
          console.log("[操作反应测试] 播报超时，强制完成")
          doResolve()
        }, estimatedDuration) // 额外增加 2 秒缓冲
      } else if (
        window.dialogClient &&
        typeof window.sendTextQuery === "function" &&
        typeof window.buildTTSQuery === "function"
      ) {
        console.log("[操作反应测试] 使用 sendTextQuery 播报")
        // 播报前先断开再连接，确保连接状态干净
        try {
          console.log("[操作反应测试] 播报前断开现有连接...")
          // 如果已连接，先断开
          if (window.dialogClient.isConnected) {
            window.dialogClient.disconnect()
            console.log("[操作反应测试] 已断开连接")
            // 等待连接完全关闭
            await new Promise((resolve) => setTimeout(resolve, 200))
          }

          // 重新连接
          console.log("[操作反应测试] 重新连接 dialogClient...")
          await window.dialogClient.connect()
          console.log("[操作反应测试] dialogClient 连接成功")

          // 发送初始化消息
          if (
            window.dialogClient.ws &&
            window.dialogClient.ws.readyState === WebSocket.OPEN
          ) {
            const initMsg = JSON.stringify({
              type: "init",
              speaker: "zh_female_vv_jupiter_bigtts",
              mode: "audio",
            })
            window.dialogClient.ws.send(initMsg)
            console.log("[操作反应测试] TTS 初始化消息已发送")
            // 等待初始化完成
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        } catch (error) {
          console.error("[操作反应测试] dialogClient 连接失败:", error)
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

  // 重置状态
  testState.isRunning = false
  testState.currentStepIndex = -1
  testState.drawingDetected = false
  testState.completionCallback = null

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
