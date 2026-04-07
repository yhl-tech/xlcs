
"""
OpenAI Realtime Token 代理服务
依赖安装: pip install -r requirements.txt
启动命令: uvicorn main:app --host 0.0.0.0 --port 8765

.env 文件配置:
  OPENAI_API_KEY=sk-xxxxxx
  ALLOWED_ORIGINS=http://localhost:8080,https://your-domain.com
"""

import os
import httpx
import asyncio
from datetime import datetime, timedelta
from typing import Dict
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="Realtime Token Proxy")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
HTTP_PROXY = os.getenv("HTTP_PROXY", "")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "GET", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# 连接管理数据结构
class ConnectionInfo:
    def __init__(self, connection_id: str, client_ip: str = None):
        self.connection_id = connection_id
        self.client_ip = client_ip
        self.created_at = datetime.now()
        self.last_activity = datetime.now()


# 内存中的连接存储
active_connections: Dict[str, ConnectionInfo] = {}


# 请求模型
class CloseConnectionRequest(BaseModel):
    connection_id: str


def get_client_ip(request: Request) -> str:
    """
    解析「对用户而言」的客户端 IP。

    经 Nginx/Ingress 反代时，TCP 直连到本服务的是代理，request.client.host 会是 127.0.0.1 或内网 IP；
    真实浏览器 IP 由反代写入 X-Real-IP 或 X-Forwarded-For。

    注意：若应用**直接暴露公网**且未剥离伪造头，客户端可伪造 X-Forwarded-For；
    仅建议在反代已规范设置这些头的环境下使用。
    """
    real = request.headers.get("X-Real-IP")
    if real:
        return real.strip()
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # 常见格式 "client, proxy1, proxy2" — 取第一个为原始客户端（由可信反代追加时成立）
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


# 后台任务：清理超时连接
async def cleanup_expired_connections():
    """定期清理超过2小时的连接"""
    while True:
        try:
            current_time = datetime.now()
            expired_connections = []

            for conn_id, conn_info in active_connections.items():
                if current_time - conn_info.created_at > timedelta(hours=2):
                    expired_connections.append(conn_id)

            for conn_id in expired_connections:
                del active_connections[conn_id]
                print(f"[CLEANUP] 自动清理超时连接: {conn_id}")

            if expired_connections:
                print(f"[CLEANUP] 清理了 {len(expired_connections)} 个超时连接")

        except Exception as e:
            print(f"[CLEANUP] 清理任务异常: {e}")

        # 每10分钟检查一次
        await asyncio.sleep(600)


# 启动后台清理任务
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(cleanup_expired_connections())


@app.post("/realtime/token")
async def get_realtime_token(request: Request):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="未配置 OPENAI_API_KEY")

    async with httpx.AsyncClient(timeout=30, proxy=HTTP_PROXY or None) as client:
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

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    # 获取响应数据并记录连接
    token_data = response.json()

    # connection_id 仅用于本代理登记/前端 X-Connection-Id，须短且非密钥
    client_ip = get_client_ip(request)
    connection_id = f"{client_ip}_{datetime.now().timestamp()}"

    # 记录新连接
    active_connections[connection_id] = ConnectionInfo(connection_id, client_ip)
    print(f"[TOKEN] 新建连接: {connection_id}, 来自IP: {client_ip}")

    # 在返回数据中添加连接ID，方便客户端后续操作
    token_data["connection_id"] = connection_id

    return token_data


@app.post("/realtime/sdp")
async def proxy_sdp(request: Request):
    ephemeral_key = request.headers.get("X-Ephemeral-Key")
    connection_id = request.headers.get("X-Connection-Id")  # 客户端需要传递连接ID
    model = request.query_params.get("model", "gpt-4o-realtime-preview-2024-12-17")
    sdp_body = await request.body()

    if not ephemeral_key:
        raise HTTPException(status_code=400, detail="缺少 X-Ephemeral-Key")

    # 更新连接活动时间
    if connection_id and connection_id in active_connections:
        active_connections[connection_id].last_activity = datetime.now()

    print(f"[SDP] 转发 SDP 到 OpenAI, model={model}, body_size={len(sdp_body)}")

    try:
        async with httpx.AsyncClient(timeout=30, proxy=HTTP_PROXY or None) as client:
            response = await client.post(
                f"https://api.openai.com/v1/realtime?model={model}",
                headers={
                    "Authorization": f"Bearer {ephemeral_key}",
                    "Content-Type": "application/sdp",
                },
                content=sdp_body,
            )

        print(f"[SDP] OpenAI 响应状态: {response.status_code}")
        print(f"[SDP] OpenAI 响应内容: {response.text[:200]}")

        if response.status_code not in (200, 201):
            raise HTTPException(status_code=response.status_code, detail=response.text)

        return PlainTextResponse(content=response.text, status_code=200)

    except httpx.RequestError as e:
        print(f"[SDP] 请求异常: {e}")
        raise HTTPException(status_code=502, detail=f"请求 OpenAI 失败: {str(e)}")


@app.get("/realtime/status")
async def get_realtime_status():
    """获取当前连接状态"""
    connection_count = len(active_connections)

    if connection_count == 0:
        return {
            "status": "idle",
            "message": "当前没有人使用gpt-4o服务",
            "active_connections": 0,
            "connections": []
        }
    else:
        # 构建连接详情
        connections_detail = []
        for conn_id, conn_info in active_connections.items():
            connections_detail.append({
                "connection_id": conn_id,
                "client_ip": conn_info.client_ip,
                "created_at": conn_info.created_at.isoformat(),
                "last_activity": conn_info.last_activity.isoformat(),
                "duration_minutes": int((datetime.now() - conn_info.created_at).total_seconds() / 60)
            })

        return {
            "status": "active",
            "message": f"当前正在{connection_count}人使用gpt-4o服务",
            "active_connections": connection_count,
            "connections": connections_detail
        }


@app.delete("/realtime/connection")
async def close_connection(close_request: CloseConnectionRequest):
    """关闭指定连接"""
    connection_id = close_request.connection_id

    if connection_id not in active_connections:
        raise HTTPException(status_code=404, detail=f"连接 {connection_id} 不存在")

    # 移除连接记录
    conn_info = active_connections.pop(connection_id)
    duration = datetime.now() - conn_info.created_at

    print(f"[CLOSE] 手动关闭连接: {connection_id}, 持续时间: {duration}")

    return {
        "status": "success",
        "message": f"连接 {connection_id} 已关闭",
        "connection_duration_minutes": int(duration.total_seconds() / 60)
    }


@app.post("/realtime/connection/close")
async def close_connection_post(close_request: CloseConnectionRequest):
    """关闭指定连接 (POST方法，与DELETE方法功能相同)"""
    return await close_connection(close_request)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "active_connections": len(active_connections),
        "uptime": datetime.now().isoformat()
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8765)

