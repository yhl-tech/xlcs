export const INTRO_STEPS = {
  INFO_FORM: "info_form",
  INTRO_OVERLAY: "intro_overlay",
  TEST: "test",
}

export const INTRO_STEP_VALUES = Object.values(INTRO_STEPS)

export const CANVAS_BASE_TRANSFORM = "translate(-50%, -50%)"

export const SESSION_VERSION = 1
export const SESSION_SAVE_DEBOUNCE = 600

export const INACTIVITY_THRESHOLD_1 = 60000
export const INACTIVITY_THRESHOLD_2 = 120000
export const NEXT_BUTTON_COOLDOWN = 1 //冷却时间

// 测试过程中的提示语配置
export const PROMPT_TEXTS = {
  // 下一个反应提示语
  nextReaction: {
    detailed: "这张图片里，除了这个，您还能看到些什么吗？", // 前 2 张图片里详细提示下一个目标
    simple: "还能看到什么？", // 后面图版直接提示
  },

  // 无反应，切换图片提示语
  noReactionSwitch: {
    detailed:
      "如果这张图片实在看不到别的了，您可以自行决定切换下一张图片，点击右下方下一张按钮即可。", // 前 3 张可以这么提示
    simple: "如果看不到别的内容了，可以切换下一张图片", // 后面图版简略提示
  },

  // 观察位置，画笔勾画提示语
  locationDrawing: {
    detailed:
      "是在图版的哪个位置看到的呢？您可以用画笔在图版上圈一下，并向我描述一下你所看到的东西", // 前 2 张图版可以提示用户详细一些，解释图版位置区域
    simple: "麻烦用画笔圈一下目标", // 后面图版直接提示
  },

  // 决定因素提示语
  decisionFactor: {
    detailed:
      "您感觉哪里像（看到的东西）呢？是形状像？颜色像？还是别的什么因素？", // 前 2 张图版可以提示用户解释一下原因
    simple: "从哪看出来的呢？", // 后面的图版不需要这么细，直接告诉用户解释一下就可以了
  },

  // 追问描述提示语，捕获更多信息
  descriptionFollowUp: [
    "可以具体描述一下吗？", // 后面的图版，不需要过细的指导，直接提示用户即可
    "请具体描述一下你所看到的这个东西",
  ],

  // 人反应追问提示语
  humanReaction: "这个人（这两个人，这两只敬酒的猴子）给你一种什么感觉", // 如果是描述的人，或者类人，拟人，大概率需要提问这个，询问情绪与人际关系
}

/**
 * 根据图片索引判断是否使用详细提示语
 * @param {number} imageIndex - 图片索引（0-9）
 * @param {number} threshold - 阈值，小于此值使用详细提示语
 * @returns {boolean} 是否使用详细提示语
 */
export function shouldUseDetailedPrompt(imageIndex, threshold = 2) {
  return imageIndex < threshold
}

/**
 * 根据图片索引和提示类型获取合适的提示语
 * @param {string} promptType - 提示类型：'nextReaction' | 'noReactionSwitch' | 'locationDrawing' | 'decisionFactor'
 * @param {number} imageIndex - 图片索引（0-9）
 * @returns {string} 提示语文本
 */
export function getPromptText(promptType, imageIndex) {
  const prompts = PROMPT_TEXTS[promptType]
  if (!prompts) {
    console.warn(`[getPromptText] 未知的提示类型: ${promptType}`)
    return ""
  }

  // 对于有 detailed/simple 结构的提示语
  if (prompts.detailed && prompts.simple) {
    const threshold = promptType === "noReactionSwitch" ? 3 : 2 // 无反应切换提示语前3张，其他前2张
    return shouldUseDetailedPrompt(imageIndex, threshold)
      ? prompts.detailed
      : prompts.simple
  }

  // 对于数组类型的提示语（如 descriptionFollowUp），随机选择一个
  if (Array.isArray(prompts)) {
    return prompts[Math.floor(Math.random() * prompts.length)]
  }

  // 对于字符串类型的提示语
  return prompts
}

/**
 * 获取随机提示语（用于不活动检测）
 * @param {number} imageIndex - 当前图片索引（0-9）
 * @returns {string} 随机选择的提示语
 */
export function getRandomPromptText(imageIndex = 0) {
  // 可用的提示类型（排除 humanReaction，因为它需要特定场景）
  const availableTypes = [
    "nextReaction",
    "noReactionSwitch",
    "locationDrawing",
    "decisionFactor",
    "descriptionFollowUp",
  ]

  // 随机选择一个类型
  const randomType =
    availableTypes[Math.floor(Math.random() * availableTypes.length)]

  return getPromptText(randomType, imageIndex)
}

export const FINAL_PROMPT_TEXT = "提示：请点击下一张图片继续..."

export const POST_TEST_QUESTIONS = [
  {
    key: "represent",
    text: "好了，到此为止，十张墨迹图片就已经全部看完了，你现在可以看到所有的十张图片。还有几个问题需要你回答一下，第一个问题是，十张图片里，选择一张最能代表你自己的，最能代表你本人的，是哪一张？请您用鼠标点击一下图版来告诉我",
  },
  {
    key: "represent_why",
    text: "请解释一下为什么，图片中哪些地方，哪些特点最能代表你自己。",
  },
  {
    key: "father",
    text: "好的，下一个问题是，十张图片里，选择一张最能代表你父亲的，是哪一张？",
  },
  {
    key: "father_why",
    text: "请解释一下图片中哪些地方，哪些特点最能代表你的父亲。",
  },
  {
    key: "mother",
    text: "好的，下一个问题是，十张图片里，选择一张最能代表你母亲的，是哪一张？",
  },
  {
    key: "mother_why",
    text: "请解释一下原因。",
  },

  {
    key: "like",
    text: "好的，下一个问题是，十张图片里，你最喜欢哪一张？",
  },
  {
    key: "like_why",
    text: "为什么呢？",
  },
  {
    key: "dislike",
    text: "好的，下一个问题是，十张图片里，你最讨厌哪一张？",
  },
  {
    key: "dislike_why",
    text: "请解释一下原因",
  },
  {
    key: "mood",
    text: "测试到此就完全结束了，请问，测完之后，相比刚开始测试时，你现在心情如何？",
  },
]

/**
 * 判断问题是否为 why 类型的问题
 * @param {string} key - 问题的 key
 * @returns {boolean} 是否为 why 问题
 */
export function isWhyQuestion(key) {
  return key.endsWith("_why")
}

/**
 * 根据主问题的 key 查找对应的 why 问题
 * @param {string} mainKey - 主问题的 key（如 "represent"）
 * @returns {object|null} 对应的 why 问题对象，如果不存在则返回 null
 */
export function findWhyQuestion(mainKey) {
  const whyKey = `${mainKey}_why`
  return POST_TEST_QUESTIONS.find((q) => q.key === whyKey) || null
}

/**
 * 判断问题是否应该在页面上显示（过滤掉 why 问题）
 * @param {object} question - 问题对象
 * @returns {boolean} 是否应该显示
 */
export function shouldDisplayQuestion(question) {
  return !isWhyQuestion(question.key)
}

// 根据环境决定显示的介绍文本
const FULL_INTRO_TEXT = `1.现在我来介绍一下这个测试是如何进行的。在页面的左侧，您可以看到一张墨迹图片，它是一张样例图片，在正式测试过程中，我会依次给您展示好多张类似的墨迹图片，这些图片的绘制都是随机的，也都是抽象的，每个人从墨迹中看到的东西都各不一样。您要做的，就是通过语音告诉我，您在图中看到了什么，并且向我描述一下您所看到的东西，联想到的东西。不管看见什么，都可以自由地表述，没有什么标准答案可言。
2.在页面的墨迹图片下方，有多个控制按钮，分别可以控制图片放大、缩小、向左旋转、向右旋转图片，并且还可以利用画笔，圈出来您是从图片的哪些部分看出来您所看到的东西的。请注意，我是AI数字人，在测试过程中，需要您时常利用画笔来向我勾画您所看到的东西，这样我才能够看到您指示的图片位置。
3.接下来，请随我的指示，点击各个按钮。
4.如果您确认清楚了测试的流程，那就可以点击"进入"按钮，开始本次正式的心理测试。`
export const INTRO_TEXT = FULL_INTRO_TEXT

export function getEmptyBasicInfoDraft() {
  return {
    sex: "男",
    age: "",
    education: "",
    occupation: "",
    mood: "",
  }
}

export const state = {
  currentIndex: 0,
  totalImages: 10,
  zoom: 1,
  rotation: 0,
  drawing: false,
  tool: "none",
  color: "#ef4444", // 红色（默认）
  canvasStates: new Array(10).fill(null),
  isSpeaking: false,
  mediaRecorder: null,
  audioChunks: [],
  audioBlob: null,
  postTestAnswers: {},
  inactivityLevel: 0,
  nextButtonCooldown: 0,
  imageCooldowns: {}, // 保存每张图片的冷却时间（当离开时保存，返回时恢复）
  visitedImages: new Set(),
  stage: "intro",
  introStep: INTRO_STEPS.INFO_FORM,
  sessionId: null,
  sessionVersion: 0,
  completed: false,
  lastSnapshotReason: null,
  basicInfoDraft: getEmptyBasicInfoDraft(),
}

// 暴露给 window，保持与旧实现兼容
window.state = state

export const sessionState = {
  version: SESSION_VERSION,
  snapshotVersion: 0,
  sessionId: null,
  completed: false,
  lastTrigger: null,
  payload: null,
}

export const TTS = {
  speaker: "zh_female_vv_jupiter_bigtts",
  inited: false,
  currentMode: null,
  // 当前对话阶段：pretest（测试前）、intest1（第一张图）、intest2to10（第2-10张图）、posttest（测试后）
  currentPhase: null,
}

// TTS播报提示词模板（用于确保AI只朗读指定内容，不添加额外解释）
export const TTS_READ_ONLY_PROMPT =
  "请仅朗读以下文本内容，逐字逐句播报，不要添加任何前缀或后缀，也不要添加任何额外解释，保持原文的换行与停顿："

/**
 * 生成TTS播报查询文本
 * @param {string} text - 要播报的文本内容
 * @returns {string} 格式化后的TTS查询文本
 */
export function buildTTSQuery(text) {
  return `${TTS_READ_ONLY_PROMPT}\n${text}`
}
