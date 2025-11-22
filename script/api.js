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
        // 从配置文件获取 baseURL
        baseURL: (typeof window !== 'undefined' && window.API_CONFIG?.baseURL) || '/api',
        
        timeout: 30000,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Id': 'Bubble_Lis'
        },
        // 分析接口使用的固定 API Key
        analyzeApiKey: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkb25ncml4aW55dSIsImV4cCI6MTc2MzgxODkwOX0.1UceWZ7pl3MmunjP-XQj9gbNBDcwTUQ0B5NMPOIihZo"
    };

    const TENANT_TOKEN_STORAGE_KEY = 'tenantAccessToken';
    const DEFAULT_TENANT_CREDENTIALS = {
        username: 'dongrixinyu',
        password: '12345678'
    };

    function getStoredTenantToken() {
        if (typeof localStorage === 'undefined') {
            return '';
        }
        try {
            return localStorage.getItem(TENANT_TOKEN_STORAGE_KEY) || '';
        } catch (error) {
            console.warn('[API] 读取租户 token 失败:', error);
            return '';
        }
    }

    function storeTenantToken(token) {
        if (typeof localStorage === 'undefined') {
            return;
        }
        try {
            if (token) {
                localStorage.setItem(TENANT_TOKEN_STORAGE_KEY, token);
            } else {
                localStorage.removeItem(TENANT_TOKEN_STORAGE_KEY);
            }
        } catch (error) {
            console.warn('[API] 保存租户 token 失败:', error);
        }
    }

    function applyAnalyzeApiKey(token) {
        if (!token) {
            return;
        }
        API_CONFIG.analyzeApiKey = token;
        const client = (typeof window !== 'undefined' && window.apiClient) || null;
        if (client?.axiosInstance) {
            client.axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
        }
    }

    function setTenantToken(token) {
        if (!token) {
            return;
        }
        applyAnalyzeApiKey(token);
        storeTenantToken(token);
    }

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
                headers: this.config.headers,
                // 确保 FormData 被正确处理
                transformRequest: [(data, headers) => {
                    // 如果是 FormData，直接返回，不进行任何转换
                    if (data instanceof FormData) {
                        return data;
                    }
                    // 如果是普通对象，且 Content-Type 是 application/json，则序列化为 JSON
                    if (data && typeof data === 'object' && headers && headers['Content-Type'] === 'application/json') {
                        return JSON.stringify(data);
                    }
                    // 其他情况使用默认处理（axios 会自动处理）
                    return data;
                }]
            });
            
            // 设置请求拦截器
            this.axiosInstance.interceptors.request.use(
                (config) => {
                    // 确保 headers 对象存在
                    if (!config.headers) {
                        config.headers = {};
                    }
                    
                    const requestUrl = config.url || '';
                    const isUserLoginRequest = requestUrl.includes('/user_login');
                    const isTenantLoginRequest = requestUrl.includes('/admin_login');
                    const hasCustomAuthorization = !!config.headers.Authorization;

                    // 登录相关请求不自动附加 Authorization
                    if (isUserLoginRequest || isTenantLoginRequest) {
                        delete config.headers.Authorization;
                    } else if (!hasCustomAuthorization) {
                        // 默认使用 analyzeApiKey
                        config.headers.Authorization = `Bearer ${API_CONFIG.analyzeApiKey}`;
                    }
                    
                    // 确保所有自定义 headers 都被正确设置（特别是 FormData 请求）
                    // 对于 FormData 请求，需要确保 headers 被正确传递
                    if (config.data instanceof FormData) {
                        // FormData 时，确保自定义 headers 被保留
                        // axios 会自动处理 Content-Type，但其他 headers 需要手动设置
                        if (config.headers && Object.keys(config.headers).length > 0) {
                            // 确保 headers 对象是普通对象，而不是 axios 的特殊对象
                            const headers = { ...config.headers };
                            // 删除 Content-Type，让浏览器自动设置
                            delete headers['Content-Type'];
                            config.headers = headers;
                        }
                    }
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
                        console.log('[API] 错误状态码:', status);
                        
                        // 401 未授权，清除 token 并跳转登录
                        if (status === 401) {
                            // localStorage.removeItem('token');
                            // localStorage.removeItem('userInfo');
                            // 如果不在登录页，且不是提交测试数据的情况，才跳转到登录页
                            // 提交测试数据时即使401也不跳转，让用户看到汇总页面
                            const url = error.config?.url || '';
                            const isSubmittingTestData = url.includes('upload_scale')||url.includes('upload_rotate') || 
                                                         url.includes('upload_seg_time') ||
                                                         url.includes('upload_media') ||
                                                         url.includes('analyze');
                            const isOnLoginPage = window.location.pathname.includes('login.html');
                            const isOnSummaryPage = window.location.pathname.includes('index.html') && 
                                                   (document.getElementById('summary-view')?.style.display !== 'none');
                            
                            // 只有在非登录页、非汇总页、且不是提交测试数据时才跳转
                            if (!isOnLoginPage && !isSubmittingTestData && !isOnSummaryPage) {
                                // window.location.href = './login.html';
                            }
                        }
                        
                        // 提取错误消息，优先使用 msg，然后是 message，最后是 statusText
                        const errorMessage = errorData.msg || 
                                            errorData.message || 
                                            errorData.exception ||
                                            error.message || 
                                            `请求失败: ${error.response.statusText}`;
                        
                        throw new APIError(
                            errorMessage,
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

            // 先初始化 headers，确保自定义 headers 能被正确传递
            // 过滤掉 undefined 值
            const cleanOptionsHeaders = {};
            if (options.headers) {
                Object.keys(options.headers).forEach(key => {
                    if (options.headers[key] !== undefined) {
                        cleanOptionsHeaders[key] = options.headers[key];
                    }
                });
            }
            
            config.headers = {
                ...this.config.headers,
                ...cleanOptionsHeaders
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
                    if (data instanceof FormData) {
                        // FormData 时，删除 Content-Type，让浏览器自动设置
                        delete config.headers['Content-Type'];
                        // 确保 axios 正确处理 FormData，不进行序列化
                        // 确保 transformRequest 不会处理 FormData
                        if (!config.transformRequest || !Array.isArray(config.transformRequest)) {
                            config.transformRequest = [(data) => {
                                if (data instanceof FormData) {
                                    return data;
                                }
                                return data;
                            }];
                        }
                    }
                }
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
    if (typeof window !== 'undefined') {
        window.apiClient = apiClient;
    }
    const cachedTenantToken = getStoredTenantToken();
    if (cachedTenantToken) {
        applyAnalyzeApiKey(cachedTenantToken);
    }

    /**
     * 业务接口方法
     */
    const API = {
        /**
         * 用户登出
         * @returns {Promise} 请求Promise
         */
        async logout() {
            try {
                const userInfo = window.auth ? window.auth.getUserInfo() : null;
                const token = window.auth ? window.auth.getToken() : null;
                
                // 调用登出接口
                const response = await apiClient.post('/rorschach/user_logout', {
                    username: userInfo?.username || '',
                    token: token || ''
                });
                
                return response;
            } catch (error) {
                console.error('[API] 登出失败:', error);
                throw error;
            }
        },

        /**
         * 租户登录（管理员登录），用于刷新 analyzeApiKey
         * @param {Object} credentials - 自定义租户凭证
         * @returns {Promise<{success: boolean, message?: string, data?: Object, error?: Error}>}
         */
        async tenantLogin(credentials = DEFAULT_TENANT_CREDENTIALS) {
            const payload = {
                username: credentials?.username || DEFAULT_TENANT_CREDENTIALS.username,
                password: credentials?.password || DEFAULT_TENANT_CREDENTIALS.password
            };

            try {
                const response = await apiClient.post('/rorschach/admin_login', payload);
                if (response.code === 0 && response.data?.access_token) {
                    setTenantToken(response.data.access_token);
                    return {
                        success: true,
                        data: response
                    };
                }
                return {
                    success: false,
                    message: response.msg || '租户登录失败',
                    data: response
                };
            } catch (error) {
                console.error('[API] 租户登录失败:', error);
                return {
                    success: false,
                    message: error.message || '租户登录请求失败',
                    error
                };
            }
        },

        /**
         * 提交完整的测试数据（包括交互数据、音频、时间戳等）
         * @param {Object} testData - 完整的测试数据
         * @returns {Promise} 请求Promise
         */
        async submitCompleteTestData(testData) {
            return apiClient.axiosInstance.post('/test/complete', testData);
        },

        /**
         * 获取用户基本信息
         * @param {string} userId - 用户ID（可选）
         * @returns {Promise} 请求Promise
         */
        async getBasicInfo(userId = null) {
            // 准备请求数据
            const requestData = {};
            if (userId) {
                requestData.user_id = userId;
            }
            
            return apiClient.axiosInstance.post('/rorschach/analyze/get_basic_info', requestData);
        },

        /**
         * 上传旋转度文件
         * @param {Object} rotateData - 旋转数据对象 { "1": 0, "2": 4, "3": 22, ... }
         * @param {string} userId - 用户ID
         * @returns {Promise} 请求Promise
         */
        async uploadRotate(rotateData, userId) {
            if (!rotateData || typeof rotateData !== 'object') {
                throw new Error('旋转数据参数无效');
            }
            
            // 检查数据是否为空
            const hasData = Object.keys(rotateData).length > 0;
            if (!hasData) {
                console.warn('[API] 旋转数据为空对象');
            }
            
            console.log('[API] 上传旋转数据:', {
                data: rotateData,
                dataKeys: Object.keys(rotateData),
                userId: userId
            });
            
            // 准备表单数据
            const formData = new FormData();
            
            // 将 JSON 数据转换为 Blob，然后添加到 FormData
            const jsonString = JSON.stringify(rotateData);
            console.log('[API] JSON字符串长度:', jsonString.length);
            
            if (jsonString.length === 2) { // 只有 "{}"
                throw new Error('旋转数据为空，无法上传');
            }
            
            const blob = new Blob([jsonString], { type: 'application/json' });
            console.log('[API] Blob大小:', blob.size, 'bytes');
            
            // 创建 File 对象（兼容性处理）
            let file;
            if (typeof File !== 'undefined') {
                file = new File([blob], 'rotate.json', { type: 'application/json' });
            } else {
                // 降级到 Blob
                file = blob;
            }
            
            console.log('[API] File对象:', {
                name: file.name || 'rotate.json',
                size: file.size,
                type: file.type
            });
            
            // 添加文件到 FormData
            formData.append('file', file, 'rotate.json');
            
            
            // 验证 FormData
            console.log('[API] FormData验证:', {
                hasFile: formData.has('file'),
                hasUserId: formData.has('user_id'),
                fileValue: formData.get('file'),
                userIdValue: formData.get('user_id'),
                fileSize: file.size
            });
            
            return apiClient.post('/rorschach/analyze/upload_rotate', formData);
        },

        /**
         * 上传放大缩小数据
         * @param {Object} zoomData - 放大缩小数据对象 { "1": [1, 1, -1], "2": [], ... }
         * @param {string} userId - 用户ID
         * @returns {Promise} 请求Promise
         */
        async uploadZoom(zoomData, userId) {
            if (!zoomData || typeof zoomData !== 'object') {
                throw new Error('放大缩小数据参数无效');
            }
            
            console.log('[API] 上传放大缩小数据:', {
                data: zoomData,
                userId: userId
            });
            
            // 准备表单数据
            const formData = new FormData();
            
            // 将 JSON 数据转换为 Blob，然后添加到 FormData
            const jsonString = JSON.stringify(zoomData);
            console.log('[API] Zoom JSON字符串长度:', jsonString.length);
            
            const blob = new Blob([jsonString], { type: 'application/json' });
            console.log('[API] Zoom Blob大小:', blob.size, 'bytes');
            
            const file = new File([blob], 'scale.json', { type: 'application/json' });
            console.log('[API] Zoom File对象:', {
                name: file.name,
                size: file.size,
                type: file.type
            });
            
            // 添加文件到 FormData
            formData.append('file', file, 'scale.json');
            
            // 验证 FormData
            console.log('[API] Zoom FormData验证:', {
                hasFile: formData.has('file'),
                hasUserId: formData.has('user_id'),
                fileValue: formData.get('file'),
                userIdValue: formData.get('user_id'),
                fileSize: file.size
            });
            
            return apiClient.post('/rorschach/analyze/upload_scale', formData);
        },

        /**
         * 上传时间戳切分文件
         * @param {Object} segTimeData - 时间戳数据对象
         * @param {string} userId - 用户ID
         * @returns {Promise} 请求Promise
         */
        async uploadSegTime(segTimeData, userId) {
            if (!segTimeData || typeof segTimeData !== 'object') {
                throw new Error('时间戳数据参数无效');
            }
            
            console.log('[API] 上传时间戳数据:', {
                data: segTimeData,
                userId: userId
            });
            
            // 准备表单数据
            const formData = new FormData();
            
            // 将 JSON 数据转换为 Blob，然后添加到 FormData
            const jsonString = JSON.stringify(segTimeData);
            console.log('[API] SegTime JSON字符串长度:', jsonString.length);
            
            const blob = new Blob([jsonString], { type: 'application/json' });
            console.log('[API] SegTime Blob大小:', blob.size, 'bytes');
            
            const file = new File([blob], 'video_clip.json', { type: 'application/json' });
            console.log('[API] SegTime File对象:', {
                name: file.name,
                size: file.size,
                type: file.type
            });
            
            // 添加文件到 FormData
            formData.append('file', file, 'video_clip.json');
            
            // 验证 FormData
            console.log('[API] SegTime FormData验证:', {
                hasFile: formData.has('file'),
                hasUserId: formData.has('user_id'),
                fileValue: formData.get('file'),
                userIdValue: formData.get('user_id')
            });
            
            return apiClient.post('/rorschach/analyze/upload_seg_time', formData);
        },

        /**
         * 上传音/视频文件
         * @param {Blob|File} file - 音频或视频文件
         * @param {string} userId - 用户ID（可选）
         * @returns {Promise} 请求Promise
         */
        async uploadMedia(file, userId = null) {
            // 确保文件有正确的文件名和类型
            let fileToUpload = file;
            
            // 如果是 Blob，需要转换为 File 对象并确保有正确的扩展名
            if (file instanceof Blob && !(file instanceof File)) {
                // 根据 MIME 类型确定文件扩展名
                let extension = '';
                if (file.type === 'audio/mpeg' || file.type === 'audio/mp3') {
                    extension = '.mp3';
                } else if (file.type === 'audio/mp4' || file.type === 'audio/m4a') {
                    extension = '.mp4';
                } else if (file.type === 'video/mp4') {
                    extension = '.mp4';
                } else if (file.type.startsWith('audio/')) {
                    // 其他音频格式，默认使用 .mp3
                    extension = '.mp3';
                } else if (file.type.startsWith('video/')) {
                    // 其他视频格式，默认使用 .mp4
                    extension = '.mp4';
                } else {
                    // 如果无法确定类型，根据已有文件名或默认使用 .mp3
                    extension = '.mp3';
                }
                
                // 创建 File 对象
                const fileName = file.name || `audio${extension}`;
                fileToUpload = new File([file], fileName, { type: file.type || 'audio/mpeg' });
            } else if (file instanceof File) {
                // 如果是 File 对象，确保文件名有正确的扩展名
                const fileName = file.name;
                const hasValidExtension = fileName.toLowerCase().endsWith('.mp3') || 
                                         fileName.toLowerCase().endsWith('.mp4');
                
                if (!hasValidExtension) {
                    // 根据 MIME 类型添加扩展名
                    let extension = '';
                    if (file.type === 'audio/mpeg' || file.type === 'audio/mp3') {
                        extension = '.mp3';
                    } else if (file.type === 'audio/mp4' || file.type === 'audio/m4a' || file.type === 'video/mp4') {
                        extension = '.mp4';
                    } else {
                        extension = '.mp3'; // 默认
                    }
                    
                    const newFileName = fileName.includes('.') 
                        ? fileName.replace(/\.[^.]+$/, extension)
                        : fileName + extension;
                    fileToUpload = new File([file], newFileName, { type: file.type || 'audio/mpeg' });
                }
            }
            
            // 验证文件类型
            const fileName = fileToUpload.name.toLowerCase();
            const isValidFormat = fileName.endsWith('.mp3') || fileName.endsWith('.mp4');
            if (!isValidFormat) {
                throw new Error('只支持上传MP3/MP4格式文件');
            }
            
            const formData = new FormData();
            formData.append('file', fileToUpload);
            

            return apiClient.post('/rorschach/analyze/upload_media', formData);
        },

        /**
         * 下载测试报告
         * @param {string} userId - 用户ID
         * @returns {Promise} 请求Promise，返回PDF文件Blob
         */
        async downloadReport(userId) {
            if (!userId) {
                throw new Error('用户ID不能为空');
            }
            
            try {
                // 从 localStorage 获取用户 token
                const token = typeof localStorage !== 'undefined' 
                    ? localStorage.getItem('token') 
                    : null;
                
                const headers = {
                    'Accept': 'application/pdf, application/octet-stream'
                };
                
                // 如果存在 token，添加到 Authorization 头
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                const response = await apiClient.post('/rorschach/user/get_report', 
                    { user_id: userId }, 
                    {
                        responseType: 'blob',
                        timeout: 300000, // 5分钟超时
                        headers: headers
                    }
                );
                
                return response;
            } catch (error) {
                console.error('[API] 下载报告失败:', error);
                throw error;
            }
        },

        /**
         * 用户注册
         * @param {string} username - 用户名
         * @param {string} password - 密码
         * @returns {Promise} 请求Promise
         */
        async register(username, password) {
            if (!username || !password) {
                throw new Error('用户名和密码不能为空');
            }
            
            try {
                // 注册请求不携带认证头
                // 先清除可能存在的 Authorization header
                if (window.apiClient) {
                    window.apiClient.clearAuthToken();
                }
                
                const response = await apiClient.post('/rorschach/user_register', {
                    username: username,
                    password: password
                });
                
                return response;
            } catch (error) {
                console.error('[API] 注册失败:', error);
                throw error;
            }
        },

        /**
         * 设置用户基本信息
         * @param {string} userId - 用户ID
         * @param {Object} basicInfo - 基本信息对象
         * @returns {Promise} 请求Promise
         */
        async setBasicInfo(userId, basicInfo) {
            if (!userId) {
                throw new Error('用户ID不能为空');
            }
            
            if (!basicInfo || typeof basicInfo !== 'object') {
                throw new Error('基本信息参数无效');
            }
            
            try {
                const requestData = {
                    user_id:userId,
                    basic_info: basicInfo
                };
                
                const response = await apiClient.post('/rorschach/analyze/set_basic_info', requestData);
                return response;
            } catch (error) {
                console.error('[API] 设置用户基本信息失败:', error);
                throw error;
            }
        }
    };

    /**
     * 测试数据提交辅助函数
     * 用于在测试完成后整理并提交所有数据
     * 根据新的后端接口，分别提交旋转数据和时间戳数据
     */
    window.submitTestDataToServer = async function(interactionTracker, audioBlob = null, postTestAnswers = {}) {
        try {
            // 获取用户ID（优先从get_basic_info接口获取的userId，其次从用户名）
            let userId = 'unknown';
            const userInfo = window.auth ? window.auth.getUserInfo() : null;
            
            if (userInfo?.userId) {
                // 使用从get_basic_info接口获取的userId
                userId = String(userInfo.userId);
                console.log('[API] 使用保存的 userId:', userId);
            } else if (userInfo?.username) {
                // 降级使用用户名
                userId = userInfo.username;
                console.warn('[API] userId 不存在，降级使用用户名:', userId);
            } else {
                console.error('[API] 无法获取用户ID，userInfo:', userInfo);
                throw new Error('用户ID不存在，请先登录');
            }

            console.log('[API] 开始提交测试数据，用户ID:', userId, 'userInfo:', userInfo);
            console.log('[API] interactionTracker:', interactionTracker);

            const results = {
                zoom: null,
                rotate: null,
                segTime: null,
                media: null
            };

            // 1. 提交放大缩小数据
            if (interactionTracker && typeof interactionTracker.submitZoomData === 'function') {
                try {
                    console.log('[API] 开始提交放大缩小数据...');
                    results.zoom = await interactionTracker.submitZoomData(userId);
                    console.log('[API] 放大缩小数据提交结果:', results.zoom);
                } catch (error) {
                    console.error('[API] 放大缩小数据提交失败:', error);
                    results.zoom = { success: false, error: error.message || '提交失败' };
                }
            } else {
                console.error('[API] interactionTracker.submitZoomData 方法不存在', {
                    hasTracker: !!interactionTracker,
                    methods: interactionTracker ? Object.keys(interactionTracker) : []
                });
            }

            // 2. 提交旋转数据
            if (interactionTracker && typeof interactionTracker.submitRotateData === 'function') {
                try {
                    console.log('[API] 开始提交旋转数据...');
                    results.rotate = await interactionTracker.submitRotateData(userId);
                    console.log('[API] 旋转数据提交结果:', results.rotate);
                } catch (error) {
                    console.error('[API] 旋转数据提交失败:', error);
                    results.rotate = { success: false, error: error.message || '提交失败' };
                }
            } else {
                console.error('[API] interactionTracker.submitRotateData 方法不存在', {
                    hasTracker: !!interactionTracker,
                    methods: interactionTracker ? Object.keys(interactionTracker) : []
                });
            }

            // 3. 提交时间戳数据
            if (interactionTracker && typeof interactionTracker.submitSegTimeData === 'function') {
                try {
                    console.log('[API] 开始提交时间戳数据...');
                    results.segTime = await interactionTracker.submitSegTimeData(userId);
                    console.log('[API] 时间戳数据提交结果:', results.segTime);
                } catch (error) {
                    console.error('[API] 时间戳数据提交失败:', error);
                    results.segTime = { success: false, error: error.message || '提交失败' };
                }
            } else {
                console.error('[API] interactionTracker.submitSegTimeData 方法不存在', {
                    hasTracker: !!interactionTracker,
                    methods: interactionTracker ? Object.keys(interactionTracker) : []
                });
            }

            // 4. 提交音频文件（优先使用录制器导出的MP3）
            let audioFileToUpload = audioBlob;
            
            // 如果录制器有数据，优先使用录制器导出的MP3
            if (window.AudioRecorder && window.AudioRecorder._instance) {
                try {
                    const status = window.AudioRecorder.getStatus();
                    if (status.bufferCount > 0) {
                        console.log('[API] 开始导出录制器音频为MP3...');
                        window.AudioRecorder.stop();
                        audioFileToUpload = await window.AudioRecorder.exportMP3();
                        console.log('[API] MP3导出成功，大小:', audioFileToUpload.size, 'bytes');
                    }
                } catch (error) {
                    console.error('[API] 导出录制器音频失败:', error);
                    // 如果导出失败，继续使用原有的audioBlob
                }
            }
            
            if (audioFileToUpload && API.uploadMedia) {
                try {
                    results.media = await API.uploadMedia(audioFileToUpload, userId);
                    console.log('[API] 音频文件提交结果:', results.media);
                } catch (error) {
                    console.error('[API] 音频文件提交失败:', error);
                    results.media = { success: false, error: error.message };
                }
            }

            // 返回所有提交结果
            const allSuccess = (results.zoom === null || results.zoom?.success) &&
                              (results.rotate === null || results.rotate?.success) &&
                              (results.segTime === null || results.segTime?.success);
            
            console.log('[API] 所有数据提交完成:', {
                success: allSuccess,
                zoom: results.zoom?.success,
                rotate: results.rotate?.success,
                segTime: results.segTime?.success,
                media: results.media?.success
            });

            return {
                success: allSuccess,
                results: results,
                userId: userId
            };
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
    window.API_CONFIG = API_CONFIG; // 导出配置供其他模块使用

    if (typeof console !== 'undefined') {
        console.log('[API] API模块已加载');
    }

})(window);