/**
 * 测试流程状态管理
 * 管理测试阶段、图版状态、交互数据等
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

// localStorage key
const STORAGE_KEY = 'xlcs_test_data'

// 从 localStorage 加载数据
function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.warn('[TestStore] 加载本地数据失败:', e)
  }
  return null
}

// 保存数据到 localStorage
function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('[TestStore] 保存本地数据失败:', e)
  }
}

// 清除 localStorage 数据
function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.warn('[TestStore] 清除本地数据失败:', e)
  }
}

export const useTestStore = defineStore('test', () => {
  // ==================== 常量 ====================
  
  const TOTAL_PLATES = 10
  
  // 测试阶段枚举
  const PHASES = {
    INFO: 'info',           // 基本信息填写
    INTRO: 'intro',         // 介绍预览
    OPERATION_TEST: 'operationTest', // 操作反应测试
    TEST: 'test',           // 正式测试
    POST_TEST: 'postTest',  // 后测问卷
    UPLOADING: 'uploading', // 上传文件
    WAITING: 'waiting'      // 等待报告
  }
  
  // 从 localStorage 加载已保存的数据
  const savedData = loadFromStorage()
  
  // ==================== 状态 ====================
  
  // 当前测试阶段（不持久化）
  const phase = ref(PHASES.INFO)

  // 后测音频 MP3 Blob（不持久化，由 TestView 存入，UploadingView 取出上传）
  let postTestAudioBlob = null
  
  // 当前图版索引（0-9）（不持久化）
  const currentPlate = ref(0)
  
  // 总图版数
  const totalPlates = ref(TOTAL_PLATES)
  
  // 基本信息
  const basicInfo = ref(savedData?.basicInfo || {
    sex: '',
    age: '',
    education: '',
    occupation: '',
    mood: ''
  })
  
  // 交互数据
  const interactionData = ref(savedData?.interactionData || {
    zoom: {},           // { "0": [1, -1, 1], "1": [1] }
    rotate: {},         // { "0": [15, -15], "1": [30] }
    drawingTracks: {},  // { "0": {...}, "1": {...} }
    timestamps: {}      // { "0": { start: 0, end: 100 }, ... }
  })
  
  // 后测问卷答案
  const postTestAnswers = ref(savedData?.postTestAnswers || {
    representSelf: null,      // 代表自己的图版
    representFather: null,    // 代表父亲的图版
    representMother: null,    // 代表母亲的图版
    mostLiked: null,          // 最喜欢的图版
    mostDisliked: null        // 最讨厌的图版
  })
  
  // 对话历史
  const dialogHistory = ref(savedData?.dialogHistory || [])
  
  // 会话 ID
  const sessionId = ref(savedData?.sessionId || null)
  
  // 是否已使用过缩放（用于平移功能判断）
  const hasUsedZoom = ref(savedData?.hasUsedZoom || false)
  
  // 每个图版的开始时间
  const plateStartTimes = ref(savedData?.plateStartTimes || {})
  
  // 报告状态
  const reportStatus = ref(savedData?.reportStatus || {
    status: '',
    isReady: false,
    message: ''
  })
  
  // 初始状态检查是否完成（用于防止页面刷新时的时序问题）
  const initialCheckComplete = ref(false)
  
  // ==================== 能量系统 ====================
  
  const MAX_ENERGY = 1000 // 最大能量值
  const ENERGY_PER_STROKE = 2 // 每次绘画增加的能量
  const ENERGY_PER_PARTICLE = 5 // 批量粒子每个增加的能量
  
  // 当前能量值
  const energy = ref(savedData?.energy || 0)
  
  // 当前页面的能量上限（第N页 = N * 100）
  const maxEnergyForCurrentPage = computed(() => {
    return (currentPlate.value + 1) * 100
  })
  
  // 能量百分比（用于显示）
  const energyProgress = computed(() => {
    return Math.round((energy.value / MAX_ENERGY) * 100)
  })
  
  // ==================== 持久化 ====================
  
  // 监听状态变化并保存到 localStorage
  function persistState() {
    saveToStorage({
      basicInfo: basicInfo.value,
      interactionData: interactionData.value,
      postTestAnswers: postTestAnswers.value,
      dialogHistory: dialogHistory.value,
      sessionId: sessionId.value,
      hasUsedZoom: hasUsedZoom.value,
      plateStartTimes: plateStartTimes.value,
      reportStatus: reportStatus.value,
      energy: energy.value
    })
  }
  
  // 监听关键状态变化（不包含 phase 和 currentPlate）
  watch([basicInfo, interactionData, postTestAnswers, dialogHistory, sessionId, reportStatus, energy], persistState, { deep: true })
  
  // ==================== 计算属性 ====================
  
  // 测试进度百分比
  const progress = computed(() => {
    return Math.round((currentPlate.value / totalPlates.value) * 100)
  })
  
  // 是否完成所有图版
  const isTestComplete = computed(() => {
    return currentPlate.value >= totalPlates.value
  })
  
  // 当前图版编号（1-10，用于显示）
  const currentPlateNumber = computed(() => {
    return currentPlate.value + 1
  })
  
  // 当前图版图片路径
  const currentImageSrc = computed(() => {
    return `${import.meta.env.BASE_URL}images/rorschach-blot-${currentPlateNumber.value}.webp`
  })
  
  // ==================== 方法 ====================
  
  /**
   * 设置测试阶段
   */
  function setPhase(newPhase) {
    phase.value = newPhase
  }
  
  /**
   * 设置报告状态
   */
  function setReportStatus(status) {
    reportStatus.value = {
      ...reportStatus.value,
      ...status
    }
  }
  
  /**
   * 下一张图版
   */
  function nextPlate() {
    if (currentPlate.value < totalPlates.value) {
      // 记录当前图版结束时间
      const plateIndex = currentPlate.value
      if (plateStartTimes.value[plateIndex]) {
        if (!interactionData.value.timestamps[plateIndex]) {
          interactionData.value.timestamps[plateIndex] = {}
        }
        interactionData.value.timestamps[plateIndex].end = Date.now()
      }
      
      currentPlate.value++
      
      // 记录新图版开始时间
      if (currentPlate.value < totalPlates.value) {
        plateStartTimes.value[currentPlate.value] = Date.now()
        interactionData.value.timestamps[currentPlate.value] = {
          start: Date.now()
        }
      }
    }
  }
  
  /**
   * 上一张图版
   */
  function previousPlate() {
    if (currentPlate.value > 0) {
      currentPlate.value--
    }
  }
  
  /**
   * 跳转到指定图版
   */
  function goToPlate(index) {
    if (index >= 0 && index < totalPlates.value) {
      currentPlate.value = index
    }
  }
  
  /**
   * 记录交互数据
   * @param {string} type - 交互类型 (zoom, rotate, drawingTracks)
   * @param {number} plateIndex - 图版索引
   * @param {any} data - 交互数据
   */
  function recordInteraction(type, plateIndex, data) {
    if (!interactionData.value[type]) {
      interactionData.value[type] = {}
    }
    if (!interactionData.value[type][plateIndex]) {
      interactionData.value[type][plateIndex] = []
    }
    
    if (type === 'drawingTracks') {
      // 绘图轨迹直接覆盖
      interactionData.value[type][plateIndex] = data
    } else {
      // 缩放和旋转追加到数组
      interactionData.value[type][plateIndex].push(data)
    }
    
    // 标记已使用缩放
    if (type === 'zoom') {
      hasUsedZoom.value = true
    }
  }
  
  /**
   * 添加对话记录
   * @param {object} entry - 对话条目对象 { speaker: 'user'|'assistant', text: '...' }
   */
  function addDialogEntry(entry) {
    dialogHistory.value.push({
      speaker: entry.speaker || 'user',
      text: entry.text || '',
      timestamp: Date.now(),
      plateIndex: currentPlate.value
    })
  }
  
  /**
   * 设置基本信息
   */
  function setBasicInfo(info) {
    basicInfo.value = { ...basicInfo.value, ...info }
  }
  
  /**
   * 设置后测答案
   */
  function setPostTestAnswer(question, answer) {
    postTestAnswers.value[question] = answer
  }
  
  /**
   * 开始测试（初始化）
   */
  function startTest() {
    // 生成会话 ID
    sessionId.value = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // 记录第一张图版开始时间
    plateStartTimes.value[0] = Date.now()
    interactionData.value.timestamps[0] = { start: Date.now() }
    
    // 切换到测试阶段
    phase.value = PHASES.TEST
  }
  
  /**
   * 增加能量
   * @param {number} amount - 增加的能量值，默认为 ENERGY_PER_STROKE
   */
  function addEnergy(amount = ENERGY_PER_STROKE) {
    // 限制能量不超过当前页面的上限和总上限
    energy.value = Math.min(
      energy.value + amount, 
      maxEnergyForCurrentPage.value, 
      MAX_ENERGY
    )
  }
  
  /**
   * 减少能量
   * @param {number} amount - 减少的能量值
   */
  function removeEnergy(amount = ENERGY_PER_STROKE) {
    energy.value = Math.max(energy.value - amount, 0)
  }
  
  /**
   * 重置能量
   */
  function resetEnergy() {
    energy.value = 0
  }
  
  /**
   * 设置能量值（用于恢复状态）
   * @param {number} value - 能量值
   */
  function setEnergy(value) {
    energy.value = Math.min(Math.max(0, value), MAX_ENERGY)
  }
  
  /**
   * 重置测试状态
   */
  function resetTest() {
    phase.value = PHASES.INFO
    currentPlate.value = 0
    basicInfo.value = { sex: '', age: '', education: '', occupation: '', mood: '' }
    interactionData.value = { zoom: {}, rotate: {}, drawingTracks: {}, timestamps: {} }
    postTestAnswers.value = {
      representSelf: null,
      representFather: null,
      representMother: null,
      mostLiked: null,
      mostDisliked: null
    }
    dialogHistory.value = []
    sessionId.value = null
    hasUsedZoom.value = false
    plateStartTimes.value = {}
    reportStatus.value = { status: '', isReady: false, message: '' }
    initialCheckComplete.value = false
    energy.value = 0
    
    // 清除 localStorage 数据
    clearStorage()
  }
  
  /**
   * 标记已使用缩放
   */
  function markZoomUsed() {
    hasUsedZoom.value = true
  }
  
  /**
   * 标记初始状态检查已完成
   */
  function setInitialCheckComplete(value = true) {
    initialCheckComplete.value = value
  }
  
  /**
   * 获取提交数据
   */
  function getSubmitData() {
    return {
      sessionId: sessionId.value,
      basicInfo: basicInfo.value,
      interactionData: interactionData.value,
      postTestAnswers: postTestAnswers.value,
      dialogHistory: dialogHistory.value,
      completedAt: Date.now()
    }
  }
  
  // ==================== 返回 ====================
  
  return {
    // 常量
    PHASES,
    TOTAL_PLATES,
    MAX_ENERGY,
    ENERGY_PER_STROKE,
    ENERGY_PER_PARTICLE,
    
    // 状态
    phase,
    currentPlate,
    totalPlates,
    basicInfo,
    interactionData,
    postTestAnswers,
    dialogHistory,
    sessionId,
    hasUsedZoom,
    plateStartTimes,
    reportStatus,
    initialCheckComplete,
    energy,
    
    // 计算属性
    progress,
    isTestComplete,
    currentPlateNumber,
    currentImageSrc,
    maxEnergyForCurrentPage,
    energyProgress,
    
    // 方法
    setPhase,
    setReportStatus,
    nextPlate,
    previousPlate,
    goToPlate,
    recordInteraction,
    addDialogEntry,
    setBasicInfo,
    setPostTestAnswer,
    startTest,
    resetTest,
    markZoomUsed,
    getSubmitData,
    setInitialCheckComplete,
    addEnergy,
    removeEnergy,
    resetEnergy,
    setEnergy,

    // 后测音频
    setPostTestAudioBlob: (blob) => { postTestAudioBlob = blob },
    getPostTestAudioBlob: () => postTestAudioBlob
  }
})
