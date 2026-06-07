<template>
  <div class="login-page">
    <!-- 动画背景 -->
    <div class="login-background">
      <div class="login-bg-gradient"></div>
      <svg class="login-bg-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <!-- 左上角区域 - 弧线组 -->
        <path class="organic-line" d="M 50,50 Q 150,80 200,150 Q 180,200 100,250" />
        <path class="organic-line" d="M 100,100 Q 200,120 280,180 Q 250,240 150,280" />
        <path class="organic-line-2" d="M 80,120 Q 180,150 250,200 Q 220,260 120,300" />

        <!-- 顶部中央区域 - 大弧线 -->
        <path class="organic-line" d="M 300,50 Q 500,100 700,80 Q 900,60 1100,100" />
        <path class="organic-line-2" d="M 400,80 Q 600,120 800,100 Q 1000,80 1150,120" />

        <!-- 右上角区域 - 弧线组 -->
        <path class="organic-line" d="M 1000,50 Q 1100,100 1150,200 Q 1120,280 1050,320" />
        <path class="organic-line-2" d="M 1050,100 Q 1120,150 1170,250 Q 1140,300 1080,350" />
        <path class="organic-line" d="M 950,80 Q 1020,130 1070,220 Q 1040,270 980,310" />

        <!-- 左侧区域 - 垂直弧线 -->
        <path class="organic-line" d="M 50,200 Q 80,300 100,400 Q 90,500 70,600" />
        <path class="organic-line-2" d="M 100,250 Q 120,350 140,450 Q 130,550 110,650" />
        <path class="organic-line" d="M 30,300 Q 60,400 80,500 Q 70,600 50,700" />

        <!-- 中左区域 - 有机曲线 -->
        <path class="organic-line" d="M 200,300 Q 300,350 400,380 Q 500,400 600,420 Q 500,480 400,500 Q 300,480 200,450" />
        <path class="organic-line-2" d="M 250,350 Q 350,400 450,430 Q 550,450 650,470 Q 550,520 450,540 Q 350,520 250,490" />

        <!-- 中右区域 - 扩散弧线 -->
        <path class="organic-line" d="M 800,300 Q 900,350 1000,400 Q 1100,450 1150,500 Q 1100,550 1000,600 Q 900,550 800,500" />
        <path class="organic-line-2" d="M 850,350 Q 950,400 1050,450 Q 1120,500 1170,550 Q 1120,600 1050,650 Q 950,600 850,550" />
        <path class="organic-line" d="M 750,320 Q 850,370 950,420 Q 1050,470 1100,520 Q 1050,570 950,620 Q 850,570 750,520" />

        <!-- 右侧区域 - 垂直弧线 -->
        <path class="organic-line" d="M 1150,200 Q 1120,300 1100,400 Q 1110,500 1130,600" />
        <path class="organic-line-2" d="M 1100,250 Q 1070,350 1050,450 Q 1060,550 1080,650" />

        <!-- 底部左侧 - 弧线组 -->
        <path class="organic-line" d="M 50,600 Q 150,650 250,700 Q 200,750 100,780" />
        <path class="organic-line-2" d="M 100,620 Q 200,670 300,720 Q 250,760 150,790" />
        <path class="organic-line" d="M 80,640 Q 180,690 280,740 Q 230,770 130,800" />

        <!-- 底部中央 - 大弧线 -->
        <path class="organic-line" d="M 300,700 Q 500,720 700,740 Q 900,760 1100,750" />
        <path class="organic-line-2" d="M 400,720 Q 600,740 800,760 Q 1000,780 1150,770" />

        <!-- 底部右侧 - 弧线组 -->
        <path class="organic-line" d="M 1000,650 Q 1100,680 1150,720 Q 1120,760 1050,780" />
        <path class="organic-line-2" d="M 1050,670 Q 1120,700 1170,740 Q 1140,770 1080,790" />

        <!-- 装饰性小点 -->
        <circle class="decorative-dot" cx="150" cy="120" r="2.5" />
        <circle class="decorative-dot-2" cx="280" cy="180" r="3" />
        <circle class="decorative-dot" cx="450" cy="250" r="2.5" />
        <circle class="decorative-dot-3" cx="650" cy="320" r="2.5" />
        <circle class="decorative-dot" cx="850" cy="280" r="3" />
        <circle class="decorative-dot-2" cx="1050" cy="350" r="2.5" />
        <circle class="decorative-dot" cx="200" cy="450" r="2.5" />
        <circle class="decorative-dot-3" cx="500" cy="520" r="3" />
        <circle class="decorative-dot" cx="800" cy="580" r="2.5" />
        <circle class="decorative-dot-2" cx="1100" cy="620" r="2.5" />
        <circle class="decorative-dot" cx="350" cy="680" r="3" />
        <circle class="decorative-dot-3" cx="700" cy="720" r="2.5" />
        <circle class="decorative-dot" cx="950" cy="750" r="2.5" />
        <circle class="decorative-dot-2" cx="120" cy="550" r="2.5" />
        <circle class="decorative-dot" cx="980" cy="480" r="3" />
        <circle class="decorative-dot" cx="80" cy="250" r="2.5" />
        <circle class="decorative-dot-2" cx="320" cy="100" r="2.5" />
        <circle class="decorative-dot-3" cx="600" cy="150" r="2.5" />
        <circle class="decorative-dot" cx="900" cy="200" r="3" />
        <circle class="decorative-dot-2" cx="1150" cy="280" r="2.5" />
      </svg>
    </div>

    <!-- 登录容器 -->
    <div class="login-container">
      <h1>{{ formTitle }}</h1>

      <!-- 登录方式切换标签 -->
      <div v-if="currentForm !== 'register'" class="login-tabs" :class="{ 'single-tab': !showUsernameLogin }">
        <button 
          class="login-tab" 
          :class="{ active: currentLoginType === 'phone' }"
          @click="switchLoginType('phone')"
        >
          手机号登录
        </button>
        <button 
          v-if="showUsernameLogin"
          class="login-tab" 
          :class="{ active: currentLoginType === 'username' }"
          @click="switchLoginType('username')"
        >
          用户名登录
        </button>
      </div>

      <!-- 手机号登录表单 -->
      <form v-if="currentForm === 'login' && currentLoginType === 'phone'" @submit.prevent="handlePhoneLogin">
        <div class="form-group">
          <label for="phone-number">手机号</label>
          <input 
            type="tel" 
            id="phone-number" 
            v-model="phoneForm.phone"
            placeholder="请输入手机号"
            maxlength="11"
            @input="handlePhoneInput"
          />
        </div>
        <div class="form-group">
          <label for="verification-code">验证码</label>
          <div class="verification-code-group">
            <div class="form-group">
              <input 
                type="text" 
                id="verification-code" 
                v-model="phoneForm.code"
                placeholder="请输入验证码"
                maxlength="6"
                @input="handleCodeInput"
              />
            </div>
            <button 
              type="button" 
              class="send-code-btn"
              :class="{ countdown: isCountingDown }"
              :disabled="isCountingDown || isSendingCode"
              @click="handleSendCode"
            >
              {{ sendCodeBtnText }}
            </button>
          </div>
        </div>
        <div v-if="phoneError" class="error-message show">{{ phoneError }}</div>
        <div v-if="phoneSuccess" class="success-message show">{{ phoneSuccess }}</div>
        <button type="submit" class="submit-btn" :disabled="isLoggingIn">
          <span v-if="isLoggingIn" class="loading"></span>
          {{ isLoggingIn ? '登录中...' : '登录' }}
        </button>
      </form>

      <!-- 用户名登录表单 -->
      <form v-if="currentForm === 'login' && currentLoginType === 'username'" @submit.prevent="handleUsernameLogin">
        <div class="form-group">
          <label for="login-username">用户名</label>
          <input 
            type="text" 
            id="login-username" 
            v-model="loginForm.username"
            placeholder="请输入用户名"
            @input="clearLoginError"
          />
        </div>
        <div class="form-group">
          <label for="login-password">密码</label>
          <input 
            type="password" 
            id="login-password" 
            v-model="loginForm.password"
            placeholder="请输入密码"
            @input="clearLoginError"
          />
        </div>
        <div v-if="loginError" class="error-message show">{{ loginError }}</div>
        <button type="submit" class="submit-btn" :disabled="isLoggingIn">
          <span v-if="isLoggingIn" class="loading"></span>
          {{ isLoggingIn ? '登录中...' : '登录' }}
        </button>
      </form>

      <!-- 注册表单 -->
      <form v-if="currentForm === 'register'" @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="register-username">用户名</label>
          <input 
            type="text" 
            id="register-username" 
            v-model="registerForm.username"
            placeholder="请输入用户名"
            @input="clearRegisterError"
          />
        </div>
        <div class="form-group">
          <label for="register-password">密码</label>
          <input 
            type="password" 
            id="register-password" 
            v-model="registerForm.password"
            placeholder="请输入密码"
            @input="clearRegisterError"
          />
        </div>
        <div class="form-group">
          <label for="register-confirm-password">确认密码</label>
          <input 
            type="password" 
            id="register-confirm-password" 
            v-model="registerForm.confirmPassword"
            placeholder="请再次输入密码"
            @input="clearRegisterError"
          />
        </div>
        <div v-if="registerError" class="error-message show">{{ registerError }}</div>
        <div v-if="registerSuccess" class="success-message show">{{ registerSuccess }}</div>
        <button type="submit" class="submit-btn" :disabled="isRegistering">
          <span v-if="isRegistering" class="loading"></span>
          {{ isRegistering ? '注册中...' : '注册' }}
        </button>
      </form>

      <!-- 表单切换 -->
      <div v-if="currentLoginType === 'username' || currentForm === 'register'" class="switch-form">
        <span>{{ currentForm === 'register' ? '已有账户？' : '没有账户？' }}</span>
        <a @click="toggleForm">{{ currentForm === 'register' ? '立即登录' : '立即注册' }}</a>
      </div>

      <!-- 温馨提示 -->
      <div class="device-notice">
        <p><strong>温馨提示：</strong>请使用电脑进行测试，并确保音响和麦克风设备正常工作。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useApi } from '@/composables/useApi'

const router = useRouter()
const authStore = useAuthStore()
const api = useApi()

// 是否显示用户名登录
const showUsernameLogin = import.meta.env.VITE_SHOW_USERNAME_LOGIN === 'true'

// 当前表单类型
const currentForm = ref('login') // 'login' | 'register'
const currentLoginType = ref('phone') // 'phone' | 'username'

// 表单数据
const phoneForm = ref({
  phone: '',
  code: ''
})

const loginForm = ref({
  username: '',
  password: ''
})

const registerForm = ref({
  username: '',
  password: '',
  confirmPassword: ''
})

// 状态
const isLoggingIn = ref(false)
const isRegistering = ref(false)
const isSendingCode = ref(false)

// 错误和成功消息
const phoneError = ref('')
const phoneSuccess = ref('')
const loginError = ref('')
const registerError = ref('')
const registerSuccess = ref('')

// 验证码倒计时
const countdownSeconds = ref(0)
let countdownTimer = null

// 计算属性
const formTitle = computed(() => {
  return currentForm.value === 'register' ? '用户注册' : '用户登录'
})

const isCountingDown = computed(() => countdownSeconds.value > 0)

const sendCodeBtnText = computed(() => {
  if (isSendingCode.value) return '发送中...'
  if (isCountingDown.value) return `${countdownSeconds.value}秒后重试`
  return '发送验证码'
})

// 方法
function switchLoginType(type) {
  currentLoginType.value = type
  clearAllErrors()
}

function toggleForm() {
  if (currentForm.value === 'register') {
    currentForm.value = 'login'
  } else {
    currentForm.value = 'register'
  }
  clearAllErrors()
}

function clearAllErrors() {
  phoneError.value = ''
  phoneSuccess.value = ''
  loginError.value = ''
  registerError.value = ''
  registerSuccess.value = ''
}

function clearLoginError() {
  loginError.value = ''
}

function clearRegisterError() {
  registerError.value = ''
}

function handlePhoneInput(e) {
  phoneForm.value.phone = e.target.value.replace(/\D/g, '')
  phoneError.value = ''
}

function handleCodeInput(e) {
  phoneForm.value.code = e.target.value.replace(/\D/g, '')
  phoneError.value = ''
}

function validatePhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone)
}

function startCountdown(seconds = 60) {
  countdownSeconds.value = seconds
  countdownTimer = setInterval(() => {
    countdownSeconds.value--
    if (countdownSeconds.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

async function handleSendCode() {
  const phone = phoneForm.value.phone.trim()
  
  if (!phone) {
    phoneError.value = '请输入手机号'
    return
  }
  
  if (!validatePhone(phone)) {
    phoneError.value = '请输入正确的手机号格式'
    return
  }
  
  isSendingCode.value = true
  phoneError.value = ''
  
  try {
    const response = await api.sendVerificationCode(phone)
    
    if (response.code === 0) {
      startCountdown(60)
      phoneSuccess.value = '验证码已发送，请查收短信'
      setTimeout(() => {
        phoneSuccess.value = ''
      }, 3000)
    } else {
      phoneError.value = response.exception || response.msg || '验证码发送失败，请稍后重试'
    }
  } catch (error) {
    console.error('发送验证码错误:', error)
    phoneError.value = error.message || '验证码发送失败，请稍后重试'
  } finally {
    isSendingCode.value = false
  }
}

async function handlePhoneLogin() {
  const phone = phoneForm.value.phone.trim()
  const code = phoneForm.value.code.trim()
  
  if (!phone) {
    phoneError.value = '请输入手机号'
    return
  }
  
  if (!validatePhone(phone)) {
    phoneError.value = '请输入正确的手机号格式'
    return
  }
  
  if (!code) {
    phoneError.value = '请输入验证码'
    return
  }
  
  if (code.length !== 4 && code.length !== 6) {
    phoneError.value = '验证码格式不正确'
    return
  }
  
  isLoggingIn.value = true
  phoneError.value = ''
  
  try {
    await authStore.login(phone, code)
    router.push('/prep')
  } catch (error) {
    console.error('手机号登录错误:', error)
    phoneError.value = error.message || '登录失败，请检查手机号和验证码'
  } finally {
    isLoggingIn.value = false
  }
}

async function handleUsernameLogin() {
  const username = loginForm.value.username.trim()
  const password = loginForm.value.password
  
  if (!username || !password) {
    loginError.value = '请输入用户名和密码'
    return
  }
  
  isLoggingIn.value = true
  loginError.value = ''
  
  try {
    await authStore.loginWithUsername(username, password)
    router.push('/prep')
  } catch (error) {
    console.error('用户名登录错误:', error)
    loginError.value = error.message || '登录失败，请检查用户名和密码'
  } finally {
    isLoggingIn.value = false
  }
}

async function handleRegister() {
  const { username, password, confirmPassword } = registerForm.value
  
  if (!username || !password || !confirmPassword) {
    registerError.value = '请填写所有字段'
    return
  }
  
  if (password !== confirmPassword) {
    registerError.value = '两次输入的密码不一致'
    return
  }
  
  if (password.length < 6) {
    registerError.value = '密码长度至少为6位'
    return
  }
  
  isRegistering.value = true
  registerError.value = ''
  
  try {
    const response = await api.register({ username, password })
    
    if (response.code === 0) {
      registerSuccess.value = '注册成功！正在登录...'
      
      if (response.data?.access_token) {
        authStore.setToken(response.data.access_token)
        authStore.setUserInfo({ username })
        await authStore.syncBasicInfo()
        
        setTimeout(() => {
          router.push('/test')
        }, 1000)
      } else {
        setTimeout(() => {
          currentForm.value = 'login'
          currentLoginType.value = 'username'
          loginForm.value.username = username
          registerSuccess.value = ''
        }, 2000)
      }
    } else {
      registerError.value = response.exception || response.msg || '注册失败，请稍后重试'
    }
  } catch (error) {
    console.error('注册错误:', error)
    registerError.value = error.message || '注册失败，请稍后重试'
  } finally {
    isRegistering.value = false
  }
}

// 生命周期
onMounted(() => {
  // 已登录则跳转
  if (authStore.isLoggedIn) {
    router.push('/test')
  }
})

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})
</script>

<style lang="less" scoped>
// 变量定义
@primary-color: #3b82f6;
@primary-hover: #2563eb;
@text-color: #1a1a1a;
@text-secondary: #999999;
@text-muted: #64748b;
@border-color: #e0e0e0;
@error-color: #ef4444;
@success-color: #10b981;
@bg-white: #ffffff;
@transition: all 0.2s ease;

// 页面容器
.login-page {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
  background: linear-gradient(to bottom, #f5f9ff 0%, #eef5ff 25%, #e6f0ff 50%, #deebff 75%, #d6e6ff 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  position: relative;
  overflow-x: hidden;
}

// 背景
.login-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.login-bg-gradient {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, #f5f9ff 0%, #eef5ff 20%, #e6f0ff 40%, #deebff 60%, #d6e6ff 80%, #d0e3ff 100%);

  &::after {
    content: "";
    position: absolute;
    top: 15%;
    right: 10%;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(245, 250, 255, 0.6) 0%, rgba(238, 245, 255, 0.4) 30%, transparent 65%);
    transform: translate(30%, -30%);
    border-radius: 50%;
    animation: glowPulse 12s ease-in-out infinite;
  }
}

@keyframes glowPulse {
  0%, 100% {
    opacity: 0.4;
    transform: translate(30%, -30%) scale(1);
  }
  50% {
    opacity: 0.6;
    transform: translate(30%, -30%) scale(1.05);
  }
}

.login-bg-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 1;
}

.organic-line {
  fill: none;
  stroke: rgba(180, 200, 230, 0.4);
  stroke-width: 1.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  animation: lineFade 10s ease-in-out infinite;

  &-2 {
    fill: none;
    stroke: rgba(180, 200, 230, 0.35);
    stroke-width: 1;
    stroke-linecap: round;
    stroke-linejoin: round;
    animation: lineFade 12s ease-in-out infinite;
    animation-delay: 2s;
  }
}

@keyframes lineFade {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.5; }
}

.decorative-dot {
  fill: rgba(150, 180, 220, 0.7);
  animation: dotTwinkle 4s ease-in-out infinite;

  &-2 {
    fill: rgba(150, 180, 220, 0.65);
    animation: dotTwinkle 5s ease-in-out infinite;
    animation-delay: 1.5s;
  }

  &-3 {
    fill: rgba(150, 180, 220, 0.6);
    animation: dotTwinkle 6s ease-in-out infinite;
    animation-delay: 3s;
  }
}

@keyframes dotTwinkle {
  0%, 100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 0.85;
    transform: scale(1.15);
  }
}

// 登录容器
.login-container {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 40px 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  max-width: 420px;
  width: 100%;
  animation: slideUp 0.5s ease-out;
  position: relative;
  z-index: 10;

  h1 {
    color: #1e293b;
    text-align: center;
    margin-bottom: 22px;
    font-size: 18px;
    font-weight: 500;
    letter-spacing: 0.03em;
    line-height: 1.4;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 登录方式标签
.login-tabs {
  display: flex;
  margin-bottom: 24px;
  border-bottom: 1px solid @border-color;

  &.single-tab {
    display: none;
  }
}

.login-tab {
  flex: 1;
  padding: 10px 20px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: @text-secondary;
  cursor: pointer;
  border: none;
  border-bottom: 2px solid transparent;
  transition: @transition;
  background: none;

  &:hover {
    color: @primary-color;
  }

  &.active {
    color: @text-color;
    border-bottom-color: @primary-color;
    font-weight: 600;
  }
}

// 表单样式
.form-group {
  margin-bottom: 18px;

  label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #333333;
    margin-bottom: 8px;
  }

  input {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid @border-color;
    border-radius: 8px;
    font-size: 14px;
    transition: @transition;
    background: @bg-white;
    color: @text-color;

    &::placeholder {
      color: @text-secondary;
    }

    &:focus {
      outline: none;
      border-color: @primary-color;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
  }
}

// 验证码组
.verification-code-group {
  display: flex;
  gap: 12px;
  align-items: flex-end;

  .form-group {
    flex: 1;
    margin-bottom: 0;
  }
}

.send-code-btn {
  padding: 12px 18px;
  background: @bg-white;
  color: @text-color;
  border: 1px solid @border-color;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: @transition;
  white-space: nowrap;
  min-width: 110px;

  &:hover:not(:disabled) {
    background: #f5f5f5;
    border-color: @primary-color;
    color: @primary-color;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.countdown {
    background: rgba(248, 250, 252, 0.9);
    color: #94a3b8;
    border-color: rgba(148, 163, 184, 0.2);
  }
}

// 提交按钮
.submit-btn {
  width: 100%;
  padding: 12px 24px;
  margin-top: 24px;
  background: @primary-color;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: @transition;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);

  &:hover:not(:disabled) {
    background: @primary-hover;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.loading {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid @bg-white;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// 错误和成功消息
.error-message {
  color: @error-color;
  font-size: 13px;
  margin-top: 8px;
  padding: 8px 0;
}

.success-message {
  color: @success-color;
  font-size: 13px;
  margin-top: 8px;
  text-align: center;
  padding: 12px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

// 表单切换
.switch-form {
  text-align: center;
  margin-top: 24px;
  font-size: 13px;
  color: @text-muted;

  a {
    color: #60a5fa;
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.2s ease;

    &:hover {
      color: @primary-color;
    }
  }
}

// 提示信息
.device-notice {
  margin-top: 20px;

  p {
    color: #666;
    font-size: 14px;
    line-height: 1.6;
  }
}

// 响应式
@media (max-width: 768px) {
  .login-container {
    padding: 36px 24px;
    border-radius: 20px;
  }
}
</style>
