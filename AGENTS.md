# AGENTS.md

## 项目概述
知己心探测试系统 - 基于罗夏克墨迹心理测试的在线多模态心理评测平台

## 核心技术栈
- **语言**: Vanilla JavaScript (ES Module)
- **构建工具**: Vite 5.0.0
- **包管理器**: pnpm
- **主要依赖**: Three.js, Driver.js, Axios, Web Audio/Speech APIs

## 开发命令

### 包管理
```bash
pnpm install              # 安装依赖
```

### 开发环境
```bash
pnpm dev                  # 标准开发模式（使用代理）
pnpm dev:proxy           # 启动Express代理服务器
pnpm dev:no-username     # 无用户名模式开发
```

### 生产构建
```bash
pnpm build               # 标准构建
pnpm build:prod          # 生产环境构建
pnpm build:no-username   # 无用户名模式构建
```

### 预览和测试
```bash
pnpm preview             # 预览构建结果
pnpm serve              # 8080端口预览
# 手动测试：访问页面后点击script/testButtons.js中的测试按钮
```

## 代码风格规范

### 模块系统
- **导入方式**: ES6 Module (`import/export`)
- **路径格式**: 相对路径使用 `./` 前缀
- **第三方库**: 优先从 `node_modules` 导入

### 文件命名
- **JavaScript**: kebab-case (`appMain.js`, `interactionTracker.js`)
- **CSS**: kebab-case (`main.css`, `components.css`)
- **目录**: 小写，语义化 (`script/`, `css/`, `public/`)

### 变量和函数命名
- **变量**: camelCase (`userInfo`, `sessionState`)
- **函数**: camelCase，动词开头 (`getUserInfo`, `initDeviceCheck`)
- **常量**: UPPER_SNAKE_CASE (`INACTIVITY_THRESHOLD`, `SESSION_VERSION`)
- **类名**: PascalCase (如需要时使用)

### 注释规范
- **文件头**: JSDoc风格，包含功能描述
- **函数注释**: JSDoc，包含参数和返回值说明
- **行内注释**: 简洁中文，解释复杂逻辑
- **TODO标记**: `// TODO: 说明`

### 代码组织
```javascript
// 1. 外部依赖导入
import axios from 'axios'
import { log } from 'three'

// 2. 内部模块导入
import { formatDateTime } from './utils.js'
import { state } from './appState.js'

// 3. 常量定义
const CONSTANT_VALUE = 'value'

// 4. 主要逻辑
function mainFunction() {
  // 实现
}
```

### 错误处理
- **同步错误**: try-catch包裹
- **异步错误**: Promise.catch()或async/await try-catch
- **错误日志**: `console.warn('[模块名] 错误描述:', error)`
- **用户提示**: 友好的错误提示，避免技术术语

### 状态管理
- **集中状态**: 使用 `appState.js` 管理全局状态
- **本地状态**: 函数内变量，避免全局污染
- **状态更新**: 通过专用函数更新，保持不可变性

### DOM操作
- **引用缓存**: 使用 `domRefs.js` 缓存DOM引用
- **事件监听**: 统一使用 `addEventListener`
- **清理机制**: 组件销毁时移除事件监听器

### API调用
- **请求库**: 统一使用axios
- **基础URL**: 通过 `api.js` 配置
- **错误处理**: 统一错误响应格式
- **请求拦截**: 自动添加用户认证信息

### CSS规范
- **变量**: 使用CSS自定义属性定义主题色彩
- **命名**: BEM风格或语义化类名
- **响应式**: 移动优先，使用媒体查询
- **动画**: 优先使用CSS transition，复杂动画用Three.js

### 音频处理
- **录音**: Web Audio API + MediaRecorder
- **播放**: HTML5 Audio或Web Audio API
- **格式转换**: 使用lamejs进行MP3编码
- **权限检查**: 请求麦克风权限前进行设备检测

### 性能优化
- **懒加载**: 大型模块按需导入
- **防抖节流**: 用户交互事件使用防抖
- **资源预加载**: 图片和音频文件预加载
- **内存管理**: 及时清理定时器和事件监听器

## 测试指南

### 手动测试
1. 启动开发服务器: `pnpm dev`
2. 访问页面，点击测试按钮（位于页面右上角）
3. 测试功能包括：
   - 音频录制测试
   - 轨迹上传测试
   - API连接测试

### 功能测试重点
- **设备兼容性**: 移动端和桌面端
- **音频功能**: 录音、播放、TTS
- **3D背景**: Three.js渲染性能
- **用户引导**: Driver.js引导流程
- **数据上传**: 交互轨迹和音频数据

## 部署配置

### 环境变量
- **开发**: `.env.development`
- **生产**: `.env.production`
- **特殊模式**: `.env.prod-no-username`

### 代理配置
- **开发代理**: `proxy-server.js` (Express)
- **API目标**: `http://14.103.237.160:29876`
- **路径重写**: `/api` -> ``

### 构建优化
- **代码分割**: three、vconsole、vendor独立打包
- **资源压缩**: Terser压缩，移除console
- **CSS分割**: 独立CSS文件
- **资源内联**: 4KB以下资源base64编码

## 注意事项

### 兼容性要求
- **现代浏览器**: 支持ES6 Module
- **移动端**: iOS Safari, Android Chrome
- **音频API**: 需要HTTPS环境
- **WebGL**: Three.js需要WebGL支持

### 安全考虑
- **CORS**: 已配置跨域策略
- **数据加密**: 敏感数据传输加密
- **权限控制**: 麦克风权限动态请求
- **输入验证**: 用户输入严格校验

### 调试技巧
- **移动端调试**: 使用VConsole
- **网络请求**: 浏览器开发者工具
- **性能分析**: Three.js性能监控
- **错误追踪**: 统一错误日志格式

## 代码提交规范

### 提交信息格式
```
type(scope): description

feat(音频): 添加录音功能
fix(API): 修复用户认证问题
docs(README): 更新安装说明
```

### 类型说明
- **feat**: 新功能
- **fix**: 修复bug
- **docs**: 文档更新
- **style**: 代码格式调整
- **refactor**: 代码重构
- **test**: 测试相关
- **chore**: 构建工具或辅助工具变动