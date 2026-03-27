/**
 * 会话管理
 * 处理测试会话的保存、恢复、持久化
 */
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useTestStore } from '@/stores/testStore'
import { useSessionStore } from '@/stores/sessionStore'

// 存储版本号
const STORAGE_VERSION = '1.0'

// 自动保存间隔（毫秒）
const AUTO_SAVE_INTERVAL = 30000

export function useSession() {
  const authStore = useAuthStore()
  const testStore = useTestStore()
  const sessionStore = useSessionStore()
  
  // ==================== 状态 ====================
  
  // 自动保存定时器
  let autoSaveTimer = null
  
  // 是否已初始化
  const isInitialized = ref(false)
  
  // 上次保存时间
  const lastSaveTime = ref(null)
  
  // ==================== 计算属性 ====================
  
  // 存储键名
  const storageKey = computed(() => {
    if (!authStore.userId) return null
    return `xlcs_session_${authStore.userId}`
  })
  
  // 是否有待恢复的会话
  const hasPendingSession = computed(() => {
    return sessionStore.hasPendingSession
  })
  
  // ==================== 方法 ====================
  
  /**
   * 初始化会话管理
   */
  function init() {
    if (isInitialized.value) return
    
    // 检查是否有待恢复的会话
    const pendingSession = checkPendingSession()
    
    // 启动自动保存
    startAutoSave()
    
    isInitialized.value = true
    
    return pendingSession
  }
  
  /**
   * 保存会话快照
   * @param {string} reason - 保存原因
   */
  function saveSnapshot(reason = 'manual') {
    if (!storageKey.value) {
      console.warn('[useSession] 无法保存：用户未登录')
      return false
    }
    
    try {
      const snapshot = {
        version: STORAGE_VERSION,
        savedAt: Date.now(),
        reason,
        userId: authStore.userId,
        
        // 测试状态
        sessionId: testStore.sessionId,
        phase: testStore.phase,
        currentPlate: testStore.currentPlate,
        basicInfo: { ...testStore.basicInfo },
        interactionData: JSON.parse(JSON.stringify(testStore.interactionData)),
        postTestAnswers: { ...testStore.postTestAnswers },
        dialogHistory: [...testStore.dialogHistory],
        hasUsedZoom: testStore.hasUsedZoom,
        plateStartTimes: { ...testStore.plateStartTimes }
      }
      
      localStorage.setItem(storageKey.value, JSON.stringify(snapshot))
      lastSaveTime.value = Date.now()
      sessionStore.hasPendingSession = true
      
      console.log(`[useSession] 快照已保存 (${reason})`)
      return true
    } catch (error) {
      console.error('[useSession] 保存快照失败:', error)
      return false
    }
  }
  
  /**
   * 加载会话快照
   */
  function loadSnapshot() {
    if (!storageKey.value) return null
    
    try {
      const data = localStorage.getItem(storageKey.value)
      if (!data) return null
      
      const snapshot = JSON.parse(data)
      
      // 检查版本兼容性
      if (snapshot.version !== STORAGE_VERSION) {
        console.warn('[useSession] 快照版本不匹配')
        clearSnapshot()
        return null
      }
      
      // 检查用户匹配
      if (snapshot.userId !== authStore.userId) {
        console.warn('[useSession] 用户不匹配')
        return null
      }
      
      return snapshot
    } catch (error) {
      console.error('[useSession] 加载快照失败:', error)
      return null
    }
  }
  
  /**
   * 恢复会话
   */
  function restoreSession() {
    const snapshot = loadSnapshot()
    if (!snapshot) return false
    
    try {
      // 恢复测试状态
      testStore.sessionId = snapshot.sessionId
      testStore.phase = snapshot.phase
      testStore.currentPlate = snapshot.currentPlate
      testStore.basicInfo = snapshot.basicInfo || { sex: '', age: '', education: '', occupation: '', mood: '' }
      testStore.interactionData = snapshot.interactionData || { zoom: {}, rotate: {}, drawingTracks: {}, timestamps: {} }
      testStore.postTestAnswers = snapshot.postTestAnswers || {}
      testStore.dialogHistory = snapshot.dialogHistory || []
      testStore.hasUsedZoom = snapshot.hasUsedZoom || false
      testStore.plateStartTimes = snapshot.plateStartTimes || {}
      
      console.log('[useSession] 会话已恢复')
      return true
    } catch (error) {
      console.error('[useSession] 恢复会话失败:', error)
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
    sessionStore.hasPendingSession = false
    lastSaveTime.value = null
    console.log('[useSession] 快照已清除')
  }
  
  /**
   * 检查是否有待恢复的会话
   */
  function checkPendingSession() {
    const snapshot = loadSnapshot()
    if (snapshot) {
      sessionStore.hasPendingSession = true
      return snapshot
    }
    sessionStore.hasPendingSession = false
    return null
  }
  
  /**
   * 标记会话完成
   * 只重置 phase 和 currentPlate，保留其他数据用于词云展示等
   * 其他数据会在用户登出时清空
   */
  function markCompleted() {
    clearSnapshot()
    // 只重置测试阶段和当前图版，保留对话历史等数据
    testStore.phase = 'info'
    testStore.currentPlate = 0
  }
  
  /**
   * 启动自动保存
   */
  function startAutoSave() {
    if (autoSaveTimer) return
    
    autoSaveTimer = setInterval(() => {
      // 只在测试进行中自动保存，上传和等待阶段不保存（避免刷新后误恢复到上传阶段）
      if (testStore.phase !== 'info' && testStore.phase !== 'uploading' && testStore.phase !== 'waiting') {
        saveSnapshot('auto')
      }
    }, AUTO_SAVE_INTERVAL)
  }
  
  /**
   * 停止自动保存
   */
  function stopAutoSave() {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
    }
  }
  
  /**
   * 销毁
   */
  function destroy() {
    stopAutoSave()
    isInitialized.value = false
  }
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    isInitialized,
    lastSaveTime,
    hasPendingSession,
    
    // 方法
    init,
    saveSnapshot,
    loadSnapshot,
    restoreSession,
    clearSnapshot,
    checkPendingSession,
    markCompleted,
    startAutoSave,
    stopAutoSave,
    destroy
  }
}

export default useSession
