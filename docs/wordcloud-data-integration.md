# 词云数据源集成指南

## 概述

词云动画系统**直接使用用户的原始对话内容**，从 `sessionStorage.subtitleHistory` 中读取用户说过的每一句话，不做任何分词、筛选和处理。

## 数据获取优先级

1. **真实对话历史**（默认）：从 `sessionStorage.subtitleHistory` 提取所有用户对话
2. **真实 API**（降级）：如果没有对话历史且配置了 API，调用后端接口
3. **Mock 数据**（最终降级）：如果以上都失败，使用预设的示例数据

## 快速开始

### 默认使用（推荐）

词云会自动从 sessionStorage 读取对话历史，无需任何配置：

```javascript
import { waitingReportManager } from './script/waitingReport.js';

// 启动词云动画（自动使用 sessionStorage 中的对话数据）
await waitingReportManager.start();

// 停止动画
waitingReportManager.stop();
```

### 数据来源

系统会从 `sessionStorage.getItem('subtitleHistory')` 读取对话记录：

```javascript
// 示例数据格式
[
  {
    "id": "1765681114971-euj5wkx9c",
    "timestamp": 1765681114971,
    "speaker": "user",
    "text": "我最近工作压力很大，经常失眠",
    "isFinal": true,
    "stored": true
  },
  {
    "id": "1765681116056-bgfkrdp6x",
    "timestamp": 1765681116056,
    "speaker": "assistant",
    "text": "我理解您的感受",
    "isFinal": true,
    "stored": true
  }
]
```

### 处理逻辑

系统会：
- ✅ 只提取 `speaker === "user"` 的记录
- ✅ 忽略 `speaker === "assistant"` 的记录
- ✅ **直接使用用户的完整对话文本**，不做任何分词、筛选、词频统计
- ✅ 每句对话作为一个独立的词云元素
- ✅ 随机分配权重（3-5），让每句话都有展示机会

### 示例效果

如果用户说过：
- "我最近工作压力很大"
- "经常失眠睡不着"
- "感觉很焦虑"

词云会直接显示这三句完整的话，而不是拆分成"工作"、"压力"、"失眠"等词语。

### 控制台日志

启动时会输出简洁日志：

```
[WordCloud] 使用真实对话数据，共 45 条记录
[WordCloud] 提取到用户对话: 23 条
```

### 方式 2：手动传入对话数据

```javascript
import { WaitingReportManager, WordCloudDataSource } from './script/waitingReport.js';
import { WORDCLOUD_CONFIG } from './script/config.js';

// 准备对话历史数据
const subtitleHistory = [
  {
    speaker: 'user',
    text: '我最近工作压力很大，经常失眠'
  },
  {
    speaker: 'user',
    text: '感觉很焦虑，不知道该怎么办'
  }
];

// 创建数据源并传入对话历史
const dataSource = new WordCloudDataSource(WORDCLOUD_CONFIG, subtitleHistory);

// 创建管理器并注入数据源
const manager = new WaitingReportManager();
manager.dataSource = dataSource;

// 启动动画
await manager.start();
```

### 方式 3：从 SessionManager 获取完整 session

```javascript
// 获取完整 session 快照
const snapshot = window.SessionManager.loadSnapshot();
const subtitleHistory = snapshot?.subtitleHistory || [];

// 创建数据源
const dataSource = new WordCloudDataSource(WORDCLOUD_CONFIG, subtitleHistory);
const manager = new WaitingReportManager();
manager.dataSource = dataSource;

await manager.start();
```

## 数据流程

1. **启动**: `waitingReportManager.start()` 被调用
2. **读取对话**: 从 `sessionStorage.subtitleHistory` 读取完整对话历史
3. **过滤用户对话**: 只保留 `speaker === 'user'` 的记录
4. **直接使用**: 将每条用户对话作为一个词云元素
   - 不做分词
   - 不做词频统计
   - 不做筛选
   - 随机分配权重（3-5）
5. **数据缓存**: 数据加载后缓存，避免重复处理
6. **动画展示**:
   - 词云主动画：显示所有用户对话文本
   - 飞词动画：显示所有用户对话文本
   - 文本粒子动画：显示前10条用户对话

## 数据结构

### 输入（sessionStorage.subtitleHistory）

```javascript
[
  {
    "speaker": "user",
    "text": "我最近工作压力很大"
  },
  {
    "speaker": "assistant",
    "text": "我理解您的感受"
  },
  {
    "speaker": "user",
    "text": "经常失眠睡不着"
  }
]
```

### 输出（内部数据格式）

```javascript
{
  status: 'success',
  data: {
    userInfo: { age: '', gender: '', education: '', occupation: '' },
    keywords: [
      { text: '我最近工作压力很大', weight: 4.2, category: 'user-dialogue' },
      { text: '经常失眠睡不着', weight: 3.7, category: 'user-dialogue' }
    ],
    conversationWords: [
      '我最近工作压力很大',
      '经常失眠睡不着'
    ]
  }
}
```

## 更新 Mock 数据

在 `script/waitingReport.js` 的 `WordCloudDataSource.getMockData()` 方法中修改：

```javascript
getMockData() {
  return {
    status: 'success',
    timestamp: Date.now(),
    data: {
      userInfo: {
        age: '30岁',        // 修改这里
        gender: '男性',
        education: '博士',
        occupation: '医生'
      },
      keywords: [
        { text: '新关键词', weight: 5, category: 'emotion' }  // 添加新关键词
      ],
      conversationWords: [
        '新词1', '新词2'  // 添加新的对话词
      ]
    }
  };
}
```

## 后端 API 开发建议

### 接口规范

- **请求方式**: GET
- **URL**: `/api/report/wordcloud`
- **Query 参数**:
  - `userId`: 用户ID（可选）
  - `sessionId`: 会话ID（可选）

### 响应格式

严格按照上述 JSON 结构返回数据，确保：
- `status` 字段表示请求状态
- `data` 字段包含完整的数据结构
- `keywords` 数组至少包含 3-8 个关键词
- `conversationWords` 数组至少包含 15-30 个词

### 错误处理

API 应返回合理的错误信息：

```json
{
  "status": "error",
  "message": "用户数据未找到",
  "code": 404
}
```

前端会自动降级到 Mock 数据。

## 调试

### 查看当前数据源

```javascript
console.log(waitingReportManager.dataSource.useMockData);  // true/false
console.log(waitingReportManager.dataSource.data);  // 当前加载的数据
```

### 强制重新加载数据

```javascript
waitingReportManager.dataSource.data = null;  // 清除缓存
await waitingReportManager.dataSource.getData();  // 重新加载
```

## 常见问题

### Q: 如何测试真实 API 是否正常？

```javascript
import { WORDCLOUD_CONFIG } from './script/config.js';
import { WordCloudDataSource } from './script/waitingReport.js';

const testDataSource = new WordCloudDataSource({
  ...WORDCLOUD_CONFIG,
  useMockData: false
});

const data = await testDataSource.getData();
console.log('API 返回数据:', data);
```

### Q: Mock 数据和真实数据格式不一致怎么办？

确保在 `WordCloudDataSource.getMockData()` 中的 Mock 数据结构与真实 API 完全一致。

### Q: 如何在不同环境使用不同配置？

在 `config.js` 中根据环境变量动态设置：

```javascript
export const WORDCLOUD_CONFIG = {
  useMockData: import.meta.env.MODE === 'development',  // 开发环境用 Mock
  api: {
    endpoint: import.meta.env.VITE_WORDCLOUD_API || '/api/report/wordcloud'
  }
};
```
