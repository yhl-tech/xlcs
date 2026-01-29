/**
 * 会话状态管理
 * 管理会话持久化、快照保存和恢复
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './authStore'
import { useTestStore } from './testStore'

// 存储版本号，用于数据迁移
const STORAGE_VERSION = '1.0'

export const useSessionStore = defineStore('session', () => {
  // ==================== 状态 ====================
  
  // 当前会话 ID
  const sessionId = ref(null)
  
  // 是否有未完成的会话
  const hasPendingSession = ref(false)
  
  // 上次保存时间
  const lastSavedAt = ref(null)
  
  // ==================== 计算属性 ====================
  
  // 存储键名
  const storageKey = computed(() => {
    const authStore = useAuthStore()
    if (!authStore.userId) return null
    return `xlcs_session_${authStore.userId}`
  })
  
  // ==================== 方法 ====================
  
  /**
   * 生成新的会话 ID
   */
  function generateSessionId() {
    sessionId.value = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return sessionId.value
  }
  
  /**
   * 保存会话快照
   */
  function saveSnapshot(reason = 'auto') {
    const authStore = useAuthStore()
    const testStore = useTestStore()
    
    if (!storageKey.value) {
      console.warn('[SessionStore] 无法保存快照：用户未登录')
      return false
    }
    
    try {
      const snapshot = {
        version: STORAGE_VERSION,
        savedAt: Date.now(),
        reason,
        sessionId: sessionId.value || testStore.sessionId,
        userId: authStore.userId,
        
        // 测试状态
        phase: testStore.phase,
        currentPlate: testStore.currentPlate,
        basicInfo: testStore.basicInfo,
        interactionData: testStore.interactionData,
        postTestAnswers: testStore.postTestAnswers,
        dialogHistory: testStore.dialogHistory,
        hasUsedZoom: testStore.hasUsedZoom,
        plateStartTimes: testStore.plateStartTimes
      }
      
      localStorage.setItem(storageKey.value, JSON.stringify(snapshot))
      lastSavedAt.value = Date.now()
      hasPendingSession.value = true
      
      console.log(`[SessionStore] 快照已保存 (${reason})`)
      return true
    } catch (error) {
      console.error('[SessionStore] 保存快照失败:', error)
      return false
    }
  }
  
  /**
   * 加载会话快照
   */
  function loadSnapshot() {
    if (!storageKey.value) {
      return null
    }
    
    try {
      const data = localStorage.getItem(storageKey.value)
      if (!data) {
        return null
      }
      
      const snapshot = JSON.parse(data)
      
      // 检查版本兼容性
      if (snapshot.version !== STORAGE_VERSION) {
        console.warn('[SessionStore] 快照版本不匹配，将清除旧数据')
        clearSnapshot()
        return null
      }
      
      return snapshot
    } catch (error) {
      console.error('[SessionStore] 加载快照失败:', error)
      return null
    }
  }
  
  /**
   * 恢复会话
   */
  function restoreSession() {
    const snapshot = loadSnapshot()
    if (!snapshot) {
      return false
    }
    
    const testStore = useTestStore()
    
    try {
      // 恢复会话 ID
      sessionId.value = snapshot.sessionId
      
      // 恢复测试状态
      testStore.phase = snapshot.phase
      testStore.currentPlate = snapshot.currentPlate
      testStore.basicInfo = snapshot.basicInfo
      testStore.interactionData = snapshot.interactionData
      testStore.postTestAnswers = snapshot.postTestAnswers
      testStore.dialogHistory = snapshot.dialogHistory || []
      testStore.hasUsedZoom = snapshot.hasUsedZoom || false
      testStore.plateStartTimes = snapshot.plateStartTimes || {}
      testStore.sessionId = snapshot.sessionId
      
      console.log('[SessionStore] 会话已恢复')
      return true
    } catch (error) {
      console.error('[SessionStore] 恢复会话失败:', error)
      return false
    }
  }
  
  /**
   * 清除会话快照
   */
  function clearSnapshot() {
    if (storageKey.value) {
      localStorage.removeItem(storageKey.value)
    }
    sessionId.value = null
    hasPendingSession.value = false
    lastSavedAt.value = null
    console.log('[SessionStore] 快照已清除')
  }
  
  /**
   * 检查是否有待恢复的会话
   */
  function checkPendingSession() {
    const snapshot = loadSnapshot()
    if (snapshot) {
      hasPendingSession.value = true
      return snapshot
    }
    hasPendingSession.value = false
    return null
  }
  
  /**
   * 标记会话完成
   */
  function markCompleted() {
    // 可以选择保留完成记录或直接清除
    clearSnapshot()
  }
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    sessionId,
    hasPendingSession,
    lastSavedAt,
    
    // 计算属性
    storageKey,
    
    // 方法
    generateSessionId,
    saveSnapshot,
    loadSnapshot,
    restoreSession,
    clearSnapshot,
    checkPendingSession,
    markCompleted
  }
})
