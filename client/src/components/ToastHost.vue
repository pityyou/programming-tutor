<script setup lang="ts">
import { useToast } from '../stores/toast'

const { toasts } = useToast()

const icons: Record<string, string> = {
  success: '✅',
  error: '⚠️',
  info: '💡',
}
</script>

<template>
  <div class="toast-host">
    <transition-group name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        :class="['toast-item', t.type]"
      >
        <span class="toast-icon">{{ icons[t.type] }}</span>
        <span class="toast-msg">{{ t.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.toast-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  box-shadow: var(--shadow-md);
  color: var(--text-primary);
  font-size: 13px;
  max-width: 320px;
  pointer-events: auto;
}
.toast-item.success { border-left: 3px solid var(--success); }
.toast-item.error { border-left: 3px solid var(--danger); }
.toast-item.info { border-left: 3px solid var(--accent); }
.toast-icon { flex-shrink: 0; }

.toast-enter-active, .toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
</style>
