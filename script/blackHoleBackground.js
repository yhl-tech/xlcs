/**
 * 黑洞粒子背景特效
 * 使用 Three.js 创建一个动态的黑洞吸积盘效果
 *
 * 特性：
 * - 中心纯黑色事件视界
 * - 50,000+ 粒子形成螺旋吸积盘
 * - 青色、品红色、白色、蓝色渐变粒子
 * - 开普勒旋转：内侧粒子旋转更快
 * - 背景星空带随机闪烁
 * - 粒子螺旋向黑洞中心坠落
 * - 大粒子带发光效果
 * - 响应式画布
 * - 10个独立主题，支持平滑过渡
 *
 * 使用方法：
 * // 初始化
 * BlackHoleBackground.init('container-id');
 *
 * // 切换到主题（0-9对应10张图片）
 * BlackHoleBackground.switchTheme(0); // 切换到主题0
 * BlackHoleBackground.switchTheme(5); // 切换到主题5
 *
 * // 获取当前主题索引
 * const currentIndex = BlackHoleBackground.getCurrentThemeIndex();
 *
 * // 获取主题总数
 * const themeCount = BlackHoleBackground.getThemeCount(); // 返回 10
 */

;(function () {
  "use strict"

  // ============================================
  // 配置参数
  // ============================================
  const CONFIG = {
    // 粒子数量
    ACCRETION_DISK_PARTICLES: 35000, // 吸积盘粒子
    BACKGROUND_STARS: 15000, // 背景星空粒子
    FLOATING_PARTICLES: 400, // 全屏流动大粒子

    // 黑洞参数
    EVENT_HORIZON_RADIUS: 3.0, // 事件视界半径
    ACCRETION_DISK_INNER: 4.0, // 吸积盘内边界
    ACCRETION_DISK_OUTER: 50.0, // 吸积盘外边界

    // 相机设置
    CAMERA_POSITION: { x: 0, y: 35, z: 60 },
    CAMERA_LOOK_AT: { x: 0, y: 0, z: 0 },

    // 动画速度
    BASE_ROTATION_SPEED: 0.15, // 基础旋转速度
    INFALL_SPEED: 0.008, // 坠落速度
    TWINKLE_SPEED: 2.0, // 闪烁速度

    // 颜色配置 (HSL)
    COLORS: {
      CORE: { h: 180, s: 100, l: 90 }, // 青白色核心
      INNER: { h: 190, s: 100, l: 70 }, // 青色
      MID: { h: 240, s: 80, l: 60 }, // 蓝色
      OUTER: { h: 280, s: 70, l: 50 }, // 紫色
      MAGENTA: { h: 300, s: 80, l: 60 }, // 品红色
    },
  }

  // ============================================
  // 10个主题配置
  // ============================================
  const THEMES = [
    {
      // 主题0: 初始冷静型 - 深蓝青
      name: "初始冷静",
      colors: {
        core: { h: 205, s: 65, l: 35 },
        inner: { h: 200, s: 70, l: 40 },
        mid: { h: 210, s: 60, l: 30 },
        outer: { h: 200, s: 50, l: 25 },
        accent: { h: 190, s: 70, l: 45 },
      },
      morph: {
        rotationSpeed: 0.08,
        infallSpeed: 0.005,
        spiralArms: 2,
        particleDensity: 0.8,
        particleSizeVariation: 0.3,
      },
      transitionDuration: 2.5,
    },
    {
      // 主题1: 探索型 - 青蓝渐变
      name: "探索",
      colors: {
        core: { h: 195, s: 75, l: 40 },
        inner: { h: 190, s: 80, l: 45 },
        mid: { h: 200, s: 70, l: 35 },
        outer: { h: 210, s: 60, l: 30 },
        accent: { h: 185, s: 75, l: 50 },
      },
      morph: {
        rotationSpeed: 0.12,
        infallSpeed: 0.008,
        spiralArms: 3,
        particleDensity: 1.0,
        particleSizeVariation: 0.5,
      },
      transitionDuration: 2.0,
    },
    {
      // 主题2: 情感感知型 - 紫粉
      name: "情感感知",
      colors: {
        core: { h: 290, s: 75, l: 45 },
        inner: { h: 300, s: 80, l: 50 },
        mid: { h: 280, s: 70, l: 40 },
        outer: { h: 310, s: 65, l: 35 },
        accent: { h: 295, s: 75, l: 55 },
      },
      morph: {
        rotationSpeed: 0.15,
        infallSpeed: 0.01,
        spiralArms: 3,
        particleDensity: 1.0,
        particleSizeVariation: 0.5,
      },
      transitionDuration: 2.0,
    },
    {
      // 主题3: 深度思考型 - 深紫蓝
      name: "深度思考",
      colors: {
        core: { h: 250, s: 65, l: 30 },
        inner: { h: 240, s: 70, l: 35 },
        mid: { h: 260, s: 60, l: 25 },
        outer: { h: 255, s: 55, l: 20 },
        accent: { h: 245, s: 70, l: 40 },
      },
      morph: {
        rotationSpeed: 0.1,
        infallSpeed: 0.006,
        spiralArms: 2,
        particleDensity: 1.2,
        particleSizeVariation: 0.8,
      },
      transitionDuration: 2.5,
    },
    {
      // 主题4: 平衡过渡型 - 蓝紫平衡
      name: "平衡过渡",
      colors: {
        core: { h: 260, s: 70, l: 40 },
        inner: { h: 255, s: 75, l: 45 },
        mid: { h: 265, s: 65, l: 35 },
        outer: { h: 270, s: 60, l: 30 },
        accent: { h: 250, s: 70, l: 50 },
      },
      morph: {
        rotationSpeed: 0.15,
        infallSpeed: 0.008,
        spiralArms: 3,
        particleDensity: 1.0,
        particleSizeVariation: 0.4,
      },
      transitionDuration: 2.0,
    },
    {
      // 主题5: 活力创造型 - 青绿
      name: "活力创造",
      colors: {
        core: { h: 175, s: 80, l: 45 },
        inner: { h: 170, s: 85, l: 50 },
        mid: { h: 180, s: 75, l: 40 },
        outer: { h: 165, s: 70, l: 35 },
        accent: { h: 175, s: 80, l: 55 },
      },
      morph: {
        rotationSpeed: 0.2,
        infallSpeed: 0.012,
        spiralArms: 4,
        particleDensity: 1.0,
        particleSizeVariation: 0.6,
      },
      transitionDuration: 2.0,
    },
    {
      // 主题6: 温暖亲和型 - 粉紫
      name: "温暖亲和",
      colors: {
        core: { h: 320, s: 65, l: 50 },
        inner: { h: 315, s: 70, l: 55 },
        mid: { h: 325, s: 60, l: 45 },
        outer: { h: 310, s: 55, l: 40 },
        accent: { h: 318, s: 70, l: 60 },
      },
      morph: {
        rotationSpeed: 0.14,
        infallSpeed: 0.009,
        spiralArms: 3,
        particleDensity: 0.9,
        particleSizeVariation: 0.3,
      },
      transitionDuration: 2.0,
    },
    {
      // 主题7: 专注分析型 - 深蓝
      name: "专注分析",
      colors: {
        core: { h: 220, s: 75, l: 35 },
        inner: { h: 215, s: 80, l: 40 },
        mid: { h: 225, s: 70, l: 30 },
        outer: { h: 210, s: 65, l: 25 },
        accent: { h: 218, s: 75, l: 45 },
      },
      morph: {
        rotationSpeed: 0.09,
        infallSpeed: 0.007,
        spiralArms: 2,
        particleDensity: 1.15,
        particleSizeVariation: 0.5,
      },
      transitionDuration: 2.5,
    },
    {
      // 主题8: 综合感知型 - 柔和多彩渐变
      name: "综合感知",
      colors: {
        core: { h: 250, s: 65, l: 38 },
        inner: { h: 240, s: 68, l: 42 },
        mid: { h: 280, s: 60, l: 35 },
        outer: { h: 300, s: 55, l: 30 },
        accent: { h: 260, s: 70, l: 45 },
      },
      morph: {
        rotationSpeed: 0.16,
        infallSpeed: 0.01,
        spiralArms: 4,
        particleDensity: 1.0,
        particleSizeVariation: 0.7,
      },
      transitionDuration: 2.0,
    },
    {
      // 主题9: 完成升华型 - 柔和青紫渐变
      name: "完成升华",
      colors: {
        core: { h: 190, s: 70, l: 42 },
        inner: { h: 195, s: 72, l: 46 },
        mid: { h: 285, s: 65, l: 38 },
        outer: { h: 290, s: 60, l: 32 },
        accent: { h: 192, s: 75, l: 48 },
      },
      morph: {
        rotationSpeed: 0.11,
        infallSpeed: 0.008,
        spiralArms: 3,
        particleDensity: 1.0,
        particleSizeVariation: 0.6,
      },
      transitionDuration: 2.5,
    },
  ]

  // ============================================
  // 着色器代码
  // ============================================

  // 吸积盘粒子顶点着色器
  const accretionVertexShader = `
        attribute float size;
        attribute vec3 customColor;
        attribute float alpha;
        
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
            vColor = customColor;
            vAlpha = alpha;
            
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `

  // 吸积盘粒子片段着色器 (带发光效果)
  const accretionFragmentShader = `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            
            // 创建发光效果
            float glow = 1.0 - smoothstep(0.0, 0.5, dist);
            float core = 1.0 - smoothstep(0.0, 0.2, dist);
            
            // 混合核心和光晕
            vec3 finalColor = vColor * glow + vec3(1.0) * core * 0.5;
            float finalAlpha = vAlpha * glow;
            
            if (finalAlpha < 0.01) discard;
            
            gl_FragColor = vec4(finalColor, finalAlpha);
        }
    `

  // 背景星空顶点着色器
  const starsVertexShader = `
        attribute float size;
        attribute float twinklePhase;
        
        varying float vTwinklePhase;
        
        uniform float time;
        
        void main() {
            vTwinklePhase = twinklePhase;
            
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            
            // 闪烁效果
            float twinkle = 0.5 + 0.5 * sin(time * 2.0 + twinklePhase * 6.28);
            gl_PointSize = size * twinkle * (200.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `

  // 背景星空片段着色器
  const starsFragmentShader = `
        varying float vTwinklePhase;
        
        void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            
            float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
            
            // 根据相位决定颜色
            vec3 color;
            if (vTwinklePhase < 0.3) {
                color = vec3(0.8, 1.0, 1.0); // 青白
            } else if (vTwinklePhase < 0.6) {
                color = vec3(1.0, 0.8, 1.0); // 粉白
            } else {
                color = vec3(1.0, 1.0, 1.0); // 纯白
            }
            
            if (alpha < 0.01) discard;
            
            gl_FragColor = vec4(color, alpha * 0.8);
        }
    `

  // 全屏流动大粒子顶点着色器
  const floatingVertexShader = `
        attribute float size;
        attribute vec3 customColor;
        attribute float phase;
        
        varying vec3 vColor;
        varying float vPhase;
        
        uniform float time;
        
        void main() {
            vColor = customColor;
            vPhase = phase;
            
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            
            // 脉动效果
            float pulse = 1.0 + 0.3 * sin(time * 1.5 + phase * 6.28);
            gl_PointSize = size * pulse * (400.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `

  // 全屏流动大粒子片段着色器 (精致亮点效果)
  const floatingFragmentShader = `
        varying vec3 vColor;
        varying float vPhase;
        
        void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            
            // 精致亮点效果 - 更锐利的边缘
            float sharpCore = 1.0 - smoothstep(0.0, 0.05, dist);     // 极小的锐利核心
            float innerRing = 1.0 - smoothstep(0.03, 0.12, dist);    // 内环发光
            float softGlow = 1.0 - smoothstep(0.05, 0.3, dist);      // 柔和外晕
            
            // 颜色层次
            vec3 coreColor = vec3(1.0, 1.0, 1.0) * sharpCore * 1.5;  // 超亮白色核心
            vec3 ringColor = (vColor * 1.2 + vec3(0.3)) * innerRing; // 带色彩的内环
            vec3 glowColor = vColor * softGlow * 0.4;                // 淡淡的外晕
            
            vec3 finalColor = coreColor + ringColor + glowColor;
            
            // 透明度：核心区域完全不透明，外围快速衰减
            float finalAlpha = sharpCore + innerRing * 0.8 + softGlow * 0.3;
            finalAlpha = clamp(finalAlpha, 0.0, 1.0);
            
            if (finalAlpha < 0.02) discard;
            
            gl_FragColor = vec4(finalColor, finalAlpha);
        }
    `

  // ============================================
  // 黑洞背景类
  // ============================================
  class BlackHoleEffect {
    constructor(containerId) {
      this.containerId = containerId
      this.container = null
      this.scene = null
      this.camera = null
      this.renderer = null
      this.accretionDisk = null
      this.backgroundStars = null
      this.floatingParticles = null
      this.eventHorizon = null
      this.animationId = null
      this.clock = null
      this.isRunning = false

      // 粒子数据
      this.accretionData = {
        positions: null,
        velocities: null,
        radii: null,
        angles: null,
      }

      // 主题系统
      this.currentThemeIndex = 0
      this.currentTheme = THEMES[0]
      this.targetThemeIndex = 0
      this.targetTheme = THEMES[0]
      this.isTransitioning = false
      this.transitionStartTime = 0
      this.transitionDuration = 0
      this.transitionProgress = 0
      this.spiralArms = 3 // 当前螺旋臂数
      
      // 帧率节流
      this.targetFPS = 30 // 目标帧率（降低以提升性能）
      this.frameInterval = 1000 / this.targetFPS // 每帧间隔（毫秒）
      this.lastFrameTime = 0
      
      // 颜色更新优化
      this.lastColorUpdateTime = 0 // 上次颜色更新时间
      this.colorUpdateInterval = 0.1 // 颜色更新间隔（秒）- 每100ms更新一次
      this.colorUpdateBatchSize = 5000 // 每批更新的粒子数量
      this.colorUpdateBatchIndex = 0 // 当前批次索引
    }

    init() {
      this.container = document.getElementById(this.containerId)
      if (!this.container) {
        console.error("[BlackHole] 容器未找到:", this.containerId)
        return false
      }

      // 检查 Three.js
      if (typeof THREE === "undefined") {
        console.error("[BlackHole] Three.js 未加载")
        return false
      }

      try {
        this.setupScene()
        this.setupCamera()
        this.setupRenderer()
        this.createEventHorizon()
        this.createAccretionDisk()
        this.createBackgroundStars()
        this.createFloatingParticles()
        this.setupEventListeners()

        this.clock = new THREE.Clock()
        this.isRunning = true
        this.animate()

        // 隐藏加载提示
        const loadingEl = document.getElementById("blackhole-loading")
        if (loadingEl) {
          loadingEl.style.display = "none"
        }

        console.log("[BlackHole] 初始化成功")
        return true
      } catch (error) {
        console.error("[BlackHole] 初始化失败:", error)
        return false
      }
    }

    setupScene() {
      this.scene = new THREE.Scene()
      this.scene.background = new THREE.Color(0x000000)
    }

    setupCamera() {
      const aspect = window.innerWidth / window.innerHeight
      this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000)
      this.camera.position.set(
        CONFIG.CAMERA_POSITION.x,
        CONFIG.CAMERA_POSITION.y,
        CONFIG.CAMERA_POSITION.z
      )
      this.camera.lookAt(
        CONFIG.CAMERA_LOOK_AT.x,
        CONFIG.CAMERA_LOOK_AT.y,
        CONFIG.CAMERA_LOOK_AT.z
      )
    }

    setupRenderer() {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
      })
      this.renderer.setSize(window.innerWidth, window.innerHeight)
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      this.container.appendChild(this.renderer.domElement)
    }

    // 创建事件视界 (纯黑色球体)
    createEventHorizon() {
      const geometry = new THREE.SphereGeometry(
        CONFIG.EVENT_HORIZON_RADIUS,
        64,
        64
      )
      const material = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: false,
      })
      this.eventHorizon = new THREE.Mesh(geometry, material)
      this.eventHorizon.position.set(0, 0, 0)
      this.scene.add(this.eventHorizon)
    }

    // 创建吸积盘粒子系统
    createAccretionDisk() {
      const count = CONFIG.ACCRETION_DISK_PARTICLES
      const geometry = new THREE.BufferGeometry()

      // 初始化数组
      const positions = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)
      const sizes = new Float32Array(count)
      const alphas = new Float32Array(count)

      // 存储粒子运动数据
      this.accretionData.radii = new Float32Array(count)
      this.accretionData.angles = new Float32Array(count)
      this.accretionData.heights = new Float32Array(count)

      const innerRadius = CONFIG.ACCRETION_DISK_INNER
      const outerRadius = CONFIG.ACCRETION_DISK_OUTER

      for (let i = 0; i < count; i++) {
        // 使用指数分布使粒子在内侧更密集
        const t = Math.random()
        const radius =
          innerRadius + (outerRadius - innerRadius) * Math.pow(t, 0.5)
        const angle = Math.random() * Math.PI * 2

        // 添加螺旋臂结构（使用当前主题的螺旋臂数）
        const spiralArms = this.currentTheme.morph.spiralArms
        const armOffset =
          (Math.floor(Math.random() * spiralArms) / spiralArms) * Math.PI * 2
        const spiralAngle =
          angle + armOffset + (radius / outerRadius) * Math.PI * 2

        // 根据半径计算高度 (越靠近中心越扁平)
        const heightFactor = Math.pow(radius / outerRadius, 1.5)
        const height = (Math.random() - 0.5) * 2.0 * heightFactor

        // 存储极坐标
        this.accretionData.radii[i] = radius
        this.accretionData.angles[i] = spiralAngle
        this.accretionData.heights[i] = height

        // 转换为笛卡尔坐标
        positions[i * 3] = Math.cos(spiralAngle) * radius
        positions[i * 3 + 1] = height
        positions[i * 3 + 2] = Math.sin(spiralAngle) * radius

        // 根据半径设置颜色
        const normalizedRadius =
          (radius - innerRadius) / (outerRadius - innerRadius)
        const color = this.getAccretionColor(normalizedRadius)
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b

        // 大小：靠近中心越大越亮
        const sizeFactor = 1.0 - normalizedRadius * 0.7
        sizes[i] =
          (0.5 + Math.random() * 1.5) * sizeFactor + Math.random() * 0.5

        // 透明度：靠近中心更亮
        alphas[i] = 0.3 + 0.7 * (1.0 - normalizedRadius)
      }

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute("customColor", new THREE.BufferAttribute(colors, 3))
      geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1))
      geometry.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1))

      const material = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: accretionVertexShader,
        fragmentShader: accretionFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })

      this.accretionDisk = new THREE.Points(geometry, material)
      this.scene.add(this.accretionDisk)
    }

    // 根据半径获取吸积盘颜色（使用当前主题）
    getAccretionColor(normalizedRadius) {
      const color = new THREE.Color()

      // 如果在过渡中，混合两个主题的颜色
      let h, s, l
      if (
        this.isTransitioning &&
        this.transitionProgress < 1.0 &&
        this.transitionProgress > 0
      ) {
        const startTheme = THEMES[this.currentThemeIndex]
        const endTheme = this.targetTheme
        const t = this.transitionProgress

        // HSL插值
        if (normalizedRadius < 0.1) {
          h = this.lerpHSL(startTheme.colors.core.h, endTheme.colors.core.h, t)
          s = this.lerp(
            startTheme.colors.core.s / 100,
            endTheme.colors.core.s / 100,
            t
          )
          l = this.lerp(
            startTheme.colors.core.l / 100,
            endTheme.colors.core.l / 100,
            t
          )
        } else if (normalizedRadius < 0.3) {
          h = this.lerpHSL(
            startTheme.colors.inner.h,
            endTheme.colors.inner.h,
            t
          )
          s = this.lerp(
            startTheme.colors.inner.s / 100,
            endTheme.colors.inner.s / 100,
            t
          )
          l = this.lerp(
            startTheme.colors.inner.l / 100,
            endTheme.colors.inner.l / 100,
            t
          )
        } else if (normalizedRadius < 0.6) {
          h = this.lerpHSL(startTheme.colors.mid.h, endTheme.colors.mid.h, t)
          s = this.lerp(
            startTheme.colors.mid.s / 100,
            endTheme.colors.mid.s / 100,
            t
          )
          l = this.lerp(
            startTheme.colors.mid.l / 100,
            endTheme.colors.mid.l / 100,
            t
          )
        } else {
          h = this.lerpHSL(
            startTheme.colors.outer.h,
            endTheme.colors.outer.h,
            t
          )
          s = this.lerp(
            startTheme.colors.outer.s / 100,
            endTheme.colors.outer.s / 100,
            t
          )
          l = this.lerp(
            startTheme.colors.outer.l / 100,
            endTheme.colors.outer.l / 100,
            t
          )
        }
      } else {
        // 使用当前主题颜色
        const theme = this.currentTheme
        const colors = theme.colors

        if (normalizedRadius < 0.1) {
          h = colors.core.h
          s = colors.core.s / 100
          l = colors.core.l / 100
        } else if (normalizedRadius < 0.3) {
          h = colors.inner.h
          s = colors.inner.s / 100
          l = colors.inner.l / 100
        } else if (normalizedRadius < 0.6) {
          h = colors.mid.h
          s = colors.mid.s / 100
          l = colors.mid.l / 100
        } else {
          h = colors.outer.h
          s = colors.outer.s / 100
          l = colors.outer.l / 100
        }
      }

      // 添加随机变化
      const randomVariation = Math.random()
      h += (randomVariation - 0.5) * 10 // ±5度色相变化
      s = Math.max(0.3, Math.min(1.0, s + (randomVariation - 0.5) * 0.1))
      l = Math.max(0.2, Math.min(0.7, l + (randomVariation - 0.5) * 0.1))

      color.setHSL(h / 360, s, l)
      return color
    }

    // 线性插值
    lerp(a, b, t) {
      return a + (b - a) * t
    }

    // HSL色相插值（考虑色环）
    lerpHSL(h1, h2, t) {
      let diff = h2 - h1
      if (Math.abs(diff) > 180) {
        if (diff > 0) diff -= 360
        else diff += 360
      }
      let result = h1 + diff * t
      if (result < 0) result += 360
      if (result >= 360) result -= 360
      return result
    }

    // 创建背景星空
    createBackgroundStars() {
      const count = CONFIG.BACKGROUND_STARS
      const geometry = new THREE.BufferGeometry()

      const positions = new Float32Array(count * 3)
      const sizes = new Float32Array(count)
      const twinklePhases = new Float32Array(count)

      // 在球形区域分布星星
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        const radius = 100 + Math.random() * 200

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
        positions[i * 3 + 2] = radius * Math.cos(phi)

        sizes[i] = 0.5 + Math.random() * 2.0
        twinklePhases[i] = Math.random()
      }

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1))
      geometry.setAttribute(
        "twinklePhase",
        new THREE.BufferAttribute(twinklePhases, 1)
      )

      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
        },
        vertexShader: starsVertexShader,
        fragmentShader: starsFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })

      this.backgroundStars = new THREE.Points(geometry, material)
      this.scene.add(this.backgroundStars)
    }

    // 创建全屏流动大粒子
    createFloatingParticles() {
      const count = CONFIG.FLOATING_PARTICLES
      const geometry = new THREE.BufferGeometry()

      const positions = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)
      const sizes = new Float32Array(count)
      const phases = new Float32Array(count)

      // 存储粒子运动数据
      this.floatingData = {
        velocities: new Float32Array(count * 3),
        originalPositions: new Float32Array(count * 3),
      }

      // 在全屏范围内分布大粒子
      for (let i = 0; i < count; i++) {
        // 在视口范围内随机分布
        const x = (Math.random() - 0.5) * 200
        const y = (Math.random() - 0.5) * 100
        const z = (Math.random() - 0.5) * 150 - 20

        positions[i * 3] = x
        positions[i * 3 + 1] = y
        positions[i * 3 + 2] = z

        // 保存原始位置
        this.floatingData.originalPositions[i * 3] = x
        this.floatingData.originalPositions[i * 3 + 1] = y
        this.floatingData.originalPositions[i * 3 + 2] = z

        // 随机速度向量
        this.floatingData.velocities[i * 3] = (Math.random() - 0.5) * 2
        this.floatingData.velocities[i * 3 + 1] = (Math.random() - 0.5) * 1
        this.floatingData.velocities[i * 3 + 2] = (Math.random() - 0.5) * 2

        // 离散配色：青色、紫色、白色、深蓝色
        const colorType = Math.random()
        const color = new THREE.Color()

        if (colorType < 0.3) {
          // 青色 (明亮的青绿色)
          color.setRGB(0.2, 1.0, 0.95)
        } else if (colorType < 0.55) {
          // 紫色/品红色
          color.setRGB(0.85, 0.3, 0.9)
        } else if (colorType < 0.75) {
          // 深蓝色
          color.setRGB(0.3, 0.4, 1.0)
        } else {
          // 纯白色
          color.setRGB(1.0, 1.0, 1.0)
        }

        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b

        // 精致亮点尺寸 (2-8)
        sizes[i] = 2 + Math.random() * 6

        // 随机相位
        phases[i] = Math.random()
      }

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute("customColor", new THREE.BufferAttribute(colors, 3))
      geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1))
      geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1))

      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
        },
        vertexShader: floatingVertexShader,
        fragmentShader: floatingFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })

      this.floatingParticles = new THREE.Points(geometry, material)
      this.scene.add(this.floatingParticles)
    }

    // 更新吸积盘粒子
    updateAccretionDisk(deltaTime) {
      if (!this.accretionDisk) return

      const positions = this.accretionDisk.geometry.attributes.position.array
      const colors = this.accretionDisk.geometry.attributes.customColor.array
      const alphas = this.accretionDisk.geometry.attributes.alpha.array
      const count = positions.length / 3

      const innerRadius = CONFIG.ACCRETION_DISK_INNER
      const outerRadius = CONFIG.ACCRETION_DISK_OUTER

      // 获取当前旋转速度和坠落速度（支持过渡）
      let rotationSpeed, infallSpeed
      if (this.isTransitioning && this.transitionProgress < 1.0) {
        const startTheme = THEMES[this.currentThemeIndex]
        const endTheme = this.targetTheme
        const t = this.transitionProgress
        rotationSpeed = this.lerp(
          startTheme.morph.rotationSpeed,
          endTheme.morph.rotationSpeed,
          t
        )
        infallSpeed = this.lerp(
          startTheme.morph.infallSpeed,
          endTheme.morph.infallSpeed,
          t
        )
      } else {
        rotationSpeed = this.currentTheme.morph.rotationSpeed
        infallSpeed = this.currentTheme.morph.infallSpeed
      }

      // 如果在过渡中，需要更新所有粒子的颜色
      const shouldUpdateAllColors =
        this.isTransitioning && this.transitionProgress < 1.0

      for (let i = 0; i < count; i++) {
        let radius = this.accretionData.radii[i]
        let angle = this.accretionData.angles[i]
        let height = this.accretionData.heights[i]

        // 开普勒旋转：内侧更快 (角速度 ∝ r^(-3/2))
        const angularVelocity =
          rotationSpeed / Math.pow(radius / innerRadius, 1.5)
        angle += angularVelocity * deltaTime

        // 缓慢向内坠落（使用主题的坠落速度）
        radius -= infallSpeed * deltaTime * (1.0 + Math.random() * 0.5)

        // 高度逐渐降低
        height *= 0.9995

        // 如果粒子到达事件视界，重置到外边缘
        if (radius < innerRadius) {
          radius = outerRadius - Math.random() * 10
          angle = Math.random() * Math.PI * 2
          height = (Math.random() - 0.5) * 2.0
        }

        // 更新存储的数据
        this.accretionData.radii[i] = radius
        this.accretionData.angles[i] = angle
        this.accretionData.heights[i] = height

        // 更新位置
        positions[i * 3] = Math.cos(angle) * radius
        positions[i * 3 + 1] = height
        positions[i * 3 + 2] = Math.sin(angle) * radius

        // 优化：过渡期间的颜色更新由 updateParticleColorsBatched 处理
        // 这里只在非过渡状态或粒子被重置时更新颜色
        if (!shouldUpdateAllColors && radius >= outerRadius - 10) {
          // 粒子被重置时更新颜色（非过渡状态）
          const normalizedRadius =
            (radius - innerRadius) / (outerRadius - innerRadius)
          const color = this.getAccretionColor(normalizedRadius)
          colors[i * 3] = color.r
          colors[i * 3 + 1] = color.g
          colors[i * 3 + 2] = color.b
          alphas[i] = 0.3 + 0.7 * (1.0 - normalizedRadius)
        }
      }

      this.accretionDisk.geometry.attributes.position.needsUpdate = true
      // 颜色更新由 updateParticleColorsBatched 统一处理，这里只在非过渡状态更新
      if (!shouldUpdateAllColors) {
        // 只在颜色数组被修改时才标记需要更新
        this.accretionDisk.geometry.attributes.customColor.needsUpdate = true
        this.accretionDisk.geometry.attributes.alpha.needsUpdate = true
      }
    }

    // 更新背景星空
    updateBackgroundStars(time) {
      if (!this.backgroundStars) return
      this.backgroundStars.material.uniforms.time.value = time

      // 缓慢整体旋转
      this.backgroundStars.rotation.y += 0.0001
    }

    // 更新全屏流动大粒子
    updateFloatingParticles(deltaTime, time) {
      if (!this.floatingParticles) return

      this.floatingParticles.material.uniforms.time.value = time

      const positions =
        this.floatingParticles.geometry.attributes.position.array
      const count = positions.length / 3

      for (let i = 0; i < count; i++) {
        // 获取速度
        const vx = this.floatingData.velocities[i * 3]
        const vy = this.floatingData.velocities[i * 3 + 1]
        const vz = this.floatingData.velocities[i * 3 + 2]

        // 更新位置
        positions[i * 3] += vx * deltaTime
        positions[i * 3 + 1] += vy * deltaTime
        positions[i * 3 + 2] += vz * deltaTime

        // 边界检查：超出范围则从另一侧出现
        if (positions[i * 3] > 100) positions[i * 3] = -100
        if (positions[i * 3] < -100) positions[i * 3] = 100
        if (positions[i * 3 + 1] > 50) positions[i * 3 + 1] = -50
        if (positions[i * 3 + 1] < -50) positions[i * 3 + 1] = 50
        if (positions[i * 3 + 2] > 50) positions[i * 3 + 2] = -100
        if (positions[i * 3 + 2] < -100) positions[i * 3 + 2] = 50

        // 添加微小的波动效果
        const phase = this.floatingParticles.geometry.attributes.phase.array[i]
        positions[i * 3 + 1] += Math.sin(time * 0.5 + phase * 10) * 0.02
      }

      this.floatingParticles.geometry.attributes.position.needsUpdate = true
    }

    // 动画循环（带帧率节流）
    animate() {
      if (!this.isRunning) return

      this.animationId = requestAnimationFrame(() => this.animate())

      // 帧率节流：限制帧率以提升性能
      const currentTime = performance.now()
      const elapsed = currentTime - this.lastFrameTime
      
      if (elapsed < this.frameInterval) {
        // 跳过这一帧，保持目标帧率
        return
      }
      
      this.lastFrameTime = currentTime - (elapsed % this.frameInterval)

      const deltaTime = this.clock.getDelta()
      const elapsedTime = this.clock.getElapsedTime()

      // 更新过渡
      this.updateTransition()

      this.updateAccretionDisk(deltaTime)
      this.updateBackgroundStars(elapsedTime)
      this.updateFloatingParticles(deltaTime, elapsedTime)

      // 优化过渡期间的颜色更新：减少更新频率或分批更新
      if (
        this.isTransitioning &&
        this.accretionDisk &&
        this.transitionProgress < 1.0
      ) {
        const now = this.clock.getElapsedTime()
        // 每隔一定时间更新一次颜色，而不是每帧都更新
        if (now - this.lastColorUpdateTime >= this.colorUpdateInterval) {
          this.updateParticleColorsBatched()
          this.lastColorUpdateTime = now
        }
      }

      this.renderer.render(this.scene, this.camera)
    }

    // 更新粒子颜色（用于过渡）- 分批更新版本
    updateParticleColorsBatched() {
      if (!this.accretionDisk) return

      const positions = this.accretionDisk.geometry.attributes.position.array
      const colors = this.accretionDisk.geometry.attributes.customColor.array
      const alphas = this.accretionDisk.geometry.attributes.alpha.array
      const count = positions.length / 3
      const innerRadius = CONFIG.ACCRETION_DISK_INNER
      const outerRadius = CONFIG.ACCRETION_DISK_OUTER

      // 分批更新：每次只更新一部分粒子，分散到多帧
      const startIndex = this.colorUpdateBatchIndex
      const endIndex = Math.min(
        startIndex + this.colorUpdateBatchSize,
        count
      )

      for (let i = startIndex; i < endIndex; i++) {
        const radius = this.accretionData.radii[i]
        const normalizedRadius =
          (radius - innerRadius) / (outerRadius - innerRadius)
        const color = this.getAccretionColor(normalizedRadius)
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
        alphas[i] = 0.3 + 0.7 * (1.0 - normalizedRadius)
      }

      // 更新批次索引，下次更新下一批
      this.colorUpdateBatchIndex += this.colorUpdateBatchSize
      if (this.colorUpdateBatchIndex >= count) {
        this.colorUpdateBatchIndex = 0 // 循环回到开始
      }

      // 标记需要更新（即使只更新了部分，也需要刷新整个缓冲区）
      this.accretionDisk.geometry.attributes.customColor.needsUpdate = true
      this.accretionDisk.geometry.attributes.alpha.needsUpdate = true
    }

    // 更新粒子颜色（用于过渡）- 完整更新版本（保留作为备用）
    updateParticleColors() {
      if (!this.accretionDisk) return

      const positions = this.accretionDisk.geometry.attributes.position.array
      const colors = this.accretionDisk.geometry.attributes.customColor.array
      const count = positions.length / 3
      const innerRadius = CONFIG.ACCRETION_DISK_INNER
      const outerRadius = CONFIG.ACCRETION_DISK_OUTER

      for (let i = 0; i < count; i++) {
        const radius = this.accretionData.radii[i]
        const normalizedRadius =
          (radius - innerRadius) / (outerRadius - innerRadius)
        const color = this.getAccretionColor(normalizedRadius)
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
      }

      this.accretionDisk.geometry.attributes.customColor.needsUpdate = true
    }

    // 窗口大小调整
    onWindowResize() {
      if (!this.camera || !this.renderer) return

      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    }

    setupEventListeners() {
      window.addEventListener("resize", () => this.onWindowResize())
    }

    // 停止动画
    stop() {
      this.isRunning = false
      if (this.animationId) {
        cancelAnimationFrame(this.animationId)
        this.animationId = null
      }
    }

    // 恢复动画
    resume() {
      if (!this.isRunning) {
        this.isRunning = true
        this.clock.start()
        this.animate()
      }
    }

    // 销毁
    destroy() {
      this.stop()

      if (this.renderer) {
        this.renderer.dispose()
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(
            this.renderer.domElement
          )
        }
      }

      if (this.scene) {
        this.scene.traverse((object) => {
          if (object.geometry) object.geometry.dispose()
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((m) => m.dispose())
            } else {
              object.material.dispose()
            }
          }
        })
      }

      this.scene = null
      this.camera = null
      this.renderer = null
      this.accretionDisk = null
      this.backgroundStars = null
      this.eventHorizon = null
    }

    // 变换效果 (可用于图片切换时)
    morph(themeIndex) {
      console.log(
        "[BlackHole] morph 被调用，主题索引:",
        themeIndex,
        "当前主题:",
        this.currentThemeIndex
      )

      if (
        typeof themeIndex !== "number" ||
        themeIndex < 0 ||
        themeIndex >= THEMES.length
      ) {
        console.warn("[BlackHole] 无效的主题索引:", themeIndex)
        return
      }

      if (themeIndex === this.currentThemeIndex && !this.isTransitioning) {
        console.log("[BlackHole] 已经是当前主题，跳过")
        return // 已经是当前主题且不在过渡中
      }

      // 如果正在过渡，取消当前过渡，从当前位置继续
      if (this.isTransitioning) {
        // 更新当前主题为过渡的中间状态
        const t = this.transitionProgress
        const startTheme = THEMES[this.currentThemeIndex]
        const prevTarget = this.targetTheme

        // 计算当前中间状态的颜色（简化处理，直接使用目标主题）
        this.currentThemeIndex = this.targetThemeIndex
        this.currentTheme = prevTarget
      }

      // 设置新目标主题
      this.targetThemeIndex = themeIndex
      this.targetTheme = THEMES[themeIndex]
      this.isTransitioning = true
      this.transitionStartTime = this.clock ? this.clock.getElapsedTime() : 0
      // 重置颜色更新批次索引，从头开始更新
      this.colorUpdateBatchIndex = 0
      this.lastColorUpdateTime = 0
      this.transitionDuration = this.targetTheme.transitionDuration
      this.transitionProgress = 0

      console.log(
        `[BlackHole] 开始过渡到主题 ${themeIndex}: ${this.targetTheme.name}`
      )
    }

    // 更新过渡进度
    updateTransition() {
      if (!this.isTransitioning || !this.clock) return

      const elapsed = this.clock.getElapsedTime() - this.transitionStartTime
      this.transitionProgress = Math.min(elapsed / this.transitionDuration, 1.0)

      // 使用ease-in-out缓动函数
      const easeProgress =
        this.transitionProgress < 0.5
          ? 2 * this.transitionProgress * this.transitionProgress
          : 1 - Math.pow(-2 * this.transitionProgress + 2, 2) / 2

      this.transitionProgress = easeProgress

      // 过渡完成
      if (this.transitionProgress >= 1.0) {
        this.currentThemeIndex = this.targetThemeIndex
        this.currentTheme = this.targetTheme
        this.isTransitioning = false
        this.transitionProgress = 0
        console.log(`[BlackHole] 过渡完成: ${this.currentTheme.name}`)
      }
    }
  }

  // ============================================
  // 全局接口
  // ============================================
  let instance = null

  window.BlackHoleBackground = {
    init: function (containerId) {
      if (instance) {
        instance.destroy()
      }
      instance = new BlackHoleEffect(containerId)
      return instance.init()
    },

    stop: function () {
      if (instance) instance.stop()
    },

    resume: function () {
      if (instance) instance.resume()
    },

    destroy: function () {
      if (instance) {
        instance.destroy()
        instance = null
      }
    },

    morph: function (themeIndex) {
      if (instance) instance.morph(themeIndex)
    },

    // 切换到指定主题（0-9）
    switchTheme: function (themeIndex) {
      if (instance) instance.morph(themeIndex)
    },

    // 获取当前主题索引
    getCurrentThemeIndex: function () {
      return instance ? instance.currentThemeIndex : 0
    },

    // 获取主题总数
    getThemeCount: function () {
      return THEMES.length
    },

    getInstance: function () {
      return instance
    },
  }

  console.log("[BlackHoleBackground] 模块已加载")
})()
