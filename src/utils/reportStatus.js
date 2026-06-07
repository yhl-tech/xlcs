/**
 * 解析 get_report_status 接口响应
 * new_pdf: 下载测试报告
 * html: 报告解读版
 * major_recommendation: 大学专业推荐报告
 * old_pdf: 旧版报告标识，不影响前端按钮状态
 */
export function parseReportStatusFlags(response) {
  if (!response || response.code !== 0 || !response.data || typeof response.data !== 'object') {
    return {
      newPdf: false,
      html: false,
      majorRecommendation: false,
      isAnyReady: false
    }
  }

  const { new_pdf, html, major_recommendation } = response.data

  const newPdf = new_pdf === true
  const htmlReady = html === true
  const majorRecommendation = major_recommendation === true

  return {
    newPdf,
    html: htmlReady,
    majorRecommendation,
    isAnyReady: newPdf || htmlReady || majorRecommendation
  }
}

export function isReportStatusReady(response) {
  return parseReportStatusFlags(response).isAnyReady
}
