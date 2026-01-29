<template>
  <div class="prep-page">
    <!-- 黑洞粒子背景 -->
    <BlackHoleBackground :enabled="true" :theme="0" :z-index="0" />

    <!-- 准备页面布局 -->
    <div class="prep-layout">
      <!-- 左侧：信息填写卡片 -->
      <div class="info-card glass-card">
        <h1 class="card-title">🎨 知己心探测试</h1>

        <form class="info-form" @submit.prevent="handleStartTest">
          <!-- 性别 -->
          <div class="form-group">
            <label for="sex">性别</label>
            <select id="sex" v-model="form.sex" required>
              <option value="男" selected>男</option>
              <option value="女">女</option>
            </select>
            <div v-if="errors.sex" class="error-message">{{ errors.sex }}</div>
          </div>

          <!-- 年龄 -->
          <div class="form-group">
            <label for="age">年龄</label>
            <input
              id="age"
              v-model="form.age"
              type="number"
              placeholder="例如：25"
              min="0"
              step="1"
              inputmode="numeric"
              required
            />
            <div v-if="errors.age" class="error-message">{{ errors.age }}</div>
          </div>

          <!-- 学历 -->
          <div class="form-group">
            <label for="education">学历</label>
            <select id="education" v-model="form.education" required>
              <option value="小学">小学</option>
              <option value="初中">初中</option>
              <option value="高中">高中</option>
              <option value="中专">中专</option>
              <option value="大专">大专</option>
              <option value="本科">本科</option>
              <option value="硕士">硕士</option>
              <option value="博士">博士</option>
            </select>
            <div v-if="errors.education" class="error-message">{{ errors.education }}</div>
          </div>

          <!-- 职业 -->
          <div class="form-group">
            <label for="occupation">职业</label>
            <input
              id="occupation"
              v-model="form.occupation"
              type="text"
              placeholder="例如：工程师"
              required
            />
            <div v-if="errors.occupation" class="error-message">{{ errors.occupation }}</div>
          </div>

          <!-- 当前心情 -->
          <div class="form-group">
            <label for="mood">当前心情</label>
            <input
              id="mood"
              v-model="form.mood"
              type="text"
              placeholder="例如：平静"
              required
            />
            <div v-if="errors.mood" class="error-message">{{ errors.mood }}</div>
          </div>

          <!-- 开始测试按钮 -->
          <button type="submit" class="start-btn">开始测试</button>

          <!-- 恢复未完成测试按钮 -->
          <button
            v-if="hasUnfinishedTest"
            type="button"
            class="resume-btn"
            @click="handleResumeTest"
          >
            恢复未完成测试
          </button>

          <!-- 直接进入测试按钮（跳过基本信息填写） -->
          <button
            type="button"
            class="direct-enter-btn"
            @click="handleDirectEnter"
          >
            直接进入测试
          </button>
        </form>
      </div>

      <!-- 右侧：准备说明卡片 -->
      <div class="prep-card glass-card">
        <div class="prep-header">
          <div class="prep-icon">🎧</div>
          <div>
            <p class="prep-label">测试准备</p>
            <h2 class="prep-title">开始之前，请先确认这些事项</h2>
          </div>
        </div>

        <p class="prep-intro">
          Hello，亲爱的用户您好，欢迎来到知己心探心理测试，在测试前，需要跟您确认以下几点：
        </p>

        <ul class="prep-list">
          <li>
            <span class="list-dot"></span>
            <div>1.首先，请先在网页左侧，填写您的个人信息</div>
          </li>
          <li>
            <span class="list-dot"></span>
            <div>2.测试需要在台式电脑或笔记本电脑上进行，请确保您的电脑麦克风和音响正常。您可以在浏览器上配置您的麦克风，并利用下方的设备测试按钮，检测您的麦克风和音响状态。</div>
          </li>
          <li>
            <span class="list-dot"></span>
            <div>3.需要提醒您的是，测试时需要保持您周围的环境安静，避免被外界的电话、微信消息打扰，只有这样才能达到最好的测试效果</div>
          </li>
          <li>
            <span class="list-dot"></span>
            <div>4.整个心理测试过程采用数字人语音交互完成，确保您的信息隐私安全，请放心。</div>
          </li>
          <li>
            <span class="list-dot"></span>
            <div>5.如果以上信息确认完毕，那么请点击蓝色的开始测试按钮，我们将向您介绍心理测试的具体操作流程</div>
          </li>
        </ul>

        <!-- 设备检测区域 -->
        <div class="device-check" :data-status="deviceCheckStatus">
          <div class="device-check-header">
            <div class="device-check-icon">🎧</div>
            <div>
              <p class="device-check-title">设备检测</p>
              <p class="device-check-tip">{{ deviceCheckTip }}</p>
            </div>
          </div>

          <p class="device-check-desc">
            点击下方按钮播放测试音，并在浏览器弹出提示时允许使用麦克风，然后对着麦克风说一句平时说话的句子。
          </p>

          <div class="device-check-actions">
            <button
              type="button"
              @click="handleSpeakerTest"
              :disabled="isSpeakerTesting"
            >
              🔊 {{ isSpeakerTesting ? '测试中...' : '测试语音（音响）播放' }}
            </button>
            <button
              type="button"
              @click="handleMicTest"
              :disabled="isMicTesting"
            >
              🎙️ {{ isMicTesting ? '检测中...' : '检测麦克风（测试时请说话）' }}
            </button>
          </div>

          <div class="device-check-result">{{ deviceCheckResult }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useTestStore } from '@/stores/testStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useApi } from '@/composables/useApi'
import { playAudio, stopAllAudios } from '@/utils/audioManager'
import BlackHoleBackground from '@/components/effects/BlackHoleBackground.vue'

const router = useRouter()
const authStore = useAuthStore()
const testStore = useTestStore()
const sessionStore = useSessionStore()
const api = useApi()

// 表单数据
const form = reactive({
  sex: '男',
  age: '',
  education: '',
  occupation: '',
  mood: ''
})

// 错误信息
const errors = reactive({
  sex: '',
  age: '',
  education: '',
  occupation: '',
  mood: ''
})

// 是否有未完成的测试
const hasUnfinishedTest = ref(false)

// 设备检测状态
const deviceCheckStatus = ref('pending') // 'pending' | 'checking' | 'ready' | 'error'
const deviceCheckTip = ref('请先测试语音播放和麦克风，确保设备正常。')
const deviceCheckResult = ref('等待检测')
const isSpeakerTesting = ref(false)
const isMicTesting = ref(false)

// 音频相关
let audioContext = null
let testAudio = null

// 欢迎语播报标志
let welcomeMessagePlayed = false

onMounted(async () => {
  // 检查是否有未完成的测试
  const savedSession = sessionStore.loadSnapshot()
  hasUnfinishedTest.value = !!savedSession

  console.log('[PrepView] 页面已加载')
  
  // 播放欢迎语音（使用 MP3 文件，不需要 WebRTC）
  if (!welcomeMessagePlayed) {
    welcomeMessagePlayed = true
    await playWelcomeMessage()
  }
  
  // 设备检测提示
  deviceCheckStatus.value = 'pending'
  deviceCheckTip.value = '请先测试语音播放和麦克风，确保设备正常。'
  deviceCheckResult.value = '等待检测'
})

// 播报欢迎语（使用 mp3 文件和全局音频管理器）
async function playWelcomeMessage() {
  try {
    // 等待 1 秒，确保页面加载完成
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('[PrepView] 开始播放欢迎语音...')
    
    // 使用全局音频管理器播放
    await playAudio('/audio/welcome.MP3')
    
    console.log('[PrepView] 欢迎语播放完成')
  } catch (error) {
    console.error('[PrepView] 播放欢迎语失败:', error)
  }
}

onUnmounted(() => {
  console.log('[PrepView] 组件卸载，清理所有资源')
  
  // 停止所有音频
  stopAllAudios()
  
  // 清理测试音频资源
  if (testAudio) {
    testAudio.pause()
    testAudio.src = ''
    testAudio = null
  }
  
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
})

// 验证表单
function validateForm() {
  let isValid = true
  
  // 清空错误
  Object.keys(errors).forEach(key => { errors[key] = '' })

  // 性别验证
  if (!form.sex) {
    errors.sex = '请选择性别'
    isValid = false
  }

  // 年龄验证
  const age = parseInt(form.age)
  if (!form.age) {
    errors.age = '请输入年龄'
    isValid = false
  } else if (isNaN(age) || age < 1 || age > 120) {
    errors.age = '请输入有效的年龄（1-120）'
    isValid = false
  }

  // 学历验证
  if (!form.education) {
    errors.education = '请选择学历'
    isValid = false
  }

  // 职业验证
  if (!form.occupation.trim()) {
    errors.occupation = '请输入职业'
    isValid = false
  }

  // 心情验证
  if (!form.mood.trim()) {
    errors.mood = '请输入当前心情'
    isValid = false
  }

  return isValid
}

// 测试音响
async function handleSpeakerTest() {
  isSpeakerTesting.value = true
  deviceCheckStatus.value = 'checking'
  deviceCheckResult.value = '正在测试语音播放...'
  deviceCheckTip.value = '请确认是否听到测试音。'

  try {
    // 创建测试音频
    testAudio = new Audio()
    testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBz2V2fPAeCcFKHzK8eCNPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYGLHzK8d+NQAoUXrTp7KdVEwtGoOHyv2wfBz2V2fPAeCcGLHzK8d+NPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYGLHzK8d+NQAoUXrTp7KdVEwtGoOHyv2wfBz2V2fPAeCcGLHzK8d+NPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYGLHzK8d+NQAoUXrTp7KdVEwtGoOHyv2wfBz2V2fPAeCcGLHzK8d+NPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYGLHzK8d+NQAoUXrTp7KdVEwtGoOHyv2wfBz2V2fPAeCcGLHzK8d+NPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYGLHzK8d+NQAoUXrTp7KdVEwtGoOHyv2wfBz2V2fPAeCcGLHzK8d+NPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYGLHzK8d+NQAoUXrTp7KdVEwtGoOHyv2wfBz2V2fPAeCcGLHzK8d+NPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYGLHzK8d+NQAoUXrTp7KdVEwtGoOHyv2wfBz2V2fPAeCcGLHzK8d+NPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYGLHzK8d+NQAoUXrTp7KdVEwtGoOHyv2wfBz2V2fPAeCcGLHzK8d+NPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYGLHzK8d+NQAoUXrTp7KdVEwtGoOHyv2wfBz2V2fPAeCcGLHzK8d+NPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYGLHzK8d+NQAoUXrTp7KdVEwtGoOHyv2wfBz2V2fPAeCcGLHzK8d+NPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYGLHzK8d+NQAoUXrTp7KdVEwtGoOHyv2wfBz2V2fPAeCcGLHzK8d+NPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYGLHzK8d+NQAoUXrTp7KdVEwtGoOHyv2wfBz2V2fPAeCcGLHzK8d+NPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYGLHzK8d+NQAoUXrTp7KdVEwtGoOHyv2wfBz2V2fPAeCcGLHzK8d+NPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYGLHzK8d+NQAoUXrTp7KdVEwtGoOHyv2wfBz2V2fPAeCcGLHzK8d+NPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYGLHzK8d+NQAoUXrTp7KdVEwtGoOHyv2wfBz2V2fPAeCcGLHzK8d+NPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYGLHzK8d+NQAoUXrTp7KdVEwtGoOHyv2wfBz2V2fPAeCcGLHzK8d+NPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYGLHzK8d+NQAoUXrTp7KdVEwtGoOHyv2wfBz2V2fPAeCcGLHzK8d+NPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYGLHzK8d+NQAoUXrTp7KdVEwtGoOHyv2wfBz2V2fPAeCcGLHzK8d+NPwkWYrjs6qdbEg1LouTxuGwnBzyT2PPDeSYG'
    
    await testAudio.play()
    
    // 播放完成
    testAudio.onended = () => {
      deviceCheckResult.value = '✓ 语音播放测试完成'
      deviceCheckTip.value = '接下来请测试麦克风。'
      isSpeakerTesting.value = false
      
      // 如果麦克风也测试通过，则标记为 ready
      if (deviceCheckResult.value.includes('麦克风测试完成')) {
        deviceCheckStatus.value = 'ready'
      }
    }
  } catch (error) {
    console.error('音响测试失败:', error)
    deviceCheckStatus.value = 'error'
    deviceCheckResult.value = '✗ 语音播放测试失败，请检查音响设备'
    deviceCheckTip.value = '请确保浏览器允许播放音频。'
    isSpeakerTesting.value = false
  }
}

// 测试麦克风
async function handleMicTest() {
  isMicTesting.value = true
  deviceCheckStatus.value = 'checking'
  deviceCheckResult.value = '正在请求麦克风权限...'
  deviceCheckTip.value = '请在浏览器弹出提示时允许使用麦克风。'

  try {
    // 请求麦克风权限
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    
    // 创建音频上下文
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    source.connect(analyser)
    
    analyser.fftSize = 256
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    // 检测音量
    let maxVolume = 0
    let checkCount = 0
    const maxChecks = 50 // 检测5秒
    
    deviceCheckResult.value = '正在检测麦克风...请说话...'
    deviceCheckTip.value = '请对着麦克风说一句话。'
    
    const checkInterval = setInterval(() => {
      analyser.getByteFrequencyData(dataArray)
      const volume = dataArray.reduce((a, b) => a + b) / bufferLength
      
      if (volume > maxVolume) {
        maxVolume = volume
      }
      
      checkCount++
      
      if (checkCount >= maxChecks) {
        clearInterval(checkInterval)
        stream.getTracks().forEach(track => track.stop())
        
        if (maxVolume > 10) {
          deviceCheckResult.value = '✓ 麦克风测试完成'
          deviceCheckTip.value = '设备检测完成，可以开始测试了。'
          deviceCheckStatus.value = 'ready'
        } else {
          deviceCheckResult.value = '✗ 未检测到声音，请检查麦克风'
          deviceCheckTip.value = '请确保麦克风已连接并调高音量。'
          deviceCheckStatus.value = 'error'
        }
        
        isMicTesting.value = false
      }
    }, 100)
  } catch (error) {
    console.error('麦克风测试失败:', error)
    deviceCheckStatus.value = 'error'
    deviceCheckResult.value = '✗ 麦克风测试失败，请检查权限'
    deviceCheckTip.value = '请在浏览器设置中允许使用麦克风。'
    isMicTesting.value = false
  }
}

// 开始测试
async function handleStartTest() {
  if (!validateForm()) {
    return
  }

  try {
    // 获取用户信息
    const userInfo = authStore.userInfo
    const userId = userInfo?.username || userInfo?.phone
    
    if (!userId) {
      alert('用户信息不完整，请重新登录')
      router.push('/login')
      return
    }

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

    // 提交基本信息到后端（使用中文字段名，确保年龄是字符串）
    const basicInfo = {
      性别: form.sex,
      年龄: String(form.age),  // 转换为字符串
      学历: form.education,
      职业: form.occupation.trim(),
      当前心情: form.mood.trim(),
      测试时间: testTime
    }

    // 保存到 store（使用英文字段名，确保年龄是字符串）
    testStore.setBasicInfo({
      sex: form.sex,
      age: String(form.age),  // 转换为字符串
      education: form.education,
      occupation: form.occupation.trim(),
      mood: form.mood.trim()
    })

    // 提交到后端
    await api.setBasicInfo(userId, basicInfo)

    // 设置测试阶段为 intro（介绍预览）
    testStore.setPhase('intro')

    // 保存会话快照
    sessionStore.saveSnapshot('info_complete')

    // 跳转到测试说明页面
    router.push('/intro')
  } catch (error) {
    console.error('提交基本信息失败:', error)
    alert('提交失败，请重试')
  }
}

// 恢复未完成的测试
function handleResumeTest() {
  // 使用 sessionStore 的恢复方法
  const success = sessionStore.restoreSession()
  if (success) {
    // 跳转到测试页面
    router.push('/test')
  } else {
    alert('恢复会话失败，请重新开始测试')
  }
}

// 直接进入测试（跳过基本信息填写）
function handleDirectEnter() {
  console.log('[PrepView] 直接进入测试')
  
  // 停止当前页面的音频
  stopAllAudios()
  
  // 设置默认的基本信息（用于测试）
  testStore.setBasicInfo({
    sex: '男',
    age: '25',
    education: '本科',
    occupation: '测试用户',
    mood: '平静'
  })
  
  // 启动测试
  testStore.startTest()
  
  // 保存会话快照
  sessionStore.saveSnapshot('direct_enter')
  
  // 直接跳转到测试页面
  router.push('/test')
}
</script>


<style lang="less" scoped>
// 变量
@brand-cyan: #00f2ea;
@brand-blue: #0055ff;
@brand-purple: #ff0080;
@glass-bg: rgba(15, 23, 42, 0.75);
@glass-border: rgba(99, 102, 241, 0.3);

// 主容器
.prep-page {
  position: relative;
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: transparent; // 改为透明，让黑洞背景显示
  overflow-y: auto;
}

// 准备页面布局（两栏）
.prep-layout {
  position: relative;
  z-index: 10; // 确保内容在背景之上
  display: flex;
  gap: 32px;
  width: min(1160px, 100%);
  align-items: stretch;
  animation: slideUp 0.6s ease-out;

  @media (max-width: 1200px) {
    flex-wrap: wrap;
    justify-content: center;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 20px;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 玻璃卡片
.glass-card {
  background: @glass-bg;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid @glass-border;
  border-radius: 20px;
  padding: 24px 40px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(99, 102, 241, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(99, 102, 241, 0.6),
      rgba(139, 92, 246, 0.6),
      transparent
    );
    opacity: 0.8;
    animation: shimmer 3s ease-in-out infinite;
  }

  @media (max-width: 768px) {
    padding: 20px;
  }
}

@keyframes shimmer {
  0%, 100% {
    opacity: 0.4;
    transform: translateX(-100%);
  }
  50% {
    opacity: 0.8;
    transform: translateX(100%);
  }
}

// 左侧信息卡片
.info-card {
  width: 400px;
  flex-shrink: 0;

  @media (max-width: 1200px) {
    width: 100%;
    max-width: 460px;
  }
}

.card-title {
  font-size: 28px;
  font-weight: 700;
  color: rgba(226, 232, 240, 0.95);
  text-align: center;
  margin-bottom: 16px;
  text-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
  position: relative;
  z-index: 2;
}

// 表单
.info-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  z-index: 2;
}

// 表单组
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 14px;
    font-weight: 600;
    color: rgba(203, 213, 225, 0.9);
  }

  input,
  select {
    padding: 12px 14px;
    background: rgba(30, 41, 59, 0.6);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 2px solid rgba(226, 232, 240, 0.2);
    border-radius: 10px;
    color: rgba(226, 232, 240, 0.95);
    font-size: 14px;
    transition: all 0.2s ease;
    font-family: inherit;

    &::placeholder {
      color: rgba(148, 163, 184, 0.6);
    }

    &:focus {
      outline: none;
      background: rgba(30, 41, 59, 0.8);
      border-color: rgba(99, 102, 241, 0.6);
      box-shadow: 
        0 0 0 3px rgba(99, 102, 241, 0.2),
        0 4px 12px rgba(99, 102, 241, 0.3);
    }
  }

  select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23e2e8f0' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 12px 12px;
    cursor: pointer;

    option {
      background: rgba(15, 23, 42, 0.95);
      color: rgba(226, 232, 240, 0.95);
    }
  }
}

// 错误信息
.error-message {
  font-size: 12px;
  color: rgba(248, 113, 113, 0.9);
  text-shadow: 0 0 5px rgba(248, 113, 113, 0.3);
  min-height: 18px;
}

// 开始测试按钮
.start-btn {
  width: 100%;
  padding: 14px;
  margin-top: 10px;
  background: linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6);
  border: 1px solid rgba(99, 102, 241, 0.5);
  border-radius: 10px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 4px 16px rgba(99, 102, 241, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;

  &:hover {
    background: linear-gradient(135deg, #2563eb, #4f46e5, #7c3aed);
    box-shadow: 
      0 6px 20px rgba(99, 102, 241, 0.6),
      0 0 0 1px rgba(255, 255, 255, 0.2) inset;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 
      0 2px 8px rgba(99, 102, 241, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  }
}

// 恢复测试按钮
.resume-btn {
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  background: linear-gradient(135deg, #0ea5e9, #06b6d4);
  border: 1px solid rgba(6, 182, 212, 0.5);
  border-radius: 10px;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 4px 16px rgba(6, 182, 212, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;

  &:hover {
    background: linear-gradient(135deg, #0284c7, #0891b2);
    box-shadow: 
      0 6px 20px rgba(6, 182, 212, 0.6),
      0 0 0 1px rgba(255, 255, 255, 0.2) inset;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 
      0 2px 8px rgba(6, 182, 212, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  }
}

// 直接进入测试按钮
.direct-enter-btn {
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  background: linear-gradient(135deg, #2196F3, #1976D2);
  border: 1px solid rgba(33, 150, 243, 0.5);
  border-radius: 10px;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 4px 16px rgba(33, 150, 243, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;

  &:hover {
    background: linear-gradient(135deg, #1E88E5, #1565C0);
    box-shadow: 
      0 6px 20px rgba(33, 150, 243, 0.6),
      0 0 0 1px rgba(255, 255, 255, 0.2) inset;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 
      0 2px 8px rgba(33, 150, 243, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  }
}

// 右侧准备卡片
.prep-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.prep-header {
  display: flex;
  gap: 16px;
  align-items: center;
  position: relative;
  z-index: 2;
}

.prep-icon {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 28px;
  box-shadow: 0 10px 30px rgba(79, 70, 229, 0.25);
}

.prep-label {
  font-size: 13px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 4px;
}

.prep-title {
  font-size: 22px;
  color: rgba(226, 232, 240, 0.95);
  margin: 0;
  text-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
}

.prep-intro {
  font-size: 14px;
  line-height: 1.7;
  color: rgba(203, 213, 225, 0.9);
  position: relative;
  z-index: 2;
}

.prep-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
  padding: 0;
  position: relative;
  z-index: 2;

  li {
    display: flex;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 16px;
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(148, 163, 184, 0.3);
    color: rgba(226, 232, 240, 0.9);
    line-height: 1.6;

    strong {
      color: rgba(147, 197, 253, 0.95);
    }
  }
}

.list-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: linear-gradient(135deg, #0ea5e9, #2563eb);
  margin-top: 8px;
  flex-shrink: 0;
}

// 设备检测
.device-check {
  position: relative;
  z-index: 2;
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &[data-status="error"] {
    animation: deviceCheckShake 0.4s ease;
    box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.35),
      0 10px 30px rgba(239, 68, 68, 0.15);
  }
}

@keyframes deviceCheckShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-3px); }
}

.device-check-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.device-check-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.device-check-title {
  font-size: 14px;
  font-weight: 700;
  color: rgba(226, 232, 240, 0.95);
  margin: 0;
  letter-spacing: 0.02em;
}

.device-check-tip {
  margin: 4px 0 0;
  font-size: 13px;
  color: rgba(203, 213, 225, 0.9);
}

.device-check-desc {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(203, 213, 225, 0.8);
}

.device-check-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;

  button {
    flex: 1;
    min-width: 150px;
    border-radius: 10px;
    border: 2px solid rgba(226, 232, 240, 0.2);
    background: rgba(30, 41, 59, 0.7);
    padding: 10px 12px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: rgba(226, 232, 240, 0.9);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

    &:hover:not(:disabled) {
      background: rgba(51, 65, 85, 0.8);
      border-color: rgba(99, 102, 241, 0.5);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
      transform: translateY(-1px);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

.device-check-result {
  align-self: flex-start;
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  background: rgba(30, 41, 59, 0.5);
  color: rgba(203, 213, 225, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.4);
  text-transform: uppercase;
}

.device-check[data-status="ready"] .device-check-result {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.3);
}

.device-check[data-status="error"] .device-check-result {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.35);
}

.device-check[data-status="checking"] .device-check-result {
  background: rgba(14, 165, 233, 0.15);
  color: #0ea5e9;
  border-color: rgba(14, 165, 233, 0.4);
}
</style>
