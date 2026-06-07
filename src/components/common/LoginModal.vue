<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="login-modal-overlay">
        <div class="login-modal-container">
          <!-- 关闭按钮 -->
          <button class="modal-close" @click="close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <!-- 标题 -->
          <h2 class="modal-title">{{ formTitle }}</h2>

          <!-- 登录方式切换 -->
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
              <label for="modal-phone">手机号</label>
              <input
                type="tel"
                id="modal-phone"
                v-model="phoneForm.phone"
                placeholder="请输入手机号"
                maxlength="11"
                @input="handlePhoneInput"
              />
            </div>
            <div class="form-group">
              <label for="modal-code">验证码</label>
              <div class="verification-code-group">
                <input
                  type="text"
                  id="modal-code"
                  v-model="phoneForm.code"
                  placeholder="请输入验证码"
                  maxlength="6"
                  @input="handleCodeInput"
                />
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
            <div v-if="phoneError" class="error-message">{{ phoneError }}</div>
            <div v-if="phoneSuccess" class="success-message">{{ phoneSuccess }}</div>
            <button type="submit" class="submit-btn" :disabled="isLoggingIn">
              <span v-if="isLoggingIn" class="loading"></span>
              {{ isLoggingIn ? '登录中...' : '登录' }}
            </button>
          </form>

          <!-- 用户名登录表单 -->
          <form v-if="currentForm === 'login' && currentLoginType === 'username'" @submit.prevent="handleUsernameLogin">
            <div class="form-group">
              <label for="modal-username">用户名</label>
              <input
                type="text"
                id="modal-username"
                v-model="loginForm.username"
                placeholder="请输入用户名"
                @input="clearLoginError"
              />
            </div>
            <div class="form-group">
              <label for="modal-password">密码</label>
              <input
                type="password"
                id="modal-password"
                v-model="loginForm.password"
                placeholder="请输入密码"
                @input="clearLoginError"
              />
            </div>
            <div v-if="loginError" class="error-message">{{ loginError }}</div>
            <button type="submit" class="submit-btn" :disabled="isLoggingIn">
              <span v-if="isLoggingIn" class="loading"></span>
              {{ isLoggingIn ? '登录中...' : '登录' }}
            </button>
          </form>

          <!-- 注册表单 -->
          <form v-if="currentForm === 'register'" @submit.prevent="handleRegister">
            <div class="form-group">
              <label for="modal-reg-username">用户名</label>
              <input
                type="text"
                id="modal-reg-username"
                v-model="registerForm.username"
                placeholder="请输入用户名"
                @input="clearRegisterError"
              />
            </div>
            <div class="form-group">
              <label for="modal-reg-password">密码</label>
              <input
                type="password"
                id="modal-reg-password"
                v-model="registerForm.password"
                placeholder="请输入密码"
                @input="clearRegisterError"
              />
            </div>
            <div class="form-group">
              <label for="modal-reg-confirm">确认密码</label>
              <input
                type="password"
                id="modal-reg-confirm"
                v-model="registerForm.confirmPassword"
                placeholder="请再次输入密码"
                @input="clearRegisterError"
              />
            </div>
            <div v-if="registerError" class="error-message">{{ registerError }}</div>
            <div v-if="registerSuccess" class="success-message">{{ registerSuccess }}</div>
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
            <p>请使用电脑进行测试，确保音响和麦克风正常工作</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useApi } from '@/composables/useApi'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const router = useRouter()
const authStore = useAuthStore()
const api = useApi()

const showUsernameLogin = import.meta.env.VITE_SHOW_USERNAME_LOGIN === 'true'

const currentForm = ref('login')
const currentLoginType = ref('phone')

const phoneForm = ref({ phone: '', code: '' })
const loginForm = ref({ username: '', password: '' })
const registerForm = ref({ username: '', password: '', confirmPassword: '' })

const isLoggingIn = ref(false)
const isRegistering = ref(false)
const isSendingCode = ref(false)

const phoneError = ref('')
const phoneSuccess = ref('')
const loginError = ref('')
const registerError = ref('')
const registerSuccess = ref('')

const countdownSeconds = ref(0)
let countdownTimer = null

const formTitle = computed(() => currentForm.value === 'register' ? '用户注册' : '用户登录')
const isCountingDown = computed(() => countdownSeconds.value > 0)
const sendCodeBtnText = computed(() => {
  if (isSendingCode.value) return '发送中...'
  if (isCountingDown.value) return `${countdownSeconds.value}s`
  return '发送验证码'
})

function close() {
  emit('update:modelValue', false)
}

function switchLoginType(type) {
  currentLoginType.value = type
  clearAllErrors()
}

function toggleForm() {
  currentForm.value = currentForm.value === 'register' ? 'login' : 'register'
  clearAllErrors()
}

function clearAllErrors() {
  phoneError.value = ''
  phoneSuccess.value = ''
  loginError.value = ''
  registerError.value = ''
  registerSuccess.value = ''
}

function clearLoginError() { loginError.value = '' }
function clearRegisterError() { registerError.value = '' }

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
  if (!phone) { phoneError.value = '请输入手机号'; return }
  if (!validatePhone(phone)) { phoneError.value = '请输入正确的手机号格式'; return }

  isSendingCode.value = true
  phoneError.value = ''

  try {
    const response = await api.sendVerificationCode(phone)
    if (response.code === 0) {
      startCountdown(60)
      phoneSuccess.value = '验证码已发送'
      setTimeout(() => { phoneSuccess.value = '' }, 3000)
    } else {
      phoneError.value = response.exception || response.msg || '发送失败'
    }
  } catch (error) {
    phoneError.value = error.message || '发送失败'
  } finally {
    isSendingCode.value = false
  }
}

async function handlePhoneLogin() {
  const phone = phoneForm.value.phone.trim()
  const code = phoneForm.value.code.trim()

  if (!phone) { phoneError.value = '请输入手机号'; return }
  if (!validatePhone(phone)) { phoneError.value = '请输入正确的手机号格式'; return }
  if (!code) { phoneError.value = '请输入验证码'; return }
  if (code.length !== 4 && code.length !== 6) { phoneError.value = '验证码格式不正确'; return }

  isLoggingIn.value = true
  phoneError.value = ''

  try {
    await authStore.login(phone, code)
    emit('success')
    close()
    router.push('/prep')
  } catch (error) {
    phoneError.value = error.message || '登录失败'
  } finally {
    isLoggingIn.value = false
  }
}

async function handleUsernameLogin() {
  const username = loginForm.value.username.trim()
  const password = loginForm.value.password

  if (!username || !password) { loginError.value = '请输入用户名和密码'; return }

  isLoggingIn.value = true
  loginError.value = ''

  try {
    await authStore.loginWithUsername(username, password)
    emit('success')
    close()
    router.push('/prep')
  } catch (error) {
    loginError.value = error.message || '登录失败'
  } finally {
    isLoggingIn.value = false
  }
}

async function handleRegister() {
  const { username, password, confirmPassword } = registerForm.value

  if (!username || !password || !confirmPassword) { registerError.value = '请填写所有字段'; return }
  if (password !== confirmPassword) { registerError.value = '两次密码不一致'; return }
  if (password.length < 6) { registerError.value = '密码至少6位'; return }

  isRegistering.value = true
  registerError.value = ''

  try {
    const response = await api.register({ username, password })
    if (response.code === 0) {
      registerSuccess.value = '注册成功！'
      if (response.data?.access_token) {
        authStore.setToken(response.data.access_token)
        authStore.setUserInfo({ username })
        await authStore.syncBasicInfo()
        setTimeout(() => {
          emit('success')
          close()
          router.push('/prep')
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
      registerError.value = response.exception || response.msg || '注册失败'
    }
  } catch (error) {
    registerError.value = error.message || '注册失败'
  } finally {
    isRegistering.value = false
  }
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style lang="less" scoped>
@brand-cyan: #00f2ea;
@brand-purple: #ff0080;

.login-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.login-modal-container {
  position: relative;
  background: linear-gradient(145deg, rgba(20, 20, 40, 0.95), rgba(10, 10, 25, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 242, 234, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }
}

.modal-title {
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  color: white;
  margin-bottom: 24px;
  letter-spacing: 0.05em;
}

.login-tabs {
  display: flex;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  &.single-tab { display: none; }
}

.login-tab {
  flex: 1;
  padding: 12px;
  text-align: center;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  transition: all 0.2s;

  &:hover { color: rgba(255, 255, 255, 0.8); }
  &.active {
    color: @brand-cyan;
    border-bottom-color: @brand-cyan;
  }
}

.form-group {
  margin-bottom: 18px;

  label {
    display: block;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 8px;
  }

  input {
    width: 100%;
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-size: 14px;
    color: white;
    transition: border-color 0.2s, box-shadow 0.2s;

    &:-webkit-autofill,
    &:-webkit-autofill:hover,
    &:-webkit-autofill:focus {
      -webkit-box-shadow: 0 0 0 1000px rgba(20, 20, 40, 0.95) inset !important;
      -webkit-text-fill-color: white !important;
      transition: background-color 5000s ease-in-out 0s;
    }

    &::placeholder { color: rgba(255, 255, 255, 0.3); }
    &:focus {
      outline: none;
      border-color: @brand-cyan;
      box-shadow: 0 0 0 3px rgba(0, 242, 234, 0.1);
    }
  }
}

.verification-code-group {
  display: flex;
  gap: 12px;

  input { flex: 1; }
}

.send-code-btn {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  white-space: nowrap;
  min-width: 100px;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    border-color: @brand-cyan;
    color: @brand-cyan;
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &.countdown { color: rgba(255, 255, 255, 0.4); }
}

.submit-btn {
  width: 100%;
  padding: 14px;
  margin-top: 24px;
  background: @brand-cyan;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 0 20px rgba(0, 242, 234, 0.3);

  &:hover:not(:disabled) {
    background: white;
    box-shadow: 0 0 30px rgba(255, 255, 255, 0.4);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.loading {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}

@keyframes spin { to { transform: rotate(360deg); } }

.error-message {
  color: @brand-purple;
  font-size: 13px;
  margin-top: 8px;
}

.success-message {
  color: #10b981;
  font-size: 13px;
  margin-top: 8px;
  text-align: center;
  padding: 10px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.switch-form {
  text-align: center;
  margin-top: 20px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);

  a {
    color: @brand-cyan;
    cursor: pointer;
    margin-left: 4px;
    &:hover { text-decoration: underline; }
  }
}

.device-notice {
  margin-top: 20px;
  text-align: center;

  p {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    line-height: 1.5;
  }
}

// 过渡动画
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .login-modal-container,
.modal-leave-active .login-modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .login-modal-container,
.modal-leave-to .login-modal-container {
  transform: scale(0.95) translateY(-20px);
}
</style>
