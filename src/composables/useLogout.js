import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useTestStore } from '@/stores/testStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useRealtimeDialog } from '@/composables/useRealtimeDialog'
import { refreshRealtimeStatus } from '@/composables/useRealtimeStatus'
import { stopAllAudios } from '@/utils/audioManager'

/**
 * 统一退出登录：停止音频、断开 WebRTC、清空状态
 */
export function useLogout() {
  const router = useRouter()
  const authStore = useAuthStore()
  const testStore = useTestStore()
  const sessionStore = useSessionStore()
  const dialog = useRealtimeDialog()

  async function logout({ redirectHome = true } = {}) {
    console.log('[Logout] 开始退出登录')

    stopAllAudios()

    try {
      await dialog.disconnect()
      await refreshRealtimeStatus()
    } catch (error) {
      console.warn('[Logout] 断开 WebRTC 失败:', error)
    }

    authStore.logout()
    testStore.resetTest()
    sessionStore.clearSnapshot()

    if (redirectHome) {
      await router.push('/')
    }

    console.log('[Logout] 退出登录完成')
  }

  return { logout }
}
