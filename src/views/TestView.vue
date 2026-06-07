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
      <button class="dev-btn" @click="handleDevSimulateConnectFail" style="background: #7c3aed;">
        模拟连接失败
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
          <template v-if="!showManualReconnect">
            <div class="audio-connecting-spinner" />
            <span>正在连接下一张图版，请不要刷新网页，稍等一下……</span>
          </template>
          <template v-else>
            <span class="audio-reconnect-tip">连接失败，请点击下方按钮手动重试</span>
            <button
              class="audio-manual-reconnect-btn"
              :disabled="isManualReconnecting"
              @click="handleManualReconnect"
            >
              {{ isManualReconnecting ? '重连中…' : '手动重新连接' }}
            </button>
          </template>
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
        :min-view-time="30"
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
        <template v-if="!showManualReconnect">
          <div class="audio-connecting-spinner" />
          <span>正在连接下一张图版，请不要刷新网页，稍等一下……</span>
        </template>
        <template v-else>
          <span class="audio-reconnect-tip">连接失败，请点击下方按钮手动重试</span>
          <button
            class="audio-manual-reconnect-btn"
            :disabled="isManualReconnecting"
            @click="handleManualReconnect"
          >
            {{ isManualReconnecting ? '重连中…' : '手动重新连接' }}
          </button>
        </template>
      </div>
      <PostTestForm :key="postTestFormKey" @submit="handlePostTestSubmit" />
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

    <!-- 自定义二次确认弹窗（替代 window.confirm） -->
    <BaseModal
      :model-value="confirmDialog.visible"
      :title="confirmDialog.title"
      :closable="false"
      :close-on-overlay="false"
      :show-footer="false"
      size="medium"
    >
      <div class="confirm-dialog">
        <div class="confirm-dialog__icon" :class="`confirm-dialog__icon--${confirmDialog.type}`">
          <svg v-if="confirmDialog.type === 'danger'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <svg v-else-if="confirmDialog.type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <p class="confirm-dialog__message">{{ confirmDialog.message }}</p>
        <div v-if="confirmDialog.showMicTest" class="confirm-dialog__mic-test">
          <div class="confirm-dialog__device-picker">
            <label class="confirm-dialog__device-label">当前输入设备</label>
            <select v-model="selectedMicDeviceId" class="confirm-dialog__device-select">
              <option v-for="device in availableMicDevices" :key="device.id" :value="device.id">
                {{ device.label }}{{ device.isVirtual ? ' (疑似虚拟设备)' : '' }}
              </option>
            </select>
            <p class="confirm-dialog__device-hint">
              如未找到真实麦克风，请点击浏览器右上角地址栏麦克风图标切换输入设备。
            </p>
          </div>
          <BaseButton
            variant="outline"
            size="small"
            :loading="isMicTesting"
            @click="runMicrophoneTest"
          >
            {{ isMicTesting ? '检测中…' : '麦克风测试' }}
          </BaseButton>
          <p v-if="micTestResult" class="confirm-dialog__mic-test-result">
            {{ micTestResult }}
          </p>
        </div>
        <div
          class="confirm-dialog__actions"
          :class="{ 'confirm-dialog__actions--single': !confirmDialog.showCancel }"
        >
          <BaseButton
            v-if="confirmDialog.showCancel"
            variant="secondary"
            @click="handleConfirmDialogNo"
          >
            {{ confirmDialog.cancelText }}
          </BaseButton>
          <BaseButton :variant="confirmDialog.confirmVariant" @click="handleConfirmDialogYes">
            {{ confirmDialog.confirmText }}
          </BaseButton>
        </div>
      </div>
    </BaseModal>
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
import BaseModal from '@/components/common/BaseModal.vue'
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
import { useApi, saveFileToLocal } from '@/composables/useApi'
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
const postTestFormKey = ref(0) // 用于在后测录音失败重试时强制重建 PostTestForm
const showManualReconnect = ref(false) // 自动重连失败后显示手动按钮
const manualReconnectContext = ref('') // 'plate' | 'postTest'
const isManualReconnecting = ref(false) // 手动重连中

// WebRTC 自动重连：仅尝试 1 次；connect 内数据通道超时 20s（见 useRealtimeDialog）
const WEBRTC_DISCONNECT_SETTLE_MS = 5000

// 自定义二次确认弹窗（替代 window.confirm，统一视觉与多行文案）
const confirmDialog = ref({
  visible: false,
  title: '',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  confirmVariant: 'primary', // primary | danger
  type: 'warning', // info | warning | danger
  showCancel: true, // 是否显示次按钮（false 时只有主按钮，强制用户点主按钮）
  showMicTest: false, // 是否展示“麦克风测试”按钮
  resolve: null
})

function showConfirm({
  title = '请确认',
  message = '',
  confirmText = '确定',
  cancelText = '取消',
  confirmVariant = 'primary',
  type = 'warning',
  showCancel = true,
  showMicTest = false
} = {}) {
  return new Promise((resolve) => {
    confirmDialog.value = {
      visible: true,
      title,
      message,
      confirmText,
      cancelText,
      confirmVariant,
      type,
      showCancel,
      showMicTest,
      resolve
    }
    micTestResult.value = ''
    isMicTesting.value = false
    if (showMicTest) {
      loadAvailableMicDevices().catch((err) => {
        console.warn('[TestView] 加载麦克风列表失败:', err)
      })
    }
  })
}

function handleConfirmDialogYes() {
  const r = confirmDialog.value.resolve
  confirmDialog.value.visible = false
  confirmDialog.value.resolve = null
  if (r) r(true)
}

function handleConfirmDialogNo() {
  const r = confirmDialog.value.resolve
  confirmDialog.value.visible = false
  confirmDialog.value.resolve = null
  if (r) r(false)
}

const isMicTesting = ref(false)
const micTestResult = ref('')
const isHandlingVirtualMicError = ref(false)
const availableMicDevices = ref([])
const selectedMicDeviceId = ref('')

function isVirtualMicLabel(label = '') {
  const normalized = String(label || '').toLowerCase()
  const suspiciousKeywords = [
    'virtual',
    'oray',
    'vb-audio',
    'voicemeeter',
    'blackhole',
    'loopback',
    'soundflower',
    'stereo mix',
    'cable',
    'obs'
  ]
  return suspiciousKeywords.some(keyword => normalized.includes(keyword))
}

async function loadAvailableMicDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    availableMicDevices.value = []
    return
  }
  const devices = await navigator.mediaDevices.enumerateDevices()
  const audioInputs = devices.filter(d => d.kind === 'audioinput')
  availableMicDevices.value = audioInputs.map((d, index) => ({
    id: d.deviceId,
    label: d.label || `麦克风 ${index + 1}`,
    isVirtual: isVirtualMicLabel(d.label)
  }))
  // 初始化选择：优先保留用户已有选择，其次选第一个非虚拟设备
  const hasSelected = availableMicDevices.value.some(d => d.id === selectedMicDeviceId.value)
  if (!hasSelected) {
    const firstReal = availableMicDevices.value.find(d => !d.isVirtual)
    selectedMicDeviceId.value = firstReal?.id || availableMicDevices.value[0]?.id || ''
  }
}

async function runMicrophoneTest() {
  if (isMicTesting.value) return
  isMicTesting.value = true
  micTestResult.value = ''
  let stream = null

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      micTestResult.value = '当前浏览器不支持麦克风检测，请更换浏览器后重试。'
      return
    }

    const devices = await navigator.mediaDevices.enumerateDevices()
    const audioInputs = devices.filter(d => d.kind === 'audioinput')
    if (audioInputs.length === 0) {
      micTestResult.value = '未检测到任何麦克风设备，请先连接麦克风。'
      return
    }

    const audioConstraints = selectedMicDeviceId.value
      ? { deviceId: { exact: selectedMicDeviceId.value } }
      : true
    stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
    const track = stream.getAudioTracks()[0]
    if (!track) {
      micTestResult.value = '检测失败：浏览器未返回可用音频轨道。'
      return
    }

    const trackName = track.label || '未知麦克风'
    if (isVirtualMicLabel(trackName)) {
      micTestResult.value =
        `检测失败：检测到虚拟麦克风「${trackName}」。\n` +
        '请点击浏览器左上角地址栏的麦克风图标，切换为真实麦克风后重试。'
      return
    }
    if (track.readyState !== 'live') {
      micTestResult.value = `检测失败：麦克风轨道状态异常（${track.readyState}）。`
      return
    }
    if (track.muted) {
      micTestResult.value = `检测失败：${trackName} 当前被静音，请检查系统权限或硬件静音键。`
      return
    }

    micTestResult.value = `检测通过：当前可访问麦克风「${trackName}」。`

  } catch (error) {
    const message = error?.message || ''
    if (message.includes('Permission denied') || message.includes('NotAllowedError')) {
      micTestResult.value = '检测失败：麦克风权限被拒绝，请在浏览器地址栏中开启麦克风权限。'
    } else if (message.includes('NotFoundError')) {
      micTestResult.value = '检测失败：未找到可用麦克风设备，请重新插入后重试。'
    } else {
      micTestResult.value = `检测失败：${message || '未知错误'}`
    }
  } finally {
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
    }
    isMicTesting.value = false
  }
}

async function handleDialogError(error) {
  const message = String(error?.message || '')
  if (!message.includes('虚拟麦克风')) return
  if (isHandlingVirtualMicError.value) return
  isHandlingVirtualMicError.value = true

  try {
    await showConfirm({
      title: '检测到虚拟麦克风',
      message:
        `${message}\n\n` +
        '当前设备可能无法采集真实人声，\n' +
        '请切换为真实麦克风后再继续测试。',
      confirmText: '重新连接',
      confirmVariant: 'danger',
      type: 'danger',
      showCancel: false,
      showMicTest: true
    })

    // 用户点击“重新连接”后，按当前阶段执行重连
    isAudioReady.value = false
    showManualReconnect.value = false

    if (testStore.phase === 'postTest') {
      const ok = await retryPostTestRecording(selectedMicDeviceId.value || null)
      if (!ok) {
        manualReconnectContext.value = 'postTest'
        showManualReconnect.value = true
      }
    } else if (testStore.phase === 'test') {
      const recordingStartTime = await reconnectAndStartRecording(selectedMicDeviceId.value || null)
      if (recordingStartTime !== null) {
        isAudioReady.value = true
        tracker.startTracking(testStore.currentPlate, recordingStartTime)
      } else {
        manualReconnectContext.value = 'plate'
        showManualReconnect.value = true
      }
    } else {
      // 其他阶段不需要录音
      isAudioReady.value = true
    }
  } finally {
    isHandlingVirtualMicError.value = false
  }
}

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
async function reconnectAndStartRecording(preferredDeviceId = null) {
  showManualReconnect.value = false
  try {
    if (dialog.isConnected.value) {
      console.log('[TestView] 断开旧 WebRTC 连接...')
      await dialog.disconnect(true)
    }

    // 让上一次连接的资源释放有足够时间，降低紧跟着重连导致 datachannel 建连慢/失败的概率
    await new Promise(resolve => setTimeout(resolve, WEBRTC_DISCONNECT_SETTLE_MS))

    console.log('[TestView] 重新建立 WebRTC 连接（新会话，超时 20s）...')
    await dialog.connect(getSystemPromptForPlate(testStore.currentPlate), 'alloy', {
      preferredDeviceId
    })

    dialog.setCallbacks({
      onTranscript: (transcript) => {
        subtitle.show(transcript.text, transcript.speaker)
      }
    })

    const recordingStartTime = Date.now()
    await dialog.startMixedRecording()
    console.log('[TestView] ✓ 新录音已开始，时间戳:', recordingStartTime)
    showManualReconnect.value = false
    return recordingStartTime
  } catch (err) {
    console.error('[TestView] 重新连接 WebRTC 失败:', err)
    manualReconnectContext.value = 'plate'
    showManualReconnect.value = true
    return null
  }
}

/**
 * 手动重连：用户点击按钮后触发
 */
async function handleManualReconnect() {
  if (isManualReconnecting.value) return
  isManualReconnecting.value = true
  showManualReconnect.value = false

  try {
    if (manualReconnectContext.value === 'postTest') {
      if (dialog.isConnected.value) await dialog.disconnect(true)
      await new Promise(resolve => setTimeout(resolve, WEBRTC_DISCONNECT_SETTLE_MS))
      await dialog.connect(POSTTEST_PROMPT, 'alloy', {
        preferredDeviceId: selectedMicDeviceId.value || null
      })
      dialog.setCallbacks({
        onTranscript: (transcript) => {
          subtitle.show(transcript.text, transcript.speaker)
        }
      })
      await dialog.startMixedRecording()
      console.log('[TestView] 手动重连后测阶段成功')
      isAudioReady.value = true
    } else {
      const recordingStartTime = await reconnectAndStartRecording(selectedMicDeviceId.value || null)
      if (recordingStartTime !== null) {
        isAudioReady.value = true
        tracker.startTracking(testStore.currentPlate, recordingStartTime)
        try {
          await triggerPlateOpening(testStore.currentPlate)
        } catch (err) {
          console.warn('[TestView] 手动重连后触发开场失败:', err)
        }
      }
    }
  } catch (err) {
    console.error('[TestView] 手动重连失败:', err)
    // 再次失败，继续显示按钮
    showManualReconnect.value = true
  } finally {
    isManualReconnecting.value = false
  }
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

// 让 AI 按当前图版系统提示词主动开场，不走 TTS 朗读
function triggerPlateOpening(plateIndex = testStore.currentPlate) {
  if (!dialog.isConnected.value) {
    console.warn('[TestView] WebRTC 未连接，无法触发开场')
    return false
  }

  refreshSystemPromptForPlate(plateIndex)
  console.log(`[TestView] 触发 AI 按图版 ${plateIndex + 1} 系统提示词主动开场`)
  return dialog.requestAssistantResponse()
}

function waitAndTriggerPlateOpening(plateIndex = testStore.currentPlate) {
  if (triggerPlateOpening(plateIndex)) return

  const checkConnection = setInterval(() => {
    if (triggerPlateOpening(plateIndex)) {
      clearInterval(checkConnection)
    }
  }, 500)

  setTimeout(() => clearInterval(checkConnection), 10000)
}

function applyPlateVoiceDialogResult(recordingStartTime) {
  if (dialog.isConnected.value && recordingStartTime !== null) {
    isAudioReady.value = true
    showManualReconnect.value = false
    return true
  }

  isAudioReady.value = false
  manualReconnectContext.value = 'plate'
  showManualReconnect.value = true
  return false
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

  // 订阅 dialog 错误：命中“虚拟麦克风阻断”时弹窗提示用户去检查麦克风
  dialog.setCallbacks({
    onError: handleDialogError
  })

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
    const voiceReady = applyPlateVoiceDialogResult(recordingStartTime)

    // 录音启动后再开始追踪，使用录音开始时间作为基准时间
    if (voiceReady && !tracker.isTracking.value) {
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
    
    // 第一张图开场：由 AI 按 SYSTEM_1_PROMPT 主动提问
    if (voiceReady && !hasPlayedOpeningSpeech.value && testStore.currentPlate === 0) {
      hasPlayedOpeningSpeech.value = true
      setTimeout(() => {
        waitAndTriggerPlateOpening(testStore.currentPlate)
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
      applyPlateVoiceDialogResult(recordingStartTime)
    } else if (dialog.isConnected.value) {
      console.log('[TestView] WebRTC 已连接，跳过重新连接')
      isAudioReady.value = true
      showManualReconnect.value = false
    }

    if (isAudioReady.value && !tracker.isTracking.value) {
      console.log('[TestView] 录音已启动，开始追踪图版:', testStore.currentPlate)
      tracker.startTracking(testStore.currentPlate, recordingStartTime)
    }

    if (isAudioReady.value && !hasPlayedOpeningSpeech.value && testStore.currentPlate === 0) {
      hasPlayedOpeningSpeech.value = true
      setTimeout(() => {
        waitAndTriggerPlateOpening(testStore.currentPlate)
      }, 1500)
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

    // 关键顺序：在 setPhase('postTest') 之前先 disconnect 旧连接。
    // 否则 PostTestForm 挂载时 dialog.isConnected 仍是 true，会触发 watch immediate
    // 在即将关闭的旧 dc 上发送 askCurrentQuestion，导致播报丢失；并且 firstQuestionAsked
    // 标记被立即置 true，新连接建好后不会再补播第一题。
    if (dialog.isConnected.value) {
      console.log('[TestView] 进入后测前先断开旧 WebRTC 连接...')
      try {
        await dialog.disconnect(true)
      } catch (err) {
        console.warn('[TestView] 进入后测前断开旧连接失败:', err)
      }
    }

    testStore.setPhase('postTest')

    // 重新连接 WebRTC（后测阶段使用后测提示词）
    isAudioReady.value = false
    showSubtitles.value = false
    currentSubtitle.value = ''
    showManualReconnect.value = false
    try {
      if (dialog.isConnected.value) {
        console.log('[TestView] 后测阶段断开旧 WebRTC 连接...')
        await dialog.disconnect(true)
      }

      await new Promise(resolve => setTimeout(resolve, WEBRTC_DISCONNECT_SETTLE_MS))

      console.log('[TestView] 后测阶段重新建立 WebRTC 连接（超时 20s）...')
      await dialog.connect(POSTTEST_PROMPT, 'alloy')
      dialog.setCallbacks({
        onTranscript: (transcript) => {
          subtitle.show(transcript.text, transcript.speaker)
        }
      })
      await dialog.startMixedRecording()
      console.log('[TestView] 后测阶段 WebRTC 已重新连接并开始录音')
      isAudioReady.value = true
      showManualReconnect.value = false
    } catch (err) {
      console.error('[TestView] 后测阶段重连 WebRTC 失败:', err)
      manualReconnectContext.value = 'postTest'
      showManualReconnect.value = true
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

    // 仅在连接成功时揭开遮罩；失败时 reconnectAndStartRecording 已设置 showManualReconnect
    if (recordingStartTime !== null) {
      isAudioReady.value = true

      // 立即记录新图版的时间戳
      tracker.startTracking(testStore.currentPlate, recordingStartTime)

      // 触发 AI 按当前图版系统提示词主动开场
      try {
        console.log('[TestView] 切换图片，触发 AI 主动开场，图版:', testStore.currentPlate + 1)
        await triggerPlateOpening(testStore.currentPlate)
      } catch (err) {
        console.warn('[TestView] 触发开场失败:', err)
      }
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

/**
 * 处理后测阶段录音：停止 → 转码 → 本地兜底保存 → 暂存到 store
 * 返回 true 表示拿到合法 mp3Blob 并已落地；false 表示任何一步失败
 */
async function processPostTestAudio(userId) {
  try {
    const recordingStatus = dialog.getMixedRecordingStatus()
    console.log('[TestView] 后测提交前录音状态:', JSON.stringify(recordingStatus))

    if (!recordingStatus.isRecording && recordingStatus.chunksCount === 0) {
      console.warn('[TestView] 后测阶段无录音数据')
      return false
    }

    uiStore.loadingMessage = '正在停止后测录音...'
    const webmBlob = await dialog.stopMixedRecording()
    if (!webmBlob || webmBlob.size === 0) {
      console.warn('[TestView] 后测 WebM blob 为空')
      return false
    }

    uiStore.loadingMessage = '正在转换后测音频格式...'
    const mp3Blob = await dialog.convertWebMToMP3(webmBlob)
    if (!mp3Blob || mp3Blob.size === 0) {
      console.warn('[TestView] 后测 MP3 转码结果为空')
      return false
    }

    // 立即本地兜底保存：即使后续上传失败，用户手里也有这份文件可以人工补传
    try {
      const fileName = `${userId}-select.mp3`
      saveFileToLocal(mp3Blob, fileName)
      console.log('[TestView] ✓ 后测音频已本地兜底保存:', fileName)
    } catch (saveErr) {
      console.warn('[TestView] 后测音频本地保存失败:', saveErr)
    }

    testStore.setPostTestAudioBlob(mp3Blob)
    console.log('[TestView] 后测音频已转码并暂存，等待上传阶段上传')
    return true
  } catch (err) {
    console.warn('[TestView] 后测音频处理失败:', err)
    return false
  }
}

/**
 * 重新建立后测阶段的 WebRTC 连接并重新启动录音
 * 在 handlePostTestSubmit 检测到录音失败时调用
 */
async function retryPostTestRecording(preferredDeviceId = null) {
  isAudioReady.value = false
  showSubtitles.value = false
  currentSubtitle.value = ''
  uiStore.loadingMessage = '正在重新连接后测语音...'

  try {
    if (dialog.isConnected.value) {
      console.log('[TestView] retry: 断开旧 WebRTC 连接')
      await dialog.disconnect(true)
    }
    await new Promise(resolve => setTimeout(resolve, WEBRTC_DISCONNECT_SETTLE_MS))

    await dialog.connect(POSTTEST_PROMPT, 'alloy', {
      preferredDeviceId
    })
    dialog.setCallbacks({
      onTranscript: (transcript) => {
        subtitle.show(transcript.text, transcript.speaker)
      }
    })
    await dialog.startMixedRecording()
    console.log('[TestView] ✓ 后测语音已重新连接并开始录音')
    isAudioReady.value = true
    uiStore.loadingMessage = ''
    return true
  } catch (err) {
    console.error('[TestView] retry 重连后测语音失败:', err)
    isAudioReady.value = true
    uiStore.loadingMessage = ''
    return false
  }
}

// 后测问卷提交：录音成功才进 uploading；失败时弹窗让用户选择重试或主动跳过
async function handlePostTestSubmit(answers) {
  // 保存问卷答案
  Object.entries(answers).forEach(([key, value]) => {
    testStore.setPostTestAnswer(key, value)
  })
  session.saveSnapshot('posttest_complete')

  const userId = authStore.userInfo?.username || authStore.userInfo?.phone || authStore.userId

  const audioOk = await processPostTestAudio(userId)

  // 录音必须成功才放行进 uploading；失败时强制用户重新录制（弹窗只有一个按钮）
  if (!audioOk) {
    // 第一次失败：提示重新录制
    await showConfirm({
      title: '五个问题录音失败，请检查麦克风连接，并重新测试',
      message:
        '检测到本次后测语音未成功录制或转码。\n\n' +
        '本测试要求必须有完整的语音数据，\n' +
        '将为您重新连接录音并重新回答 5 个问题。',
      confirmText: '重新录制',
      confirmVariant: 'primary',
      type: 'warning',
      showCancel: false,
      showMicTest: true
    })

    // 重连录音，失败就一直提示「再试一次」直到成功
    while (true) {
      const reconnected = await retryPostTestRecording()
      if (reconnected) {
        break
      }
      await showConfirm({
        title: '重新连接失败',
        message:
          '多次尝试重新连接录音均未成功。\n\n' +
          '请检查网络后再次尝试，本测试无法在缺少语音的情况下完成。',
        confirmText: '再试一次',
        confirmVariant: 'danger',
        type: 'danger',
        showCancel: false
      })
    }

    // 重连成功，强制重建 PostTestForm 让用户重答 5 个问题；保持 phase='postTest'
    postTestFormKey.value++
    return
  }

  // 关闭 WebRTC 连接（无论音频是否成功）
  console.log('[TestView] 后测提交后，关闭 WebRTC 连接')
  try {
    if (dialog.isConnected.value) {
      await dialog.disconnect(true)
      console.log('[TestView] WebRTC 连接已关闭（后测音频已处理）')
    }
  } catch (error) {
    console.warn('[TestView] 关闭 WebRTC 连接失败:', error)
  }

  // 进入上传阶段（各图版音频已在切图时逐张上传）
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
    if (testStore.phase === 'test') {
      manualReconnectContext.value = 'plate'
      showManualReconnect.value = true
      isAudioReady.value = false
    } else if (testStore.phase === 'postTest') {
      manualReconnectContext.value = 'postTest'
      showManualReconnect.value = true
      isAudioReady.value = false
    } else {
      uiStore.showError('语音对话启动失败，请检查麦克风权限')
    }
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

// 开发测试 - 模拟连接失败（直接触发手动重连按钮）
function handleDevSimulateConnectFail() {
  isAudioReady.value = false
  manualReconnectContext.value = testStore.phase === 'postTest' ? 'postTest' : 'plate'
  showManualReconnect.value = true
  console.log('[Dev] 模拟连接失败，context:', manualReconnectContext.value)
}
</script>

<style lang="less" scoped>
.test-view {
  width: 100%;
  height: 100vh;
  height: 100dvh;
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
  max-height: calc(100dvh - 140px);
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

.audio-reconnect-tip {
  font-size: 15px;
  color: #fcd34d;
  letter-spacing: 0.5px;
  text-align: center;
  padding: 0 24px;
}

.audio-manual-reconnect-btn {
  margin-top: 8px;
  padding: 12px 32px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}

.audio-manual-reconnect-btn:hover:not(:disabled) {
  background: #2563eb;
}

.audio-manual-reconnect-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  position: relative;
  z-index: 1;
  background: transparent;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
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

// 自定义二次确认弹窗
.confirm-dialog {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 4px 8px 0;
  text-align: center;

  &__icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      width: 36px;
      height: 36px;
    }

    &--warning {
      background: rgba(254, 202, 87, 0.15);
      color: #feca57;
      box-shadow: 0 0 0 1px rgba(254, 202, 87, 0.3), 0 0 24px rgba(254, 202, 87, 0.25);
      animation: confirmIconPulse 2s ease-in-out infinite;
    }

    &--danger {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.35), 0 0 24px rgba(239, 68, 68, 0.3);
      animation: confirmIconPulse 2s ease-in-out infinite;
    }

    &--info {
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.3), 0 0 24px rgba(99, 102, 241, 0.25);
    }
  }

  &__message {
    margin: 0;
    color: rgba(255, 255, 255, 0.88);
    font-size: 15px;
    line-height: 1.7;
    white-space: pre-line; // 支持 \n 换行
    letter-spacing: 0.4px;
  }

  &__actions {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 8px;
    width: 100%;

    :deep(.base-button) {
      min-width: 140px;
    }

    &--single :deep(.base-button) {
      min-width: 200px;
    }
  }

  &__mic-test {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin-top: -4px;

    :deep(.base-button) {
      min-width: 120px;
    }
  }

  &__device-picker {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
  }

  &__device-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.72);
  }

  &__device-select {
    width: 100%;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid rgba(139, 92, 246, 0.45);
    background: rgba(12, 16, 40, 0.85);
    color: rgba(255, 255, 255, 0.92);
    font-size: 13px;
    outline: none;
  }

  &__device-select:focus {
    border-color: rgba(167, 139, 250, 0.95);
    box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.25);
  }

  &__device-hint {
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.65);
    text-align: left;
  }

  &__mic-test-result {
    margin: 0;
    color: rgba(255, 255, 255, 0.82);
    font-size: 13px;
    line-height: 1.5;
    text-align: center;
    white-space: pre-line;
    max-width: 92%;
  }
}

@keyframes confirmIconPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}

@media (max-width: 768px) {
  .test-view {
    height: 100vh;
    height: 100dvh;
    padding-top: calc(56px + env(safe-area-inset-top, 0px));
  }

  .test-screen {
    min-height: 0;
    overflow: hidden;
  }

  /* 图版区占满剩余高度，最大化可视范围 */
  .image-container {
    flex: 1 1 auto;
    min-height: 0;
    max-height: none;
    padding: 2px 28px 2px 2px; /* 右侧留给能量柱 */
  }

  /* 字幕悬浮在图版下沿，不占控制栏空间 */
  .subtitle-container {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: 10px;
    width: auto;
    max-width: calc(100% - 20px);
    padding: 6px 14px;
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 20;
    pointer-events: none;
  }

  .subtitle-text {
    font-size: 12.5px;
    line-height: 1.35;
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .test-screen :deep(.controls-bar) {
    flex-shrink: 0;
    z-index: 30;
  }

  .confirm-dialog__actions {
    flex-direction: column-reverse;
    width: 100%;

    :deep(.base-button) {
      width: 100%;
    }
  }
}

@media (max-width: 480px) {
  .image-container {
    padding-right: 26px;
  }

  .subtitle-container {
    bottom: 8px;
    padding: 5px 10px;
    max-width: calc(100% - 16px);
  }

  .subtitle-text {
    font-size: 11.5px;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
}
</style>
