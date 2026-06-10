import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { stopAllAudios } from '@/utils/audioManager'
import { resolveCompletedTestRedirect } from '@/utils/resolveCompletedTest'

// 路由配置
const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '塞拉 - 首页' }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '塞拉 - 登录' }
  },
  {
    path: '/prep',
    name: 'Prep',
    component: () => import('@/views/PrepView.vue'),
    meta: { 
      title: '塞拉 - 测试准备',
      requiresAuth: true 
    }
  },
  {
    path: '/intro',
    name: 'Intro',
    component: () => import('@/views/IntroView.vue'),
    meta: { 
      title: '塞拉 - 测试说明',
      requiresAuth: true 
    }
  },
  {
    path: '/test',
    name: 'Test',
    component: () => import('@/views/TestView.vue'),
    meta: { 
      title: '塞拉 - 测试',
      requiresAuth: true 
    }
  },
  {
    path: '/report',
    name: 'Report',
    component: () => import('@/views/ReportView.vue'),
    meta: { 
      title: '塞拉 - 报告',
      requiresAuth: true 
    }
  },
  {
    path: '/report/publicity',
    name: 'PublicityReport',
    component: () => import('@/views/PublicityReportView.vue'),
    meta: {
      title: '塞拉 - 报告解读版',
      requiresAuth: true
    }
  },
  // 404 页面
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/'
  }
]

// 创建路由实例
// 使用 import.meta.env.BASE_URL 自动读取 vite.config.js 中的 base 配置
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

const ROUTES_CHECK_COMPLETED_TEST = new Set(['Prep', 'Intro'])

// 路由守卫
router.beforeEach(async (to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title
  }
  
  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) {
      // 重定向到首页，带上 showLogin 参数触发登录弹窗
      next({
        path: '/',
        query: { showLogin: 'true', redirect: to.fullPath }
      })
      return
    }
  }

  // /login 路由重定向到首页并打开弹窗
  if (to.path === '/login') {
    next({ path: '/', query: { showLogin: 'true' } })
    return
  }

  // 进入准备页/说明页前先查是否已测过，避免已测用户看到表单并听完引导语音
  if (ROUTES_CHECK_COMPLETED_TEST.has(to.name)) {
    const uiStore = useUiStore()
    uiStore.showLoading('正在检查测试状态...')
    try {
      const { completed } = await resolveCompletedTestRedirect()
      if (completed) {
        next({ name: 'Test', replace: true })
        return
      }
    } catch (error) {
      console.warn('[Router] 检查测试状态失败:', error)
    } finally {
      uiStore.hideLoading()
    }
  }
  
  next()
})

// 路由后置守卫
router.afterEach((to, from) => {
  // 只在路由真正改变时滚动到顶部（排除首页内部滚动）
  if (to.path !== from.path) {
    window.scrollTo(0, 0)
  }

  // 回到首页且未登录时，确保媒体已停止（防止退出后音频/状态残留）
  if (to.name === 'Home') {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) {
      stopAllAudios()
    }
  }
})

export default router
