/**
 * 交互追踪
 * 记录用户的缩放、旋转、绘画等交互数据
 * 参考原始 script/interactionTracker.js 实现
 */
import { ref, reactive } from 'vue'

export function useInteractionTracker() {
  // ==================== 核心数据结构 ====================
  
  // 交互数据 - 与原始格式完全一致
  const data = reactive({
    zoom: {},           // 放大缩小操作: { "1": [1, 1, -1], "2": [], ... }
    rotate: {},         // 旋转操作: { "1": [30, -30], "2": [], ... }
    navigation: {},     // 导航操作: { "1": ["prev"], "2": ["next"], ... }
    drawingTracks: {}   // 画笔轨迹: { "1": { "0": [{"coords": [y,x,y,x], "color": "red", "time": "00:07"}] }, ... }
  })
  
  // 时间戳追踪 - 记录每个图版的起始时间
  const timestamps = reactive({
    start: null,     // 测试开始时间
    plates: {},      // 图版时间戳: { "1": timestamp, "2": timestamp, ... }
    select: null,    // 进入选择阶段时间
    stop: null       // 测试结束时间
  })
  
  // 当前绘制的轨迹状态
  const currentTrack = ref(null)         // 当前轨迹的线段数组
  const currentTrackStartTime = ref(null) // 当前轨迹开始时间
  const currentTrackPlateKey = ref(null)  // 当前轨迹所属的图版键
  const currentTrackColor = ref(null)     // 当前轨迹的颜色
  const lastDrawingPoint = ref(null)      // 上一个绘制点 { x, y }
  const strokeCountByPlate = reactive({}) // 每个图版的笔画计数 { "1": 0, "2": 1, ... }
  
  // 状态管理
  const status = ref('idle') // 'idle' | 'active' | 'paused' | 'stopped'
  const testStartTime = ref(null)
  const currentPlateIndex = ref(null)
  const isTracking = ref(false)
  
  // ==================== 初始化 ====================
  
  /**
   * 初始化数据结构 - 为10个图版创建空数组
   */
  function initializeDataStructure() {
    for (let i = 1; i <= 10; i++) {
      const plateKey = String(i)
      data.zoom[plateKey] = []
      data.rotate[plateKey] = []
      data.navigation[plateKey] = []
      data.drawingTracks[plateKey] = 0 // 初始化为0
    }
  }
  
  // 初始化
  initializeDataStructure()
  
  // ==================== 工具方法 ====================
  
  /**
   * 获取当前图版的键（字符串格式 "1"-"10"）
   */
  function getCurrentPlateKey() {
    const index = currentPlateIndex.value ?? 0
    return String(index + 1)
  }
  
  /**
   * 格式化时间为 "MM:SS" 格式（相对于测试开始时间）
   */
  function formatTimestamp(timestamp) {
    if (!testStartTime.value || !timestamp) return '00:00'
    const elapsed = Math.floor((timestamp - testStartTime.value) / 1000)
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  
  /**
   * 获取画笔轨迹的相对时间戳
   */
  function getDrawingTimestamp() {
    if (!testStartTime.value) return '00:00'
    const now = Date.now()
    const elapsed = Math.floor((now - testStartTime.value) / 1000)
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  
  /**
   * 格式化绝对时间戳
   */
  function formatAbsoluteTimestamp(timestamp) {
    if (!timestamp) return null
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
  
  // ==================== 追踪控制 ====================
  
  /**
   * 开始追踪某个图版
   */
  function startTracking(plateIndex) {
    // 如果有未完成的轨迹，先结束它
    if (currentTrack.value) {
      trackDrawingEnd()
    }
    
    isTracking.value = true
    currentPlateIndex.value = plateIndex
    
    // 如果是第一次开始，记录测试开始时间
    if (!testStartTime.value) {
      testStartTime.value = Date.now()
      timestamps.start = testStartTime.value
      status.value = 'active'
    }
    
    const plateKey = String(plateIndex + 1)
    
    // 记录图版切换时间戳（首次访问）
    if (!timestamps.plates[plateKey]) {
      timestamps.plates[plateKey] = Date.now()
    }
    
    console.log('[InteractionTracker] 开始追踪图版:', plateKey)
  }
  
  /**
   * 结束追踪某个图版
   */
  function stopTracking(plateIndex) {
    // 如果有未完成的轨迹，先结束它
    if (currentTrack.value) {
      trackDrawingEnd()
    }
    
    isTracking.value = false
    
    const plateKey = String(plateIndex + 1)
    console.log('[InteractionTracker] 结束追踪图版:', plateKey)
    
    // 打印该图版的数据
    printPlateData(plateIndex)
  }
  
  /**
   * 记录进入选择阶段的时间
   */
  function recordSelectPhase() {
    if (!timestamps.select && testStartTime.value) {
      timestamps.select = Date.now()
    }
  }
  
  /**
   * 停止追踪
   */
  function stop() {
    if (currentTrack.value) {
      trackDrawingEnd()
    }
    status.value = 'stopped'
    timestamps.stop = Date.now()
    isTracking.value = false
  }
  
  // ==================== 缩放/旋转追踪 ====================
  
  /**
   * 记录缩放操作
   * @param {number} plateIndex - 图版索引（0-9）
   * @param {number} direction - 1表示放大，-1表示缩小
   */
  function trackZoom(plateIndex, direction) {
    if (status.value !== 'active') return
    
    const plateKey = String(plateIndex + 1)
    
    if (!data.zoom[plateKey]) {
      data.zoom[plateKey] = []
    }
    
    data.zoom[plateKey].push(direction)
    
    console.log('[InteractionTracker] 记录缩放:', { plateKey, direction, data: data.zoom[plateKey] })
  }
  
  /**
   * 记录旋转操作
   * @param {number} plateIndex - 图版索引（0-9）
   * @param {number} angle - 旋转角度
   */
  function trackRotate(plateIndex, angle) {
    if (status.value !== 'active') return
    
    const plateKey = String(plateIndex + 1)
    
    if (!data.rotate[plateKey]) {
      data.rotate[plateKey] = []
    }
    
    data.rotate[plateKey].push(angle)
    
    console.log('[InteractionTracker] 记录旋转:', { plateKey, angle, data: data.rotate[plateKey] })
  }
  
  // ==================== 画笔轨迹追踪 ====================
  
  /**
   * 开始追踪画笔轨迹
   * @param {number} x - 起始x坐标
   * @param {number} y - 起始y坐标
   * @param {string} color - 画笔颜色
   */
  function trackDrawingStart(x, y, color = 'red') {
    if (status.value !== 'active') return
    
    const plateKey = getCurrentPlateKey()
    
    currentTrack.value = []
    currentTrackStartTime.value = Date.now()
    currentTrackPlateKey.value = plateKey
    currentTrackColor.value = color
    lastDrawingPoint.value = { x, y }
  }
  
  /**
   * 记录画笔轨迹中的点（线段格式）
   * @param {number} x - x坐标
   * @param {number} y - y坐标
   */
  function trackDrawingPoint(x, y) {
    if (status.value !== 'active' || !currentTrack.value || !lastDrawingPoint.value) {
      return
    }
    
    // 记录线段：从上一个点到当前点
    // 格式与原始一致: { coords: [y1, x1, y2, x2], color, time }
    const segment = {
      coords: [
        lastDrawingPoint.value.y,
        lastDrawingPoint.value.x,
        y,
        x
      ],
      color: currentTrackColor.value || 'red',
      time: getDrawingTimestamp()
    }
    currentTrack.value.push(segment)
    
    // 更新上一个点
    lastDrawingPoint.value = { x, y }
  }
  
  /**
   * 结束追踪画笔轨迹
   */
  function trackDrawingEnd() {
    if (status.value !== 'active' || !currentTrack.value) {
      return
    }
    
    const plateKey = currentTrackPlateKey.value || getCurrentPlateKey()
    
    // 如果当前图版的轨迹数据是0，初始化为对象
    if (data.drawingTracks[plateKey] === 0) {
      data.drawingTracks[plateKey] = {}
    }
    
    // 初始化该图版的笔画计数
    if (strokeCountByPlate[plateKey] === undefined) {
      strokeCountByPlate[plateKey] = 0
    }
    
    // 使用笔画编号作为 key
    const strokeKey = String(strokeCountByPlate[plateKey])
    
    // 保存当前轨迹
    if (currentTrack.value.length > 0) {
      data.drawingTracks[plateKey][strokeKey] = currentTrack.value
      strokeCountByPlate[plateKey]++
      
      console.log('[InteractionTracker] 保存画笔轨迹:', { 
        plateKey, 
        strokeKey, 
        pointCount: currentTrack.value.length 
      })
    }
    
    // 清空当前轨迹状态
    currentTrack.value = null
    currentTrackStartTime.value = null
    currentTrackPlateKey.value = null
    currentTrackColor.value = null
    lastDrawingPoint.value = null
  }
  
  /**
   * 记录绘画数据（从 ImageCanvas 传入的完整数据）
   */
  function trackDrawing(plateIndex, drawingData) {
    const plateKey = String(plateIndex + 1)
    
    if (drawingData && drawingData.history && drawingData.history.length > 0) {
      // 转换格式
      const tracks = {}
      drawingData.history.forEach((stroke, index) => {
        const segments = []
        if (stroke.points && stroke.points.length > 1) {
          for (let i = 1; i < stroke.points.length; i++) {
            segments.push({
              coords: [
                stroke.points[i - 1].y,
                stroke.points[i - 1].x,
                stroke.points[i].y,
                stroke.points[i].x
              ],
              color: stroke.color || 'red',
              time: getDrawingTimestamp()
            })
          }
        }
        if (segments.length > 0) {
          tracks[String(index)] = segments
        }
      })
      
      if (Object.keys(tracks).length > 0) {
        data.drawingTracks[plateKey] = tracks
      }
    }
  }
  
  // ==================== 数据获取 ====================
  
  /**
   * 获取音频时间戳统计数据（相对时间）
   * @returns {Object} 格式: { "start": "00:00", "1": "01:53", "select": "25:15", "stop": "30:29", ... }
   */
  function getAudioTimestamps() {
    const result = {}
    
    result.start = formatTimestamp(timestamps.start)
    
    for (let i = 1; i <= 10; i++) {
      const key = String(i)
      const timestamp = timestamps.plates[key]
      result[key] = timestamp ? formatTimestamp(timestamp) : '00:00'
    }
    
    result.select = formatTimestamp(timestamps.select)
    result.stop = formatTimestamp(timestamps.stop)
    
    return result
  }
  
  /**
   * 获取绝对时间戳统计数据
   * @returns {Object} 格式: { "start": "2025-10-28 20:13:32", "1": "2025-10-28 20:15:25", ... }
   */
  function getAbsoluteTimestamps() {
    const result = {}
    
    result.start = formatAbsoluteTimestamp(timestamps.start)
    
    for (let i = 1; i <= 10; i++) {
      const key = String(i)
      const timestamp = timestamps.plates[key]
      result[key] = formatAbsoluteTimestamp(timestamp)
    }
    
    result.select = formatAbsoluteTimestamp(timestamps.select)
    result.stop = formatAbsoluteTimestamp(timestamps.stop)
    
    return result
  }
  
  /**
   * 获取画笔轨迹数据
   */
  function getDrawingTracks() {
    const tracks = {}
    for (let i = 1; i <= 10; i++) {
      const key = String(i)
      tracks[key] = data.drawingTracks[key] === 0 ? {} : (data.drawingTracks[key] || {})
    }
    return tracks
  }
  
  /**
   * 获取所有交互数据
   */
  function getAllInteractionData() {
    return {
      zoom: { ...data.zoom },
      rotate: { ...data.rotate },
      navigation: { ...data.navigation },
      drawingTracks: getDrawingTracks()
    }
  }
  
  /**
   * 格式化数据用于上传
   */
  function formatForUpload() {
    const zoom = {}
    const rotate = {}
    const segTime = {}
    
    // 转换缩放数据
    Object.entries(data.zoom).forEach(([plateKey, values]) => {
      zoom[plateKey] = values || []
    })
    
    // 转换旋转数据
    Object.entries(data.rotate).forEach(([plateKey, values]) => {
      rotate[plateKey] = values || []
    })
    
    // 转换时间戳数据（使用相对时间格式）
    const audioTimestamps = getAudioTimestamps()
    Object.entries(timestamps.plates).forEach(([plateKey, timestamp]) => {
      segTime[plateKey] = audioTimestamps[plateKey] || '00:00'
    })
    segTime.start = audioTimestamps.start
    segTime.select = audioTimestamps.select
    segTime.stop = audioTimestamps.stop
    
    return {
      zoom,
      rotate,
      drawingTracks: getDrawingTracks(),
      segTime
    }
  }
  
  /**
   * 打印某个图版的数据
   */
  function printPlateData(plateIndex) {
    const plateKey = String(plateIndex + 1)
    const plateData = {
      zoom: data.zoom[plateKey] || [],
      rotate: data.rotate[plateKey] || [],
      navigation: data.navigation[plateKey] || [],
      drawingTracks: data.drawingTracks[plateKey] === 0 ? {} : (data.drawingTracks[plateKey] || {})
    }
    console.log(`[图版 ${plateKey} 完整交互数据]`, plateData)
  }
  
  /**
   * 输出所有版图的统计信息
   */
  function printAllPlatesStatistics() {
    const allPlatesStats = {
      data: getAllInteractionData(),
      timestamps: {
        relative: getAudioTimestamps(),
        absolute: getAbsoluteTimestamps()
      }
    }
    console.log('[完整版图统计数据]', allPlatesStats)
  }
  
  /**
   * 重置交互数据
   */
  function resetInteractionData() {
    isTracking.value = false
    status.value = 'idle'
    testStartTime.value = null
    currentPlateIndex.value = null
    currentTrack.value = null
    currentTrackStartTime.value = null
    currentTrackPlateKey.value = null
    currentTrackColor.value = null
    lastDrawingPoint.value = null
    
    // 重置时间戳
    timestamps.start = null
    timestamps.plates = {}
    timestamps.select = null
    timestamps.stop = null
    
    // 重置笔画计数
    Object.keys(strokeCountByPlate).forEach(key => {
      delete strokeCountByPlate[key]
    })
    
    // 重新初始化数据结构
    initializeDataStructure()
  }
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    data,
    timestamps,
    isTracking,
    status,
    testStartTime,
    currentPlateIndex,
    
    // 追踪控制
    startTracking,
    stopTracking,
    stop,
    recordSelectPhase,
    
    // 缩放/旋转追踪
    trackZoom,
    trackRotate,
    
    // 画笔轨迹追踪
    trackDrawingStart,
    trackDrawingPoint,
    trackDrawingEnd,
    trackDrawing,
    
    // 数据获取
    getAudioTimestamps,
    getAbsoluteTimestamps,
    getDrawingTracks,
    getAllInteractionData,
    formatForUpload,
    printPlateData,
    printAllPlatesStatistics,
    
    // 重置
    resetInteractionData
  }
}

export default useInteractionTracker
