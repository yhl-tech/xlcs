// 报告等待流程管理模块
export class ReportWaitingFlow {
  constructor() {
    this.steps = [
      { id: 'submit', label: '提交数据', icon: 'upload', desc: '数据已通过 256-bit 高强度加密通道上传至云端分析中心' },
      { id: 'validate', label: '数据校验', icon: 'shieldCheck', desc: '正在对比历史常模基准，排除极端值与无效作答干扰' },
      { id: 'ai', label: 'AI 模型计算', icon: 'brain', desc: '深度神经网络正在提取 128 个心理特征维度，匹配 10万+ 样本数据' },
      { id: 'review', label: '心理师人工复核', icon: 'userCheck', desc: '资深心理专家（执业 5 年以上）将结合 AI 报告进行逻辑校对与深度专业建议' },
      { id: 'generate', label: '报告生成', icon: 'fileText', desc: '多端适配排版，生成包含 20+ 页的深度心理洞察 PDF 报告' }
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
      loader: '<svg xmlns="http://www.w3.org/2000/svg" class="rf-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>',
      activity: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>',
      info: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
      search: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>',
      globe: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
      lock: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>'
    }

    this.timerInterval = null
    this.dotCount = 0
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
    this.startDotAnimation()
  }

  startDotAnimation() {
    if (this.timerInterval) clearInterval(this.timerInterval)
    this.timerInterval = setInterval(() => {
      const dotsElement = document.getElementById('rf-dots')
      if (dotsElement) {
        this.dotCount = (this.dotCount + 1) % 4
        dotsElement.textContent = '.'.repeat(this.dotCount)
      }
    }, 500)
  }

  render() {
    const html = `
      <div class="rf-wrapper-new">
        <!-- 左侧：核心进度看板 -->
        <div class="rf-left-panel">
          <div class="rf-card-main">
            <!-- 头部状态 -->
        

            <!-- 步骤详情 -->
            <div class="rf-steps-detail">
              ${this.steps.map((step, index) => this.renderStepDetail(step, index)).join('')}
            </div>
          </div>
        </div>

        <!-- 右侧：专业背书与辅助信息 -->
        <div class="rf-right-panel">
          <!-- 核心背书卡片 -->
          <div class="rf-endorsement-card">
            <div class="rf-endorsement-bg"></div>
            <div class="rf-endorsement-content">
              <div class="rf-endorsement-header">
                ${this.icons.info}
                <span class="rf-endorsement-label">严谨性告知</span>
              </div>
              <div class="rf-endorsement-title">
                严谨，是对每一个<br/>
                内心真相的起码尊重
              </div>
              <div class="rf-endorsement-items">
                <div class="rf-endorsement-item">
                  <div class="rf-endorsement-icon">
                    ${this.icons.search}
                  </div>
                  <p><b>非模板化生成：</b> 我们拒绝 1 秒出的快餐式结论。每个报告都需经过高阶算法的深度神经映射模拟计算。</p>
                </div>
                <div class="rf-endorsement-item">
                  <div class="rf-endorsement-icon">
                    ${this.icons.globe}
                  </div>
                  <p><b>常模数据库：</b> 实时对比 10 万+ 中国成年人心理样本，确保您的测评结果具有科学且精准的定位参考。</p>
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
              ${this.icons.shieldCheck}
              <h3 class="rf-security-title">数据安全保护</h3>
            </div>
            <div class="rf-security-body">
              <div class="rf-security-row">
                <span class="rf-security-label">数据传输加密</span>
                <span class="rf-security-value">AES-256 BIT</span>
              </div>
              <div class="rf-security-progress">
                <div class="rf-security-progress-bar"></div>
              </div>
              <p class="rf-security-desc">
                您的隐私受严格保护。分析过程中，所有原始数据均处于隔离计算状态，分析完成后仅保留核心洞察结论。
              </p>
            </div>
          </div>

          <!-- 底部小标识 -->
          <div class="rf-footer-badge">
            ${this.icons.lock}
            全链路数据加密
            <div class="rf-footer-dot"></div>
            知己心探
          </div>
        </div>
      </div>
    `
    this.container.innerHTML = html
  }

  renderStepDetail(step, index) {
    const isCompleted = index < this.currentStepIndex || (this.isCompleted && index === this.currentStepIndex)
    const isCurrent = index === this.currentStepIndex && !this.isCompleted
    const isLast = index === this.steps.length - 1

    let statusBadge = ''
    let iconClass = 'rf-step-icon'
    let iconContent = this.icons[step.icon]

    if (isCompleted) {
      statusBadge = '<span class="rf-step-badge rf-step-badge-completed">已核准</span>'
      iconClass += ' rf-step-icon-completed'
      iconContent = this.icons.check
    } else if (isCurrent) {
      statusBadge = '<span class="rf-step-badge rf-step-badge-active">处理中</span>'
      iconClass += ' rf-step-icon-active'
      iconContent = this.icons.loader
    } else {
      iconClass += ' rf-step-icon-pending'
    }

    const lineClass = isCompleted ? 'rf-step-line rf-step-line-completed' : 'rf-step-line'
    let titleClass = 'rf-step-title'
    let descClass = 'rf-step-desc'

    if (isCompleted) {
      titleClass += ' rf-step-title-completed'
      descClass += ' rf-step-desc-completed'
    } else if (isCurrent) {
      titleClass += ' rf-step-title-active'
      descClass += ' rf-step-desc-active'
    } else {
      titleClass += ' rf-step-title-pending'
      descClass += ' rf-step-desc-pending'
    }

    return `
      <div class="rf-step-detail-item ${!isLast ? lineClass : ''}">
        <div class="${iconClass}">
          ${iconContent}
        </div>
        <div class="rf-step-content">
          <div class="rf-step-header">
            <div>
              <h3 class="${titleClass}">
                ${step.label}
                ${isCurrent ? '<span id="rf-dots" class="rf-dots">...</span>' : ''}
              </h3>
              <p class="${descClass}">${step.desc}</p>
            </div>
            ${statusBadge}
          </div>
        </div>
      </div>
    `
  }

  destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }
}

export const reportWaitingFlow = new ReportWaitingFlow()
