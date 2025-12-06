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
 */

(function () {
    'use strict';

    // ============================================
    // 配置参数
    // ============================================
    const CONFIG = {
        // 粒子数量
        ACCRETION_DISK_PARTICLES: 35000,  // 吸积盘粒子
        BACKGROUND_STARS: 15000,           // 背景星空粒子
        FLOATING_PARTICLES: 400,           // 全屏流动大粒子

        // 黑洞参数
        EVENT_HORIZON_RADIUS: 3.0,         // 事件视界半径
        ACCRETION_DISK_INNER: 4.0,         // 吸积盘内边界
        ACCRETION_DISK_OUTER: 50.0,        // 吸积盘外边界

        // 相机设置
        CAMERA_POSITION: { x: 0, y: 35, z: 60 },
        CAMERA_LOOK_AT: { x: 0, y: 0, z: 0 },

        // 动画速度
        BASE_ROTATION_SPEED: 0.15,         // 基础旋转速度
        INFALL_SPEED: 0.008,               // 坠落速度
        TWINKLE_SPEED: 2.0,                // 闪烁速度

        // 颜色配置 (HSL)
        COLORS: {
            CORE: { h: 180, s: 100, l: 90 },      // 青白色核心
            INNER: { h: 190, s: 100, l: 70 },     // 青色
            MID: { h: 240, s: 80, l: 60 },        // 蓝色
            OUTER: { h: 280, s: 70, l: 50 },      // 紫色
            MAGENTA: { h: 300, s: 80, l: 60 }     // 品红色
        }
    };

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
    `;

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
    `;

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
    `;

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
    `;

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
    `;

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
    `;

    // ============================================
    // 黑洞背景类
    // ============================================
    class BlackHoleEffect {
        constructor(containerId) {
            this.containerId = containerId;
            this.container = null;
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.accretionDisk = null;
            this.backgroundStars = null;
            this.floatingParticles = null;
            this.eventHorizon = null;
            this.animationId = null;
            this.clock = null;
            this.isRunning = false;

            // 粒子数据
            this.accretionData = {
                positions: null,
                velocities: null,
                radii: null,
                angles: null
            };
        }

        init() {
            this.container = document.getElementById(this.containerId);
            if (!this.container) {
                console.error('[BlackHole] 容器未找到:', this.containerId);
                return false;
            }

            // 检查 Three.js
            if (typeof THREE === 'undefined') {
                console.error('[BlackHole] Three.js 未加载');
                return false;
            }

            try {
                this.setupScene();
                this.setupCamera();
                this.setupRenderer();
                this.createEventHorizon();
                this.createAccretionDisk();
                this.createBackgroundStars();
                this.createFloatingParticles();
                this.setupEventListeners();

                this.clock = new THREE.Clock();
                this.isRunning = true;
                this.animate();

                // 隐藏加载提示
                const loadingEl = document.getElementById('blackhole-loading');
                if (loadingEl) {
                    loadingEl.style.display = 'none';
                }

                console.log('[BlackHole] 初始化成功');
                return true;
            } catch (error) {
                console.error('[BlackHole] 初始化失败:', error);
                return false;
            }
        }

        setupScene() {
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x000000);
        }

        setupCamera() {
            const aspect = window.innerWidth / window.innerHeight;
            this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
            this.camera.position.set(
                CONFIG.CAMERA_POSITION.x,
                CONFIG.CAMERA_POSITION.y,
                CONFIG.CAMERA_POSITION.z
            );
            this.camera.lookAt(
                CONFIG.CAMERA_LOOK_AT.x,
                CONFIG.CAMERA_LOOK_AT.y,
                CONFIG.CAMERA_LOOK_AT.z
            );
        }

        setupRenderer() {
            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: false
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.container.appendChild(this.renderer.domElement);
        }

        // 创建事件视界 (纯黑色球体)
        createEventHorizon() {
            const geometry = new THREE.SphereGeometry(CONFIG.EVENT_HORIZON_RADIUS, 64, 64);
            const material = new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: false
            });
            this.eventHorizon = new THREE.Mesh(geometry, material);
            this.eventHorizon.position.set(0, 0, 0);
            this.scene.add(this.eventHorizon);
        }

        // 创建吸积盘粒子系统
        createAccretionDisk() {
            const count = CONFIG.ACCRETION_DISK_PARTICLES;
            const geometry = new THREE.BufferGeometry();

            // 初始化数组
            const positions = new Float32Array(count * 3);
            const colors = new Float32Array(count * 3);
            const sizes = new Float32Array(count);
            const alphas = new Float32Array(count);

            // 存储粒子运动数据
            this.accretionData.radii = new Float32Array(count);
            this.accretionData.angles = new Float32Array(count);
            this.accretionData.heights = new Float32Array(count);

            const innerRadius = CONFIG.ACCRETION_DISK_INNER;
            const outerRadius = CONFIG.ACCRETION_DISK_OUTER;

            for (let i = 0; i < count; i++) {
                // 使用指数分布使粒子在内侧更密集
                const t = Math.random();
                const radius = innerRadius + (outerRadius - innerRadius) * Math.pow(t, 0.5);
                const angle = Math.random() * Math.PI * 2;

                // 添加螺旋臂结构
                const spiralArms = 3;
                const armOffset = (Math.floor(Math.random() * spiralArms) / spiralArms) * Math.PI * 2;
                const spiralAngle = angle + armOffset + (radius / outerRadius) * Math.PI * 2;

                // 根据半径计算高度 (越靠近中心越扁平)
                const heightFactor = Math.pow(radius / outerRadius, 1.5);
                const height = (Math.random() - 0.5) * 2.0 * heightFactor;

                // 存储极坐标
                this.accretionData.radii[i] = radius;
                this.accretionData.angles[i] = spiralAngle;
                this.accretionData.heights[i] = height;

                // 转换为笛卡尔坐标
                positions[i * 3] = Math.cos(spiralAngle) * radius;
                positions[i * 3 + 1] = height;
                positions[i * 3 + 2] = Math.sin(spiralAngle) * radius;

                // 根据半径设置颜色
                const normalizedRadius = (radius - innerRadius) / (outerRadius - innerRadius);
                const color = this.getAccretionColor(normalizedRadius);
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;

                // 大小：靠近中心越大越亮
                const sizeFactor = 1.0 - normalizedRadius * 0.7;
                sizes[i] = (0.5 + Math.random() * 1.5) * sizeFactor + Math.random() * 0.5;

                // 透明度：靠近中心更亮
                alphas[i] = 0.3 + 0.7 * (1.0 - normalizedRadius);
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
            geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

            const material = new THREE.ShaderMaterial({
                uniforms: {},
                vertexShader: accretionVertexShader,
                fragmentShader: accretionFragmentShader,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            this.accretionDisk = new THREE.Points(geometry, material);
            this.scene.add(this.accretionDisk);
        }

        // 根据半径获取吸积盘颜色
        getAccretionColor(normalizedRadius) {
            const color = new THREE.Color();

            // 随机选择颜色类型
            const colorType = Math.random();

            if (normalizedRadius < 0.1) {
                // 核心区域：青白色
                color.setHSL(180 / 360, 0.8, 0.85 + Math.random() * 0.15);
            } else if (normalizedRadius < 0.3) {
                // 内区域：青色到蓝色
                if (colorType < 0.6) {
                    color.setHSL(190 / 360, 0.9, 0.6 + Math.random() * 0.2);
                } else {
                    color.setHSL(300 / 360, 0.8, 0.6 + Math.random() * 0.2); // 品红
                }
            } else if (normalizedRadius < 0.6) {
                // 中间区域：蓝色到紫色
                if (colorType < 0.5) {
                    color.setHSL(240 / 360, 0.7, 0.5 + Math.random() * 0.2);
                } else if (colorType < 0.8) {
                    color.setHSL(280 / 360, 0.7, 0.5 + Math.random() * 0.2);
                } else {
                    color.setHSL(300 / 360, 0.7, 0.5 + Math.random() * 0.2); // 品红
                }
            } else {
                // 外区域：紫色到品红
                if (colorType < 0.4) {
                    color.setHSL(280 / 360, 0.6, 0.4 + Math.random() * 0.2);
                } else if (colorType < 0.7) {
                    color.setHSL(300 / 360, 0.6, 0.4 + Math.random() * 0.2);
                } else {
                    color.setHSL(190 / 360, 0.5, 0.4 + Math.random() * 0.2); // 一些青色点缀
                }
            }

            return color;
        }

        // 创建背景星空
        createBackgroundStars() {
            const count = CONFIG.BACKGROUND_STARS;
            const geometry = new THREE.BufferGeometry();

            const positions = new Float32Array(count * 3);
            const sizes = new Float32Array(count);
            const twinklePhases = new Float32Array(count);

            // 在球形区域分布星星
            for (let i = 0; i < count; i++) {
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const radius = 100 + Math.random() * 200;

                positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
                positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
                positions[i * 3 + 2] = radius * Math.cos(phi);

                sizes[i] = 0.5 + Math.random() * 2.0;
                twinklePhases[i] = Math.random();
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
            geometry.setAttribute('twinklePhase', new THREE.BufferAttribute(twinklePhases, 1));

            const material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 }
                },
                vertexShader: starsVertexShader,
                fragmentShader: starsFragmentShader,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            this.backgroundStars = new THREE.Points(geometry, material);
            this.scene.add(this.backgroundStars);
        }

        // 创建全屏流动大粒子
        createFloatingParticles() {
            const count = CONFIG.FLOATING_PARTICLES;
            const geometry = new THREE.BufferGeometry();

            const positions = new Float32Array(count * 3);
            const colors = new Float32Array(count * 3);
            const sizes = new Float32Array(count);
            const phases = new Float32Array(count);

            // 存储粒子运动数据
            this.floatingData = {
                velocities: new Float32Array(count * 3),
                originalPositions: new Float32Array(count * 3)
            };

            // 在全屏范围内分布大粒子
            for (let i = 0; i < count; i++) {
                // 在视口范围内随机分布
                const x = (Math.random() - 0.5) * 200;
                const y = (Math.random() - 0.5) * 100;
                const z = (Math.random() - 0.5) * 150 - 20;

                positions[i * 3] = x;
                positions[i * 3 + 1] = y;
                positions[i * 3 + 2] = z;

                // 保存原始位置
                this.floatingData.originalPositions[i * 3] = x;
                this.floatingData.originalPositions[i * 3 + 1] = y;
                this.floatingData.originalPositions[i * 3 + 2] = z;

                // 随机速度向量
                this.floatingData.velocities[i * 3] = (Math.random() - 0.5) * 2;
                this.floatingData.velocities[i * 3 + 1] = (Math.random() - 0.5) * 1;
                this.floatingData.velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;

                // 离散配色：青色、紫色、白色、深蓝色
                const colorType = Math.random();
                const color = new THREE.Color();

                if (colorType < 0.30) {
                    // 青色 (明亮的青绿色)
                    color.setRGB(0.2, 1.0, 0.95);
                } else if (colorType < 0.55) {
                    // 紫色/品红色
                    color.setRGB(0.85, 0.3, 0.9);
                } else if (colorType < 0.75) {
                    // 深蓝色
                    color.setRGB(0.3, 0.4, 1.0);
                } else {
                    // 纯白色
                    color.setRGB(1.0, 1.0, 1.0);
                }

                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;

                // 精致亮点尺寸 (2-8)
                sizes[i] = 2 + Math.random() * 6;

                // 随机相位
                phases[i] = Math.random();
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
            geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

            const material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 }
                },
                vertexShader: floatingVertexShader,
                fragmentShader: floatingFragmentShader,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            this.floatingParticles = new THREE.Points(geometry, material);
            this.scene.add(this.floatingParticles);
        }

        // 更新吸积盘粒子
        updateAccretionDisk(deltaTime) {
            if (!this.accretionDisk) return;

            const positions = this.accretionDisk.geometry.attributes.position.array;
            const colors = this.accretionDisk.geometry.attributes.customColor.array;
            const alphas = this.accretionDisk.geometry.attributes.alpha.array;
            const count = positions.length / 3;

            const innerRadius = CONFIG.ACCRETION_DISK_INNER;
            const outerRadius = CONFIG.ACCRETION_DISK_OUTER;

            for (let i = 0; i < count; i++) {
                let radius = this.accretionData.radii[i];
                let angle = this.accretionData.angles[i];
                let height = this.accretionData.heights[i];

                // 开普勒旋转：内侧更快 (角速度 ∝ r^(-3/2))
                const angularVelocity = CONFIG.BASE_ROTATION_SPEED / Math.pow(radius / innerRadius, 1.5);
                angle += angularVelocity * deltaTime;

                // 缓慢向内坠落
                radius -= CONFIG.INFALL_SPEED * deltaTime * (1.0 + Math.random() * 0.5);

                // 高度逐渐降低
                height *= 0.9995;

                // 如果粒子到达事件视界，重置到外边缘
                if (radius < innerRadius) {
                    radius = outerRadius - Math.random() * 10;
                    angle = Math.random() * Math.PI * 2;
                    height = (Math.random() - 0.5) * 2.0;

                    // 重新设置颜色
                    const normalizedRadius = (radius - innerRadius) / (outerRadius - innerRadius);
                    const color = this.getAccretionColor(normalizedRadius);
                    colors[i * 3] = color.r;
                    colors[i * 3 + 1] = color.g;
                    colors[i * 3 + 2] = color.b;
                    alphas[i] = 0.3 + 0.7 * (1.0 - normalizedRadius);
                }

                // 更新存储的数据
                this.accretionData.radii[i] = radius;
                this.accretionData.angles[i] = angle;
                this.accretionData.heights[i] = height;

                // 更新位置
                positions[i * 3] = Math.cos(angle) * radius;
                positions[i * 3 + 1] = height;
                positions[i * 3 + 2] = Math.sin(angle) * radius;
            }

            this.accretionDisk.geometry.attributes.position.needsUpdate = true;
            this.accretionDisk.geometry.attributes.customColor.needsUpdate = true;
            this.accretionDisk.geometry.attributes.alpha.needsUpdate = true;
        }

        // 更新背景星空
        updateBackgroundStars(time) {
            if (!this.backgroundStars) return;
            this.backgroundStars.material.uniforms.time.value = time;

            // 缓慢整体旋转
            this.backgroundStars.rotation.y += 0.0001;
        }

        // 更新全屏流动大粒子
        updateFloatingParticles(deltaTime, time) {
            if (!this.floatingParticles) return;

            this.floatingParticles.material.uniforms.time.value = time;

            const positions = this.floatingParticles.geometry.attributes.position.array;
            const count = positions.length / 3;

            for (let i = 0; i < count; i++) {
                // 获取速度
                const vx = this.floatingData.velocities[i * 3];
                const vy = this.floatingData.velocities[i * 3 + 1];
                const vz = this.floatingData.velocities[i * 3 + 2];

                // 更新位置
                positions[i * 3] += vx * deltaTime;
                positions[i * 3 + 1] += vy * deltaTime;
                positions[i * 3 + 2] += vz * deltaTime;

                // 边界检查：超出范围则从另一侧出现
                if (positions[i * 3] > 100) positions[i * 3] = -100;
                if (positions[i * 3] < -100) positions[i * 3] = 100;
                if (positions[i * 3 + 1] > 50) positions[i * 3 + 1] = -50;
                if (positions[i * 3 + 1] < -50) positions[i * 3 + 1] = 50;
                if (positions[i * 3 + 2] > 50) positions[i * 3 + 2] = -100;
                if (positions[i * 3 + 2] < -100) positions[i * 3 + 2] = 50;

                // 添加微小的波动效果
                const phase = this.floatingParticles.geometry.attributes.phase.array[i];
                positions[i * 3 + 1] += Math.sin(time * 0.5 + phase * 10) * 0.02;
            }

            this.floatingParticles.geometry.attributes.position.needsUpdate = true;
        }

        // 动画循环
        animate() {
            if (!this.isRunning) return;

            this.animationId = requestAnimationFrame(() => this.animate());

            const deltaTime = this.clock.getDelta();
            const elapsedTime = this.clock.getElapsedTime();

            this.updateAccretionDisk(deltaTime);
            this.updateBackgroundStars(elapsedTime);
            this.updateFloatingParticles(deltaTime, elapsedTime);

            this.renderer.render(this.scene, this.camera);
        }

        // 窗口大小调整
        onWindowResize() {
            if (!this.camera || !this.renderer) return;

            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }

        setupEventListeners() {
            window.addEventListener('resize', () => this.onWindowResize());
        }

        // 停止动画
        stop() {
            this.isRunning = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
        }

        // 恢复动画
        resume() {
            if (!this.isRunning) {
                this.isRunning = true;
                this.clock.start();
                this.animate();
            }
        }

        // 销毁
        destroy() {
            this.stop();

            if (this.renderer) {
                this.renderer.dispose();
                if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                    this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
                }
            }

            if (this.scene) {
                this.scene.traverse((object) => {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(m => m.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                });
            }

            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.accretionDisk = null;
            this.backgroundStars = null;
            this.eventHorizon = null;
        }

        // 变换效果 (可用于图片切换时)
        morph(colorScheme) {
            // TODO: 实现颜色/形态变换效果
            console.log('[BlackHole] Morph to:', colorScheme);
        }
    }

    // ============================================
    // 全局接口
    // ============================================
    let instance = null;

    window.BlackHoleBackground = {
        init: function (containerId) {
            if (instance) {
                instance.destroy();
            }
            instance = new BlackHoleEffect(containerId);
            return instance.init();
        },

        stop: function () {
            if (instance) instance.stop();
        },

        resume: function () {
            if (instance) instance.resume();
        },

        destroy: function () {
            if (instance) {
                instance.destroy();
                instance = null;
            }
        },

        morph: function (colorScheme) {
            if (instance) instance.morph(colorScheme);
        },

        getInstance: function () {
            return instance;
        }
    };

    console.log('[BlackHoleBackground] 模块已加载');
})();
