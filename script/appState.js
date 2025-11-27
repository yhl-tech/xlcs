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

  // 图版初始提示语
  "好的，这是第一张墨迹图片，你可以看到一些什么？",  // 第一张的初始提示语
  "这张图片可以看到些什么？",  // 后面张图片的提示语，不要提示过多，把时间留给用户，当切换图片后，立即说出这句语音。

  // 下一个反应提示语
  "这张图片里，除了这个，您还能看到些什么吗？",  // 前 2 张图片里详细提示下一个目标
  "还能看到什么？",  // 后面图版直接提示
  
  // 无反应，切换图片提示语
  "如果这张图片实在看不到别的了，您可以自行决定切换下一张图片，点击右下方下一张按钮即可。", // 前 3 张可以这么提示。
  "如果看不到别的内容了，可以切换下一张图片",  // 后面图版简略提示。

  // 观察位置，画笔勾画提示语
  "是在图版的哪个位置看到的呢？您可以用画笔张图版上圈一下，并向我描述一下你所看到的东西",  // 前 2 张图版可以提示用户详细一些，解释图版位置区域
  "麻烦用画笔圈一下目标",  // 后面图版直接提示

  // 决定因素提示语
  "您感觉哪里像（看到的东西）呢？是形状像？颜色像？还是别的什么因素？",  // 前 2 张图版可以提示用户解释一下原因
  "从哪看出来的呢？",  // 后面的图版不需要这么细，直接告诉用户解释一下就可以了。
  
  // 追问描述提示语，捕获更多信息
  "可以具体描述一下吗？",  // 后面的图版，不需要过细的指导，直接提示用户即可。
  "请具体描述一下你所看到的这个东西",
  
  // 人 反应追问提示语
  "这个人（这两个人，这两只敬酒的猴子）给你一种什么感觉",  // 如果是描述的人，或者类人，拟人，大概率需要提问这个，询问情绪与人际关系
  
]

export const FINAL_PROMPT_TEXT = "提示：请点击下一张图片继续..."

export const POST_TEST_QUESTIONS = [
  {
    key: "represent",
    text: "好了，到此为止，十张墨迹图片就已经全部看完了，你现在可以看到所有的十张图片。还有几个问题需要你回答一下，第一个问题是，十张图片里，选择一张最能代表你自己的，最能代表你本人的，是哪一张？你可以鼠标点击图版按钮告诉我。",
    audio: "./audio/q_represent.wav",
  },
  {
    key: "represent_why",
    text: "请解释一下为什么，图片中哪些地方，哪些特点最能代表你自己。",
    audio: "./audio/q_represent_why.wav",
  },
  {
    key: "father",
    text: "好的，下一个问题是，十张图片里，选择一张最能代表你父亲的，是哪一张？请鼠标点击图版告诉我。",
    audio: "./audio/q_father.wav",
  },
  {
    key: "father_why",
    text: "请解释一下图片中哪些地方，哪些特点最能代表你的父亲。",
    audio: "./audio/q_father_why.wav",
  },
  {
    key: "mother",
    text: "好的，下一个问题是，十张图片里，选择一张最能代表你母亲的，是哪一张？鼠标点击一下图版。",
    audio: "./audio/q_mother.wav",
  },
  {
    key: "mother_why",
    text: "请解释一下原因。",
    audio: "./audio/q_mother_why.wav",
  },

  {
    key: "like",
    text: "好的，下一个问题是，十张图片里，你最喜欢哪一张？",
    audio: "./audio/q_like.wav",
  },
  {
    key: "like_why",
    text: "为什么呢？",
    audio: "./audio/q_like_why.wav",
  },
  {
    key: "dislike",
    text: "好的，下一个问题是，十张图片里，你最讨厌哪一张？",
    audio: "./audio/q_dislike.wav",
  },
  {
    key: "dislike_why",
    text: "请解释一下原因",
    audio: "./audio/q_dislike_why.wav",
  },

  {
    key: "mood",
    text: "测试到此就完全结束了，请问，测完之后，相比刚开始测试时，你现在心情如何？",
    audio: "./audio/q_mood.wav",
  },

  {
    key: "bye",
    text: "好的，再次感谢您的时间，你可以点击结束按钮，结束测试，测试报告的分析将会交给 AI 进行分析，为时大约1～2天，报告会以通知形式告知您。",
    audio: "./audio/q_bye.wav",
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
