/**
 * 罗夏墨迹测试 - 交互追踪系统
 * 用于追踪用户在测试过程中的所有交互操作
 */

(function(window) {
    'use strict';

    /**
     * 交互追踪器主类
     */
    class InteractionTracker {
        constructor() {
            // 核心数据结构
            this.data = {
                zoom: {},      // 放大缩小操作: { "1": [1, 1, -1], "2": [], ... }
                rotate: {},    // 旋转操作: { "1": [30, -30], "2": [], ... }
                navigation: {}, // 导航操作: { "1": ["prev"], "2": ["next"], ... }
                drawingTracks: {} // 画笔轨迹: { "1": 0, "2": {"25:23": {"track1": [[x,y],...]}}, ... }
            };

            // 当前绘制的轨迹状态
            this.currentTrack = null; // 当前轨迹的点数组
            this.currentTrackStartTime = null; // 当前轨迹开始时间

            // 配置选项
            this.config = {
                autoTrack: true,
                trackZoom: true,
                trackRotate: true,
                trackDrawing: true,
                trackNavigation: true,
                includeTimestamp: false,
                drawingThrottle: 100
            };

            // 状态管理
            this.status = 'idle'; // 'idle' | 'active' | 'paused' | 'stopped'
            this.testStartTime = null;
            
            // 当前图版索引（从state对象获取）
            this.currentPlateIndex = null;
            
            // 时间戳追踪 - 记录每个图版的起始时间
            this.timestamps = {
                start: null,      // 测试开始时间
                plates: {},        // 图版时间戳: { "1": timestamp, "2": timestamp, ... }
                select: null,      // 进入选择阶段时间
                stop: null         // 测试结束时间
            };
            
            // 初始化数据结构（为1-10的图版创建空数组）
            this._initializeDataStructure();
            
            // 绑定方法（保持this上下文）
            this._bindMethods();
        }

        /**
         * 初始化数据结构 - 为10个图版创建空数组
         */
        _initializeDataStructure() {
            for (let i = 1; i <= 10; i++) {
                const plateKey = String(i);
                this.data.zoom[plateKey] = [];
                this.data.rotate[plateKey] = [];
                this.data.navigation[plateKey] = [];
                this.data.drawingTracks[plateKey] = 0; // 初始化为0
            }
        }

        /**
         * 绑定方法到实例（保持this上下文）
         */
        _bindMethods() {
            this.trackZoom = this.trackZoom.bind(this);
            this.trackRotate = this.trackRotate.bind(this);
            this.trackDrawingStart = this.trackDrawingStart.bind(this);
            this.trackDrawingPoint = this.trackDrawingPoint.bind(this);
            this.trackDrawingEnd = this.trackDrawingEnd.bind(this);
            this.updateCurrentPlate = this.updateCurrentPlate.bind(this);
        }

        /**
         * 获取当前图版索引
         * 通过访问全局state对象获取
         */
        _getCurrentPlateIndex() {
            // 优先使用缓存的索引（已通过updateCurrentPlate更新）
            if (this.currentPlateIndex !== null) {
                return this.currentPlateIndex;
            }
            // 尝试从全局state获取
            if (typeof window !== 'undefined' && window.state) {
                return window.state.currentIndex || 0;
            }
            // 默认返回0
            return 0;
        }

        /**
         * 获取当前图版的键（字符串格式 "1"-"10"）
         */
        _getCurrentPlateKey() {
            const index = this._getCurrentPlateIndex();
            return String(index + 1);
        }

        /**
         * 获取时间戳（如果需要）
         */
        _getTimestamp() {
            if (this.config.includeTimestamp) {
                return Date.now();
            }
            return null;
        }

        /**
         * 记录放大操作
         * @param {number} direction - 1表示放大，-1表示缩小
         */
        trackZoom(direction) {
            if (!this.config.trackZoom || this.status !== 'active') {
                return;
            }

            const plateKey = this._getCurrentPlateKey();
            const timestamp = this._getTimestamp();

            const record = direction;
            this.data.zoom[plateKey].push(record);

            // 触发事件
            this._emit('zoom', {
                plateIndex: parseInt(plateKey),
                direction: direction,
                timestamp: timestamp
            });

            // 调试日志
            if (this.config.debug) {
                console.log(`[InteractionTracker] 记录缩放操作: 图版${plateKey}, 方向=${direction > 0 ? '放大' : '缩小'}`);
            }
        }

        /**
         * 记录旋转操作
         * @param {number} angle - 旋转角度（每次30度）
         */
        trackRotate(angle) {
            if (!this.config.trackRotate || this.status !== 'active') {
                return;
            }

            const plateKey = this._getCurrentPlateKey();
            const timestamp = this._getTimestamp();

            // 记录旋转角度
            this.data.rotate[plateKey].push(angle);

            // 触发事件
            this._emit('rotate', {
                plateIndex: parseInt(plateKey),
                angle: angle,
                timestamp: timestamp
            });

            // 调试日志
            if (this.config.debug) {
                console.log(`[InteractionTracker] 记录旋转操作: 图版${plateKey}, 角度=${angle}度`);
            }
        }

        /**
         * 记录导航操作
         * @param {string} direction - 导航方向: "prev" 或 "next"
         */
        trackNavigation(direction) {
            if (!this.config.trackNavigation || this.status !== 'active') {
                return;
            }

            const plateKey = this._getCurrentPlateKey();
            const timestamp = this._getTimestamp();

            // 记录导航操作
            this.data.navigation[plateKey].push(direction);

            // 触发事件
            this._emit('navigation', {
                plateIndex: parseInt(plateKey),
                direction: direction,
                timestamp: timestamp
            });

            // 调试日志
            if (this.config.debug) {
                console.log(`[InteractionTracker] 记录导航操作: 图版${plateKey}, 方向=${direction}`);
            }
        }

        /**
         * 更新当前图版索引
         * 在图片切换时调用
         * @param {number} plateIndex - 图版索引（0-9）
         */
        updateCurrentPlate(plateIndex) {
            // 切换图版时，如果有未完成的轨迹，先结束它
            if (this.currentTrack) {
                this.trackDrawingEnd();
            }
            
            if (plateIndex >= 0 && plateIndex < 10) {
                const plateKey = String(plateIndex + 1);
                
                // 记录图版切换时间戳
                // 如果还未记录过该图版，则记录首次访问时间
                // 这确保了每个图版的起始时间准确记录
                if (!this.timestamps.plates[plateKey] && this.testStartTime) {
                    this.timestamps.plates[plateKey] = Date.now();
                }
                
                this.currentPlateIndex = plateIndex;
            }
        }

        /**
         * 记录进入选择阶段的时间
         */
        recordSelectPhase() {
            if (!this.timestamps.select && this.testStartTime) {
                this.timestamps.select = Date.now();
            }
        }

        /**
         * 开始追踪
         */
        start() {
            if (this.status === 'active') {
                return;
            }

            this.status = 'active';
            this.testStartTime = Date.now();
            this.timestamps.start = this.testStartTime;
            this._emit('started', { startTime: this.testStartTime });
        }

        /**
         * 暂停追踪
         */
        pause() {
            if (this.status !== 'active') {
                return;
            }
            this.status = 'paused';
            this._emit('paused');
        }

        /**
         * 恢复追踪
         */
        resume() {
            if (this.status !== 'paused') {
                return;
            }
            this.status = 'active';
            this._emit('resumed');
        }

        /**
         * 停止追踪
         */
        stop() {
            this.status = 'stopped';
            this.timestamps.stop = Date.now();
            this._emit('stopped');
        }

        /**
         * 重置所有数据
         */
        reset() {
            this._initializeDataStructure();
            this.status = 'idle';
            this.testStartTime = null;
            this.currentPlateIndex = null;
            this.currentTrack = null;
            this.currentTrackStartTime = null;
            this.timestamps = {
                start: null,
                plates: {},
                select: null,
                stop: null
            };
            this._emit('reset');
        }

        /**
         * 获取所有数据
         * @param {Object} options - 选项
         * @returns {Object} 追踪数据
         */
        getAllData(options = {}) {
            const data = { ...this.data };
            
            if (options.includeMetadata) {
                data.metadata = {
                    version: '1.0.0',
                    testStartTime: this.testStartTime,
                    testEndTime: Date.now(),
                    status: this.status
                };
            }

            if (options.includeStats) {
                data.statistics = this.getStatistics();
            }

            return data;
        }

        /**
         * 获取统计信息
         * @param {number} plateIndex - 图版索引（可选，1-10）
         * @returns {Object} 统计信息
         */
        getStatistics(plateIndex = null) {
            if (plateIndex !== null) {
                const plateKey = String(plateIndex);
                return {
                    zoom: this.data.zoom[plateKey].length,
                    rotate: this.data.rotate[plateKey].length,
                    navigation: this.data.navigation[plateKey].length,
                    drawingTracks: this.data.drawingTracks[plateKey] === 0 ? 0 : Object.keys(this.data.drawingTracks[plateKey]).length
                };
            }

            // 全局统计
            let totalZoom = 0, totalRotate = 0, totalNavigation = 0, totalDrawingTracks = 0;
            
            for (let i = 1; i <= 10; i++) {
                const key = String(i);
                totalZoom += this.data.zoom[key].length;
                totalRotate += this.data.rotate[key].length;
                totalNavigation += this.data.navigation[key].length;
                // 统计画笔轨迹数量（如果drawingTracks不是0，计算轨迹段数）
                if (this.data.drawingTracks[key] !== 0 && typeof this.data.drawingTracks[key] === 'object') {
                    const timeKeys = Object.keys(this.data.drawingTracks[key]);
                    timeKeys.forEach(timeKey => {
                        totalDrawingTracks += Object.keys(this.data.drawingTracks[key][timeKey]).length;
                    });
                }
            }

            return {
                totalZoom,
                totalRotate,
                totalNavigation,
                totalDrawingTracks,
                testDuration: this.testStartTime ? Date.now() - this.testStartTime : 0
            };
        }

        /**
         * 获取旋转次数统计数据（按图版统计点击次数）
         * @returns {Object} 旋转次数统计，格式: { "1": 0, "2": 4, ... }
         */
        getRotationCounts() {
            const counts = {};
            for (let i = 1; i <= 10; i++) {
                const key = String(i);
                // 旋转次数 = rotate数组的长度（每次旋转记录一次）
                counts[key] = this.data.rotate[key] ? this.data.rotate[key].length : 0;
            }
            return counts;
        }

        /**
         * 格式化时间为 "分钟:秒" 格式
         * @param {number} timestamp - 时间戳
         * @returns {string} 格式化后的时间字符串
         */
        _formatTime(timestamp) {
            if (!this.testStartTime) return "0:0";
            const elapsed = Math.floor((timestamp - this.testStartTime) / 1000); // 秒数
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            return `${minutes}:${seconds}`;
        }

        /**
         * 开始追踪画笔轨迹
         * @param {number} x - 起始x坐标
         * @param {number} y - 起始y坐标
         */
        trackDrawingStart(x, y) {
            if (!this.config.trackDrawing || this.status !== 'active') {
                return;
            }

            const plateKey = this._getCurrentPlateKey();
            
            // 初始化当前轨迹
            this.currentTrack = [[x, y]];
            this.currentTrackStartTime = Date.now();
        }

        /**
         * 记录画笔轨迹中的点
         * @param {number} x - x坐标
         * @param {number} y - y坐标
         */
        trackDrawingPoint(x, y) {
            if (!this.config.trackDrawing || this.status !== 'active' || !this.currentTrack) {
                return;
            }

            // 添加点到最后
            this.currentTrack.push([x, y]);
        }

        /**
         * 结束追踪画笔轨迹
         */
        trackDrawingEnd() {
            if (!this.config.trackDrawing || this.status !== 'active' || !this.currentTrack) {
                return;
            }

            const plateKey = this._getCurrentPlateKey();
            const timeKey = this._formatTime(this.currentTrackStartTime);
            
            // 如果当前图版的轨迹数据是0，初始化为对象
            if (this.data.drawingTracks[plateKey] === 0) {
                this.data.drawingTracks[plateKey] = {};
            }
            
            // 如果该时间点不存在，初始化
            if (!this.data.drawingTracks[plateKey][timeKey]) {
                this.data.drawingTracks[plateKey][timeKey] = {};
            }
            
            // 计算当前轨迹编号
            const trackCount = Object.keys(this.data.drawingTracks[plateKey][timeKey]).length;
            const trackKey = `track${trackCount + 1}`;
            
            // 保存轨迹
            this.data.drawingTracks[plateKey][timeKey][trackKey] = this.currentTrack;
            
            // 清空当前轨迹
            this.currentTrack = null;
            this.currentTrackStartTime = null;
        }

        /**
         * 获取画笔轨迹数据
         * @returns {Object} 画笔轨迹数据，格式: { "1": 0, "2": {"25:23": {"track1": [[x,y],...]}}, ... }
         */
        getDrawingTracks() {
            const tracks = {};
            for (let i = 1; i <= 10; i++) {
                const key = String(i);
                tracks[key] = this.data.drawingTracks[key] || 0;
            }
            return tracks;
        }

        /**
         * 将时间戳转换为相对于测试开始时间的 "MM:SS" 格式
         * @param {number} timestamp - 时间戳
         * @returns {string} 格式化的时间字符串 "MM:SS"
         */
        _formatTimestamp(timestamp) {
            if (!this.testStartTime || !timestamp) return "00:00";
            const elapsed = Math.floor((timestamp - this.testStartTime) / 1000); // 秒数
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        /**
         * 将时间戳转换为绝对时间 "YYYY-MM-DD HH:mm:ss" 格式
         * @param {number} timestamp - 时间戳
         * @returns {string} 格式化的时间字符串 "YYYY-MM-DD HH:mm:ss"
         */
        _formatAbsoluteTimestamp(timestamp) {
            if (!timestamp) return null;
            const date = new Date(timestamp);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }

        /**
         * 获取音频时间戳统计数据（相对时间）
         * @returns {Object} 时间戳统计，格式: { "start": "00:00", "1": "01:53", "select": "25:15", "stop": "30:29", ... }
         */
        getAudioTimestamps() {
            const result = {};
            
            // 测试开始时间
            result.start = this._formatTimestamp(this.timestamps.start);
            
            // 每个图版的时间戳
            for (let i = 1; i <= 10; i++) {
                const key = String(i);
                const timestamp = this.timestamps.plates[key];
                result[key] = timestamp ? this._formatTimestamp(timestamp) : "00:00";
            }
            
            // 选择阶段时间戳
            result.select = this._formatTimestamp(this.timestamps.select);
            
            // 测试结束时间戳
            result.stop = this._formatTimestamp(this.timestamps.stop);
            
            return result;
        }

        /**
         * 获取绝对时间戳统计数据
         * @returns {Object} 时间戳统计，格式: { "start": "2025-10-28 20:13:32", "1": "2025-10-28 20:15:25", ... }
         */
        getAbsoluteTimestamps() {
            const result = {};
            
            // 测试开始时间
            result.start = this._formatAbsoluteTimestamp(this.timestamps.start);
            
            // 每个图版的时间戳
            for (let i = 1; i <= 10; i++) {
                const key = String(i);
                const timestamp = this.timestamps.plates[key];
                result[key] = this._formatAbsoluteTimestamp(timestamp);
            }
            
            // 选择阶段时间戳
            result.select = this._formatAbsoluteTimestamp(this.timestamps.select);
            
            // 测试结束时间戳
            result.stop = this._formatAbsoluteTimestamp(this.timestamps.stop);
            
            return result;
        }

        /**
         * 打印数据结构（在点击下一张时调用）
         * @param {number} plateIndex - 图版索引（0-9）或图版编号（1-10）
         */
        printDataStructures(plateIndex) {
            // 支持传入索引（0-9）或编号（1-10）
            const plateNumber = plateIndex >= 1 && plateIndex <= 10 ? plateIndex : (plateIndex + 1);
            
            console.log(`\n==================== 图版 ${plateNumber} 数据结构 ====================`);
            
            try {
                // 1. 当前图版统计信息
                const plateStats = this.getStatistics(plateNumber);
                console.log(`[图版 ${plateNumber} 统计信息]`, plateStats);
                
                // 2. 旋转次数统计
                const rotationCounts = this.getRotationCounts();
                console.log(`[旋转次数统计]`, rotationCounts);
                console.log(`[图版 ${plateNumber} 旋转次数]:`, rotationCounts[String(plateNumber)] || 0);
                
                // 3. 画笔轨迹数据
                const drawingTracks = this.getDrawingTracks();
                const plateTracks = drawingTracks[String(plateNumber)];
                console.log(`[画笔轨迹数据]`, drawingTracks);
                if (plateTracks && plateTracks !== 0) {
                    console.log(`[图版 ${plateNumber} 画笔轨迹]:`, JSON.stringify(plateTracks, null, 2));
                } else {
                    console.log(`[图版 ${plateNumber} 画笔轨迹]: 无`);
                }
                
                // 4. 相对时间戳统计
                const audioTimestamps = this.getAudioTimestamps();
                console.log(`[音频时间戳统计（相对时间）]`, audioTimestamps);
                console.log(`[图版 ${plateNumber} 起始时间（相对）]:`, audioTimestamps[String(plateNumber)] || '未记录');
                
                // 5. 绝对时间戳统计
                const absoluteTimestamps = this.getAbsoluteTimestamps();
                console.log(`[绝对时间戳统计]`, absoluteTimestamps);
                console.log(`[图版 ${plateNumber} 起始时间（绝对）]:`, absoluteTimestamps[String(plateNumber)] || '未记录');
                
                // 6. 完整交互数据（仅当前图版相关）
                const allData = this.getAllData({
                    includeStats: false,
                    includeMetadata: false
                });
                const plateKey = String(plateNumber);
                const plateData = {
                    zoom: allData.zoom[plateKey] || [],
                    rotate: allData.rotate[plateKey] || [],
                    navigation: allData.navigation[plateKey] || [],
                    drawingTracks: drawingTracks[plateKey] || 0  // 包含画笔轨迹数据（使用上面定义的drawingTracks）
                };
                console.log(`[图版 ${plateNumber} 完整交互数据]`, plateData);
                
            } catch (error) {
                console.error(`[数据结构打印错误]`, error);
            }
            
            console.log(`==================== 图版 ${plateNumber} 数据结束 ====================\n`);
        }

        /**
         * 输出所有版图的统计信息（用于测试完成后查看汇总）
         * 输出 this.data 中所有版图的完整统计信息（整体格式）
         */
        printAllPlatesStatistics() {
            // 构建整体统计对象
            const allPlatesStats = {
                // 完整原始数据
                data: this.data,
                
                // 各版图统计信息
                plates: {},
                
                // 全局统计
                global: {},
                
                // 时间戳信息
                timestamps: {
                    relative: {},
                    absolute: {}
                }
            };
            
            // 遍历所有版图（1-10），构建统计信息
            for (let i = 1; i <= 10; i++) {
                const plateKey = String(i);
                
                // 获取各版图的统计数据
                const plateStats = this.getStatistics(i);
                
                // 构建版图统计对象
                allPlatesStats.plates[plateKey] = {
                    zoom: {
                        count: this.data.zoom[plateKey] ? this.data.zoom[plateKey].length : 0,
                        data: this.data.zoom[plateKey] || []
                    },
                    rotate: {
                        count: this.data.rotate[plateKey] ? this.data.rotate[plateKey].length : 0,
                        data: this.data.rotate[plateKey] || []
                    },
                    navigation: {
                        count: this.data.navigation[plateKey] ? this.data.navigation[plateKey].length : 0,
                        data: this.data.navigation[plateKey] || []
                    },
                    drawingTracks: this.data.drawingTracks[plateKey] === 0 || !this.data.drawingTracks[plateKey] ? 
                        0 : this.data.drawingTracks[plateKey],
                    statistics: plateStats
                };
            }
            
            // 全局统计
            const globalStats = this.getStatistics();
            allPlatesStats.global = {
                totalZoom: globalStats.totalZoom,
                totalRotate: globalStats.totalRotate,
                totalNavigation: globalStats.totalNavigation,
                totalDrawingTracks: globalStats.totalDrawingTracks,
                testDuration: Math.floor(globalStats.testDuration / 1000) // 秒
            };
            
            // 时间戳信息
            allPlatesStats.timestamps.relative = this.getAudioTimestamps();
            allPlatesStats.timestamps.absolute = this.getAbsoluteTimestamps();
            
            // 输出整体统计信息
            console.log('\n==================== 所有版图统计信息 ====================');
            console.log('[完整版图统计数据]', allPlatesStats);
            console.log('==================== 所有版图统计信息结束 ====================\n');
        }

        /**
         * 导出JSON格式数据
         * @param {Object} options - 导出选项
         * @returns {string} JSON字符串
         */
        exportJSON(options = {}) {
            const defaultOptions = {
                pretty: true,
                includeStats: true,
                includeMetadata: true
            };
            const opts = { ...defaultOptions, ...options };
            
            const data = this.getAllData({
                includeStats: opts.includeStats,
                includeMetadata: opts.includeMetadata
            });

            if (opts.pretty) {
                return JSON.stringify(data, null, 2);
            }
            return JSON.stringify(data);
        }

        /**
         * 下载数据文件
         * @param {string} format - 格式 'json'
         * @param {Object} options - 选项
         */
        download(format = 'json', options = {}) {
            const defaultFilename = `rorschach_interactions_${Date.now()}.json`;
            const filename = options.filename || defaultFilename;

            let content, mimeType;
            
            if (format === 'json') {
                content = this.exportJSON(options);
                mimeType = 'application/json';
            } else {
                throw new Error(`不支持的格式: ${format}`);
            }

            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        /**
         * 初始化追踪器并绑定事件
         */
        init() {
            if (this.status !== 'idle') {
                console.warn('[InteractionTracker] 追踪器已经初始化');
                return;
            }

            // 立即设置追踪（DOM应该已经加载）
            this._setupTracking();
        }

        /**
         * 设置追踪（绑定事件监听器）
         */
        _setupTracking() {
            // 等待一小段时间确保原有代码已加载
            setTimeout(() => {
                this._interceptZoomEvents();
                
                // 初始化当前图版索引
                this.updateCurrentPlate(this._getCurrentPlateIndex());
                
                if (this.config.autoTrack) {
                    this.start();
                }
                
                console.log('[InteractionTracker] 追踪器初始化完成');
            }, 200);
        }

        /**
         * 拦截放大/缩小和旋转按钮事件
         * 通过事件委托在按钮点击时记录操作
         */
        _interceptZoomEvents() {
            const zoomInBtn = document.getElementById('zoom-in-btn');
            const zoomOutBtn = document.getElementById('zoom-out-btn');
            const rotateLeftBtn = document.getElementById('rotate-left-btn');
            const rotateRightBtn = document.getElementById('rotate-right-btn');

            if (!zoomInBtn || !zoomOutBtn) {
                console.error('[InteractionTracker] 未找到放大/缩小按钮');
            } else {
                // 为放大按钮添加额外的监听器
                zoomInBtn.addEventListener('click', () => {
                    this.trackZoom(1);
                }, true); // 使用捕获阶段，确保在原有处理器之前执行

                // 为缩小按钮添加额外的监听器
                zoomOutBtn.addEventListener('click', () => {
                    this.trackZoom(-1);
                }, true);

                console.log('[InteractionTracker] 放大/缩小事件追踪已启用');
            }

            if (!rotateLeftBtn || !rotateRightBtn) {
                console.error('[InteractionTracker] 未找到旋转按钮');
            } else {
                // 为左转按钮添加额外的监听器
                rotateLeftBtn.addEventListener('click', () => {
                    this.trackRotate(-30);
                }, true);

                // 为右转按钮添加额外的监听器
                rotateRightBtn.addEventListener('click', () => {
                    this.trackRotate(30);
                }, true);

                console.log('[InteractionTracker] 旋转事件追踪已启用');
            }
        }

        /**
         * 事件系统（简单的观察者模式）
         */
        _eventListeners = {};

        /**
         * 订阅事件
         * @param {string} eventName - 事件名称
         * @param {Function} callback - 回调函数
         * @returns {string} 订阅ID
         */
        on(eventName, callback) {
            if (!this._eventListeners[eventName]) {
                this._eventListeners[eventName] = [];
            }
            const id = `${eventName}_${Date.now()}_${Math.random()}`;
            this._eventListeners[eventName].push({ id, callback });
            return id;
        }

        /**
         * 取消订阅
         * @param {string} subscriptionId - 订阅ID
         */
        off(subscriptionId) {
            for (const eventName in this._eventListeners) {
                this._eventListeners[eventName] = this._eventListeners[eventName].filter(
                    sub => sub.id !== subscriptionId
                );
            }
        }

        /**
         * 触发事件
         * @param {string} eventName - 事件名称
         * @param {*} data - 事件数据
         */
        _emit(eventName, data) {
            if (this._eventListeners[eventName]) {
                this._eventListeners[eventName].forEach(sub => {
                    try {
                        sub.callback(data);
                    } catch (error) {
                        console.error(`[InteractionTracker] 事件回调错误 (${eventName}):`, error);
                    }
                });
            }
        }

        /**
         * 更新配置
         * @param {Object} newConfig - 新配置
         */
        updateConfig(newConfig) {
            this.config = { ...this.config, ...newConfig };
        }

        /**
         * 获取配置
         * @returns {Object} 当前配置
         */
        getConfig() {
            return { ...this.config };
        }

        /**
         * 获取状态
         * @returns {string} 当前状态
         */
        getStatus() {
            return this.status;
        }

        /**
         * 设置调试模式
         * @param {boolean} enabled - 是否启用
         */
        setDebugMode(enabled) {
            this.config.debug = enabled;
        }
    }

    // 创建单例实例
    const trackerInstance = new InteractionTracker();

    // 提供全局访问接口
    window.InteractionTracker = {
        // 初始化
        init: (config) => {
            if (config) trackerInstance.updateConfig(config);
            trackerInstance.init();
            return trackerInstance;
        },

        // 生命周期
        start: () => trackerInstance.start(),
        pause: () => trackerInstance.pause(),
        resume: () => trackerInstance.resume(),
        stop: () => trackerInstance.stop(),
        reset: () => trackerInstance.reset(),

        // 数据获取
        getAllData: (options) => trackerInstance.getAllData(options),
        getStatistics: (plateIndex) => trackerInstance.getStatistics(plateIndex),
        exportJSON: (options) => trackerInstance.exportJSON(options),
        download: (format, options) => trackerInstance.download(format, options),
        getRotationCounts: () => trackerInstance.getRotationCounts(),
        getDrawingTracks: () => trackerInstance.getDrawingTracks(),
        getAudioTimestamps: () => trackerInstance.getAudioTimestamps(),
        getAbsoluteTimestamps: () => trackerInstance.getAbsoluteTimestamps(),
        recordSelectPhase: () => trackerInstance.recordSelectPhase(),
        printDataStructures: (plateIndex) => trackerInstance.printDataStructures(plateIndex),
        printAllPlatesStatistics: () => trackerInstance.printAllPlatesStatistics(),

        // 配置
        updateConfig: (config) => trackerInstance.updateConfig(config),
        getConfig: () => trackerInstance.getConfig(),
        getStatus: () => trackerInstance.getStatus(),
        setDebugMode: (enabled) => trackerInstance.setDebugMode(enabled),

        // 事件系统
        on: (eventName, callback) => trackerInstance.on(eventName, callback),
        off: (subscriptionId) => trackerInstance.off(subscriptionId),

        // 内部方法（供集成使用）
        _updateCurrentPlate: (plateIndex) => trackerInstance.updateCurrentPlate(plateIndex),
        _trackZoom: (direction) => trackerInstance.trackZoom(direction),
        _trackRotate: (angle) => trackerInstance.trackRotate(angle),
        _trackNavigation: (direction) => trackerInstance.trackNavigation(direction),
        _trackDrawingStart: (x, y) => trackerInstance.trackDrawingStart(x, y),
        _trackDrawingPoint: (x, y) => trackerInstance.trackDrawingPoint(x, y),
        _trackDrawingEnd: () => trackerInstance.trackDrawingEnd(),
        
        // 直接访问实例（高级用法）
        _instance: trackerInstance
    };

    // 便于调试
    if (typeof console !== 'undefined') {
        console.log('[InteractionTracker] 交互追踪系统已加载');
    }

})(window);

