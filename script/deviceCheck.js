const SPEAKER_ACTION = '[data-action="speaker-test"]';
const MIC_ACTION = '[data-action="mic-test"]';
const RESULT_SELECTOR = '[data-role="device-check-result"]';

const state = {
    initialized: false,
    speakerReady: false,
    micReady: false,
    speakerChecking: false,
    micChecking: false,
    tipElement: null,
    container: null,
    startButton: null,
    resumeButton: null
};

function updateTip(message) {
    if (state.tipElement) {
        state.tipElement.textContent = message;
    }
}

function updateActionButtons() {
    const ready = isReady();
    [state.startButton, state.resumeButton].forEach(btn => {
        if (!btn) {
            return;
        }
        btn.dataset.deviceCheckReady = ready ? 'true' : 'false';
        if (!ready) {
            btn.title = '请先完成语音与麦克风检测';
        } else {
            btn.removeAttribute('title');
        }
    });
}

function setContainerStatus(status, text) {
    if (state.container) {
        state.container.dataset.status = status;
        const resultEl = state.container.querySelector(RESULT_SELECTOR);
        if (resultEl) {
            resultEl.textContent = text;
        }
    }
}

function isReady() {
    return state.speakerReady && state.micReady;
}

function updateStatusIndicators({ status = 'pending', text = '等待检测' } = {}) {
    if (isReady()) {
        setContainerStatus('ready', '检测完成');
        updateTip('检测完成，可以开始测试。建议在正式开始前保持环境安静。');
    } else if (status === 'error') {
        setContainerStatus('error', text);
    } else if (state.speakerChecking || state.micChecking) {
        setContainerStatus('checking', text);
    } else {
        setContainerStatus('pending', text);
        if (!state.speakerReady && !state.micReady) {
            updateTip('请先测试语音播放和麦克风权限，确保设备正常。');
        } else if (state.speakerReady && !state.micReady) {
            updateTip('语音播放正常，仍需完成麦克风检测。');
        } else if (!state.speakerReady && state.micReady) {
            updateTip('麦克风允许，仍需确认语音播放。');
        }
    }
    updateActionButtons();
}

function resetButtonState(button, { success = false, error = false } = {}) {
    if (!button) return;
    button.disabled = false;
    button.classList.remove('device-check-success', 'device-check-error');
    if (success) {
        button.classList.add('device-check-success');
        if (button.dataset.successText) {
            button.textContent = button.dataset.successText;
        }
    } else if (error) {
        button.classList.add('device-check-error');
        if (button.dataset.errorText) {
            button.textContent = button.dataset.errorText;
        }
    } else if (button.dataset.defaultText) {
        button.textContent = button.dataset.defaultText;
    }
}

function beginButtonProcessing(button, pendingText) {
    if (!button) return () => {};
    if (!button.dataset.defaultText) {
        button.dataset.defaultText = button.textContent;
    }
    button.disabled = true;
    button.classList.remove('device-check-success', 'device-check-error');
    button.textContent = pendingText;
    return () => resetButtonState(button);
}

function playSpeakerTestTone() {
    return new Promise((resolve, reject) => {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) {
                throw new Error('当前浏览器不支持 Web Audio。');
            }
            const ctx = new AudioCtx();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = 880;
            gainNode.gain.value = 0.15;
            oscillator.connect(gainNode).connect(ctx.destination);
            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
                ctx.close().finally(resolve);
            }, 1000);
        } catch (error) {
            reject(error);
        }
    });
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureMicLevel(stream) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
        return;
    }
    const ctx = new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);

    let maxVolume = 0;
    const sampleDuration = 1500;
    const startTime = performance.now();

    while (performance.now() - startTime < sampleDuration) {
        analyser.getByteTimeDomainData(dataArray);
        for (let i = 0; i < bufferLength; i += 1) {
            const deviation = Math.abs(dataArray[i] - 128);
            if (deviation > maxVolume) {
                maxVolume = deviation;
            }
        }
        await wait(60);
    }

    await ctx.close();

    if (maxVolume < 3) {
        throw new Error('未检测到明显的麦克风输入，请确认已发声或提高音量。');
    }
}

async function handleSpeakerTest(button) {
    state.speakerChecking = true;
    const stopProcessing = beginButtonProcessing(button, '正在播放测试音...');
    updateStatusIndicators({ status: 'checking', text: '语音检测中' });
    try {
        await playSpeakerTestTone();
        state.speakerReady = true;
        if (button) {
            button.dataset.successText = '✅ 再次测试语音';
        }
        resetButtonState(button, { success: true });
        updateStatusIndicators({ status: 'pending', text: '语音播放通过，等待麦克风检测' });
    } catch (error) {
        console.error('[DeviceCheck] 语音测试失败:', error);
        state.speakerReady = false;
        if (button) {
            button.dataset.errorText = '重试语音测试';
        }
        resetButtonState(button, { error: true });
        updateTip(error.message || '语音测试失败，请重试。');
        updateStatusIndicators({ status: 'error', text: '语音测试失败' });
    } finally {
        stopProcessing();
        state.speakerChecking = false;
    }
}

function stopStream(stream) {
    if (!stream) return;
    stream.getTracks().forEach(track => track.stop());
}

async function handleMicTest(button) {
    state.micChecking = true;
    const stopProcessing = beginButtonProcessing(button, '正在检测麦克风...');
    updateStatusIndicators({ status: 'checking', text: '麦克风检测中' });
    let stream;
    try {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('浏览器不支持麦克风访问，请使用最新版 Chrome / Edge。');
        }
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        await captureMicLevel(stream);
        state.micReady = true;
        if (button) {
            button.dataset.successText = '✅ 再次测试麦克风';
        }
        resetButtonState(button, { success: true });
        updateStatusIndicators({ status: 'pending', text: '麦克风权限通过，等待语音检测' });
    } catch (error) {
        console.error('[DeviceCheck] 麦克风测试失败:', error);
        state.micReady = false;
        if (button) {
            button.dataset.errorText = '重试麦克风测试';
        }
        resetButtonState(button, { error: true });
        updateTip(error.message || '麦克风检测失败，请确认权限并重试。');
        updateStatusIndicators({ status: 'error', text: '麦克风检测失败' });
    } finally {
        stopStream(stream);
        stopProcessing();
        state.micChecking = false;
        if (isReady()) {
            updateStatusIndicators({ status: 'ready', text: '检测完成' });
        }
    }
}

export function initDeviceCheck({
    startButton,
    resumeButton,
    tipElement,
    container
} = {}) {
    if (state.initialized) {
        return;
    }
    state.initialized = true;
    state.tipElement = tipElement || null;
    state.container = container || null;
    state.startButton = startButton || null;
    state.resumeButton = resumeButton || null;

    if (!state.container) {
        console.warn('[DeviceCheck] container 缺失，无法初始化。');
        return;
    }

    const speakerBtn = state.container.querySelector(SPEAKER_ACTION);
    const micBtn = state.container.querySelector(MIC_ACTION);

    if (speakerBtn) {
        speakerBtn.addEventListener('click', () => {
            if (!state.speakerChecking) {
                handleSpeakerTest(speakerBtn);
            }
        });
    }

    if (micBtn) {
        micBtn.addEventListener('click', () => {
            if (!state.micChecking) {
                handleMicTest(micBtn);
            }
        });
    }

    updateStatusIndicators({ status: 'pending', text: '等待检测' });
}

export function isDeviceCheckReady() {
    return isReady();
}

