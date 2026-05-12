import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

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

// 路由守卫
router.beforeEach((to, from, next) => {
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
  
  next()
})

// 路由后置守卫
router.afterEach((to, from) => {
  // 只在路由真正改变时滚动到顶部（排除首页内部滚动）
  if (to.path !== from.path) {
    window.scrollTo(0, 0)
  }
})

export default router
