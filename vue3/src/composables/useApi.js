/**
 * API 调用封装
 * 基于 axios 的 HTTP 请求封装
 * 参考原始 script/api.js 实现
 */
import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

// API 基础配置
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000
}

/**
 * 保存文件到本地（下载）
 * @param {Blob|File} fileData - 文件数据
 * @param {string} fileName - 文件名
 */
function saveFileToLocal(fileData, fileName) {
  try {
    const blob = fileData instanceof Blob ? fileData : new Blob([fileData])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    console.log('[API] 文件已保存到本地:', fileName)
  } catch (error) {
    console.warn('[API] 保存文件到本地失败:', fileName, error)
  }
}

/**
 * 获取用户信息中的 username
 */
function getUserInfoFromStorage() {
  try {
    const userInfoStr = localStorage.getItem('userInfo')
    if (userInfoStr) {
      const userInfo = JSON.parse(userInfoStr)
      return userInfo?.username || ''
    }
  } catch (error) {
    console.warn('[API] 读取 userInfo 失败:', error)
  }
  return ''
}

/**
 * 规范化时间字符串格式，确保分钟和秒数都是两位数
 */
function normalizeTimeString(timeStr) {
  if (typeof timeStr !== 'string' || !timeStr.includes(':')) {
    return timeStr
  }

  const parts = timeStr.split(':')
  if (parts.length !== 2) {
    return timeStr
  }

  try {
    const minutes = parseInt(parts[0], 10)
    const seconds = parseInt(parts[1], 10)
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  } catch (e) {
    return timeStr
  }
}

/**
 * 规范化画笔轨迹数据中的时间格式
 */
function normalizeDrawingTracksData(drawingTracksData) {
  if (!drawingTracksData || typeof drawingTracksData !== 'object') {
    return drawingTracksData
  }

  const normalized = { ...drawingTracksData }
  const normalizedData = {}

  const data = drawingTracksData.data || drawingTracksData

  for (const plateKey in data) {
    const plateData = data[plateKey]

    if (typeof plateData === 'object' && plateData !== null) {
      const normalizedPlateData = {}
      for (const strokeKey in plateData) {
        const strokeData = plateData[strokeKey]
        if (Array.isArray(strokeData)) {
          normalizedPlateData[strokeKey] = strokeData.map((segment) => {
            if (segment && typeof segment === 'object' && segment.time) {
              return {
                ...segment,
                time: normalizeTimeString(segment.time)
              }
            }
            return segment
          })
        } else {
          normalizedPlateData[strokeKey] = strokeData
        }
      }
      normalizedData[plateKey] = Object.keys(normalizedPlateData).length === 0 ? {} : normalizedPlateData
    } else {
      normalizedData[plateKey] = plateData
    }
  }

  // 确保始终有 10 个图版位置
  for (let i = 1; i <= 10; i++) {
    const key = String(i)
    if (!(key in normalizedData)) {
      normalizedData[key] = {}
    }
  }

  normalized.data = normalizedData
  return normalized
}

// 创建 axios 实例
const createClient = () => {
  const client = axios.create({
    baseURL: API_CONFIG.baseURL,
    timeout: API_CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json'
    }
  })

  // 请求拦截器
  client.interceptors.request.use(
    (config) => {
      const authStore = useAuthStore()
      if (authStore.token) {
        config.headers.Authorization = `Bearer ${authStore.token}`
      }
      
      // 设置 User-Id header
      const userId = getUserInfoFromStorage()
      if (userId) {
        config.headers['User-Id'] = userId
      }
      
      // FormData 请求时删除 Content-Type，让浏览器自动设置
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type']
      }
      
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // 响应拦截器
  client.interceptors.response.use(
    (response) => {
      if (response.config?.responseType === 'blob') {
        return response
      }
      return response.data
    },
    (error) => {
      if (error.response) {
        const { status, data } = error.response
        
        if (status === 401) {
          const authStore = useAuthStore()
          authStore.logout()
        }
        
        const errorMessage = data?.message || data?.msg || '请求失败'
        console.error(`[API Error] ${status}: ${errorMessage}`)
      } else if (error.request) {
        console.error('[API Error] 网络错误，请检查网络连接')
      }
      
      return Promise.reject(error)
    }
  )

  return client
}

/**
 * useApi composable
 */
export function useApi() {
  const client = createClient()

  // ==================== 认证相关 ====================

  const phoneLogin = async (phone, verificationCode) => {
    const response = await client.post('/rorschach/user_login_phone', {
      phone,
      verification_code: verificationCode
    })
    return response
  }

  const usernameLogin = async (username, password) => {
    const response = await client.post('/rorschach/user_login', {
      username,
      password
    })
    return response
  }

  const sendVerificationCode = async (phone) => {
    const response = await client.post('/rorschach/send_verification_code', { phone })
    return response
  }

  const register = async (data) => {
    const response = await client.post('/rorschach/user_register', data)
    return response
  }

  // ==================== 测试相关 ====================

  const getBasicInfo = async (userId = null) => {
    const params = userId ? { user_id: userId } : {}
    const response = await client.get('/rorschach/basic_info', { params })
    return response
  }

  /**
   * 设置用户基本信息
   * POST /rorschach/user/set_basic_info
   */
  const setBasicInfo = async (userId, basicInfo) => {
    const requestData = {
      user_id: userId,
      basic_info: basicInfo
    }
    console.log('[API] setBasicInfo 请求数据:', JSON.stringify(requestData, null, 2))
    const response = await client.post('/rorschach/user/set_basic_info', requestData)
    return response
  }

  /**
   * 上传缩放数据（scale.json）
   * POST /rorschach/user/upload_scale
   * 格式: { "1": [1, 1, -1], "2": [], ... }
   * 注意: 必须包含所有10个图版，空数据也要上传
   */
  const uploadZoom = async (zoomData, userId) => {
    if (!zoomData || typeof zoomData !== 'object') {
      throw new Error('缩放数据参数无效')
    }

    // 确保所有10个图版都存在（补齐缺失的）
    const completeData = {}
    for (let i = 1; i <= 10; i++) {
      const key = String(i)
      completeData[key] = zoomData[key] || []
    }

    const formData = new FormData()
    const jsonString = JSON.stringify(completeData)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const file = new File([blob], 'scale.json', { type: 'application/json' })
    
    formData.append('file', file, 'scale.json')
    
    // 保存文件到本地
    saveFileToLocal(blob, `scale_${userId || 'unknown'}_${Date.now()}.json`)
    
    console.log('[API] 上传缩放数据:', { originalData: zoomData, completeData, userId })
    
    const response = await client.post('/rorschach/user/upload_scale', formData)
    return response
  }

  /**
   * 上传旋转数据（rotate.json）
   * POST /rorschach/user/upload_rotate
   * 格式: { "1": 0, "2": 4, ... } - 值是旋转次数（整数）
   * 注意: 必须包含所有10个图版，空数据会抛错
   */
  const uploadRotate = async (rotateData, userId) => {
    if (!rotateData || typeof rotateData !== 'object') {
      throw new Error('旋转数据参数无效')
    }

    // 确保所有10个图版都存在（补齐缺失的为0）
    const completeData = {}
    for (let i = 1; i <= 10; i++) {
      const key = String(i)
      completeData[key] = rotateData[key] !== undefined ? rotateData[key] : 0
    }

    const jsonString = JSON.stringify(completeData)
    
    // 检查是否全为0（完全没有旋转操作）
    const hasAnyRotation = Object.values(completeData).some(v => v > 0)
    if (!hasAnyRotation) {
      console.warn('[API] 旋转数据全为0，仍然上传')
    }

    const formData = new FormData()
    const blob = new Blob([jsonString], { type: 'application/json' })
    const file = new File([blob], 'rotate.json', { type: 'application/json' })
    
    formData.append('file', file, 'rotate.json')
    
    // 保存文件到本地
    saveFileToLocal(blob, `rotate_${userId || 'unknown'}_${Date.now()}.json`)
    
    console.log('[API] 上传旋转数据:', { originalData: rotateData, completeData, userId })
    
    const response = await client.post('/rorschach/user/upload_rotate', formData)
    return response
  }

  /**
   * 上传笔迹轨迹数据（trajectory.json）
   * POST /rorschach/user/upload_trajectory
   * 格式: { canvas_size: [高, 宽], data: { "1": {}, "2": {}, ... "10": {} } }
   * 注意: 必须包含所有10个图版（由 normalizeDrawingTracksData 自动补齐）
   */
  const uploadDrawingTracks = async (drawingTracksData, userId, canvasSize = [0, 0]) => {
    if (!drawingTracksData || typeof drawingTracksData !== 'object') {
      throw new Error('笔迹轨迹数据参数无效')
    }

    // 构建带有 canvas_size 的数据结构
    const dataWithCanvasSize = {
      canvas_size: canvasSize,
      data: drawingTracksData
    }

    // 规范化时间格式
    const normalizedData = normalizeDrawingTracksData(dataWithCanvasSize)

    const formData = new FormData()
    const jsonString = JSON.stringify(normalizedData)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const file = new File([blob], 'trajectory.json', { type: 'application/json' })
    
    // 添加文件到 FormData（文件名必须是 trajectory.json）
    formData.append('file', file, 'trajectory.json')
    
    // 添加 user_id 到 FormData（原项目要求）
    formData.append('user_id', userId)
    
    // 保存文件到本地
    saveFileToLocal(blob, `trajectory_${userId || 'unknown'}_${Date.now()}.json`)
    
    console.log('[API] 上传笔迹轨迹数据:', { 
      originalData: drawingTracksData, 
      normalizedData,
      userId,
      hasFile: formData.has('file'),
      hasUserId: formData.has('user_id')
    })
    
    const response = await client.post('/rorschach/user/upload_trajectory', formData, {
      headers: {
        'User-Id': userId
      }
    })
    return response
  }

  /**
   * 上传时间戳切分数据（video_clip.json）
   * POST /rorschach/user/upload_seg_time
   * 格式: { "start": "00:00", "1": "01:53", ..., "10": "xx:xx", "select": "25:15", "stop": "30:29" }
   * 注意: 必须包含 start, 1-10, select, stop 所有键
   */
  const uploadSegTime = async (segTimeData, userId) => {
    if (!segTimeData || typeof segTimeData !== 'object') {
      throw new Error('时间戳数据参数无效')
    }

    // 规范化时间格式并确保所有必需的键都存在
    const normalizedSegTime = {}
    
    // 确保 start 存在
    normalizedSegTime.start = normalizeTimeString(segTimeData.start || '00:00')
    
    // 确保 1-10 图版时间戳存在
    for (let i = 1; i <= 10; i++) {
      const key = String(i)
      normalizedSegTime[key] = normalizeTimeString(segTimeData[key] || '00:00')
    }
    
    // 确保 select 和 stop 存在
    normalizedSegTime.select = normalizeTimeString(segTimeData.select || '00:00')
    normalizedSegTime.stop = normalizeTimeString(segTimeData.stop || '00:00')

    const formData = new FormData()
    const jsonString = JSON.stringify(normalizedSegTime)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const file = new File([blob], 'video_clip.json', { type: 'application/json' })
    
    formData.append('file', file, 'video_clip.json')
    
    // 保存文件到本地
    saveFileToLocal(blob, `video_clip_${userId || 'unknown'}_${Date.now()}.json`)
    
    console.log('[API] 上传时间戳数据:', { 
      originalData: segTimeData, 
      normalizedData: normalizedSegTime,
      userId 
    })
    
    const response = await client.post('/rorschach/user/upload_seg_time', formData)
    return response
  }

  /**
   * 上传五个问题的答案数据（5_questions.json）
   * POST /rorschach/user/upload_5_questions
   * 格式: { "self": [], "father": [], "mother": [], "favorite": [], "dislike": [] }
   * 注意: 不包含 mood 字段；使用后端期望的键名 self/favorite
   */
  const upload5Questions = async (questionsData, userId) => {
    if (!questionsData || typeof questionsData !== 'object') {
      throw new Error('五个问题数据参数无效')
    }

    // 转换格式并使用后端期望的键名
    // 后端期望: self, father, mother, favorite, dislike
    // 前端使用: self, father, mother, like, dislike
    const formattedData = {}
    
    // 处理 self（代表自己）
    if (questionsData.self !== undefined) {
      formattedData.self = Array.isArray(questionsData.self) ? questionsData.self : [questionsData.self]
    }
    
    // 处理 father（代表父亲）
    if (questionsData.father !== undefined) {
      formattedData.father = Array.isArray(questionsData.father) ? questionsData.father : [questionsData.father]
    }
    
    // 处理 mother（代表母亲）
    if (questionsData.mother !== undefined) {
      formattedData.mother = Array.isArray(questionsData.mother) ? questionsData.mother : [questionsData.mother]
    }
    
    // 处理 like -> favorite（最喜欢）
    if (questionsData.like !== undefined) {
      formattedData.favorite = Array.isArray(questionsData.like) ? questionsData.like : [questionsData.like]
    }
    
    // 处理 dislike（最不喜欢）
    if (questionsData.dislike !== undefined) {
      formattedData.dislike = Array.isArray(questionsData.dislike) ? questionsData.dislike : [questionsData.dislike]
    }

    // 过滤掉 null 值
    Object.keys(formattedData).forEach(key => {
      if (Array.isArray(formattedData[key])) {
        formattedData[key] = formattedData[key].filter(v => v !== null && v !== undefined)
      }
    })

    // 确保所有5个问题字段都存在（使用后端期望的键名）
    const completeData = {
      self: formattedData.self || [],
      father: formattedData.father || [],
      mother: formattedData.mother || [],
      favorite: formattedData.favorite || [],
      dislike: formattedData.dislike || []
    }

    const formData = new FormData()
    const jsonString = JSON.stringify(completeData)
    
    if (jsonString === '{}') {
      console.warn('[API] 五个问题数据为空，仍按格式上传')
    }

    const blob = new Blob([jsonString], { type: 'application/json' })
    const file = new File([blob], '5_questions.json', { type: 'application/json' })
    
    formData.append('file', file, '5_questions.json')
    
    // 保存文件到本地
    saveFileToLocal(blob, `5_questions_${userId || 'unknown'}_${Date.now()}.json`)
    
    console.log('[API] 上传五个问题数据:', { 
      originalData: questionsData, 
      completeData,
      userId 
    })
    
    const response = await client.post('/rorschach/user/upload_5_questions', formData)
    return response
  }

  /**
   * 上传音/视频文件
   * POST /rorschach/user/upload_media
   */
  const uploadMedia = async (file, userId = null, onProgress = null) => {
    // 确保文件有正确的文件名和类型
    let fileToUpload = file
    
    // 如果是 Blob，转换为 File
    if (file instanceof Blob && !(file instanceof File)) {
      const extension = file.type.includes('mp4') ? 'mp4' : 'mp3'
      const fileName = `audio_${userId || 'unknown'}_${Date.now()}.${extension}`
      fileToUpload = new File([file], fileName, { type: file.type || 'audio/mp3' })
    }
    
    // 验证文件类型
    const fileName = fileToUpload.name.toLowerCase()
    const isValidFormat = fileName.endsWith('.mp3') || fileName.endsWith('.mp4')
    if (!isValidFormat) {
      throw new Error('只支持上传MP3/MP4格式文件')
    }

    const formData = new FormData()
    formData.append('file', fileToUpload)
    
    const fileSizeMB = (fileToUpload.size / (1024 * 1024)).toFixed(2)
    console.log('[API] 上传音频文件:', { 
      fileName: fileToUpload.name, 
      size: `${fileSizeMB}MB`,
      userId 
    })
    
    // 保存文件到本地
    const mediaFileName = `media_${userId || 'unknown'}_${Date.now()}_${fileToUpload.name}`
    saveFileToLocal(fileToUpload, mediaFileName)
    
    const response = await client.post('/rorschach/user/upload_media', formData, {
      timeout: 300000, // 5分钟超时
      onUploadProgress: onProgress ? (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(percent)
      } : undefined
    })
    return response
  }

  /**
   * 触发分析
   * POST /rorschach/analyze
   */
  const analyzeTest = async (userId) => {
    const response = await client.post('/rorschach/analyze', {
      user_id: userId
    })
    return response
  }

  // ==================== 报告相关 ====================

  const checkReportStatus = async (userId) => {
    if (!userId) {
      console.warn('[API] checkReportStatus: 用户ID为空')
      return { ready: false }
    }
    
    try {
      const response = await client.post('/rorschach/user/get_report_status', {
        user_id: userId
      })
      console.log('[API] 检查报告状态:', response)
      return response
    } catch (error) {
      console.warn('[API] 检查报告状态失败:', error)
      // 接口失败时返回默认状态，不抛出错误
      return { ready: false }
    }
  }

  const downloadReport = async (userId) => {
    const response = await client.get('/rorschach/download_report', {
      params: { user_id: userId },
      responseType: 'blob'
    })
    return response
  }

  const getReportData = async (userId) => {
    const response = await client.get('/rorschach/get_report', {
      params: { user_id: userId }
    })
    return response
  }

  const checkUploadFilesStatus = async (userId) => {
    const response = await client.get('/rorschach/check_upload_files_status', {
      params: { user_id: userId }
    })
    return response
  }

  const getPublicityReport = async (userId) => {
    const response = await client.get('/rorschach/get_publicity_report', {
      params: { user_id: userId }
    })
    return response
  }

  // ==================== 返回 ====================

  return {
    // 认证
    phoneLogin,
    usernameLogin,
    sendVerificationCode,
    register,
    
    // 用户信息
    getBasicInfo,
    setBasicInfo,
    
    // 测试数据上传（六个文件）
    uploadZoom,           // 1. scale.json - 缩放数据
    uploadRotate,         // 2. rotate.json - 旋转数据
    uploadDrawingTracks,  // 3. drawing_tracks.json - 笔迹轨迹
    uploadSegTime,        // 4. video_clip.json - 时间戳切分
    upload5Questions,     // 5. 5_questions.json - 五个问题答案
    uploadMedia,          // 6. 音频文件
    
    // 分析
    analyzeTest,
    
    // 报告
    checkReportStatus,
    downloadReport,
    getReportData,
    checkUploadFilesStatus,
    getPublicityReport
  }
}

export default useApi
