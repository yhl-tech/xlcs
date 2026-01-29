<template>
  <div class="energy-pillar-container">
    <div class="energy-pillar">
      <div class="energy-fill" :style="{ height: `${progress}%` }">
        <div class="energy-glow"></div>
      </div>
      <div class="energy-markers">
        <span v-for="i in 10" :key="i" class="marker" :class="{ active: progress >= i * 10 }"></span>
      </div>
    </div>
    <span class="energy-label">{{ Math.round(progress) }}%</span>
  </div>
</template>

<script setup>
defineProps({
  progress: {
    type: Number,
    default: 0
  }
})
</script>

<style scoped>
.energy-pillar-container {
  position: fixed;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 50;
}

.energy-pillar {
  width: 16px;
  height: 200px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.energy-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, #8b5cf6, #6366f1, #3b82f6);
  border-radius: 6px;
  transition: height 0.5s ease-out;
}

.energy-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 20px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.4), transparent);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.energy-markers {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column-reverse;
  justify-content: space-between;
  padding: 4px 0;
}

.marker {
  width: 100%;
  height: 2px;
  background: rgba(255, 255, 255, 0.2);
  transition: background 0.3s;
}

.marker.active {
  background: rgba(255, 255, 255, 0.5);
}

.energy-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .energy-pillar-container {
    right: 12px;
  }

  .energy-pillar {
    height: 150px;
  }
}
</style>
