<template>
  <div id="app-root">
    <!-- 全局背景组件 -->
    <BlackHoleBackground 
      v-if="showBackground" 
      :theme="backgroundTheme" 
      :enabled="backgroundEnabled"
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
import { useRoute } from 'vue-router'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useRealtimeDialog } from '@/composables/useRealtimeDialog'
import { stopAllAudios } from '@/utils/audioManager'
import { SYSTEM_PROMPT } from '@/utils/constants'
import BlackHoleBackground from '@/components/effects/BlackHoleBackground.vue'
import LoadingOverlay from '@/components/common/LoadingOverlay.vue'
import AppHeader from '@/components/common/AppHeader.vue'

const route = useRoute()
const uiStore = useUiStore()
const authStore = useAuthStore()

// 全局 WebRTC 实时对话服务
const realtimeDialog = useRealtimeDialog()

// 控制背景显示
const showBackground = computed(() => {
  // 登录页、首页、准备页和说明页不显示黑洞背景（这些页面自己渲染背景）
  return !['Home', 'Login', 'Prep', 'Intro'].includes(route.name)
})

// 控制头部导航栏显示
const showHeader = computed(() => {
  // 在非首页和登录页时显示
  return !['Home', 'Login'].includes(route.name)
})

const backgroundEnabled = computed(() => showBackground.value)
const backgroundTheme = computed(() => uiStore.backgroundTheme)

// 监听路由，管理 WebRTC 连接和音频播放
watch(() => route.name, async (routeName, oldRouteName) => {
  console.log('[App] 路由切换:', oldRouteName, '→', routeName)
  
  // 路由切换时，停止之前页面的音频（除非是进入测试页面）
  if (oldRouteName && routeName !== oldRouteName) {
    // 从准备页面离开 → 停止欢迎语音频
    // 从说明页面离开 → 停止说明音频
    if (oldRouteName === 'Prep' || oldRouteName === 'Intro') {
      console.log('[App] 离开', oldRouteName, '，停止音频播放')
      stopAllAudios()
    }
  }
  
  // 进入测试页面时建立 WebRTC 连接
  if (routeName === 'Test' && authStore.isLoggedIn) {
    if (!realtimeDialog.isConnected.value && !realtimeDialog.isConnecting.value) {
      console.log('[App] 进入测试页面，初始化 WebRTC 连接...')
      console.log('[App] 使用完整提示词:', SYSTEM_PROMPT.substring(0, 100) + '...')
      try {
        // 使用完整的测试提示词（包含详细施测指导语）
        await realtimeDialog.connect(SYSTEM_PROMPT, 'alloy')
        console.log('[App] WebRTC 连接已建立')
      } catch (error) {
        console.error('[App] WebRTC 连接失败:', error)
      }
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

onMounted(() => {
  console.log('知己心探 Vue 3 版本已启动')
  
  // 将 realtimeDialog 挂载到全局，方便其他组件访问
  window.$realtimeDialog = realtimeDialog
})
</script>

<style>
#app-root {
  width: 100%;
  height: auto;
  min-height: 100vh;
  position: relative;
}

/* 路由过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
