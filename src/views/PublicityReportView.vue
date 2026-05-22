<template>
  <div class="publicity-page">
    <header class="publicity-toolbar">
      <button
        type="button"
        class="publicity-back"
        @click="goBack"
      >
        ← 返回
      </button>
      <span class="publicity-title">报告解读版</span>
    </header>

    <div
      v-if="isLoading"
      class="publicity-status"
    >
      正在加载…
    </div>
    <div
      v-else-if="errorMessage"
      class="publicity-status publicity-status--error"
    >
      <p>{{ errorMessage }}</p>
      <button
        type="button"
        class="publicity-retry"
        @click="loadReport"
      >
        重试
      </button>
    </div>
    <iframe
      v-else-if="htmlContent"
      class="publicity-frame"
      :srcdoc="htmlContent"
      title="报告解读版"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import useApi from '@/composables/useApi'
import {
  parsePublicityHtmlResponse,
  preparePublicityHtmlDocument,
  readStashedPublicityHtml,
  clearStashedPublicityHtml
} from '@/utils/publicityReport'

const router = useRouter()
const authStore = useAuthStore()
const api = useApi()

const isLoading = ref(true)
const errorMessage = ref('')
const htmlContent = ref('')

function getUserId() {
  return authStore.userInfo?.username || authStore.userInfo?.phone || ''
}

async function loadReport() {
  isLoading.value = true
  errorMessage.value = ''

  const cached = readStashedPublicityHtml()
  if (cached) {
    htmlContent.value = cached
    isLoading.value = false
    return
  }

  const userId = getUserId()
  if (!userId) {
    errorMessage.value = '用户信息不存在，请重新登录'
    isLoading.value = false
    return
  }

  try {
    const response = await api.getPublicityReport(userId)
    const raw = parsePublicityHtmlResponse(response)
    if (!raw) {
      errorMessage.value = '暂无报告解读版内容'
      isLoading.value = false
      return
    }
    htmlContent.value = preparePublicityHtmlDocument(raw)
  } catch (e) {
    console.error('[PublicityReportView] 加载失败:', e)
    errorMessage.value = e?.message || '加载失败，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/test')
  }
}

onMounted(() => {
  loadReport()
})

onUnmounted(() => {
  clearStashedPublicityHtml()
})
</script>

<style scoped>
.publicity-page {
  position: fixed;
  inset: 0;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  background: #0f172a;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.publicity-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  padding-left: calc(14px + env(safe-area-inset-left, 0px));
  padding-right: calc(14px + env(safe-area-inset-right, 0px));
  background: rgba(10, 15, 30, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.publicity-back {
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.publicity-title {
  color: rgba(255, 255, 255, 0.9);
  font-size: 15px;
  font-weight: 600;
}

.publicity-frame {
  flex: 1;
  width: 100%;
  min-height: 0;
  border: none;
  background: #fff;
}

.publicity-status {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 15px;
  text-align: center;
}

.publicity-status--error p {
  margin: 0;
  line-height: 1.6;
}

.publicity-retry {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background: #3b82f6;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}
</style>
