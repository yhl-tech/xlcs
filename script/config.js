/**
 * 统一配置文件
 * 根据环境自动选择 WebSocket URL 和 API Base URL
 */

// 判断是否为生产环境
// Vite 中：import.meta.env.PROD 在生产构建时为 true
// import.meta.env.MODE 可以是 'development' 或 'production'
const isProduction =
  typeof import.meta !== "undefined" &&
  (import.meta.env?.PROD === true || import.meta.env?.MODE === "production")

// 根据环境选择 API Base URL
const getApiBaseUrl = () => {
  if (isProduction) {
    // 生产环境 - 从环境变量获取，如果没有则使用默认值
    return (
      import.meta.env?.VITE_API_BASE_URL ||
      "https://your-production-api-domain.com/api"
    )
  }
  // 开发环境 - 使用代理
  return "/api"
}

// WebSocket 配置（已废弃，保留用于兼容）
export const WS_CONFIG = {
  // 开发环境 - 直接使用线上地址、
  development: "wss://innerscan.life/xlcp/ws/111",
  // development: "wss://www.jionlp.com/xlcp/ws/",
  // 生产环境（使用域名和 wss:// 因为页面通过 HTTPS 加载）
  // production: "wss://www.jionlp.com/xlcp/ws/",
  production: "wss://innerscan.life/xlcp/ws/",
}

// 获取当前环境的 WebSocket URL（已废弃，保留用于兼容）
export const getWebSocketUrl = () => {
  if (isProduction) {
    return WS_CONFIG.production
  }
  return WS_CONFIG.development
}

// OpenAI 配置
export const OPENAI_CONFIG = {
  // API Key - 从 localStorage 读取或使用环境变量
  apiKey: typeof localStorage !== "undefined"
    ? localStorage.getItem("openai_api_key")
    : (import.meta.env?.VITE_OPENAI_API_KEY || ""),

  // 模型配置
  model: "gpt-4o-realtime-preview-2024-12-17",

  // 语音配置
  voice: "alloy", // alloy, echo, fable, onyx, nova, shimmer

  // 系统提示词
  systemPrompt: `# 核心身份与角色
你是一个专业的罗夏墨迹测试线上AI主试。你的核心任务是引导用户完成整个测试流程。你的性格必须保持绝对的**中立、客观、完全接纳用户**。你的语气始终是**温和、平稳且富有耐心**的，旨在创造一个安全、无压力的测试环境。

# 核心任务
你的唯一目标是严格遵循预设的"罗夏墨迹测试步骤"，提示用户描述图片，听取用户描述，收集用户对墨迹图片的联想、描述、位置和原因，不多做任何引导、评价或解读。

# 完整的施测提问指导语（共10张图片，针对每张图片按下面逻辑执行，循环执行10次）
1. 主动向用户开始测试提示："好的，这张图片你可以看到什么？"（严格按照这句话表述启动测试，不要自定义添加任何词句）
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
`
}

// 获取 OpenAI 配置
export const getOpenAIConfig = () => {
  // 优先级：localStorage > 环境变量 > 默认值
  let apiKey = ""
  if (typeof localStorage !== "undefined") {
    apiKey = localStorage.getItem("openai_api_key") || ""
  }
  if (!apiKey && typeof import.meta !== "undefined") {
    apiKey = import.meta.env?.VITE_OPENAI_API_KEY || ""
  }

  return {
    ...OPENAI_CONFIG,
    apiKey: apiKey || OPENAI_CONFIG.apiKey,
  }
}

// API 配置
export const API_CONFIG = {
  baseURL: getApiBaseUrl(),
  isProduction: isProduction,
}

// 分析接口使用的固定 API Key
const ANALYZE_API_KEY =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkb25ncml4aW55dSIsImV4cCI6MTc2MzQ1NzU1Nn0.gCGNkTXgLcOhC8GuQZNfiXCljyA5JJCOqgRaPT83wkM"

// 导出到全局（供非模块代码使用）
if (typeof window !== "undefined") {
  window.ANALYZE_API_KEY = ANALYZE_API_KEY
  window.API_CONFIG = API_CONFIG
}

// 开发环境配置
// skipIntroInDev: true 时，开发环境跳过介绍页面和预览窗口，直接进入测试
// skipIntroInDev: false 时，开发环境正常显示介绍页面和预览窗口
export const DEV_CONFIG = {
  skipIntroInDev: false, // 开发环境跳过介绍页面和预览窗口，直接进入测试
  // 开发环境默认基本信息
  defaultBasicInfo: {
    sex: "男",
    age: "25",
    education: "本科",
    occupation: "工程师",
    mood: "平静",
  },
}

// 导出默认配置
export default {
  wsUrl: getWebSocketUrl(),
  apiBaseUrl: getApiBaseUrl(),
  isProduction,
  devConfig: DEV_CONFIG,
}

// 词云数据源配置
export const WORDCLOUD_CONFIG = {
  // 数据源模式：true=使用mock数据，false=使用真实API
  useMockData: true,

  // 真实 API 配置
  api: {
    // 词云数据接口地址
    endpoint: "/api/report/wordcloud",

    // 请求配置
    options: {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  },

  // API 响应数据结构说明
  // 真实 API 应返回如下格式的数据：
  // {
  //   status: 'success',
  //   timestamp: 1234567890,
  //   data: {
  //     userInfo: {
  //       age: '27岁',
  //       gender: '女性',
  //       education: '研究生',
  //       occupation: '产品经理'
  //     },
  //     keywords: [
  //       { text: '压力', weight: 5, category: 'emotion' },
  //       { text: '焦虑', weight: 4.5, category: 'emotion' },
  //       ...
  //     ],
  //     conversationWords: ['压力', '焦虑', '失眠', ...]
  //   }
  // }
}

// 导出 API Key（供模块使用）
export { ANALYZE_API_KEY }
