/**
 * 认证模块 - 登录、登出、Token管理
 * 基于 users 项目的登录功能实现
 */

(function(window) {
    'use strict';

    /**
     * 认证工具类
     */
    class Auth {
        constructor() {
            this.tokenKey = 'token';
            this.userInfoKey = 'userInfo';
        }

        /**
         * 获取 Token
         * @returns {string|null}
         */
        getToken() {
            return localStorage.getItem(this.tokenKey);
        }

        /**
         * 保存 Token
         * @param {string} token - 认证Token
         */
        setToken(token) {
            localStorage.setItem(this.tokenKey, token);
        }

        /**
         * 清除 Token
         */
        clearToken() {
            localStorage.removeItem(this.tokenKey);
            localStorage.removeItem(this.userInfoKey);
        }

        /**
         * 获取用户信息
         * @returns {Object|null}
         */
        getUserInfo() {
            const userInfo = localStorage.getItem(this.userInfoKey);
            if (userInfo) {
                try {
                    return JSON.parse(userInfo);
                } catch (e) {
                    console.error('解析用户信息失败:', e);
                    return null;
                }
            }
            return null;
        }

        /**
         * 保存用户信息
         * @param {Object} userInfo - 用户信息
         */
        setUserInfo(userInfo) {
            localStorage.setItem(this.userInfoKey, JSON.stringify(userInfo));
        }

        /**
         * 检查是否已登录
         * @returns {boolean}
         */
        isLoggedIn() {
            return !!this.getToken();
        }

        /**
         * 登录
         * @param {string} username - 用户名
         * @param {string} password - 密码
         * @returns {Promise<Object>}
         */
        async login(username, password) {
            try {
                // 等待 API 客户端加载
                let retries = 0;
                while (!window.apiClient && retries < 20) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    retries++;
                }

                if (!window.apiClient) {
                    throw new Error('API客户端未初始化，请刷新页面重试');
                }

                // 登录请求不携带认证头
                // 先清除可能存在的 Authorization header
                if (window.apiClient) {
                    window.apiClient.clearAuthToken();
                }
                
                const response = await window.apiClient.post('/rorschach/user_login', {
                    username: username,
                    password: password
                });

                if (response.code === 0 && response.data?.access_token) {
                    // 登录成功，保存 token 和用户信息
                    this.setToken(response.data.access_token);
                    this.setUserInfo({ username: username });
                    
                    // 用户登录成功后，执行租户登录以刷新 analyzeApiKey
                    if (window.API && typeof window.API.tenantLogin === 'function') {
                        const tenantResult = await window.API.tenantLogin();
                        if (!tenantResult?.success) {
                            const tenantMessage = tenantResult?.message || '租户登录失败，请稍后重试';
                            this.clearToken();
                            if (window.apiClient && typeof window.apiClient.clearAuthToken === 'function') {
                                window.apiClient.clearAuthToken();
                            }
                            return {
                                success: false,
                                message: tenantMessage,
                                data: response
                            };
                        }
                    }
                    
                    return {
                        success: true,
                        data: response
                    };
                } else {
                    // 登录失败，优先使用 exception 字段，如果没有则使用 msg 字段
                    return {
                        success: false,
                        message: response.exception || response.msg || '登录失败，请检查用户名和密码',
                        data: response
                    };
                }
            } catch (error) {
                console.error('登录请求失败:', error);
                let errorMessage = '网络请求失败，请检查网络连接';
                
                // 处理不同类型的错误
                if (error instanceof Error) {
                    errorMessage = error.message || errorMessage;
                } else if (typeof error === 'string') {
                    errorMessage = error;
                } else if (error && typeof error === 'object') {
                    // 如果是 APIError，尝试获取详细信息，优先使用 exception 字段
                    if (error.data && error.data.exception) {
                        errorMessage = error.data.exception;
                    } else if (error.data && error.data.msg) {
                        errorMessage = error.data.msg;
                    } else if (error.data && error.data.message) {
                        errorMessage = error.data.message;
                    } else if (error.exception) {
                        errorMessage = String(error.exception);
                    } else if (error.message) {
                        errorMessage = String(error.message);
                    } else if (error.msg) {
                        errorMessage = String(error.msg);
                    } else {
                        errorMessage = '登录失败，请检查用户名和密码';
                    }
                } else if (error.status) {
                    errorMessage = `请求失败: ${error.status}`;
                }
                
                return {
                    success: false,
                    message: errorMessage
                };
            }
        }

        /**
         * 登出
         * @returns {Promise<Object>}
         */
        async logout() {
            const userInfo = this.getUserInfo();
            
            // 获取 storage 中的 token
            let token = '';
            try {
                if (typeof localStorage !== 'undefined') {
                    token = localStorage.getItem('token') || '';
                }
            } catch (error) {
                console.warn('[Auth] 读取 token 失败:', error);
            }

            if (!window.apiClient) {
                throw new Error('apiClient 未初始化');
            }

            if (!token) {
                throw new Error('token 不存在');
            }

            if (!userInfo?.username) {
                throw new Error('用户信息不存在');
            }

            // 调用登出接口，Authorization header 和 body 中的 token 都使用 storage 中的 token
            await window.apiClient.post('/rorschach/user_logout', {
                username: userInfo.username,
                token: token
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // 接口成功后才清除所有本地存储
            this.clearAllStorage();
            return { success: true };
        }

        /**
         * 清除所有本地存储（包括token、userInfo、tenant_token、session等）
         */
        clearAllStorage() {
            // 在清除用户信息之前，先获取 userId 以便清除所有相关的 session key
            let userId = null;
            try {
                const userInfo = this.getUserInfo();
                userId = userInfo?.userId || userInfo?.username || null;
            } catch (error) {
                console.warn('[Auth] 获取用户信息失败:', error);
            }

            // 先清除 SessionManager 的快照和状态（需要在用户信息被清除之前）
            if (window.SessionManager) {
                try {
                    // 尝试清除当前快照
                    if (typeof window.SessionManager.clearSnapshot === 'function') {
                        window.SessionManager.clearSnapshot();
                    }
                    // 重置 SessionManager 的内部状态，防止重新创建 key
                    window.SessionManager.sessionId = null;
                    window.SessionManager.storageKey = null;
                    window.SessionManager.metaKey = null;
                    // 清除 resolver，防止在配置时重新创建 key
                    window.SessionManager.userResolver = null;
                    window.SessionManager.sessionResolver = null;
                } catch (error) {
                    console.warn('[Auth] 清除SessionManager状态失败:', error);
                }
            }

            // 清除所有session相关的存储（包括所有可能的 session key）
            try {
                if (typeof localStorage !== 'undefined') {
                    const keysToRemove = [];
                    // 先收集所有需要删除的key（避免在遍历时修改localStorage）
                    // 使用 Array.from 和 Object.keys 更安全
                    const allKeys = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key) {
                            allKeys.push(key);
                        }
                    }
                    // 筛选出所有 session 相关的 key
                    allKeys.forEach(key => {
                        if (key.startsWith('xlcs_session_') || key.startsWith('xlcs_session_meta_')) {
                            keysToRemove.push(key);
                        }
                    });
                    // 批量删除
                    keysToRemove.forEach(key => {
                        try {
                            localStorage.removeItem(key);
                        } catch (error) {
                            console.warn(`[Auth] 清除key失败: ${key}`, error);
                        }
                    });
                    if (keysToRemove.length > 0) {
                        console.log('[Auth] 已清除', keysToRemove.length, '个session存储项:', keysToRemove);
                    }
                    // 验证清除结果
                    const remainingKeys = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && (key.startsWith('xlcs_session_') || key.startsWith('xlcs_session_meta_'))) {
                            remainingKeys.push(key);
                        }
                    }
                    if (remainingKeys.length > 0) {
                        console.warn('[Auth] 警告：仍有', remainingKeys.length, '个session key未被清除:', remainingKeys);
                    }
                }
            } catch (error) {
                console.warn('[Auth] 清除session存储失败:', error);
            }

            // 清除租户token
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem('tenantAccessToken');
                }
            } catch (error) {
                console.warn('[Auth] 清除租户token失败:', error);
            }

            // 最后清除认证相关的存储（token和userInfo）
            this.clearToken();
        }

        /**
         * 初始化认证状态（从 localStorage 恢复）
         */
        init() {
            this.getToken();
        }
    }

    // 创建全局实例
    const auth = new Auth();

    // 导出到全局
    window.Auth = Auth;
    window.auth = auth;

    // 初始化 token（延迟执行，确保 apiClient 已加载）
    function initAuth() {
        if (window.apiClient && auth.getToken()) {
            auth.init();
        } else if (!window.apiClient) {
            // 等待 API 客户端加载
            setTimeout(initAuth, 100);
        }
    }
    
    // 页面加载后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuth);
    } else {
        initAuth();
    }

    if (typeof console !== 'undefined') {
        console.log('[Auth] 认证模块已加载');
    }

})(window);

