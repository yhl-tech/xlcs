# -*- coding: utf-8 -*-
import os
import json
import asyncio
import base64
import audioop
import uvicorn
import traceback
import aiohttp
from urllib.parse import parse_qs
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# ================= 配置区域 =================
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") 
# 如果没有 .env 文件，直接填: "sk-proj-...."

# 【重要】如果你在国内，必须配置代理！
# 常见的代理端口：Clash/v2ray通常是 7890, SSR通常是 1080
#PROXY_URL = "http://127.0.0.1:10808"  
# 如果你确定你的网络环境可以直接访问 OpenAI（如在国外服务器），可以将上面设为 None
PROXY_URL = None 

# OpenAI Realtime API URL
OPENAI_WS_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17"

# 音频采样率配置
CLIENT_INPUT_RATE = 16000   
OPENAI_RATE = 24000         
CLIENT_OUTPUT_RATE = 24000  
# ===========================================

# ================= Prompt 模板区域 =================

PRETEST_PROMPT = """
# 核心身份与角色
你是一个专业的罗夏墨迹测试线上AI主试。你的核心任务是引导用户完成整个测试流程。你的性格必须保持绝对的**中立、客观、接纳**。你的语气始终是**温和、平稳且富有耐心**的，旨在创造一个安全、无压力的测试环境。

# 核心任务
你的唯一目标是严格遵循预设的"罗夏墨迹测试步骤"中的阶段一：向用户介绍和解释罗夏墨迹心理测试的测试前准备工作。

# 完整的测试流程与指导语
你必须严格按照以下顺序和话术向用户讲述测试前准备内容：

### 阶段一：准备与访谈
0、（首先是欢迎词）亲爱的用户您好，欢迎来到知己心探心理测试，在测试前，需要跟您确认以下几点：
1、首先，请先在网页左侧，填写您的个人信息。
2、测试需要在台式电脑或笔记本电脑上进行，请确保您的电脑麦克风和音响正常。您可以在浏览器上配置您的麦克风，并利用下方的设备测试按钮，检测您的麦克风和音响状态。
3、需要提醒您的是，测试时需要保持您周围的环境安静，避免被外界的电话、微信消息打扰，只有这样才能达到最好的测试效果。
4、整个心理测试过程采用数字人语音交互完成，确保您的信息隐私安全，请放心。
5、如果以上信息确认完毕，那么请点击蓝色的开始测试按钮，我们将向您介绍心理测试的具体操作流程。
"""

INTEST_1_PROMPT = """
# 核心身份与角色
你是一个专业的罗夏墨迹测试线上AI主试。你的核心任务是引导用户完成整个测试流程。你的性格必须保持绝对的**中立、客观、完全接纳用户**。你的语气始终是**温和、平稳且富有耐心**的，旨在创造一个安全、无压力的测试环境。

# 核心任务
你的唯一目标是严格遵循预设的"罗夏墨迹测试步骤"，提示用户描述图片，听取用户描述，收集用户对墨迹图片的联想、描述、位置和原因，不多做任何引导、评价或解读。

# 完整的施测提问指导语（共10张图片，针对每张图片按下面逻辑执行，循环执行10次）
1. 主动向用户开始测试提示："好的，那我们开始。这是第一张图片。请问可以看到些什么？"（严格按照这句话表述启动测试，不要自定义添加任何词句）
注意点：
  - 此时用户可能会对这个问题产生各种疑问，需要根据下面的文字向用户解释：
    - 用户反问："什么叫看到些什么？"，此时告诉用户："就是从图版中，您可以看出些什么东西出来，没有任何限制。"
    - 用户可能会说："我能看到一团墨迹"，此时应当向用户解释："嗯，我明白您看到了图片上的一团墨迹，但我想问的是，这团墨迹像什么，让您联想到了什么。"
    - 用户可能会说："太抽象了，啥也看不出来"，此时应当向用户解释："嗯，我明白您刚开始看墨迹图片，比较抽象，不太容易看出些什么，不过我相信，您仔细观察一下的话，是可以看出来联想到一些东西的。"
    - 用户可能会说："只需要看出来1个就可以吗？"此时应当解释："不一定，您可以尽力观察，没有任何限制。"
2. **自由联想阶段**，在这个阶段，用户将自由表述自己所看到的东西。【**重要**】：此时不要打断用户说话，延迟几秒钟响应用户，耐心等待用户说完。如果用户在思考，发出"呃……"，"我想一下……"之类的话语，此时严格**保持沉默，不要打断，等待用户思考**。
  - 如果用户有较长时间停顿（30秒钟），此时你可以追问："还能看到些什么吗？"
3. **关键信息追问阶段**：在用户说出图片中像某个东西之后，针对用户的回答进行追问。
  - 如果用户仅仅说了反应，没有做任何阐述，此时，追问用户："请描述一下你看到的XX。"
  - 让用户描述完之后，用户对反应内容的描述，可能是不全的，如果缺失以下信息，则需要追问用户，让他说清楚。
    - 如果用户没有说明【反应区域】，追问用户，"是在图片的哪个部分看出来XX的呢？您可以用画笔按钮，把您看到的圈出来。"
      - 【反应区域】是指用户从哪块墨迹看出来反应内容的。如用户已经描述说出"整体看着像一只XX"(强调了整体墨迹区域)，"这个底下这块白色看着是XX"（强调了部分区域），此时就不再需要追问反应区域了。
    - 如果用户没有说明【反应原因】，需要追问用户："是从哪里看出来像XX的？是因为它的形状、颜色、还是其他什么特征？"
      - 【反应原因】是指用户从什么图片特征看出来反应内容的，主要包括形状、颜色（包括黑白或彩色）、墨迹的浓淡变化、从平面图片看出立体纵深，物品质地和触感，人类（动物、无生命体）的运动行为等，如果用户之前的描述，提及了颜色、形状，或者强调了墨迹色彩的浓淡、空白（白色区域）、立体观察视角、物品的质地和触感、各类的运动行为（如小猫跳跃，火山爆发）等信息，那就不要再追问原因。
  - 如果用户对一个内容描述完毕（用户说出反应，并在追问下说出了区域和原因），需要继续向用户追问："好的，这张图里还能看到一些别的吗？" 重新回到**自由联想阶段**。
  - **切记保持施测语句简短，越短越好，严禁重复用户的描述**
4. **转场提示**：
  - 如果继续追问用户："这张图里还能看到一些别的吗？"，并"再次追问，"确定看不到别的东西了吗？" 用户若明确表示"看不到了"，"没有了"等拒绝信息，那么就告知用户，"好的，如果确定没有了，您可以自行点击页面右下角'下一张'按钮，我们继续看下一张图。"

# 行为准则与交互逻辑
1. 用户优先原则：用户的发言权永远是第一位的。当你在播放语音或说话时，一旦检测到用户开始说话，你必须**立即停止**，并使用"您请说"、"好的，您先说"等话术将话语权交给用户。
2. 【**倾听与等待**】：用户常会思考，发出"呃……"，"我想想……"等类似话语，此时，**必须保持沉默等待，严禁插嘴**，**不要说** 例如"不着急、您慢慢想"，"您可以想好了告诉我" 之类的提示语！
3. **绝对中立**：严禁对用户的回答做出任何正面（如"很好"、"很有趣"）或负面（如"这不太像吧"）的评价。你的反馈应该是事务性的，例如"好的"、"明白了"、"了解"。
4. 程式化执行：你必须严格按照前面定义的【施测提问指导语】进行，不要随意发挥，**极其重要：切记保持施测语句简短，越短越好，严禁重复用户的描述**，不要进行与测试无关的闲聊。
"""

INTEST_2_TO_10_PROMPT = """
# 核心身份与角色
你是一个专业的罗夏墨迹测试线上AI主试。你的核心任务是引导用户完成整个测试流程。你的性格必须保持绝对的**中立、客观、完全接纳用户**。你的语气始终是**温和、平稳且富有耐心**的，旨在创造一个安全、无压力的测试环境。

# 核心任务
你的唯一目标是严格遵循预设的"罗夏墨迹测试步骤"，提示用户描述图片，听取用户描述，收集用户对墨迹图片的联想、描述、位置和原因，不多做任何引导、评价或解读。

# 完整的施测提问指导语（共10张图片，针对每张图片按下面逻辑执行，循环执行10次）
1. 主动向用户开始测试提示："这张图片，请问可以看到些什么？"（严格按照这句话表述启动测试，不要自定义添加任何词句）
2. **自由联想阶段**，在这个阶段，用户将自由表述自己所看到的东西。【**重要**】：此时不要打断用户说话，延迟几秒钟响应用户，耐心等待用户说完。如果用户在思考，发出"呃……"，"我想一下……"之类的话语，此时严格**保持沉默，不要打断，等待用户思考**。
  - 如果用户有较长时间停顿（30秒钟），此时你可以追问："还能看到些什么吗？"
3. **关键信息追问阶段**：在用户说出图片中像某个东西之后，针对用户的回答进行追问。
  - 如果用户仅仅说了反应，没有做任何语言阐述，此时，追问用户："请描述一下你看到的XX。"
  - 让用户描述完之后，用户对反应内容的描述可能是不全的，如果缺失以下信息，则需要追问用户，让他说清楚。
    - 如果用户没有说明【反应区域】，追问用户，"是从图片哪块看出来的？可以用画笔按钮圈出来。"
      - 【反应区域】是指用户从哪块墨迹看出来反应内容的。如用户已经描述说出"整体看着像一只XX"(强调了整体墨迹区域)，"这个底下这块白色看着是XX"（强调了部分区域），此时就不再需要追问反应区域了。
    - 如果用户没有说明【反应原因】，需要追问用户："为什么看着像XX呢？"
      - 【反应原因】是指用户从什么图片特征看出来反应内容的，主要包括形状、颜色（包括黑白或彩色）、墨迹的浓淡变化、从平面图片看出立体纵深，物品质地和触感，人类（动物、无生命体）的运动行为等，如果用户之前的描述，提及了颜色、形状，或者强调了墨迹色彩的浓淡、空白（白色区域）、立体观察视角、物品的质地和触感、各类的运动行为（如小猫跳跃，火山爆发）等信息，那就不要再追问原因。
  - 如果用户对一个内容描述完毕（用户说出反应，并在追问下说出了区域和原因），需要继续向用户追问："好的，这张图里还能看到一些别的吗？" 重新回到**自由联想阶段**。
  - **切记保持施测语句简短，越短越好，严禁重复用户的描述**
4. **转场提示**：
  - 如果继续追问用户："这张图里还能看到一些别的吗？"，并"再次追问，"确定看不到别的东西了吗？" 用户若明确表示"看不到了"，"没有了"等拒绝信息，那么就告知用户，"好的，如果确定没有了，您可以自行点击页面右下角'下一张'按钮，我们继续看下一张图。"
  - 提示语在前两轮，请保持上述的描述词句，在后续的反应过程中，由于用户已经熟悉了流程，则简短回复即可："好的，看不到别的，您可以点击按钮看下一张"（不要补充其他词句，保持简短）

# 行为准则与交互逻辑
1. 用户优先原则：用户的发言权永远是第一位的。当你在播放语音或说话时，一旦检测到用户开始说话，你必须**立即停止**，并使用"您请说"、"好的，您先说"等话术将话语权交给用户。
2. 【**倾听与等待**】：用户常会思考，发出"呃……"，"我想想……"等类似话语，此时，**必须保持沉默等待，严禁插嘴**，**不要说** 例如"不着急、您慢慢想"，"您可以想好了告诉我" 之类的提示语！
3. **绝对中立**：严禁对用户的回答做出任何正面（如"很好"、"很有趣"）或负面（如"这不太像吧"）的评价。你的反馈应该是事务性的，例如"好的"、"明白了"、"了解"。
4. 程式化执行：你必须严格按照前面定义的【施测提问指导语】进行，不要随意发挥，**极其重要：切记保持施测语句简短，越短越好，严禁重复用户的描述**，不要进行与测试无关的闲聊。
"""

POSTTEST_PROMPT = """
# 核心身份与角色
你是一个专业的罗夏墨迹测试线上AI主试，你的核心任务是引导用户完成整个测试流程。你的性格必须保持绝对的**中立、客观、内心接纳用户**。你的语气始终是**温和、平稳、不刻意引导情绪且富有耐心**的，旨在创造一个安全、无压力的测试环境。

# 核心任务
你的唯一目标是严格遵循下面预设的"罗夏墨迹测试步骤"中的测试后提问，向用户提问下面列出的多个问题，不多做任何引导、评价或解读。

# 测试后访谈的施测提问指导语
1、主动向用户做开场语："好的，十张图片我们都看完了。现在您应该能看到所有的十张图片，接下来还有最后几个问题需要您回答一下。"
注意点：
  - 如果用户没有对你的开场语作反应，你直接开始下面的提问就好。

2、依次提问下面的问题：
- "在这十张图片里，您认为，哪一张图片最能代表您自己呢？您可以语音告诉我对应的图版编号。
注意点：
  - 【极其重要】：如果用户听完了问题，陷入了沉思，发出了"呃……"之类的话，**请保持沉默不插嘴，继续等待用户讲完话**。
  - 如果用户对这个问题有疑虑（没有疑问的话，则等待用户说出图版编号即可），提出了追问或咨询，请根据下面的文字告诉用户，回答的具体要求。
    - 用户提问："必须要选择一张吗？"，"只能选择一张吗？"等问题，你需要告诉用户："您可以根据您自己的感受和想法选择即可，没有任何强制性要求的。"
  - 等待用户说出具体的图版编号，在用户说出具体图版编号前，不要插嘴解释。
    - 用户说出来图版编号后（有可能不止一张），追问用户："为什么选择这张呢？原因是什么？"
    - 如果用户思考片刻后，说实在找不出来，则告诉用户："好的，没关系，实在没法回答，我们可以继续下一个问题。"
  - 等待用户对选择图版的原因，做出解释之后（一定要等用户把话说完），告诉用户："好的，我明白了，我们继续下一个问题。"

- 除了上述找出最能代表自己的图版这个问题，依次按照上述的问题方式与注意事项，向用户提问，让ta找出"哪一张最能代表你的父亲呢？"，"哪一张最能代表你的母亲呢？"，"所有图版里，你自己最喜欢哪一张？"，"所有图版里，你自己最讨厌哪一张？"

3、在提问完上述5个问题之后，说出测试结束引导语："到这里，本次测试就全部结束了。最后想问一下，您现在的心情怎么样？和刚开始测试时相比，有什么变化吗？"
    - 在用户回答心情后，给出结束语："好的，再次感谢您的时间。测试结果将由AI协同专业人员进行分析。测试报告将会在三天之内以短信形式通知您登录下载获取，祝您生活愉快！再见！"

# 行为准则与交互逻辑
1. 用户优先原则：用户的发言权永远是第一位的。当你在播放语音或说话时，一旦检测到用户开始说话，你必须**立即停止**。
2. **倾听与等待**：用户常会思考，发出"呃……"，"我想想……"等类似话语，此时，**严禁插嘴**，**不要说** 例如"不着急、您慢慢想"，"您可以想好了告诉我" 之类的提示语！
3. **绝对中立**：严禁对用户的回答做出任何正面（如"很好"、"很有趣"）或负面（如"这不太像吧"）的评价。你的反馈应该是事务性的，例如"好的"、"明白了"、"了解"。
4. 程式化执行：你必须严格按照前面定义的【测试后提问】进行，不要随意发挥，不要进行与测试无关的闲聊。不要对用户提问指导语之外的问题。
"""

# Phase 到 Prompt 的映射
PHASE_PROMPT_MAP = {
    "pretest": PRETEST_PROMPT,
    "intest1": INTEST_1_PROMPT,
    "intest2to10": INTEST_2_TO_10_PROMPT,
    "posttest": POSTTEST_PROMPT,
}

# 默认 Prompt（兜底）
DEFAULT_PROMPT = "你是一个专业的罗夏墨迹测试线上AI主试。请用温和、平稳且富有耐心的语气与用户交流。请始终保持中文回复。"

# ===========================================

if not OPENAI_API_KEY:
    print("❌ 警告: 未设置 OPENAI_API_KEY")

app = FastAPI()

def get_prompt_by_phase(phase: str) -> str:
    """根据 phase 获取对应的 prompt"""
    return PHASE_PROMPT_MAP.get(phase, DEFAULT_PROMPT)

def resample_audio(audio_bytes, from_rate, to_rate, state=None):
    """音频重采样"""
    try:
        fragment, new_state = audioop.ratecv(audio_bytes, 2, 1, from_rate, to_rate, state)
        return fragment, new_state
    except Exception as e:
        print(f"⚠️ 重采样错误: {e}")
        return audio_bytes, state

async def handle_websocket_session(client_ws: WebSocket, phase: str = None):
    await client_ws.accept()
    print(f"✅ 前端已连接 (路径: {client_ws.url.path}, phase: {phase})")

    # 获取对应阶段的 prompt
    instructions = get_prompt_by_phase(phase)
    print(f"📋 当前阶段: {phase}, 使用对应 Prompt")

    resample_state = None
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "OpenAI-Beta": "realtime=v1"
    }

    # 创建 aiohttp 会话
    async with aiohttp.ClientSession() as session:
        try:
            # 连接 OpenAI (带代理支持)
            print(f"🔄 正在连接 OpenAI (代理: {PROXY_URL})...")
            async with session.ws_connect(
                OPENAI_WS_URL, 
                headers=headers, 
                proxy=PROXY_URL
            ) as openai_ws:
                
                print("🚀 已成功连接到 OpenAI Realtime API")

                # 初始化 Session
                session_update = {
                    "type": "session.update",
                    "session": {
                        "modalities": ["text", "audio"],
                        "instructions": instructions,
                        "voice": "alloy",
                        "input_audio_format": "pcm16",
                        "output_audio_format": "pcm16",
                        "input_audio_transcription": {
                            "model": "whisper-1"
                        },
                        "turn_detection": {
                            "type": "server_vad",
                            "threshold": 0.5,
                            "prefix_padding_ms": 600,
                            "silence_duration_ms": 800
                        }
                    }
                }
                await openai_ws.send_str(json.dumps(session_update))
                print("📤 已发送 session.update")

                # 等待 session.created 和 session.updated 事件
                session_ready = False
                while not session_ready:
                    msg = await openai_ws.receive()
                    if msg.type == aiohttp.WSMsgType.TEXT:
                        event = json.loads(msg.data)
                        event_type = event.get("type")
                        print(f"📥 收到事件: {event_type}")
                        if event_type == "session.updated":
                            session_ready = True
                            print("✅ Session 已就绪")
                        elif event_type == "error":
                            print(f"❌ OpenAI 错误: {event.get('error')}")
                            break

                # 【关键】AI 主动开场：发送 response.create 触发 AI 根据 prompt 主动说话
                if session_ready:
                    print("🎤 触发 AI 主动开场...")
                    await openai_ws.send_str(json.dumps({
                        "type": "response.create",
                        "response": {
                            "modalities": ["text", "audio"]
                        }
                    }))

                # 任务1: 前端 -> OpenAI
                async def client_to_openai():
                    nonlocal resample_state
                    try:
                        while True:
                            message = await client_ws.receive()
                            
                            if "bytes" in message and message["bytes"]:
                                pcm_data = message["bytes"]
                                if CLIENT_INPUT_RATE != OPENAI_RATE:
                                    pcm_data, resample_state = resample_audio(
                                        pcm_data, CLIENT_INPUT_RATE, OPENAI_RATE, resample_state
                                    )
                                base64_audio = base64.b64encode(pcm_data).decode('utf-8')
                                await openai_ws.send_str(json.dumps({
                                    "type": "input_audio_buffer.append",
                                    "audio": base64_audio
                                }))

                            elif "text" in message and message["text"]:
                                try:
                                    data = json.loads(message["text"])
                                    msg_type = data.get("type")
                                    if msg_type == "text_query":
                                        print(f"📝 收到文本: {data.get('content')}")
                                        await openai_ws.send_str(json.dumps({
                                            "type": "conversation.item.create",
                                            "item": {
                                                "type": "message",
                                                "role": "user",
                                                "content": [{"type": "input_text", "text": data.get("content")}]
                                            }
                                        }))
                                        await openai_ws.send_str(json.dumps({"type": "response.create"}))
                                except json.JSONDecodeError:
                                    pass
                    except WebSocketDisconnect:
                        print("📴 前端断开连接")
                    except Exception as e:
                        print(f"❌ 前端->OpenAI 错误: {e}")

                # 任务2: OpenAI -> 前端
                async def openai_to_client():
                    try:
                        async for msg in openai_ws:
                            if msg.type == aiohttp.WSMsgType.TEXT:
                                event = json.loads(msg.data)
                                event_type = event.get("type")

                                if event_type == "response.audio.delta":
                                    audio_base64 = event.get("delta")
                                    if audio_base64:
                                        pcm_bytes = base64.b64decode(audio_base64)
                                        await client_ws.send_bytes(pcm_bytes)

                                elif event_type == "response.audio_transcript.done":
                                    transcript = event.get("transcript", "")
                                    if transcript:
                                        await client_ws.send_text(json.dumps({
                                            "type": "text_transcription",
                                            "text": transcript,
                                            "is_final": True,
                                            "speaker": "ai"
                                        }))
                                        print(f"🤖 AI: {transcript}")
                                
                                elif event_type == "conversation.item.input_audio_transcription.completed":
                                    transcript = event.get("transcript", "")
                                    if transcript:
                                        await client_ws.send_text(json.dumps({
                                            "type": "text_transcription",
                                            "text": transcript,
                                            "is_final": True,
                                            "speaker": "user"
                                        }))
                                        print(f"👤 User: {transcript}")

                                elif event_type == "error":
                                    print(f"❌ OpenAI API 报错: {event.get('error')}")

                            elif msg.type == aiohttp.WSMsgType.ERROR:
                                print('OpenAI 连接发生错误')
                                break
                    except Exception as e:
                        print(f" OpenAI->前端 错误: {e}")
                        traceback.print_exc()

                await asyncio.gather(client_to_openai(), openai_to_client())

        except Exception as e:
            print(f" 无法连接到 OpenAI: {e}")
            traceback.print_exc()
            await client_ws.close()

@app.websocket("/")
async def websocket_endpoint_root(websocket: WebSocket):
    # 从 query string 获取 phase 参数
    query_string = websocket.scope.get("query_string", b"").decode()
    params = parse_qs(query_string)
    phase = params.get("phase", [None])[0]
    await handle_websocket_session(websocket, phase)

@app.websocket("/xlcp/ws/")
async def websocket_endpoint_xlcp(websocket: WebSocket):
    # 从 query string 获取 phase 参数
    query_string = websocket.scope.get("query_string", b"").decode()
    params = parse_qs(query_string)
    phase = params.get("phase", [None])[0]
    await handle_websocket_session(websocket, phase)

if __name__ == "__main__":
    print("=" * 50)
    print("罗夏墨迹测试 OpenAI Realtime Server")
    print("=" * 50)
    print(f"代理地址: {PROXY_URL if PROXY_URL else '无'}")
    print(f"支持的 Phase: {list(PHASE_PROMPT_MAP.keys())}")
    print("连接示例: ws://localhost:8765/xlcp/ws/?phase=pretest")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8765)
