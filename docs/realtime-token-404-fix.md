# Realtime Token 404 报错说明与修复指南

## 1. 现象

开发环境（`pnpm dev`，`http://localhost:8080`）建立 WebRTC 语音连接时，请求失败：

| 项目 | 内容 |
|------|------|
| 请求 URL | `POST http://localhost:8080/realtime/token` |
| HTTP 状态码 | `404 Not Found` |
| Remote Address | `[::1]:8080`（浏览器连的是本机 Vite，属正常） |

### 响应体示例

```json
{
  "detail": "{\n  \"error\": {\n    \"message\": \"Invalid URL (POST /v1/realtime/sessions)\",\n    \"type\": \"invalid_request_error\",\n    \"param\": null,\n    \"code\": null\n  }\n}"
}
```

解析后的 OpenAI 错误：

```json
{
  "error": {
    "message": "Invalid URL (POST /v1/realtime/sessions)",
    "type": "invalid_request_error"
  }
}
```

---

## 2. 这个接口是干什么的

`POST /realtime/token` 是 **WebRTC 实时语音对话的第一步**：向自家代理服务申请 OpenAI 临时令牌（ephemeral key）。

```
浏览器 POST /realtime/token
    → Python 代理（129.226.147.53:8765）
    → OpenAI 申请临时密钥
    → 返回 client_secret / value
    → 前端用于后续 POST /realtime/sdp 建立 WebRTC
```

**没有这个接口，测试阶段 AI 无法开口说话**（准备页/说明页的 MP3 不受影响）。

---

## 3. 根因分析

### 3.1 不是 Vite 代理的问题

`vite.config.js` 中 `/realtime` 代理配置正常，且自 `f6e22f2`（feat:no_vpn）以来 dev 环境未改动：

```js
'/realtime': {
  target: 'http://129.226.147.53:8765',
  changeOrigin: true
}
```

**判断依据**：若 Vite 代理未生效，404 会是 Vite 自己的空/HTML 404，**不会**带有 OpenAI 的 `Invalid URL (POST /v1/realtime/sessions)` 错误 JSON。当前响应来自远程 FastAPI 代理透传 OpenAI 错误，说明代理链路已通。

### 3.2 真正原因：OpenAI Realtime API 已从 Preview 迁移到 GA

远程代理 `server/main.py` 仍在调用 **已废弃的 Preview 接口**：

```python
# 当前代码（已失效）
POST https://api.openai.com/v1/realtime/sessions
{
  "model": "gpt-4o-realtime-preview-2024-12-17"
}
```

OpenAI 返回 `Invalid URL`，表示该路径已不可用。GA 版本应改用：

```
POST https://api.openai.com/v1/realtime/client_secrets
```

### 3.3 请求链路示意

```
localhost:8080/realtime/token
    ↓ Vite proxy
129.226.147.53:8765/realtime/token   ← server/main.py
    ↓
OpenAI: POST /v1/realtime/sessions   ← 404 Invalid URL
    ↓
404 透传回浏览器
```

---

## 4. 如何修改

### 4.1 修改代理服务 `server/main.py`（必做，需部署到 129.226.147.53:8765）

#### Token 接口

**改前：**

```python
response = await client.post(
    "https://api.openai.com/v1/realtime/sessions",
    headers={
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    },
    json={
        "model": "gpt-4o-realtime-preview-2024-12-17",
    },
)
token_data = response.json()
```

**改后：**

```python
REALTIME_MODEL = os.getenv("REALTIME_MODEL", "gpt-realtime")

response = await client.post(
    "https://api.openai.com/v1/realtime/client_secrets",
    headers={
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    },
    json={
        "session": {
            "type": "realtime",
            "model": REALTIME_MODEL,
        }
    },
)
secret_data = response.json()

# 兼容旧前端：仍返回 client_secret.value 结构
token_data = {
    **secret_data,
    "client_secret": {
        "value": secret_data.get("value"),
    },
}
```

#### SDP 接口（WebRTC GA 可能也需调整）

**改前：**

```python
f"https://api.openai.com/v1/realtime?model={model}"
```

**改后（按 OpenAI GA WebRTC 文档）：**

```python
"https://api.openai.com/v1/realtime/calls"
```

> 若仅改 token 后 SDP 仍报错，需同步升级 SDP 端点并核对 GA 文档。Preview 与 GA 的 WebRTC 建连 URL 不同。

#### 环境变量（`.env`）

```env
OPENAI_API_KEY=sk-xxxxxx
ALLOWED_ORIGINS=http://localhost:8080,https://psyla.cn
REALTIME_MODEL=gpt-realtime
# 如需代理访问 OpenAI：
# HTTP_PROXY=http://127.0.0.1:7890
```

#### 部署后验证

```bash
# 健康检查
curl http://129.226.147.53:8765/health

# Token 接口（应返回 200 且含 value / client_secret）
curl -X POST http://129.226.147.53:8765/realtime/token

# 经 Vite 代理
curl -X POST http://localhost:8080/realtime/token
```

---

### 4.2 修改前端模型配置 `src/utils/constants.js`（建议）

**改前：**

```js
export const OPENAI_CONFIG = {
  model: 'gpt-4o-realtime-preview-2024-12-17',
  ...
}
```

**改后：**

```js
export const OPENAI_CONFIG = {
  model: 'gpt-realtime',  // 或 gpt-realtime-1.5，以 OpenAI 当前可用模型为准
  ...
}
```

该 model 会传给 `POST /realtime/sdp?model=...`。

---

### 4.3 修改前端 Token 解析 `src/composables/useRealtimeDialog.js`（建议，增强兼容性）

**改前：**

```js
const ephemeralKey = session.client_secret.value
```

**改后：**

```js
const ephemeralKey =
  session.client_secret?.value ??
  session.value ??
  session.client_secret
```

这样无论代理返回旧格式（`client_secret.value`）还是 GA 新格式（顶层 `value`）都能工作。

---

### 4.4 `vite.config.js` — 无需修改

本地开发代理配置正确。若要在本机调试代理，可临时改为：

```js
'/realtime': {
  target: 'http://127.0.0.1:8765',
  changeOrigin: true
}
```

并在本机启动：

```bash
cd server
pip install -r requirements.txt
cp .env.example .env   # 填入 OPENAI_API_KEY
python main.py
```

---

## 5. 其他可能原因（次要）

若按上文改完仍 404，再排查：

| 检查项 | 说明 |
|--------|------|
| `OPENAI_API_KEY` | 是否有效、是否过期 |
| 账户余额 | Realtime 有时以 404 表现计费/鉴权问题 |
| Realtime 权限 | Key 所属项目是否开通 Realtime API |
| 模型名 | `gpt-realtime` / `gpt-realtime-1.5` 是否与账户可用模型一致 |

---

## 6. 相关文件索引

| 文件 | 作用 |
|------|------|
| `vite.config.js` | 开发环境 `/realtime` → 远程代理 |
| `server/main.py` | Token / SDP 代理实现（**需改**） |
| `src/composables/useRealtimeDialog.js` | 前端 WebRTC 连接，调用 `/realtime/token` |
| `src/utils/constants.js` | Realtime 模型名配置 |
| `nginx.conf` / `DEPLOY.md` | 生产环境 `/realtime/` 反代到 `129.226.147.53:8765` |
| `docs/realtime-api-proxy.md` | 整体架构说明（改完后建议同步更新） |

---

## 7. 总结

| 问题 | 结论 |
|------|------|
| 是 Vite 配置问题吗？ | **否**，代理已正常工作 |
| 404 从哪来？ | 远程代理调 OpenAI **旧接口** `/v1/realtime/sessions` 被拒 |
| 怎么修？ | 更新 `server/main.py` 为 `/v1/realtime/client_secrets`，同步模型名与前端 token 解析，**重新部署到 129.226.147.53:8765** |
