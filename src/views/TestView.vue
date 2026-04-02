<template>
  <div class="test-view">
    <!-- 开发测试按钮 -->
    <div v-if="isDevelopment" class="dev-test-buttons">
      <button class="dev-btn" @click="handleDevSubmitAll">
        测试提交文件
      </button>
      <button class="dev-btn" @click="handleDevSkipToPostTest">
        五个问题
      </button>
      <button class="dev-btn" @click="handleDevSkipToPlate10">
        第10张
      </button>
      <button class="dev-btn" @click="handleDevSkipToUploading">
        上传页面
      </button>
      <button class="dev-btn" @click="handleDevSkipToWaiting">
        等待报告
      </button>
      <button class="dev-btn" @click="handleDevClearData" style="background: #ef4444;">
        清除数据
      </button>
    </div>
    
    <!-- 正式测试阶段 -->
    <div v-if="testStore.phase === 'test'" class="test-screen">
      <!-- 图版展示区域 -->
      <div class="image-container" id="image-container">
        <ImageCanvas
          ref="imageCanvasRef"
          :plate-index="testStore.currentPlate"
          :brush-color="brushColor"
          @drawing-complete="handleDrawingComplete"
          @drawing-start="handleDrawingStart"
          @drawing-move="handleDrawingMove"
          @drawing-end="handleDrawingEnd"
        />
        <!-- 音频连接等待遮罩 -->
        <div v-if="!isAudioReady" class="audio-connecting-overlay">
          <div class="audio-connecting-spinner" />
          <span>正在连接下一张图版，请不要刷新网页，稍等一下……</span>
        </div>
      </div>

      <!-- 能量柱 -->
      <EnergyPillar ref="energyPillarRef" :progress="testStore.energyProgress" />

      <!-- 字幕区域 -->
      <div v-if="showSubtitles" class="subtitle-container">
        <div class="subtitle-content">
          <div class="subtitle-text" :class="subtitleClass">
            {{ currentSubtitle }}
            <span v-if="isSubtitleTyping" class="typing-cursor"></span>
          </div>
        </div>
      </div>
      <!-- 控制栏 -->
      <ControlsBar
        :current-plate="testStore.currentPlate + 1"
        :total-plates="10"
        :min-view-time="1"
        @tool-change="handleToolChange"
        @color-change="handleColorChange"
        @zoom-in="handleZoomIn"
        @zoom-out="handleZoomOut"
        @rotate-left="handleRotateLeft"
        @rotate-right="handleRotateRight"
        @next="handleNextPlate"
        @previous="handlePreviousPlate"
        @clear-all="handleClearAll"
      />
    </div>

    <!-- 后测问卷阶段 -->
    <div v-else-if="testStore.phase === 'postTest'" class="post-test-screen">
      <!-- 音频连接等待遮罩 -->
      <div v-if="!isAudioReady" class="audio-connecting-overlay">
        <div class="audio-connecting-spinner" />
        <span>正在连接下一张图版，请不要刷新网页，稍等一下……</span>
      </div>
      <PostTestForm @submit="handlePostTestSubmit" />
    </div>

    <!-- 上传文件阶段 -->
    <div v-else-if="testStore.phase === 'uploading'" class="uploading-screen">
      <UploadingView 
        :session-id="testStore.sessionId" 
        @upload-complete="handleUploadComplete"
      />
    </div>

    <!-- 等待报告阶段 -->
    <div v-else-if="testStore.phase === 'waiting'" class="waiting-screen">
      <WaitingReportView :session-id="testStore.sessionId" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTestStore } from '@/stores/testStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import BaseButton from '@/components/common/BaseButton.vue'
import ImageCanvas from '@/components/test/ImageCanvas.vue'
import ControlsBar from '@/components/test/ControlsBar.vue'
import EnergyPillar from '@/components/test/EnergyPillar.vue'
import PostTestForm from '@/components/forms/PostTestForm.vue'
import UploadingView from '@/components/effects/UploadingView.vue'
import WaitingReportView from '@/components/effects/WaitingReportView.vue'

// Composables
import { useSession } from '@/composables/useSession'
import { useInteractionTracker } from '@/composables/useInteractionTracker'
import { useImagePreloader } from '@/composables/useImagePreloader'
import { useRealtimeDialog } from '@/composables/useRealtimeDialog'
import { useSubtitle } from '@/composables/useSubtitle'
import { useApi } from '@/composables/useApi'
import { getSystemPromptForPlate, POSTTEST_PROMPT, isDevelopment } from '@/utils/constants'
import { stopAllAudios } from '@/utils/audioManager'

const router = useRouter()
const testStore = useTestStore()
const sessionStore = useSessionStore()
const uiStore = useUiStore()
const authStore = useAuthStore()

// 初始化 composables
const session = useSession()
const tracker = useInteractionTracker()
const imagePreloader = useImagePreloader()
// 使用全局 WebRTC 单例（连接由 App.vue 自动管理）
const dialog = useRealtimeDialog()
// audioRecorder 已被 dialog.startMixedRecording() 替代
const subtitle = useSubtitle()
const api = useApi()

const imageCanvasRef = ref(null)
const energyPillarRef = ref(null)
const showSubtitles = ref(false)
const currentSubtitle = ref('')
const isSubtitleTyping = ref(false)
const subtitleSpeaker = ref('assistant')
const showRestoreDialog = ref(false)
const brushColor = ref('#ef4444') // 默认红色
const hasPlayedOpeningSpeech = ref(false) // 是否已播放开场白
const isPlateSwitching = ref(false)
const isAudioReady = ref(false) // 默认显示遮罩，WebRTC 连接就绪后再置 true

// TTS 播报提示词（让 AI 只朗读不添加额外解释）
const TTS_READ_ONLY_PROMPT = '请仅朗读以下文本内容，逐字逐句播报，不要添加任何前缀或后缀，也不要添加任何额外解释，保持原文的换行与停顿：'

// 记录已刷新过 system prompt 的图版，避免重复刷新
const lastSystemPromptRefreshedPlate = ref(-1)

// ==================== 按图版分段录音上传 ====================

/**
 * 停止当前图版的录音，异步转 MP3 并上传（不阻塞主流程）
 * @param {number} plateIndex - 图版索引（0-9），用于命名 media1.mp3 ~ media10.mp3
 */
async function stopAndUploadCurrentPlateAudio(plateIndex) {
  const userId = authStore.userInfo?.username || authStore.userInfo?.phone || authStore.userId
  try {
    const recordingStatus = dialog.getMixedRecordingStatus()
    if (!recordingStatus.isRecording && recordingStatus.chunksCount === 0) {
      console.log(`[TestView] 图版 ${plateIndex + 1} 无录音数据，跳过上传`)
      return
    }

    console.log(`[TestView] 停止图版 ${plateIndex + 1} 录音...`)
    const webmBlob = await dialog.stopMixedRecording()
    if (!webmBlob || webmBlob.size === 0) {
      console.warn(`[TestView] 图版 ${plateIndex + 1} 录音数据为空，跳过上传`)
      return
    }

    // 异步转码 + 上传，不 await，避免阻塞用户切图
    const uploadAsync = async () => {
      try {
        console.log(`[TestView] 图版 ${plateIndex + 1} 开始转码 MP3...`)
        const mp3Blob = await dialog.convertWebMToMP3(webmBlob)
        if (!mp3Blob || mp3Blob.size === 0) {
          console.warn(`[TestView] 图版 ${plateIndex + 1} MP3 转码结果为空，跳过上传`)
          return
        }
        console.log(`[TestView] 图版 ${plateIndex + 1} MP3 大小: ${(mp3Blob.size / 1024 / 1024).toFixed(2)}MB，开始上传...`)
        await api.uploadMedia(mp3Blob, userId, null, plateIndex)
        console.log(`[TestView] ✓ 图版 ${plateIndex + 1} 音频上传完成（media${plateIndex + 1}.mp3）`)
      } catch (err) {
        console.error(`[TestView] ✗ 图版 ${plateIndex + 1} 音频转码/上传失败:`, err)
      }
    }
    uploadAsync()
  } catch (err) {
    console.error(`[TestView] ✗ 停止图版 ${plateIndex + 1} 录音失败:`, err)
  }
}

/**
 * 断开 WebRTC 并重新连接（每张图独立会话），然后开始新录音
 * @returns {number|null} 新录音开始时间戳
 */
async function reconnectAndStartRecording() {
  const MAX_RETRIES = 3
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 断开旧连接（录音已在 stopAndUploadCurrentPlateAudio 里停了，这里清空数据）
      if (dialog.isConnected.value) {
        console.log(`[TestView] 断开旧 WebRTC 连接... (attempt ${attempt}/${MAX_RETRIES})`)
        await dialog.disconnect(true)
      }

      // 让上一次连接的资源释放有足够时间，降低“紧跟着重连导致 datachannel 建连慢/失败”的概率（TURN relay 下更常见）
      await new Promise(resolve => setTimeout(resolve, 5000))

      // 重新连接（使用新图版对应的提示词）
      console.log('[TestView] 重新建立 WebRTC 连接（新会话）...')
      await dialog.connect(getSystemPromptForPlate(testStore.currentPlate), 'alloy')

      dialog.setCallbacks({
        onTranscript: (transcript) => {
          subtitle.show(transcript.text, transcript.speaker)
        }
      })

      // 开始新录音
      const recordingStartTime = Date.now()
      await dialog.startMixedRecording()
      console.log('[TestView] ✓ 新录音已开始，时间戳:', recordingStartTime)
      return recordingStartTime
    } catch (err) {
      console.error(`[TestView] 重新连接 WebRTC 失败 (attempt ${attempt}/${MAX_RETRIES}):`, err)
      if (attempt < MAX_RETRIES) {
        // 简单退避：给 ICE/TURN 一点时间恢复
        await new Promise(resolve => setTimeout(resolve, 3000 * attempt))
      }
    }
  }

  return null
}

// 构建 TTS 播报查询文本
function buildTTSQuery(text) {
  return `${TTS_READ_ONLY_PROMPT}\n${text}`
}

function refreshSystemPromptForPlate(plateIndex) {
  if (!dialog.isConnected.value) return false
  // 只在主测试阶段刷新，避免覆盖后测提示词
  if (testStore.phase !== 'test') return false
  if (plateIndex === lastSystemPromptRefreshedPlate.value) return true

  // 根据图版索引选择对应提示词：第 1 张用 SYSTEM_1_PROMPT，第 2-10 张用 SYSTEM_2_10_PROMPT
  const updated = dialog.updateSession({ systemPrompt: getSystemPromptForPlate(plateIndex) })

  if (updated) {
    lastSystemPromptRefreshedPlate.value = plateIndex
  }
  return updated
}

// 发送 TTS 播报
async function sendTTSBroadcast(text) {
  if (!dialog.isConnected.value) {
    console.warn('[TestView] WebRTC 未连接，无法播报')
    return false
  }
  
  try {
    const ttsQuery = buildTTSQuery(text)
    console.log('[TestView] 发送 TTS 播报:', text)
    dialog.sendTextMessage(ttsQuery)
    
    // 显示字幕
    showSubtitles.value = true
    currentSubtitle.value = text
    subtitleSpeaker.value = 'assistant'
    
    return true
  } catch (error) {
    console.warn('[TestView] TTS 播报失败:', error)
    return false
  }
}

// 颜色映射
const colorMap = {
  red: '#ef4444',
  green: '#10b981',
  blue: '#3b82f6',
  white: '#ffffff'
}

// 字幕样式类
const subtitleClass = computed(() => {
  return subtitleSpeaker.value === 'user' ? 'subtitle-user' : 'subtitle-assistant'
})

// 监听字幕变化
watch(() => subtitle.currentText.value, (text) => {
  currentSubtitle.value = text
  showSubtitles.value = subtitle.isVisible.value
  isSubtitleTyping.value = subtitle.isTyping?.value || false
})

// 监听对话转录
watch(() => dialog.transcripts, (transcripts) => {
  if (transcripts.length > 0) {
    const latest = transcripts[transcripts.length - 1]
    subtitleSpeaker.value = latest.speaker || 'assistant'
    subtitle.show(latest.text, latest.speaker)
    testStore.addDialogEntry(latest)
  }
}, { deep: true })

onMounted(async () => {
  console.log('[TestView] 组件已挂载，当前阶段:', testStore.phase)
  
  // 停止所有之前的音频播放（来自准备页面或说明页面）
  stopAllAudios()
  
  // 等待初始状态检查完成（防止刷新时的时序问题）
  if (!testStore.initialCheckComplete) {
    console.log('[TestView] 等待初始状态检查完成...')
    // 最多等待 3 秒
    let waitCount = 0
    while (!testStore.initialCheckComplete && waitCount < 30) {
      await new Promise(resolve => setTimeout(resolve, 100))
      waitCount++
    }
    console.log('[TestView] 初始状态检查已完成，当前阶段:', testStore.phase)
  }
  
  // 如果不是测试阶段，重定向
  if (testStore.phase !== 'test' && testStore.phase !== 'postTest' && testStore.phase !== 'uploading' && testStore.phase !== 'waiting') {
    console.log('[TestView] 当前阶段不是测试阶段，重定向到准备页面')
    router.push('/prep')
    return
  }

  console.log('[TestView] 当前阶段:', testStore.phase)

  // 懒加载图片：只预加载当前图片和后续 2 张
  uiStore.showLoading('正在加载测试资源...')
  try {
    // 预加载当前图片和后续 2 张（懒加载模式）
    imagePreloader.preloadAhead(testStore.currentPlate, 2)
    console.log('[TestView] 懒加载模式：预加载图片', testStore.currentPlate, '及后续 2 张')
  } catch (error) {
    console.error('图片预加载失败:', error)
  } finally {
    uiStore.hideLoading()
  }

  // 初始化会话管理
  const pendingSession = session.init()
  if (pendingSession) {
    showRestoreDialog.value = true
  }

  // uploading / waiting 阶段不需要 WebRTC，直接移除遮罩
  if (testStore.phase === 'uploading' || testStore.phase === 'waiting') {
    isAudioReady.value = true
  }

  // postTest 阶段（页面刷新恢复）需要连接 WebRTC
  if (testStore.phase === 'postTest') {
    console.log('[TestView] 后测问卷阶段（恢复），启动 WebRTC...')
    await startVoiceDialog()
    isAudioReady.value = true
  }

  // 如果是测试阶段，确保追踪已开始
  if (testStore.phase === 'test') {
    console.log('[TestView] 测试阶段，确保追踪已启动')
    
    // 设置背景主题
    uiStore.setBackgroundTheme(testStore.currentPlate)
    
    // 先启动语音对话和录音（WebRTC 连接可能需要几秒）
    console.log('[TestView] 测试阶段，启动 WebRTC 语音对话...')
    isAudioReady.value = false
    const recordingStartTime = await startVoiceDialog()
    isAudioReady.value = true

    // 录音启动后再开始追踪，使用录音开始时间作为基准时间
    if (!tracker.isTracking.value) {
      console.log('[TestView] 录音已启动，开始追踪图版:', testStore.currentPlate)
      console.log('[TestView] - 使用录音开始时间戳:', recordingStartTime)
      tracker.startTracking(testStore.currentPlate, recordingStartTime)
      console.log('[TestView] - testStartTime 已记录')
    }

    // 每张图刷新一次系统提示词（不断开连接）
    try {
      refreshSystemPromptForPlate(testStore.currentPlate)
    } catch (err) {
      console.warn('[TestView] 刷新系统提示词失败:', err)
    }
    
    // 播放开场白（仅第一次进入时）
    if (!hasPlayedOpeningSpeech.value && testStore.currentPlate === 0) {
      hasPlayedOpeningSpeech.value = true
      // 延迟播放，等待 WebRTC 连接完成
      setTimeout(async () => {
        if (dialog.isConnected.value) {
          const openingText = '这是第一张墨迹图片，你可以看到一些什么？'
          console.log('[TestView] 播放开场白:', openingText)
          await sendTTSBroadcast(openingText)
        } else {
          console.log('[TestView] WebRTC 未连接，等待连接后播放开场白')
          // 监听连接状态
          const checkConnection = setInterval(() => {
            if (dialog.isConnected.value) {
              clearInterval(checkConnection)
              const openingText = '这是第一张墨迹图片，你可以看到一些什么？'
              console.log('[TestView] WebRTC 已连接，播放开场白:', openingText)
              sendTTSBroadcast(openingText)
            }
          }, 500)
          // 10 秒后停止检查
          setTimeout(() => clearInterval(checkConnection), 10000)
        }
      }, 1500)
    }
  }
})

onUnmounted(() => {
  // 清理
  session.destroy()
  // 注意：不断开 WebRTC 连接，因为它是全局单例，由 App.vue 管理
  tracker.resetInteractionData()
})

// 监听 phase 变化，处理已经在 /test 页面时点击"直接进入"的情况
watch(() => testStore.phase, async (newPhase, oldPhase) => {
  console.log('[TestView] phase 变化:', oldPhase, '→', newPhase)
  
  // 当 phase 变为 'test' 时，启动 WebRTC（如果还没连接）
  if (newPhase === 'test' && oldPhase !== 'test') {
    console.log('[TestView] phase 切换到 test，检查 WebRTC 连接状态...')

    // 切换到测试阶段时立刻显示连接遮罩，避免从说明页跳转时出现延迟才显示
    isAudioReady.value = false
    showSubtitles.value = false
    currentSubtitle.value = ''
    
    // 设置背景主题
    uiStore.setBackgroundTheme(testStore.currentPlate)
    
    // 先启动语音对话和录音
    let recordingStartTime = null
    if (!dialog.isConnected.value && !dialog.isConnecting.value) {
      console.log('[TestView] WebRTC 未连接，启动语音对话...')
      recordingStartTime = await startVoiceDialog()
    } else {
      console.log('[TestView] WebRTC 已连接，跳过重新连接')
    }

    // WebRTC/混合录音启动完成后再移除遮罩
    isAudioReady.value = true

    // 录音启动后再开始追踪，使用录音开始时间作为基准时间
    if (!tracker.isTracking.value) {
      console.log('[TestView] 录音已启动，开始追踪图版:', testStore.currentPlate)
      tracker.startTracking(testStore.currentPlate, recordingStartTime)
    }
  }
})

// 开始测试
function handleStartTest() {
  console.log('[TestView] handleStartTest 被调用')
  
  // 如果测试还未初始化，先初始化
  if (!testStore.sessionId) {
    console.log('[TestView] 测试未初始化，先初始化')
    testStore.startTest()
  }
  
  uiStore.setBackgroundTheme(testStore.currentPlate)
  
  // 注意：不在这里调用 startTracking
  // 时间戳追踪会在 watch 中的 startVoiceDialog 完成后启动
  // 确保时间戳与音频录制开始时间同步
}

// 绘图完成
function handleDrawingComplete(data) {
  testStore.recordInteraction('drawingTracks', testStore.currentPlate, data)
}

// 画笔追踪 - 开始绘制
function handleDrawingStart({ x, y, color }) {
  tracker.trackDrawingStart(x, y, color)
  // 激活能量柱波纹效果
  energyPillarRef.value?.startDrawing()
}

// 画笔追踪 - 绘制移动
function handleDrawingMove({ x, y, clientX, clientY }) {
  tracker.trackDrawingPoint(x, y)
  // 生成粒子飞向能量柱
  if (clientX !== undefined && clientY !== undefined) {
    energyPillarRef.value?.onDrawMove(clientX, clientY)
  }
}

// 画笔追踪 - 结束绘制
function handleDrawingEnd() {
  tracker.trackDrawingEnd()
  // 停止能量柱波纹效果
  energyPillarRef.value?.stopDrawing()
}

// 工具切换
function handleToolChange(tool) {
  imageCanvasRef.value?.setTool(tool)
}

// 颜色切换
function handleColorChange(color) {
  brushColor.value = colorMap[color] || '#ef4444'
  imageCanvasRef.value?.setBrushColor(brushColor.value)
}

// 缩放
function handleZoomIn() {
  imageCanvasRef.value?.zoomIn()
  tracker.trackZoom(testStore.currentPlate, 1)
  testStore.markZoomUsed()
}

function handleZoomOut() {
  imageCanvasRef.value?.zoomOut()
  tracker.trackZoom(testStore.currentPlate, -1)
  testStore.markZoomUsed()
}

// 旋转
function handleRotateLeft() {
  imageCanvasRef.value?.rotateLeft()
  tracker.trackRotate(testStore.currentPlate, -90)
}

function handleRotateRight() {
  imageCanvasRef.value?.rotateRight()
  tracker.trackRotate(testStore.currentPlate, 90)
}

// 一键擦除
function handleClearAll() {
  imageCanvasRef.value?.clearCanvas()
}

// 下一张图版
async function handleNextPlate() {
  if (isPlateSwitching.value) {
    console.warn('[TestView] handleNextPlate：切图进行中，忽略本次点击')
    return
  }
  isPlateSwitching.value = true
  try {
    // 结束当前图版的追踪（会自动保存未完成的画笔轨迹）
    tracker.stopTracking(testStore.currentPlate)
  
  // 检查是否是最后一张图（索引 9，即第 10 张）
  const isLastPlate = testStore.currentPlate >= 9
  console.log('[TestView] handleNextPlate - currentPlate:', testStore.currentPlate, 'isLastPlate:', isLastPlate)
  
  if (isLastPlate) {
    // 最后一张图完成后，先停录音上传，再进入后测问卷
    console.log('[TestView] 最后一张图完成，停止录音并进入后测问卷')

    // 停止第 10 张录音并异步上传
    await stopAndUploadCurrentPlateAudio(testStore.currentPlate)

    tracker.recordSelectPhase()
    testStore.setPhase('postTest')

    // 重新连接 WebRTC（后测阶段使用后测提示词）
    isAudioReady.value = false
    showSubtitles.value = false
    currentSubtitle.value = ''
    // 使用与主测试相同的重连策略，提高频繁断开/重连时的成功率
    const MAX_RETRIES = 5
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (dialog.isConnected.value) {
          console.log(`[TestView] 后测阶段断开旧 WebRTC 连接... (attempt ${attempt}/${MAX_RETRIES})`)
          await dialog.disconnect(true)
        }

        await new Promise(resolve => setTimeout(resolve, 5000))

        await dialog.connect(POSTTEST_PROMPT, 'alloy')
        dialog.setCallbacks({
          onTranscript: (transcript) => {
            subtitle.show(transcript.text, transcript.speaker)
          }
        })
        await dialog.startMixedRecording()
        console.log('[TestView] 后测阶段 WebRTC 已重新连接并开始录音')
        isAudioReady.value = true
        break
      } catch (err) {
        console.error(`[TestView] 后测阶段重连 WebRTC 失败 (attempt ${attempt}/${MAX_RETRIES}):`, err)
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 3000 * attempt))
        } else {
          // 全部重试失败，解除遮罩避免界面卡死
          isAudioReady.value = true
        }
      }
    }
  } else {
    const completedPlate = testStore.currentPlate

    // 停止当前图版录音并异步上传（不阻塞切图）
    await stopAndUploadCurrentPlateAudio(completedPlate)

    // 切换图版索引
    testStore.nextPlate()

    uiStore.setBackgroundTheme(testStore.currentPlate)
    imageCanvasRef.value?.resetTransform()

    // 音频未就绪，遮罩图片；同时清空上一张图版的字幕
    isAudioReady.value = false
    showSubtitles.value = false
    currentSubtitle.value = ''

    // 懒加载：预加载当前图片和后续 2 张
    imagePreloader.preloadAhead(testStore.currentPlate, 2)

    // 重新连接 WebRTC（新会话、清空历史）并开始新录音
    const recordingStartTime = await reconnectAndStartRecording()

    // 连接成功，揭开遮罩
    isAudioReady.value = true

    // 立即记录新图版的时间戳
    if (recordingStartTime) {
      tracker.startTracking(testStore.currentPlate, recordingStartTime)
    } else {
      console.warn('[TestView] 新录音时间戳为空，跳过本图 startTracking')
    }

    // 刷新去重标记（新连接后重置，确保新图版会刷新）
    lastSystemPromptRefreshedPlate.value = testStore.currentPlate

    // 播报当前图片的提示语音
    try {
      const promptText = '这张图你可以看到什么？'
      console.log('[TestView] 切换图片，播报提示:', promptText)
      await sendTTSBroadcast(promptText)
    } catch (err) {
      console.warn('[TestView] 播报提示失败:', err)
    }
  }
    session.saveSnapshot('next_plate')
  } finally {
    isPlateSwitching.value = false
  }
}

// 上一张图版
function handlePreviousPlate() {
  testStore.previousPlate()
  uiStore.setBackgroundTheme(testStore.currentPlate)
  
  // 每张图刷新一次系统提示词（不断开连接）
  try {
    refreshSystemPromptForPlate(testStore.currentPlate)
  } catch (err) {
    console.warn('[TestView] 刷新系统提示词失败:', err)
  }
}

// 后测问卷提交 - 直接进入上传阶段
async function handlePostTestSubmit(answers) {
  // 保存问卷答案
  Object.entries(answers).forEach(([key, value]) => {
    testStore.setPostTestAnswer(key, value)
  })
  session.saveSnapshot('posttest_complete')

  // 先停止后测阶段录音并转码，保存 blob 待上传阶段使用
  const userId = authStore.userInfo?.username || authStore.userInfo?.phone || authStore.userId
  try {
    const recordingStatus = dialog.getMixedRecordingStatus()
    console.log('[TestView] 后测提交前录音状态:', JSON.stringify(recordingStatus))

    if (recordingStatus.isRecording || recordingStatus.chunksCount > 0) {
      uiStore.loadingMessage = '正在停止后测录音...'
      const webmBlob = await dialog.stopMixedRecording()

      if (webmBlob && webmBlob.size > 0) {
        uiStore.loadingMessage = '正在转换后测音频格式...'
        const mp3Blob = await dialog.convertWebMToMP3(webmBlob)

        if (mp3Blob && mp3Blob.size > 0) {
          testStore.setPostTestAudioBlob(mp3Blob)
          console.log('[TestView] 后测音频已转码并暂存，等待上传阶段上传')
        } else {
          console.warn('[TestView] 后测 MP3 转码结果为空')
        }
      } else {
        console.warn('[TestView] 后测 WebM blob 为空')
      }
    } else {
      console.log('[TestView] 后测阶段无录音数据')
    }
  } catch (err) {
    console.warn('[TestView] 后测音频处理失败:', err)
  }

  // 关闭 WebRTC 连接
  console.log('[TestView] 后测提交后，关闭 WebRTC 连接')
  try {
    if (dialog.isConnected.value) {
      await dialog.disconnect(true)
      console.log('[TestView] WebRTC 连接已关闭（后测音频已处理）')
    }
  } catch (error) {
    console.warn('[TestView] 关闭 WebRTC 连接失败:', error)
  }

  // 直接进入上传阶段（各图版音频已在切图时逐张上传）
  testStore.setPhase('uploading')
}

// 上传完成后进入等待报告阶段
async function handleUploadComplete() {
  console.log('[TestView] 上传完成')

  // 清除本地会话快照，防止刷新后恢复到上传阶段
  session.markCompleted()

  // 进入等待报告阶段
  testStore.setPhase('waiting')
}

// 恢复会话
function handleRestoreSession() {
  session.restoreSession()
  showRestoreDialog.value = false
}

// 放弃恢复会话
function handleDiscardSession() {
  session.clearSnapshot()
  showRestoreDialog.value = false
}

// 根据当前阶段和图版索引获取对应的提示词
function getPromptForCurrentPhase() {
  if (testStore.phase === 'postTest') {
    return POSTTEST_PROMPT
  }
  return getSystemPromptForPlate(testStore.currentPlate)
}

// 开始语音对话
async function startVoiceDialog() {
  try {
    const currentPrompt = getPromptForCurrentPhase()
    console.log('[TestView] 当前阶段:', testStore.phase, '使用提示词:', currentPrompt.substring(0, 50) + '...')

    // 如果尚未连接，先建立连接
    if (!dialog.isConnected.value && !dialog.isConnecting.value) {
      console.log('[TestView] WebRTC 未连接，正在建立连接...')
      await dialog.connect(currentPrompt, 'alloy')
    } else if (dialog.isConnected.value) {
      // 如果已连接，更新 session 指令
      console.log('[TestView] WebRTC 已连接，更新 session 配置...')
      dialog.updateSession({
        systemPrompt: currentPrompt
      })
    }

    // 开始混合录音（麦克风 + AI 回复）
    let recordingStartTime = null
    try {
      console.log('[TestView] 正在启动混合录音...')
      console.log('[TestView] - WebRTC 连接状态:', dialog.isConnected.value)
      // 在录音开始的瞬间记录时间戳
      recordingStartTime = Date.now()
      console.log('[TestView] - 录音开始时间戳:', recordingStartTime)
      await dialog.startMixedRecording()
      const status = dialog.getMixedRecordingStatus()
      console.log('[TestView] ✓ 混合录音已启动:', status)
      console.log('[TestView] - startMixedRecording 耗时:', Date.now() - recordingStartTime, 'ms')
    } catch (error) {
      console.error('[TestView] ✗ 启动混合录音失败:', error)
      console.error('[TestView] - 错误详情:', error.message)
    }

    dialog.setCallbacks({
      onTranscript: (transcript) => {
        subtitle.show(transcript.text, transcript.speaker)
      }
    })

    // 返回录音开始时间戳
    return recordingStartTime
  } catch (error) {
    console.error('语音对话启动失败:', error)
    uiStore.showError('语音对话启动失败，请检查麦克风���限')
    return null
  }
}

// 结束语音对话（断开连接但保留录音数据供上传使用）
async function stopVoiceDialog() {
  console.log('[TestView] 停止语音对话，断开 WebRTC 连接但保留录音数据')
  try {
    if (dialog.isConnected.value) {
      // 断开连接但不清空录音数据（clearRecordingData = false）
      await dialog.disconnect(false)
      console.log('[TestView] WebRTC 连接已断开，录音数据已保留')
    }
  } catch (error) {
    console.warn('[TestView] 断开 WebRTC 连接失败:', error)
  }
}

// 提交测试
async function handleSubmit() {
  uiStore.showLoading('正在提交测试数据...')
  
  try {
    // 获取用户ID（优先使用 username，与原始代码一致）
    const userId = authStore.userInfo?.username || authStore.userInfo?.phone || authStore.userId
    console.log('[TestView] 开始提交测试数据，用户ID:', userId)
    
    // 停止追踪并记录结束时间
    tracker.stop()
    
    // 获取交互数据
    const interactionData = tracker.formatForUpload()
    
    // 打印完整统计数据
    tracker.printAllPlatesStatistics()
    
    // 格式化当前时间
    const now = new Date()
    const testTime = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '-')
    
    // 1. 上传基本信息（转换为中文字段名，确保年龄是字符串）
    uiStore.loadingMessage = '正在上传基本信息...'
    const basicInfoChinese = {
      性别: testStore.basicInfo.sex,
      年龄: String(testStore.basicInfo.age),
      学历: testStore.basicInfo.education,
      职业: testStore.basicInfo.occupation,
      当前心情: testStore.basicInfo.mood,
      测试时间: testTime
    }
    await api.setBasicInfo(userId, basicInfoChinese)
    console.log('[TestView] 基本信息已上传')
    
    // 2. 上传缩放数据（scale.json）
    uiStore.loadingMessage = '正在上传缩放数据...'
    await api.uploadZoom(interactionData.zoom, userId)
    console.log('[TestView] 缩放数据已上传')
    
    // 3. 上传旋转数据（rotate.json）
    uiStore.loadingMessage = '正在上传旋转数据...'
    await api.uploadRotate(interactionData.rotate, userId)
    console.log('[TestView] 旋转数据已上传')
    
    // 4. 上传笔迹轨迹数据（drawing_tracks.json）
    uiStore.loadingMessage = '正在上传绘画轨迹...'
    // 获取 canvas 实际尺寸（不是容器尺寸）
    const drawingData = imageCanvasRef.value?.getDrawingData()
    const canvasSize = drawingData ? 
      [drawingData.canvasHeight, drawingData.canvasWidth] : 
      [0, 0]
    await api.uploadDrawingTracks(interactionData.drawingTracks, userId, canvasSize)
    console.log('[TestView] 绘画轨迹已上传，canvas 尺寸:', canvasSize)
    
    // 5. 上传时间戳数据（video_clip.json）
    uiStore.loadingMessage = '正在上传时间数据...'
    const audioTimestamps = tracker.getAudioTimestamps()
    await api.uploadSegTime(audioTimestamps, userId)
    console.log('[TestView] 时间戳数据已上传')
    
    // 6. 上传后测问题答案（5_questions.json）
    uiStore.loadingMessage = '正在上传问卷答案...'
    await api.upload5Questions(testStore.postTestAnswers, userId)
    console.log('[TestView] 问卷答案已上传')
    
    // 注意：各图版音频已在切图时逐张上传（media1.mp3 ~ media10.mp3），无需在此重复上传

    // 7（原8）. 触发分析
    uiStore.loadingMessage = '正在启动分析...'
    await api.analyzeTest(userId)
    console.log('[TestView] 分析已启动')
    
    // 标记完成
    session.markCompleted()
    
    // 进入等待报告阶段
    testStore.setPhase('waiting')
  } catch (error) {
    uiStore.showError('提交失败，请重试')
    console.error('Submit error:', error)
  } finally {
    uiStore.hideLoading()
  }
}

// ==================== 开发测试函数 ====================

// 开发测试 - 提交所有文件（使用真实数据）
async function handleDevSubmitAll() {
  uiStore.showLoading('正在提交所有文件（真实数据）...')
  
  try {
    const userId = authStore.userInfo?.username || authStore.userInfo?.phone || 'test_user'
    console.log('[DevTest] 开始提交真实数据，用户ID:', userId)
    
    // 停止追踪并获取真实交互数据
    tracker.stop()
    const interactionData = tracker.formatForUpload()
    console.log('[DevTest] 真实交互数据:', interactionData)
    
    // 基本信息已在准备页面提交，无需再次上传
    
    // 1. 上传缩放数据（真实数据）
    uiStore.loadingMessage = '正在上传缩放数据...'
    await api.uploadZoom(interactionData.zoom, userId)
    console.log('[DevTest] 缩放数据已上传:', interactionData.zoom)
    
    // 2. 上传旋转数据（真实数据）
    uiStore.loadingMessage = '正在上传旋转数据...'
    await api.uploadRotate(interactionData.rotate, userId)
    console.log('[DevTest] 旋转数据已上传:', interactionData.rotate)
    
    // 3. 上传画笔轨迹数据（真实数据）
    uiStore.loadingMessage = '正在上传画笔轨迹...'
    const drawingData = imageCanvasRef.value?.getDrawingData()
    const canvasSize = drawingData ? 
      [drawingData.canvasHeight, drawingData.canvasWidth] : 
      [600, 800]
    await api.uploadDrawingTracks(interactionData.drawingTracks, userId, canvasSize)
    console.log('[DevTest] 画笔轨迹已上传，canvas 尺寸:', canvasSize, interactionData.drawingTracks)
    
    // 4. 上传时间戳数据（真实数据）
    uiStore.loadingMessage = '正在上传时间戳数据...'
    const audioTimestamps = tracker.getAudioTimestamps()
    await api.uploadSegTime(audioTimestamps, userId)
    console.log('[DevTest] 时间戳数据已上传:', audioTimestamps)
    
    // 5. 上传五个问题答案（真实数据或空数据）
    uiStore.loadingMessage = '正在上传问卷答案...'
    const postTestAnswers = testStore.postTestAnswers || { self: [], father: [], mother: [], like: [], dislike: [] }
    await api.upload5Questions(postTestAnswers, userId)
    console.log('[DevTest] 问卷答案已上传:', postTestAnswers)
    
    // 注意：各图版音频已在切图时逐张上传（media1.mp3 ~ media10.mp3），无需在此重复上传

    uiStore.showSuccess('所有真实数据文件已成功上传！')
  } catch (error) {
    uiStore.showError('提交失败: ' + error.message)
    console.error('[DevTest] 提交失败:', error)
  } finally {
    uiStore.hideLoading()
  }
}

// 开发测试 - 跳到第10张图片
function handleDevSkipToPlate10() {
  testStore.setPhase('test')
  testStore.goToPlate(9)
}

// 开发测试 - 跳到后测问卷（五个问题）
function handleDevSkipToPostTest() {
  testStore.setPhase('postTest')
  // 启动语音对话（使用后测提示词）
  startVoiceDialog()
}

// 开发测试 - 跳到上传页面
function handleDevSkipToUploading() {
  testStore.setPhase('uploading')
}

// 开发测试 - 跳到等待报告页面
function handleDevSkipToWaiting() {
  testStore.setPhase('waiting')
}

// 开发测试 - 清除所有测试数据
function handleDevClearData() {
  if (confirm('确定要清除所有测试数据吗？')) {
    testStore.resetTest()
    console.log('[Dev] 已清除所有测试数据')
    alert('数据已清除，请重新进行测试')
  }
}
</script>

<style lang="less" scoped>
.test-view {
  width: 100%;
  height: 100vh;
  padding-top: 70px; /* 为头部导航栏留出空间 */
  position: relative;
  overflow: hidden;
  background: transparent;
  box-sizing: border-box;
}

// 开发测试按钮
.dev-test-buttons {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  gap: 10px;
}

.dev-btn {
  padding: 8px 16px;
  background: rgba(239, 68, 68, 0.9);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(239, 68, 68, 1);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
}

.test-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
  background: transparent;
}

// 图片容器 - 继承自 ImageCanvas 组件
.image-container {
  flex: 1;
  width: 100%;
  max-height: calc(100vh - 140px); // 减去控制栏高度，限制图片区域
  position: relative;
  overflow: hidden;
  background: transparent;
}

.audio-connecting-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  /* 强模糊为主、底色为辅：既难辨认原图，又不会一片死黑 */
  background: rgba(22, 22, 30, 0.72);
  backdrop-filter: blur(36px) saturate(0.55);
  -webkit-backdrop-filter: blur(36px) saturate(0.55);
  z-index: 10;
  color: #fff;
  font-size: 16px;
  letter-spacing: 1px;
}

.audio-connecting-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// 字幕样式 - 单行显示，宽度更大
.subtitle-container {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 80px; // 控制栏高度上方
  width: auto;
  max-width: 95%; // 加宽
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 32px; // 左右内边距加大
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  border-radius: 24px; // 更圆润
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.subtitle-content {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.subtitle-text {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  font-size: 16px; // 字体稍大
  font-weight: 400;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.95);
  text-align: center;
  white-space: nowrap; // 单行显示
  overflow: hidden;
  text-overflow: ellipsis; // 超长时显示省略号
  transition: all 0.25s ease;
}

.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  min-height: 14px;
  background: rgba(255, 255, 255, 0.9);
  animation: blink 1s infinite;
  margin-left: 3px;
  vertical-align: middle;
  border-radius: 1px;
  user-select: none;
  pointer-events: none;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.post-test-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  position: relative;
  z-index: 1;
  overflow: hidden;
  background: transparent;
}

.uploading-screen,
.waiting-screen {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  position: relative;
  z-index: 1;
  background: transparent;
}

.summary-card {
  background: rgba(30, 30, 50, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 40px;
  max-width: 500px;
  width: 100%;
  text-align: center;

  h2 {
    color: white;
    margin-bottom: 24px;
  }

  p {
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 32px;
  }
}

@media (max-width: 768px) {
  .image-container {
    padding: 16px;
    min-height: min(60vh, 400px);
  }

  .subtitle-container {
    bottom: 70px;
    max-width: 98%;
    padding: 10px 20px;
  }

  .subtitle-text {
    font-size: 14px;
  }
}
</style>
