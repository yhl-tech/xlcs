/**
 * UI 状态管理
 * 管理加载状态、弹窗、主题等全局 UI 状态
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  // ==================== 状态 ====================
  
  // 全局加载状态
  const isLoading = ref(false)
  const loadingMessage = ref('')
  
  // 背景主题（0-9，对应不同颜色主题）
  const backgroundTheme = ref(0)
  
  // 弹窗状态
  const modalState = ref({
    isOpen: false,
    type: null,  // 'confirm', 'alert', 'custom'
    title: '',
    message: '',
    confirmText: '确定',
    cancelText: '取消',
    onConfirm: null,
    onCancel: null
  })
  
  // Toast 提示
  const toastState = ref({
    isVisible: false,
    message: '',
    type: 'info',  // 'info', 'success', 'warning', 'error'
    duration: 3000
  })
  
  // 是否显示调试工具
  const showDebugTools = ref(import.meta.env.DEV)
  
  // ==================== 方法 ====================
  
  /**
   * 显示加载状态
   */
  function showLoading(message = '加载中...') {
    isLoading.value = true
    loadingMessage.value = message
  }
  
  /**
   * 隐藏加载状态
   */
  function hideLoading() {
    isLoading.value = false
    loadingMessage.value = ''
  }
  
  /**
   * 设置背景主题
   */
  function setBackgroundTheme(theme) {
    backgroundTheme.value = theme
  }
  
  /**
   * 显示确认弹窗
   */
  function showConfirm({ title, message, confirmText = '确定', cancelText = '取消' }) {
    return new Promise((resolve) => {
      modalState.value = {
        isOpen: true,
        type: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        onConfirm: () => {
          closeModal()
          resolve(true)
        },
        onCancel: () => {
          closeModal()
          resolve(false)
        }
      }
    })
  }
  
  /**
   * 显示提示弹窗
   */
  function showAlert({ title, message, confirmText = '确定' }) {
    return new Promise((resolve) => {
      modalState.value = {
        isOpen: true,
        type: 'alert',
        title,
        message,
        confirmText,
        cancelText: '',
        onConfirm: () => {
          closeModal()
          resolve(true)
        },
        onCancel: null
      }
    })
  }
  
  /**
   * 关闭弹窗
   */
  function closeModal() {
    modalState.value = {
      isOpen: false,
      type: null,
      title: '',
      message: '',
      confirmText: '确定',
      cancelText: '取消',
      onConfirm: null,
      onCancel: null
    }
  }
  
  /**
   * 显示 Toast 提示
   */
  function showToast(message, type = 'info', duration = 3000) {
    toastState.value = {
      isVisible: true,
      message,
      type,
      duration
    }
    
    // 自动关闭
    setTimeout(() => {
      hideToast()
    }, duration)
  }
  
  /**
   * 隐藏 Toast
   */
  function hideToast() {
    toastState.value.isVisible = false
  }
  
  /**
   * 快捷方法：成功提示
   */
  function showSuccess(message, duration = 3000) {
    showToast(message, 'success', duration)
  }
  
  /**
   * 快捷方法：错误提示
   */
  function showError(message, duration = 3000) {
    showToast(message, 'error', duration)
  }
  
  /**
   * 快捷方法：警告提示
   */
  function showWarning(message, duration = 3000) {
    showToast(message, 'warning', duration)
  }
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    isLoading,
    loadingMessage,
    backgroundTheme,
    modalState,
    toastState,
    showDebugTools,
    
    // 方法
    showLoading,
    hideLoading,
    setBackgroundTheme,
    showConfirm,
    showAlert,
    closeModal,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning
  }
})
