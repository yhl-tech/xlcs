<template>
  <div ref="containerRef" class="blackhole-container" :style="{ zIndex: zIndex }"></div>
</template>

<script setup>
/**
 * 黑洞粒子背景组件
 * 完全复刻原始的复杂黑洞吸积盘效果
 */
import { ref, onMounted, onUnmounted, watch, shallowRef, markRaw } from 'vue'

const props = defineProps({
  theme: {
    type: Number,
    default: 0
  },
  enabled: {
    type: Boolean,
    default: true
  },
  zIndex: {
    type: Number,
    default: -1
  }
})

const containerRef = ref(null)

// 使用 shallowRef 避免 Vue 对 Three.js 对象进行深度响应式处理
const threeState = shallowRef({
  scene: null,
  camera: null,
  renderer: null,
  accretionDisk: null,
  backgroundStars: null,
  floatingParticles: null,
  eventHorizon: null,
  animationId: null,
  clock: null
})

// 粒子数据
const accretionData = {
  radii: null,
  angles: null,
  heights: null
}

const floatingData = {
  velocities: null,
  originalPositions: null
}

// 配置
const CONFIG = {
  ACCRETION_DISK_PARTICLES: 35000,
  BACKGROUND_STARS: 15000,
  FLOATING_PARTICLES: 400,
  EVENT_HORIZON_RADIUS: 3.0,
  ACCRETION_DISK_INNER: 4.0,
  ACCRETION_DISK_OUTER: 50.0,
  CAMERA_POSITION: { x: 0, y: 35, z: 60 },
  CAMERA_LOOK_AT: { x: 0, y: 0, z: 0 },
  BASE_ROTATION_SPEED: 0.15,
  INFALL_SPEED: 0.008,
  TWINKLE_SPEED: 2.0
}

// 主题配置
const THEMES = [
  {
    name: '初始冷静',
    colors: {
      core: { h: 205, s: 65, l: 35 },
      inner: { h: 200, s: 70, l: 40 },
      mid: { h: 210, s: 60, l: 30 },
      outer: { h: 200, s: 50, l: 25 },
      accent: { h: 190, s: 70, l: 45 }
    },
    morph: { rotationSpeed: 0.08, infallSpeed: 0.005, spiralArms: 2, particleDensity: 0.8, particleSizeVariation: 0.3 },
    transitionDuration: 2.5
  }
]

let currentTheme = THEMES[0]
let targetFPS = 30
let frameInterval = 1000 / targetFPS
let lastFrameTime = 0

onMounted(async () => {
  if (props.enabled) {
    await initThreeJS()
  }
})

onUnmounted(() => {
  cleanup()
})

watch(() => props.enabled, async (enabled) => {
  if (enabled) {
    await initThreeJS()
  } else {
    cleanup()
  }
})

watch(() => props.theme, (themeIndex) => {
  console.log('[BlackHoleBackground] 切换主题:', themeIndex)
})

async function initThreeJS() {
  const container = containerRef.value
  if (!container) {
    console.error('[BlackHoleBackground] 容器未找到')
    return
  }

  console.log('[BlackHoleBackground] 开始初始化，容器尺寸:', container.clientWidth, 'x', container.clientHeight)

  const THREE = await import('three')
  console.log('[BlackHoleBackground] Three.js 已加载')

  // 创建场景
  const scene = markRaw(new THREE.Scene())
  scene.background = new THREE.Color(0x000000)

  // 创建相机
  const camera = markRaw(new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  ))
  camera.position.set(CONFIG.CAMERA_POSITION.x, CONFIG.CAMERA_POSITION.y, CONFIG.CAMERA_POSITION.z)
  camera.lookAt(CONFIG.CAMERA_LOOK_AT.x, CONFIG.CAMERA_LOOK_AT.y, CONFIG.CAMERA_LOOK_AT.z)

  // 创建渲染器
  const renderer = markRaw(new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
  }))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)
  console.log('[BlackHoleBackground] 渲染器已创建')

  // 创建事件视界（黑色球体）
  const eventHorizon = createEventHorizon(THREE)
  scene.add(eventHorizon)

  // 创建吸积盘粒子
  const accretionDisk = createAccretionDisk(THREE)
  scene.add(accretionDisk)
  console.log('[BlackHoleBackground] 吸积盘已创建，粒子数:', CONFIG.ACCRETION_DISK_PARTICLES)

  // 创建背景星空
  const backgroundStars = createBackgroundStars(THREE)
  scene.add(backgroundStars)
  console.log('[BlackHoleBackground] 背景星空已创建，星星数:', CONFIG.BACKGROUND_STARS)

  // 创建全屏流动大粒子
  const floatingParticles = createFloatingParticles(THREE)
  scene.add(floatingParticles)
  console.log('[BlackHoleBackground] 流动粒子已创建，数量:', CONFIG.FLOATING_PARTICLES)

  // 创建时钟
  const clock = new THREE.Clock()

  // 保存状态
  threeState.value = {
    scene,
    camera,
    renderer,
    accretionDisk,
    backgroundStars,
    floatingParticles,
    eventHorizon,
    clock,
    animationId: null
  }

  // 添加窗口调整监听
  window.addEventListener('resize', handleResize)

  // 开始动画
  animate(THREE)
  console.log('[BlackHoleBackground] 动画循环已启动')
}

function createEventHorizon(THREE) {
  const geometry = new THREE.SphereGeometry(CONFIG.EVENT_HORIZON_RADIUS, 64, 64)
  const material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: false
  })
  return new THREE.Mesh(geometry, material)
}

function createAccretionDisk(THREE) {
  const count = CONFIG.ACCRETION_DISK_PARTICLES
  const geometry = new THREE.BufferGeometry()

  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const alphas = new Float32Array(count)

  accretionData.radii = new Float32Array(count)
  accretionData.angles = new Float32Array(count)
  accretionData.heights = new Float32Array(count)

  const innerRadius = CONFIG.ACCRETION_DISK_INNER
  const outerRadius = CONFIG.ACCRETION_DISK_OUTER

  for (let i = 0; i < count; i++) {
    const t = Math.random()
    const radius = innerRadius + (outerRadius - innerRadius) * Math.pow(t, 0.5)
    const angle = Math.random() * Math.PI * 2

    const spiralArms = currentTheme.morph.spiralArms
    const armOffset = (Math.floor(Math.random() * spiralArms) / spiralArms) * Math.PI * 2
    const spiralAngle = angle + armOffset + (radius / outerRadius) * Math.PI * 2

    const heightFactor = Math.pow(radius / outerRadius, 1.5)
    const height = (Math.random() - 0.5) * 2.0 * heightFactor

    accretionData.radii[i] = radius
    accretionData.angles[i] = spiralAngle
    accretionData.heights[i] = height

    positions[i * 3] = Math.cos(spiralAngle) * radius
    positions[i * 3 + 1] = height
    positions[i * 3 + 2] = Math.sin(spiralAngle) * radius

    const normalizedRadius = (radius - innerRadius) / (outerRadius - innerRadius)
    const color = getAccretionColor(normalizedRadius, THREE)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b

    const sizeFactor = 1.0 - normalizedRadius * 0.7
    sizes[i] = (0.5 + Math.random() * 1.5) * sizeFactor + Math.random() * 0.5

    alphas[i] = 0.3 + 0.7 * (1.0 - normalizedRadius)
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))

  const material = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
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
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        float glow = 1.0 - smoothstep(0.0, 0.5, dist);
        float core = 1.0 - smoothstep(0.0, 0.2, dist);
        vec3 finalColor = vColor * glow + vec3(1.0) * core * 0.5;
        float finalAlpha = vAlpha * glow;
        if (finalAlpha < 0.01) discard;
        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  return new THREE.Points(geometry, material)
}

function getAccretionColor(normalizedRadius, THREE) {
  const theme = currentTheme
  const colors = theme.colors
  let h, s, l

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

  const randomVariation = Math.random()
  h += (randomVariation - 0.5) * 10
  s = Math.max(0.3, Math.min(1.0, s + (randomVariation - 0.5) * 0.1))
  l = Math.max(0.2, Math.min(0.7, l + (randomVariation - 0.5) * 0.1))

  const color = new THREE.Color()
  color.setHSL(h / 360, s, l)
  return color
}

function createBackgroundStars(THREE) {
  const count = CONFIG.BACKGROUND_STARS
  const geometry = new THREE.BufferGeometry()

  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const twinklePhases = new Float32Array(count)

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

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('twinklePhase', new THREE.BufferAttribute(twinklePhases, 1))

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }
    },
    vertexShader: `
      attribute float size;
      attribute float twinklePhase;
      varying float vTwinklePhase;
      uniform float time;
      void main() {
        vTwinklePhase = twinklePhase;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float twinkle = 0.5 + 0.5 * sin(time * 2.0 + twinklePhase * 6.28);
        gl_PointSize = size * twinkle * (200.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vTwinklePhase;
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        vec3 color;
        if (vTwinklePhase < 0.3) {
          color = vec3(0.8, 1.0, 1.0);
        } else if (vTwinklePhase < 0.6) {
          color = vec3(1.0, 0.8, 1.0);
        } else {
          color = vec3(1.0, 1.0, 1.0);
        }
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(color, alpha * 0.8);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  return new THREE.Points(geometry, material)
}

function createFloatingParticles(THREE) {
  const count = CONFIG.FLOATING_PARTICLES
  const geometry = new THREE.BufferGeometry()

  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)

  floatingData.velocities = new Float32Array(count * 3)
  floatingData.originalPositions = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 200
    const y = (Math.random() - 0.5) * 100
    const z = (Math.random() - 0.5) * 150 - 20

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    floatingData.originalPositions[i * 3] = x
    floatingData.originalPositions[i * 3 + 1] = y
    floatingData.originalPositions[i * 3 + 2] = z

    floatingData.velocities[i * 3] = (Math.random() - 0.5) * 2
    floatingData.velocities[i * 3 + 1] = (Math.random() - 0.5) * 1
    floatingData.velocities[i * 3 + 2] = (Math.random() - 0.5) * 2

    // 离散配色：青色、紫色、白色、深蓝色
    const colorType = Math.random()
    const color = new THREE.Color()

    if (colorType < 0.3) {
      color.setRGB(0.2, 1.0, 0.95) // 青色
    } else if (colorType < 0.55) {
      color.setRGB(0.85, 0.3, 0.9) // 紫色
    } else if (colorType < 0.75) {
      color.setRGB(0.3, 0.4, 1.0) // 深蓝色
    } else {
      color.setRGB(1.0, 1.0, 1.0) // 白色
    }

    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b

    sizes[i] = 2 + Math.random() * 6
    phases[i] = Math.random()
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1))

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }
    },
    vertexShader: `
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
        float pulse = 1.0 + 0.3 * sin(time * 1.5 + phase * 6.28);
        gl_PointSize = size * pulse * (400.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vPhase;
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        float sharpCore = 1.0 - smoothstep(0.0, 0.05, dist);
        float innerRing = 1.0 - smoothstep(0.03, 0.12, dist);
        float softGlow = 1.0 - smoothstep(0.05, 0.3, dist);
        vec3 coreColor = vec3(1.0, 1.0, 1.0) * sharpCore * 1.5;
        vec3 ringColor = (vColor * 1.2 + vec3(0.3)) * innerRing;
        vec3 glowColor = vColor * softGlow * 0.4;
        vec3 finalColor = coreColor + ringColor + glowColor;
        float finalAlpha = sharpCore + innerRing * 0.8 + softGlow * 0.3;
        finalAlpha = clamp(finalAlpha, 0.0, 1.0);
        if (finalAlpha < 0.02) discard;
        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  return new THREE.Points(geometry, material)
}

function animate(THREE) {
  const { scene, camera, renderer, accretionDisk, backgroundStars, floatingParticles, clock } = threeState.value
  if (!renderer || !scene || !camera) return

  function loop() {
    threeState.value.animationId = requestAnimationFrame(loop)

    // 帧率节流
    const currentTime = performance.now()
    const elapsed = currentTime - lastFrameTime
    
    if (elapsed < frameInterval) {
      return
    }
    
    lastFrameTime = currentTime - (elapsed % frameInterval)

    const deltaTime = clock.getDelta()
    const elapsedTime = clock.getElapsedTime()

    // 更新吸积盘
    updateAccretionDisk(accretionDisk, deltaTime)

    // 更新背景星空
    if (backgroundStars) {
      backgroundStars.material.uniforms.time.value = elapsedTime
      backgroundStars.rotation.y += 0.0001
    }

    // 更新流动粒子
    updateFloatingParticles(floatingParticles, deltaTime, elapsedTime)

    renderer.render(scene, camera)
  }

  loop()
}

function updateAccretionDisk(accretionDisk, deltaTime) {
  if (!accretionDisk) return

  const positions = accretionDisk.geometry.attributes.position.array
  const count = positions.length / 3
  const innerRadius = CONFIG.ACCRETION_DISK_INNER
  const outerRadius = CONFIG.ACCRETION_DISK_OUTER
  const rotationSpeed = currentTheme.morph.rotationSpeed
  const infallSpeed = currentTheme.morph.infallSpeed

  for (let i = 0; i < count; i++) {
    let radius = accretionData.radii[i]
    let angle = accretionData.angles[i]
    let height = accretionData.heights[i]

    // 开普勒旋转
    const angularVelocity = rotationSpeed / Math.pow(radius / innerRadius, 1.5)
    angle += angularVelocity * deltaTime

    // 向内坠落
    radius -= infallSpeed * deltaTime * (1.0 + Math.random() * 0.5)

    // 高度降低
    height *= 0.9995

    // 重置到外边缘
    if (radius < innerRadius) {
      radius = outerRadius - Math.random() * 10
      angle = Math.random() * Math.PI * 2
      height = (Math.random() - 0.5) * 2.0
    }

    accretionData.radii[i] = radius
    accretionData.angles[i] = angle
    accretionData.heights[i] = height

    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = height
    positions[i * 3 + 2] = Math.sin(angle) * radius
  }

  accretionDisk.geometry.attributes.position.needsUpdate = true
}

function updateFloatingParticles(floatingParticles, deltaTime, time) {
  if (!floatingParticles) return

  floatingParticles.material.uniforms.time.value = time

  const positions = floatingParticles.geometry.attributes.position.array
  const count = positions.length / 3

  for (let i = 0; i < count; i++) {
    const vx = floatingData.velocities[i * 3]
    const vy = floatingData.velocities[i * 3 + 1]
    const vz = floatingData.velocities[i * 3 + 2]

    positions[i * 3] += vx * deltaTime
    positions[i * 3 + 1] += vy * deltaTime
    positions[i * 3 + 2] += vz * deltaTime

    // 边界检查
    if (positions[i * 3] > 100) positions[i * 3] = -100
    if (positions[i * 3] < -100) positions[i * 3] = 100
    if (positions[i * 3 + 1] > 50) positions[i * 3 + 1] = -50
    if (positions[i * 3 + 1] < -50) positions[i * 3 + 1] = 50
    if (positions[i * 3 + 2] > 50) positions[i * 3 + 2] = -100
    if (positions[i * 3 + 2] < -100) positions[i * 3 + 2] = 50

    // 波动效果
    const phase = floatingParticles.geometry.attributes.phase.array[i]
    positions[i * 3 + 1] += Math.sin(time * 0.5 + phase * 10) * 0.02
  }

  floatingParticles.geometry.attributes.position.needsUpdate = true
}

function handleResize() {
  const { camera, renderer } = threeState.value
  if (!renderer || !camera) return

  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function cleanup() {
  const { renderer, animationId } = threeState.value
  
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  
  if (renderer) {
    renderer.dispose()
    if (containerRef.value && renderer.domElement && containerRef.value.contains(renderer.domElement)) {
      containerRef.value.removeChild(renderer.domElement)
    }
  }
  
  window.removeEventListener('resize', handleResize)
  
  threeState.value = {
    scene: null,
    camera: null,
    renderer: null,
    accretionDisk: null,
    backgroundStars: null,
    floatingParticles: null,
    eventHorizon: null,
    animationId: null,
    clock: null
  }
}
</script>

<style scoped>
.blackhole-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background: #000000;
}
</style>
