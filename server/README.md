# Realtime Token 代理服务

解决浏览器直接请求 OpenAI 的 CORS 限制问题。前端通过此服务获取 ephemeral token，后续 WebRTC 连接和提示词由前端直接与 OpenAI 通信。

## 架构

```
浏览器 → 本服务（获取 token）→ OpenAI
浏览器 ←────────── token ──────────
浏览器 ←──── WebRTC 直连 ──────→ OpenAI（提示词/语音）
```

## 环境要求

- Python 3.8+
- 服务器能访问 OpenAI（境外服务器，或本地开 VPN）

## 快速开始

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 OPENAI_API_KEY

# 3. 启动服务
python main.py
```

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `OPENAI_API_KEY` | ✅ | OpenAI API Key |
| `ALLOWED_ORIGINS` | ✅ | 允许跨域的前端地址，多个用逗号分隔 |

**.env 示例：**
```
OPENAI_API_KEY=sk-xxxxxx
ALLOWED_ORIGINS=http://localhost:8080,https://your-domain.com
```

## 接口

### POST /realtime/token
获取 OpenAI Realtime ephemeral token。

- 请求体：无
- 返回：OpenAI session 对象（含 `client_secret.value`）

```bash
curl -X POST http://localhost:8083/realtime/token
```

### GET /health
健康检查。

```bash
curl http://localhost:8083/health
# {"status":"ok"}
```

## 前端对接

在 `vite.config.js` 中配置代理，本地开发无需改动请求地址：

```js
proxy: {
  '/realtime': {
    target: 'http://localhost:8083',  // 本地调试
    // target: 'http://香港服务器IP:8083',  // 或直接指向服务器
    changeOrigin: true
  }
}
```

前端请求：
```js
const response = await fetch('/realtime/token', { method: 'POST' })
const session = await response.json()
const ephemeralKey = session.client_secret.value
```

## 部署到服务器

```bash
# 后台运行
nohup python main.py &

# 或使用 pm2（推荐）
pm2 start "python main.py" --name realtime-token
```

## 注意

- `.env` 文件不要提交到 git
- 生产环境 `ALLOWED_ORIGINS` 改为实际的前端域名，不要用 `*`
