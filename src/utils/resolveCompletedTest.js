import { useAuthStore } from '@/stores/authStore'
import { useTestStore } from '@/stores/testStore'
import useApi from '@/composables/useApi'
import { isReportStatusReady } from '@/utils/reportStatus'

let inflightCheck = null
let lastCheck = { userId: null, at: 0, result: null }
const CACHE_MS = 5000

function getUserId() {
  const authStore = useAuthStore()
  return authStore.userInfo?.username || authStore.userInfo?.phone || null
}

function applyWaitingPhase(reportStatus) {
  const testStore = useTestStore()
  const isReportReady = isReportStatusReady(reportStatus)

  testStore.setPhase('waiting')
  testStore.setReportStatus({
    status: isReportReady ? 'ready' : 'pending',
    isReady: isReportReady,
    message: reportStatus?.msg || (isReportReady ? '报告已生成' : '报告处理中...')
  })

  return isReportReady
}

async function fetchCompletedTestStatus(userId) {
  const api = useApi()
  const uploadStatus = await api.checkUploadFilesStatus(userId)

  if (uploadStatus.code !== 0 || uploadStatus.data !== true) {
    return { completed: false }
  }

  const reportStatus = await api.checkReportStatus(userId)
  applyWaitingPhase(reportStatus)

  return { completed: true, isReportReady: isReportStatusReady(reportStatus) }
}

/**
 * 检查用户是否已提交过测试；若已提交则写入 waiting 阶段状态
 * @returns {Promise<{ completed: boolean, isReportReady?: boolean }>}
 */
export async function resolveCompletedTestRedirect() {
  const userId = getUserId()
  const testStore = useTestStore()

  if (!userId) {
    testStore.setInitialCheckComplete(true)
    return { completed: false }
  }

  if (
    lastCheck.userId === userId &&
    lastCheck.result &&
    Date.now() - lastCheck.at < CACHE_MS
  ) {
    testStore.setInitialCheckComplete(true)
    return lastCheck.result
  }

  if (!inflightCheck) {
    inflightCheck = fetchCompletedTestStatus(userId)
      .then((result) => {
        lastCheck = { userId, at: Date.now(), result }
        return result
      })
      .catch((error) => {
        console.warn('[resolveCompletedTest] 检查失败:', error)
        const result = { completed: false }
        lastCheck = { userId, at: Date.now(), result }
        return result
      })
      .finally(() => {
        inflightCheck = null
        testStore.setInitialCheckComplete(true)
      })
  }

  return inflightCheck
}
