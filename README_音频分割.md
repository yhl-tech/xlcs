# 音频分割工具使用说明

## 功能说明

根据测试过程中记录的时间戳数据，使用 ffmpeg 将音频文件分割成各个图版对应的片段。

## 时间戳数据格式

时间戳数据从浏览器控制台获取，格式如下：

```json
{
    "start": "00:00",
    "1": "01:53",
    "2": "03:57",
    "3": "05:29",
    "4": "07:14",
    "5": "09:16",
    "6": "10:37",
    "7": "12:31",
    "8": "15:41",
    "9": "18:37",
    "10": "21:28",
    "select": "25:15",
    "stop": "30:29"
}
```

## 使用方法

1. 确保已安装 Node.js 和 ffmpeg
2. 从浏览器控制台复制时间戳数据，保存为 JSON 文件（如 `timestamps.json`）
3. 运行脚本：

```bash
node script/splitAudio.js <音频文件> <时间戳JSON文件> [输出目录]
```

示例：
```bash
node script/splitAudio.js rorschach_recording_2024-01-01.webm timestamps.json output/
```

## 输出文件

脚本会生成以下文件：

- `plate_1.webm` - 图版1的音频片段
- `plate_2.webm` - 图版2的音频片段
- ...
- `plate_10.webm` - 图版10的音频片段
- `select_phase.webm` - 选择阶段的音频片段
- `segments_info.json` - 分段信息文件（包含每个片段的时间范围和文件路径）

## 获取时间戳数据

1. 完成测试后，打开浏览器开发者工具（F12）
2. 查看控制台输出，找到 `[音频时间戳统计]` 的日志
3. 复制 JSON 数据并保存为文件

或者直接在控制台运行：

```javascript
// 在浏览器控制台运行
const timestamps = window.InteractionTracker.getAudioTimestamps();
console.log(JSON.stringify(timestamps, null, 2));
// 复制输出的JSON数据
```

## 安装 ffmpeg

### Windows
下载并安装：https://ffmpeg.org/download.html
或使用包管理器：
```bash
choco install ffmpeg
```

### macOS
```bash
brew install ffmpeg
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install ffmpeg
```

## 注意事项

1. 确保音频文件格式支持（.webm, .mp3, .wav 等）
2. 时间戳数据必须与音频文件对应（来自同一次测试）
3. 输出目录会在不存在时自动创建
4. 如果输出文件已存在，会被自动覆盖

