// 报告等待流程管理模块
export class ReportWaitingFlow {
  constructor() {
    this.steps = [
      { id: 'submit', label: '提交数据', icon: 'upload', desc: '您的测评数据已通过加密通道全程安全传输，系统已为您建立专属分析档案。' },
      { id: 'validate', label: '数据校验', icon: 'shieldCheck', desc: '智能系统正在对数据进行多重完整性校验与清洗，确保分析基础数据精准无误。' },
      { id: 'ai', label: 'AI 模型计算', icon: 'brain', desc: '心理大模型正在深度解析多维特征，结合自然语言处理技术构建您的深层心理画像。' },
      { id: 'review', label: '心理师人工复核', icon: 'userCheck', desc: '资深心理咨询师团队结合临床标准对 AI 结果进行双重复核，确保结论严谨可靠。' },
      { id: 'generate', label: '报告生成', icon: 'fileText', desc: '您的心理评估报告已生成完成，包含详细的分析维度与专业建议，可立即下载查看。' }
    ]

    // 模拟当前进度: 第3步 (AI模型计算)
    this.currentStepIndex = 1

    this.icons = {
      upload: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M12 12v9"></path><path d="m16 16-4-4-4 4"></path></svg>',
      shieldCheck: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>',
      brain: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"></path><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"></path><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"></path><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"></path><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"></path><path d="M3.477 10.896a4 4 0 0 1 .585-.396"></path><path d="M19.938 10.5a4 4 0 0 1 .585.396"></path><path d="M6 18a4 4 0 0 1-1.97-3.284"></path><path d="M17.97 14.716A4 4 0 0 1 16 18"></path></svg>',
      userCheck: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>',
      fileText: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>',
      check: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
      loader: '<svg xmlns="http://www.w3.org/2000/svg" class="rf-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>'
    }

    this.timerInterval = null
  }

  init(container, options = {}) {
    if (!container) return
    this.container = container
    this.isCompleted = options.completed || false
    if (this.isCompleted) {
      this.currentStepIndex = this.steps.length - 1
    } else {
      this.currentStepIndex = 2 // AI 模型计算
    }
    this.render()
  }

  render() {
    const currentStepData = this.steps[this.currentStepIndex]
    const eta = this.calculateETA()

    // 构建HTML结构
    const html = `
      <div class="rf-wrapper">
        <!-- 顶部：安全提示条 -->
        <div class="rf-notification">
            <div class="rf-notification-icon-bg">
                <svg xmlns="http://www.w3.org/2000/svg" class="rf-notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <span class="rf-notification-text">你的测试数据已安全上传，进入专业分析流程</span>
        </div>

        <div class="rf-content-padding">
            <!-- 标题区 -->
 
            <!-- 步骤条区域 -->
            <div class="rf-progress-area">
                <!-- 进度条背景 -->
                <div class="rf-track-bg"></div>
                
                <!-- 进度条前景 (动态) -->
                <div id="rf-progress-bar" class="rf-track-fill" style="width: 0%">
                    <div class="rf-track-glow"></div>
                </div>

                <!-- 步骤节点容器 -->
                <div class="rf-steps-container">
                    ${this.steps.map((step, index) => this.renderStep(step, index)).join('')}
                </div>
            </div>

            <!-- 动态详情卡片区域 -->
            <div class="rf-detail-card">
                <!-- 装饰背景圆 -->
                <div class="rf-detail-bg-deco"></div>

                <!-- 左侧：当前步骤图标 (大) -->
                <div class="rf-detail-icon-box" id="rf-detail-icon">
                    ${this.icons[currentStepData.icon]}
                </div>

                <!-- 中间：文本描述 -->
                <div class="rf-detail-content">
                    <div class="rf-detail-meta">
                        <span class="rf-tag">CURRENT STEP</span>
                        <span class="rf-counter" id="rf-step-counter">步骤 ${this.currentStepIndex + 1} / ${this.steps.length}</span>
                    </div>
                    <h3 class="rf-detail-title">
                        <span id="rf-detail-title-text">${currentStepData.label}</span>
                        <span id="rf-ping" class="rf-ping-dot"></span>
                    </h3>
                    <p class="rf-detail-desc" id="rf-detail-desc">
                        ${currentStepData.desc}
                    </p>
                </div>
            </div>

            <!-- 底部：信任背书说明 -->
            <div class="rf-security-box">
                <svg xmlns="http://www.w3.org/2000/svg" class="rf-security-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                <div class="rf-security-content">
                    <p class="rf-security-title">双重验证保障</p>
                    <p class="rf-security-desc">
                        我们的报告需资深心理师结合 AI 模型复核，确保结论可靠。在人工复核阶段，专家可能会根据具体情况微调分析参数，以保证结果的个性化与精准度。
                    </p>
                </div>
            </div>
        </div>
      </div>
    `
    this.container.innerHTML = html

    // 触发初始动画
    setTimeout(() => {
      this.updateProgressBar()
    }, 100)
  }

  renderStep(step, index) {
    const isCompleted = index < this.currentStepIndex || (this.isCompleted && index === this.currentStepIndex)
    const isCurrent = index === this.currentStepIndex && !this.isCompleted

    let circleClass = "rf-step-circle"
    let iconContent = ''
    let labelClass = "rf-step-label"

    if (isCompleted) {
      circleClass += " is-completed"
      iconContent = this.icons.check
      labelClass += " is-completed"
    } else if (isCurrent) {
      circleClass += " is-current"
      // 如果是最后一步，显示静态图标，否则显示loader
      if (index === this.steps.length - 1) {
        iconContent = `<div class="rf-pulse-icon">${this.icons[step.icon]}</div>`
      } else {
        iconContent = this.icons.loader
      }
      labelClass += " is-current"
    } else {
      circleClass += " is-pending"
      iconContent = this.icons[step.icon]
      labelClass += " is-pending"
    }

    return `
      <div class="rf-step-item">
          <div class="${circleClass}">
              <div class="rf-icon-inner">${iconContent}</div>
          </div>
          <div class="${labelClass}">
              ${step.label}
          </div>
      </div>
    `
  }

  updateProgressBar() {
    const progressBar = document.getElementById('rf-progress-bar')
    if (progressBar) {
      const percent = (this.currentStepIndex / (this.steps.length - 1)) * 100
      // 减去一点宽度以避免覆盖到圆圈中心之后太多
      progressBar.style.width = `calc(${percent}% - 2rem)`
    }
  }

  updateDetailCard() {
    const step = this.steps[this.currentStepIndex]
    const iconBox = document.getElementById('rf-detail-icon')
    if (iconBox) iconBox.innerHTML = this.icons[step.icon]

    const counter = document.getElementById('rf-step-counter')
    if (counter) counter.innerText = `步骤 ${this.currentStepIndex + 1} / ${this.steps.length}`

    const title = document.getElementById('rf-detail-title-text')
    if (title) title.innerText = step.label

    const desc = document.getElementById('rf-detail-desc')
    if (desc) desc.innerText = step.desc

    const ping = document.getElementById('rf-ping')
    const etaBox = document.getElementById('rf-eta-box')

    if (this.currentStepIndex === this.steps.length - 1) {
      if (ping) ping.style.display = 'none'
      if (etaBox) etaBox.style.opacity = '0'
    } else {
      if (ping) ping.style.display = 'inline-block'
      if (etaBox) etaBox.style.opacity = '1'
    }
  }

  calculateETA() {
    const date = new Date()
    date.setHours(date.getHours() + 2)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${month}月${day}日 ${hours}:${minutes}`
  }
}

export const reportWaitingFlow = new ReportWaitingFlow()
