import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import lamejsUrl from 'lamejs/lame.min.js?url'

function loadLamejs() {
  if (window.lamejs && window.lamejs.Mp3Encoder) return

  const script = document.createElement('script')
  script.src = lamejsUrl
  script.async = true
  script.onload = () => {
    console.log('[App] lamejs 已加载')
  }
  script.onerror = () => {
    console.error('[App] lamejs 加载失败')
  }
  document.head.appendChild(script)
}

loadLamejs()

// 导入全局样式
import './assets/styles/app.css'
import './assets/styles/intro-preview-background.css'
import './assets/styles/waiting-report.css'
import './assets/styles/question-progress.css'

// 创建 Vue 应用
const app = createApp(App)

// 使用 Pinia 状态管理
const pinia = createPinia()
app.use(pinia)

// 使用路由
app.use(router)

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error('Vue Error:', err)
  console.error('Error Info:', info)
}

// 挂载应用
app.mount('#app')

// 开发环境启用 vConsole
if (import.meta.env.DEV) {
  import('vconsole').then((module) => {
    const VConsole = module.default
    new VConsole()
  })
}
