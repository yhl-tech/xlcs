// 等待报告生成页面 - 动画控制模块
import { WORDCLOUD_CONFIG } from './config.js';

// ==================== 词云数据源管理 ====================
export class WordCloudDataSource {
  constructor(config = WORDCLOUD_CONFIG, subtitleHistory = null) {
    this.useMockData = config.useMockData;
    this.apiEndpoint = config.api.endpoint;
    this.apiOptions = config.api.options;
    this.data = null;
    this.subtitleHistory = subtitleHistory; // 传入的对话历史
  }

  // 从 sessionStorage 或传入的数据中获取用户对话历史
  getSubtitleHistory() {
    // 优先使用传入的数据
    if (this.subtitleHistory && Array.isArray(this.subtitleHistory)) {
      return this.subtitleHistory;
    }

    // 尝试从 sessionStorage 获取
    try {
      const stored = sessionStorage.getItem('subtitleHistory');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('获取对话历史失败:', error);
    }

    return [];
  }

  // 从用户对话中提取关键词
  extractKeywordsFromDialogue() {
    const history = this.getSubtitleHistory();

    // 只保留用户说的话
    const userDialogues = history.filter(item => item.speaker === 'user' && item.text);

    console.log('[WordCloud] 提取到用户对话:', userDialogues.length, '条');

    if (userDialogues.length === 0) {
      // 如果没有对话数据，返回默认 Mock 数据
      console.warn('[WordCloud] 没有用户对话，使用降级数据');
      return this.getMockData();
    }

    // 直接使用用户的对话文本，不做任何分词和筛选
    const keywords = userDialogues.map(item => ({
      text: item.text,  // 直接使用完整的对话文本
      weight: 3 + Math.random() * 2,  // 随机权重 3-5
      category: 'user-dialogue'  // 标记为用户对话
    }));

    // 对话词汇也直接使用用户的对话文本
    const conversationWords = userDialogues.map(item => item.text);

    // 用户信息（如果需要）
    const userInfo = this.extractUserInfo(history);

    return {
      status: 'success',
      timestamp: Date.now(),
      data: {
        userInfo,
        keywords,  // 所有用户对话
        conversationWords  // 所有用户对话
      }
    };
  }

  // 简单分词（中文按字符，英文按空格）
  simpleTokenize(text) {
    // 移除标点符号
    const cleaned = text.replace(/[，。！？、；：""''（）《》【】…—\s\.,!?;:()"'<>[\]]/g, ' ');

    // 提取中文词汇和英文单词
    const words = [];

    // 英文单词
    const englishWords = cleaned.match(/[a-zA-Z]+/g) || [];
    words.push(...englishWords);

    // 中文：简单提取2-4字的词组
    const chineseText = cleaned.replace(/[a-zA-Z\s]/g, '');
    for (let i = 0; i < chineseText.length; i++) {
      // 2字词
      if (i + 1 < chineseText.length) {
        words.push(chineseText.substring(i, i + 2));
      }
      // 3字词
      if (i + 2 < chineseText.length) {
        words.push(chineseText.substring(i, i + 3));
      }
    }

    return words;
  }

  // 从分词结果生成关键词（统计词频并过滤）
  generateKeywordsFromWords(words) {
    // 停用词列表（常见无意义词汇）
    const stopWords = new Set([
      '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
      '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
      '自己', '这', '那', '么', '可以', '这个', '什么', '吗', '啊', '呢', '吧', '吗',
      'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its'
    ]);

    // 统计词频
    const wordCount = {};
    words.forEach(word => {
      const normalizedWord = word.toLowerCase().trim();
      if (normalizedWord.length < 2 || stopWords.has(normalizedWord)) {
        return;
      }
      wordCount[normalizedWord] = (wordCount[normalizedWord] || 0) + 1;
    });

    // 按频率排序并转换为关键词格式
    const keywords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30) // 增加到30个高频词（用于词云主动画）
      .map(([text, count]) => ({
        text,
        weight: Math.min(5, 2 + count * 0.5), // 根据频率计算权重（2-5）
        category: this.guessCategory(text)
      }));

    return keywords;
  }

  // 提取对话词汇（用于飞词动画）
  extractConversationWords(words) {
    const uniqueWords = [...new Set(words)];
    return uniqueWords.slice(0, 100); // 增加到100个不重复的词（用于飞词和粒子动画）
  }

  // 猜测词的类别（简单规则，后续可以用 NLP）
  guessCategory(word) {
    const emotionWords = ['压力', '焦虑', '紧张', '疲惫', '开心', '难过', '害怕', '担心', '烦躁', '抑郁'];
    const symptomWords = ['失眠', '头痛', '胸闷', '心慌', '出汗', '发抖', '食欲'];
    const situationWords = ['工作', '加班', '家庭', '学习', '人际', '恋爱', '婚姻'];

    if (emotionWords.some(w => word.includes(w))) return 'emotion';
    if (symptomWords.some(w => word.includes(w))) return 'symptom';
    if (situationWords.some(w => word.includes(w))) return 'situation';

    return 'keyword';
  }

  // 提取用户信息（从对话中识别，简单实现）
  extractUserInfo(history) {
    // 默认值
    const defaultInfo = {
      age: '',
      gender: '',
      education: '',
      occupation: ''
    };

    // TODO: 从 history 中提取用户信息
    // 实际项目中可能需要 NLP 或从其他来源（如用户资料）获取
    // 这里暂时返回空信息，让词云只显示关键词
    console.log('[WordCloud] 用户信息提取待实现，对话记录数:', history.length);

    return defaultInfo;
  }

  // 获取 Mock 数据（模拟真实 API 响应格式）
  getMockData() {
    return {
      status: 'success',
      timestamp: Date.now(),
      data: {
        // 用户基本信息
        userInfo: {
          age: '27岁',
          gender: '女性',
          education: '研究生',
          occupation: '产品经理'
        },
        // 关键词数据（用于词云主动画）
        keywords: [
          { text: '压力', weight: 5, category: 'emotion' },
          { text: '焦虑', weight: 4.5, category: 'emotion' },
          { text: '失眠', weight: 4, category: 'symptom' },
          { text: '加班', weight: 3.5, category: 'situation' },
          { text: '紧张', weight: 3.5, category: 'emotion' },
          { text: '疲惫', weight: 4, category: 'emotion' },
          { text: '困扰', weight: 3, category: 'emotion' },
          { text: '平衡', weight: 3.5, category: 'goal' }
        ],
        // 对话关键词（用于文本粒子和飞词动画）
        conversationWords: [
          '压力', '焦虑', '失眠', '加班', '紧张', '疲惫', '困扰', '平衡',
          '工作', '人际关系', '沟通', '团队', '项目', 'deadline', '会议',
          '担心', '想太多', '睡不着', '情绪管理', '压力应对', '认知模式',
          '情感倾向', '思维方式', '自我认知', '社交模式', '情绪稳定性',
          '应对策略', '心理韧性'
        ]
      }
    };
  }

  // 从真实 API 获取数据
  async fetchRealData() {
    try {
      const response = await fetch(this.apiEndpoint, this.apiOptions);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('获取词云数据失败:', error);
      return this.getMockData(); // 失败时降级到 mock 数据
    }
  }

  // 统一获取数据入口
  async getData() {
    if (this.data) return this.data; // 已有缓存直接返回

    // 从对话历史中提取（真实数据）
    const history = this.getSubtitleHistory();
    if (history.length > 0) {
      console.log('[WordCloud] 使用真实对话数据，共', history.length, '条记录');
      this.data = this.extractKeywordsFromDialogue();
      return this.data;
    }

    // 如果没有对话数据，使用降级方案
    console.warn('[WordCloud] 未找到对话历史，使用降级数据');

    // 检查是否配置了真实 API
    if (!this.useMockData) {
      console.log('[WordCloud] 尝试请求真实 API');
      this.data = await this.fetchRealData();
      return this.data;
    }

    // 最终降级：使用 Mock 数据
    console.log('[WordCloud] 使用 Mock 降级数据');
    this.data = this.getMockData();
    return this.data;
  }

  // 获取词云动画数据
  getWordCloudData() {
    const data = this.data?.data || this.getMockData().data;
    const { userInfo, keywords } = data;

    const result = [];

    // 添加用户信息（如果有）
    if (userInfo) {
      if (userInfo.age) result.push({ text: userInfo.age, weight: 3, type: 'info' });
      if (userInfo.gender) result.push({ text: userInfo.gender, weight: 3, type: 'info' });
      if (userInfo.education) result.push({ text: userInfo.education, weight: 2.5, type: 'info' });
      if (userInfo.occupation) result.push({ text: userInfo.occupation, weight: 3, type: 'info' });
    }

    // 添加关键词
    if (keywords && keywords.length > 0) {
      result.push(...keywords.map(k => ({
        text: k.text,
        weight: k.weight,
        type: k.category === 'emotion' ? 'keyword' : k.category === 'symptom' ? 'emotion' : 'keyword'
      })));
    }

    return result;
  }

  // 获取文本粒子数据
  getTextFragments() {
    const data = this.data?.data || this.getMockData().data;
    const words = data.conversationWords || [];
    return words.slice(0, 10); // 取前10个关键词
  }

  // 获取飞词数据
  getFlyingWords() {
    const data = this.data?.data || this.getMockData().data;
    const { userInfo, conversationWords } = data;

    const result = [];

    // 添加用户信息（如果有）
    if (userInfo) {
      if (userInfo.age) result.push(userInfo.age);
      if (userInfo.gender) result.push(userInfo.gender);
      if (userInfo.education) result.push(userInfo.education);
      if (userInfo.occupation) result.push(userInfo.occupation);
    }

    // 添加对话关键词
    if (conversationWords && conversationWords.length > 0) {
      result.push(...conversationWords);
    }

    return result;
  }
}

export class WaitingReportManager {
  constructor() {
    this.canvases = {};
    this.particles = {};
    this.animationFrames = {};
    this.intervals = {};
    this.isActive = false;
    this.dataSource = new WordCloudDataSource(); // 初始化数据源
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
  async start() {
    if (this.isActive) return;
    this.isActive = true;

    // 初始化数据源
    await this.dataSource.getData();

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
    // 从统一数据源获取词云数据
    const wordCloudData = this.dataSource.getWordCloudData();

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
    // 从统一数据源获取文本片段
    const textFragments = this.dataSource.getTextFragments();

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

    // 从统一数据源获取飞词数据
    const flyingWords = this.dataSource.getFlyingWords();

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
