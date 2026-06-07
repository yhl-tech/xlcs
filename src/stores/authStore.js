/**
 * 认证状态管理
 * 管理用户登录状态、Token 和用户信息
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { normalizeBasicInfoResponse } from '@/utils/basicInfo'

export const useAuthStore = defineStore('auth', () => {
  // ==================== 状态 ====================
  
  // Token
  const token = ref(localStorage.getItem('token') || null)
  
  // 用户信息
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || 'null'))
  
  // 登录加载状态
  const isLoggingIn = ref(false)
  
  // ==================== 计算属性 ====================
  
  // 是否已登录
  const isLoggedIn = computed(() => !!token.value)
  
  // 用户 ID
  const userId = computed(() => userInfo.value?.id || null)
  
  // 用户手机号
  const userPhone = computed(() => userInfo.value?.phone || null)
  
  // ==================== 方法 ====================
  
  /**
   * 设置 Token
   */
  function setToken(newToken) {
    token.value = newToken
    if (newToken) {
      localStorage.setItem('token', newToken)
    } else {
      localStorage.removeItem('token')
    }
  }
  
  /**
   * 从后端拉取用户基本信息并写入 testStore
   */
  async function syncBasicInfo() {
    const userId = userInfo.value?.username || userInfo.value?.phone
    if (!userId) return null

    const { useApi } = await import('@/composables/useApi')
    const { useTestStore } = await import('@/stores/testStore')
    const api = useApi()
    const testStore = useTestStore()

    try {
      const response = await api.getBasicInfo(userId)
      const basicInfo = normalizeBasicInfoResponse(response)
      if (basicInfo) {
        testStore.setBasicInfo(basicInfo)
        console.log('[Auth] 用户基本信息已同步:', basicInfo)
      }
      return basicInfo
    } catch (error) {
      console.warn('[Auth] 获取用户基本信息失败:', error)
      return null
    }
  }

  /**
   * 设置用户信息
   */
  function setUserInfo(info) {
    userInfo.value = info
    if (info) {
      localStorage.setItem('userInfo', JSON.stringify(info))
    } else {
      localStorage.removeItem('userInfo')
    }
  }
  
  /**
   * 手机号登录
   * @param {string} phone - 手机号
   * @param {string} verificationCode - 验证码
   */
  async function login(phone, verificationCode) {
    const { useApi } = await import('@/composables/useApi')
    const api = useApi()
    
    isLoggingIn.value = true
    try {
      const result = await api.phoneLogin(phone, verificationCode)
      
      // 后端响应格式: { code: 0, data: { access_token: "..." }, msg: "..." }
      if (result.code === 0 && result.data?.access_token) {
        setToken(result.data.access_token)
        setUserInfo({ phone, username: phone })
        await syncBasicInfo()
        return { success: true, data: result }
      } else {
        throw new Error(result.exception || result.msg || '登录失败')
      }
    } catch (error) {
      throw error
    } finally {
      isLoggingIn.value = false
    }
  }
  
  /**
   * 用户名密码登录（如果启用）
   * @param {string} username - 用户名
   * @param {string} password - 密码
   */
  async function loginWithUsername(username, password) {
    const { useApi } = await import('@/composables/useApi')
    const api = useApi()
    
    isLoggingIn.value = true
    try {
      const result = await api.usernameLogin(username, password)
      
      // 后端响应格式: { code: 0, data: { access_token: "..." }, msg: "..." }
      if (result.code === 0 && result.data?.access_token) {
        setToken(result.data.access_token)
        setUserInfo({ username })
        await syncBasicInfo()
        return { success: true, data: result }
      } else {
        throw new Error(result.exception || result.msg || '登录失败')
      }
    } catch (error) {
      throw error
    } finally {
      isLoggingIn.value = false
    }
  }
  
  /**
   * 登出
   */
  function logout() {
    setToken(null)
    setUserInfo(null)
  }
  
  /**
   * 检查 Token 是否有效
   */
  function checkTokenValidity() {
    // 简单检查：如果有 token 就认为有效
    // 实际应用中可能需要验证 token 过期时间或调用后端验证接口
    return !!token.value
  }
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    token,
    userInfo,
    isLoggingIn,
    
    // 计算属性
    isLoggedIn,
    userId,
    userPhone,
    
    // 方法
    setToken,
    setUserInfo,
    login,
    loginWithUsername,
    logout,
    checkTokenValidity,
    syncBasicInfo
  }
})
