<template>
  <div class="waiting-report-view">
    <!-- 词云画布 -->
    <canvas ref="wordcloudCanvas" class="wordcloud-canvas"></canvas>
    
    <!-- 文本粒子画布 -->
    <canvas ref="textParticleCanvas" class="text-particle-canvas"></canvas>
    
    <!-- 粒子汇聚画布 -->
    <canvas ref="particleCanvas" class="particle-canvas"></canvas>

    <!-- 主容器 -->
    <div class="waiting-report-main-container">
      <!-- 标题区域 -->
      <div class="waiting-report-header">
        <h1>数据上传中，不要关闭页面</h1>
        <p class="waiting-report-status-text">{{ statusText }}</p>
      </div>
    </div>

    <!-- 黑洞圆形进度条 -->
    <div class="waiting-report-progress-container">
      <div class="waiting-report-blackhole">
        <!-- 外层光晕 -->
        <div class="waiting-report-accretion-glow"></div>
        <!-- 吸积盘 -->
        <div class="waiting-report-accretion-disk"></div>
        <!-- 处理指示器 -->
        <div class="waiting-report-processing-indicator"></div>
        <!-- 事件视界 -->
        <div class="waiting-report-blackhole-horizon"></div>
        <!-- 黑洞核心 -->
        <div class="waiting-report-blackhole-core">
          <div class="waiting-report-core-data-stream" ref="coreStream"></div>
          <!-- 上传进度填充 -->
          <div 
            class="waiting-report-upload-fill" 
            :class="{ success: uploadStatus === 'success', failed: uploadStatus === 'failed' }"
            :style="{ height: uploadProgress + '%' }"
          ></div>
          <!-- 上传进度百分比 -->
          <div class="waiting-report-upload-percent">{{ Math.round(uploadProgress) }}%</div>
        </div>
        <!-- 数据计数器 -->
        <div class="waiting-report-data-counter">{{ dataCounter }}</div>
        <!-- 词云切换容器 -->
        <div class="waiting-report-blackhole-words" ref="blackholeWords"></div>
        <!-- 轨道环 -->
        <div class="waiting-report-orbit-ring"></div>
        <div class="waiting-report-orbit-ring"></div>
        <div class="waiting-report-orbit-ring"></div>
        <!-- 能量波纹 -->
        <div class="waiting-report-energy-wave"></div>
        <div class="waiting-report-energy-wave"></div>
        <div class="waiting-report-energy-wave"></div>
        <div class="waiting-report-energy-wave"></div>
        <!-- 火花容器 -->
        <div class="waiting-report-spark-container" ref="sparkContainer"></div>
      </div>
      <p class="waiting-report-progress-text">{{ progressText }}</p>
      <!-- 重试按钮 -->
      <button v-if="showRetryBtn" class="waiting-report-retry-btn" @click="handleRetry">
        重新提交
      </button>
      <!-- 重新测试按钮 -->
      <button v-if="showRetestBtn" class="waiting-report-retest-btn" @click="handleRetest">
        重新测试
      </button>
    </div>

    <!-- 扫描线 -->
    <div class="waiting-report-scan-line"></div>

    <!-- 数据流线 -->
    <div class="data-streams" ref="dataStreams"></div>

    <!-- 底部提示 -->
    <div class="waiting-report-footer-hint">
      <p>请耐心等待，AI 正在为您生成报告</p>
      <div class="waiting-report-dots">
        <div class="waiting-report-dot"></div>
        <div class="waiting-report-dot"></div>
        <div class="waiting-report-dot"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTestStore } from '@/stores/testStore'
import { useAuthStore } from '@/stores/authStore'
import { useApi } from '@/composables/useApi'
import { useInteractionTracker } from '@/composables/useInteractionTracker'
import { useRealtimeDialog } from '@/composables/useRealtimeDialog'

const props = defineProps({
  sessionId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['upload-complete'])

const router = useRouter()
const testStore = useTestStore()
const authStore = useAuthStore()
const api = useApi()
const tracker = useInteractionTracker()
const dialog = useRealtimeDialog()

// 状态
const uploadProgress = ref(0)
const uploadStatus = ref('uploading') // uploading, success, failed
const showRetryBtn = ref(false)
const showRetestBtn = ref(false)
const dataCounter = ref(0)

// 状态文本
const statusTexts = [
  '正在解析您的心理特征数据',
  '正在整合多维度数据',
  '正在分析行为模式',
  '正在上传测试结果',
  'AI 模型深度学习中'
]
const statusTextIndex = ref(0)
const statusText = ref(statusTexts[0])
const progressText = ref('正在整合多维度数据...')

// 词云数据
const words = ref([])

// DOM refs
const wordcloudCanvas = ref(null)
const textParticleCanvas = ref(null)
const particleCanvas = ref(null)
const coreStream = ref(null)
const blackholeWords = ref(null)
const sparkContainer = ref(null)
const dataStreams = ref(null)

// 动画相关
let animationFrames = {}
let intervals = {}

// 从对话历史提取词汇
function extractWordsFromDialogue() {
  const dialogHistory = testStore.dialogHistory || []
  
  // 兼容两种数据格式（旧数据可能是嵌套格式）：
  // 新格式: { speaker: 'user', text: '...' }
  // 旧格式: { role: { speaker: 'user', text: '...' } }
  const userDialogues = dialogHistory.filter(item => {
    const speaker = item.role?.speaker || item.speaker
    const text = item.role?.text || item.text
    return speaker === 'user' && text
  })
  
  if (userDialogues.length === 0) {
    return ['心理测试', '墨迹图', '联想', '情感', '分析', '报告', '压力', '焦虑']
  }
  
  return userDialogues.slice(0, 30).map(item => {
    const text = item.role?.text || item.text || ''
    return text.length > 20 ? text.substring(0, 20) + '...' : text
  })
}

// 初始化词云画布动画
function initWordcloudAnimation() {
  const canvas = wordcloudCanvas.value
  if (!canvas) return
  
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  const ctx = canvas.getContext('2d')
  
  const wordList = words.value.length > 0 ? words.value : extractWordsFromDialogue()
  words.value = wordList
  
  // 词云粒子 - 更鲜艳的颜色和更高的不透明度
  const particles = wordList.map((text, i) => ({
    text,
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    size: 14 + Math.random() * 10,
    opacity: 0.7 + Math.random() * 0.3,
    color: ['#818cf8', '#a78bfa', '#f472b6', '#22d3ee', '#c084fc', '#fb7185', '#34d399'][i % 7]
  }))
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    particles.forEach(p => {
      p.x += p.vx
      p.y += p.vy
      
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1
      
      ctx.font = `${p.size}px "Microsoft YaHei", sans-serif`
      ctx.fillStyle = p.color
      ctx.globalAlpha = p.opacity
      ctx.fillText(p.text, p.x, p.y)
    })
    
    ctx.globalAlpha = 1
    animationFrames.wordcloud = requestAnimationFrame(animate)
  }
  
  animate()
}

// 飞词动画
function startFlyingWordsAnimation() {
  const container = blackholeWords.value
  if (!container) return
  
  const wordList = words.value.length > 0 ? words.value : extractWordsFromDialogue()
  let index = 0
  
  intervals.flyingWords = setInterval(() => {
    const word = wordList[index % wordList.length]
    const el = document.createElement('span')
    el.className = 'waiting-report-flying-word'
    el.textContent = word
    
    // 随机起始位置（从外围向中心飞）
    const angle = Math.random() * Math.PI * 2
    const distance = 100 + Math.random() * 50
    const startX = Math.cos(angle) * distance
    const startY = Math.sin(angle) * distance
    
    el.style.cssText = `
      --start-x: ${startX}px;
      --start-y: ${startY}px;
      --rotate: ${Math.random() * 360}deg;
      color: ${['#818cf8', '#a78bfa', '#f472b6', '#22d3ee', '#c084fc'][index % 5]};
      font-size: ${14 + Math.random() * 8}px;
      left: 50%;
      top: 50%;
    `
    
    container.appendChild(el)
    
    // 动画结束后移除
    setTimeout(() => {
      el.remove()
    }, 600)
    
    index++
  }, 800)
}

// 火花动画
function startSparkAnimation() {
  const container = sparkContainer.value
  if (!container) return
  
  intervals.spark = setInterval(() => {
    for (let i = 0; i < 3; i++) {
      const spark = document.createElement('div')
      spark.className = 'waiting-report-spark'
      
      const angle = Math.random() * Math.PI * 2
      const tx = Math.cos(angle) * (80 + Math.random() * 40)
      const ty = Math.sin(angle) * (80 + Math.random() * 40)
      
      spark.style.cssText = `
        --tx: ${tx}px;
        --ty: ${ty}px;
        left: 50%;
        top: 50%;
        animation-delay: ${Math.random() * 0.3}s;
      `
      
      container.appendChild(spark)
      
      setTimeout(() => spark.remove(), 1000)
    }
  }, 500)
}

// 数据计数器动画
function startDataCounterAnimation() {
  intervals.counter = setInterval(() => {
    dataCounter.value = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  }, 100)
}

// 数据流动画
function startDataStreamAnimation() {
  const container = dataStreams.value
  if (!container) return
  
  intervals.dataStream = setInterval(() => {
    const stream = document.createElement('div')
    stream.className = 'waiting-report-data-stream'
    stream.style.left = `${Math.random() * 100}%`
    stream.style.animationDuration = `${1.5 + Math.random()}s`
    
    container.appendChild(stream)
    
    setTimeout(() => stream.remove(), 2500)
  }, 300)
}

// 核心数据流动画
function startCoreStreamAnimation() {
  const core = coreStream.value
  if (!core) return
  
  intervals.coreStream = setInterval(() => {
    const chars = '01アイウエオカキクケコサシスセソ'
    let text = ''
    for (let i = 0; i < 20; i++) {
      text += chars[Math.floor(Math.random() * chars.length)]
    }
    core.textContent = text
  }, 100)
}

// 执行上传
async function startUpload() {
  try {
    const userId = authStore.userInfo?.username || authStore.userInfo?.phone || 'unknown'
    console.log('[Uploading] 开始上传，用户ID:', userId)
    
    // 停止追踪并获取数据
    tracker.stop()
    const interactionData = tracker.formatForUpload()
    
    // 1. 上传缩放数据
    progressText.value = '正在上传缩放数据...'
    await api.uploadZoom(interactionData.zoom, userId)
    uploadProgress.value = 15
    console.log('[Uploading] 缩放数据已上传')
    
    // 2. 上传旋转数据
    progressText.value = '正在上传旋转数据...'
    await api.uploadRotate(interactionData.rotate, userId)
    uploadProgress.value = 30
    console.log('[Uploading] 旋转数据已上传')
    
    // 3. 上传画笔轨迹
    progressText.value = '正在上传画笔轨迹...'
    await api.uploadDrawingTracks(interactionData.drawingTracks, userId, [600, 800])
    uploadProgress.value = 45
    console.log('[Uploading] 画笔轨迹已上传')
    
    // 4. 上传时间戳数据
    progressText.value = '正在上传时间戳数据...'
    const audioTimestamps = tracker.getAudioTimestamps()
    await api.uploadSegTime(audioTimestamps, userId)
    uploadProgress.value = 60
    console.log('[Uploading] 时间戳数据已上传')
    
    // 5. 上传问卷答案
    progressText.value = '正在上传问卷答案...'
    const postTestAnswers = testStore.postTestAnswers || {}
    await api.upload5Questions(postTestAnswers, userId)
    uploadProgress.value = 75
    console.log('[Uploading] 问卷答案已上传')
    
    // 6. 上传音频
    progressText.value = '正在处理音频...'
    try {
      console.log('[Uploading] ========== 开始音频处理 ==========')
      console.log('[Uploading] WebRTC 连接状态:', dialog.isConnected.value)
      
      const recordingStatus = dialog.getMixedRecordingStatus()
      console.log('[Uploading] 录音状态:', JSON.stringify(recordingStatus))
      
      if (recordingStatus.isRecording || recordingStatus.hasData || recordingStatus.chunksCount > 0) {
        console.log('[Uploading] 有录音数据，正在停止混合录音...')
        const webmBlob = await dialog.stopMixedRecording()
        console.log('[Uploading] WebM blob:', webmBlob ? `${(webmBlob.size / 1024).toFixed(2)} KB` : '无数据')
        
        if (webmBlob && webmBlob.size > 0) {
          progressText.value = '正在转换音频格式...'
          console.log('[Uploading] 开始转换为 MP3...')
          
          const mp3Blob = await dialog.convertWebMToMP3(webmBlob)
          
          if (mp3Blob && mp3Blob.size > 0) {
            progressText.value = '正在上传音频...'
            console.log('[Uploading] MP3 大小:', (mp3Blob.size / 1024).toFixed(2), 'KB')
            await api.uploadMedia(mp3Blob, userId)
            console.log('[Uploading] ✓ 音频已上传成功')
          } else {
            console.warn('[Uploading] ✗ MP3 转换结果为空')
          }
        } else {
          console.warn('[Uploading] ✗ 没有录音数据可上传（WebM blob 为空）')
        }
      } else {
        console.warn('[Uploading] ✗ 没有进行中的录音，跳过音频上传')
        console.warn('[Uploading] - isRecording:', recordingStatus.isRecording)
        console.warn('[Uploading] - hasData:', recordingStatus.hasData)
        console.warn('[Uploading] - chunksCount:', recordingStatus.chunksCount)
      }
      console.log('[Uploading] ========== 音频处理完成 ==========')
    } catch (audioError) {
      console.error('[Uploading] ✗ 音频处理失败:', audioError)
      console.error('[Uploading] - 错误信息:', audioError.message)
      // 不抛出错误，继续后续流程
    }
    uploadProgress.value = 100
    
    uploadStatus.value = 'success'
    progressText.value = '上传完成！正在跳转...'
    console.log('[Uploading] 所有数据上传完成')
    
    // 延迟后触发完成事件
    setTimeout(() => {
      emit('upload-complete')
    }, 1500)
    
  } catch (error) {
    console.error('[Uploading] 上传失败:', error)
    uploadStatus.value = 'failed'
    progressText.value = '上传失败，请重试'
    showRetryBtn.value = true
    showRetestBtn.value = true
  }
}

// 重试上传
function handleRetry() {
  showRetryBtn.value = false
  showRetestBtn.value = false
  uploadProgress.value = 0
  uploadStatus.value = 'uploading'
  startUpload()
}

// 重新测试
function handleRetest() {
  router.push('/prep')
}

// 生命周期
onMounted(() => {
  console.log('[UploadingView] 组件挂载，开始初始化动画')
  
  // 初始化词云
  words.value = extractWordsFromDialogue()
  
  // 初始化各种动画
  initWordcloudAnimation()
  startFlyingWordsAnimation()
  startSparkAnimation()
  startDataCounterAnimation()
  startDataStreamAnimation()
  startCoreStreamAnimation()
  
  // 状态文本循环
  intervals.statusText = setInterval(() => {
    statusTextIndex.value = (statusTextIndex.value + 1) % statusTexts.length
    statusText.value = statusTexts[statusTextIndex.value]
  }, 3000)
  
  // 开始上传
  startUpload()
  
  // 监听窗口大小变化
  window.addEventListener('resize', initWordcloudAnimation)
})

onUnmounted(() => {
  // 取消所有动画帧
  Object.values(animationFrames).forEach(id => cancelAnimationFrame(id))
  
  // 清除所有定时器
  Object.values(intervals).forEach(id => clearInterval(id))
  
  window.removeEventListener('resize', initWordcloudAnimation)
})
</script>

<style lang="less" scoped>
/* 等待报告主视图 */
.waiting-report-view {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: transparent;
  z-index: 100;
  overflow: hidden;
}

/* 词云画布 */
.wordcloud-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
}

/* 文本粒子画布 */
.text-particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
}

/* 粒子汇聚画布 */
.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 3;
  pointer-events: none;
}

/* 主容器 */
.waiting-report-main-container {
  position: relative;
  z-index: 6;
  min-height: 100vh;
  padding: 100px 20px 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 标题区域 */
.waiting-report-header {
  text-align: center;
  margin-bottom: 50px;
  animation: fadeInDown 1s ease-out;
  
  h1 {
    font-size: 36px;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 15px;
    text-shadow: 0 0 30px rgba(102, 126, 234, 0.5);
  }
}

.waiting-report-status-text {
  font-size: 18px;
  color: #a0aec0;
  letter-spacing: 2px;
}

/* 黑洞进度条容器 */
.waiting-report-progress-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9;
  animation: fadeIn 1.5s ease-out;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* 黑洞主体 */
.waiting-report-blackhole {
  position: relative;
  width: 200px;
  height: 200px;
}

/* 黑洞核心 */
.waiting-report-blackhole-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, #1a1a2e 0%, #0f0f1a 50%, #0a0a14 100%);
  border-radius: 50%;
  box-shadow:
    0 0 30px 10px rgba(0, 0, 0, 0.8),
    0 0 60px 20px rgba(10, 14, 39, 0.6),
    inset 0 0 30px rgba(0, 0, 0, 1);
  z-index: 3;
  overflow: hidden;
}

/* 上传进度填充 */
.waiting-report-upload-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 0%;
  background: linear-gradient(180deg,
    rgba(255, 180, 100, 0.9) 0%,
    rgba(255, 140, 50, 0.95) 50%,
    rgba(230, 120, 30, 1) 100%
  );
  border-radius: 0 0 50% 50%;
  transition: height 0.5s ease-out;
  z-index: 1;
  
  &::before {
    content: '';
    position: absolute;
    top: -8px;
    left: -10%;
    width: 120%;
    height: 16px;
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,60 C150,120 350,0 600,60 C850,120 1050,0 1200,60 L1200,120 L0,120 Z' fill='rgba(255,180,100,0.9)'/%3E%3C/svg%3E");
    background-size: 100% 100%;
    animation: waveMove 2s linear infinite;
  }
  
  &.success {
    background: linear-gradient(180deg,
      rgba(34, 197, 94, 0.9) 0%,
      rgba(22, 163, 74, 0.95) 50%,
      rgba(21, 128, 61, 1) 100%
    );
    
    &::before {
      background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,60 C150,120 350,0 600,60 C850,120 1050,0 1200,60 L1200,120 L0,120 Z' fill='rgba(34,197,94,0.9)'/%3E%3C/svg%3E");
      background-size: 100% 100%;
    }
  }
  
  &.failed {
    background: linear-gradient(180deg,
      rgba(239, 68, 68, 0.9) 0%,
      rgba(220, 38, 38, 0.95) 50%,
      rgba(185, 28, 28, 1) 100%
    );
    
    &::before {
      background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'%3E%3Cpath d='M0,60 C150,120 350,0 600,60 C850,120 1050,0 1200,60 L1200,120 L0,120 Z' fill='rgba(239,68,68,0.9)'/%3E%3C/svg%3E");
      background-size: 100% 100%;
    }
  }
}

@keyframes waveMove {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

/* 上传进度百分比 */
.waiting-report-upload-percent {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
  z-index: 2;
}

/* 核心数据流 */
.waiting-report-core-data-stream {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Courier New', monospace;
  font-size: 8px;
  color: rgba(102, 126, 234, 0.6);
  animation: dataFlicker 0.1s linear infinite;
  overflow: hidden;
}

/* 处理指示器 */
.waiting-report-processing-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100px;
  height: 100px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px dashed rgba(102, 126, 234, 0.3);
  animation: indicatorSpin 3s linear infinite;
  z-index: 1;
}

/* 事件视界 */
.waiting-report-blackhole-horizon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, transparent 40%, rgba(102, 126, 234, 0.1) 60%, rgba(118, 75, 162, 0.2) 80%, transparent 100%);
  box-shadow:
    0 0 20px rgba(102, 126, 234, 0.3),
    0 0 40px rgba(118, 75, 162, 0.2);
  animation: horizonPulse 3s ease-in-out infinite;
  z-index: 2;
}

/* 吸积盘 */
.waiting-report-accretion-disk {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 180px;
  height: 180px;
  border-radius: 50%;
  border: 2px solid transparent;
  background:
    linear-gradient(#0a0e27, #0a0e27) padding-box,
    conic-gradient(from 0deg, #667eea, #764ba2, #f093fb, #667eea) border-box;
  animation: diskRotate 8s linear infinite;
  z-index: 1;
}

/* 吸积盘光晕 */
.waiting-report-accretion-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, transparent 35%, rgba(102, 126, 234, 0.1) 50%, rgba(240, 147, 251, 0.1) 70%, transparent 90%);
  box-shadow:
    0 0 40px rgba(102, 126, 234, 0.3),
    0 0 80px rgba(118, 75, 162, 0.2),
    0 0 120px rgba(240, 147, 251, 0.1);
  animation: glowPulse 2s ease-in-out infinite;
  z-index: 0;
}

/* 数据计数器 */
.waiting-report-data-counter {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: rgba(240, 147, 251, 0.8);
  text-shadow: 0 0 10px rgba(240, 147, 251, 0.8);
  z-index: 4;
  white-space: nowrap;
  animation: counterPulse 0.5s ease-in-out infinite;
}

/* 词云切换容器 */
.waiting-report-blackhole-words {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 160px;
  height: 160px;
  pointer-events: none;
  z-index: 5;
  overflow: visible;
}

/* 轨道环 */
.waiting-report-orbit-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1px solid;
  animation: ringRotate 6s linear infinite;
  
  &:nth-child(5) {
    width: 120px;
    height: 120px;
    border-color: rgba(102, 126, 234, 0.3);
    animation-duration: 4s;
  }
  
  &:nth-child(6) {
    width: 150px;
    height: 150px;
    border-color: rgba(118, 75, 162, 0.2);
    animation-duration: 6s;
    animation-direction: reverse;
  }
  
  &:nth-child(7) {
    width: 180px;
    height: 180px;
    border-color: rgba(240, 147, 251, 0.15);
    animation-duration: 8s;
  }
}

/* 能量波纹 */
.waiting-report-energy-wave {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1px solid rgba(102, 126, 234, 0.5);
  animation: waveExpand 2s ease-out infinite;
  pointer-events: none;
  
  &:nth-child(8) { animation-delay: 0s; }
  &:nth-child(9) { animation-delay: 0.5s; }
  &:nth-child(10) { animation-delay: 1s; }
  &:nth-child(11) { animation-delay: 1.5s; }
}

/* 火花容器 */
.waiting-report-spark-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  pointer-events: none;
  z-index: 2;
}

/* 进度文字 */
.waiting-report-progress-text {
  margin-top: 30px;
  font-size: 16px;
  color: #e0e0e0;
  letter-spacing: 2px;
  text-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
  text-align: center;
  transition: opacity 0.3s ease;
}

/* 扫描线 */
.waiting-report-scan-line {
  position: fixed;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.8), transparent);
  box-shadow: 0 0 10px rgba(102, 126, 234, 0.8);
  animation: scanMove 3s linear infinite;
  z-index: 7;
}

/* 数据流线容器 */
.data-streams {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 7;
}

/* 底部提示 */
.waiting-report-footer-hint {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  text-align: center;
  animation: fadeIn 2s ease-out;
  
  p {
    color: #a0aec0;
    font-size: 14px;
    margin-bottom: 10px;
  }
}

.waiting-report-dots {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.waiting-report-dot {
  width: 8px;
  height: 8px;
  background: #667eea;
  border-radius: 50%;
  animation: dotPulse 1.5s ease-in-out infinite;
  
  &:nth-child(2) { animation-delay: 0.3s; }
  &:nth-child(3) { animation-delay: 0.6s; }
}

/* 重试按钮 */
.waiting-report-retry-btn {
  margin-top: 20px;
  padding: 12px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
  }
}

/* 重新测试按钮 */
.waiting-report-retest-btn {
  margin-top: 12px;
  padding: 10px 28px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 25px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.5);
  }
}

/* 动画关键帧 */
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes diskRotate {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes ringRotate {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes horizonPulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.8;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 1;
  }
}

@keyframes glowPulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.6;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.05);
    opacity: 1;
  }
}

@keyframes waveExpand {
  0% {
    width: 60px;
    height: 60px;
    opacity: 0.8;
  }
  100% {
    width: 250px;
    height: 250px;
    opacity: 0;
  }
}

@keyframes dataFlicker {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

@keyframes counterPulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    text-shadow: 0 0 10px rgba(240, 147, 251, 0.8);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    text-shadow: 0 0 20px rgba(240, 147, 251, 1), 0 0 30px rgba(102, 126, 234, 0.8);
  }
}

@keyframes indicatorSpin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes scanMove {
  0% { top: 0; }
  100% { top: 100%; }
}

@keyframes dotPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.5;
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .waiting-report-header h1 {
    font-size: 28px;
  }
}
</style>

<style>
/* 全局样式 - 飞词和火花 */
.waiting-report-flying-word {
  position: absolute;
  font-family: -apple-system, BlinkMacSystemFont, "Microsoft YaHei", sans-serif;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  transform-origin: center center;
  animation: wordFlyIn 0.6s ease-out forwards;
  text-shadow: 0 0 8px currentColor;
  pointer-events: none;
}

@keyframes wordFlyIn {
  0% {
    opacity: 0;
    transform: translate(var(--start-x), var(--start-y)) scale(1.5) rotate(var(--rotate));
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(0, 0) scale(0.3) rotate(0deg);
  }
}

.waiting-report-spark {
  position: absolute;
  width: 4px;
  height: 4px;
  background: #f093fb;
  border-radius: 50%;
  box-shadow: 0 0 6px #f093fb, 0 0 12px #667eea;
  animation: sparkFly 1s ease-out infinite;
}

@keyframes sparkFly {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) scale(0);
    opacity: 0;
  }
}

.waiting-report-data-stream {
  position: fixed;
  width: 1px;
  height: 100px;
  background: linear-gradient(180deg, transparent, rgba(240, 147, 251, 0.8), transparent);
  animation: dataFlow 2s linear infinite;
  z-index: 7;
}

@keyframes dataFlow {
  0% {
    top: -100px;
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    top: 100vh;
    opacity: 0;
  }
}
</style>
