# 知己心探测试系统 - 技术文档

## 1. 项目概述

### 项目简介
知己心探测试系统是一个基于罗夏克墨迹心理测试（Rorschach Inkblot Test）的在线多模态心理评测平台。系统通过���户的操作行为、反应时间、语音描述等多维度数据融合计算心理评估结果。

### 核心功能
- **用户认证**：手机号 + 验证码登录
- **信息采集**：收集性别、年龄、学历、职业、心情等基本信息
- **操作反应测试**：放大、缩小、旋转、画笔、擦除等6种操作
- **图版测试**：10张罗夏克心理测试图版展示与交互
- **语音对话**：TTS语音合成与用户语音识别
- **交互追踪**：绘画轨迹、旋转操作、缩放数据实时记录
- **测后反思**：6个反思问题问卷
- **报告生成**：测试数据提交与报告状态查询

---

## 2. 技术栈

### 前端核心
| 技术 | 版本 | 用途 |
|------|------|------|
| Vite | 5.0.0 | 构建工具 |
| Vanilla JavaScript | ES Module | 核心逻辑 |
| Three.js | - | 3D黑洞粒子背景 |
| Driver.js | 1.3.2 | 用户引导 |
| Web Audio API | - | 音频处理与PCM转换 |
| Web Speech API | - | 浏览器语音识别 |

### 后端对接
| 技术 | 版本 | 用途 |
|------|------|------|
| Express.js | 4.18.2 | 代理服务器 |
| http-proxy-middleware | 2.0.6 | API代理 |
| Axios | CDN | HTTP请求 |

### 开发工具
| 工具 | 版本 | 用途 |
|------|------|------|
| pnpm | - | 包管理器 |
| Terser | 5.44.1 | 代码压缩 |
| vite-plugin-html | 3.2.2 | HTML压缩 |

### 浏览器API
- WebSocket - 实时语音对话
- LocalStorage/SessionStorage - 本地数据存储
- Canvas - 画笔绘制
- AudioContext - 音频播放

---

## 3. 项目架构

### 整体架构图

```
┌─────────────────────────────────────┐
│     HTML入口层                       │
│  ├─ login.html (登录页面)           │
│  └─ index.html (主测试页面)         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│    状态管理层 (appState.js)          │
│  ├─ 应用全局状态                     │
│  ├─ 会话状态                         │
│  └─ TTS配置与提示语                  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│    核心业务层 (appMain.js)           │
│  ├─ 流程控制与页面管理               │
│  ├─ 事件绑定与响应                   │
│  └─ 测试逻辑与数据收集               │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────┬──────────┬──────────┐
    │          │          │          │          │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│ 认证  │ │ API   │ │ 会话  │ │ 追踪  │ │ 通信  │
│auth.js│ │api.js │ │session│ │tracker│ │tts/sub│
└───────┘ └───────┘ └───────┘ └───────┘ └───────┘
               │
┌──────────────▼──────────────────────┐
│    UI交互层                          │
│  ├─ 表单组件 (basicInfoForm)         │
│  ├─ 引导组件 (driverGuide)           │
│  ├─ 操作测试 (operationTest)         │
│  ├─ 背景特效 (blackHoleBackground)   │
│  └─ 能量柱 (energyPillar)            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│    后端服务 (proxy-server.js)        │
│  └─ Express代理 → 14.103.237.160    │
└─────────────────────────────────────┘
```

### 主要模块职责

| 模块 | 文件 | 职责 |
|------|------|------|
| 主应用 | appMain.js | 流程控制、事件绑定、测试逻辑 |
| 状态管理 | appState.js | 全局状态、会话状态、配置 |
| API交互 | api.js | 登录、提交、查询等HTTP请求 |
| 认证 | auth.js | Token管理、用户信息 |
| 交互追踪 | interactionTracker.js | 操作记录、轨迹追踪 |
| TTS客户端 | ttsClient.js | WebSocket语音合成 |
| 字幕管理 | subtitleManager.js | 字幕显示、语音识别 |
| 音频录制 | audioRecorder.js | PCM录制、MP3转换 |
| 会话管理 | sessionManager.js | 进度保存与恢复 |

---

## 4. 目录结构说明

```
xlcs/
├── 配置文件
│   ├── package.json            # 项目配置、脚本、依赖
│   ├── pnpm-lock.yaml          # 依赖版本锁定
│   ├── vite.config.js          # Vite构建配置
│   ├── .env.development        # 开发环境变量
│   ├── .env.production         # 生产环境变量
│   └── proxy-server.js         # Express代理服务器
│
├── 入口文件
│   ├── index.html              # 主测试页面
│   └── login.html              # 登录页面
│
├── script/                     # 核心脚本 (~13500行)
│   ├── appMain.js              # 主应用逻辑 (4774行)
│   ├── appState.js             # 状态与常量 (270行)
│   ├── api.js                  # API交互 (1440行)
│   ├── auth.js                 # 认证模块 (397行)
│   ├── interactionTracker.js   # 交互追踪 (1421行)
│   ├── ttsClient.js            # TTS客户端 (579行)
│   ├── subtitleManager.js      # 字幕管理 (1053行)
│   ├── audioRecorder.js        # 音频录制 (228行)
│   ├── sessionManager.js       # 会话管理 (218行)
│   ├── operationReactionTest.js# 操作测试 (630行)
│   ├── blackHoleBackground.js  # 背景特效 (1327行)
│   ├── basicInfoForm.js        # 表单处理 (178行)
│   ├── driverGuide.js          # 引导库 (267行)
│   ├── energyPillar.js         # 能量柱 (273行)
│   ├── deviceCheck.js          # 设备检查 (280行)
│   ├── config.js               # 配置 (82行)
│   └── loadingOverlay.js       # 加载层 (38行)
│
├── css/                        # 样式文件 (~3650行)
│   ├── app.css                 # 主样式 (2642行)
│   ├── intro-preview-background.css # 背景样式 (794行)
│   └── login-background.css    # 登录样式 (212行)
│
├── public/                     # 静态资源
│   └── images/
│       └── rorschach-blot-[1-10].webp  # 测试图版
│
└── dist/                       # 构建输出 (生产)
    ├── js/                     # 压缩后的JS
    ├── css/                    # 提取的CSS
    ├── images/                 # 处理后的图片
    └── *.html                  # 压缩后的HTML
```

---

## 5. 核心文件说明

### 配置文件

#### package.json
```json
{
  "name": "rorschach-test",
  "version": "1.0.0",
  "scripts": {
    "dev": "node proxy-server.js",
    "build": "vite build",
    "build:prod": "vite build --mode production"
  }
}
```

#### vite.config.js
- 多入口配置：index.html 和 login.html
- Terser压缩：删除console、debugger
- CSS代码分割：独立输出CSS文件
- 资源分类输出：images/css/js分开

#### config.js
```javascript
// 环境配置
WebSocket开发: ws://localhost:8765
WebSocket生产: wss://www.jionlp.com/xlcp/ws/
API开发: /api (代理)
API生产: /xlcp/api
```

### 主要源代码

#### appMain.js - 主应用入口
核心函数：
- `startTest()` - 开始测试流程
- `nextPlate()` - 切换图版
- `sendUserDescription()` - 发送用户描述
- `submitTestData()` - 提交测试数据
- `saveSessionSnapshot()` - 保存快照
- `resumeTestFromSnapshot()` - 恢复测试

#### api.js - API通信
```javascript
class APIClient {
  phoneLogin()        // 手机号登录
  tenantLogin()       // 租户登录
  submitTest()        // 提交测试
  getTestReport()     // 获取报告
  checkReportStatus() // 查询状态
}
```

#### interactionTracker.js - 交互追踪
追踪数据结构：
```javascript
{
  zoom: { "1": [1, 1, -1] },           // 缩放操作
  rotate: { "1": [30, -30] },          // 旋转角度
  navigation: { "1": ["next"] },       // 导航事件
  drawingTracks: { "1": {...} }        // 画笔轨迹
}
```

#### ttsClient.js - 语音对话
- WebSocket连接管理
- PCM音频处理与播放
- 录音数据发送

#### subtitleManager.js - 字幕与识别
- 实时字幕显示（打字机效果）
- Web Speech API语音识别
- 对话历史记录

---

## 6. 数据流和业务逻辑

### 测试流程图

```
登录认证
    │
    ▼
基本信息采集 (性别/年龄/学历/职业/心情)
    │
    ▼
操作反应测试 (放大/缩小/旋转/画笔/擦除)
    │
    ▼
罗夏克墨迹测试 (10张图版)
    │  ├─ 显示图版
    │  ├─ 用户语音描述
    │  ├─ TTS实时反馈
    │  └─ 追踪: 旋转/缩放/绘画
    │
    ▼
测后反思 (6个问题)
    │
    ▼
数据提交
    │
    ▼
报告生成 (后端AI分析)
    │
    ▼
报告查询与展示
```

### 核心数据结构

```javascript
// 测试提交数据
{
  userId: string,
  sessionId: string,
  basicInfo: {
    sex: "男" | "女",
    age: number,
    education: string,
    occupation: string,
    mood: string
  },
  interactionData: {
    zoom: {},
    rotate: {},
    navigation: {},
    drawingTracks: {},
    timestamps: {}
  },
  dialogHistory: [],
  postTestAnswers: {}
}
```

### 状态持久化
- **LocalStorage**: 会话快照 (xlcs_session_{userId}_{sessionId})
- **SessionStorage**: 临时数据
- 支持页面刷新后恢复测试进度

---

## 7. 构建与部署

### 开发环境
```bash
pnpm dev    # 启动代理服务器 (8080端口)
```

### 生产构建
```bash
pnpm build:prod    # 输出到 dist/
```

### 构建输出
```
dist/
├── js/main-[hash].js
├── css/app-[hash].css
├── images/rorschach-blot-*.webp
├── index.html
└── login.html
```

### 优化策略
- Terser压缩：移除console、变量混淆
- 代码分割：CSS独立、JS自动分割
- 资源内联：<4KB文件base64内联
- 长期缓存：Hash文件名

---

## 8. 技术亮点

1. **多模态数据融合** - 操作、语音、文本、时序数据结合
2. **实时交互追踪** - 毫秒级精度记录用户操作轨迹
3. **智能恢复机制** - 页面刷新自动恢复测试进度
4. **Three.js 3D特效** - 黑洞粒子背景，10个主题切换
5. **WebSocket通信** - 全双工实时语音对话
6. **Web Audio处理** - PCM数据处理、采样率转换
