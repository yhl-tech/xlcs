// 测试数据 - 用于调试上传页面词云效果
export const testData = {
  basicInfo: {
    sex: '男',
    age: '25',
    education: '本科',
    occupation: '测试用户',
    mood: '平静'
  },
  interactionData: {
    zoom: {},
    rotate: {},
    drawingTracks: {},
    timestamps: {
      0: {
        start: 1770019303051,
        end: 1770019321285
      },
      1: {
        start: 1770019321285,
        end: 1770019327105
      },
      2: {
        start: 1770019327105
      }
    }
  },
  postTestAnswers: {
    representSelf: null,
    representFather: null,
    representMother: null,
    mostLiked: null,
    mostDisliked: null
  },
  dialogHistory: [
    // 第1张图
    { speaker: 'assistant', text: '这是第一张墨迹图片，你可以看到一些什么？', timestamp: 1770019309780, plateIndex: 0 },
    { speaker: 'user', text: '我看到一只大蝙蝠在飞翔', timestamp: 1770019318987, plateIndex: 0 },
    { speaker: 'assistant', text: '请描述一下你看到的蝙蝠。', timestamp: 1770019319599, plateIndex: 0 },
    { speaker: 'user', text: '它的翅膀张得很开，像是在夜空中飞行', timestamp: 1770019320500, plateIndex: 0 },
    
    // 第2张图
    { speaker: 'assistant', text: '这张图你可以看到什么？', timestamp: 1770019322799, plateIndex: 1 },
    { speaker: 'user', text: '两个人在跳舞', timestamp: 1770019325000, plateIndex: 1 },
    { speaker: 'assistant', text: '请描述一下这两个人。', timestamp: 1770019325500, plateIndex: 1 },
    { speaker: 'user', text: '他们穿着红色的衣服，手拉着手', timestamp: 1770019327000, plateIndex: 1 },
    
    // 第3张图
    { speaker: 'assistant', text: '这张图你可以看到什么？', timestamp: 1770019328265, plateIndex: 2 },
    { speaker: 'user', text: '看到一只大螃蟹', timestamp: 1770019328984, plateIndex: 2 },
    { speaker: 'assistant', text: '请描述一下这只螃蟹。', timestamp: 1770019329470, plateIndex: 2 },
    { speaker: 'user', text: '红色的螃蟹，有两只大钳子', timestamp: 1770019330500, plateIndex: 2 },
    
    // 第4张图
    { speaker: 'assistant', text: '这张图你可以看到什么？', timestamp: 1770019332000, plateIndex: 3 },
    { speaker: 'user', text: '一个巨大的怪物', timestamp: 1770019334000, plateIndex: 3 },
    { speaker: 'assistant', text: '请描述一下这个怪物。', timestamp: 1770019334500, plateIndex: 3 },
    { speaker: 'user', text: '毛茸茸的，有大脚掌，看起来很可怕', timestamp: 1770019336000, plateIndex: 3 },
    
    // 第5张图
    { speaker: 'assistant', text: '这张图你可以看到什么？', timestamp: 1770019338000, plateIndex: 4 },
    { speaker: 'user', text: '一只蝴蝶', timestamp: 1770019340000, plateIndex: 4 },
    { speaker: 'assistant', text: '请描述一下这只蝴蝶。', timestamp: 1770019340500, plateIndex: 4 },
    { speaker: 'user', text: '翅膀上有漂亮的花纹，正在飞舞', timestamp: 1770019342000, plateIndex: 4 },
    
    // 第6张图
    { speaker: 'assistant', text: '这张图你可以看到什么？', timestamp: 1770019344000, plateIndex: 5 },
    { speaker: 'user', text: '动物的皮毛', timestamp: 1770019346000, plateIndex: 5 },
    { speaker: 'assistant', text: '请描述一下。', timestamp: 1770019346500, plateIndex: 5 },
    { speaker: 'user', text: '柔软的灰色毛皮，像是狐狸或者猫的', timestamp: 1770019348000, plateIndex: 5 },
    
    // 第7张图
    { speaker: 'assistant', text: '这张图你可以看到什么？', timestamp: 1770019350000, plateIndex: 6 },
    { speaker: 'user', text: '两个女人的脸', timestamp: 1770019352000, plateIndex: 6 },
    { speaker: 'assistant', text: '请描述一下她们。', timestamp: 1770019352500, plateIndex: 6 },
    { speaker: 'user', text: '她们在对视，头发很漂亮', timestamp: 1770019354000, plateIndex: 6 },
    
    // 第8张图
    { speaker: 'assistant', text: '这张图你可以看到什么？', timestamp: 1770019356000, plateIndex: 7 },
    { speaker: 'user', text: '五颜六色的花朵', timestamp: 1770019358000, plateIndex: 7 },
    { speaker: 'assistant', text: '请描述一下这些花朵。', timestamp: 1770019358500, plateIndex: 7 },
    { speaker: 'user', text: '粉色和蓝色的花瓣，非常美丽', timestamp: 1770019360000, plateIndex: 7 },
    
    // 第9张图
    { speaker: 'assistant', text: '这张图你可以看到什么？', timestamp: 1770019362000, plateIndex: 8 },
    { speaker: 'user', text: '一群小动物', timestamp: 1770019364000, plateIndex: 8 },
    { speaker: 'assistant', text: '请描述一下这些动物。', timestamp: 1770019364500, plateIndex: 8 },
    { speaker: 'user', text: '可能是老鼠或者松鼠，在草地上玩耍', timestamp: 1770019366000, plateIndex: 8 },
    
    // 第10张图
    { speaker: 'assistant', text: '这张图你可以看到什么？', timestamp: 1770019368000, plateIndex: 9 },
    { speaker: 'user', text: '海底世界', timestamp: 1770019370000, plateIndex: 9 },
    { speaker: 'assistant', text: '请描述一下你看到的海底世界。', timestamp: 1770019370500, plateIndex: 9 },
    { speaker: 'user', text: '有珊瑚、海藻，还有游动的小鱼', timestamp: 1770019372000, plateIndex: 9 },
    { speaker: 'user', text: '水很清澈，阳光从上面照下来', timestamp: 1770019374000, plateIndex: 9 }
  ],
  sessionId: 'session_1770019303051_90y43sko1',
  hasUsedZoom: false,
  plateStartTimes: {
    0: 1770019303051,
    1: 1770019321285,
    2: 1770019327105
  },
  reportStatus: {
    status: '',
    isReady: false,
    message: ''
  }
}

export default testData
