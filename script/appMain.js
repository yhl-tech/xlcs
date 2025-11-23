
import {
    INTRO_STEPS,
    INTRO_STEP_VALUES,
    PROMPT_TEXTS,
    FINAL_PROMPT_TEXT,
    POST_TEST_QUESTIONS,
    SESSION_VERSION,
    SESSION_SAVE_DEBOUNCE,
    INACTIVITY_THRESHOLD_1,
    INACTIVITY_THRESHOLD_2,
    NEXT_BUTTON_COOLDOWN,
    CANVAS_BASE_TRANSFORM,
    INTRO_TEXT,
    getEmptyBasicInfoDraft,
    state,
    sessionState,
    TTS,
    buildTTSQuery
} from './appState.js';

let sessionSaveTimer = null;
let pendingSessionSnapshot = null;
let sessionManagerReady = false;
const pageReloaded = (() => {
    try {
        const [navEntry] = window.performance?.getEntriesByType?.('navigation') || [];
        if (navEntry && navEntry.type) {
            return navEntry.type === 'reload';
        }
        if (window.performance && window.performance.navigation) {
            return window.performance.navigation.type === window.performance.navigation.TYPE_RELOAD;
        }
    } catch (error) {
        console.warn('[Session] 检测页面刷新状态失败:', error);
    }
    return false;
})();
let allowLoadingOverlay = pageReloaded;
let transientLoadingOverlayVisible = false;
let latestSnapshotVersion = 0;
let restoreSnapshotCache = null;
let restoringFromSnapshot = false;
let shouldPlayWelcomeMessage = true;
let welcomeMessageTimer = null;
let introResumeInProgress = false;
let inactivityTimer = null;
let inactivityActive = false;
let nextButtonCooldownTimer = null;  // "下一张"按钮冷却定时器


let currentQuestionIndex = 0;

if (window.dialogClient) {
    window.dialogClient.onDisconnect = () => {
        TTS.inited = false;
        TTS.currentMode = null;
    };
}

async function ensureTTSInit(mode = 'audio') {
    if (!window.dialogClient) {
        throw new Error('dialogClient 未加载');
    }

    // 修复：确保连接状态干净，避免文案过长导致的状态异常
    if (window.dialogClient.isConnected) {
        // 检查模式是否匹配
        if (TTS.inited && TTS.currentMode === mode) {
            return;
        }
        // 模式不匹配，需要重新初始化
        console.log('[TTS] 模式不匹配，重新初始化');
        window.dialogClient.disconnect();
        TTS.inited = false;
        TTS.currentMode = null;
        // 等待连接完全关闭
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 确保连接已完全关闭后再重新连接
    if (!window.dialogClient.isConnected) {
        console.log('[TTS] 建立新连接');
        await window.dialogClient.connect();
    }

    try {
        const initMsg = JSON.stringify({ type: 'init', speaker: TTS.speaker, mode });
        window.dialogClient.ws && window.dialogClient.ws.send(initMsg);
        TTS.inited = true;
        TTS.currentMode = mode;
        console.log('[TTS] 初始化完成，模式:', mode);
    } catch (e) {
        console.warn('发送 TTS 初始化失败：', e);
        // 即使初始化消息发送失败，也标记为已初始化以避免阻塞
        TTS.inited = true;
        TTS.currentMode = mode;
    }
}

async function sendTTSText(text, opts = { start: true, end: true, is_user_querying: false }) {
    if (!window.dialogClient) {
        throw new Error('dialogClient 未加载');
    }
    if (!window.dialogClient.isConnected) {
        await window.dialogClient.connect();
    }
    const msg = JSON.stringify({
        type: 'tts_text',
        start: Boolean(opts.start),
        end: Boolean(opts.end),
        is_user_querying: Boolean(opts.is_user_querying),
        content: String(text || '')
    });
    window.dialogClient.ws && window.dialogClient.ws.send(msg);
}

async function sendTextQuery(text, { ensure = true } = {}) {
    if (!window.dialogClient) {
        throw new Error('dialogClient 未加载');
    }

    // 修复：增强连接检查和重试机制
    if (ensure) {
        await ensureTTSInit('audio');
    } else if (!window.dialogClient.isConnected) {
        // 即使ensure=false，也要确保连接是活动的
        console.log('[sendTextQuery] 检测到连接断开，尝试重新连接');
        try {
            await window.dialogClient.connect();
        } catch (e) {
            console.warn('[sendTextQuery] 重新连接失败:', e);
            // 如果连接失败，尝试重新初始化
            await ensureTTSInit('audio');
        }
    }

    // 双重检查连接状态
    if (!window.dialogClient.isConnected || !window.dialogClient.ws || window.dialogClient.ws.readyState !== WebSocket.OPEN) {
        console.warn('[sendTextQuery] WebSocket连接异常，尝试修复');
        try {
            await window.dialogClient.connect();
        } catch (e) {
            throw new Error('无法建立WebSocket连接: ' + e.message);
        }
    }

    const msg = JSON.stringify({
        type: 'text_query',
        content: String(text || '')
    });

    // 添加发送前检查
    if (window.dialogClient.ws && window.dialogClient.ws.readyState === WebSocket.OPEN) {
        window.dialogClient.ws && window.dialogClient.ws.send(msg);
    } else {
        throw new Error('WebSocket连接不可用，无法发送消息');
    }
}

// DOM Elements
const infoScreen = document.getElementById('info-screen');
const appWindow = document.getElementById('app-window');
const mainContent = document.getElementById('main-content');
const startTestBtn = document.getElementById('start-test-btn');
const resumeTestBtn = document.getElementById('resume-test-btn');
const introOverlay = document.getElementById('intro-overlay');
const introText = document.getElementById('intro-text');
const enterBtn = document.getElementById('enter-btn');
const introPreviewImage = document.getElementById('intro-preview-image');
const previewCanvas = document.querySelector('.test-preview-canvas');
const previewCtx = previewCanvas ? previewCanvas.getContext('2d') : null;

// 预览窗口的独立状态管理（不记录到 interactionTracker）
const previewState = {
    zoom: 1,
    rotation: 0,
    tool: 'pen',
    color: '#ef4444', // red
    drawing: false,
    currentImageIndex: 0, // 预览窗口显示的图片索引（0-9）
    canvasStates: new Array(10).fill(null) // 每张图片的画布状态
};

// 预览图片错误处理函数
function handlePreviewImageError(img) {
    if (!img) return;
    // 隐藏图片，避免显示破裂图标
    img.style.display = 'none';
    // 或者可以设置一个透明的占位符
    // img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="100%25" height="100%25" fill="transparent"/%3E%3C/svg%3E';
}

// 为初始图片添加错误处理
if (introPreviewImage) {
    introPreviewImage.onerror = () => handlePreviewImageError(introPreviewImage);
}

// 预览窗口交互函数
function initPreviewCanvasInteractions() {
    if (!previewCanvas || !previewCtx) return;

    // 初始化画布尺寸 - 使用容器的尺寸而不是图片的尺寸
    const introPreviewImage = document.getElementById('intro-preview-image');
    const imageFrame = previewCanvas.closest('.test-preview-image-frame');
    
    const resizePreviewCanvas = () => {
        if (!previewCanvas || !imageFrame) return;
        // 获取容器的实际尺寸
        const rect = imageFrame.getBoundingClientRect();
        previewCanvas.width = rect.width || 400;
        previewCanvas.height = rect.height || 400;
    };
    
    if (introPreviewImage && previewCanvas && imageFrame) {
        // 添加错误处理
        introPreviewImage.onerror = () => handlePreviewImageError(introPreviewImage);
        
        // 初始化画布尺寸
        const initCanvasSize = () => {
            // 等待一帧确保布局完成
            requestAnimationFrame(() => {
                resizePreviewCanvas();
            });
        };
        
        if (introPreviewImage.complete) {
            initCanvasSize();
        } else {
            introPreviewImage.onload = initCanvasSize;
        }
        
        // 添加resize监听器
        const resizeObserver = new ResizeObserver(() => {
            resizePreviewCanvas();
        });
        resizeObserver.observe(imageFrame);
    }

    // 保存当前画布状态
    function savePreviewCanvasState() {
        if (previewCanvas) {
            previewState.canvasStates[previewState.currentImageIndex] = previewCanvas.toDataURL();
        }
    }

    // 恢复画布状态
    function restorePreviewCanvasState() {
        const savedState = previewState.canvasStates[previewState.currentImageIndex];
        if (savedState && previewCanvas) {
            const img = new Image();
            img.onload = () => {
                previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                previewCtx.drawImage(img, 0, 0);
            };
            img.src = savedState;
        } else {
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        }
    }

    // 应用变换到画布
    function applyPreviewTransform() {
        if (!previewCanvas) return;
        const frame = previewCanvas.closest('.test-preview-image-frame');
        if (frame) {
            frame.style.transform = `scale(${previewState.zoom}) rotate(${previewState.rotation}deg)`;
        }
    }

    // 切换图片
    function switchPreviewImage(direction) {
        savePreviewCanvasState();
        if (direction === 'next') {
            if (previewState.currentImageIndex < 9) {
                previewState.currentImageIndex++;
            }
        } else {
            if (previewState.currentImageIndex > 0) {
                previewState.currentImageIndex--;
            }
        }
        // 更新图片
        const introPreviewImage = document.getElementById('intro-preview-image');
        if (introPreviewImage) {
            // 添加错误处理
            introPreviewImage.onerror = () => handlePreviewImageError(introPreviewImage);
            // 确保图片可见（如果之前因为错误被隐藏了）
            introPreviewImage.style.display = '';
            introPreviewImage.src = `./images/rorschach-blot-${previewState.currentImageIndex + 1}.webp`;
        }
        // 重置画布尺寸并恢复状态
        if (introPreviewImage && previewCanvas) {
            const imageFrame = previewCanvas.closest('.test-preview-image-frame');
            introPreviewImage.onload = () => {
                // 使用容器的尺寸而不是图片的尺寸
                if (imageFrame) {
                    requestAnimationFrame(() => {
                        const rect = imageFrame.getBoundingClientRect();
                        previewCanvas.width = rect.width || 400;
                        previewCanvas.height = rect.height || 400;
                        restorePreviewCanvasState();
                        applyPreviewTransform();
                    });
                } else {
                    restorePreviewCanvasState();
                    applyPreviewTransform();
                }
            };
        } else {
            restorePreviewCanvasState();
            applyPreviewTransform();
        }
    }

    // 缩放
    function zoomPreview(direction) {
        if (direction === 'in') {
            previewState.zoom = Math.min(previewState.zoom + 0.1, 3);
        } else {
            previewState.zoom = Math.max(previewState.zoom - 0.1, 0.5);
        }
        applyPreviewTransform();
    }

    // 旋转
    function rotatePreview(direction) {
        if (direction === 'left') {
            previewState.rotation -= 90;
        } else {
            previewState.rotation += 90;
        }
        applyPreviewTransform();
    }

    // 切换工具
    function setPreviewTool(tool) {
        previewState.tool = tool;
        const penBtn = document.querySelector('[data-action="pen"]');
        const eraseBtn = document.querySelector('[data-action="erase"]');
        if (penBtn) penBtn.classList.toggle('selected', tool === 'pen');
        if (eraseBtn) eraseBtn.classList.toggle('selected', tool === 'erase');
    }

    // 清除画布
    function clearPreviewCanvas() {
        if (previewCtx && previewCanvas) {
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            savePreviewCanvasState();
        }
    }

    // 暴露函数供按钮使用
    window.previewActions = {
        prev: () => switchPreviewImage('prev'),
        next: () => switchPreviewImage('next'),
        zoomIn: () => zoomPreview('in'),
        zoomOut: () => zoomPreview('out'),
        rotateLeft: () => rotatePreview('left'),
        rotateRight: () => rotatePreview('right'),
        pen: () => setPreviewTool('pen'),
        erase: () => setPreviewTool('erase'),
        clear: clearPreviewCanvas
    };

    // 绘制函数
    function drawPreview(e) {
        if (!previewState.drawing) return;
        const rect = previewCanvas.getBoundingClientRect();
        // 考虑缩放和旋转，将屏幕坐标转换为画布坐标
        const scale = previewState.zoom;
        const rotation = previewState.rotation * Math.PI / 180;
        let x = (e.clientX || e.touches[0].clientX) - rect.left;
        let y = (e.clientY || e.touches[0].clientY) - rect.top;
        
        // 转换为相对于画布中心的坐标
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        x = (x - centerX) / scale;
        y = (y - centerY) / scale;
        
        // 反向旋转
        const cos = Math.cos(-rotation);
        const sin = Math.sin(-rotation);
        const rotatedX = x * cos - y * sin;
        const rotatedY = x * sin + y * cos;
        
        // 转换回画布坐标
        x = rotatedX + previewCanvas.width / 2;
        y = rotatedY + previewCanvas.height / 2;

        previewCtx.lineWidth = previewState.tool === 'erase' ? 20 : 3;
        previewCtx.lineCap = 'round';
        
        if (previewState.tool === 'erase') {
            previewCtx.globalCompositeOperation = 'destination-out';
        } else {
            previewCtx.globalCompositeOperation = 'source-over';
            previewCtx.strokeStyle = previewState.color;
        }
        
        previewCtx.lineTo(x, y);
        previewCtx.stroke();
        previewCtx.beginPath();
        previewCtx.moveTo(x, y);
    }

    // 鼠标/触摸事件
    previewCanvas.addEventListener('mousedown', (e) => {
        previewState.drawing = true;
        const rect = previewCanvas.getBoundingClientRect();
        const scale = previewState.zoom;
        const rotation = previewState.rotation * Math.PI / 180;
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        x = (x - centerX) / scale;
        y = (y - centerY) / scale;
        
        const cos = Math.cos(-rotation);
        const sin = Math.sin(-rotation);
        const rotatedX = x * cos - y * sin;
        const rotatedY = x * sin + y * cos;
        
        x = rotatedX + previewCanvas.width / 2;
        y = rotatedY + previewCanvas.height / 2;
        
        previewCtx.beginPath();
        previewCtx.moveTo(x, y);
    });

    previewCanvas.addEventListener('mousemove', drawPreview);
    previewCanvas.addEventListener('mouseup', () => {
        if (previewState.drawing) {
            previewState.drawing = false;
            savePreviewCanvasState();
        }
    });

    previewCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        previewState.drawing = true;
        const rect = previewCanvas.getBoundingClientRect();
        const scale = previewState.zoom;
        const rotation = previewState.rotation * Math.PI / 180;
        let x = e.touches[0].clientX - rect.left;
        let y = e.touches[0].clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        x = (x - centerX) / scale;
        y = (y - centerY) / scale;
        
        const cos = Math.cos(-rotation);
        const sin = Math.sin(-rotation);
        const rotatedX = x * cos - y * sin;
        const rotatedY = x * sin + y * cos;
        
        x = rotatedX + previewCanvas.width / 2;
        y = rotatedY + previewCanvas.height / 2;
        
        previewCtx.beginPath();
        previewCtx.moveTo(x, y);
    });

    previewCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        drawPreview(e);
    });

    previewCanvas.addEventListener('touchend', () => {
        if (previewState.drawing) {
            previewState.drawing = false;
            savePreviewCanvasState();
        }
    });
}

const audioPlayer = document.getElementById('audio-player');
const controlsBar = document.getElementById('controls-bar');
const rorschachImage = document.getElementById('rorschach-image');
const canvas = document.getElementById('drawing-canvas');
const imagePlaceholder = document.getElementById('image-placeholder');
const imagePlaceholderText = document.getElementById('image-placeholder-text');
const postTestView = document.getElementById('post-test-view');
const summaryView = document.getElementById('summary-view');
const questionText = document.getElementById('question-text');
const finishBtn = document.getElementById('finish-btn');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');
const progressText = document.getElementById('progress-text');
const ctx = canvas.getContext('2d');
const BASIC_INFO_FIELDS = ['sex', 'age', 'education', 'occupation', 'mood'];
const BASIC_INFO_LABELS = Object.freeze({
    sex: '性别',
    age: '年龄',
    education: '学历',
    occupation: '职业',
    mood: '当前心情'
});
const VALID_SEX_OPTIONS = Object.freeze(['男', '女']);
const basicInfoErrorElements = BASIC_INFO_FIELDS.reduce((acc, field) => {
    acc[field] = document.getElementById(`${field}-error`);
    return acc;
}, {});
canvas.style.transform = CANVAS_BASE_TRANSFORM;

function getBasicInfoInputMap() {
    return BASIC_INFO_FIELDS.reduce((acc, field) => {
        acc[field] = document.getElementById(field);
        return acc;
    }, {});
}

function applyBasicInfoDraftToInputs(draft = state.basicInfoDraft) {
    const inputs = getBasicInfoInputMap();
    BASIC_INFO_FIELDS.forEach(field => {
        if (inputs[field]) {
            inputs[field].value = draft?.[field] ?? '';
        }
    });
}

function syncBasicInfoDraftFromInputs() {
    const inputs = getBasicInfoInputMap();
    const nextDraft = getEmptyBasicInfoDraft();
    BASIC_INFO_FIELDS.forEach(field => {
        if (inputs[field]) {
            const rawValue = typeof inputs[field].value === 'string' ? inputs[field].value : '';
            nextDraft[field] = rawValue.trim();
        }
    });
    state.basicInfoDraft = nextDraft;
    return nextDraft;
}

function setupBasicInfoDraftListeners() {
    const inputs = getBasicInfoInputMap();
    BASIC_INFO_FIELDS.forEach(field => {
        const input = inputs[field];
        if (!input) {
            return;
        }
        input.addEventListener('input', () => {
            const rawValue = typeof input.value === 'string' ? input.value : '';
            state.basicInfoDraft[field] = rawValue.trim();
            clearInputValidationState(input);
            saveSessionSnapshot('basic_info');
        });
    });
}

function getFieldErrorElement(field) {
    if (!field) {
        return null;
    }
    if (!basicInfoErrorElements[field]) {
        basicInfoErrorElements[field] = document.getElementById(`${field}-error`);
    }
    return basicInfoErrorElements[field];
}

function setFieldErrorMessage(field, message = '') {
    const errorElement = getFieldErrorElement(field);
    if (!errorElement) {
        return;
    }
    errorElement.textContent = message;
    if (message) {
        errorElement.classList.add('visible');
    } else {
        errorElement.classList.remove('visible');
    }
}

function clearFieldErrorMessage(field) {
    setFieldErrorMessage(field, '');
}

function clearInputValidationState(input, fieldId = input?.id) {
    if (input) {
        input.classList.remove('input-invalid');
        input.removeAttribute('aria-invalid');
    }
    if (fieldId) {
        clearFieldErrorMessage(fieldId);
    }
}

function clearBasicInfoValidationState() {
    BASIC_INFO_FIELDS.forEach(field => {
        const input = document.getElementById(field);
        clearInputValidationState(input, field);
    });
}

function markFieldInvalid(input, message, errors) {
    const fieldId = input?.id;
    if (input) {
        input.classList.add('input-invalid');
        input.setAttribute('aria-invalid', 'true');
    }
    if (fieldId) {
        if (message) {
            setFieldErrorMessage(fieldId, message);
        } else {
            clearFieldErrorMessage(fieldId);
        }
    }
    if (message) {
        errors.push(message);
    }
}

function validateBasicInfoForm() {
    const inputs = getBasicInfoInputMap();
    const errors = [];
    const sanitizedValues = {};
    clearBasicInfoValidationState();

    const sexInput = inputs.sex;
    const sexValue = (sexInput?.value || '').trim();
    if (!sexValue || !VALID_SEX_OPTIONS.includes(sexValue)) {
        markFieldInvalid(sexInput, `${BASIC_INFO_LABELS.sex}为必填项`, errors);
    } else {
        sanitizedValues.sex = sexValue;
    }

    const ageInput = inputs.age;
    const ageValue = (ageInput?.value || '').trim();
    const hasInvalidNumberInput = ageInput && ageInput.validity.badInput;
    
    if (hasInvalidNumberInput || (ageValue && !/^-?\d+$/.test(ageValue))) {
        markFieldInvalid(ageInput, `${BASIC_INFO_LABELS.age}只能填写数字`, errors);
    } else if (!ageValue) {
        markFieldInvalid(ageInput, `${BASIC_INFO_LABELS.age}为必填项`, errors);
    } else if (Number(ageValue) < 0) {
        markFieldInvalid(ageInput, `${BASIC_INFO_LABELS.age}不能小于 0`, errors);
    } else {
        sanitizedValues.age = ageValue;
    }

    ['education', 'occupation', 'mood'].forEach(field => {
        const input = inputs[field];
        const value = (input?.value || '').trim();
        if (!value) {
            markFieldInvalid(input, `${BASIC_INFO_LABELS[field]}为必填项`, errors);
        } else {
            sanitizedValues[field] = value;
        }
    });

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    return { valid: true, values: sanitizedValues };
}

function ensureSessionId() {
    if (!state.sessionId) {
        const restoredSessionId = window.SessionManager && typeof window.SessionManager.getSessionId === 'function'
            ? window.SessionManager.getSessionId()
            : null;
        if (restoredSessionId) {
            state.sessionId = restoredSessionId;
        } else {
            const randomPart = Math.random().toString(36).slice(2, 8);
            state.sessionId = `sess_${Date.now().toString(36)}_${randomPart}`;
        }
        sessionState.sessionId = state.sessionId;
    }
    if (window.SessionManager && typeof window.SessionManager.setSessionId === 'function' && state.sessionId) {
        window.SessionManager.setSessionId(state.sessionId);
    }
    return state.sessionId;
}

function configureSessionPersistence() {
    if (!window.SessionManager || typeof window.SessionManager.configure !== 'function') {
        return;
    }
    try {
        window.SessionManager.configure({
            getUserId: () => {
                try {
                    const userInfo = window.auth?.getUserInfo?.();
                    return userInfo?.userId || userInfo?.username || null;
                } catch (error) {
                    console.warn('[Session] 获取用户信息失败:', error);
                    return null;
                }
            },
            getSessionId: () => state.sessionId || sessionState.sessionId
        });
        sessionManagerReady = window.SessionManager.isReady();
        if (sessionManagerReady && state.sessionId) {
            window.SessionManager.setSessionId(state.sessionId);
        }
    } catch (error) {
        console.warn('[Session] SessionManager 配置失败:', error);
    }
}

function showImagePlaceholder(message = '正在加载图版，请稍候...', options = {}) {
    if (!imagePlaceholder) {
        return;
    }
    const { force = false } = options;
    if (!force && !allowLoadingOverlay) {
        imagePlaceholder.classList.add('hidden');
        return;
    }
    if (message && imagePlaceholderText) {
        imagePlaceholderText.textContent = message;
    }
    imagePlaceholder.classList.remove('hidden');
    if (!force) {
        transientLoadingOverlayVisible = true;
    }
}

function hideImagePlaceholder(options = {}) {
    if (!imagePlaceholder) {
        return;
    }
    imagePlaceholder.classList.add('hidden');
    if (transientLoadingOverlayVisible || options.disableFuture === true) {
        allowLoadingOverlay = false;
        transientLoadingOverlayVisible = false;
    }
}

function buildSessionSnapshot(reason = 'manual') {
    if (!sessionManagerReady || !window.SessionManager) {
        return null;
    }
    ensureSessionId();
    const trackerSnapshot = window.InteractionTracker && typeof window.InteractionTracker.serialize === 'function'
        ? window.InteractionTracker.serialize()
        : null;

    const payload = {
        currentIndex: state.currentIndex,
        totalImages: state.totalImages,
        zoom: state.zoom,
        rotation: state.rotation,
        canvasStates: state.canvasStates,
        visitedImages: Array.from(state.visitedImages || []),
        postTestAnswers: state.postTestAnswers,
        stage: state.stage,
        introStep: state.introStep,
        basicInfoDraft: { ...state.basicInfoDraft },
        currentQuestionIndex,
        inactivityLevel: state.inactivityLevel,
        nextButtonCooldown: state.nextButtonCooldown,
        isSpeaking: state.isSpeaking,
        sessionVersion: latestSnapshotVersion + 1,
        timestamp: Date.now(),
        tracker: trackerSnapshot,
        tts: {
            inited: TTS.inited,
            currentMode: TTS.currentMode
        },
        audio: {
            hasMediaRecorder: Boolean(state.mediaRecorder),
            recorderState: state.mediaRecorder ? state.mediaRecorder.state : 'inactive',
            hasAudioBlob: Boolean(state.audioBlob)
        },
        ui: {
            controlsVisible: controlsBar.style.display !== 'none',
            postViewVisible: postTestView.style.display !== 'none',
            summaryVisible: summaryView.style.display !== 'none',
            progressText: progressText.textContent,
            preTest: {
                infoScreenVisible: infoScreen.style.display !== 'none',
                appWindowVisible: appWindow.style.display !== 'none',
                introOverlayVisible: introOverlay.style.display !== 'none',
                enterButton: enterBtn ? {
                    visible: enterBtn.style.display !== 'none',
                    disabled: enterBtn.disabled,
                    text: enterBtn.textContent
                } : null
            }
        }
    };

    sessionState.payload = payload;
    sessionState.version = SESSION_VERSION;
    sessionState.sessionId = state.sessionId;
    sessionState.completed = Boolean(state.completed);
    sessionState.lastTrigger = reason;
    sessionState.snapshotVersion = latestSnapshotVersion + 1;
    sessionState.updatedAt = Date.now();

    return JSON.parse(JSON.stringify(sessionState));
}

function flushPendingSessionSnapshot(force = false) {
    if (!pendingSessionSnapshot || !sessionManagerReady || !window.SessionManager) {
        return;
    }

    if (!force) {
        try {
            const latestStored = window.SessionManager.loadSnapshot();
            if (latestStored && latestStored.snapshotVersion > latestSnapshotVersion) {
                latestSnapshotVersion = latestStored.snapshotVersion;
                state.sessionVersion = latestSnapshotVersion;
            }
        } catch (error) {
            console.warn('[Session] 读取最新快照失败:', error);
        }
    }

    if (!force && pendingSessionSnapshot.snapshotVersion <= latestSnapshotVersion) {
        pendingSessionSnapshot = null;
        return;
    }

    const saved = window.SessionManager.saveSnapshot(pendingSessionSnapshot);
    if (saved) {
        latestSnapshotVersion = pendingSessionSnapshot.snapshotVersion;
        state.sessionVersion = latestSnapshotVersion;
    }
    pendingSessionSnapshot = null;
}

function scheduleSessionSave(reason = 'manual', immediate = false) {
    if (!sessionManagerReady || !window.SessionManager) {
        return;
    }
    const snapshot = buildSessionSnapshot(reason);
    if (!snapshot) {
        return;
    }
    pendingSessionSnapshot = snapshot;

    if (immediate) {
        flushPendingSessionSnapshot(true);
        return;
    }

    clearTimeout(sessionSaveTimer);
    sessionSaveTimer = setTimeout(() => {
        flushPendingSessionSnapshot();
    }, SESSION_SAVE_DEBOUNCE);
}

function saveSessionSnapshot(reason = 'manual', options = {}) {
    const { immediate = false } = options || {};
    state.lastSnapshotReason = reason;
    scheduleSessionSave(reason, immediate);
}

function loadSessionSnapshot(options = {}) {
    const { snapshot = null, applyState = false } = options || {};
    const targetSnapshot = snapshot || getStoredSnapshot();
    if (!canRestoreSnapshot(targetSnapshot)) {
        return null;
    }
    if (applyState) {
        return applySnapshotToState(targetSnapshot) ? targetSnapshot : null;
    }
    return targetSnapshot;
}

function getStoredSnapshot() {
    if (!sessionManagerReady || !window.SessionManager) {
        return null;
    }
    try {
        return window.SessionManager.loadSnapshot();
    } catch (error) {
        console.warn('[Session] 读取快照失败:', error);
        return null;
    }
}

function canRestoreSnapshot(snapshot) {
    if (!snapshot || snapshot.completed) {
        return false;
    }
    if (snapshot.version && snapshot.version !== SESSION_VERSION) {
        console.warn('[Session] 快照版本不匹配，忽略恢复');
        return false;
    }
    return Boolean(snapshot.payload);
}

function applySnapshotToState(snapshot) {
    if (!canRestoreSnapshot(snapshot)) {
        return false;
    }
    const payload = snapshot.payload || {};
    latestSnapshotVersion = snapshot.snapshotVersion || latestSnapshotVersion;

    state.sessionId = snapshot.sessionId || state.sessionId;
    sessionState.sessionId = state.sessionId;
    if (window.SessionManager && typeof window.SessionManager.setSessionId === 'function' && state.sessionId) {
        window.SessionManager.setSessionId(state.sessionId);
    }

    state.currentIndex = payload.currentIndex ?? 0;
    state.zoom = payload.zoom ?? 1;
    state.rotation = payload.rotation ?? 0;
    state.canvasStates = Array.isArray(payload.canvasStates) && payload.canvasStates.length === state.totalImages
        ? payload.canvasStates
        : new Array(state.totalImages).fill(null);
    state.visitedImages = new Set(Array.isArray(payload.visitedImages) ? payload.visitedImages : []);
    state.visitedImages.add(state.currentIndex);
    state.postTestAnswers = payload.postTestAnswers || {};
    const restoredIntroStep = payload.introStep;
    if (restoredIntroStep && INTRO_STEP_VALUES.includes(restoredIntroStep)) {
        state.introStep = restoredIntroStep;
    } else {
        state.introStep = INTRO_STEPS.INFO_FORM;
    }
    state.basicInfoDraft = {
        ...getEmptyBasicInfoDraft(),
        ...(payload.basicInfoDraft || {})
    };
    applyBasicInfoDraftToInputs();
    state.stage = payload.stage || 'test';
    currentQuestionIndex = payload.currentQuestionIndex ?? payload.questionIndex ?? 0;
    state.inactivityLevel = payload.inactivityLevel || 0;
    state.nextButtonCooldown = payload.nextButtonCooldown || 0;
    state.isSpeaking = Boolean(payload.isSpeaking);
    state.sessionVersion = latestSnapshotVersion;
    state.completed = Boolean(snapshot.completed);

    return true;
}

function disableWelcomeMessagePlayback() {
    shouldPlayWelcomeMessage = false;
    if (welcomeMessageTimer) {
        clearTimeout(welcomeMessageTimer);
        welcomeMessageTimer = null;
    }
    stopAllPlayback();
}

function showResumeOptionIfAvailable(autoResume = false) {
    const snapshot = loadSessionSnapshot();
    if (!resumeTestBtn) {
        applyBasicInfoDraftToInputs();
        return;
    }
    if (!snapshot) {
        resumeTestBtn.style.display = 'none';
        resumeTestBtn.disabled = false;
        applyBasicInfoDraftToInputs();
        return;
    }

    restoreSnapshotCache = snapshot;
    const payload = snapshot.payload || {};
    const restoredIntroStep = INTRO_STEP_VALUES.includes(payload.introStep)
        ? payload.introStep
        : INTRO_STEPS.INFO_FORM;
    state.introStep = restoredIntroStep;

    state.basicInfoDraft = {
        ...getEmptyBasicInfoDraft(),
        ...(payload.basicInfoDraft || {})
    };
    applyBasicInfoDraftToInputs();

    const restoredStage = payload.stage || 'intro';

    if (restoredStage === 'intro' && restoredIntroStep !== INTRO_STEPS.TEST) {
        if (restoredIntroStep === INTRO_STEPS.INTRO_OVERLAY) {
            resumeTestBtn.style.display = 'block';
            resumeTestBtn.disabled = false;
            resumeTestBtn.textContent = '继续语音引导';

            if (autoResume && !restoringFromSnapshot && !introResumeInProgress) {
                disableWelcomeMessagePlayback();
                resumeTestBtn.disabled = true;
                resumeTestBtn.textContent = '恢复中...';
                resumeTestFromSnapshot(snapshot);
            }
        } else {
            resumeTestBtn.style.display = 'none';
            resumeTestBtn.disabled = false;
        }
        return;
    }

    resumeTestBtn.style.display = 'block';
    resumeTestBtn.disabled = false;
    resumeTestBtn.textContent = '恢复未完成测试';

    if (autoResume && !restoringFromSnapshot) {
        disableWelcomeMessagePlayback();
        resumeTestBtn.disabled = true;
        resumeTestBtn.textContent = '恢复中...';
        resumeTestFromSnapshot(snapshot);
    }
}

async function resumeTestFromSnapshot(snapshot = null) {
    if (restoringFromSnapshot || introResumeInProgress) {
        return;
    }
    disableWelcomeMessagePlayback();
    const targetSnapshot = loadSessionSnapshot({
        snapshot: snapshot || restoreSnapshotCache,
        applyState: true
    });
    if (!targetSnapshot) {
        console.warn('[Session] 没有可恢复的快照');
        return;
    }
    restoreSnapshotCache = targetSnapshot;

    const payload = targetSnapshot.payload || {};
    const restoredStage = payload.stage || state.stage || 'intro';
    const restoredIntroStep = INTRO_STEP_VALUES.includes(payload.introStep)
        ? payload.introStep
        : state.introStep || INTRO_STEPS.INFO_FORM;

    if (restoredStage === 'intro' && restoredIntroStep !== INTRO_STEPS.TEST) {
        if (restoredIntroStep === INTRO_STEPS.INTRO_OVERLAY) {
            await resumeIntroExperienceFromSnapshot(targetSnapshot);
        } else {
            if (resumeTestBtn) {
                resumeTestBtn.style.display = 'none';
                resumeTestBtn.disabled = false;
                resumeTestBtn.textContent = '恢复未完成测试';
            }
            infoScreen.style.display = 'flex';
            appWindow.style.display = 'none';
        }
        return;
    }

    try {
        restoringFromSnapshot = true;
        if (pageReloaded) {
            showImagePlaceholder('正在恢复上一张图版，请稍候...', { force: true });
        }
        infoScreen.style.display = 'none';
        appWindow.style.display = 'flex';
        hideWelcomeText();
        introOverlay.style.display = 'none';
        enterBtn.style.display = 'none';

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        initAudio(stream);

        await enterTestExperience({
            skipOpeningSpeech: true,
            restoredSnapshot: targetSnapshot
        });

        resumeTestBtn.style.display = 'none';
        saveSessionSnapshot('resume', { immediate: true });
    } catch (error) {
        console.error('[Session] 恢复测试失败:', error);
        if (resumeTestBtn) {
            resumeTestBtn.disabled = false;
            resumeTestBtn.textContent = '恢复未完成测试';
        }
        alert('恢复测试失败，请重新开始。');
    } finally {
        restoringFromSnapshot = false;
    }
}

async function resumeIntroExperienceFromSnapshot(snapshot) {
    if (introResumeInProgress) {
        return;
    }
    introResumeInProgress = true;
    try {
        if (resumeTestBtn) {
            resumeTestBtn.disabled = true;
        }
        await prepareIntroExperience({ resume: true });
        if (resumeTestBtn) {
            resumeTestBtn.style.display = 'none';
        }
        saveSessionSnapshot('intro_resume', { immediate: true });
    } catch (error) {
        console.error('[Session] 恢复语音引导失败:', error);
        alert('恢复语音引导失败，请重新开始。');
        if (resumeTestBtn) {
            resumeTestBtn.disabled = false;
            resumeTestBtn.textContent = '继续语音引导';
        }
    } finally {
        introResumeInProgress = false;
    }
}

// 启动测试
async function startTest() {
    const validation = validateBasicInfoForm();
    if (!validation.valid) {
        return;
    }
    fetchUserInfo(validation.values);
    try {
        await prepareIntroExperience();
    } catch (err) {
        console.error("麦克风授权失败:", err);
        alert("需要麦克风权限才能开始测试。请刷新页面并允许访问。");
    }
}

async function prepareIntroExperience({ resume = false } = {}) {
    disableWelcomeMessagePlayback();
    stopAllPlayback();
    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        initAudio(stream);
    } catch (err) {
        console.error("麦克风授权失败:", err);
        throw err;
    }

    infoScreen.style.display = 'none';
    appWindow.style.display = 'flex';
    appWindow.classList.add('intro-mode');
    hideWelcomeText();
    // 格式化文字为段落，添加样式
    const formattedText = INTRO_TEXT
        .split(/\n+/)
        .filter(line => line.trim())
        .map(line => `<p>${line.trim()}</p>`)
        .join('');
    introText.innerHTML = formattedText;
    introOverlay.style.display = 'flex';
    enterBtn.style.display = 'block';
    enterBtn.disabled = true;
    enterBtn.textContent = '语音播报中...';
    showIntroImage();

    state.introStep = INTRO_STEPS.INTRO_OVERLAY;
    saveSessionSnapshot('intro_step', { immediate: true });

    try {
        // 关键修复：先主动断开连接，利用用户点击"开始测试"的交互时机
        if (window.dialogClient && window.dialogClient.isConnected) {
            console.log('[介绍页] 主动断开现有连接，准备重新连接');
            window.dialogClient.disconnect();
            // 等待连接完全关闭
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // 重新连接并初始化（此时仍在用户交互上下文中）
        await ensureTTSInit('audio');
        
        // 关键修复：在发送消息前，确保 audioContext 已创建并恢复
        // 此时仍在用户点击"开始测试"的交互上下文中
        if (window.dialogClient) {
            // 如果 audioContext 不存在，提前创建它（使用与 playQueue 相同的配置）
            if (!window.dialogClient.audioContext) {
                const sampleRate = window.dialogClient.config?.outputAudio?.sampleRate || 24000;
                window.dialogClient.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                    sampleRate: sampleRate
                });
                window.dialogClient.nextPlayTime = window.dialogClient.audioContext.currentTime;
                console.log('[介绍页] 提前创建音频上下文，采样率:', sampleRate);
            }
            
            // 如果 audioContext 处于 suspended 状态，立即恢复（利用用户交互时机）
            if (window.dialogClient.audioContext.state === 'suspended') {
                try {
                    await window.dialogClient.audioContext.resume();
                    console.log('[介绍页] 音频上下文已恢复，状态:', window.dialogClient.audioContext.state);
                } catch (e) {
                    console.warn('[介绍页] AudioContext resume 失败:', e);
                }
            } else {
                console.log('[介绍页] 音频上下文状态:', window.dialogClient.audioContext.state);
            }
        }
        
        // 开始播报时，更新按钮文字为"语音播报中..."
        enterBtn.textContent = '语音播报中...';
        const introQuery = buildTTSQuery(INTRO_TEXT);
        // 使用 ensure: true 确保连接正确初始化
        await sendTextQuery(introQuery, { ensure: true });
        
        // 发送消息后，再次检查并恢复音频上下文（防止在发送过程中状态变化）
        // 使用 setTimeout 确保在音频数据开始到达时检查
        setTimeout(async () => {
            if (window.dialogClient && window.dialogClient.audioContext) {
                if (window.dialogClient.audioContext.state === 'suspended') {
                    try {
                        await window.dialogClient.audioContext.resume();
                        console.log('[介绍页] 音频上下文已恢复（延迟检查）');
                    } catch (e) {
                        console.warn('[介绍页] AudioContext resume 失败（延迟检查）:', e);
                    }
                }
            }
        }, 300);
    } catch (e) {
        console.warn('[启动页介绍] 播报失败，已忽略：', e);
        enterBtn.disabled = false;
        enterBtn.textContent = '进入';
    }
    
    const estimatedIntroDuration = Math.min(65000, Math.max(3000, Math.floor(INTRO_TEXT.length * 215)));

    setTimeout(() => {
        enterBtn.disabled = false;
        enterBtn.textContent = '进入';
    }, estimatedIntroDuration);

    enterBtn.onclick = () => enterTestExperience();

    // 初始化预览窗口交互
    initPreviewCanvasInteractions();
    
    // 启用预览窗口控制按钮并添加事件监听
    const previewControlButtons = document.querySelectorAll('.test-preview-controls button');
    previewControlButtons.forEach(btn => {
        btn.disabled = false;
        const action = btn.getAttribute('data-action');
        if (action && window.previewActions) {
            btn.addEventListener('click', () => {
                switch(action) {
                    case 'prev':
                        window.previewActions.prev();
                        break;
                    case 'next':
                        window.previewActions.next();
                        break;
                    case 'zoom-in':
                        window.previewActions.zoomIn();
                        break;
                    case 'zoom-out':
                        window.previewActions.zoomOut();
                        break;
                    case 'rotate-left':
                        window.previewActions.rotateLeft();
                        break;
                    case 'rotate-right':
                        window.previewActions.rotateRight();
                        break;
                    case 'pen':
                        window.previewActions.pen();
                        break;
                    case 'erase':
                        window.previewActions.erase();
                        break;
                    case 'clear':
                        window.previewActions.clear();
                        break;
                }
            });
        }
    });

    // 颜色选择器
    const colorOptions = document.querySelectorAll('.color-selector .color-option');
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            const color = option.getAttribute('data-color');
            const colorMap = {
                red: '#ef4444',
                green: '#10b981',
                blue: '#3b82f6'
            };
            if (previewState && colorMap[color]) {
                previewState.color = colorMap[color];
            }
        });
    });
}

async function enterTestExperience({ skipOpeningSpeech = false, restoredSnapshot = null } = {}) {
    try {
        if (enterBtn) {
            enterBtn.disabled = true;
            enterBtn.textContent = skipOpeningSpeech ? '恢复中...' : '连接中...';
        }

        if (window.AudioRecorder) {
            window.AudioRecorder.start();
            console.log('[测试] 音频录制器已启动');
        }

        if (window.dialogClient) {
            window.dialogClient.disconnect();
            await new Promise(resolve => setTimeout(resolve, 100));

            let retryCount = 0;
            const maxRetries = 3;
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            while (retryCount < maxRetries) {
                try {
                    await ensureTTSInit('audio');
                    break;
                } catch (error) {
                    retryCount++;
                    console.warn(`[连接重试] 第 ${retryCount}/${maxRetries} 次尝试失败:`, error);
                    if (retryCount >= maxRetries) {
                        throw error;
                    }
                    const retryDelay = isMobile ? 2000 : 1000;
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }

            if (window.dialogClient.ws) {
                try { window.dialogClient.ws.binaryType = 'arraybuffer'; } catch (e) { console.warn('binaryType 设置失败:', e); }
            }
            if (window.dialogClient.audioContext && window.dialogClient.audioContext.state === 'suspended') {
                try { await window.dialogClient.audioContext.resume(); } catch (e) { console.warn('AudioContext resume 失败:', e); }
            }
            try {
                await window.dialogClient.startRecording();
            } catch (err) {
                console.warn('开始录音失败:', err);
            }

            if (!skipOpeningSpeech) {
                try {
                    console.log('[进入测试页] 发送开场白');
                    const openingText = '现在开始测试，请描述你看到的第一张图片。';
                    const introQuery = buildTTSQuery(openingText);
                    await sendTextQuery(introQuery, { ensure: false });
                    console.log('[进入测试页] 开场白已发送');
                } catch (err) {
                    console.warn('发送开场白失败:', err);
                }
            }
        }

        introOverlay.style.display = 'none';
        appWindow.classList.remove('intro-mode');
        const shouldShowControls = state.stage !== 'post' && state.stage !== 'summary';
        if (shouldShowControls) {
            controlsBar.style.display = 'flex';
        }

        if (!['post', 'summary'].includes(state.stage)) {
            const previousStage = state.stage;
            state.stage = 'test';
            state.introStep = INTRO_STEPS.TEST;
            if (previousStage !== 'test') {
                saveSessionSnapshot('stage_change', { immediate: true });
            }
        }
        updateProgress();

        if (state.mediaRecorder && state.mediaRecorder.state === 'inactive') {
            state.mediaRecorder.start();
        }

        if (window.InteractionTracker && state.stage === 'test') {
            window.InteractionTracker.start();
        }

        initTest(restoredSnapshot);
    } catch (error) {
        console.error('连接 WebSocket 失败:', error);

        let errorMessage = '连接语音服务失败。';
        if (error.isTimeout) {
            errorMessage = '连接超时，请检查网络连接。';
        } else if (error.message) {
            errorMessage = `连接失败: ${error.message}`;
        }

        if (error.isMobile) {
            errorMessage += '\n\n提示：移动端连接可能需要更长时间，请确保：\n1. 网络连接正常\n2. 已允许浏览器访问网络\n3. 尝试切换到 WiFi 网络';
        } else {
            errorMessage += '\n\n请检查后端服务器是否已启动。';
        }

        alert(errorMessage);
        if (enterBtn) {
            enterBtn.disabled = false;
            enterBtn.textContent = '进入';
        }
        throw error;
    }
}


function fetchUserInfo(validatedValues = null){
    const draft = validatedValues ? { ...validatedValues } : syncBasicInfoDraftFromInputs();
    state.basicInfoDraft = {
        ...state.basicInfoDraft,
        ...draft
    };

    const basicInfo = {
        '性别': draft.sex,
        '年龄': draft.age,
        '学历': draft.education,
        '职业': draft.occupation,
        '当前心情': draft.mood,
        '测试时间': new Date().toLocaleString()
    };
    const userInfo = window.auth.getUserInfo();
    state.basicInfo = basicInfo;
    state.userInfo = userInfo;
    saveSessionSnapshot('basic_info');
    window.API.setBasicInfo(userInfo.username, basicInfo);
}
function initTest(restoredSnapshot = null) {
    const trackerSnapshot = restoredSnapshot?.payload?.tracker;
    const isRestored = Boolean(restoredSnapshot);

    if (window.InteractionTracker) {
        window.InteractionTracker.init({
            autoTrack: true,
            trackZoom: true,
            trackRotate: true,
            trackDrawing: true,
            trackNavigation: true,
            includeTimestamp: false
        });
        if (trackerSnapshot && typeof window.InteractionTracker.restore === 'function') {
            window.InteractionTracker.restore(trackerSnapshot);
        }
        window.InteractionTracker._updateCurrentPlate(state.currentIndex);
    }

    setupEventListeners();

    if (state.stage === 'post') {
        showPostTestView({ restoredSnapshot });
        return;
    }

    if (state.stage === 'summary') {
        showSummary();
        return;
    }

    loadImage(state.currentIndex);
    if (isRestored) {
        updateTransform({ zoom: state.zoom, rotation: state.rotation }, true);
    }
    updateNavButtons();

    if (!isRestored && state.currentIndex === 0) {
        disableNextButton();
    } else if (isRestored && state.nextButtonCooldown > 0) {
        disableNextButton(state.nextButtonCooldown);
    }

    const resizeObserver = new ResizeObserver(() => {
        if (rorschachImage.complete && rorschachImage.naturalWidth > 0) {
            resizeCanvas();
            loadCanvasState(state.currentIndex);
        }
    });
    resizeObserver.observe(rorschachImage);

    if (rorschachImage.complete && rorschachImage.naturalWidth > 0) {
        resizeCanvas();
        loadCanvasState(state.currentIndex);
    }

    if (state.stage === 'test') {
        startInactivityMonitoring();
    }
}

function resizeCanvas() {
    canvas.width = rorschachImage.clientWidth;
    canvas.height = rorschachImage.clientHeight;
    canvas.style.width = rorschachImage.clientWidth + 'px';
    canvas.style.height = rorschachImage.clientHeight + 'px';
}

// 音频和语音检测
// 优化：降低前端语音检测敏感度，依赖后端豆包VAD进行智能检测
// 前端仅用于不活动检测，不再用于判断用户是否在说话（避免误判）
function initAudio(stream) {
    state.mediaRecorder = new MediaRecorder(stream);
    state.mediaRecorder.ondataavailable = event => state.audioChunks.push(event.data);

    state.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });

        // 保存音频Blob到state，供finishAndSave使用
        state.audioBlob = audioBlob;

        // 注释掉自动下载webm文件的逻辑
        /*
        const audioUrl = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = audioUrl;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `rorschach_recording_${timestamp}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(audioUrl);
        */
        state.audioChunks = [];
    };

    // 优化：降低前端语音检测敏感度，提高阈值以减少误判
    // 前端检测仅用于不活动监控，真正的语音检测由后端豆包VAD处理
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8; // 增加平滑，减少波动
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    // 使用更保守的检测逻辑，避免误判
    let speakingCount = 0; // 连续检测到语音的帧数
    const SPEAKING_THRESHOLD = 25; // 提高阈值，减少环境噪音误判（原值10）
    const MIN_SPEAKING_FRAMES = 3; // 需要连续3帧才认为在说话，减少瞬时噪音影响

    function checkSpeaking() {
        analyser.getByteFrequencyData(dataArray);
        let sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;
        
        // 使用更保守的检测逻辑
        if (average > SPEAKING_THRESHOLD) {
            speakingCount++;
            // 只有连续检测到语音才认为在说话
            if (speakingCount >= MIN_SPEAKING_FRAMES) {
                state.isSpeaking = true;
                resetInactivityTimer();
            }
        } else {
            speakingCount = 0;
            // 延迟清除状态，避免短暂停顿误判
            if (state.isSpeaking) {
                setTimeout(() => {
                    if (speakingCount === 0) {
                        state.isSpeaking = false;
                    }
                }, 200);
            }
        }
        requestAnimationFrame(checkSpeaking);
    }
    checkSpeaking();
}

/**
 * 播放音频（支持文件路径和实时对话文本）
 * @param {string} src - 音频文件路径（如 'audio/1.mp3'）或文本内容
 * @param {Function} onendedCallback - 播放完成回调
 * @param {Object} options - 可选参数
 */
async function playAudio(src, onendedCallback = null, options = {}) {
    // 如果 src 是文件路径（以 './audio/' 或 'audio/' 开头），使用原有方式播放
    if (typeof src === 'string' && (src.startsWith('./audio/') || src.startsWith('audio/'))) {
        audioPlayer.src = src;
        audioPlayer.onended = onendedCallback;
        audioPlayer.play().catch(e => console.error("音频播放失败:", e));
        return;
    }

    // 否则使用实时对话客户端发送文本查询
    if (window.dialogClient) {
        try {
            if (!window.dialogClient.isConnected || TTS.currentMode !== 'audio') {
                await ensureTTSInit('audio');
            }
            // 确保已连接
            if (!window.dialogClient.isConnected) {
                await window.dialogClient.connect();
            }

            // 发送文本查询（已注释）
            // await window.dialogClient.sendTextQuery(src);

            // 由于实时对话是流式播放，无法准确判断播放完成时间
            // 根据文本长度估算播放时间（平均语速约 3-4 字/秒）
            if (onendedCallback) {
                const estimatedDuration = Math.max(2000, src.length * 300); // 至少 2 秒，每字约 300ms
                setTimeout(() => {
                    if (onendedCallback) {
                        onendedCallback();
                    }
                }, estimatedDuration);
            }
        } catch (error) {
            console.error('[播放音频] 实时对话失败:', error);
            // 错误处理：显示文本或使用其他降级方案
            if (options.onError) {
                options.onError(error);
            } else {
                // 降级方案：显示文本内容
                console.warn('[播放音频] 无法播放，文本内容:', src);
            }
        }
    } else {
        console.warn('[播放音频] 实时对话客户端未加载，无法播放文本:', src);
        if (options.onError) {
            options.onError(new Error('实时对话客户端未加载'));
        }
    }
}

// 优化的不活动逻辑
// 优化：添加AI播放状态检测，避免在AI说话时触发提示
function isAIPlaying() {
    // 检查dialogClient是否正在播放音频
    if (window.dialogClient && window.dialogClient.isPlaying) {
        return true;
    }
    // 检查audioPlayer是否正在播放
    if (audioPlayer && !audioPlayer.paused) {
        return true;
    }
    return false;
}

function playRandomPrompt() {
    // 优化：如果AI正在播放，不触发提示，避免打断AI
    if (isAIPlaying()) {
        resetInactivityTimer();
        return;
    }
    
    // 优化：如果用户正在说话（由后端VAD检测），也不触发提示
    if (state.isSpeaking) {
        resetInactivityTimer();
        return;
    }
    
    if (state.inactivityLevel === 0) {
        // 第一次提示：使用TTS播放随机提示文本
        const randomIndex = Math.floor(Math.random() * PROMPT_TEXTS.length);
        const promptText = PROMPT_TEXTS[randomIndex];
        showPromptIndicator(promptText);
        playAudio(promptText, () => {
            state.inactivityLevel = 1;
            resetInactivityTimer();
        });
    } else if (state.inactivityLevel === 1) {
        // 第二次提示：使用TTS播放最终提示文本
        showPromptIndicator(FINAL_PROMPT_TEXT);
        playAudio(FINAL_PROMPT_TEXT, () => {
            state.inactivityLevel = 0;
            resetInactivityTimer();
        });
    }
}

function resetInactivityTimer() {
    if (!inactivityActive) {
        return;
    }
    clearTimeout(inactivityTimer);
    state.inactivityLevel = 0;

    // 优化：检查AI是否正在播放，如果正在播放则不启动不活动检测
    if (isAIPlaying()) {
        return;
    }

    // 第一次提示：4秒
    inactivityTimer = setTimeout(() => {
        // 双重检查：确保AI不在播放且用户不在说话
        if (!isAIPlaying() && !state.isSpeaking) {
            playRandomPrompt();
        }
    }, INACTIVITY_THRESHOLD_1);

    // 第二次提示：8秒（在第一次基础上再4秒）
    setTimeout(() => {
        // 双重检查：确保AI不在播放且用户不在说话
        if (state.inactivityLevel === 1 && !isAIPlaying() && !state.isSpeaking) {
            playRandomPrompt();
        }
    }, INACTIVITY_THRESHOLD_2);
}

function showPromptIndicator(message) {
    const existing = document.querySelector('.prompt-indicator');
    if (existing) existing.remove();

    const indicator = document.createElement('div');
    indicator.className = 'prompt-indicator';
    indicator.textContent = message;
    document.body.appendChild(indicator);
    setTimeout(() => indicator.remove(), 3000);
}

// 事件监听器
// 标记事件监听器是否已绑定
let eventListenersSetup = false;

function setupEventListeners() {
    // 防止重复绑定事件监听器
    if (eventListenersSetup) {
        return;
    }
    eventListenersSetup = true;
    setupBasicInfoDraftListeners();

    startTestBtn.addEventListener('click', startTest);
    if (resumeTestBtn) {
        resumeTestBtn.addEventListener('click', () => {
            if (resumeTestBtn.disabled) return;
            disableWelcomeMessagePlayback();
            resumeTestBtn.disabled = true;
            resumeTestFromSnapshot();
        });
    }
    prevBtn.addEventListener('click', () => navigate(-1));
    nextBtn.addEventListener('click', () => navigate(1));
    finishBtn.addEventListener('click', finishAndSave);

    document.getElementById('zoom-in-btn').addEventListener('click', () => {
        updateTransform({ zoom: state.zoom * 1.2 });
        resetInactivityTimer();
    });
    document.getElementById('zoom-out-btn').addEventListener('click', () => {
        updateTransform({ zoom: Math.max(0.2, state.zoom / 1.2) });
        resetInactivityTimer();
    });
    document.getElementById('rotate-left-btn').addEventListener('click', () => {
        updateTransform({ rotation: state.rotation - 30 });
        resetInactivityTimer();
    });
    document.getElementById('rotate-right-btn').addEventListener('click', () => {
        updateTransform({ rotation: state.rotation + 30 });
        resetInactivityTimer();
    });
    document.getElementById('pen-tool').addEventListener('click', () => {
        selectTool('pen');
        resetInactivityTimer();
    });
    document.getElementById('eraser-tool').addEventListener('click', () => {
        selectTool('eraser');
        resetInactivityTimer();
    });
    document.getElementById('clear-all-tool').addEventListener('click', () => {
        clearAllDrawing();
        // 只选中一键擦除按钮本身，不影响其他工具按钮
        selectClearAllTool(true);
        // 清除其他工具的选中状态
        document.getElementById('pen-tool').classList.remove('selected');
        document.getElementById('eraser-tool').classList.remove('selected');
        // 重置工具状态
        state.tool = null;
        resetInactivityTimer();

    });
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            selectColor(e.target.dataset.color);
            resetInactivityTimer();
        });
    });
    
    // 初始化颜色选择器状态
    syncColorSelectorState();

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
}

/**
 * 禁用"下一张"按钮并开始冷却倒计时
 */
function disableNextButton(initialCooldown = NEXT_BUTTON_COOLDOWN) {
    // 如果已经在冷却中，直接返回
    if (state.nextButtonCooldown > 0) {
        return;
    }

    // 禁用按钮
    nextBtn.disabled = true;
    state.nextButtonCooldown = Math.max(1, initialCooldown);

    // 更新按钮文本显示倒计时
    function updateCooldownDisplay() {
        if (state.nextButtonCooldown > 0) {
            nextBtn.textContent = `下一张 ▶ (${state.nextButtonCooldown}秒)`;
            state.nextButtonCooldown--;
        } else {
            // 冷却结束，恢复按钮
            nextBtn.disabled = false;
            nextBtn.textContent = '下一张 ▶';
            if (nextButtonCooldownTimer) {
                clearInterval(nextButtonCooldownTimer);
                nextButtonCooldownTimer = null;
            }
        }
    }

    // 立即更新一次显示
    updateCooldownDisplay();

    // 每秒更新一次倒计时
    nextButtonCooldownTimer = setInterval(updateCooldownDisplay, 1000);
}

// 导航和状态
function navigate(direction) {
    console.log('[调试] navigate 被调用:', {
        direction,
        currentIndex: state.currentIndex,
        newIndex: state.currentIndex + direction
    });

    saveCanvasState(state.currentIndex);
    const newIndex = state.currentIndex + direction;

    // 检查是否需要冷却豁免（如果是已浏览过的图片）
    const isVisitedImage = state.visitedImages.has(newIndex);

    // 如果是点击下一张，检查是否在冷却中
    // 但如果是最后一张图（即将进入选择阶段），允许操作
    // 或者如果是已浏览过的图片，也允许操作
    if (direction === 1 && state.nextButtonCooldown > 0 && !isVisitedImage) {
        // 如果即将进入选择阶段，允许操作并清除冷却
        if (newIndex === state.totalImages) {
            // 清除冷却定时器
            if (nextButtonCooldownTimer) {
                clearInterval(nextButtonCooldownTimer);
                nextButtonCooldownTimer = null;
            }
            state.nextButtonCooldown = 0;
        } else {
            // 在冷却中且不是最后一张，不允许操作
            return;
        }
    }

    if (direction === 1 && newIndex === state.totalImages) {
        // 记录最后一张图的导航操作（进入选择阶段）
        if (window.InteractionTracker && window.InteractionTracker._trackNavigation) {
            window.InteractionTracker._trackNavigation('next');
        }

        // 打印最后一张图的数据（离开前的图版数据）
        if (window.InteractionTracker && window.InteractionTracker.printDataStructures) {
            window.InteractionTracker.printDataStructures(state.currentIndex);
        }

        // 清除冷却定时器（如果存在）
        if (nextButtonCooldownTimer) {
            clearInterval(nextButtonCooldownTimer);
            nextButtonCooldownTimer = null;
        }
        state.nextButtonCooldown = 0;
        nextBtn.disabled = false;
        nextBtn.textContent = '下一张 ▶';
        saveSessionSnapshot('stage_change', { immediate: true });
        showPostTestView();
        return;
    }

    if (newIndex >= 0 && newIndex < state.totalImages) {
        // 记录导航操作（在切换之前，记录的是当前图版的导航操作）
        if (window.InteractionTracker && window.InteractionTracker._trackNavigation) {
            window.InteractionTracker._trackNavigation(direction === 1 ? 'next' : 'prev');
        }

        // 保存离开前的图版索引（用于打印日志）
        const previousIndex = state.currentIndex;

        state.currentIndex = newIndex;
        console.log('[调试] state.currentIndex 更新为:', state.currentIndex);

        // 将当前图片标记为已浏览
        state.visitedImages.add(state.currentIndex);
        saveSessionSnapshot('navigate');

        // 更新追踪器的当前图版索引（记录时间戳）
        // 注意：这里记录的是切换到新图版的时间，即新图版开始的时间
        if (window.InteractionTracker && window.InteractionTracker._updateCurrentPlate) {
            window.InteractionTracker._updateCurrentPlate(state.currentIndex);
        }
        loadImage(state.currentIndex);
        updateProgress();

        console.log('[调试] updateProgress 后，currentIndex:', state.currentIndex);

        // 如果是点击下一张（包括从第一张切换到第二张），切换到新图版后立即启动冷却
        // 但如果目标图片已浏览过，则不启动冷却
    if (direction === 1) {
            if (window.InteractionTracker && window.InteractionTracker.printDataStructures) {
                window.InteractionTracker.printDataStructures(previousIndex);
            }
    }

    if (direction === 1 && !isVisitedImage) {
            disableNextButton();

            // 播报当前图片的提示语音
            (async () => {
                try {
                    const imageNumber = state.currentIndex + 1; // 图片编号从1开始
                    const promptText = `请描述你看到的第${imageNumber}张图片。`;
                    console.log('[切换图片] 播报提示:', promptText);
                    const introQuery = buildTTSQuery(promptText);
                    await sendTextQuery(introQuery, { ensure: false });
                    console.log('[切换图片] 提示已发送');
                } catch (err) {
                    console.warn('[切换图片] 播报提示失败:', err);
                }
            })();
        }
    }
    resetInactivityTimer();
}

function loadImage(index) {
    // 注意：时间戳已在 navigate() 或 startTest() 中记录
    // 这里不需要再次记录，只需要确保图版索引同步
    if (window.InteractionTracker && window.InteractionTracker._updateCurrentPlate) {
        // 只更新索引，不记录时间戳（因为已经记录过了）
        window.InteractionTracker._updateCurrentPlate(index);
    }
    updateTransform({ zoom: 1, rotation: 0 }, true);

    // 切换图版时立即清除画布（避免显示上一张图的轨迹）
    clearCanvas();

    // 移除之前的 onload 事件处理器，避免冲突
    rorschachImage.onload = null;
    rorschachImage.onerror = null;

    showImagePlaceholder(`正在加载第 ${index + 1} 张图，请稍候...`);

    rorschachImage.src = `./images/rorschach-blot-${index + 1}.webp`;
    rorschachImage.onerror = () => {
        showImagePlaceholder('图片加载失败，请检查网络后重试。', { force: true });
    };

    // 确保图片加载后加载该图版的画布状态
    if (rorschachImage.complete) {
        // 图片已缓存，立即加载画布状态
        resizeCanvas();
        loadCanvasState(index);
        hideImagePlaceholder();
    } else {
        // 图片需要加载，等待加载完成
        rorschachImage.onload = () => {
            resizeCanvas();
            loadCanvasState(index);
            hideImagePlaceholder();
            rorschachImage.onload = null;
        };
    }

    updateNavButtons();
}

function updateNavButtons() {
    prevBtn.disabled = state.currentIndex === 0;
    // "下一张"按钮的禁用状态由冷却时间控制
    // 如果是最后一张图，始终允许点击（进入选择阶段不受冷却限制）
    if (state.currentIndex === state.totalImages - 1) {
        nextBtn.disabled = false;
        nextBtn.textContent = '下一张 ▶';
    }
    // 其他情况下，禁用状态由冷却定时器控制
}

function updateProgress() {
    console.log('[调试] updateProgress 被调用，currentIndex:', state.currentIndex, '显示:', state.currentIndex + 1);
    progressText.textContent = `第 ${state.currentIndex + 1} / ${state.totalImages} 张图片`;
}

// 后测试视图
function showPostTestView(options = {}) {
    const restoredSnapshot = options.restoredSnapshot || null;
    state.stage = 'post';
    stopInactivityMonitoring();
    clearTimeout(inactivityTimer);
    mainContent.style.display = 'none';
    controlsBar.style.display = 'none';
    postTestView.style.display = 'block';
    progressText.textContent = '测试总结阶段';

    // 记录进入选择阶段的时间
    if (window.InteractionTracker && window.InteractionTracker.recordSelectPhase) {
        window.InteractionTracker.recordSelectPhase();
    }

    const grid = document.getElementById('post-test-grid');
    grid.innerHTML = '';
    for (let i = 0; i < state.totalImages; i++) {
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.dataset.index = i;
        item.innerHTML = `<img src="./images/rorschach-blot-${i + 1}.webp" alt="Image ${i + 1}"><h4>图 ${i + 1}</h4>`;
        item.addEventListener('click', handleImageSelection);
        grid.appendChild(item);
    }
    currentQuestionIndex = restoredSnapshot?.payload?.currentQuestionIndex ?? 0;
    askNextQuestion();
    saveSessionSnapshot('stage_change', { immediate: true });
}

async function askNextQuestion() {
    document.querySelectorAll('.grid-item.selected').forEach(el => el.classList.remove('selected'));

    if (currentQuestionIndex >= POST_TEST_QUESTIONS.length) {
        questionText.textContent = "所有问题已回答完毕。感谢您的参与！";
        document.getElementById('post-test-grid').style.display = 'none';
        finishBtn.style.display = 'inline-block';
        return;
    }

    const question = POST_TEST_QUESTIONS[currentQuestionIndex];
    questionText.textContent = question.text;
    const gridContainer = document.getElementById('post-test-grid');

    gridContainer.style.pointerEvents = 'none';

    // 直接使用 text 进行 TTS 播报
    try {
        // 使用 sendTextQuery 进行 TTS 播报，格式与其他地方保持一致
        const ttsQuery = buildTTSQuery(question.text);
        await sendTextQuery(ttsQuery, { ensure: false });

        // 估算 TTS 播放时间（每字约 300ms）
        const estimatedDuration = Math.max(2000, question.text.length * 300);
        await new Promise(resolve => setTimeout(resolve, estimatedDuration));
    } catch (error) {
        console.warn('[askNextQuestion] TTS 播报失败:', error);
    }

    // 播放完成后，根据问题类型处理
    if (question.key !== 'mood') {
        gridContainer.style.pointerEvents = 'auto';
    } else {
        currentQuestionIndex++;
        saveSessionSnapshot('post_test_progress');
        setTimeout(askNextQuestion, 1500);
    }
}

function handleImageSelection(event) {
    const selectedIndex = event.currentTarget.dataset.index;
    const questionKey = POST_TEST_QUESTIONS[currentQuestionIndex].key;
    state.postTestAnswers[questionKey] = parseInt(selectedIndex) + 1;

    document.querySelectorAll('.grid-item.selected').forEach(el => el.classList.remove('selected'));
    event.currentTarget.classList.add('selected');

    currentQuestionIndex++;
    saveSessionSnapshot('post_test');

    document.getElementById('post-test-grid').style.pointerEvents = 'none';
    setTimeout(askNextQuestion, 500);
}

// 完成和汇总
function finishAndSave() {
    // 断开TTS连接
    if (window.dialogClient) {
        window.dialogClient.disconnect();
        console.log('[测试完成] TTS连接已断开');
    }

    if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
        state.mediaRecorder.stop();
    }

    // 导出交互追踪数据
    if (window.InteractionTracker) {
        try {
            window.InteractionTracker.stop();

            // 输出所有版图的统计信息（完整数据）
            window.InteractionTracker.printAllPlatesStatistics();

            const interactionData = window.InteractionTracker.exportJSON({
                pretty: true,
                includeStats: true,
                includeMetadata: true
            });
            console.log('[交互追踪数据]', JSON.parse(interactionData));

            // 获取旋转次数统计数据（仅记录到控制台，不自动导出）
            const rotationCounts = window.InteractionTracker.getRotationCounts();
            console.log('[旋转次数统计]', rotationCounts);

            // 获取画笔轨迹数据（仅记录到控制台，不自动导出）
            const drawingTracks = window.InteractionTracker.getDrawingTracks();
            console.log('[画笔轨迹数据]', drawingTracks);

            // 获取音频时间戳统计数据（仅记录到控制台，不自动导出）
            const audioTimestamps = window.InteractionTracker.getAudioTimestamps();
            console.log('[音频时间戳统计（相对时间）]', audioTimestamps);

            // 获取绝对时间戳统计数据
            const absoluteTimestamps = window.InteractionTracker.getAbsoluteTimestamps();
            console.log('[绝对时间戳统计]', absoluteTimestamps);

            // 可选：自动下载完整交互数据
            // window.InteractionTracker.download('json');
        } catch (error) {
            console.error('[交互追踪] 导出数据失败:', error);
        }
    }

    // 调用接口提交数据到服务器
    if (window.submitTestDataToServer && window.InteractionTracker) {
        // 使用异步方式提交，不阻塞页面显示
        (async () => {
            try {
                // 显示提交提示
                if (finishBtn) {
                    finishBtn.disabled = true;
                    finishBtn.textContent = '正在提交数据...';
                }

                // 获取音频数据（优先使用录制器导出的MP3）
                let audioBlob = null;

                // 如果录制器有数据，优先使用录制器导出的MP3
                if (window.AudioRecorder && window.AudioRecorder._instance) {
                    try {
                        const status = window.AudioRecorder.getStatus();
                        if (status.bufferCount > 0) {
                            console.log('[测试完成] 开始导出录制器音频为MP3...');
                            window.AudioRecorder.stop();
                            audioBlob = await window.AudioRecorder.exportMP3();
                            console.log('[测试完成] MP3导出成功，大小:', audioBlob.size, 'bytes');

                            // 立即下载MP3文件
                            try {
                                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                                // await window.AudioRecorder.downloadMP3(`rorschach-audio-${timestamp}.mp3`);
                                console.log('[测试完成] MP3文件已自动下载');
                            } catch (downloadError) {
                                console.error('[测试完成] MP3文件下载失败:', downloadError);
                            }
                        }
                    } catch (error) {
                        console.error('[测试完成] 导出录制器音频失败:', error);
                        // 如果导出失败，尝试使用原有的audioBlob
                        if (state.audioBlob) {
                            audioBlob = state.audioBlob;
                        }
                    }
                } else if (state.audioBlob) {
                    // 如果没有录制器或录制器导出失败，使用原有的audioBlob
                    audioBlob = state.audioBlob;
                } else if (state.audioChunks && state.audioChunks.length > 0) {
                    // 如果都没有，从audioChunks创建（但这是WebM格式，后端可能不接受）
                    audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
                }

                // 调用接口提交数据
                const result = await window.submitTestDataToServer(
                    window.InteractionTracker,
                    audioBlob,
                    state.postTestAnswers
                );

                console.log('[API] 数据提交成功:', result);

                // 显示成功提示
                if (finishBtn) {
                    finishBtn.textContent = '✅ 数据已提交成功';
                    finishBtn.style.backgroundColor = '#10b981';
                }
            } catch (error) {
                console.error('[API] 提交数据失败:', error);

                // 显示错误提示（不影响继续显示汇总页面）
                if (finishBtn) {
                    finishBtn.textContent = '⚠️ 数据提交失败（已保存本地）';
                    finishBtn.style.backgroundColor = '#f59e0b';
                }
            }
        })();
    }

    showSummary();
}

function showSummary() {
    state.stage = 'summary';
    state.completed = true;
    if (window.SessionManager && typeof window.SessionManager.markCompleted === 'function') {
        window.SessionManager.markCompleted();
    }
    postTestView.style.display = 'none';
    summaryView.style.display = 'block';
    progressText.textContent = '测试已完成！';

    const grid = document.getElementById('summary-grid');
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; background: var(--primary-lighter); border-radius: 12px; margin-bottom: 20px;"><h3 style="color: var(--primary-color); margin: 0;">✅ 感谢您的参与！</h3><button id="download-report-btn" style="margin-top: 15px; padding: 10px 20px; background: var(--primary-light); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: var(--shadow-md);">📥 下载测试报告</button></div>';
    
    // 为下载按钮添加事件监听器
    const downloadBtn = document.getElementById('download-report-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadReport);
    }

    for (let i = 0; i < state.totalImages; i++) {
        const item = document.createElement('div');
        item.className = 'summary-item';
        item.innerHTML = `<h4>图 ${i + 1}</h4>`;
        const compositeContainer = document.createElement('div');
        compositeContainer.style.position = 'relative';
        const baseImage = document.createElement('img');
        baseImage.src = `./images/rorschach-blot-${i + 1}.webp`;
        compositeContainer.appendChild(baseImage);
        if (state.canvasStates[i]) {
            const drawingImage = document.createElement('img');
            drawingImage.src = state.canvasStates[i];
            drawingImage.style.position = 'absolute';
            drawingImage.style.top = 0;
            drawingImage.style.left = 0;
            drawingImage.style.width = '100%';
            drawingImage.style.height = '100%';
            compositeContainer.appendChild(drawingImage);
        }
        item.appendChild(compositeContainer);
        grid.appendChild(item);
    }
    saveSessionSnapshot('stage_change', { immediate: true });
}

// 下载报告功能
async function downloadReport() {
    try {
        // 获取用户ID
        let userId = 'unknown';
        const userInfo = window.auth ? window.auth.getUserInfo() : null;

        if (userInfo?.userId) {
            userId = String(userInfo.userId);
        } else if (userInfo?.username) {
            userId = userInfo.username;
        } else {
            alert('用户信息不存在，请重新登录');
            return;
        }

        // 更新按钮状态
        const downloadBtn = document.getElementById('download-report-btn');
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '📄 报告生成中...';
        downloadBtn.disabled = true;

        // 调用API模块中的下载报告方法
        const blob = await window.API.downloadReport(userId);

        // 验证返回的是 Blob
        if (!(blob instanceof Blob)) {
            throw new Error('服务器返回的数据格式不正确，期望 PDF 文件');
        }

        // 验证 Blob 大小（PDF 文件通常至少几 KB）
        if (blob.size < 1024) {
            throw new Error('下载的文件大小异常，可能不是有效的 PDF 文件');
        }

        // 创建下载链接
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `rorschach-test-report-${userId}.pdf`;
        document.body.appendChild(a);
        a.click();
        
        // 延迟清理，确保下载开始
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);

        // 恢复按钮状态
        downloadBtn.innerHTML = '📥 下载测试报告';
        downloadBtn.disabled = false;

        console.log('[报告下载] 下载成功');
    } catch (error) {
        console.error('[报告下载] 下载失败:', error);

        // 恢复按钮状态
        const downloadBtn = document.getElementById('download-report-btn');
        downloadBtn.innerHTML = '📥 下载测试报告';
        downloadBtn.disabled = false;

        // 提取错误消息，优先显示服务器返回的具体错误信息
        let errorMessage = '报告下载失败，请稍后重试';
        if (error instanceof window.APIError) {
            errorMessage = error.message || errorMessage;
        } else if (error.message) {
            errorMessage = error.message;
        }

        alert(errorMessage);
    }
}

// 将 downloadReport 函数暴露到全局作用域，以便在需要时可以从外部调用
window.downloadReport = downloadReport;

function startInactivityMonitoring() {
    inactivityActive = true;
    resetInactivityTimer();
}

function stopInactivityMonitoring() {
    inactivityActive = false;
    clearTimeout(inactivityTimer);
    state.inactivityLevel = 0;
}

// 绘图和变换
function updateTransform(newTransforms = {}, force = false) {
    if (!force) {
        if (typeof newTransforms.zoom === 'number') {
            state.zoom = Math.max(0.2, newTransforms.zoom);
        }
        if (typeof newTransforms.rotation === 'number') {
            state.rotation = newTransforms.rotation;
        }
    } else {
        if (typeof newTransforms.zoom === 'number') {
            state.zoom = newTransforms.zoom;
        }
        if (typeof newTransforms.rotation === 'number') {
            state.rotation = newTransforms.rotation;
        }
    }

    const transformValue = `scale(${state.zoom}) rotate(${state.rotation}deg)`;
    if (rorschachImage) {
        rorschachImage.style.transform = transformValue;
    }
    if (canvas) {
        canvas.style.transform = `${CANVAS_BASE_TRANSFORM} ${transformValue}`;
    }
}

let lastX = 0, lastY = 0;

/**
 * 将屏幕坐标转换为画布坐标，考虑当前的缩放与旋转
 * @param {MouseEvent} event
 * @returns {{x: number, y: number}}
 */
function getCanvasCoordinates(event) {
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;

    const rotationRad = (state.rotation || 0) * Math.PI / 180;
    const cos = Math.cos(-rotationRad);
    const sin = Math.sin(-rotationRad);
    const scale = state.zoom || 1;

    const transformedX = (dx * cos - dy * sin) / scale;
    const transformedY = (dx * sin + dy * cos) / scale;

    return {
        x: transformedX + canvas.width / 2,
        y: transformedY + canvas.height / 2
    };
}

function startDrawing(e) {
    state.drawing = true;
    const point = getCanvasCoordinates(e);
    lastX = point.x;
    lastY = point.y;

    // 追踪画笔轨迹开始（仅记录画笔，不记录橡皮擦）
    if (state.tool === 'pen' && window.InteractionTracker && window.InteractionTracker._trackDrawingStart) {
        window.InteractionTracker._trackDrawingStart(lastX, lastY);
    }

    resetInactivityTimer();
}

function draw(e) {
    if (!state.drawing) return;
    const point = getCanvasCoordinates(e);
    const x = point.x;
    const y = point.y;

    ctx.beginPath();
    if (state.tool === 'pen') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = state.color;
        ctx.lineWidth = 5;
    } else if (state.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 20;
    }
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 追踪画笔轨迹点（仅记录画笔，不记录橡皮擦）
    if (state.tool === 'pen' && window.InteractionTracker && window.InteractionTracker._trackDrawingPoint) {
        window.InteractionTracker._trackDrawingPoint(x, y);
    }

    lastX = x;
    lastY = y;
    resetInactivityTimer();
}

function stopDrawing() {
    state.drawing = false;

    // 追踪画笔轨迹结束（仅画笔模式才记录）
    if (state.tool === 'pen' && window.InteractionTracker && window.InteractionTracker._trackDrawingEnd) {
        window.InteractionTracker._trackDrawingEnd();
    }
    saveCanvasState(state.currentIndex);
}

function selectTool(tool) {
    state.tool = tool;
    document.getElementById('pen-tool').classList.toggle('selected', tool === 'pen');
    document.getElementById('eraser-tool').classList.toggle('selected', tool === 'eraser');
    // 确保一键擦除按钮不被选中
    document.getElementById('clear-all-tool').classList.remove('selected');
}

// 添加专门处理一键擦除按钮选中状态的函数
function selectClearAllTool(selected) {
    // 确保只选中一键擦除按钮
    document.getElementById('clear-all-tool').classList.toggle('selected', selected);
    // 确保其他工具按钮不被选中
    if (selected) {
        document.getElementById('pen-tool').classList.remove('selected');
        document.getElementById('eraser-tool').classList.remove('selected');
    }
}

// 颜色映射：将颜色名称转换为十六进制值
const COLOR_MAP = {
    red: '#ef4444',
    green: '#10b981',
    blue: '#3b82f6'
};

// 反向映射：从十六进制值映射回颜色名称
const COLOR_REVERSE_MAP = {
    '#ef4444': 'red',
    '#10b981': 'green',
    '#3b82f6': 'blue'
};

function selectColor(color) {
    // 如果传入的是颜色名称，转换为十六进制值；否则直接使用
    state.color = COLOR_MAP[color] || color;
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.color === color);
    });
    selectTool('pen');
    // 确保一键擦除按钮不被选中
    document.getElementById('clear-all-tool').classList.remove('selected');
}

// 初始化颜色选择器状态，确保与 state.color 一致
function syncColorSelectorState() {
    const colorName = COLOR_REVERSE_MAP[state.color] || 'red';
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.color === colorName);
    });
}

function saveCanvasState(index) {
    if (canvas.width > 0 && canvas.height > 0) {
        state.canvasStates[index] = canvas.toDataURL();
        saveSessionSnapshot('drawing');
    }
}

function loadCanvasState(index) {
    clearCanvas();
    const dataUrl = state.canvasStates[index];
    if (dataUrl) {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => ctx.drawImage(img, 0, 0);
    }
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// 一键清除所有绘图
function clearAllDrawing() {
    clearCanvas();
    // 保存空的画布状态
    saveCanvasState(state.currentIndex);

    // 记录一键擦除操作
    if (window.InteractionTracker && window.InteractionTracker._trackClearAll) {
        window.InteractionTracker._trackClearAll();
    }
}

// 等待模块加载完成
function waitForModules(callback, maxRetries = 50) {
    let retries = 0;
    const checkModules = () => {
        if (window.auth && window.apiClient) {
            callback();
        } else if (retries < maxRetries) {
            retries++;
            setTimeout(checkModules, 100);
        } else {
            console.error('模块加载超时，跳转到登录页');
            window.location.href = './login.html';
        }
    };
    checkModules();
}
function stopAllPlayback() {
    try {
        if (window.dialogClient && typeof window.dialogClient.stopPlayback === 'function') {
            window.dialogClient.stopPlayback();
        }
    } catch (err) {
        console.warn('[播放控制] 停止实时播报失败:', err);
    }
    if (audioPlayer && !audioPlayer.paused) {
        try {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
        } catch (err) {
            console.warn('[播放控制] 停止音频元素失败:', err);
        }
    }
}

async function playWelcomeMessage() {
    if (!shouldPlayWelcomeMessage) {
        return;
    }
    hideIntroImage()
    // displayWelcomeText()
    const welcomeText =getWelcomeText();

    try {
        // 确保TTS已初始化
        await ensureTTSInit('audio');

        // 构造播报查询
        const welcomeQuery = buildTTSQuery(welcomeText);

        // 发送播报请求
        await sendTextQuery(welcomeQuery, { ensure: false });

        console.log('[欢迎页] 欢迎信息播报已发送');
    } catch (error) {
        console.warn('[欢迎页] 欢迎信息播报失败:', error);
    }
}

const WELCOME_TEXT_CONTENT = Object.freeze({
    intro: 'Hello，亲爱的用户您好，欢迎您来到罗夏墨迹测试，在进行罗夏墨迹（Rorschach Inkblot）心理测试之前，需要提前准备和确认以下信息。',
    points: [
        '罗夏墨迹心理测试需要坐在电脑前，使用本网站，采用语音交互完成。',
        '首先，确定您的电脑话筒和音响正常，测试期间，您需要根据 AI 语音的指示进行测试。',
        '心理测试全程时长大概30min至最长约2小时，测试时需要保持安静，在一个安静、放松的环境里，不被外界电话、信息打扰。',
        '测试后大约1~3天会收到测试报告。'
    ]
});

function getWelcomeText() {
    const bulletLines = WELCOME_TEXT_CONTENT.points.map(point => `- ${point}`);
    return [WELCOME_TEXT_CONTENT.intro, ...bulletLines].join('\n');
}

function renderWelcomeText() {
    const welcomeTextContainer = document.getElementById('welcome-text-container');
    if (!welcomeTextContainer) {
        return;
    }
    const bulletItems = WELCOME_TEXT_CONTENT.points.map(point => `<li><span class="welcome-dot"></span><div>${point}</div></li>`).join('');
    welcomeTextContainer.innerHTML = `
        <div class="welcome-card">
            <div class="welcome-badge">
                <div class="welcome-icon">🎧</div>
                <div>
                    <p class="welcome-label">测试准备</p>
                    <h2>开始之前，请先确认这些事项</h2>
                </div>
            </div>
            <p class="welcome-intro">${WELCOME_TEXT_CONTENT.intro}</p>
            <ul class="welcome-list">${bulletItems}</ul>
        </div>
    `;
    welcomeTextContainer.style.removeProperty('display');
    welcomeTextContainer.classList.remove('hidden');
}

function hideWelcomeText() {
    const welcomeTextContainer = document.getElementById('welcome-text-container');
    if (!welcomeTextContainer) {
        return;
    }
    welcomeTextContainer.classList.add('hidden');
    setTimeout(() => {
        welcomeTextContainer.style.display = 'none';
    }, 250);
}

// 隐藏intro-image元素
function hideIntroImage() {
    if (introPreviewImage) {
        introPreviewImage.style.visibility = 'hidden';
    }
}

// 显示intro-image元素
function showIntroImage() {
    if (introPreviewImage) {
        introPreviewImage.style.visibility = 'visible';
    }
}


// 更新登录/退出UI显示
function updateAuthUI() {
    const authControls = document.getElementById('auth-controls');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const usernameDisplay = document.getElementById('username-display');

    if (!authControls || !loginBtn || !logoutBtn || !usernameDisplay) {
        return;
    }

    if (window.auth && window.auth.isLoggedIn()) {
        // 已登录：显示用户名和退出按钮
        const userInfo = window.auth.getUserInfo();
        const username = userInfo?.username || '用户';
        usernameDisplay.textContent = username;
        authControls.style.display = 'flex';
        loginBtn.style.display = 'none';
    } else {
        // 未登录：显示登录按钮
        authControls.style.display = 'none';
        loginBtn.style.display = 'block';
    }
}

// 绑定登录/退出按钮事件
function setupAuthControls() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = './login.html';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (!window.auth) {
                console.error('认证模块未加载');
                return;
            }

            try {
                // 显示退出中状态
                logoutBtn.disabled = true;
                logoutBtn.textContent = '退出中...';

                // 调用登出接口
                await window.auth.logout();

                // 跳转到登录页
                window.location.href = './login.html';
            } catch (error) {
                console.error('退出失败:', error);
                // 即使出错，也跳转到登录页
                window.location.href = './login.html';
            }
        });
    }
}

// 登录检查和初始化
function checkLoginAndInit() {
    // 先更新UI（无论是否登录）
    updateAuthUI();
    
    if (!window.auth.isLoggedIn()) {
        // 未登录：跳转到登录页
        window.location.href = './login.html';
        return;
    }

    // 已登录：继续初始化
    configureSessionPersistence();
    ensureSessionId();
    setupEventListeners();
    showResumeOptionIfAvailable(true);
}

window.addEventListener('beforeunload', () => {
    saveSessionSnapshot('beforeunload', { immediate: true });
});

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    renderWelcomeText();
    // 先设置登录/退出按钮事件（不依赖模块加载）
    setupAuthControls();
    // 等待模块加载完成后检查登录状态
    waitForModules(() => {
        // 先更新UI（即使未登录也显示登录按钮）
        updateAuthUI();
        // 然后执行原有的初始化逻辑
        checkLoginAndInit();
    });
    welcomeMessageTimer = setTimeout(() => {
        if (shouldPlayWelcomeMessage) {
            playWelcomeMessage();
        }
    }, 1000);
});
