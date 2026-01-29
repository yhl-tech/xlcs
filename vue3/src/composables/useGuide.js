/**
 * 用户引导
 * 使用 Driver.js 实现新手引导
 */
import { ref, onUnmounted } from 'vue'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

// 本地存储键名
const GUIDE_SHOWN_KEY = 'xlcs_guide_shown'

export function useGuide() {
  // ==================== 状态 ====================
  
  // Driver.js 实例
  let driverInstance = null
  
  // 是否正在显示引导
  const isGuiding = ref(false)
  
  // 是否已显示过引导
  const hasShownGuide = ref(false)
  
  // ==================== 引导步骤配置 ====================
  
  // 测试页面引导步骤
  const testGuideSteps = [
    {
      element: '.image-canvas-container',
      popover: {
        title: '墨迹图展示区',
        description: '这里会显示罗夏墨迹图，请仔细观察后描述您看到的内容',
        side: 'bottom'
      }
    },
    {
      element: '.controls-bar',
      popover: {
        title: '操作控制栏',
        description: '您可以使用这些按钮来缩放、旋转图片，或使用画笔标注',
        side: 'top'
      }
    },
    {
      element: '.zoom-controls',
      popover: {
        title: '缩放控制',
        description: '点击放大或缩小按钮来调整图片大小',
        side: 'bottom'
      }
    },
    {
      element: '.rotate-controls',
      popover: {
        title: '旋转控制',
        description: '点击旋转按钮可以将图片向左或向右旋转',
        side: 'bottom'
      }
    },
    {
      element: '.draw-controls',
      popover: {
        title: '绘画工具',
        description: '使用画笔在图片上标注您想要强调的部分',
        side: 'bottom'
      }
    },
    {
      element: '.navigation-controls',
      popover: {
        title: '导航按钮',
        description: '完成当前图版后，点击"下一张"继续',
        side: 'top'
      }
    },
    {
      element: '.energy-pillar',
      popover: {
        title: '进度显示',
        description: '这里显示您的测试进度',
        side: 'left'
      }
    }
  ]
  
  // ==================== 方法 ====================
  
  /**
   * 创建 Driver.js 实例
   */
  function createDriver(options = {}) {
    if (driverInstance) {
      driverInstance.destroy()
    }
    
    driverInstance = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayClickNext: false,
      doneBtnText: '完成',
      nextBtnText: '下一步',
      prevBtnText: '上一步',
      progressText: '{{current}} / {{total}}',
      ...options,
      onDestroyed: () => {
        isGuiding.value = false
        if (options.onDestroyed) {
          options.onDestroyed()
        }
      }
    })
    
    return driverInstance
  }
  
  /**
   * 显示测试页面引导
   */
  function showTestGuide(options = {}) {
    const { force = false } = options
    
    // 检查是否已显示过
    if (!force && localStorage.getItem(GUIDE_SHOWN_KEY)) {
      hasShownGuide.value = true
      return false
    }
    
    // 创建引导
    createDriver({
      steps: testGuideSteps,
      onDestroyed: () => {
        // 标记已显示
        localStorage.setItem(GUIDE_SHOWN_KEY, 'true')
        hasShownGuide.value = true
        isGuiding.value = false
      }
    })
    
    // 开始引导
    isGuiding.value = true
    driverInstance.drive()
    
    return true
  }
  
  /**
   * 显示自定义引导
   */
  function showCustomGuide(steps, options = {}) {
    createDriver({
      steps,
      ...options
    })
    
    isGuiding.value = true
    driverInstance.drive()
  }
  
  /**
   * 高亮单个元素
   */
  function highlight(element, popover = {}) {
    createDriver({
      popover: {
        title: popover.title || '',
        description: popover.description || '',
        ...popover
      }
    })
    
    isGuiding.value = true
    driverInstance.highlight({
      element,
      popover
    })
  }
  
  /**
   * 移动到下一步
   */
  function moveNext() {
    if (driverInstance) {
      driverInstance.moveNext()
    }
  }
  
  /**
   * 移动到上一步
   */
  function movePrevious() {
    if (driverInstance) {
      driverInstance.movePrevious()
    }
  }
  
  /**
   * 关闭引导
   */
  function close() {
    if (driverInstance) {
      driverInstance.destroy()
    }
    isGuiding.value = false
  }
  
  /**
   * 重置引导状态（允许重新显示）
   */
  function reset() {
    localStorage.removeItem(GUIDE_SHOWN_KEY)
    hasShownGuide.value = false
  }
  
  /**
   * 检查是否已显示过引导
   */
  function checkHasShown() {
    hasShownGuide.value = !!localStorage.getItem(GUIDE_SHOWN_KEY)
    return hasShownGuide.value
  }
  
  // 清理
  onUnmounted(() => {
    if (driverInstance) {
      driverInstance.destroy()
      driverInstance = null
    }
  })
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    isGuiding,
    hasShownGuide,
    
    // 方法
    showTestGuide,
    showCustomGuide,
    highlight,
    moveNext,
    movePrevious,
    close,
    reset,
    checkHasShown
  }
}

export default useGuide
