<template>
  <span class="realtime-status-badge">
    <span class="realtime-dot" :class="{ active: status === 'active' }" aria-hidden="true" />
    <span class="realtime-text">{{ countText }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { useRealtimeStatus } from '@/composables/useRealtimeStatus'

const { activeConnections, status } = useRealtimeStatus()

const countText = computed(() => `正在测试人数：${activeConnections.value}人`)
</script>

<style lang="less" scoped>
.realtime-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(226, 232, 240, 0.92);
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 8px;
  line-height: 1.3;
}

.realtime-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.7);
  box-shadow: 0 0 0 0 rgba(148, 163, 184, 0.4);

  &.active {
    background: #34d399;
    box-shadow: 0 0 10px rgba(52, 211, 153, 0.5);
  }
}

@media (max-width: 768px) {
  .realtime-status-badge {
    padding: 5px 8px;
    font-size: 11px;
    gap: 6px;
  }
}
</style>
