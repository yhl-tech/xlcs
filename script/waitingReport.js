// 等待报告生成页面 - 动画控制模块
export class WaitingReportManager {
  constructor() {
    this.canvases = {};
    this.particles = {};
    this.animationFrames = {};
    this.intervals = {};
    this.isActive = false;
  }

  // 初始化所有画布
  initCanvases() {
    this.canvases = {
      nebula: document.getElementById('nebula-canvas'),
      matrix: document.getElementById('matrix-canvas'),
      wordcloud: document.getElementById('wordcloud-canvas'),
      textParticle: document.getElementById('text-particle-canvas'),
      particle: document.getElementById('particle-canvas')
    };

    // 设置画布尺寸
    Object.values(this.canvases).forEach(canvas => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    });

    // 监听窗口大小变化
    window.addEventListener('resize', () => this.resizeCanvases());
  }

  // 调整画布尺寸
  resizeCanvases() {
    Object.values(this.canvases).forEach(canvas => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    });
  }

  // 启动等待报告动画
  start() {
    if (this.isActive) return;
    this.isActive = true;

    this.initCanvases();
    this.startNebulaAnimation();
    this.startMatrixAnimation();
    this.startWordCloudAnimation();
    this.startTextParticleAnimation();
    this.startParticleAnimation();
    this.startProgressTextCycle();
    this.startCoreStreamAnimation();
    this.startDataCounterAnimation();
    this.startSparkAnimation();
    this.startWordBurstAnimation();
    this.startDataStreamAnimation();
    this.startIntensityUpdate();
  }

  // 停止所有动画
  stop() {
    this.isActive = false;

    // 取消所有动画帧
    Object.values(this.animationFrames).forEach(id => cancelAnimationFrame(id));
    this.animationFrames = {};

    // 清除所有定时器
    Object.values(this.intervals).forEach(id => clearInterval(id));
    this.intervals = {};

    // 清空粒子数组
    this.particles = {};
  }

  // ==================== 星云背景效果 ====================
  startNebulaAnimation() {
    const canvas = this.canvases.nebula;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const particles = [];

    class NebulaParticle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.5 + 0.2;

        const colors = [
          { r: 102, g: 126, b: 234 },
          { r: 118, g: 75, b: 162 },
          { r: 240, g: 147, b: 251 }
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;

        this.opacity += (Math.random() - 0.5) * 0.02;
        this.opacity = Math.max(0.1, Math.min(0.7, this.opacity));
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`;
        ctx.fill();

        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 4);
        gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity * 0.5})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }

    for (let i = 0; i < 150; i++) {
      particles.push(new NebulaParticle());
    }

    const animate = () => {
      if (!this.isActive) return;

      ctx.fillStyle = 'rgba(10, 14, 39, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      this.animationFrames.nebula = requestAnimationFrame(animate);
    };
    animate();
  }

  // ==================== 矩阵数字雨效果 ====================
  startMatrixAnimation() {
    const canvas = this.canvases.matrix;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const matrixChars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);

    this.intervals.matrix = setInterval(() => {
      if (!this.isActive) return;

      ctx.fillStyle = 'rgba(10, 14, 39, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#667eea';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = matrixChars[Math.floor(Math.random() * matrixChars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillText(text, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }, 50);
  }

  // ==================== 词云效果 ====================
  startWordCloudAnimation() {
    const canvas = this.canvases.wordcloud;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const wordCloudData = [
      { text: '25岁', weight: 3, type: 'info' },
      { text: '男性', weight: 3, type: 'info' },
      { text: '本科', weight: 2.5, type: 'info' },
      { text: '工程师', weight: 3, type: 'info' },
      { text: '蝴蝶', weight: 5, type: 'keyword' },
      { text: '翅膀', weight: 3.5, type: 'keyword' },
      { text: '对称', weight: 3, type: 'keyword' },
      { text: '平衡', weight: 3.5, type: 'keyword' },
      { text: '神秘', weight: 4, type: 'keyword' }
    ];

    class WordCloudParticle {
      constructor(wordData) {
        this.text = wordData.text;
        this.weight = wordData.weight;
        this.type = wordData.type;
        this.fontSize = 14 + this.weight * 8;
        this.color = this.getColorByType();
        this.reset();
      }

      reset() {
        const side = Math.floor(Math.random() * 4);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        switch(side) {
          case 0: this.x = Math.random() * canvas.width; this.y = -50; break;
          case 1: this.x = canvas.width + 50; this.y = Math.random() * canvas.height; break;
          case 2: this.x = Math.random() * canvas.width; this.y = canvas.height + 50; break;
          case 3: this.x = -50; this.y = Math.random() * canvas.height; break;
        }

        this.targetX = centerX;
        this.targetY = centerY;
        this.speed = 0.3 + Math.random() * 0.3;
        this.opacity = 0;
        this.baseOpacity = 0.4 + Math.random() * 0.3;
        this.rotation = (Math.random() - 0.5) * 0.3;
        this.rotationSpeed = (Math.random() - 0.5) * 0.002;
      }

      getColorByType() {
        const colors = {
          info: { r: 102, g: 126, b: 234 },
          keyword: { r: 240, g: 147, b: 251 },
          emotion: { r: 118, g: 75, b: 162 }
        };
        return colors[this.type] || { r: 200, g: 200, b: 200 };
      }

      update() {
        const dx = this.x - this.targetX;
        const dy = this.y - this.targetY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 30) {
          this.x -= (dx / distance) * this.speed;
          this.y -= (dy / distance) * this.speed;

          const maxDistance = Math.max(canvas.width, canvas.height) * 0.5;
          const brightnessBoost = 1 + (1 - distance / maxDistance) * 1.5;
          this.opacity = Math.min(1, this.baseOpacity * brightnessBoost);
        } else {
          this.opacity -= 0.05;
          if (this.opacity <= 0) this.reset();
        }

        this.rotation += this.rotationSpeed;
      }

      draw() {
        if (this.opacity <= 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.font = `${this.fontSize}px -apple-system, "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`;
        ctx.shadowBlur = this.opacity * 15;
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`;
        ctx.fillText(this.text, 0, 0);
        ctx.restore();
      }
    }

    const particles = [];
    wordCloudData.forEach(wordData => {
      const count = Math.ceil(wordData.weight / 2);
      for (let i = 0; i < count; i++) {
        particles.push(new WordCloudParticle(wordData));
      }
    });

    const animate = () => {
      if (!this.isActive) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      this.animationFrames.wordcloud = requestAnimationFrame(animate);
    };
    animate();
  }

  // ==================== 文本粒子汇聚效果 ====================
  startTextParticleAnimation() {
    const canvas = this.canvases.textParticle;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const textFragments = ['蝴蝶', '翅膀', '对称', '平衡', '神秘', '动物', '心理特征', '性格分析'];

    class TextParticle {
      constructor() {
        this.reset();
      }

      reset() {
        const side = Math.floor(Math.random() * 4);
        switch(side) {
          case 0: this.x = Math.random() * canvas.width; this.y = -20; break;
          case 1: this.x = canvas.width + 20; this.y = Math.random() * canvas.height; break;
          case 2: this.x = Math.random() * canvas.width; this.y = canvas.height + 20; break;
          case 3: this.x = -20; this.y = Math.random() * canvas.height; break;
        }

        this.targetX = canvas.width / 2;
        this.targetY = canvas.height / 2;
        this.text = textFragments[Math.floor(Math.random() * textFragments.length)];
        this.fontSize = 12 + Math.random() * 8;
        this.speed = 1 + Math.random() * 2;
        this.opacity = 0;
        this.maxOpacity = 0.6 + Math.random() * 0.4;

        const colors = [
          { r: 102, g: 126, b: 234 },
          { r: 118, g: 75, b: 162 },
          { r: 240, g: 147, b: 251 }
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 10) {
          this.x += (dx / distance) * this.speed;
          this.y += (dy / distance) * this.speed;
          if (this.opacity < this.maxOpacity) this.opacity += 0.02;
        } else {
          this.opacity -= 0.03;
          if (this.opacity <= 0) this.reset();
        }
      }

      draw() {
        if (this.opacity <= 0) return;

        ctx.save();
        ctx.font = `${this.fontSize}px "Microsoft YaHei", sans-serif`;
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
      }
    }

    const particles = [];
    for (let i = 0; i < 50; i++) {
      particles.push(new TextParticle());
    }

    const animate = () => {
      if (!this.isActive) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      this.animationFrames.textParticle = requestAnimationFrame(animate);
    };
    animate();
  }

  // ==================== 粒子汇聚效果 ====================
  startParticleAnimation() {
    const canvas = this.canvases.particle;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    class ConvergingParticle {
      constructor() {
        this.reset();
      }

      reset() {
        const side = Math.floor(Math.random() * 4);
        switch(side) {
          case 0: this.x = Math.random() * canvas.width; this.y = -10; break;
          case 1: this.x = canvas.width + 10; this.y = Math.random() * canvas.height; break;
          case 2: this.x = Math.random() * canvas.width; this.y = canvas.height + 10; break;
          case 3: this.x = -10; this.y = Math.random() * canvas.height; break;
        }

        this.targetX = canvas.width / 2;
        this.targetY = canvas.height / 2;
        this.size = Math.random() * 3 + 1;
        this.speed = Math.random() * 2 + 1;
        this.opacity = Math.random() * 0.5 + 0.3;

        const colors = [
          { r: 102, g: 126, b: 234 },
          { r: 118, g: 75, b: 162 },
          { r: 240, g: 147, b: 251 }
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
          this.x += (dx / distance) * this.speed;
          this.y += (dy / distance) * this.speed;
        } else {
          this.reset();
        }

        if (distance < 200) {
          this.opacity = (distance / 200) * 0.8;
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`;
        ctx.fill();
      }
    }

    const particles = [];
    for (let i = 0; i < 80; i++) {
      particles.push(new ConvergingParticle());
    }

    const animate = () => {
      if (!this.isActive) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      this.animationFrames.particle = requestAnimationFrame(animate);
    };
    animate();
  }

  // ==================== 进度文字循环 ====================
  startProgressTextCycle() {
    const progressTexts = [
      "性格特质分析中...",
      "情绪稳定性评估中...",
      "人际关系模式分析中...",
      "认知风格评估中...",
      "压力应对策略分析中...",
      "自我认知维度评估中...",
      "情感表达模式分析中...",
      "行为倾向评估中...",
      "心理防御机制分析中...",
      "内在动机评估中...",
      "社交适应性分析中...",
      "创造性思维评估中...",
      "整合多维度分析结果...",
      "生成个性化报告..."
    ];

    let textIndex = 0;
    const progressTextElement = document.querySelector('.waiting-report-progress-text');
    if (!progressTextElement) return;

    this.intervals.progressText = setInterval(() => {
      if (!this.isActive) return;

      textIndex = (textIndex + 1) % progressTexts.length;
      progressTextElement.style.opacity = '0';

      setTimeout(() => {
        progressTextElement.textContent = progressTexts[textIndex];
        progressTextElement.style.opacity = '1';
      }, 300);
    }, 3000);
  }

  // ==================== 核心数据流 ====================
  startCoreStreamAnimation() {
    const coreStream = document.getElementById('core-stream');
    if (!coreStream) return;

    const dataChars = '01αβγδεζηθικλμνξοπρστυφχψω∑∏∫∂∇≈≠≤≥±×÷√∞';

    this.intervals.coreStream = setInterval(() => {
      if (!this.isActive) return;

      let streamText = '';
      for (let i = 0; i < 8; i++) {
        streamText += dataChars[Math.floor(Math.random() * dataChars.length)];
      }
      coreStream.textContent = streamText;
    }, 50);
  }

  // ==================== 数据计数器 ====================
  startDataCounterAnimation() {
    const dataCounter = document.getElementById('data-counter');
    if (!dataCounter) return;

    let dataCount = 0;
    let dataCountSpeed = 1;

    this.intervals.dataCounter = setInterval(() => {
      if (!this.isActive) return;

      dataCount += Math.floor(Math.random() * 100 * dataCountSpeed);

      let displayNum;
      if (dataCount >= 1000000) {
        displayNum = (dataCount / 1000000).toFixed(1) + 'M';
      } else if (dataCount >= 1000) {
        displayNum = (dataCount / 1000).toFixed(1) + 'K';
      } else {
        displayNum = dataCount.toString();
      }

      dataCounter.textContent = displayNum;
      dataCountSpeed = Math.min(10, dataCountSpeed + 0.01);
    }, 80);
  }

  // ==================== 火花效果 ====================
  startSparkAnimation() {
    const sparkContainer = document.getElementById('spark-container');
    if (!sparkContainer) return;

    const createSpark = () => {
      if (!this.isActive) return;

      const spark = document.createElement('div');
      spark.className = 'waiting-report-spark';

      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 30;
      const startX = 100 + Math.cos(angle) * distance;
      const startY = 100 + Math.sin(angle) * distance;

      spark.style.left = startX + 'px';
      spark.style.top = startY + 'px';

      const flyAngle = angle + (Math.random() - 0.5) * 0.5;
      const flyDistance = 30 + Math.random() * 50;
      spark.style.setProperty('--tx', Math.cos(flyAngle) * flyDistance + 'px');
      spark.style.setProperty('--ty', Math.sin(flyAngle) * flyDistance + 'px');

      const colors = ['#667eea', '#764ba2', '#f093fb', '#fff'];
      spark.style.background = colors[Math.floor(Math.random() * colors.length)];

      const size = 2 + Math.random() * 4;
      spark.style.width = size + 'px';
      spark.style.height = size + 'px';

      spark.style.animationDuration = (0.5 + Math.random() * 0.5) + 's';

      sparkContainer.appendChild(spark);
      setTimeout(() => spark.remove(), 1000);
    };

    this.intervals.spark = setInterval(createSpark, 100);
  }

  // ==================== 黑洞词云快速切换 ====================
  startWordBurstAnimation() {
    const blackholeWords = document.getElementById('blackhole-words');
    if (!blackholeWords) return;

    const flyingWords = [
      '蝴蝶', '翅膀', '对称', '平衡', '跳舞', '庆祝', '欢快', '蝙蝠',
      '夜行', '神秘', '动物', '爬树', '协调', '图案', '姿态', '感觉',
      '想到', '看到', '25岁', '男性', '本科', '工程师', '心理特征',
      '性格分析', '认知模式', '情感倾向', '思维方式', '创造力',
      '想象力', '社交性', '稳定性', '开放性', '严谨性', '外向性'
    ];

    const wordColors = ['#667eea', '#764ba2', '#f093fb', '#a855f7', '#ec4899', '#06b6d4'];

    const createFlyingWord = () => {
      const word = document.createElement('div');
      word.className = 'waiting-report-flying-word';
      word.textContent = flyingWords[Math.floor(Math.random() * flyingWords.length)];

      word.style.color = wordColors[Math.floor(Math.random() * wordColors.length)];
      const fontSize = 10 + Math.random() * 14;
      word.style.fontSize = fontSize + 'px';

      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 40;
      const startX = Math.cos(angle) * distance;
      const startY = Math.sin(angle) * distance;

      word.style.setProperty('--start-x', startX + 'px');
      word.style.setProperty('--start-y', startY + 'px');
      word.style.setProperty('--rotate', (Math.random() - 0.5) * 60 + 'deg');

      word.style.left = '50%';
      word.style.top = '50%';
      word.style.transform = 'translate(-50%, -50%)';

      const duration = 0.4 + Math.random() * 0.3;
      word.style.animationDuration = duration + 's';

      blackholeWords.appendChild(word);
      setTimeout(() => word.remove(), duration * 1000);
    };

    const createCenterWord = () => {
      const word = document.createElement('div');
      word.className = 'waiting-report-center-word';
      word.textContent = flyingWords[Math.floor(Math.random() * flyingWords.length)];

      const duration = 0.4 + Math.random() * 0.2;
      word.style.animationDuration = duration + 's';

      blackholeWords.appendChild(word);
      setTimeout(() => word.remove(), duration * 1000);
    };

    const createWordBurst = () => {
      if (!this.isActive) return;

      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        setTimeout(() => createFlyingWord(), i * 50);
      }

      if (Math.random() > 0.6) {
        setTimeout(createCenterWord, 100);
      }
    };

    const scheduleWordBurst = () => {
      if (!this.isActive) return;

      createWordBurst();
      const nextDelay = 200 + Math.random() * 200;
      this.intervals.wordBurst = setTimeout(scheduleWordBurst, nextDelay);
    };

    setTimeout(scheduleWordBurst, 1000);
  }

  // ==================== 数据流线 ====================
  startDataStreamAnimation() {
    const dataStreamsContainer = document.getElementById('data-streams');
    if (!dataStreamsContainer) return;

    const createDataStream = () => {
      if (!this.isActive) return;

      const stream = document.createElement('div');
      stream.className = 'waiting-report-data-stream';
      stream.style.left = `${Math.random() * 100}%`;
      stream.style.animationDelay = `${Math.random() * 2}s`;
      stream.style.animationDuration = `${1.5 + Math.random()}s`;
      dataStreamsContainer.appendChild(stream);

      setTimeout(() => stream.remove(), 3000);
    };

    this.intervals.dataStream = setInterval(createDataStream, 300);
  }

  // ==================== 动态增强效果 ====================
  startIntensityUpdate() {
    let intensityLevel = 1;

    this.intervals.intensity = setInterval(() => {
      if (!this.isActive) return;

      intensityLevel = Math.min(3, intensityLevel + 0.005);

      const disk = document.querySelector('.waiting-report-accretion-disk');
      if (disk) {
        disk.style.animationDuration = (8 / intensityLevel) + 's';
      }

      const waves = document.querySelectorAll('.waiting-report-energy-wave');
      waves.forEach(wave => {
        wave.style.animationDuration = (2 / intensityLevel) + 's';
      });

      const indicator = document.querySelector('.waiting-report-processing-indicator');
      if (indicator) {
        indicator.style.animationDuration = (3 / intensityLevel) + 's';
      }
    }, 500);
  }
}

// 创建全局实例
export const waitingReportManager = new WaitingReportManager();
