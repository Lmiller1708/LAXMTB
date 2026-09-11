<script setup lang="ts">
import { usePwaUpdate } from '../composables/usePwaUpdate'

const { hasUpdate, applyUpdate } = usePwaUpdate()
const dismissed = ref(false)

const handleUpdate = async () => {
  await applyUpdate()
}

const handleDismiss = () => {
  dismissed.value = true
}
</script>

<template>
  <Transition name="update-slide">
    <div
      v-if="hasUpdate && !dismissed"
      class="pwa-update-banner"
      role="alert"
    >
      <div class="pwa-update-content">
        <span class="pwa-update-icon">⚡</span>
        <div class="pwa-update-text">
          <div class="pwa-update-title">New Version Available</div>
          <div class="pwa-update-desc">Tap update to load the latest race features</div>
        </div>
      </div>
      <div class="pwa-update-actions">
        <button
          type="button"
          class="pwa-update-btn"
          @click="handleUpdate"
        >
          Update Now
        </button>
        <button
          type="button"
          class="pwa-dismiss-btn"
          aria-label="Dismiss"
          @click="handleDismiss"
        >
          ✕
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.pwa-update-banner {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 99999;
  width: calc(100% - 32px);
  max-width: 480px;
  background: rgba(20, 20, 22, 0.96);
  border: 1px solid rgba(220, 38, 38, 0.4);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 20px rgba(220, 38, 38, 0.2);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pwa-update-content {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.pwa-update-icon {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
  animation: pulse-glow 2s infinite ease-in-out;
}

@keyframes pulse-glow {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px #ef4444); }
  50% { transform: scale(1.15); filter: drop-shadow(0 0 8px #ef4444); }
}

.pwa-update-text {
  min-width: 0;
}

.pwa-update-title {
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}

.pwa-update-desc {
  font-size: 11px;
  color: #a1a1aa;
  line-height: 1.2;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pwa-update-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.pwa-update-btn {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: #ffffff;
  border: none;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 6px rgba(220, 38, 38, 0.4);
}

.pwa-update-btn:hover {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  transform: translateY(-1px);
}

.pwa-dismiss-btn {
  background: transparent;
  border: none;
  color: #71717a;
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.pwa-dismiss-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.update-slide-enter-active,
.update-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.update-slide-enter-from,
.update-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
