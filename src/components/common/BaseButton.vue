<template>
  <button
    class="base-button"
    :class="[
      `base-button--${variant}`,
      `base-button--${size}`,
      { 'base-button--loading': loading, 'base-button--disabled': disabled }
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="base-button__spinner"></span>
    <span class="base-button__content">
      <slot></slot>
    </span>
  </button>
</template>

<script setup>
const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'outline', 'ghost', 'danger'].includes(v)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (v) => ['small', 'medium', 'large'].includes(v)
  },
  loading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

function handleClick(event) {
  if (!props.loading && !props.disabled) {
    emit('click', event)
  }
}
</script>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

/* 尺寸 */
.base-button--small {
  padding: 6px 12px;
  font-size: 12px;
}

.base-button--medium {
  padding: 10px 20px;
  font-size: 14px;
}

.base-button--large {
  padding: 14px 28px;
  font-size: 16px;
}

/* 变体 */
.base-button--primary {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
}

.base-button--primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.base-button--secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.base-button--secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
}

.base-button--outline {
  background: transparent;
  color: #8b5cf6;
  border: 2px solid #8b5cf6;
}

.base-button--outline:hover:not(:disabled) {
  background: rgba(139, 92, 246, 0.1);
}

.base-button--ghost {
  background: transparent;
  color: white;
}

.base-button--ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.base-button--danger {
  background: #ef4444;
  color: white;
}

.base-button--danger:hover:not(:disabled) {
  background: #dc2626;
}

/* 状态 */
.base-button--disabled,
.base-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.base-button--loading {
  cursor: wait;
}

.base-button__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
