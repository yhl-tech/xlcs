/**
 * 报告解读版 HTML 解析与打开方式
 * 移动端系统浏览器对 blob: + window.open 支持差，易白屏
 */

export const PUBLICITY_HTML_STORAGE_KEY = 'xlcs_publicity_report_html'

/**
 * 从接口响应中解析 HTML 字符串
 * @param {unknown} payload
 * @returns {string|null}
 */
export function parsePublicityHtmlResponse(payload) {
  if (payload == null) return null

  if (typeof payload === 'string') {
    const trimmed = payload.trim()
    if (!trimmed) return null

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const json = JSON.parse(trimmed)
        return parsePublicityHtmlResponse(json)
      } catch {
        /* 非 JSON，按 HTML 处理 */
      }
    }

    if (trimmed.length < 20 && !trimmed.includes('<')) {
      return null
    }
    return payload
  }

  if (typeof payload === 'object') {
    if (typeof payload.data === 'string') {
      return parsePublicityHtmlResponse(payload.data)
    }
    if (payload.data && typeof payload.data.html === 'string') {
      return payload.data.html
    }
    if (typeof payload.html === 'string') {
      return payload.html
    }
    if (payload.code !== undefined && payload.code !== 0) {
      return null
    }
  }

  return null
}

/**
 * 补全 viewport 等，便于手机浏览器渲染
 * @param {string} html
 * @returns {string}
 */
export function preparePublicityHtmlDocument(html) {
  let doc = html.trim()
  if (!doc) return ''

  const viewport =
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">'
  const charset = '<meta charset="utf-8">'

  if (!/<meta[^>]+charset/i.test(doc)) {
    if (/<head/i.test(doc)) {
      doc = doc.replace(/<head([^>]*)>/i, `<head$1>${charset}`)
    }
  }

  if (!/<meta[^>]+viewport/i.test(doc)) {
    if (/<head/i.test(doc)) {
      doc = doc.replace(/<head([^>]*)>/i, `<head$1>${viewport}`)
    } else if (/<html/i.test(doc)) {
      doc = doc.replace(/<html([^>]*)>/i, `<html$1><head>${charset}${viewport}</head>`)
    } else {
      doc = `<!DOCTYPE html><html><head>${charset}${viewport}</head><body>${doc}</body></html>`
    }
  }

  return doc
}

/**
 * 是否优先在应用内打开（移动 / 窄屏 / 弹窗被拦截）
 */
export function shouldOpenPublicityInApp() {
  if (typeof window === 'undefined') return true
  if (window.innerWidth <= 768) return true
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * 桌面端：document.write 新窗口（比 blob URL 更稳定）
 * @param {string} html
 * @returns {boolean} 是否成功打开
 */
export function openPublicityInNewWindow(html) {
  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) return false

  try {
    win.document.open()
    win.document.write(html)
    win.document.close()
    return true
  } catch (e) {
    console.error('[publicityReport] 新窗口写入失败:', e)
    try {
      win.close()
    } catch {
      /* ignore */
    }
    return false
  }
}

/**
 * 应用内打开：写入 sessionStorage 后由路由页展示
 * @param {string} html
 */
export function stashPublicityHtmlForInApp(html) {
  try {
    sessionStorage.setItem(PUBLICITY_HTML_STORAGE_KEY, html)
  } catch (e) {
    console.error('[publicityReport] sessionStorage 写入失败:', e)
    throw new Error('报告内容过大，无法在本地缓存，请使用电脑浏览器查看')
  }
}

export function readStashedPublicityHtml() {
  try {
    return sessionStorage.getItem(PUBLICITY_HTML_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function clearStashedPublicityHtml() {
  try {
    sessionStorage.removeItem(PUBLICITY_HTML_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
