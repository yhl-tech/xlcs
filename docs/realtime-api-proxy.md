# 方案一：后端代理 OpenAI Realtime（通俗版）

---

## 一句话在干什么

**现在**：网页里的语音对话，是浏览器自己拿着 API Key 去连 OpenAI，你这边连不上 OpenAI，所以就失败。

**改完后**：浏览器不直接找 OpenAI，而是找你自己的服务器；你的服务器能访问 OpenAI，就替浏览器去要「会话」和「建连信息」，再原样转给浏览器。API Key 只放在你服务器上，浏览器看不到。

---

## 打个比方

- 现在：你（浏览器）自己拿钥匙（API Key）去 OpenAI 开门，但路不通（网络限制），进不去。
- 改完后：你只跟你家管家（你的后端）说话，管家拿着钥匙去 OpenAI 拿东西，再把拿到的结果交给你。你从来没碰过钥匙，也没直接去过 OpenAI。

---

## 整体分几步（按顺序）

1. **浏览器** 对你自己的服务器说：「我要开一个语音会话」，并告诉服务器：用哪个模型、什么提示词等（**不**带 API Key）。
2. **你的服务器** 拿着自己保存的 API Key，去 OpenAI 开这个会话，拿到一个「临时通行证」。
3. **你的服务器** 把这个「临时通行证」原样交给浏览器。
4. **浏览器** 拿着临时通行证，再对你自己的服务器说：「这是我要建连用的信息（一段 SDP 文本），你帮我换回对方的回复」。
5. **你的服务器** 把这段信息和临时通行证原样转给 OpenAI，拿到 OpenAI 的回复（另一段 SDP 文本）。
6. **你的服务器** 把这段回复原样交给浏览器。
7. **浏览器** 用拿到的回复和 OpenAI **直接**建立语音通道（这一步不再经过你服务器，所以如果你网络到 OpenAI 的通道本身就不通，这里仍可能失败）。

前面 1～6 步都是「你服务器在中间转手」；第 7 步是浏览器和 OpenAI 直连，你服务器参与不了。

---

## 你的后端要做的只有两件事

---

### 第一件事：提供一个「创建会话」的接口

**浏览器会怎么调你：**

- 方法：`POST`
- 地址：你定，比如 `https://你的域名/xlcp/api/realtime/sessions`（和现有 API 同一个域名即可）
- 请求头：`Content-Type: application/json`，**不要**带 `Authorization`
- 请求体：一段 JSON，里面包含：用哪个模型、什么提示词、语音检测参数等（下面给一个完整示例）

**你的服务器收到后要做啥：**

1. 从**自己**的配置里拿出 OpenAI 的 API Key（不要从浏览器请求里拿）。
2. 用这个 Key，替浏览器去请求 OpenAI：  
   `POST https://api.openai.com/v1/realtime/sessions`  
   请求体就用浏览器发给你的那段 JSON，原样转发。
3. OpenAI 会返回一段 JSON，里面有一个「临时通行证」（在 `client_secret.value` 里）。  
   你把 **OpenAI 的整段响应**（状态码 + 内容）原样返回给浏览器，不要改、不要只取一部分。

**浏览器发来的 JSON 长什么样（示例，你原样转发给 OpenAI 即可）：**

```json
{
  "model": "gpt-4o-realtime-preview-2024-12-17",
  "voice": "alloy",
  "instructions": "你是一个专业的知己心探测试线上AI 助手...",
  "input_audio_transcription": { "model": "whisper-1" },
  "turn_detection": {
    "type": "server_vad",
    "threshold": 0.6,
    "prefix_padding_ms": 500,
    "silence_duration_ms": 1500
  }
}
```

总结：**接到浏览器的 JSON → 加上自己的 API Key 转发给 OpenAI → 把 OpenAI 的响应原样返回给浏览器。**

---

### 第二件事：提供一个「SDP 交换」的接口

**浏览器会怎么调你：**

- 方法：`POST`
- 地址：你定，比如 `https://你的域名/xlcp/api/realtime/sdp?model=gpt-4o-realtime-preview-2024-12-17`（同上，和现有 API 同域名）
- 请求头：  
  - `Authorization: Bearer 临时通行证`（就是上一步你返回给浏览器的那个 `client_secret.value`）  
  - `Content-Type: application/sdp`
- 请求体：一大段**纯文本**（不是 JSON），是浏览器生成的「建连请求」（叫 SDP offer）

**你的服务器收到后要做啥：**

1. 从请求里拿到：  
   - 地址里的 `model` 参数（没有就用默认的 `gpt-4o-realtime-preview-2024-12-17`）  
   - 请求头里的 `Authorization`（**整行原样保留**，不要换成你自己的 API Key）  
   - 请求体整段**当纯文本**读出来（不要当 JSON 解析）
2. 用这些去请求 OpenAI：  
   `POST https://api.openai.com/v1/realtime?model=上面那个model`  
   请求头：和浏览器发给你的一样，`Authorization` 和 `Content-Type: application/sdp` 都原样带过去  
   请求体：把浏览器发来的那段文本原样发过去
3. OpenAI 会返回另一段**纯文本**（叫 SDP answer）。  
   你把 **OpenAI 的整段响应**（状态码 + 这段文本）原样返回给浏览器。

总结：**接到浏览器的「临时通行证 + 一段 SDP 文本」→ 原样转给 OpenAI → 把 OpenAI 返回的文本原样返回给浏览器。**

注意：这里必须用浏览器带来的「临时通行证」，不能换成你自己的 API Key，否则 OpenAI 不认。

---

## 容易出错的地方

1. **第二件事的请求体**：是纯文本，不是 JSON。后端要按「原始文本」读，不要用 JSON 解析，否则转发给 OpenAI 会错。
2. **第二件事的 Authorization**：必须原样转发浏览器带来的 `Authorization`，不能改成 `Bearer 你的API Key`。
3. **两件事的响应**：都是「OpenAI 返回什么，你就原样返回给浏览器」，不要多加一层包装或改字段名。

---

## 做完之后

- 浏览器会先请求你的 `/realtime/sessions`，再请求你的 `/realtime/sdp`，拿到两样东西后，自己去和 OpenAI 建立语音通道。
- API Key 只存在你服务器上，浏览器从未见过。
- 如果到第 7 步（浏览器直连 OpenAI）仍然失败或很卡，说明问题不在「要钥匙」和「换建连信息」，而在「你家到 OpenAI 的路」本身不通，那时就要考虑用国内语音服务（方案二），而不是继续折腾代理。

---

## 对照表：两个接口一眼看懂

| 项目 | 第一件事（创建会话） | 第二件事（SDP 交换） |
|------|----------------------|----------------------|
| 浏览器调你的地址 | `POST /xlcp/api/realtime/sessions` | `POST /xlcp/api/realtime/sdp?model=xxx` |
| 浏览器带什么 | 一段 JSON（模型、提示词等），**不带** Key | 请求头里带「临时通行证」，body 是一大段纯文本 |
| 你服务器做什么 | 用自己的 Key 把这段 JSON 转给 OpenAI，把 OpenAI 的响应原样返回 | 把「临时通行证 + 这段文本」原样转给 OpenAI，把 OpenAI 返回的文本原样返回 |
| 你转发给 OpenAI 的地址 | `POST https://api.openai.com/v1/realtime/sessions` | `POST https://api.openai.com/v1/realtime?model=xxx` |

如果你愿意，我可以按你后端用的语言（比如 Node、Python、Java）写一份「接到请求后具体怎么调 OpenAI」的示例代码（只写这两段逻辑）。
