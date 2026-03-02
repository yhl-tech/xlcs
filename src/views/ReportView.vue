<template>
  <div class="report-view">
    <div class="report-container">
      <div v-if="isLoading" class="report-loading">
        <LoadingOverlay message="正在加载报告..." />
      </div>

      <div v-else-if="error" class="report-error">
        <div class="error-card">
          <h2>加载失败</h2>
          <p>{{ error }}</p>
          <BaseButton variant="primary" @click="loadReport">
            重试
          </BaseButton>
        </div>
      </div>

      <div v-else-if="reportData" class="report-content">
        <header class="report-header">
          <h1>心理测评报告</h1>
          <p class="report-date">生成日期：{{ formatDateTime(reportData.createdAt) }}</p>
        </header>

        <section class="report-section">
          <h2>基本信息</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">性别</span>
              <span class="value">{{ reportData.basicInfo?.sex }}</span>
            </div>
            <div class="info-item">
              <span class="label">年龄</span>
              <span class="value">{{ reportData.basicInfo?.age }}</span>
            </div>
            <div class="info-item">
              <span class="label">学历</span>
              <span class="value">{{ reportData.basicInfo?.education }}</span>
            </div>
            <div class="info-item">
              <span class="label">职业</span>
              <span class="value">{{ reportData.basicInfo?.occupation }}</span>
            </div>
          </div>
        </section>

        <section class="report-section">
          <h2>测评结果</h2>
          <p class="report-summary">{{ reportData.summary || '报告内容正在生成中...' }}</p>
        </section>

        <footer class="report-footer">
          <BaseButton variant="primary" @click="downloadReport">
            下载报告
          </BaseButton>
          <BaseButton variant="secondary" @click="goHome">
            返回首页
          </BaseButton>
        </footer>
      </div>

      <div v-else class="report-empty">
        <div class="empty-card">
          <h2>暂无报告</h2>
          <p>您还没有完成测试，请先完成测试后查看报告。</p>
          <BaseButton variant="primary" @click="goToTest">
            开始测试
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { formatDateTime } from '@/utils/helpers'
import BaseButton from '@/components/common/BaseButton.vue'
import LoadingOverlay from '@/components/common/LoadingOverlay.vue'

const router = useRouter()
const route = useRoute()
const api = useApi()

const isLoading = ref(false)
const error = ref('')
const reportData = ref(null)

onMounted(() => {
  const sessionId = route.query.sessionId
  if (sessionId) {
    loadReport(sessionId)
  }
})

async function loadReport(sessionId) {
  isLoading.value = true
  error.value = ''

  try {
    const data = await api.getReportData(sessionId)
    reportData.value = data
  } catch (e) {
    error.value = e.response?.data?.message || '加载报告失败'
  } finally {
    isLoading.value = false
  }
}

async function downloadReport() {
  if (!reportData.value?.sessionId) return

  try {
    const blob = await api.downloadReport(reportData.value.sessionId)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `心理测评报告_${formatDateTime()}.pdf`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Download error:', e)
  }
}

function goHome() {
  router.push('/')
}

function goToTest() {
  router.push('/test')
}
</script>

<style scoped>
.report-view {
  min-height: 100vh;
  padding: 40px 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.report-container {
  max-width: 800px;
  margin: 0 auto;
}

.report-loading,
.report-error,
.report-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.error-card,
.empty-card {
  background: rgba(30, 30, 50, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  max-width: 400px;
}

.error-card h2,
.empty-card h2 {
  color: white;
  margin-bottom: 16px;
}

.error-card p,
.empty-card p {
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 24px;
}

.report-content {
  background: rgba(30, 30, 50, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 40px;
}

.report-header {
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.report-header h1 {
  color: white;
  font-size: 28px;
  margin-bottom: 8px;
}

.report-date {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.report-section {
  margin-bottom: 32px;
}

.report-section h2 {
  color: #8b5cf6;
  font-size: 18px;
  margin-bottom: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.info-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 16px;
}

.info-item .label {
  display: block;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  margin-bottom: 4px;
}

.info-item .value {
  color: white;
  font-size: 16px;
  font-weight: 500;
}

.report-summary {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.8;
}

.report-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
