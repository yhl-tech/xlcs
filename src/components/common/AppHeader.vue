<template>
  <header class="app-header">
    <!-- 左侧 Logo 区域 -->
    <div class="header-left">
      <img 
        :src="`${baseUrl}images/logo.png`" 
        alt="InnerScan" 
        class="header-logo"
      >
      <span class="header-brand">知己心探</span>
    </div>

    <!-- 中间区域（可选标题） -->
    <div class="header-center">
      <span v-if="centerText" class="header-center-text">
        {{ centerText }}
      </span>
    </div>

    <!-- 右侧用户信息区域 -->
    <div class="header-right">
      <RealtimeStatusBadge />
      <span v-if="authStore.isLoggedIn" class="username">
        {{ displayName }}
      </span>
      <!-- <button v-if="isDevelopment" class="header-btn primary" @click="handleEnterTest">
        直接进入
      </button> -->
      <button class="header-btn primary" @click="handleEnterTest">
        直接进入
      </button>
      <button 
        v-if="authStore.isLoggedIn" 
        class="header-btn danger" 
        @click="handleLogout"
      >
        退出
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useTestStore } from '@/stores/testStore'
import { useSessionStore } from '@/stores/sessionStore'
import { stopAllAudios } from '@/utils/audioManager'
import { isDevelopment } from '@/utils/constants'
import RealtimeStatusBadge from '@/components/common/RealtimeStatusBadge.vue'

// 获取 BASE_URL 用于资源路径
const baseUrl = import.meta.env.BASE_URL

defineProps({
  centerText: {
    type: String,
    default: ''
  }
})

const router = useRouter()
const authStore = useAuthStore()
const testStore = useTestStore()
const sessionStore = useSessionStore()

const displayName = computed(() => {
  return authStore.userInfo?.username || authStore.userInfo?.phone || '用户'
})

// 直接进入测试
function handleEnterTest() {
  console.log('[AppHeader] 直接进入测试')
  
  // 停止当前页面的音频
  stopAllAudios()
  
  // 设置默认的基本信息（用于测试）
  testStore.setBasicInfo({
    sex: '男',
    age: '25',
    education: '本科',
    occupation: '测试用户',
    mood: '平静'
  })
  
  // 启动测试
  testStore.startTest()
  
  // 保存会话快照
  sessionStore.saveSnapshot('direct_enter')
  
  // 跳转到测试页面
  router.push('/test')
}

function handleLogout() {
  if (confirm('确定要退出登录吗？')) {
    console.log('[AppHeader] 开始退出登录流程')

    // 1. 停止所有音频播放
    stopAllAudios()

    // 2. 断开 WebRTC 连接
    if (window.$realtimeDialog && window.$realtimeDialog.isConnected.value) {
      console.log('[AppHeader] 断开 WebRTC 连接')
      window.$realtimeDialog.disconnect()
    }

    // 3. 清空用户状态
    authStore.logout()

    // 4. 清空测试数据
    testStore.resetTest()
    sessionStore.clearSnapshot()

    // 5. 跳转到首页（不带 showLogin 参数）
    router.push('/')

    console.log('[AppHeader] 退出登录完成')
  }
}
</script>

<style lang="less" scoped>
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  background: rgba(10, 15, 30, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(64, 224, 255, 0.15);
  z-index: 1000;
}

/* 左侧 Logo 区域 */
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-logo {
  height: 45px;
  width: auto;
}

.header-brand {
  font-size: 20px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: 1px;
}

/* 中间区域 */
.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.header-center-text {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

/* 右侧用户区域 */
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  color: rgba(226, 232, 240, 0.95);
  font-size: 14px;
  font-weight: 500;
  padding: 6px 12px;
  background: rgba(99, 102, 241, 0.15);
  border-radius: 6px;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.header-btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;

  &.primary {
    background: rgba(33, 150, 243, 0.2);
    border-color: rgba(33, 150, 243, 0.4);
    color: rgba(100, 181, 246, 0.95);

    &:hover {
      background: rgba(33, 150, 243, 0.35);
      border-color: rgba(33, 150, 243, 0.6);
      color: #2196f3;
      box-shadow: 0 2px 8px rgba(33, 150, 243, 0.4);
      transform: translateY(-1px);
    }
  }

  &.danger {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
    color: rgba(248, 113, 113, 0.95);

    &:hover {
      background: rgba(239, 68, 68, 0.25);
      border-color: rgba(239, 68, 68, 0.5);
      color: #ef4444;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
      transform: translateY(-1px);
    }
  }

  &:active {
    transform: translateY(0);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .app-header {
    padding: 0 16px;
    height: 60px;
  }

  .header-logo {
    height: 36px;
  }

  .header-brand {
    font-size: 16px;
  }

  .header-btn {
    padding: 6px 12px;
    font-size: 13px;
  }

  .username {
    display: none;
  }
}
</style>
