import { driver as createDriver } from 'https://esm.run/driver.js@1.3.2';

const INTRO_GUIDE_STORAGE_KEY = 'xlcs:introGuideSeen';

let introDriver = null;
let introGuideResizeObserver = null;
let introGuideImageListenerCleanup = null;
let introRefreshRaf = null;

const driverOptions = {
    animate: true,
    showProgress: true,
    stageBackground: 'rgba(15, 23, 42, 0.85)',
    padding: 12,
    showButtons: true,
    allowClose: true,
    opacity: 0.85,
    popoverClass: 'intro-driver-popover',
    nextBtnText: '下一步',
    prevBtnText: '上一步',
    doneBtnText: '开始体验'
};

function buildIntroSteps() {
    const steps = [];

    const imageArea = document.querySelector('.test-preview-image-frame');
    if (imageArea) {
        steps.push({
            element: imageArea,
            popover: {
                title: '图版预览区',
                description: '这里展示当前的墨迹图版，可在预览中体验画笔和旋转缩放等操作。'
            }
        });
    }

    const prevGroup = document.querySelector('.test-preview-controls .control-group:first-child');
    if (prevGroup) {
        steps.push({
            element: prevGroup,
            popover: {
                title: '切换图版',
                description: '通过上一张按钮回顾之前的图版，逐步熟悉作答节奏。'
            }
        });
    }

    const nextGroup = document.querySelector('.test-preview-controls .control-group:last-child');
    if (nextGroup) {
        steps.push({
            element: nextGroup,
            popover: {
                title: '继续下一张',
                description: '完成记录后点击下一张进入新的图版，保持稳定作答节奏。'
            }
        });
    }

    const zoomGroup = document.querySelector('.test-preview-controls .control-group:nth-child(2)');
    if (zoomGroup) {
        steps.push({
            element: zoomGroup,
            popover: {
                title: '缩放与旋转',
                description: '通过放大、缩小、旋转按钮调整视角，便于观察细节。'
            }
        });
    }

    const penGroup = document.querySelector('.test-preview-controls .control-group:nth-child(3)');
    if (penGroup) {
        const penBtn = penGroup.querySelector('button[data-action="pen"]');
        if (penBtn) {
            steps.push({
                element: penBtn,
                popover: {
                    title: '画笔工具',
                    description: '画笔用于标记你在图版中观察到的区域，进入正式测试前先在预览里熟悉手感。'
                }
            });
        }

        const colorSelector = penGroup.querySelector('.color-selector');
        if (colorSelector) {
            steps.push({
                element: colorSelector,
                popover: {
                    title: '颜色选择',
                    description: '支持三种标注颜色，点击即可切换，方便区分不同的想法。'
                }
            });
        }

        const eraseBtn = penGroup.querySelector('button[data-action="erase"]');
        if (eraseBtn) {
            steps.push({
                element: eraseBtn,
                popover: {
                    title: '擦除工具',
                    description: '轻点即可启用擦除模式，修正你刚刚的笔迹。'
                }
            });
        }

        const clearBtn = penGroup.querySelector('button[data-action="clear"]');
        if (clearBtn) {
            steps.push({
                element: clearBtn,
                popover: {
                    title: '一键擦除',
                    description: '需要重新开始时，可一键清空画布，快速恢复初始状态。'
                }
            });
        }
    }

    return steps;
}

function getIntroGuideStorageKey() {
    try {
        const authUser = window?.auth?.getUserInfo?.();
        if (authUser?.username) {
            return `${INTRO_GUIDE_STORAGE_KEY}:${authUser.username}`;
        }

        const storedUserInfo = localStorage.getItem('userInfo');
        if (storedUserInfo) {
            const parsedUserInfo = JSON.parse(storedUserInfo);
            if (parsedUserInfo?.username) {
                return `${INTRO_GUIDE_STORAGE_KEY}:${parsedUserInfo.username}`;
            }
        }
    } catch (error) {
        console.warn('[Intro Guide] 解析用户信息失败，使用默认存储键:', error);
    }

    return INTRO_GUIDE_STORAGE_KEY;
}

function hasSeenIntroGuide() {
    const storageKey = getIntroGuideStorageKey();
    try {
        return localStorage.getItem(storageKey) === '1';
    } catch (error) {
        console.warn('[Intro Guide] 读取引导提示状态失败:', error);
        return false;
    }
}

function markIntroGuideSeen() {
    const storageKey = getIntroGuideStorageKey();
    try {
        localStorage.setItem(storageKey, '1');
    } catch (error) {
        console.warn('[Intro Guide] 记录引导提示状态失败:', error);
    }
}

export function startIntroGuide() {
    if (hasSeenIntroGuide()) {
        return;
    }

    const introOverlay = document.getElementById('intro-overlay');
    if (!introOverlay || introOverlay.style.display === 'none') {
        return;
    }

    const steps = buildIntroSteps();
    if (!steps.length) {
        return;
    }

    if (introDriver) {
        introDriver.destroy();
        introDriver = null;
    }
    teardownGuideSyncHooks();

    introDriver = createDriver({
        ...driverOptions,
        steps
    });
    introDriver.drive();
    markIntroGuideSeen();
    scheduleDriverRefresh();
    setTimeout(scheduleDriverRefresh, 150);
    setupGuideSyncHooks();
}

export function destroyIntroGuide() {
    if (introDriver) {
        introDriver.destroy();
        introDriver = null;
    }
    teardownGuideSyncHooks();
}

function scheduleDriverRefresh() {
    if (!introDriver || !introDriver.isActive || !introDriver.isActive()) {
        return;
    }
    if (introRefreshRaf) {
        cancelAnimationFrame(introRefreshRaf);
    }
    introRefreshRaf = requestAnimationFrame(() => {
        introDriver.refresh();
        introRefreshRaf = null;
    });
}

function setupGuideSyncHooks() {
    const previewPanel = document.querySelector('.intro-preview-panel');
    const controls = document.querySelector('.test-preview-controls');
    const imageFrame = document.querySelector('.test-preview-image-frame');
    const targets = [previewPanel, controls, imageFrame].filter(Boolean);

    if (targets.length) {
        introGuideResizeObserver = new ResizeObserver(() => {
            scheduleDriverRefresh();
        });
        targets.forEach(target => introGuideResizeObserver.observe(target));
    }

    const introImage = document.getElementById('intro-preview-image');
    if (introImage) {
        const handleImageMutation = () => scheduleDriverRefresh();
        introImage.addEventListener('load', handleImageMutation);
        introImage.addEventListener('error', handleImageMutation);
        introGuideImageListenerCleanup = () => {
            introImage.removeEventListener('load', handleImageMutation);
            introImage.removeEventListener('error', handleImageMutation);
            introGuideImageListenerCleanup = null;
        };
    }
}

function teardownGuideSyncHooks() {
    if (introGuideResizeObserver) {
        introGuideResizeObserver.disconnect();
        introGuideResizeObserver = null;
    }
    if (introGuideImageListenerCleanup) {
        introGuideImageListenerCleanup();
        introGuideImageListenerCleanup = null;
    }
    if (introRefreshRaf) {
        cancelAnimationFrame(introRefreshRaf);
        introRefreshRaf = null;
    }
}

