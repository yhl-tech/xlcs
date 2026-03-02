/**
 * 设备检测
 * 检测设备类型、浏览器支持、触屏等
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useDeviceCheck() {
  // ==================== 状态 ====================
  
  // 设备类型
  const isMobile = ref(false)
  const isTablet = ref(false)
  const isDesktop = ref(true)
  
  // 触屏支持
  const isTouchDevice = ref(false)
  
  // 屏幕尺寸
  const screenWidth = ref(0)
  const screenHeight = ref(0)
  
  // 设备方向
  const orientation = ref('portrait') // 'portrait' | 'landscape'
  
  // 浏览器信息
  const browserInfo = ref({
    name: '',
    version: '',
    isSafari: false,
    isChrome: false,
    isFirefox: false,
    isEdge: false,
    isWechat: false,
    isIOS: false,
    isAndroid: false
  })
  
  // 功能支持
  const supports = ref({
    webgl: false,
    webrtc: false,
    audioContext: false,
    mediaRecorder: false,
    localStorage: false,
    sessionStorage: false,
    webWorker: false,
    canvas: false,
    touch: false
  })
  
  // ==================== 计算属性 ====================
  
  // 设备类型字符串
  const deviceType = computed(() => {
    if (isMobile.value) return 'mobile'
    if (isTablet.value) return 'tablet'
    return 'desktop'
  })
  
  // 是否为移动设备（包括平板）
  const isMobileOrTablet = computed(() => {
    return isMobile.value || isTablet.value
  })
  
  // ==================== 方法 ====================
  
  /**
   * 检测设备类型
   */
  function detectDevice() {
    const ua = navigator.userAgent.toLowerCase()
    const width = window.innerWidth
    
    // 触屏检测
    isTouchDevice.value = 'ontouchstart' in window || 
      navigator.maxTouchPoints > 0 || 
      // @ts-ignore
      navigator.msMaxTouchPoints > 0
    
    // 屏幕尺寸
    screenWidth.value = window.innerWidth
    screenHeight.value = window.innerHeight
    
    // 设备方向
    orientation.value = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
    
    // 移动设备检测
    const mobileKeywords = ['android', 'webos', 'iphone', 'ipod', 'blackberry', 'windows phone']
    const tabletKeywords = ['ipad', 'tablet', 'playbook', 'silk']
    
    const isMobileUA = mobileKeywords.some(keyword => ua.includes(keyword))
    const isTabletUA = tabletKeywords.some(keyword => ua.includes(keyword))
    
    // 结合 UA 和屏幕宽度判断
    if (isTabletUA || (isTouchDevice.value && width >= 768 && width < 1024)) {
      isTablet.value = true
      isMobile.value = false
      isDesktop.value = false
    } else if (isMobileUA || (isTouchDevice.value && width < 768)) {
      isMobile.value = true
      isTablet.value = false
      isDesktop.value = false
    } else {
      isDesktop.value = true
      isMobile.value = false
      isTablet.value = false
    }
    
    // 浏览器检测
    detectBrowser(ua)
    
    // 功能支持检测
    detectSupport()
  }
  
  /**
   * 检测浏览器信息
   */
  function detectBrowser(ua) {
    browserInfo.value.isWechat = ua.includes('micromessenger')
    browserInfo.value.isIOS = /iphone|ipad|ipod/i.test(ua)
    browserInfo.value.isAndroid = ua.includes('android')
    browserInfo.value.isSafari = /safari/i.test(ua) && !/chrome|crios|crmo|android/i.test(ua)
    browserInfo.value.isChrome = /chrome|crios|crmo/i.test(ua) && !ua.includes('edg')
    browserInfo.value.isFirefox = ua.includes('firefox')
    browserInfo.value.isEdge = ua.includes('edg')
    
    // 获取浏览器名称
    if (browserInfo.value.isWechat) {
      browserInfo.value.name = 'WeChat'
    } else if (browserInfo.value.isChrome) {
      browserInfo.value.name = 'Chrome'
    } else if (browserInfo.value.isSafari) {
      browserInfo.value.name = 'Safari'
    } else if (browserInfo.value.isFirefox) {
      browserInfo.value.name = 'Firefox'
    } else if (browserInfo.value.isEdge) {
      browserInfo.value.name = 'Edge'
    } else {
      browserInfo.value.name = 'Unknown'
    }
  }
  
  /**
   * 检测功能支持
   */
  function detectSupport() {
    // WebGL
    try {
      const canvas = document.createElement('canvas')
      supports.value.webgl = !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      )
    } catch (e) {
      supports.value.webgl = false
    }
    
    // WebRTC
    supports.value.webrtc = !!(
      window.RTCPeerConnection ||
      // @ts-ignore
      window.webkitRTCPeerConnection ||
      // @ts-ignore
      window.mozRTCPeerConnection
    )
    
    // AudioContext
    supports.value.audioContext = !!(
      window.AudioContext ||
      // @ts-ignore
      window.webkitAudioContext
    )
    
    // MediaRecorder
    supports.value.mediaRecorder = typeof MediaRecorder !== 'undefined'
    
    // localStorage
    try {
      const test = '__storage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      supports.value.localStorage = true
    } catch (e) {
      supports.value.localStorage = false
    }
    
    // sessionStorage
    try {
      const test = '__storage_test__'
      sessionStorage.setItem(test, test)
      sessionStorage.removeItem(test)
      supports.value.sessionStorage = true
    } catch (e) {
      supports.value.sessionStorage = false
    }
    
    // Web Worker
    supports.value.webWorker = typeof Worker !== 'undefined'
    
    // Canvas
    try {
      const canvas = document.createElement('canvas')
      supports.value.canvas = !!(canvas.getContext && canvas.getContext('2d'))
    } catch (e) {
      supports.value.canvas = false
    }
    
    // Touch
    supports.value.touch = isTouchDevice.value
  }
  
  /**
   * 检查是否满足最低要求
   */
  function checkMinimumRequirements() {
    const issues = []
    
    if (!supports.value.localStorage) {
      issues.push('浏览器不支持本地存储')
    }
    
    if (!supports.value.canvas) {
      issues.push('浏览器不支持 Canvas')
    }
    
    if (!supports.value.audioContext) {
      issues.push('浏览器不支持音频功能')
    }
    
    return {
      passed: issues.length === 0,
      issues
    }
  }
  
  /**
   * 获取完整的设备信息
   */
  function getDeviceInfo() {
    return {
      type: deviceType.value,
      isMobile: isMobile.value,
      isTablet: isTablet.value,
      isDesktop: isDesktop.value,
      isTouchDevice: isTouchDevice.value,
      screenWidth: screenWidth.value,
      screenHeight: screenHeight.value,
      orientation: orientation.value,
      browser: { ...browserInfo.value },
      supports: { ...supports.value },
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language
    }
  }
  
  // 窗口大小变化处理
  function handleResize() {
    screenWidth.value = window.innerWidth
    screenHeight.value = window.innerHeight
    orientation.value = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  }
  
  // 生命周期
  onMounted(() => {
    detectDevice()
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', () => {
      setTimeout(detectDevice, 100)
    })
  })
  
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    screenWidth,
    screenHeight,
    orientation,
    browserInfo,
    supports,
    deviceType,
    isMobileOrTablet,
    
    // 方法
    detectDevice,
    checkMinimumRequirements,
    getDeviceInfo
  }
}

export default useDeviceCheck
