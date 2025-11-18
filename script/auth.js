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
                    
                    // 立即设置 token 到 API 客户端
                    if (window.apiClient) {
                        window.apiClient.setAuthToken(response.data.access_token);
                    }
                    

                    
                    return {
                        success: true,
                        data: response
                    };
                } else {
                    // 登录失败
                    return {
                        success: false,
                        message: response.msg || '登录失败，请检查用户名和密码',
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
                    // 如果是 APIError，尝试获取详细信息
                    if (error.data && error.data.msg) {
                        errorMessage = error.data.msg;
                    } else if (error.data && error.data.message) {
                        errorMessage = error.data.message;
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
            try {
                const token = this.getToken();
                const userInfo = this.getUserInfo();

                if (token && userInfo?.username && window.apiClient) {
                    // 调用登出接口
                    try {
                        await window.apiClient.post('/rorschach/user_logout', {
                            username: userInfo.username,
                            token: token
                        });
                    } catch (error) {
                        console.warn('登出接口调用失败:', error);
                        // 即使接口失败，也清除本地存储
                    }
                }

                // 清除本地存储
                this.clearToken();
                return { success: true };
            } catch (error) {
                console.error('登出失败:', error);
                // 即使出错，也清除本地存储
                this.clearToken();
                return { success: true };
            }
        }

        /**
         * 初始化认证状态（从 localStorage 恢复）
         */
        init() {
            const token = this.getToken();
            if (token && window.apiClient) {
                // 恢复 token 到 API 客户端
                window.apiClient.setAuthToken(token);
            }
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

