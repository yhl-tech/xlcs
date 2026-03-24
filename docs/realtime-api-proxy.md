# 实时语音对话技术方案（当前实现）

---

## 整体架构

```
浏览器（Vue3）
  │
  ├─ POST /realtime/token        ← 1. 获取临时令牌
  ├─ POST /realtime/sdp?model=   ← 2. SDP 交换
  │
后端代理（Python FastAPI / xlcp）
  │
  └─ OpenAI Realtime API
       └─ WebRTC 直连（TURN 中继）
```

浏览器不持有 OpenAI API Key，所有鉴权由后端代理完成。连接建立后，语音数据走 WebRTC 点对点通道，后端不再参与媒体转发。

---

## 当前使用的模型

```
gpt-realtime-1.5
```

配置位置：`src/utils/constants.js` → `OPENAI_CONFIG.model`

---

## 连接流程（10 步）

### 1. 获取临时令牌
```
POST /realtime/token
```
- 前端不携带 API Key
- 后端用自己的 API Key 调 OpenAI，返回 `ephemeral_key`
- 前端拿到 `ephemeral_key` 用于后续 SDP 交换的 `X-Ephemeral-Key` 请求头

### 2 ～ 7. WebRTC 本地准备
| 步骤 | 内容 |
|------|------|
| 2 | 请求麦克风权限（`getUserMedia`） |
| 3 | 创建 `AudioContext`（采样率 24000 Hz） |
| 4 | 创建 `RTCPeerConnection`（见 ICE/TURN 配置） |
| 5 | 创建 `<audio>` 元素，绑定远程音频流 |
| 6 | 创建麦克风延迟管道（1 秒延迟），添加到 WebRTC |
| 7 | 创建数据通道 `oai-events`，设置 30 秒超时 |

### 8 ～ 10. SDP 交换
```
POST /realtime/sdp?model=gpt-realtime-1.5
Headers:
  X-Ephemeral-Key: <临时令牌>
  Content-Type: application/sdp
Body: <SDP offer 纯文本>
```
- 后端把 SDP offer 转发给 OpenAI，返回 SDP answer
- 前端设置 `RemoteDescription`，等待数据通道打开
- 数据通道打开后，发送 `session.update` 注入系统提示词和 VAD 配置

---

## ICE / TURN 配置

```js
iceServers: [
  { urls: 'stun:129.226.147.53:3478' },
  { urls: 'turn:129.226.147.53:3478',  username: 'rtcuser', credential: 'Pass2024WebRTC' },
  { urls: 'turn:129.226.147.53:5349',  username: 'rtcuser', credential: 'Pass2024WebRTC' }
],
iceTransportPolicy: 'relay'   // 强制 TURN 中继，不走直连
```

> 强制 relay 是为了保证国内网络环境下穿透稳定。代价是延迟略高。

---

## 音频配置

| 项目 | 值 |
|------|-----|
| 输入采样率 | 24000 Hz |
| 输出采样率 | 24000 Hz |
| AudioContext 采样率 | 24000 Hz |
| 声道数 | 单声道（1）|
| 回声消除 | 开启 |
| 降噪 | 开启 |
| 自动增益 | 开启 |
| 麦克风延迟 | **1 秒**（避免 AI 听到自己的声音） |

---

## VAD（语音活动检测）配置

连接成功后通过 `session.update` 事件下发：

```json
{
  "turn_detection": {
    "type": "server_vad",
    "threshold": 0.6,
    "prefix_padding_ms": 500,
    "silence_duration_ms": 1500
  }
}
```

---

## 混合录音（本地存档）

每张图版的对话音频（麦克风 + AI 语音）混合录制为一个文件：

- **麦克风**：经 1 秒延迟节点后混入
- **AI 语音**：从远程音频流接入混合目标
- 录制格式：WebM → 上传前转码为 **MP3（128kbps）**，使用 `lamejs`（通过 `<script>` 标签加载，非 ES Module）

### 文件命名规则（上传到后端）

| 阶段 | 文件名 |
|------|--------|
| 图版 1 ～ 10 | `{userId}-1.mp3` ～ `{userId}-10.mp3` |
| 后测五问 | `{userId}-select.mp3` |

上传接口：`POST /rorschach/user/upload_sub_media`，headers 需携带 `user-id: {userId}`。

---

## 阶段切换（Phase）与提示词

每张图版和后测阶段各有独立提示词，切换图版时**断开旧连接 → 等 5 秒 → 重新建立新连接**：

| Phase | 提示词来源 | 说明 |
|-------|-----------|------|
| `test`（图版 1） | `INTEST_1_PROMPT` | 第一张图专用 |
| `test`（图版 2～10） | `INTEST_2_TO_10_PROMPT` | 通用图版提示词 |
| `postTest` | `POSTTEST_PROMPT` | 后测五问提示词 |

切换时机（`TestView.vue → handleNextPlate`）：
1. 停止当前图版录音并上传
2. 切换 `testStore.currentPlate`
3. 显示**连接中遮罩**（`isAudioReady = false`）
4. `reconnectAndStartRecording()`（最多重试 3 次，退避 3/6/9 秒）
5. 连接成功 → 移除遮罩（`isAudioReady = true`）
6. 播报提示语「这张图你可以看到些什么？」

---

## 后端需要实现的两个接口

### `POST /realtime/token`
- 用自己的 `OPENAI_API_KEY` 调 `POST https://api.openai.com/v1/realtime/sessions`
- 请求体中包含模型名（`gpt-realtime-1.5`）
- 把 `client_secret.value`（临时令牌）返回给前端

### `POST /realtime/sdp?model=gpt-realtime-1.5`
- 从 header `X-Ephemeral-Key` 取临时令牌
- 把 body（纯文本 SDP offer）转发给 `POST https://api.openai.com/v1/realtime?model=gpt-realtime-1.5`
- 请求头带 `Authorization: Bearer <临时令牌>`、`Content-Type: application/sdp`
- 把 OpenAI 返回的 SDP answer（纯文本）原样返回

---

## 常见问题

| 问题 | 原因 | 处理 |
|------|------|------|
| 数据通道 30 秒超时 | ICE 协商慢（TURN relay 下偶发） | 最多重试 3 次，退避等待 |
| 切图后 AI 不开口 | 切图时 `PostTestForm` 比 WebRTC 先 mount | 改为 `watch(isConnected)` 连接后才发送第一个问题 |
| 后测 AI 不开口 | 断连/重连 + 5 秒延迟 > 组件 mount 时机 | 同上 |
