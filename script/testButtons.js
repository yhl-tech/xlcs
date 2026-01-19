/**
 * 测试按钮功能模块
 * 包含：测试音频录制、测试轨迹上传
 */
;(function (window) {
  "use strict"

  // 状态管理
  const state = {
    mediaRecorder: null,
    audioChunks: [],
    audioBlob: null,
  }

  /**
   * 获取当前用户 ID
   */
  function getCurrentUserId() {
    if (typeof window.getCurrentUserId === "function") {
      return window.getCurrentUserId()
    }
    // 兜底：从 localStorage 获取
    const userStr = localStorage.getItem("user")
    if (!userStr) return null
    try {
      const user = JSON.parse(userStr)
      return user?.id || null
    } catch (e) {
      return null
    }
  }

  /**
   * 初始化测试音频录制按钮
   */
  function initTestAudioButton() {
    const testSubmitBtn = document.getElementById("test-audio-btn")
    if (!testSubmitBtn) return

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
        const mixedStatus =
          window.dialogClient.getMixedRecordingStatus?.() || {}
        console.log("[测试音频] 混合录音状态:", mixedStatus)

        // 如果正在混合录音，停止并上传
        if (mixedStatus.isRecording) {
          console.log("[测试音频] 停止混合录音...")
          testSubmitBtn.disabled = true
          testSubmitBtn.textContent = "处理中..."

          try {
            const mixedBlob = await window.dialogClient.stopMixedRecording()
            console.log(
              "[测试音频] 混合录音已停止，大小:",
              (mixedBlob?.size / 1024 / 1024).toFixed(2),
              "MB"
            )

            if (mixedBlob && mixedBlob.size > 0) {
              testSubmitBtn.textContent = "上传中..."
              const result = await window.API.uploadMedia(mixedBlob, userId)
              console.log("[测试音频] 上传结果:", result)

              testSubmitBtn.textContent = "✅ 成功"
              testSubmitBtn.style.background = "#10b981"
              alert(
                "混合音频上传成功!\n文件大小: " +
                  (mixedBlob.size / 1024 / 1024).toFixed(2) +
                  "MB\n包含: AI语音 + 用户语音"
              )
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
          alert(
            "混合录音已开始！\n正在录制: AI语音 + 用户语音\n请说几句话，然后再次点击按钮停止并上传。"
          )
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
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          })
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
          state.mediaRecorder.onstop = (e) => {
            if (orig) orig(e)
            resolve()
          }
          state.mediaRecorder.stop()
        })

        const blob =
          state.audioBlob ||
          new Blob(state.audioChunks, { type: "audio/webm" })
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

  /**
   * 初始化直接进入测试按钮
   */
  function initDirectEnterButton() {
    const directEnterBtn = document.getElementById("direct-enter-btn")
    if (!directEnterBtn) return

    directEnterBtn.addEventListener("click", () => {
      console.log("[测试] 点击直接进入按钮")
      // 隐藏填表单界面
      const infoScreen = document.getElementById("info-screen")
      if (infoScreen) {
        infoScreen.style.display = "none"
      }
      // 隐藏测试准备页面
      const welcomeTextContainer = document.getElementById(
        "welcome-text-container"
      )
      if (welcomeTextContainer) {
        welcomeTextContainer.style.display = "none"
      }
      // 显示应用窗口
      const appWindow = document.getElementById("app-window")
      if (appWindow) {
        appWindow.style.display = "flex"
      }
      // 预加载图片
      if (
        window.ImagePreloader &&
        typeof window.ImagePreloader.preloadImage === "function"
      ) {
        window.ImagePreloader.preloadImage(1)
      }
      // 进入测试
      if (typeof window.enterTestExperience === "function") {
        window.enterTestExperience()
      } else {
        alert("enterTestExperience 函数未找到")
      }
    })
  }

  /**
   * 初始化测试轨迹上传按钮
   */
  function initTestTracksButton() {
    const testTracksBtn = document.getElementById("test-tracks-btn")
    if (!testTracksBtn) return

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

        const result = await window.API.uploadDrawingTracks(
          drawingTracks,
          userId
        )
        console.log("[测试] uploadDrawingTracks 结果:", result)
        alert("轨迹上传成功，请查看控制台")
      } catch (error) {
        console.error("[测试] uploadDrawingTracks 错误:", error)
        alert("轨迹上传失败: " + error.message)
      }
    })
  }

  /**
   * 初始化所有测试按钮
   */
  function initTestButtons() {
    initTestAudioButton()
    initTestTracksButton()
    initDirectEnterButton()
  }

  // 导出到全局
  window.initTestButtons = initTestButtons

  // 自动初始化（在 DOM 加载完成后）
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTestButtons)
  } else {
    // DOM 已加载，延迟一点执行以确保其他模块已初始化
    setTimeout(initTestButtons, 100)
  }

  console.log("[TestButtons] 测试按钮模块已加载")
})(window)
