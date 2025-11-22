
export const INTRO_STEPS = {
    INFO_FORM: 'info_form',
    INTRO_OVERLAY: 'intro_overlay',
    TEST: 'test'
};

export const INTRO_STEP_VALUES = Object.values(INTRO_STEPS);

export const CANVAS_BASE_TRANSFORM = 'translate(-50%, -50%)';

export const SESSION_VERSION = 1;
export const SESSION_SAVE_DEBOUNCE = 600;

export const INACTIVITY_THRESHOLD_1 = 10000;
export const INACTIVITY_THRESHOLD_2 = 20000;
export const NEXT_BUTTON_COOLDOWN = 1;

export const PROMPT_TEXTS = [
    '提示：请继续描述...',
    '您还能看到些什么吗？',
    '请详细描述一下您看到的内容',
    '除了这个，您还能看到什么？',
    '请继续分享您的观察',
    '您可以更详细地描述一下吗？'
];

export const FINAL_PROMPT_TEXT = '提示：请点击下一张图片继续...';

export const POST_TEST_QUESTIONS = [
    { key: 'represent', text: '十张图片里，选择一张最能代表你的。', audio: './audio/q_represent.wav' },
    { key: 'mother', text: '十张图片里，选择一张最能代表你母亲的。', audio: './audio/q_mother.wav' },
    { key: 'father', text: '十张图片里，选择一张最能代表你父亲的。', audio: './audio/q_father.wav' },
    { key: 'like', text: '十张图片里，你最喜欢哪一张？', audio: './audio/q_like.wav' },
    { key: 'dislike', text: '十张图片里，你最讨厌哪一张？', audio: './audio/q_dislike.wav' },
    { key: 'mood', text: '测试到此为止了，你现在心情如何？相比刚开始测试时？', audio: './audio/q_mood.wav' }
];

export const INTRO_TEXT = `罗夏墨迹是瑞士心理学家。发明的一种投射法心理测试方法。我会依次给你展示十张墨迹的图片，这些墨迹点的绘制都是随机的，也是抽象的，每个人看到的内容都不同。
你要做的就是告诉我，你从图片中看到了什么，并且描述一下你所看到的东西、联想到的东西。不管看见什么，都可以表述回答，没有什么正确、错误的回答。
你可以观察一下这个软件界面上的各种按钮，在测试的时候可以根据自己的需要进行调整观察图片的视角，比如放大、缩小、旋转图片，还可以在描述的时候使用画笔来勾画等等。总之，观看理解图片，不受任何限制。测试过程中，我不会询问你的隐私信息，所以安全性你可以放心。
`;

export function getEmptyBasicInfoDraft() {
    return {
        sex: '男',
        age: '',
        education: '',
        occupation: '',
        mood: ''
    };
}

export const state = {
    currentIndex: 0,
    totalImages: 10,
    zoom: 1,
    rotation: 0,
    drawing: false,
    tool: 'pen',
    color: 'red',
    canvasStates: new Array(10).fill(null),
    isSpeaking: false,
    mediaRecorder: null,
    audioChunks: [],
    audioBlob: null,
    postTestAnswers: {},
    inactivityLevel: 0,
    nextButtonCooldown: 0,
    visitedImages: new Set(),
    stage: 'intro',
    introStep: INTRO_STEPS.INFO_FORM,
    sessionId: null,
    sessionVersion: 0,
    completed: false,
    lastSnapshotReason: null,
    basicInfoDraft: getEmptyBasicInfoDraft()
};

// 暴露给 window，保持与旧实现兼容
window.state = state;

export const sessionState = {
    version: SESSION_VERSION,
    snapshotVersion: 0,
    sessionId: null,
    completed: false,
    lastTrigger: null,
    payload: null
};

export const TTS = {
    speaker: 'zh_female_vv_jupiter_bigtts',
    inited: false,
    currentMode: null
};

