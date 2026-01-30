<template>
  <div class="intro-view">
    <!-- 测试说明内容 -->
    <IntroOverlay @start="handleStart" />
  </div>
</template>

<script setup>
import { onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTestStore } from '@/stores/testStore'
import IntroOverlay from '@/components/test/IntroOverlay.vue'
import { stopAllAudios } from '@/utils/audioManager'

const router = useRouter()
const testStore = useTestStore()

function handleStart() {
  console.log('[IntroView] 用户点击开始测试')
  
  // 停止所有音频播放
  stopAllAudios()
  
  // 初始化测试（生成 sessionId，记录开始时间）
  testStore.startTest()
  
  console.log('[IntroView] 测试已初始化，跳转到测试页面')
  
  // 跳转到测试页面
  router.push('/test')
}

onUnmounted(() => {
  console.log('[IntroView] 组件卸载，停止所有音频')
  stopAllAudios()
})
</script>

<style scoped>
.intro-view {
  width: 100%;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}
</style>
