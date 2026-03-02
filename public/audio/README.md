# 音频文件说明

本目录存放测试过程中需要播放的预录语音文件（已从原始项目复制）。

**注意：测试准备和测试说明页面使用预录 MP3 音频，正式测试阶段使用 OpenAI WebRTC 实时语音。**

## 准备页面音频

### welcome.MP3 (1.2 MB)
测试准备欢迎语音，内容：
```
Hello，亲爱的用户您好，欢迎来到知己心探心理测试，在测试前，需要跟您确认以下几点：
1. 首先，请先在网页左侧，填写您的个人信息
2. 测试需要在台式电脑或笔记本电脑上进行...
3. 需要提醒您的是，测试时需要保持您周围的环境安静...
4. 整个心理测试过程采用数字人语音交互完成...
5. 如果以上信息确认完毕，那么请点击蓝色的开始测试按钮...
```

## 测试说明页面音频

### intro_part1.MP3 (1.4 MB)
测试说明介绍（段落1-3），内容：
```
1. 现在我来介绍一下这个测试是如何进行的。在页面的左侧，您可以看到一张墨迹图片...
2. 在页面的墨迹图片下方，有多个控制按钮...
3. 接下来，请随我的指示，点击各个按钮。
```

### intro_part2.MP3 (155 KB)
最终提示（段落4），内容：
```
4. 如果您确认清楚了测试的流程，那就可以点击"进入"按钮，开始本次正式的心理测试。
```

## 操作步骤引导音频

### step_zoom_in.MP3 (38 KB)
提示内容：`请点击放大按钮`

### step_zoom_out.MP3 (38 KB)
提示内容：`请点击缩小按钮`

### step_rotate_left.MP3 (38 KB)
提示内容：`请点击左转按钮`

### step_rotate_right.MP3 (38 KB)
提示内容：`请点击右转按钮`

### step_pen.MP3 (73 KB)
提示内容：`请点击绿色画笔，按照图中的轨迹画画`

### step_clear.MP3 (45 KB)
提示内容：`请点击一键擦除按钮`

## 反馈音频

### step_complete.MP3 (33 KB)
操作完成反馈：`好的，操作完成`

## 播放流程

### 测试准备页面 (PrepView)
1. 页面加载 → 播放 welcome.MP3

### 测试说明页面 (IntroOverlay)
1. 页面加载 → 播放 intro_part1.MP3
2. 步骤1：播放 step_zoom_in.MP3 → 等待用户操作 → 播放 step_complete.MP3
3. 步骤2：播放 step_zoom_out.MP3 → 等待用户操作 → 播放 step_complete.MP3
4. 步骤3：播放 step_rotate_left.MP3 → 等待用户操作 → 播放 step_complete.MP3
5. 步骤4：播放 step_rotate_right.MP3 → 等待用户操作 → 播放 step_complete.MP3
6. 步骤5：播放 step_pen.MP3 → 等待用户绘画 → 播放 step_complete.MP3
7. 步骤6：播放 step_clear.MP3 → 等待用户操作 → 播放 step_complete.MP3
8. 全部完成 → 播放 intro_part2.MP3

### 正式测试页面 (TestView)
使用 OpenAI WebRTC 实时语音对话（由 App.vue 在进入测试页面时自动连接）
