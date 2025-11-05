/**
 * 罗夏墨迹测试 - API 接口模块
 * 用于与后端进行数据交互
 */

(function(window) {
    'use strict';

    /**
     * API 配置
     */
    const API_CONFIG = {
        // 方案一（推荐）：使用代理服务器 - 运行 npm run dev
        baseURL: '/api',
        
        // 方案二：直接访问后端（需要后端支持CORS）
        // baseURL: 'http://localhost:3000/api',
        
        // 生产环境（部署时修改）
        // baseURL: 'https://your-domain.com/api',
        
        timeout: 30000,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };

    /**
     * API 客户端类
     */
    class APIClient {
        constructor(config = {}) {
            this.config = { ...API_CONFIG, ...config };
            
            // 检查 axios 是否可用
            if (typeof axios === 'undefined') {
                throw new Error('axios 未加载，请确保已引入 axios 库');
            }
            
            // 创建 axios 实例
            this.axiosInstance = axios.create({
                baseURL: this.config.baseURL,
                timeout: this.config.timeout,
                headers: this.config.headers
            });
            
            // 设置请求拦截器
            this.axiosInstance.interceptors.request.use(
                (config) => {
                    // 可以在这里添加请求前的处理
                    return config;
                },
                (error) => {
                    return Promise.reject(error);
                }
            );
            
            // 设置响应拦截器
            this.axiosInstance.interceptors.response.use(
                (response) => {
                    // 直接返回数据
                    return response.data;
                },
                (error) => {
                    // 统一处理错误
                    if (error.response) {
                        // 服务器返回了错误状态码
                        const status = error.response.status;
                        const errorData = error.response.data || {};
                        throw new APIError(
                            errorData.message || error.message || `请求失败: ${error.response.statusText}`,
                            status,
                            errorData
                        );
                    } else if (error.request) {
                        // 请求已发出但没有收到响应
                        throw new APIError('网络请求失败，请检查网络连接', 0, { originalError: error });
                    } else {
                        // 请求配置出错
                        throw new APIError(error.message || '请求配置错误', 0, { originalError: error });
                    }
                }
            );
        }

        /**
         * 设置请求头
         * @param {string} key - 请求头键
         * @param {string} value - 请求头值
         */
        setHeader(key, value) {
            this.axiosInstance.defaults.headers.common[key] = value;
        }

        /**
         * 设置认证Token
         * @param {string} token - 认证Token
         */
        setAuthToken(token) {
            this.setHeader('Authorization', `Bearer ${token}`);
        }

        /**
         * 清除认证Token
         */
        clearAuthToken() {
            delete this.axiosInstance.defaults.headers.common['Authorization'];
        }

        /**
         * 通用请求方法
         * @param {string} method - HTTP方法
         * @param {string} endpoint - 接口端点
         * @param {Object} data - 请求数据
         * @param {Object} options - 额外选项
         * @returns {Promise} 请求Promise
         */
        async request(method, endpoint, data = null, options = {}) {
            const config = {
                method: method.toUpperCase(),
                url: endpoint,
                ...options
            };

            // 根据请求方法设置数据
            if (method.toUpperCase() === 'GET' || method.toUpperCase() === 'HEAD' || method.toUpperCase() === 'DELETE') {
                // GET/HEAD/DELETE 请求使用 params
                if (data) {
                    config.params = data;
                }
            } else {
                // POST/PUT 请求使用 data
                if (data) {
                    config.data = data;
                    // 如果是 FormData，让 axios 自动设置 Content-Type
                    if (data instanceof FormData) {
                        config.headers = {
                            ...config.headers,
                            'Content-Type': 'multipart/form-data'
                        };
                    }
                }
            }

            // 合并额外的请求头
            if (options.headers) {
                config.headers = { ...config.headers, ...options.headers };
            }

            try {
                return await this.axiosInstance.request(config);
            } catch (error) {
                // 错误已经在拦截器中处理，这里直接抛出
                throw error;
            }
        }

        /**
         * GET 请求
         * @param {string} endpoint - 接口端点
         * @param {Object} params - 查询参数
         * @param {Object} options - 额外选项
         * @returns {Promise} 请求Promise
         */
        get(endpoint, params = null, options = {}) {
            return this.request('GET', endpoint, params, options);
        }

        /**
         * POST 请求
         * @param {string} endpoint - 接口端点
         * @param {Object} data - 请求数据
         * @param {Object} options - 额外选项
         * @returns {Promise} 请求Promise
         */
        post(endpoint, data = null, options = {}) {
            return this.request('POST', endpoint, data, options);
        }

        /**
         * PUT 请求
         * @param {string} endpoint - 接口端点
         * @param {Object} data - 请求数据
         * @param {Object} options - 额外选项
         * @returns {Promise} 请求Promise
         */
        put(endpoint, data = null, options = {}) {
            return this.request('PUT', endpoint, data, options);
        }

        /**
         * DELETE 请求
         * @param {string} endpoint - 接口端点
         * @param {Object} data - 请求数据
         * @param {Object} options - 额外选项
         * @returns {Promise} 请求Promise
         */
        delete(endpoint, data = null, options = {}) {
            return this.request('DELETE', endpoint, data, options);
        }

        /**
         * 上传文件
         * @param {string} endpoint - 接口端点
         * @param {File|Blob} file - 要上传的文件
         * @param {Object} additionalData - 额外的表单数据
         * @param {Function} onProgress - 上传进度回调 (percent, loaded, total)
         * @returns {Promise} 请求Promise
         */
        async uploadFile(endpoint, file, additionalData = {}, onProgress = null) {
            const formData = new FormData();
            formData.append('file', file);
            
            // 添加额外数据
            Object.keys(additionalData).forEach(key => {
                if (additionalData[key] !== null && additionalData[key] !== undefined) {
                    formData.append(key, additionalData[key]);
                }
            });

            const config = {
                url: endpoint,
                method: 'POST',
                data: formData,
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            };

            // 如果提供了进度回调，添加 onUploadProgress
            if (onProgress && typeof onProgress === 'function') {
                config.onUploadProgress = (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = (progressEvent.loaded / progressEvent.total) * 100;
                        onProgress(percent, progressEvent.loaded, progressEvent.total);
                    }
                };
            }

            try {
                return await this.axiosInstance.request(config);
            } catch (error) {
                // 错误已经在拦截器中处理，这里直接抛出
                throw error;
            }
        }
    }

    /**
     * API 错误类
     */
    class APIError extends Error {
        constructor(message, status = 0, data = null) {
            super(message);
            this.name = 'APIError';
            this.status = status;
            this.data = data;
        }

        /**
         * 是否为网络错误
         * @returns {boolean}
         */
        isNetworkError() {
            return this.status === 0;
        }

        /**
         * 是否为客户端错误（4xx）
         * @returns {boolean}
         */
        isClientError() {
            return this.status >= 400 && this.status < 500;
        }

        /**
         * 是否为服务器错误（5xx）
         * @returns {boolean}
         */
        isServerError() {
            return this.status >= 500;
        }
    }

    /**
     * 创建API客户端实例
     */
    const apiClient = new APIClient();

    /**
     * 业务接口方法
     */
    const API = {
        /**
         * 提交完整的测试数据（包括交互数据、音频、时间戳等）
         * @param {Object} testData - 完整的测试数据
         * @returns {Promise} 请求Promise
         */
        async submitCompleteTestData(testData) {
            return apiClient.post('/test/complete', testData);
        },
    };

    /**
     * 测试数据提交辅助函数
     * 用于在测试完成后整理并提交所有数据
     */
    window.submitTestDataToServer = async function(interactionTracker, audioBlob = null, postTestAnswers = {}) {
        try {
            // 收集所有测试数据
            const testData = {
                // 测试基本信息
                timestamp: new Date().toISOString(),
                testStartTime: interactionTracker.testStartTime ? new Date(interactionTracker.testStartTime).toISOString() : null,
                testEndTime: new Date().toISOString(),
                
                // 交互追踪数据
                interactionData: interactionTracker.getAllData({
                    includeStats: true,
                    includeMetadata: true
                }),
                
                // 旋转次数统计
                rotationCounts: interactionTracker.getRotationCounts(),
                
                // 画笔轨迹数据
                drawingTracks: interactionTracker.getDrawingTracks(),
                
                // 时间戳数据
                timestamps: {
                    relative: interactionTracker.getAudioTimestamps(),
                    absolute: interactionTracker.getAbsoluteTimestamps()
                },
                
                // 后测试答案
                postTestAnswers: postTestAnswers,
                
                // 完整统计数据
                statistics: interactionTracker.printAllPlatesStatistics ? (() => {
                    // 获取统计信息的辅助函数
                    const allPlatesStats = {
                        plates: {},
                        global: {}
                    };
                    for (let i = 1; i <= 10; i++) {
                        allPlatesStats.plates[String(i)] = interactionTracker.getStatistics(i);
                    }
                    allPlatesStats.global = interactionTracker.getStatistics();
                    return allPlatesStats;
                })() : null
            };

            // 提交测试数据
            const result = await API.submitCompleteTestData(testData);
            return result;
        } catch (error) {
            console.error('[API] 提交测试数据失败:', error);
            throw error;
        }
    };

    /**
     * 导出到全局
     */
    window.API = API;
    window.APIClient = APIClient;
    window.APIError = APIError;
    window.apiClient = apiClient;

    if (typeof console !== 'undefined') {
        console.log('[API] API模块已加载');
    }

})(window);

