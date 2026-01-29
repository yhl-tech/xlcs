<template>
  <div class="home-page">
    <!-- WebGL 背景容器 -->
    <div ref="canvasContainer" class="canvas-container"></div>

    <!-- 固定导航栏 -->
    <nav class="nav-bar">
      <div class="logo-group">
        <div class="logo-wrapper">
          <div class="logo-glow"></div>
          <img :src="`${baseUrl}images/logo.png`" alt="InnerScan Logo" class="logo-img" />
        </div>
        <div class="logo-text">
          <div class="logo-title">
            INNER<span class="logo-highlight">SCAN</span>
          </div>
          <div class="logo-subtitle">
            <span class="line-left"></span>
            <span class="text">知己心探</span>
            <span class="line-right"></span>
          </div>
        </div>
      </div>
    </nav>

    <!-- 滚动内容区域 -->
    <div class="scroll-container">
      
      <!-- 第一屏：Hero -->
      <section class="section" id="section-1">
        <div class="container">
          <div class="grid-layout">
            <div class="hero-content">
              <div class="status-badge">
                <div class="status-dot"></div>
                <span class="status-text">Multimodal Subconscious Decoding Engine</span>
              </div>
              
              <h1 class="hero-title">
                Decoding <span class="text-gradient">Your Soul</span>
              </h1>
              
              <p class="hero-subtitle">抵达你不曾了解的自我</p>
              
              <p class="hero-description">
                InnerScan 融合多模态 AI 与投射性心理测试，深度解析你的潜意识结构。<br>
                我们将模糊的直觉转化为可视化的<strong class="highlight-text">"心理基因组"</strong>，助你精准洞察核心人格、情绪模式与潜在天赋。
              </p>

              <router-link to="/login" class="cta-btn">
                启动心灵扫描
              </router-link>
            </div>
          </div>
        </div>
        
        <div class="scroll-hint">
          <span class="scroll-text">SCROLL TO DECODE</span>
          <svg class="scroll-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
          </svg>
        </div>
      </section>

      <!-- 第二屏：Methodology -->
      <section class="section" id="section-2">
        <div class="container">
          <div class="grid-layout">
            <div class="method-content">
              <div class="accent-line"></div>
              
              <h2 class="section-title">
                捕捉<br>
                <span class="text-gradient-purple">灵魂的微颤</span>
              </h2>
              
              <p class="section-description">
                传统的心理测试依赖主观经验，而 InnerScan 的多模态 AI 引擎能深度解析你语气的起伏、对图像的直觉反应与认知模式。<br><br>
                我们将思维的混沌墨迹，重组为双螺旋般的有序序列。
              </p>

              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-value purple">98%</div>
                  <div class="stat-label">Pattern Match</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value cyan">24ms</div>
                  <div class="stat-label">Latency</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 第三屏：Nebula Features -->
      <section class="section section-nebula" id="section-3">
        <div class="container">
          <div class="grid-layout nebula-grid">
            
            <!-- 左侧：浮动标签 -->
            <div class="nebula-labels-wrapper">
              <div class="nebula-label" :style="{ top: '10%', left: '5%', animationDelay: '0s' }">
                <h3>亲子关系与儿童发展</h3>
                <p>Parent-Child Dynamics</p>
              </div>
              <div class="nebula-label" :style="{ top: '18%', left: '55%', animationDelay: '1.2s' }">
                <h3>深度自我探索</h3>
                <p>Deep Self-Discovery</p>
              </div>
              <div class="nebula-label" :style="{ top: '32%', left: '0%', animationDelay: '2.5s' }">
                <h3>职业发展与转型</h3>
                <p>Career Transition</p>
              </div>
              <div class="nebula-label" :style="{ top: '42%', left: '45%', animationDelay: '0.5s' }">
                <h3>婚恋与亲密关系</h3>
                <p>Intimate Relationships</p>
              </div>
              <div class="nebula-label" :style="{ top: '55%', left: '8%', animationDelay: '3s' }">
                <h3>心理健康自查与调节</h3>
                <p>Mental Health Monitor</p>
              </div>
              <div class="nebula-label" :style="{ top: '65%', left: '50%', animationDelay: '1.8s' }">
                <h3>员工关怀与留任</h3>
                <p>Employee Retention</p>
              </div>
              <div class="nebula-label" :style="{ top: '78%', left: '2%', animationDelay: '4s' }">
                <h3>领导力发展</h3>
                <p>Leadership Growth</p>
              </div>
              <div class="nebula-label" :style="{ top: '85%', left: '40%', animationDelay: '2.2s' }">
                <h3>精准招聘</h3>
                <p>Precise Recruitment</p>
              </div>
            </div>

            <!-- 右侧：内容 -->
            <div class="nebula-content">
              <div class="section-badge">
                <span class="badge-line"></span>
                <span class="badge-text">Analysis</span>
              </div>
              
              <h2 class="section-title">
                心灵<br>
                <span class="text-gradient-cyan">生命星云</span>
              </h2>
              
              <p class="section-description">
                你的每一次选择、每一段关系、每一种潜能，都汇聚成这片独一无二的星云。<br>
                InnerScan 帮你在这个复杂的系统中，找到属于你的引力中心。
              </p>

              <router-link to="/login" class="cta-btn small">
                启动心灵扫描
              </router-link>
            </div>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, shallowRef, markRaw } from 'vue'

// 获取 BASE_URL 用于资源路径
const baseUrl = import.meta.env.BASE_URL

const canvasContainer = ref(null)

// Three.js 状态
const threeState = shallowRef({
  scene: null,
  camera: null,
  renderer: null,
  group: null,
  material: null,
  lineMaterial: null,
  animationId: null,
  clock: null
})

let targetScroll = 0
let currentScroll = 0
const mouse = { x: 0, y: 0 }

onMounted(async () => {
  await initThreeJS()
  window.addEventListener('scroll', handleScroll)
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  cleanup()
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('resize', handleResize)
})

async function initThreeJS() {
  const container = canvasContainer.value
  if (!container) return

  const THREE = await import('three')

  // 创建场景
  const scene = markRaw(new THREE.Scene())
  scene.fog = new THREE.FogExp2(0x030511, 0.015)

  // 创建相机
  const camera = markRaw(new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  ))
  camera.position.set(-5, 0, 32)

  // 创建渲染器
  const renderer = markRaw(new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  }))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  // 创建粒子系统
  const { group, material, lineMaterial } = createParticleSystem(THREE)
  scene.add(group)

  // 初始位置
  if (window.innerWidth >= 1024) {
    group.position.x = 8
  }

  // 创建时钟
  const clock = new THREE.Clock()

  // 保存状态
  threeState.value = { scene, camera, renderer, group, material, lineMaterial, clock }

  // 启动动画循环
  animate()
}

function createParticleSystem(THREE) {
  const particleCount = 12000
  
  // 创建数组
  const posBrain = new Float32Array(particleCount * 3)
  const posDNA = new Float32Array(particleCount * 3)
  const posMap = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)
  const randoms = new Float32Array(particleCount)

  const colCyan = new THREE.Color('#00f2ea')
  const colBlue = new THREE.Color('#0055ff')
  const colPurple = new THREE.Color('#ff0080')

  const brainVecs = []

  // 1. Brain 形态（神经网络）
  for (let i = 0; i < particleCount; i++) {
    const side = Math.random() > 0.5 ? 1 : -1
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = Math.cbrt(Math.random()) * 8

    let x = r * Math.sin(phi) * Math.cos(theta)
    let y = r * Math.sin(phi) * Math.sin(theta)
    let z = r * Math.cos(phi)

    x *= 0.8
    y *= 0.7
    z *= 1.2
    x += side * 1.5
    x += (Math.random() - 0.5) * 0.5
    y += (Math.random() - 0.5) * 0.5
    z += (Math.random() - 0.5) * 0.5

    posBrain[i * 3] = x
    posBrain[i * 3 + 1] = y
    posBrain[i * 3 + 2] = z
    
    brainVecs.push(new THREE.Vector3(x, y, z))

    const c = Math.random() > 0.7 ? colPurple : (Math.random() > 0.4 ? colBlue : colCyan)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
    
    sizes[i] = Math.random()
    randoms[i] = Math.random()
  }

  // 2. DNA 形态（双螺旋）
  for (let i = 0; i < particleCount; i++) {
    const t = i / particleCount
    const height = 30
    const radius = 4
    const twists = 4
    
    const yPos = (t - 0.5) * height
    const angle = t * Math.PI * 2 * twists
    const strand = i % 2 === 0 ? 0 : Math.PI
    const spread = (Math.random() - 0.5) * 1.5

    posDNA[i * 3] = (radius + spread) * Math.cos(angle + strand)
    posDNA[i * 3 + 1] = yPos
    posDNA[i * 3 + 2] = (radius + spread) * Math.sin(angle + strand)
  }

  // 3. 星云形态（三个聚类）
  const centers = [
    { x: -4, y: 5, z: 0 },
    { x: 5, y: -2, z: 2 },
    { x: -3, y: -6, z: -2 }
  ]

  for (let i = 0; i < particleCount; i++) {
    const clusterIdx = i % centers.length
    const center = centers[clusterIdx]
    
    const u = Math.random()
    const v = Math.random()
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    const r = 4.0 * Math.cbrt(Math.random())

    let x = center.x + r * Math.sin(phi) * Math.cos(theta)
    let y = center.y + r * Math.sin(phi) * Math.sin(theta)
    let z = center.z + r * Math.cos(phi)
    
    // 添加一些散点
    if (Math.random() > 0.8) {
      x = (Math.random() - 0.5) * 30
      y = (Math.random() - 0.5) * 30
      z = (Math.random() - 0.5) * 20
    }

    posMap[i * 3] = x
    posMap[i * 3 + 1] = y
    posMap[i * 3 + 2] = z
  }

  // 4. 创建连接线（仅用于 Brain 形态）
  const linePositions = []
  const connectionDist = 3.0
  const maxLines = 10000
  let lineCount = 0

  for (let i = 0; i < particleCount && lineCount < maxLines; i++) {
    if (Math.random() > 0.3) continue
    for (let j = i + 1; j < particleCount; j += 10) {
      const d = brainVecs[i].distanceTo(brainVecs[j])
      if (d < connectionDist) {
        linePositions.push(brainVecs[i].x, brainVecs[i].y, brainVecs[i].z)
        linePositions.push(brainVecs[j].x, brainVecs[j].y, brainVecs[j].z)
        lineCount++
        if (lineCount >= maxLines) break
      }
    }
  }

  // 创建几何体
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(posBrain, 3))
  geometry.setAttribute('posBrain', new THREE.BufferAttribute(posBrain, 3))
  geometry.setAttribute('posDNA', new THREE.BufferAttribute(posDNA, 3))
  geometry.setAttribute('posMap', new THREE.BufferAttribute(posMap, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1))

  const lineGeometry = new THREE.BufferGeometry()
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))

  // 粒子材质
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uScroll: { value: 0.0 },
      uMouse: { value: new THREE.Vector2(0, 0) }
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uScroll;
      uniform vec2 uMouse;
      
      attribute vec3 posBrain;
      attribute vec3 posDNA;
      attribute vec3 posMap;
      attribute vec3 color;
      attribute float aSize;
      attribute float aRandom;
      
      varying vec3 vColor;
      varying float vAlpha;

      float hash(float n) { return fract(sin(n) * 43758.5453123); }
      
      float noise(vec3 x) {
        vec3 p = floor(x);
        vec3 f = fract(x);
        f = f*f*(3.0-2.0*f);
        float n = p.x + p.y*57.0 + 113.0*p.z;
        return mix(mix(mix(hash(n+0.0), hash(n+1.0),f.x),
                       mix(hash(n+57.0), hash(n+58.0),f.x),f.y),
                   mix(mix(hash(n+113.0), hash(n+114.0),f.x),
                       mix(hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
      }

      void main() {
        vec3 pos;
        float chaos = 0.0;

        if (uScroll < 1.0) {
          pos = mix(posBrain, posDNA, smoothstep(0.0, 1.0, uScroll));
          chaos = sin(uScroll * 3.14159) * 0.5;
        } else {
          float t = uScroll - 1.0;
          pos = mix(posDNA, posMap, smoothstep(0.0, 1.0, t));
          chaos = sin(t * 3.14159) * 0.5;
        }
        
        float n = noise(pos * 0.2 + uTime * 0.5);
        pos += n * chaos * 4.0;

        float breath = sin(uTime + pos.y * 0.2) * 0.05;
        pos += normalize(pos) * breath;

        float angle = uTime * 0.1;
        float s = sin(angle);
        float c = cos(angle);
        mat3 rotY = mat3(c, 0, s, 0, 1, 0, -s, 0, c);
        pos = pos * rotY;

        pos.x += uMouse.x * 2.0;
        pos.y += uMouse.y * 2.0;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float baseSize = 160.0 * uPixelRatio;
        gl_PointSize = baseSize * (aSize * 0.6 + 0.4) * (1.0 / -mvPosition.z);

        vec3 col = color;
        col += vec3(chaos);
        vColor = col;
        vAlpha = 0.9 + chaos * 0.1;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float glow = 1.0 - (d * 2.0);
        glow = pow(glow, 1.5);
        gl_FragColor = vec4(vColor, vAlpha * glow);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  // 线材质
  const lineMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScroll: { value: 0.0 },
      uMouse: { value: new THREE.Vector2(0, 0) }
    },
    vertexShader: `
      uniform float uTime;
      uniform float uScroll;
      uniform vec2 uMouse;
      varying float vOpacity;

      void main() {
        vec3 pos = position;
        
        float angle = uTime * 0.1;
        float s = sin(angle);
        float c = cos(angle);
        mat3 rotY = mat3(c, 0, s, 0, 1, 0, -s, 0, c);
        pos = pos * rotY;

        pos.x += uMouse.x * 2.0;
        pos.y += uMouse.y * 2.0;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        
        float fade = 1.0 - smoothstep(0.0, 0.5, uScroll);
        float blink = 0.5 + 0.5 * sin(uTime * 5.0 + pos.x + pos.y);
        
        vOpacity = 0.6 * fade * blink;
      }
    `,
    fragmentShader: `
      varying float vOpacity;
      
      void main() {
        if (vOpacity < 0.01) discard;
        gl_FragColor = vec4(0.2, 0.9, 1.0, vOpacity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  const points = new THREE.Points(geometry, material)
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial)

  const group = new THREE.Group()
  group.add(points)
  group.add(lines)

  return { group, material, lineMaterial }
}

function animate() {
  const { scene, camera, renderer, group, material, lineMaterial, clock } = threeState.value
  if (!renderer || !scene || !camera) return

  threeState.value.animationId = requestAnimationFrame(animate)
  
  const time = clock.getElapsedTime()

  // 平滑滚动
  currentScroll += (targetScroll - currentScroll) * 0.05

  // 更新 uniforms
  material.uniforms.uScroll.value = currentScroll
  lineMaterial.uniforms.uScroll.value = currentScroll
  material.uniforms.uTime.value = time
  lineMaterial.uniforms.uTime.value = time

  // 鼠标跟随
  material.uniforms.uMouse.value.x += (mouse.x - material.uniforms.uMouse.value.x) * 0.05
  material.uniforms.uMouse.value.y += (mouse.y - material.uniforms.uMouse.value.y) * 0.05
  lineMaterial.uniforms.uMouse.value.x = material.uniforms.uMouse.value.x
  lineMaterial.uniforms.uMouse.value.y = material.uniforms.uMouse.value.y

  // 布局位移
  if (currentScroll < 1.0) {
    group.position.x = 8
  } else {
    group.position.x = 8 - (currentScroll - 1.0) * 13
  }

  renderer.render(scene, camera)
}

function handleScroll() {
  const scrollY = window.scrollY
  const height = window.innerHeight
  const totalScroll = document.body.scrollHeight - height
  const progress = totalScroll > 0 ? scrollY / totalScroll : 0
  targetScroll = progress * 2.0
}

function handleMouseMove(e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
}

function handleResize() {
  const { camera, renderer, group } = threeState.value
  if (!renderer || !camera) return

  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)

  if (window.innerWidth < 1024) {
    camera.position.set(0, 0, 55)
    group.position.set(0, 0, 0)
  } else {
    camera.position.set(-5, 0, 32)
    group.position.x = 8
  }
}

function cleanup() {
  const { renderer, animationId } = threeState.value
  
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  
  if (renderer) {
    renderer.dispose()
    if (canvasContainer.value && renderer.domElement && canvasContainer.value.contains(renderer.domElement)) {
      canvasContainer.value.removeChild(renderer.domElement)
    }
  }
  
  threeState.value = {
    scene: null,
    camera: null,
    renderer: null,
    group: null,
    material: null,
    lineMaterial: null,
    animationId: null,
    clock: null
  }
}
</script>

<style lang="less">
// 全局样式覆盖（非 scoped）
body {
  overflow-y: auto !important;
  overflow-x: hidden !important;
  height: auto !important;
  display: block !important;
}

html {
  overflow-y: auto !important;
  scroll-behavior: smooth;
}

#app {
  height: auto !important;
  min-height: 100vh;
}

#app-root {
  height: auto !important;
  min-height: 100vh;
}
</style>

<style lang="less" scoped>
// 变量定义
@brand-cyan: #00f2ea;
@brand-blue: #0055ff;
@brand-purple: #ff0080;
@brand-dark: #030511;

// 主容器
.home-page {
  position: relative;
  width: 100%;
  min-height: 300vh; // 确保有足够的滚动空间（3个屏幕）
  background-color: @brand-dark;
  color: white;
  font-family: 'Inter', system-ui, sans-serif;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

// WebGL 背景
.canvas-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
}

// 导航栏
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  padding: 2rem 2.5rem;
  background: transparent;
  pointer-events: auto;
}

.logo-group {
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  user-select: none;

  &:hover {
    .logo-glow {
      opacity: 1;
    }
  }
}

.logo-wrapper {
  position: relative;
  width: 64px;
  height: 64px;
}

.logo-glow {
  position: absolute;
  inset: 0;
  background: fade(@brand-cyan, 20%);
  filter: blur(40px);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.logo-img {
  width: 64px;
  height: 64px;
  object-fit: contain;
  position: relative;
  z-index: 10;
  filter: drop-shadow(0 0 15px fade(@brand-cyan, 20%));
}

.logo-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.logo-title {
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  color: white;
  font-family: 'Orbitron', sans-serif;
  line-height: 1;
  display: flex;
  align-items: center;
  gap: 2px;
}

.logo-highlight {
  background: linear-gradient(to right, @brand-cyan, @brand-blue);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.logo-subtitle {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.8;

  .line-left,
  .line-right {
    height: 1px;
    width: 12px;
    background: @brand-cyan;
    opacity: 0.5;
  }

  .text {
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 0.4em;
    color: @brand-cyan;
    text-transform: uppercase;
  }
}

// 滚动容器
.scroll-container {
  position: relative;
  z-index: 10;
  width: 100%;
}

// 区块通用样式
.section {
  position: relative;
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5%;
}

.container {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
}

.grid-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
}

// 第一屏：Hero
.hero-content {
  pointer-events: auto;
  max-width: 800px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 50px;
  border: 1px solid fade(white, 10%);
  background: fade(white, 5%);
  backdrop-filter: blur(10px);
  margin-bottom: 2rem;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: @brand-cyan;
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.status-text {
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  color: fade(white, 70%);
  letter-spacing: 0.1em;
}

.hero-title {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 500;
  letter-spacing: 0.1em;
  line-height: 1.2;
  margin-bottom: 1rem;
  font-family: 'Orbitron', sans-serif;
  color: white;
}

.text-gradient {
  background: linear-gradient(135deg, #fff 0%, @brand-cyan 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  font-weight: bold;
  letter-spacing: 0.1em;
  margin-bottom: 2rem;
  text-shadow: 0 2px 10px fade(black, 50%);
}

.hero-description {
  font-size: 1.25rem;
  line-height: 1.8;
  font-weight: 300;
  max-width: 600px;
  margin-bottom: 3rem;
  color: white;
}

.highlight-text {
  color: @brand-cyan;
  font-weight: 500;
}

.cta-btn {
  display: inline-block;
  padding: 1rem 3rem;
  background: @brand-cyan;
  color: black;
  font-weight: bold;
  letter-spacing: 0.2em;
  font-size: 0.875rem;
  border-radius: 2px;
  text-decoration: none;
  transition: all 0.3s ease;
  box-shadow: 0 0 20px fade(@brand-cyan, 40%);
  cursor: pointer;

  &:hover {
    background: white;
    transform: translateY(-2px);
    box-shadow: 0 0 30px fade(white, 60%);
  }

  &.small {
    padding: 0.75rem 2.5rem;
    font-size: 0.75rem;
  }
}

.scroll-hint {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0.6;
  animation: bounce 2s ease-in-out infinite;
  pointer-events: none;
}

.scroll-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.2em;
  color: fade(white, 50%);
}

.scroll-icon {
  color: fade(white, 50%);
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { 
    transform: translateY(0) translateX(-50%); 
  }
  40% { 
    transform: translateY(-10px) translateX(-50%); 
  }
  60% { 
    transform: translateY(-5px) translateX(-50%); 
  }
}

// 第二屏：Methodology
.method-content {
  pointer-events: auto;
  max-width: 600px;
}

.accent-line {
  height: 1px;
  width: 80px;
  background: @brand-purple;
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 500;
  letter-spacing: 0.05em;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  color: white;
}

.text-gradient-purple {
  background: linear-gradient(to right, @brand-purple, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.text-gradient-cyan {
  background: linear-gradient(to right, @brand-cyan, white);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.section-description {
  font-size: 1.125rem;
  line-height: 1.8;
  font-weight: 300;
  max-width: 500px;
  margin-bottom: 2rem;
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  max-width: 400px;
}

.stat-card {
  padding: 1rem;
  border: 1px solid fade(white, 10%);
  background: fade(white, 5%);
  border-radius: 2px;
  backdrop-filter: blur(10px);
}

.stat-value {
  font-size: 1.5rem;
  font-family: 'Orbitron', sans-serif;
  margin-bottom: 4px;
  font-weight: 700;

  &.purple {
    color: @brand-purple;
  }

  &.cyan {
    color: @brand-cyan;
  }
}

.stat-label {
  font-size: 10px;
  color: fade(white, 50%);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

// 第三屏：Nebula
.section-nebula {
  .container {
    height: 100vh;
  }
}

.nebula-grid {
  height: 100%;
}

.nebula-labels-wrapper {
  position: relative;
  height: 100%;
  width: 100%;
  transform: scale(0.9);
  transform-origin: left center;

  @media (max-width: 1024px) {
    display: none;
  }
}

.nebula-label {
  position: absolute;
  padding: 1rem 1.5rem;
  min-width: 260px;
  border-left: 2px solid fade(@brand-cyan, 50%);
  background: linear-gradient(90deg, fade(@brand-cyan, 5%), transparent);
  backdrop-filter: blur(2px);
  transition: all 0.5s ease;
  animation: float 6s ease-in-out infinite;
  pointer-events: auto;

  &:hover {
    border-color: @brand-cyan;
    background: linear-gradient(90deg, fade(@brand-cyan, 15%), transparent);
    transform: translateX(5px);
  }

  h3 {
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    color: white;
    font-size: 1.25rem;
    margin-bottom: 4px;
    line-height: 1.3;
  }

  p {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: fade(@brand-cyan, 80%);
    letter-spacing: 0.05em;
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

.nebula-content {
  pointer-events: auto;
  padding-left: 5rem;

  @media (max-width: 1024px) {
    padding-left: 0;
  }
}

.section-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 1.5rem;
}

.badge-line {
  height: 1px;
  width: 40px;
  background: @brand-cyan;
}

.badge-text {
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  color: @brand-cyan;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

// 响应式
@media (max-width: 768px) {
  .nav-bar {
    padding: 1rem;
  }

  .logo-wrapper,
  .logo-img {
    width: 48px;
    height: 48px;
  }

  .logo-title {
    font-size: 1.25rem;
  }

  .section {
    padding: 0 1.5rem;
  }

  .hero-description {
    font-size: 1rem;
  }

  .cta-btn {
    padding: 0.875rem 2rem;
    font-size: 0.75rem;
  }

  .nebula-content {
    padding-left: 0;
  }
}

// 选择样式
::selection {
  background-color: @brand-cyan;
  color: black;
}
</style>
