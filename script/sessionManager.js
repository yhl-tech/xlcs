(function(window) {
    'use strict';

    const STORAGE_PREFIX = 'xlcs_session_';
    const META_PREFIX = 'xlcs_session_meta_';

    class SessionManager {
        constructor() {
            this.userResolver = null;
            this.sessionResolver = null;
            this.sessionId = null;
            this.storageKey = null;
            this.metaKey = null;
        }

        /**
         * 配置 SessionManager
         * @param {Object} options
         * @param {Function} options.getUserId - 返回当前用户ID/用户名的函数
         */
        configure(options = {}) {
            this.userResolver = typeof options.getUserId === 'function' ? options.getUserId : null;
            this.sessionResolver = typeof options.getSessionId === 'function' ? options.getSessionId : null;
            this.storageKey = null;
            this.metaKey = null;
            this._ensureStorageKey();
        }

        setSessionId(sessionId) {
            if (sessionId && sessionId !== this.sessionId) {
                this.sessionId = sessionId;
                this.storageKey = null;
                this._ensureStorageKey();
                this._saveMeta(sessionId);
            }
        }

        _resolve(resolver) {
            if (!resolver) return null;
            try {
                return resolver();
            } catch (error) {
                console.warn('[SessionManager] 解析 resolver 失败:', error);
                return null;
            }
        }

        /**
         * 更新并返回存储 key
         * @returns {string|null}
         */
        _ensureStorageKey() {
            const userId = this._resolve(this.userResolver);
            if (!userId) {
                this.storageKey = null;
                return this.storageKey;
            }

            this.metaKey = `${META_PREFIX}${userId}`;

            if (!this.sessionId) {
                const cached = this._loadMeta();
                if (cached && cached.sessionId) {
                    this.sessionId = cached.sessionId;
                }
            }

            let sessionId = this.sessionId || this._resolve(this.sessionResolver);
            if (!sessionId) {
                sessionId = 'default';
            }

            this.storageKey = `${STORAGE_PREFIX}${userId}_${sessionId}`;
            this.sessionId = sessionId;
            return this.storageKey;
        }

        /**
         * 获取当前存储 key
         * @returns {string|null}
         */
        _getStorageKey() {
            return this.storageKey || this._ensureStorageKey();
        }

        _loadMeta() {
            if (!this.metaKey) {
                return null;
            }
            try {
                const raw = localStorage.getItem(this.metaKey);
                return raw ? JSON.parse(raw) : null;
            } catch (error) {
                console.warn('[SessionManager] 读取 Meta 失败:', error);
                return null;
            }
        }

        _saveMeta(sessionId) {
            if (!this.metaKey || !sessionId) {
                return;
            }
            try {
                const payload = {
                    sessionId,
                    updatedAt: Date.now()
                };
                localStorage.setItem(this.metaKey, JSON.stringify(payload));
            } catch (error) {
                console.warn('[SessionManager] 保存 Meta 失败:', error);
            }
        }

        _clearMeta() {
            if (!this.metaKey) {
                return;
            }
            try {
                localStorage.removeItem(this.metaKey);
            } catch (error) {
                console.warn('[SessionManager] 清除 Meta 失败:', error);
            }
        }

        isReady() {
            return Boolean(this._getStorageKey());
        }

        /**
         * 保存快照
         * @param {Object} snapshot
         * @returns {boolean}
         */
        saveSnapshot(snapshot) {
            const key = this._getStorageKey();
            if (!key || !snapshot) {
                return false;
            }
            try {
                const payload = {
                    ...snapshot,
                    updatedAt: snapshot.updatedAt || Date.now()
                };
                localStorage.setItem(key, JSON.stringify(payload));
                this._saveMeta(payload.sessionId || this.sessionId);
                return true;
            } catch (error) {
                console.warn('[SessionManager] 保存失败:', error);
                return false;
            }
        }

        /**
         * 加载快照
         * @returns {Object|null}
         */
        loadSnapshot() {
            const key = this._getStorageKey();
            if (!key) {
                return null;
            }
            try {
                const raw = localStorage.getItem(key);
                if (!raw) {
                    return null;
                }
                return JSON.parse(raw);
            } catch (error) {
                console.warn('[SessionManager] 读取失败:', error);
                return null;
            }
        }

        hasSnapshot() {
            return !!this.loadSnapshot();
        }

        /**
         * 清除快照
         */
        clearSnapshot() {
            const key = this._getStorageKey();
            if (!key) {
                return;
            }
            try {
                localStorage.removeItem(key);
                this._clearMeta();
            } catch (error) {
                console.warn('[SessionManager] 清除失败:', error);
            }
        }

        /**
         * 标记当前 session 已完成
         * @returns {boolean}
         */
        markCompleted() {
            const snapshot = this.loadSnapshot();
            if (!snapshot) {
                return false;
            }
            snapshot.completed = true;
            return this.saveSnapshot(snapshot);
        }

        getSessionId() {
            if (this.sessionId) {
                return this.sessionId;
            }
            const meta = this._loadMeta();
            return meta?.sessionId || null;
        }
    }

    window.SessionManager = new SessionManager();
})(window);

