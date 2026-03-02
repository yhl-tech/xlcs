<template>
  <div class="prep-page">
    <!-- 准备页面布局 -->
    <div class="prep-layout">
      <!-- 左侧：信息填写卡片 -->
      <div class="info-card glass-card">
        <h1 class="card-title">
          个人信息
        </h1>

        <form
          class="info-form"
          @submit.prevent="handleStartTest"
        >
          <!-- 性别 -->
          <div class="form-group">
            <label>性别</label>
            <div 
              class="custom-select"
              :class="{ 'is-open': sexDropdownOpen }"
            >
              <div 
                class="custom-select-trigger"
                @click="sexDropdownOpen = !sexDropdownOpen"
              >
                <span>{{ form.sex || '请选择' }}</span>
                <svg
                  class="select-arrow"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <div class="custom-select-options">
                <div 
                  v-for="opt in ['男', '女']" 
                  :key="opt"
                  class="custom-select-option"
                  :class="{ 'is-selected': form.sex === opt }"
                  @click="form.sex = opt; sexDropdownOpen = false"
                >
                  <span
                    v-if="form.sex === opt"
                    class="option-check"
                  >✓</span>
                  {{ opt }}
                </div>
              </div>
            </div>
            <div
              v-if="errors.sex"
              class="error-message"
            >
              {{ errors.sex }}
            </div>
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
            >
            <div
              v-if="errors.age"
              class="error-message"
            >
              {{ errors.age }}
            </div>
          </div>

          <!-- 学历 -->
          <div class="form-group">
            <label>学历</label>
            <div 
              class="custom-select"
              :class="{ 'is-open': eduDropdownOpen }"
            >
              <div 
                class="custom-select-trigger"
                @click="eduDropdownOpen = !eduDropdownOpen"
              >
                <span :class="{ 'placeholder': !form.education }">{{ form.education || '请选择学历' }}</span>
                <svg
                  class="select-arrow"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <div class="custom-select-options">
                <div 
                  v-for="opt in educationOptions" 
                  :key="opt"
                  class="custom-select-option"
                  :class="{ 'is-selected': form.education === opt }"
                  @click="form.education = opt; eduDropdownOpen = false"
                >
                  <span
                    v-if="form.education === opt"
                    class="option-check"
                  >✓</span>
                  {{ opt }}
                </div>
              </div>
            </div>
            <div
              v-if="errors.education"
              class="error-message"
            >
              {{ errors.education }}
            </div>
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
            >
            <div
              v-if="errors.occupation"
              class="error-message"
            >
              {{ errors.occupation }}
            </div>
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
            >
            <div
              v-if="errors.mood"
              class="error-message"
            >
              {{ errors.mood }}
            </div>
          </div>

          <!-- 开始测试按钮 -->
          <button 
            type="submit" 
            class="start-btn"
         
            :class="{ 'btn-disabled': !isDeviceTestPassed }"
          >
            {{ isDeviceTestPassed ? '开始测试' : '请先完成设备检测' }}
          </button>
        </form>
      </div>

      <!-- 右侧：准备说明卡片 -->
      <div class="prep-card glass-card">
        <div class="prep-header">
          <div class="prep-icon">
            🎧
          </div>
          <div>
            <p class="prep-label">
              测试准备
            </p>
            <h2 class="prep-title">
              开始之前，请先确认这些事项
            </h2>
          </div>
        </div>

        <p class="prep-intro">
          Hello，亲爱的用户您好，欢迎来到知己心探心理测试，在测试前，需要跟您确认以下几点：
        </p>

        <ul class="prep-list">
          <li>
            <span class="list-dot" />
            <div>1.首先，请先在网页左侧，填写您的个人信息</div>
          </li>
          <li>
            <span class="list-dot" />
            <div>2.测试需要在台式电脑或笔记本电脑上进行，请确保您的电脑麦克风和音响正常。您可以在浏览器上配置您的麦克风，并利用下方的设备测试按钮，检测您的麦克风和音响状态。</div>
          </li>
          <li>
            <span class="list-dot" />
            <div>3.需要提醒您的是，测试时需要保持您周围的环境安静，避免被外界的电话、微信消息打扰，只有这样才能达到最好的测试效果</div>
          </li>
          <li>
            <span class="list-dot" />
            <div>4.整个心理测试过程采用数字人语音交互完成，确保您的信息隐私安全，请放心。</div>
          </li>
          <li>
            <span class="list-dot" />
            <div>5.如果以上信息确认完毕，那么请点击蓝色的开始测试按钮，我们将向您介绍心理测试的具体操作流程</div>
          </li>
        </ul>

        <!-- 设备检测区域 -->
        <div
          class="device-check"
          :data-status="deviceCheckStatus"
        >
          <div class="device-check-header">
            <div class="device-check-icon">
              🎧
            </div>
            <div>
              <p class="device-check-title">
                设备检测
              </p>
              <p class="device-check-tip">
                {{ deviceCheckTip }}
              </p>
            </div>
          </div>

          <p class="device-check-desc">
            点击下方按钮播放测试音，并在浏览器弹出提示时允许使用麦克风，然后对着麦克风说一句平时说话的句子。
          </p>

          <div class="device-check-actions">
            <button
              type="button"
              :disabled="isSpeakerTesting"
              @click="handleSpeakerTest"
            >
              🔊 {{ isSpeakerTesting ? '测试中...' : '测试语音（音响）播放' }}
            </button>
            <button
              type="button"
              :disabled="isMicTesting"
              @click="handleMicTest"
            >
              🎙️ {{ isMicTesting ? '检测中...' : '检测麦克风（测试时请说话）' }}
            </button>
          </div>

          <div class="device-check-result">
            {{ deviceCheckResult }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useTestStore } from '@/stores/testStore'
import { useSessionStore } from '@/stores/sessionStore'
import useApi from '@/composables/useApi'
import { playAudio, stopAllAudios } from '@/utils/audioManager'
import { useImagePreloader } from '@/composables/useImagePreloader'

const router = useRouter()
const authStore = useAuthStore()
const testStore = useTestStore()
const sessionStore = useSessionStore()
const api = useApi()
const { preloadAll } = useImagePreloader()

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

// 下拉框状态
const sexDropdownOpen = ref(false)
const eduDropdownOpen = ref(false)

// 学历选项
const educationOptions = ['小学', '初中', '高中', '中专', '大专', '本科', '硕士', '博士']

// 设备测试完成状态
const isSpeakerTestPassed = ref(false)
const isMicTestPassed = ref(false)

// 计算属性：是否设备测试都通过
const isDeviceTestPassed = computed(() => {
  return isSpeakerTestPassed.value && isMicTestPassed.value
})

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

// 点击外部关闭下拉框
function handleClickOutside(event) {
  const target = event.target
  if (!target.closest('.custom-select')) {
    sexDropdownOpen.value = false
    eduDropdownOpen.value = false
  }
}

onMounted(async () => {
  console.log('[PrepView] 页面已加载')

  // 添加点击外部关闭下拉框的监听
  document.addEventListener('click', handleClickOutside)

  // 播放欢迎语音（使用 MP3 文件，不需要 WebRTC）
  if (!welcomeMessagePlayed) {
    welcomeMessagePlayed = true
    await playWelcomeMessage()
  }

  // 设备检测提示
  deviceCheckStatus.value = 'pending'
  deviceCheckTip.value = '请先测试语音播放和麦克风，确保设备正常。'
  deviceCheckResult.value = '等待检测'

  // 预加载测试墨迹图
  console.log('[PrepView] 开始预加载墨迹图...')
  preloadAll({
    onProgress: (loaded, total, percent) => {
      console.log(`[PrepView] 墨迹图预加载进度: ${loaded}/${total} (${percent}%)`)
    }
  }).then(result => {
    console.log('[PrepView] 墨迹图预加载完成:', result)
  }).catch(error => {
    console.error('[PrepView] 墨迹图预加载失败:', error)
  })
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
  
  // 移除点击外部监听
  document.removeEventListener('click', handleClickOutside)
  
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
      isSpeakerTestPassed.value = true
      isSpeakerTesting.value = false
      
      // 如果麦克风也测试通过，则标记为 ready
      if (isMicTestPassed.value) {
        deviceCheckStatus.value = 'ready'
        deviceCheckTip.value = '设备检测完成，可以开始测试了。'
      } else {
        deviceCheckTip.value = '接下来请测试麦克风。'
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
    let checkCount = 0
    const maxChecks = 30 // 最多检测3秒
    const volumeThreshold = 10 // 音量阈值
    let consecutiveDetections = 0 // 连续检测到声音的次数
    const requiredDetections = 3 // 需要连续检测到3次才算成功
    
    deviceCheckResult.value = '正在检测麦克风...请说话...'
    deviceCheckTip.value = '请对着麦克风说一句话。'
    
    const finishTest = (success) => {
      clearInterval(checkInterval)
      stream.getTracks().forEach(track => track.stop())
      
      if (success) {
        deviceCheckResult.value = '✓ 麦克风测试完成'
        isMicTestPassed.value = true
        
        // 如果音响也测试通过，则标记为 ready
        if (isSpeakerTestPassed.value) {
          deviceCheckStatus.value = 'ready'
          deviceCheckTip.value = '设备检测完成，可以开始测试了。'
        } else {
          deviceCheckTip.value = '接下来请测试语音播放。'
        }
      } else {
        deviceCheckResult.value = '✗ 未检测到声音，请检查麦克风'
        deviceCheckTip.value = '请确保麦克风已连接并调高音量。'
        deviceCheckStatus.value = 'error'
      }
      
      isMicTesting.value = false
    }
    
    const checkInterval = setInterval(() => {
      analyser.getByteFrequencyData(dataArray)
      const volume = dataArray.reduce((a, b) => a + b) / bufferLength
      
      checkCount++
      
      // 检测到足够的音量
      if (volume > volumeThreshold) {
        consecutiveDetections++
        // 连续检测到声音3次，立即成功
        if (consecutiveDetections >= requiredDetections) {
          finishTest(true)
          return
        }
      } else {
        consecutiveDetections = 0 // 重置连续计数
      }
      
      // 超时未检测到
      if (checkCount >= maxChecks) {
        finishTest(false)
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

</script>


<style lang="less" scoped>
// 变量 - 升级配色方案
@brand-cyan: #00f2ea;
@brand-blue: #3b82f6;
@brand-purple: #8b5cf6;
@text-primary: #ffffff;
@text-secondary: #ffffff;
@glass-bg: rgba(15, 23, 42, 0.65);
@glass-border: rgba(255, 255, 255, 0.1);
@input-bg: rgba(30, 41, 59, 0.5);

// 主容器
.prep-page {
  position: relative;
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 24px 40px;
  background: transparent;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

// 准备页面布局（两栏）
.prep-layout {
  position: relative;
  z-index: 10;
  display: flex;
  gap: 24px;
  width: min(1200px, 100%);
  align-items: stretch;
  animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);

  @media (max-width: 1024px) {
    flex-direction: column;
    max-width: 600px;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 玻璃卡片通用样式
.glass-card {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(100, 150, 200, 0.2);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.3),
    0 0 20px rgba(100, 150, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

// 左侧信息卡片
.info-card {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;

  @media (max-width: 1024px) {
    width: 100%;
  }
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 16px;
  letter-spacing: -0.01em;
}

// 表单
.info-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
}

// 表单组
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 12px;
    font-weight: 500;
    color: @text-secondary;
  }

  input,
  select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    width: 100%;
    height: 42px;
    padding: 0 14px;
    background-color: rgba(15, 23, 42, 0.8) !important;
    border: 1px solid rgba(100, 150, 200, 0.3);
    border-radius: 10px;
    color: #ffffff !important;
    font-size: 14px;
    line-height: 42px;
    transition: all 0.2s ease;
    font-family: inherit;
    box-sizing: border-box;

    &::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    &:hover {
      background-color: rgba(15, 23, 42, 0.9) !important;
      border-color: rgba(100, 150, 200, 0.5);
    }

    &:focus {
      outline: none;
      background-color: rgba(15, 23, 42, 0.95) !important;
      border-color: @brand-blue;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }
  }

  input[type="number"] {
    -moz-appearance: textfield;
    
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }

  :deep(input:-webkit-autofill),
  :deep(input:-webkit-autofill:hover),
  :deep(input:-webkit-autofill:focus),
  :deep(textarea:-webkit-autofill),
  :deep(textarea:-webkit-autofill:hover),
  :deep(textarea:-webkit-autofill:focus) {
    -webkit-text-fill-color: #ffffff !important;
    box-shadow: 0 0 0 1000px rgba(15, 23, 42, 0.9) inset !important;
    transition: background-color 9999s ease-out 0s;
  }

  select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
    background-repeat: no-repeat !important;
    background-position: right 12px center !important;
    cursor: pointer;
    padding-right: 36px;

    option {
      background: #0f172a;
      color: #ffffff;
      padding: 10px;
    }
  }
}

// 自定义下拉框
.custom-select {
  position: relative;
  width: 100%;
  user-select: none;
}

.custom-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 42px;
  padding: 0 14px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(100, 150, 200, 0.3);
  border-radius: 10px;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:hover {
    background: rgba(15, 23, 42, 0.9);
    border-color: rgba(100, 150, 200, 0.5);
  }

  .placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
}

.select-arrow {
  width: 14px;
  height: 14px;
  color: rgba(255, 255, 255, 0.7);
  transition: transform 0.25s ease;
  flex-shrink: 0;
}

.custom-select.is-open {
  .custom-select-trigger {
    border-color: @brand-blue;
    background: rgba(15, 23, 42, 0.95);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  .select-arrow {
    transform: rotate(180deg);
  }

  .custom-select-options {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
}

.custom-select-options {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: rgba(15, 23, 42, 0.98);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(100, 150, 200, 0.3);
  border-radius: 10px;
  padding: 6px;
  z-index: 100;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 10px 40px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(59, 130, 246, 0.1);
  max-height: 240px;
  overflow-y: auto;

  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(100, 150, 200, 0.3);
    border-radius: 2px;
  }
}

.custom-select-option {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;

  &:hover {
    background: rgba(59, 130, 246, 0.15);
    color: #ffffff;
  }

  &.is-selected {
    background: rgba(59, 130, 246, 0.2);
    color: #60a5fa;
    font-weight: 500;
  }

  .option-check {
    margin-right: 8px;
    color: #60a5fa;
    font-size: 12px;
    font-weight: bold;
  }
}

// 错误信息
.error-message {
  font-size: 12px;
  color: #ef4444;
  margin-top: 4px;
  padding-left: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &::before {
    content: "!";
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #ef4444;
    color: white;
    font-size: 9px;
    font-weight: bold;
  }
}

// 开始测试按钮
.start-btn {
  width: 100%;
  padding: 12px;
  margin-top: 8px;
  background: linear-gradient(135deg, #3b82f6, #4f46e5);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &.btn-disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: #334155;
    box-shadow: none;
    color: #94a3b8;
    
    &:hover {
      transform: none;
      box-shadow: none;
    }
  }
}

// 右侧准备卡片
.prep-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.prep-header {
  display: flex;
  gap: 14px;
  align-items: center;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.prep-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 22px;
  color: #60a5fa;
}

.prep-label {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: #ffffff;
  margin-bottom: 4px;
}

.prep-title {
  font-size: 17px;
  font-weight: 600;
  color: @text-primary;
  margin: 0;
  line-height: 1.3;
}

.prep-intro {
  font-size: 13px;
  line-height: 1.6;
  color: @text-secondary;
  margin: 0;
}

.prep-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;

  li {
    display: flex;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    div {
      font-size: 13px;
      line-height: 1.5;
      color: @text-secondary;
    }
  }
}

.list-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: @brand-blue;
  margin-top: 6px;
  flex-shrink: 0;
}

// 设备检测区域
.device-check {
  margin-top: 8px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  overflow: hidden;
  
  // 科技感背景纹理
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
    background: 
      radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 0% 100%, rgba(139, 92, 246, 0.08) 0%, transparent 50%);
    pointer-events: none;
  }

  &[data-status="error"] {
    border-color: rgba(239, 68, 68, 0.4);
  }
  
  &[data-status="ready"] {
    border-color: rgba(16, 185, 129, 0.4);
  }
}

.device-check-header {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.device-check-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.device-check-title {
  font-size: 14px;
  font-weight: 600;
  color: @text-primary;
  margin: 0;
}

.device-check-tip {
  font-size: 12px;
  color: @text-secondary;
  margin: 2px 0 0;
}

.device-check-desc {
  font-size: 12px;
  color: #ffffff;
  margin: 0;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  border-left: 2px solid @brand-blue;
  line-height: 1.5;
}

.device-check-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;

  button {
    flex: 1;
    min-width: 140px;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    color: @text-primary;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      border-color: @brand-blue;
    }

    &:disabled {
      opacity: 0.5;
      cursor: wait;
    }
  }
}

.device-check-result {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(30, 41, 59, 0.5);
  color: @text-secondary;
  border: 1px solid transparent;
  width: fit-content;
}

// 响应状态样式
.device-check[data-status="ready"] .device-check-result {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2);
}

.device-check[data-status="error"] .device-check-result {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
}

.device-check[data-status="checking"] .device-check-result {
  color: #0ea5e9;
  background: rgba(14, 165, 233, 0.1);
  border-color: rgba(14, 165, 233, 0.2);
}
</style>
