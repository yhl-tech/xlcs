<template>
  <div class="report-flow-container">
    <div class="rf-wrapper-new">
      <!-- 左侧：核心进度看板 -->
      <div class="rf-left-panel">
        <!-- 报告下载区域 - 报告就绪时显示在顶部 -->
        <div  class="rf-download-section">
          <div class="rf-download-header">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span>报告已生成完毕</span>
          </div>
          <div class="rf-download-buttons">
            <button
              class="rf-download-btn rf-download-btn-primary"
              :class="{ 'is-loading': isDownloadingReport }"
              :disabled="!reportNewPdf || isDownloadingReport"
              @click="handleDownloadReport"
            >
              <span
                v-if="isDownloadingReport"
                class="rf-download-spinner"
                aria-hidden="true"
              />
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {{ isDownloadingReport ? '下载中…' : '下载测试报告' }}
            </button>
            <button class="rf-download-btn rf-download-btn-secondary" @click="handleOpenPublicityReport" :disabled="!reportHtml">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              报告解读版
            </button>
            <button
              class="rf-download-btn rf-download-btn-secondary"
              :class="{ 'is-loading': isDownloadingMajorReport }"
              :disabled="isDownloadingMajorReport"
              @click="handleDownloadMajorRecommendation"
            >
              <span
                v-if="isDownloadingMajorReport"
                class="rf-download-spinner"
                aria-hidden="true"
              />
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c0 1.7 3.3 3 7 3s7-1.3 7-3v-5"/>
              </svg>
              {{ isDownloadingMajorReport ? '下载中…' : '大学专业推荐报告' }}
            </button>
          </div>
        </div>
        
        <div class="rf-card-main">
          <!-- 步骤详情 -->
          <div class="rf-steps-detail">
            <div
              v-for="(step, index) in steps"
              :key="step.id"
              class="rf-step-detail-item"
              :class="{ 'rf-step-line': index < steps.length - 1, 'rf-step-line-completed': index < currentStepIndex }"
            >
              <div
                class="rf-step-icon"
                :class="{
                  'rf-step-icon-completed': index < currentStepIndex || (isCompleted && index === currentStepIndex),
                  'rf-step-icon-active': index === currentStepIndex && !isCompleted,
                  'rf-step-icon-pending': index > currentStepIndex
                }"
              >
                <svg
                  v-if="index < currentStepIndex || (isCompleted && index === currentStepIndex)"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <svg
                  v-else-if="index === currentStepIndex && !isCompleted"
                  xmlns="http://www.w3.org/2000/svg"
                  class="rf-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <component
                  :is="getStepIcon(step.icon)"
                  v-else
                />
              </div>
              <div class="rf-step-content">
                <div class="rf-step-header">
                  <div>
                    <h3
                      class="rf-step-title"
                      :class="{
                        'rf-step-title-completed': index < currentStepIndex || (isCompleted && index === currentStepIndex),
                        'rf-step-title-active': index === currentStepIndex && !isCompleted,
                        'rf-step-title-pending': index > currentStepIndex
                      }"
                    >
                      {{ step.label }}
                      <span
                        v-if="index === currentStepIndex && !isCompleted"
                        class="rf-dots"
                      >{{ dots }}</span>
                    </h3>
                    <p
                      class="rf-step-desc"
                      :class="{
                        'rf-step-desc-completed': index < currentStepIndex || (isCompleted && index === currentStepIndex),
                        'rf-step-desc-active': index === currentStepIndex && !isCompleted,
                        'rf-step-desc-pending': index > currentStepIndex
                      }"
                    >
                      {{ step.desc }}
                    </p>
                  </div>
                  <span
                    v-if="index < currentStepIndex || (isCompleted && index === currentStepIndex)"
                    class="rf-step-badge rf-step-badge-completed"
                  >
                    <svg
                      class="rf-check-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M20 6L9 17L4 12"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </span>
                  <span
                    v-else-if="index === currentStepIndex && !isCompleted"
                    class="rf-step-badge rf-step-badge-active"
                  >处理中</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：专业背书与辅助信息 -->
      <div class="rf-right-panel">
        <!-- 核心背书卡片 -->
        <div class="rf-endorsement-card">
          <div class="rf-endorsement-bg" />
          <div class="rf-endorsement-content">
            <div class="rf-endorsement-header">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                />
                <line
                  x1="12"
                  y1="16"
                  x2="12"
                  y2="12"
                />
                <line
                  x1="12"
                  y1="8"
                  x2="12.01"
                  y2="8"
                />
              </svg>
              <span class="rf-endorsement-label">严谨性告知</span>
            </div>
            <div class="rf-endorsement-title">
              严谨，是对每一个<br>
              内心真相的起码尊重
            </div>
            <div class="rf-endorsement-items">
              <div class="rf-endorsement-item">
                <div class="rf-endorsement-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle
                      cx="11"
                      cy="11"
                      r="8"
                    />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <p>
                  <b>非模板化生成：</b> 我们拒绝 1 秒出的快餐式结论。每个报告都需经过高阶算法的深度神经映射模拟计算。
                </p>
              </div>
              <div class="rf-endorsement-item">
                <div class="rf-endorsement-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                    />
                    <line
                      x1="2"
                      y1="12"
                      x2="22"
                      y2="12"
                    />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                <p>
                  <b>常模数据库：</b> 实时对比 10 万+ 中国成年人心理样本，确保您的测评结果具有科学且精准的定位参考。
                </p>
              </div>
              <div class="rf-endorsement-quote">
                "正如精密血检需要大型仪器分析，高质量的心理洞察需要深度计算与专家人工复核。请耐心等待，确保结论的可信度。"
              </div>
            </div>
          </div>
        </div>

        <!-- 安全保证板块 -->
        <div class="rf-security-card">
          <div class="rf-security-header">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <h3 class="rf-security-title">
              数据安全保护
            </h3>
          </div>
          <div class="rf-security-body">
            <div class="rf-security-row">
              <span class="rf-security-label">数据传输加密</span>
              <span class="rf-security-value">AES-256 BIT</span>
            </div>
            <div class="rf-security-progress">
              <div class="rf-security-progress-bar" />
            </div>
            <p class="rf-security-desc">
              您的隐私受严格保护。分析过程中，所有原始数据均处于隔离计算状态，分析完成后仅保留核心洞察结论。
            </p>
          </div>
        </div>

        <!-- 底部小标识 -->
        <div class="rf-footer-badge">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect
              x="3"
              y="11"
              width="18"
              height="11"
              rx="2"
              ry="2"
            />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          全链路数据加密
          <div class="rf-footer-dot" />
          塞拉
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, h } from 'vue'
import { useRouter } from 'vue-router'
import useApi from '@/composables/useApi'
import { useAuthStore } from '@/stores/authStore'
import { useTestStore } from '@/stores/testStore'
import {
  parsePublicityHtmlResponse,
  preparePublicityHtmlDocument,
  shouldOpenPublicityInApp,
  openPublicityInNewWindow,
  stashPublicityHtmlForInApp
} from '@/utils/publicityReport'
import { normalizeBasicInfoResponse, parseAgeFromBasicInfo } from '@/utils/basicInfo'

const props = defineProps({
  sessionId: {
    type: String,
    default: ''
  }
})

const router = useRouter()
const api = useApi()
const authStore = useAuthStore()
const testStore = useTestStore()

// 步骤数据
const steps = [
  { id: 'submit', label: '提交数据', icon: 'upload', desc: '数据已通过 256-bit 高强度加密通道上传至云端分析中心' },
  { id: 'validate', label: '数据校验', icon: 'shieldCheck', desc: '正在对比历史常模基准，排除极端值与无效作答干扰' },
  { id: 'ai', label: 'AI 模型计算', icon: 'brain', desc: '深度神经网络正在提取 128 个心理特征维度，匹配 10万+ 样本数据。报告将会在6-8小时内生成，请您耐心等待，现在您可以点击右上角的”退出“按钮，退出当前页面了。' },
  { id: 'review', label: '心理师人工复核', icon: 'userCheck', desc: '资深心理专家（执业 5 年以上）将结合 AI 报告进行逻辑校对与深度专业建议' },
  { id: 'generate', label: '报告生成', icon: 'fileText', desc: '多端适配排版，生成包含 20+ 页的深度心理洞察 PDF 报告' }
]

// 状态
const currentStepIndex = ref(2) // 默认在 AI 模型计算阶段
const isCompleted = ref(false)
const reportNewPdf = ref(false)
const reportHtml = ref(false)
const isDownloadingReport = ref(false)
const showMajorRecommendation = ref(false)
const isDownloadingMajorReport = ref(false)
const dots = ref('...')

// 定时器
let dotTimer = null
let checkTimer = null

// 动态点动画
function startDotAnimation() {
  let count = 0
  dotTimer = setInterval(() => {
    count = (count + 1) % 4
    dots.value = '.'.repeat(count || 1)
  }, 500)
}

// 获取步骤图标组件
function getStepIcon(iconName) {
  const icons = {
    upload: () => h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }, [
      h('path', { d: 'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242' }),
      h('path', { d: 'M12 12v9' }),
      h('path', { d: 'm16 16-4-4-4 4' })
    ]),
    shieldCheck: () => h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }, [
      h('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }),
      h('path', { d: 'm9 12 2 2 4-4' })
    ]),
    brain: () => h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }, [
      h('path', { d: 'M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z' }),
      h('path', { d: 'M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z' }),
      h('path', { d: 'M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4' })
    ]),
    userCheck: () => h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }, [
      h('path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }),
      h('circle', { cx: '9', cy: '7', r: '4' }),
      h('polyline', { points: '16 11 18 13 22 9' })
    ]),
    fileText: () => h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }, [
      h('path', { d: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' }),
      h('polyline', { points: '14 2 14 8 20 8' }),
      h('line', { x1: '16', y1: '13', x2: '8', y2: '13' }),
      h('line', { x1: '16', y1: '17', x2: '8', y2: '17' }),
      h('line', { x1: '10', y1: '9', x2: '8', y2: '9' })
    ])
  }
  return icons[iconName] || icons.upload
}

// 获取用户ID
function getUserId() {
  return authStore.userInfo?.username || authStore.userInfo?.phone || props.sessionId
}

function parseAgeFromStoredBasicInfo() {
  return parseAgeFromBasicInfo(testStore.basicInfo)
}

async function loadMajorRecommendationEligibility() {
  const cachedAge = parseAgeFromStoredBasicInfo()
  if (cachedAge !== null) {
    showMajorRecommendation.value = cachedAge < 20
    return
  }

  const userId = getUserId()
  if (!userId) return

  try {
    const response = await api.getBasicInfo(userId)
    const basicInfo = normalizeBasicInfoResponse(response)
    if (basicInfo) {
      testStore.setBasicInfo(basicInfo)
    }
    const age = parseAgeFromBasicInfo(basicInfo ?? response?.data ?? response)
    showMajorRecommendation.value = age !== null && age < 20
    console.log('[WaitingReport] 专业推荐报告可见性:', showMajorRecommendation.value, 'age:', age)
  } catch (error) {
    console.warn('[WaitingReport] 获取基本信息失败:', error)
    showMajorRecommendation.value = false
  }
}

// 检查报告状态
async function checkReportStatus() {
  try {
    const userId = getUserId()
    if (!userId) {
      console.warn('[WaitingReport] 无用户ID')
      return
    }
    
    // 先检查 testStore 中的报告状态
    if (testStore.reportStatus?.isReady) {
      isCompleted.value = true
      currentStepIndex.value = steps.length - 1
      await loadMajorRecommendationEligibility()
      if (checkTimer) {
        clearInterval(checkTimer)
      }
      return
    }
    
    const response = await api.checkReportStatus(userId)
    console.log('[WaitingReport] 报告状态:', response)

    // 解析报告状态: new_pdf 对应下载测试报告，html 对应报告解读版
    const newPdf = response.code === 0 && response.data?.new_pdf === true
    const html = response.code === 0 && response.data?.html === true

    reportNewPdf.value = newPdf
    reportHtml.value = html

    if (newPdf || html) {
      isCompleted.value = true
      currentStepIndex.value = steps.length - 1
      testStore.setReportStatus({
        status: 'ready',
        isReady: true,
        message: response.msg || '报告已生成'
      })
      await loadMajorRecommendationEligibility()
      if (checkTimer) {
        clearInterval(checkTimer)
      }
    }
  } catch (error) {
    console.warn('检查报告状态失败:', error)
  }
}

// 下载报告
async function handleDownloadReport() {
  if (isDownloadingReport.value) return

  const userId = getUserId()
  if (!userId) {
    alert('用户信息不存在，请重新登录')
    return
  }

  isDownloadingReport.value = true
  try {
    console.log('[WaitingReport] 开始下载报告:', userId)
    const response = await api.downloadReport(userId)
    
    // blob 响应返回完整的 response 对象，需要取 response.data
    const blob = response.data || response
    
    if (!(blob instanceof Blob)) {
      console.error('[WaitingReport] 返回的不是 Blob:', typeof blob)
      alert('服务器返回的数据格式不正确，请稍后重试')
      return
    }
    
    if (blob.size < 100) {
      alert('报告文件异常，请稍后重试')
      return
    }
    
    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = `rorschach-test-report-${userId}.pdf`
    document.body.appendChild(a)
    a.click()
    
    // 延迟清理，确保下载开始
    setTimeout(() => {
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }, 100)
    
    console.log('[WaitingReport] 报告下载完成')
  } catch (error) {
    console.error('[WaitingReport] 下载报告失败:', error)
    alert(error.message || '下载失败，请稍后重试')
  } finally {
    isDownloadingReport.value = false
  }
}

async function handleDownloadMajorRecommendation() {
  if (isDownloadingMajorReport.value) return

  const userId = getUserId()
  if (!userId) {
    alert('用户信息不存在，请重新登录')
    return
  }

  isDownloadingMajorReport.value = true
  try {
    console.log('[WaitingReport] 开始下载大学专业推荐报告:', userId)
    const response = await api.getReportMajorRecommendation(userId)
    const blob = response.data || response

    if (!(blob instanceof Blob)) {
      console.error('[WaitingReport] 专业推荐报告返回的不是 Blob:', typeof blob)
      alert('服务器返回的数据格式不正确，请稍后重试')
      return
    }

    if (blob.size < 100) {
      alert('专业推荐报告文件异常，请稍后重试')
      return
    }

    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = `major-recommendation-${userId}.html`
    document.body.appendChild(a)
    a.click()

    setTimeout(() => {
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }, 100)

    console.log('[WaitingReport] 大学专业推荐报告下载完成')
  } catch (error) {
    console.error('[WaitingReport] 下载大学专业推荐报告失败:', error)
    alert(error.message || '下载失败，请稍后重试')
  } finally {
    isDownloadingMajorReport.value = false
  }
}

// 打开报告解读版
async function handleOpenPublicityReport() {
  try {
    const userId = getUserId()
    if (!userId) {
      alert('用户信息不存在，请重新登录')
      return
    }

    console.log('[WaitingReport] 获取报告解读版:', userId)
    const response = await api.getPublicityReport(userId)
    const rawHtml = parsePublicityHtmlResponse(response)

    console.log(
      '[WaitingReport] 解读版解析结果:',
      rawHtml ? `HTML 长度 ${rawHtml.length}` : '无有效 HTML'
    )

    if (!rawHtml) {
      alert('暂无报告解读版')
      return
    }

    const html = preparePublicityHtmlDocument(rawHtml)

    // 移动端系统浏览器：blob + 新标签易白屏，改应用内全屏 iframe
    if (shouldOpenPublicityInApp()) {
      stashPublicityHtmlForInApp(html)
      await router.push({ name: 'PublicityReport' })
      console.log('[WaitingReport] 报告解读版（应用内）已打开')
      return
    }

    if (!openPublicityInNewWindow(html)) {
      stashPublicityHtmlForInApp(html)
      await router.push({ name: 'PublicityReport' })
      console.log('[WaitingReport] 弹窗被拦截，改用应用内打开')
      return
    }

    console.log('[WaitingReport] 报告解读版（新窗口）已打开')
  } catch (error) {
    console.error('[WaitingReport] 获取报告解读版失败:', error)
    alert(error.message || '获取失败，请稍后重试')
  }
}

onMounted(() => {
  startDotAnimation()
  
  // 检查是否已有报告就绪状态
  if (testStore.reportStatus?.isReady) {
    isCompleted.value = true
    currentStepIndex.value = steps.length - 1
    loadMajorRecommendationEligibility()
  } else {
    // 定期检查报告状态
    checkReportStatus()
    checkTimer = setInterval(checkReportStatus, 30000)
  }
})

onUnmounted(() => {
  if (dotTimer) {
    clearInterval(dotTimer)
  }
  if (checkTimer) {
    clearInterval(checkTimer)
  }
})
</script>

<style lang="less" scoped>
/* 报告等待流程样式 */

:root {
  --rf-blue-600: #2563eb;
  --rf-blue-500: #3b82f6;
  --rf-blue-100: #dbeafe;
  --rf-blue-50: #eff6ff;
  --rf-green-500: #22c55e;
  --rf-green-400: #4ade80;
  --rf-amber-600: #d97706;
  --rf-amber-50: #fffbeb;
  --rf-amber-100: #fef3c7;
  --rf-slate-800: #1e293b;
  --rf-slate-700: #334155;
  --rf-slate-600: #475569;
  --rf-slate-500: #64748b;
  --rf-slate-400: #94a3b8;
  --rf-slate-300: #cbd5e1;
  --rf-slate-200: #e2e8f0;
  --rf-slate-100: #f1f5f9;
  --rf-slate-50: #f8fafc;
  --rf-white: #ffffff;
}

.report-flow-container {
  width: 100%;
  min-height: 100vh;
  padding: 2rem;
  padding-top: 90px; /* 为顶部导航栏留出空间 */
  box-sizing: border-box;
  color: #1e293b;
  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* 主容器 - 左右布局 */
.rf-wrapper-new {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  align-items: start;
  max-width: 1200px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
}

@media (min-width: 1024px) {
  .rf-wrapper-new {
    grid-template-columns: 7fr 5fr;
  }
}

/* 左侧面板 */
.rf-left-panel {
  display: flex;
  flex-direction: column;
}

.rf-card-main {
  background: rgba(255, 255, 255, 0.6);
  border-radius: 1.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

/* 下载区域 - 顶部卡片 */
.rf-download-section {
  padding: 0.875rem 1.25rem;
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 0.875rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.rf-download-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: #22c55e;
  font-weight: 600;
  font-size: 0.9rem;
  
  svg {
    width: 1.125rem;
    height: 1.125rem;
  }
}

.rf-download-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.rf-download-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.25rem;
  border-radius: 0.625rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  
  svg {
    width: 1rem;
    height: 1rem;
  }
}

.rf-download-btn-primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  &.is-loading {
    cursor: wait;
  }
}

.rf-download-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.rf-download-btn-secondary {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.3);
  
  &:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.5);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  &.is-loading {
    cursor: wait;
  }

  .rf-download-spinner {
    border-color: rgba(37, 99, 235, 0.25);
    border-top-color: #2563eb;
  }
}

/* 步骤详情区域 */
.rf-steps-detail {
  padding: 2.5rem;
}

.rf-step-detail-item {
  display: flex;
  gap: 2rem;
  position: relative;
  padding-bottom: 3rem;
}

.rf-step-detail-item:last-child {
  padding-bottom: 0;
}

/* 步骤连接线 */
.rf-step-line::after {
  content: '';
  position: absolute;
  left: 1.75rem;
  top: 3.5rem;
  width: 2px;
  height: calc(100% - 2rem);
  background-color: #f1f5f9;
  z-index: 0;
}

.rf-step-line-completed::after {
  background-color: #4169E1;
}

/* 步骤图标 */
.rf-step-icon {
  position: relative;
  z-index: 10;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s;
}

.rf-step-icon svg {
  width: 1.75rem;
  height: 1.75rem;
}

.rf-step-icon-completed {
  background-color: #4169E1;
  color: #ffffff;
  box-shadow: 0 10px 15px -3px rgba(65, 105, 225, 0.3);
}

.rf-step-icon-active {
  background-color: #ffffff;
  color: #4169E1;
  border: 2px solid #4169E1;
  box-shadow: 0 20px 25px -5px rgba(65, 105, 225, 0.1), 0 0 0 4px rgba(65, 105, 225, 0.1);
  animation: pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.rf-step-icon-pending {
  background-color: #f8fafc;
  color: #cbd5e1;
  border: 1px solid #f1f5f9;
}

/* 步骤内容 */
.rf-step-content {
  flex: 1;
}

.rf-step-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.rf-step-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #4169E1;
  margin: 0 0 0.375rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rf-step-title-completed {
  color: #4169E1;
}

.rf-step-title-active {
  font-size: 1.25rem;
  color: #4169E1;
}

.rf-step-title-pending {
  color: #cbd5e1;
}

.rf-dots {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #60a5fa;
  min-width: 1.5rem;
  display: inline-block;
}

.rf-step-desc {
  font-size: 0.875rem;
  line-height: 1.625;
  color: #64748b;
  margin: 0;
  max-width: 32rem;
}

.rf-step-desc-completed {
  color: #64748b;
}

.rf-step-desc-active {
  color: #475569;
}

.rf-step-desc-pending {
  color: #cbd5e1;
}

/* 步骤状态徽章 */
.rf-step-badge {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  white-space: nowrap;
  flex-shrink: 0;
}

.rf-step-badge-completed {
  color: #22c55e;
  background-color: transparent;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rf-check-icon {
  width: 24px;
  height: 24px;
  color: #22c55e;
}

.rf-step-badge-active {
  color: #d97706;
  background-color: #fffbeb;
  border: 1px solid #fef3c7;
}

/* 右侧面板 */
.rf-right-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 背书卡片 */
.rf-endorsement-card {
  background: rgba(255, 255, 255, 0.6);
  padding: 2rem;
  border-radius: 1.5rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.rf-endorsement-bg {
  position: absolute;
  right: -3rem;
  top: -3rem;
  width: 12rem;
  height: 12rem;
  background-color: #dbeafe;
  border-radius: 9999px;
  opacity: 0.5;
  filter: blur(3rem);
}

.rf-endorsement-content {
  position: relative;
  z-index: 1;
}

.rf-endorsement-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #1d4ed8;
  margin-bottom: 1rem;
}

.rf-endorsement-header svg {
  width: 1.25rem;
  height: 1.25rem;
  color: #60A5FA;
}

.rf-endorsement-label {
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #60A5FA;
}

.rf-endorsement-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #000000;
  margin: 0 0 1.5rem 0;
  line-height: 1.3;
}

.rf-endorsement-items {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  font-size: 0.875rem;
  color: #475569;
  line-height: 1.625;
}

.rf-endorsement-item {
  display: flex;
  gap: 1rem;
}

.rf-endorsement-icon {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  background-color: #DBEAFE;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4169E1;
}

.rf-endorsement-icon svg {
  width: 1rem;
  height: 1rem;
}

.rf-endorsement-item p {
  margin: 0;
}

.rf-endorsement-quote {
  border-top: 1px solid #dbeafe;
  padding-top: 1.5rem;
  margin-top: 1.5rem;
  font-style: italic;
  color: #64748b;
  font-size: 0.75rem;
}

/* 安全卡片 */
.rf-security-card {
  background: rgba(255, 255, 255, 0.6);
  padding: 2rem;
  border-radius: 1.5rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.rf-security-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.rf-security-header svg {
  width: 1.5rem;
  height: 1.5rem;
  color: #22c55e;
}

.rf-security-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #4169E1;
  margin: 0;
}

.rf-security-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.rf-security-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
}

.rf-security-label {
  color: #64748b;
  font-weight: 500;
}

.rf-security-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 700;
  color: #4169E1;
}

.rf-security-progress {
  width: 100%;
  background-color: #f1f5f9;
  height: 0.375rem;
  border-radius: 9999px;
  overflow: hidden;
}

.rf-security-progress-bar {
  background-color: #22c55e;
  height: 100%;
  width: 100%;
  opacity: 0.8;
}

.rf-security-desc {
  font-size: 0.6875rem;
  color: #64748b;
  line-height: 1.625;
  margin: 0;
}

/* 底部徽章 */
.rf-footer-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-size: 0.625rem;
  color: #475569;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  padding-top: 1rem;
}

.rf-footer-badge svg {
  width: 0.75rem;
  height: 0.75rem;
}

.rf-footer-dot {
  width: 0.25rem;
  height: 0.25rem;
  background-color: #cbd5e1;
  border-radius: 9999px;
}

/* 动画 */
@keyframes pulse-soft {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.rf-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 响应式 */
@media (max-width: 640px) {
  .report-flow-container {
    padding: 1rem;
    padding-top: 80px;
  }

  .rf-download-section {
    position: sticky;
    top: 0;
    z-index: 30;
    flex-shrink: 0;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  }

  .rf-download-buttons {
    flex-direction: column;
    align-items: stretch;
  }

  .rf-download-btn {
    width: 100%;
    justify-content: center;
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }

  .rf-steps-detail {
    padding: 1.5rem;
  }

  .rf-step-detail-item {
    gap: 1rem;
  }

  .rf-step-icon {
    width: 2.5rem;
    height: 2.5rem;
  }

  .rf-step-icon svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .rf-step-line::after {
    left: 1.25rem;
  }

  .rf-step-header {
    flex-direction: column;
  }

  .rf-endorsement-card,
  .rf-security-card {
    padding: 1.5rem;
  }

  .rf-endorsement-title {
    font-size: 1.25rem;
  }
}
</style>
