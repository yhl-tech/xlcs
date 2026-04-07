/**
 * 轮询 GET /realtime/status，供多组件共享同一份数据与单一定时器
 */
import { ref, onMounted, onUnmounted } from 'vue'

const POLL_MS = 20000

const activeConnections = ref(0)
const status = ref('idle')
const message = ref('')

let refCount = 0
let timer = null

async function fetchStatus() {
  try {
    const res = await fetch('/realtime/status')
    if (!res.ok) return
    const data = await res.json()
    activeConnections.value = typeof data.active_connections === 'number' ? data.active_connections : 0
    status.value = data.status || 'idle'
    message.value = typeof data.message === 'string' ? data.message : ''
  } catch {
    // 静默失败，保留上次成功展示
  }
}

function acquire() {
  refCount++
  if (refCount === 1) {
    fetchStatus()
    timer = setInterval(fetchStatus, POLL_MS)
  }
}

function release() {
  refCount = Math.max(0, refCount - 1)
  if (refCount === 0 && timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

export function useRealtimeStatus() {
  onMounted(() => {
    acquire()
  })
  onUnmounted(() => {
    release()
  })

  return {
    activeConnections,
    status,
    message,
    refresh: fetchStatus
  }
}
