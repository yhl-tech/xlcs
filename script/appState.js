export const INTRO_STEPS = {
  INFO_FORM: "info_form",
  INTRO_OVERLAY: "intro_overlay",
  TEST: "test",
}

export const INTRO_STEP_VALUES = Object.values(INTRO_STEPS)

export const CANVAS_BASE_TRANSFORM = "translate(-50%, -50%)"

export const SESSION_VERSION = 1
export const SESSION_SAVE_DEBOUNCE = 600

export const INACTIVITY_THRESHOLD_1 = 10000
export const INACTIVITY_THRESHOLD_2 = 20000
export const NEXT_BUTTON_COOLDOWN = 1 //冷却时间

export const PROMPT_TEXTS = [
  "提示：请继续描述...",
  "您还能看到些什么吗？",
  "请详细描述一下您看到的内容",
  "除了这个，您还能看到什么？",
  "请继续分享您的观察",
  "您可以更详细地描述一下吗？",
]

export const FINAL_PROMPT_TEXT = "提示：请点击下一张图片继续..."

export const POST_TEST_QUESTIONS = [
  {
    key: "represent",
    text: "十张图片里，选择一张最能代表你的。",
    audio: "./audio/q_represent.wav",
  },
  {
    key: "mother",
    text: "十张图片里，选择一张最能代表你母亲的。",
    audio: "./audio/q_mother.wav",
  },
  {
    key: "father",
    text: "十张图片里，选择一张最能代表你父亲的。",
    audio: "./audio/q_father.wav",
  },
  {
    key: "like",
    text: "十张图片里，你最喜欢哪一张？",
    audio: "./audio/q_like.wav",
  },
  {
    key: "dislike",
    text: "十张图片里，你最讨厌哪一张？",
    audio: "./audio/q_dislike.wav",
  },
  {
    key: "mood",
    text: "测试到此为止了，你现在心情如何？相比刚开始测试时？",
    audio: "./audio/q_mood.wav",
  },
]

export const INTRO_TEXT = `知己心探（InnerScan）是一种多模态测试方法，通过你的操作、反应、回答等数据融合计算出结果。现在开始测试，首先是操作反应测试。请先观察左边测试界面上的各种按钮，并根据我的提示进行操作。

1.请点击放大按钮（此时放大按钮上面有个一闪一闪的点击提示；检测到用户操作完成后，我会说“好的，操作完成”）。
2.请点击缩小按钮（同上）。
3.请点击左转按钮（同上）。
4.请点击右转按钮（同上）。
5.请点击绿色画笔，跟随图中的轨迹进行画画（同上）。
6.请点击擦除按钮（同上）。

现在开始第二项测试，测试时我会依次给你展示 10 张图片，你只需要告诉我在图片中看到了什么，并描述你看到的东西、联想到的东西。不管看见什么，都可以直接描述，没有正确与错误。在一张图片中你可能会看到多个物体和场景，描述得越详细越好。
测试过程中，你可以旋转调整图像画面，观察不同的角度，用画笔标记出你看到的物体或场景。`

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
  tool: "pen",
  color: "#ef4444", // 红色（默认）
  canvasStates: new Array(10).fill(null),
  isSpeaking: false,
  mediaRecorder: null,
  audioChunks: [],
  audioBlob: null,
  postTestAnswers: {},
  inactivityLevel: 0,
  nextButtonCooldown: 0,
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
