"""
OpenAI Realtime Token 代理服务
依赖安装: pip install -r requirements.txt
启动命令: uvicorn main:app --host 0.0.0.0 --port 8000

.env 文件配置:
  OPENAI_API_KEY=sk-xxxxxx
  ALLOWED_ORIGINS=http://localhost:8080,https://your-domain.com
"""

import os
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Realtime Token Proxy")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
HTTP_PROXY = os.getenv("HTTP_PROXY", "")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.post("/realtime/token")
async def get_realtime_token():
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

    return response.json()


@app.post("/realtime/sdp")
async def proxy_sdp(request: Request):
    ephemeral_key = request.headers.get("X-Ephemeral-Key")
    model = request.query_params.get("model", "gpt-4o-realtime-preview-2024-12-17")
    sdp_body = await request.body()

    if not ephemeral_key:
        raise HTTPException(status_code=400, detail="缺少 X-Ephemeral-Key")

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


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)
