/**
 * 音频录制器 - 实时录制豆包TTS输出音频
 * 收集所有PCM数据，转换为MP3格式，一次性提交
 */

(function(window) {
    'use strict';

    class AudioRecorder {
        constructor() {
            this.pcmBuffers = []; // 存储所有PCM数据片段
            this.sampleRate = 24000; // 豆包输出音频采样率
            this.isRecording = false;
            this.totalSamples = 0;
        }

        /**
         * 开始录制
         */
        start() {
            this.pcmBuffers = [];
            this.totalSamples = 0;
            this.isRecording = true;
            console.log('[AudioRecorder] 开始录制音频');
        }

        /**
         * 停止录制
         */
        stop() {
            this.isRecording = false;
            console.log('[AudioRecorder] 停止录制，共收集', this.pcmBuffers.length, '个音频片段');
        }

        /**
         * 添加PCM音频数据
         * @param {ArrayBuffer|Int16Array} pcmData - PCM音频数据
         * @param {number} sampleRate - 采样率（默认24000）
         */
        addPCMData(pcmData, sampleRate = 24000) {
            if (!this.isRecording) {
                return;
            }

            // 确保是 Int16Array
            let int16Data;
            if (pcmData instanceof Int16Array) {
                int16Data = pcmData;
            } else if (pcmData instanceof ArrayBuffer) {
                int16Data = new Int16Array(pcmData);
            } else {
                console.warn('[AudioRecorder] 不支持的PCM数据格式');
                return;
            }

            // 保存采样率（使用第一个片段的采样率）
            if (this.pcmBuffers.length === 0) {
                this.sampleRate = sampleRate;
            }

            // 保存PCM数据
            this.pcmBuffers.push(int16Data);
            this.totalSamples += int16Data.length;

            console.log('[AudioRecorder] 添加音频片段，长度:', int16Data.length, '采样');
        }

        /**
         * 合并所有PCM数据为单个Int16Array
         * @returns {Int16Array} 合并后的PCM数据
         */
        mergePCMData() {
            if (this.pcmBuffers.length === 0) {
                return new Int16Array(0);
            }

            const merged = new Int16Array(this.totalSamples);
            let offset = 0;

            for (const buffer of this.pcmBuffers) {
                merged.set(buffer, offset);
                offset += buffer.length;
            }

            console.log('[AudioRecorder] 合并完成，总采样数:', this.totalSamples);
            return merged;
        }

        /**
         * 将PCM转换为MP3（使用lamejs）
         * @param {Int16Array} pcmData - PCM数据
         * @param {number} sampleRate - 采样率
         * @returns {Promise<Blob>} MP3格式的Blob
         */
        async convertPCMToMP3(pcmData, sampleRate = 24000) {
            return new Promise((resolve, reject) => {
                try {
                    // 检查lamejs是否可用
                    if (typeof lamejs === 'undefined' && typeof window !== 'undefined' && typeof window.lamejs === 'undefined') {
                        reject(new Error('lamejs 库未加载，请先引入 lamejs'));
                        return;
                    }

                    const Lame = typeof lamejs !== 'undefined' ? lamejs : window.lamejs;
                    const mp3encoder = new Lame.Mp3Encoder(1, sampleRate, 128); // 单声道，128kbps
                    const sampleBlockSize = 1152; // MP3编码块大小
                    const mp3Data = [];

                    // 分块编码，直接使用Int16Array数据
                    for (let i = 0; i < pcmData.length; i += sampleBlockSize) {
                        const sampleChunk = pcmData.subarray(i, Math.min(i + sampleBlockSize, pcmData.length));
                        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
                        if (mp3buf.length > 0) {
                            mp3Data.push(new Int8Array(mp3buf));
                        }
                    }

                    // 刷新编码器
                    const mp3buf = mp3encoder.flush();
                    if (mp3buf.length > 0) {
                        mp3Data.push(new Int8Array(mp3buf));
                    }

                    // 合并所有MP3数据块
                    const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' });
                    console.log('[AudioRecorder] MP3转换完成，大小:', mp3Blob.size, 'bytes');
                    resolve(mp3Blob);
                } catch (error) {
                    console.error('[AudioRecorder] MP3转换失败:', error);
                    reject(error);
                }
            });
        }

        /**
         * 导出为MP3文件
         * @returns {Promise<Blob>} MP3格式的Blob
         */
        async exportMP3() {
            if (this.pcmBuffers.length === 0) {
                throw new Error('没有录制的音频数据');
            }

            console.log('[AudioRecorder] 开始导出MP3...');
            const mergedPCM = this.mergePCMData();
            const mp3Blob = await this.convertPCMToMP3(mergedPCM, this.sampleRate);
            return mp3Blob;
        }

        /**
         * 下载MP3文件
         * @param {string} filename - 文件名，默认为 'recording.mp3'
         * @returns {Promise<void>}
         */
        async downloadMP3(filename = 'recording.mp3') {
            try {
                const mp3Blob = await this.exportMP3();
                const url = URL.createObjectURL(mp3Blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
                console.log('[AudioRecorder] MP3文件已下载:', filename);
            } catch (error) {
                console.error('[AudioRecorder] 下载MP3文件失败:', error);
                throw error;
            }
        }

        /**
         * 重置录制器
         */
        reset() {
            this.pcmBuffers = [];
            this.totalSamples = 0;
            this.isRecording = false;
            console.log('[AudioRecorder] 已重置');
        }

        /**
         * 获取录制状态
         */
        getStatus() {
            return {
                isRecording: this.isRecording,
                bufferCount: this.pcmBuffers.length,
                totalSamples: this.totalSamples,
                duration: this.totalSamples / this.sampleRate, // 秒
                sampleRate: this.sampleRate
            };
        }
    }

    // 创建单例实例
    const audioRecorder = new AudioRecorder();

    // 导出到全局
    window.AudioRecorder = {
        start: () => audioRecorder.start(),
        stop: () => audioRecorder.stop(),
        addPCMData: (pcmData, sampleRate) => audioRecorder.addPCMData(pcmData, sampleRate),
        exportMP3: () => audioRecorder.exportMP3(),
        downloadMP3: (filename) => audioRecorder.downloadMP3(filename),
        reset: () => audioRecorder.reset(),
        getStatus: () => audioRecorder.getStatus(),
        _instance: audioRecorder
    };

})(window);

