# 知己心探测试系统 - 技术文档

## 1. 项目概述

### 项目简介
知己心探测试系统是一个基于罗夏克墨迹心理测试（Rorschach Inkblot Test）的在线多模态心理评测平台。系统通过���户的操作行为、反应时间、语音描述等多维度数据融合计算心理评估结果。

### 核心功能
- **用户认证**：手机号 + 验证码登录，统一用户端接口
- **信息采集**：收集性别、年龄、学历、职业、心情等基本信息
- **操作反应测试**：放大、缩小、旋转、画笔、擦除等6种操作，带语音引���
- **图版测试**：10张罗夏克心理测试图版展示与交互
- **语音对话**：TTS语音合成与用户语音识别，支持实时字幕
- **交互追踪**：绘画轨迹、旋转操作、缩放数据实时记录，支持鼠标轨迹上传
- **测后反思**：6个反思问题问卷
- **报告生成**：测试数据提交与报告状态查询
- **会话恢复**：支持页面刷新后自动恢复测试进度

---

## 1.1 版本历史

### 最近更新（2025年）
| 日期 | 版本 | 更新内容 |
|------|------|---------|
| 2025-12 | v1.2.x | 修复轨迹为空时上传错误；对接新的鼠标轨迹接口 |
| 2025-12 | v1.2.x | 修复轨迹文件名称错误；添加文件提交状态检查 |
| 2025-12 | v1.2.x | WebSocket连接参数优化；修复MP3文件名称问题 |
| 2025-11 | v1.1.x | 删除管理员登录逻辑，统一使用用户端接口 |
| 2025-11 | v1.1.x | 优化测试流程引导文案，提升用户体验 |
| 2025-11 | v1.1.x | 麦克风检测提示优化："检测麦克风（测试时请说话）" |

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
| 交互追踪 | interactionTracker.js | 操作记录、轨迹追踪、鼠标轨迹上传 |
| 轨迹引导 | trajectoryGuide.js | 画笔使用引导、圆形轨迹示例 |
| TTS客户端 | ttsClient.js | WebSocket语音合成 |
| 字幕管理 | subtitleManager.js | 字幕显示、语音识别、对话历史 |
| 音频录制 | audioRecorder.js | PCM录制、MP3转换 |
| 会话管理 | sessionManager.js | 进度保存与恢复 |
| 操作测试 | operationReactionTest.js | 放大缩小旋转等操作反应测试 |
| 报告等待 | waitingReport.js | 报告生成等待页面、词云动画 |
| 图片平移 | imagePan.js | 图片拖拽、边界约束 |
| 问题进度 | questionProgress.js | 测后反思问题进度条显示 |
| 设备检测 | deviceCheck.js | 麦克风扬声器检测 |
| 用户引导 | driverGuide.js | Driver.js引导流程 |
| 背景特效 | blackHoleBackground.js | Three.js黑洞粒子动画 |
| 能量柱 | energyPillar.js | 图版能量柱动画 |
| 表单处理 | basicInfoForm.js | ��本信息表单验证 |
| 图片占位 | imagePlaceholder.js | 图片加载占位处理 |

---

## 4. 目录结构说明

```
xlcs/
├── 配置文件
│   ├── package.json            # 项目配置、脚本、依赖
│   ├── pnpm-lock.yaml          # 依赖版本锁定
│   ├── .npmrc                  # pnpm配置
│   ├── vite.config.js          # Vite构建配置
│   ├── .env.development        # 开发环境变量
│   ├── .env.production         # 生产环境变量
│   ├── proxy-server.js         # Express代理服务器
│   ├── nginx1.conf             # Nginx配置文件
│   └── .gitignore              # Git忽略规则
│
├── 入口文件
│   ├── index.html              # 主测试页面
│   ├── login.html              # 登录页面
│   └── waiting-report.html     # 报告等待页面
│
├── 文档
│   ├── README.md               # 项目说明
│   ├── TECHNICAL_DOC.md        # 技术文档
│   └── docs/
│       └── wordcloud-data-integration.md  # 词云数据集成文档
│
├── script/                     # 核心脚本 (~16600行)
│   ├── 核心流程
│   │   ├── appMain.js          # 主应用逻辑 (5278行)
│   │   ├── appState.js         # 状态与常量 (314行)
│   │   └── config.js           # 环境配置 (109行)
│   │
│   ├── API与认证
│   │   ├── api.js              # API交互 (1405行)
│   │   └── auth.js             # 认证模块 (310行)
│   │
│   ├── 交互追踪
│   │   ├── interactionTracker.js  # 交互追踪 (1488行)
│   │   └── trajectoryGuide.js     # 轨迹引导 (356行)
│   │
│   ├── 音频与语音
│   │   ├── ttsClient.js        # TTS客户端 (596行)
│   │   ├── subtitleManager.js  # 字幕管理 (1227行)
│   │   └── audioRecorder.js    # 音频录制 (206行)
│   │
│   ├── 测试流程
│   │   ├── operationReactionTest.js  # 操作反应测试 (956行)
│   │   ├── sessionManager.js         # 会话管理 (207行)
│   │   └── waitingReport.js          # 报告等待 (1071行)
│   │
│   ├── UI组件
│   │   ├── basicInfoForm.js       # 基本信息表单 (155行)
│   │   ├── driverGuide.js         # 用户引导 (698行)
│   │   ├── deviceCheck.js         # 设备检测 (292行)
│   │   ├── energyPillar.js        # 能量柱动画 (281行)
│   │   ├── blackHoleBackground.js # 黑洞背景 (1384行)
│   │   ├── imagePan.js            # 图片平移 (179行)
│   │   ├── imagePlaceholder.js    # 图片占位 (51行)
│   │   ├── questionProgress.js    # 问题进度条 (101行)
│   │   ├── loadingOverlay.js      # 加载遮罩 (29行)
│   │   └── domRefs.js             # DOM引用 (空文件)
│
├── css/                        # 样式文件 (~4666行)
│   ├── app.css                 # 主样式 (1840行)
│   ├── intro-preview-background.css # 背景样式 (678行)
│   ├── login-background.css    # 登录样式 (127行)
│   ├── waiting-report.css      # 报告等待样式 (431行)
│   └── question-progress.css   # 问题进度样式 (141行)
│
├── public/                     # 静态资源
│   └── images/
│       ├── rorschach-blot-[1-10].webp   # 10张测试图版
│       ├── rorschach-blot-example.webp  # 示例图版
│       └── test.webp                     # 测试图片
│
└── dist/                       # 构建输出 (生产环境)
    ├── js/                     # 压缩后的JS
    ├── css/                    # 提取的CSS
    ├── images/                 # 处理后的���片
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
- `routeToReportSummaryIfAvailable()` - 报告状态检查（当前已禁用）

**最新变更**：
- 优化测试流程引导文案
- 优化设备检测提示："检测麦克风（测试时请说话）"
- 暂时禁用报告状态自动跳转功能

#### api.js - API通信
```javascript
class APIClient {
  phoneLogin()           // 手机号登录（统���用���端接口）
  tenantLogin()          // 租户登录（已废弃）
  submitTest()           // 提交测试
  getTestReport()        // 获取报告
  checkReportStatus()    // 查询状态
  checkUploadFilesStatus() // 检查文件提交状态
}
```

**接口变更**：
- 移除管理员登录相关逻辑
- 新增文件提交状态检查接口
- 鼠标轨迹数据上传接口对接

#### interactionTracker.js - 交互追踪
追踪数据结构：
```javascript
{
  zoom: { "1": [1, 1, -1] },           // 缩放操作
  rotate: { "1": [30, -30] },          // 旋转角度
  navigation: { "1": ["next"] },       // 导航事件
  drawingTracks: { "1": {...} }        // 画笔轨迹（支持鼠标轨迹上传）
}
```

**最新特性**：
- 鼠标轨迹接口对接（f1cd6c1）
- 轨迹数据容错处理（避免空轨迹上传错误）
- 轨迹文件命名规范修复

#### ttsClient.js - 语音对话
- WebSocket连接管理（支持参数化配置）
- PCM音频处理与播放
- 录音数据发送

**最新优化**：
- WebSocket连接参数支持（a4235a8, b2b7655）
- 音频文件命名规范修复

#### subtitleManager.js - 字幕与识别
- 实时字幕显示（打字机效果）
- Web Speech API语音识别
- 对话历史记录与持久化

---

### 新增模块说明（2025年）

#### waitingReport.js - 报告等待页面
核心功能：
- 词云数据源管理（`WordCloudDataSource`）
- 从用户对话历史提取关键词
- 支持Mock数据和真实API数据
- 词云动画控制与渲染
- 配合 `waiting-report.html` 和 `waiting-report.css` 使用

#### trajectoryGuide.js - 轨迹引导
引导功能：
- 首次使用画笔时显示圆形轨迹示例
- 虚线圆形引导线绘制
- 淡出动画效果
- 语音提示集成

#### imagePan.js - 图片平移
交互功能：
- 图片拖拽平移（仅在非画笔模式下）
- 平移边界约束计算
- 缩放后自动居中逻辑
- 与缩放功能协同工作

#### questionProgress.js - 问题进度条
UI组件：
- 测后反思问题进度显示
- 垂直进度柱动画
- 脉冲效果和粒子动画
- 实时进度百分比计算

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

1. **多模态数据融合** - 操作、语音、文本、时序数据���合
2. **实时交互追踪** - 毫秒级精度记录用户操作轨迹，支持鼠标轨迹精确采集与上传
3. **智能恢复机制** - 页面刷新自动恢复测试进度
4. **Three.js 3D特效** - 黑洞粒子背景，10个主题切换
5. **WebSocket通信** - 全双工实时语音对话，支持参数化配置
6. **Web Audio处理** - PCM数据处理、采样率转换、MP3文件命名规范
7. **容错机制** - 轨迹数据容错处理，避免空数据上传错误
8. **用户体验优化** - 清晰的测试流程引导，优化设备检测提示文案

---

## 9. 已知问题与待优化项

### 当前状态
- ✅ 鼠标轨迹接口已对接
- ✅ ���件提交状态检查已实现
- ⚠️ 报告状态检查功能暂时禁用（routeToReportSummaryIfAvailable 注释）
- ✅ 统一用户端接口（已移除管理员登录逻辑）

### 待优化
- [ ] 报告状态检查逻辑优化（当前已注释）
- [ ] 更完善的错误提示机制
- [ ] 性能监控与统计
