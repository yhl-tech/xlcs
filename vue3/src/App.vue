<template>
  <div id="app-root">
    <!-- 全局黑洞背景（始终显示） -->
    <BlackHoleBackground 
      :theme="backgroundTheme" 
      :enabled="true"
      :z-index="0"
    />
    
    <!-- 全局头部导航栏 -->
    <AppHeader v-if="showHeader" />
    
    <!-- 路由视图 -->
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    
    <!-- 全局加载遮罩 -->
    <LoadingOverlay 
      v-if="uiStore.isLoading" 
      :message="uiStore.loadingMessage" 
    />
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useTestStore } from '@/stores/testStore'
import { useRealtimeDialog } from '@/composables/useRealtimeDialog'
import useApi from '@/composables/useApi'
import { stopAllAudios } from '@/utils/audioManager'
import BlackHoleBackground from '@/components/effects/BlackHoleBackground.vue'
import LoadingOverlay from '@/components/common/LoadingOverlay.vue'
import AppHeader from '@/components/common/AppHeader.vue'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const authStore = useAuthStore()
const testStore = useTestStore()
const api = useApi()

// 全局 WebRTC 实时对话服务
const realtimeDialog = useRealtimeDialog()

// 控制头部导航栏显示
const showHeader = computed(() => {
  // 在非首页和登录页时显示
  return !['Home', 'Login'].includes(route.name)
})

// 背景主题
const backgroundTheme = computed(() => uiStore.backgroundTheme)

// 监听路由，管理音频播放
// 注意：WebRTC 连接由 TestView.vue 管理，这里只处理音频
watch(() => route.name, (routeName, oldRouteName) => {
  console.log('[App] 路由切换:', oldRouteName, '→', routeName)
  
  // 路由切换时，停止之前页面的音频
  if (oldRouteName && routeName !== oldRouteName) {
    // 从准备页面离开 → 停止欢迎语音频
    // 从说明页面离开 → 停止说明音频
    if (oldRouteName === 'Prep' || oldRouteName === 'Intro') {
      console.log('[App] 离开', oldRouteName, '，停止音频播放')
      stopAllAudios()
    }
  }
}, { immediate: false })

// 监听登录状态，登出时断开 WebRTC
watch(() => authStore.isLoggedIn, (isLoggedIn) => {
  if (!isLoggedIn && realtimeDialog.isConnected.value) {
    console.log('[App] 用户已登出，断开 WebRTC 连接')
    realtimeDialog.disconnect()
  }
})

// 检查用户是否已提交测试（用于页面刷新时的状态恢复）
async function checkUserTestStatus() {
  try {
    const userId = authStore.userInfo?.username || authStore.userInfo?.phone
    if (!userId) {
      console.log('[App] 无用户ID，跳过检查')
      return false
    }

    // 不在登录页和首页检查
    const currentPath = route.path
    if (currentPath === '/' || currentPath === '/login') {
      console.log('[App] 在首页或登录页，跳过检查')
      return false
    }

    console.log('[App] 检查用户测试状态:', userId)

    // 1. 检查用户是否已提交测试数据
    let uploadStatus
    try {
      uploadStatus = await api.checkUploadFilesStatus(userId)
      console.log('[App] 上传状态:', JSON.stringify(uploadStatus))
    } catch (err) {
      console.error('[App] checkUploadFilesStatus 调用失败:', err)
      return false
    }

    // 如果用户未提交数据，不跳转
    if (uploadStatus.data !== true) {
      console.log('[App] 用户未提交过测试, code:', uploadStatus.code, 'data:', uploadStatus.data)
      return false
    }

    // 2. 用户已提交数据，获取报告状态
    console.log('[App] ✓ 用户已提交测试，开始调用 checkReportStatus...')
    let reportStatus
    try {
      reportStatus = await api.checkReportStatus(userId)
      console.log('[App] 报告状态:', JSON.stringify(reportStatus))
    } catch (err) {
      console.error('[App] checkReportStatus 调用失败:', err)
      return false
    }

    // 判断报告是否就绪
    // code === 0 表示请求成功，data === true 表示报告已生成
    const isReportReady = reportStatus.code === 0 && reportStatus.data === true

    console.log('[App] 报告是否就绪:', isReportReady, '(code:', reportStatus.code, ', data:', reportStatus.data, ')')

    // 3. 设置状态并跳转到等待报告页面
    testStore.setPhase('waiting')
    testStore.setReportStatus({
      status: isReportReady ? 'ready' : 'pending',
      isReady: isReportReady,
      message: reportStatus.msg || (isReportReady ? '报告已生成' : '报告处理中...')
    })
    
    // 如果不在 /test 页面，跳转过去
    if (currentPath !== '/test') {
      router.replace('/test')
    }
    return true
  } catch (error) {
    console.error('[App] 检查测试状态失败:', error)
    return false
  }
}

onMounted(async () => {
  console.log('知己心探 Vue 3 版本已启动')
  console.log('[App] onMounted - 当前路由:', route.path, route.name)
  console.log('[App] onMounted - 用户信息:', authStore.userInfo)
  
  // 将 realtimeDialog 挂载到全局，方便其他组件访问
  window.$realtimeDialog = realtimeDialog
  
  // 等待路由准备好后再检查
  // 使用 nextTick 确保路由已经完全初始化
  await router.isReady()
  console.log('[App] 路由已准备好，当前路径:', route.path)
  
  // 检查用户测试状态（页面刷新时）
  console.log('[App] 开始检查用户测试状态...')
  await checkUserTestStatus()
  console.log('[App] 检查用户测试状态完成')
})
</script>

<style>
#app-root {
  width: 100%;
  height: auto;
  min-height: 100vh;
  position: relative;
  background: #000;
}

/* 路由过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
