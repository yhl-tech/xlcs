/**
 * 罗夏墨迹测试 - TTS 语音合成客户端
 * 使用流式传输方式从后端获取语音合成音频
 */

(function(window) {
    'use strict';

    /**
     * TTS 配置
     * 复用 api.js 的共享配置（baseURL, timeout），避免重复配置
     */
    const TTS_CONFIG = {
        // API 基础路径（复用 api.js 的配置，如果已加载）
        baseURL: (typeof window !== 'undefined' && window.API_CONFIG?.baseURL) || '/api',
        
        // TTS 接口端点（TTS 专用）
        endpoint: '/tts',
        
        // 请求超时时间（复用 api.js 的配置，如果已加载）
        timeout: (typeof window !== 'undefined' && window.API_CONFIG?.timeout) || 30000,
        
        // 音频格式（TTS 专用）
        audioFormat: 'audio/wav', // 或 'audio/mpeg' (mp3)
        
        // 流式接收配置（保留用于未来扩展）
        // chunkSize: 8192, // 每次累积的音频块大小（字节）
        // minChunksBeforePlay: 3, // 累积多少个块后开始播放（可选，设为0则等待完整）
    };

    /**
     * TTS 客户端类
     */
    class TTSClient {
        constructor(config = {}) {
            this.config = { ...TTS_CONFIG, ...config };
            this.baseURL = this.config.baseURL;
            this.endpoint = this.config.endpoint;
        }

        /**
         * 生成TTS音频（流式传输）
         * @param {string} text - 要合成的文本
         * @param {Object} options - 可选参数
         * @param {string} options.speaker - 音色（可选）
         * @param {Function} options.onProgress - 进度回调 (loaded, total)
         * @param {Function} options.onChunk - 接收到音频块的回调
         * @returns {Promise<Blob>} 返回音频Blob
         */
        async synthesizeStream(text, options = {}) {
            if (!text || typeof text !== 'string') {
                throw new Error('文本内容不能为空');
            }

            const {
                speaker = 'zh_female_vv_jupiter_bigtts',
                onProgress = null,
                onChunk = null
            } = options;

            // 构建请求URL
            const url = `${this.baseURL}${this.endpoint}`;
            
            // 请求参数
            const requestBody = {
                text: text,
                speaker: speaker,
                format: 'wav', // 或 'mp3'
                stream: true // 标识需要流式传输
            };

            // 创建超时控制器
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, this.config.timeout);

            try {
                // 使用 Fetch API 进行流式请求（axios 对流式支持有限）
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/octet-stream' // 接收二进制流
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    let errorText = '';
                    try {
                        errorText = await response.text();
                    } catch (e) {
                        errorText = '无法读取错误信息';
                    }
                    throw new Error(`TTS请求失败: ${response.status} ${response.statusText} - ${errorText}`);
                }

                // 检查响应类型
                const contentType = response.headers.get('content-type') || '';
                if (!contentType.includes('audio') && !contentType.includes('octet-stream')) {
                    // 注意：这里不读取响应体，因为后续需要读取音频流
                    throw new Error(`意外的响应类型: ${contentType}，期望音频流`);
                }

                // 获取内容长度（如果可用）
                const contentLength = response.headers.get('content-length');
                const total = contentLength ? parseInt(contentLength, 10) : null;

                // 读取流式数据
                const reader = response.body.getReader();
                const chunks = [];
                let loaded = 0;
                let chunkCount = 0;

                try {
                    // 流式读取
                    while (true) {
                        let result;
                        try {
                            result = await reader.read();
                        } catch (readError) {
                            // 流读取失败，尝试取消
                            try {
                                reader.cancel();
                            } catch (cancelError) {
                                // 忽略取消错误
                            }
                            throw new Error(`流读取失败: ${readError.message}`);
                        }

                        const { done, value } = result;
                        
                        if (done) {
                            break; // 流读取完成
                        }

                        // 累积音频数据块
                        chunks.push(value);
                        loaded += value.length;
                        chunkCount++;

                        // 调用进度回调
                        if (onProgress && typeof onProgress === 'function') {
                            onProgress(loaded, total);
                        }

                        // 调用块接收回调
                        if (onChunk && typeof onChunk === 'function') {
                            onChunk(value, chunkCount);
                        }
                    }
                } finally {
                    // 确保释放reader资源
                    try {
                        reader.releaseLock();
                    } catch (e) {
                        // 忽略释放错误
                    }
                }

                // 将所有块合并为 Blob
                const audioBlob = new Blob(chunks, { type: this.config.audioFormat });
                
                console.log(`[TTS] 音频生成完成: ${audioBlob.size} 字节, ${chunkCount} 个数据块`);
                
                return audioBlob;

            } catch (error) {
                clearTimeout(timeoutId); // 确保清理超时
                
                if (error.name === 'AbortError') {
                    console.error('[TTS] 请求超时:', this.config.timeout, 'ms');
                    throw new Error(`TTS请求超时（${this.config.timeout}ms）`);
                } else {
                    console.error('[TTS] 流式请求失败:', error);
                    throw error;
                }
            }
        }

        /**
         * 生成TTS音频（简化版，等待完整音频）
         * @param {string} text - 要合成的文本
         * @param {Object} options - 可选参数
         * @returns {Promise<Blob>} 返回音频Blob
         */
        async synthesize(text, options = {}) {
            return this.synthesizeStream(text, options);
        }

        /**
         * 生成TTS音频并返回可播放的URL
         * @param {string} text - 要合成的文本
         * @param {Object} options - 可选参数
         * @returns {Promise<string>} 返回 Blob URL
         */
        async synthesizeToURL(text, options = {}) {
            const blob = await this.synthesize(text, options);
            return URL.createObjectURL(blob);
        }

        /**
         * 生成TTS音频并直接播放
         * @param {string} text - 要合成的文本
         * @param {HTMLAudioElement} audioElement - 音频元素
         * @param {Function} onendedCallback - 播放完成回调
         * @param {Object} options - 可选参数
         * @returns {Promise<void>}
         */
        async synthesizeAndPlay(text, audioElement, onendedCallback = null, options = {}) {
            // 验证音频元素
            if (!audioElement) {
                throw new Error('音频元素不能为空');
            }
            if (!(audioElement instanceof HTMLAudioElement)) {
                throw new Error('audioElement 必须是 HTMLAudioElement 实例');
            }

            let audioURL = null; // 用于错误时清理

            try {
                // 显示加载状态（可选）
                if (options.onLoading && typeof options.onLoading === 'function') {
                    options.onLoading(true);
                }

                // 生成音频
                const blob = await this.synthesize(text, {
                    ...options,
                    onProgress: (loaded, total) => {
                        if (options.onProgress && typeof options.onProgress === 'function') {
                            options.onProgress(loaded, total);
                        }
                    }
                });

                // 创建 Blob URL
                audioURL = URL.createObjectURL(blob);

                // 清理之前的URL（如果存在）
                if (audioElement.src && audioElement.src.startsWith('blob:')) {
                    try {
                        URL.revokeObjectURL(audioElement.src);
                    } catch (e) {
                        // 忽略清理错误
                    }
                }

                // 设置音频源
                audioElement.src = audioURL;

                // 设置播放完成回调
                const cleanup = () => {
                    if (audioURL) {
                        URL.revokeObjectURL(audioURL);
                        audioURL = null;
                    }
                };

                if (onendedCallback) {
                    audioElement.onended = () => {
                        cleanup();
                        if (typeof onendedCallback === 'function') {
                            onendedCallback();
                        }
                    };
                } else {
                    // 如果没有回调，也要清理
                    audioElement.onended = cleanup;
                }

                // 播放音频
                await audioElement.play();

                // 隐藏加载状态
                if (options.onLoading && typeof options.onLoading === 'function') {
                    options.onLoading(false);
                }

            } catch (error) {
                console.error('[TTS] 播放失败:', error);
                
                // 清理资源
                if (audioURL) {
                    try {
                        URL.revokeObjectURL(audioURL);
                    } catch (e) {
                        // 忽略清理错误
                    }
                    audioURL = null;
                }
                
                // 隐藏加载状态
                if (options.onLoading && typeof options.onLoading === 'function') {
                    options.onLoading(false);
                }

                // 错误处理：可以回退到文本显示或其他处理
                if (options.onError && typeof options.onError === 'function') {
                    options.onError(error);
                } else {
                    throw error;
                }
            }
        }
    }

    /**
     * 创建TTS客户端实例
     */
    const ttsClient = new TTSClient();

    /**
     * 便捷方法：直接播放TTS音频（兼容原有 playAudio 接口）
     * @param {string} text - 要合成的文本（如果以 'audio/' 开头则视为文件路径，直接播放）
     * @param {HTMLAudioElement} audioElement - 音频元素
     * @param {Function} onendedCallback - 播放完成回调
     * @param {Object} options - 可选参数
     */
    window.playTTSAudio = async function(text, audioElement, onendedCallback = null, options = {}) {
        // 如果 text 是文件路径（以 'audio/' 开头），直接使用原有方式播放
        if (typeof text === 'string' && text.startsWith('audio/')) {
            if (audioElement) {
                audioElement.src = text;
                audioElement.onended = onendedCallback;
                audioElement.play().catch(e => console.error("音频播放失败:", e));
            }
            return;
        }

        // 否则使用 TTS 合成
        await ttsClient.synthesizeAndPlay(text, audioElement, onendedCallback, options);
    };

    /**
     * 导出到全局
     */
    window.TTSClient = TTSClient;
    window.ttsClient = ttsClient;

    if (typeof console !== 'undefined') {
        console.log('[TTS] TTS客户端模块已加载');
    }

})(window);

