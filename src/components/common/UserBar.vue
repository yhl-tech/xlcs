<template>
  <div class="user-bar">
    <!-- 直接进入测试按钮（始终显示） -->
    <button class="enter-test-btn" @click="handleEnterTest">直接进入</button>
    
    <!-- 用户信息和退出按钮（登录后显示） -->
    <template v-if="authStore.isLoggedIn">
      <span class="username">{{ displayName }}</span>
      <button class="logout-btn" @click="handleLogout">退出</button>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useTestStore } from '@/stores/testStore'
import { useSessionStore } from '@/stores/sessionStore'
import { stopAllAudios } from '@/utils/audioManager'
import { useLogout } from '@/composables/useLogout'

const router = useRouter()
const authStore = useAuthStore()
const testStore = useTestStore()
const sessionStore = useSessionStore()
const { logout } = useLogout()

const displayName = computed(() => {
  return authStore.userInfo?.username || authStore.userInfo?.phone || '用户'
})

// 直接进入测试
function handleEnterTest() {
  console.log('[UserBar] 直接进入测试')
  
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
    logout()
  }
}
</script>

<style lang="less" scoped>
// 变量
@glass-bg: rgba(15, 23, 42, 0.75);
@glass-border: rgba(99, 102, 241, 0.3);

.user-bar {
  position: fixed;
  top: 2rem;
  right: 2.5rem;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 12px;
  background: @glass-bg;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid @glass-border;
  border-radius: 10px;
  padding: 8px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

  @media (max-width: 768px) {
    top: 1rem;
    right: 1rem;
    padding: 6px 12px;
    gap: 8px;
  }
}

.username {
  color: rgba(226, 232, 240, 0.95);
  font-size: 14px;
  font-weight: 500;

  @media (max-width: 768px) {
    font-size: 13px;
  }
}

// 直接进入测试按钮 - 蓝色主题
.enter-test-btn {
  padding: 6px 16px;
  background: rgba(33, 150, 243, 0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(33, 150, 243, 0.4);
  border-radius: 6px;
  color: rgba(100, 181, 246, 0.95);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(33, 150, 243, 0.35);
    border-color: rgba(33, 150, 243, 0.6);
    color: #2196F3;
    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.4);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 6px 12px;
    font-size: 13px;
  }
}

.logout-btn {
  padding: 6px 16px;
  background: rgba(239, 68, 68, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  color: rgba(248, 113, 113, 0.95);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.25);
    border-color: rgba(239, 68, 68, 0.5);
    color: #ef4444;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 6px 12px;
    font-size: 13px;
  }
}
</style>
