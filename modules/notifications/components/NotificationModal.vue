<script setup lang="ts">
defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const alertTarget = ref<'warmup' | 'stage' | 'start'>('stage')
const warmupOffset = ref<number | 'custom'>(45)
const customWarmup = ref(45)
const leadTime = ref<number | 'custom'>(15)
const customLeadTime = ref(15)
const soundEnabled = ref(true)
const permissionStatus = ref('default')

const handleClose = () => {
  emit('close')
}

const requestPermission = async () => {
  if (import.meta.client && 'Notification' in window) {
    const perm = await Notification.requestPermission()
    permissionStatus.value = perm
  }
}

const testNotification = () => {
  if (import.meta.client) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('LAX MTB // Race Alert', {
        body: 'This is a test race notification. Call-ups and wave alerts will appear like this!',
        icon: '/favicon.png'
      })
    } else {
      alert('🔔 Test Alert: Staging in 15 minutes! (In-app notification active)')
    }
  }
}

onMounted(() => {
  if (import.meta.client && 'Notification' in window) {
    permissionStatus.value = Notification.permission
  }
})
</script>

<template>
  <div v-if="isOpen" class="modal-overlay show" id="notifModalOverlay" @click.self="handleClose">
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="notifModalTitle">
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:18px;">🔔</span>
          <h3 id="notifModalTitle" style="margin:0;font-size:16px;font-weight:700;color:var(--text-main);">Race Notifications</h3>
        </div>
        <button type="button" class="modal-close-btn" aria-label="Close modal" @click="handleClose">✕</button>
      </div>

      <div class="modal-body">
        <div class="modal-section">
          <label class="modal-label">Alert Target</label>
          <div class="modal-radio-group">
            <label class="modal-radio-card">
              <input v-model="alertTarget" type="radio" value="warmup">
              <div class="radio-card-content">
                <strong>Warm-up Time</strong>
                <small>Alert prior to rider & team warm-up</small>
              </div>
            </label>
            <label class="modal-radio-card">
              <input v-model="alertTarget" type="radio" value="stage">
              <div class="radio-card-content">
                <strong>Staging Time</strong>
                <small>Alert prior to staging grid call-up</small>
              </div>
            </label>
            <label class="modal-radio-card">
              <input v-model="alertTarget" type="radio" value="start">
              <div class="radio-card-content">
                <strong>Wave Start Time</strong>
                <small>Alert prior to official wave gun start</small>
              </div>
            </label>
          </div>
        </div>

        <div class="modal-section">
          <label class="modal-label">Warm-up Schedule (Before Staging)</label>
          <div class="lead-time-buttons" id="warmupOffsetButtons">
            <button
              type="button"
              class="lead-time-btn"
              :class="{ active: warmupOffset === 60 }"
              @click="warmupOffset = 60"
            >60 mins</button>
            <button
              type="button"
              class="lead-time-btn"
              :class="{ active: warmupOffset === 45 }"
              @click="warmupOffset = 45"
            >45 mins</button>
            <button
              type="button"
              class="lead-time-btn"
              :class="{ active: warmupOffset === 30 }"
              @click="warmupOffset = 30"
            >30 mins</button>
            <button
              type="button"
              class="lead-time-btn"
              :class="{ active: warmupOffset === 'custom' }"
              @click="warmupOffset = 'custom'"
            >Custom</button>
          </div>
          <div v-show="warmupOffset === 'custom'" class="custom-time-row" style="margin-top:8px;display:flex;align-items:center;gap:8px;">
            <input v-model.number="customWarmup" type="number" min="1" max="180" placeholder="Minutes" class="custom-minutes-input">
            <span style="font-size:12px;color:var(--text-muted);">minutes before staging</span>
          </div>
          <div style="margin-top:5px;font-size:11px;color:var(--text-muted);line-height:1.35;">
            Automatically schedules rider warm-up for every race & category relative to staging time.
          </div>
        </div>

        <div class="modal-section">
          <label class="modal-label">Alert Lead Time</label>
          <div class="lead-time-buttons" id="leadTimeButtons">
            <button
              type="button"
              class="lead-time-btn"
              :class="{ active: leadTime === 30 }"
              @click="leadTime = 30"
            >30 mins</button>
            <button
              type="button"
              class="lead-time-btn"
              :class="{ active: leadTime === 15 }"
              @click="leadTime = 15"
            >15 mins</button>
            <button
              type="button"
              class="lead-time-btn"
              :class="{ active: leadTime === 5 }"
              @click="leadTime = 5"
            >5 mins</button>
            <button
              type="button"
              class="lead-time-btn"
              :class="{ active: leadTime === 'custom' }"
              @click="leadTime = 'custom'"
            >Custom</button>
          </div>
          <div v-show="leadTime === 'custom'" class="custom-time-row" style="margin-top:8px;display:flex;align-items:center;gap:8px;">
            <input v-model.number="customLeadTime" type="number" min="1" max="180" placeholder="Minutes" class="custom-minutes-input">
            <span style="font-size:12px;color:var(--text-muted);">minutes beforehand</span>
          </div>
        </div>

        <div class="modal-section">
          <label class="modal-label">Browser Permissions & Sound</label>
          <div class="permission-status-row">
            <div style="display:flex;flex-direction:column;gap:2px;">
              <span style="font-size:13px;font-weight:600;color:var(--text-main);">Push Notifications</span>
              <span style="font-size:11px;color:var(--text-muted);">Status: {{ permissionStatus }}</span>
            </div>
            <button type="button" class="action-mini-btn" @click="requestPermission">Enable</button>
          </div>
          <div style="margin-top:6px;font-size:11px;color:var(--text-muted);line-height:1.35;">
            📱 <strong>iPhone users:</strong> Tap Safari Share ⎋ &rarr; <em>"Add to Home Screen"</em> to enable system notifications. In-app chimes and alerts always work!
          </div>
          <div style="margin-top:10px;">
            <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;width:100%;">
              <span style="font-size:13px;font-weight:600;color:var(--text-main);">Sound Chime</span>
              <input v-model="soundEnabled" type="checkbox">
            </label>
          </div>
        </div>

        <div class="modal-section">
          <label class="modal-label">Active Subscriptions</label>
          <div class="active-subs-box">
            <span style="color:var(--text-muted);font-size:12px;">No active alerts. Tap 🔔 on any category or wave to subscribe.</span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="test-alert-btn" @click="testNotification">🔔 Test Notification</button>
        <button type="button" class="done-modal-btn" @click="handleClose">Done</button>
      </div>
    </div>
  </div>
</template>
