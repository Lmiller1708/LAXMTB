<script setup lang="ts">
import { useNotificationSubscriptions } from '../composables/useNotificationSubscriptions'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const {
  notifConfig,
  subscribedCategories,
  subscribedWaves,
  subscribedRideGroups,
  permissionStatus,
  saveConfig,
  removeSubByIndex,
  removeRideGroupByIndex,
  clearAllSubscriptions,
  requestBrowserPermission,
  triggerTestNotification
} = useNotificationSubscriptions()

const customWarmupInput = ref(notifConfig.value.warmupOffset || 45)
const customLeadTimeInput = ref(notifConfig.value.offset || 15)

const handleClose = () => {
  saveConfig()
  emit('close')
}

const setAlertTarget = (target: 'warmup' | 'stage' | 'start') => {
  notifConfig.value.target = target
  saveConfig()
}

const setWarmupOffset = (val: number | 'custom') => {
  if (val === 'custom') {
    notifConfig.value.warmupOffset = customWarmupInput.value || 45
  } else {
    notifConfig.value.warmupOffset = val
  }
  saveConfig()
}

const onCustomWarmupChange = () => {
  if (customWarmupInput.value > 0) {
    notifConfig.value.warmupOffset = customWarmupInput.value
    saveConfig()
  }
}

const setLeadTime = (val: number | 'custom') => {
  if (val === 'custom') {
    notifConfig.value.offset = customLeadTimeInput.value || 15
  } else {
    notifConfig.value.offset = val
  }
  saveConfig()
}

const onCustomLeadTimeChange = () => {
  if (customLeadTimeInput.value > 0) {
    notifConfig.value.offset = customLeadTimeInput.value
    saveConfig()
  }
}

const onSoundChange = () => {
  saveConfig()
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay show" id="notifModalOverlay" @click.self="handleClose">
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="notifModalTitle">
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:18px;line-height:1;">🔔</span>
          <h3 id="notifModalTitle" style="margin:0;font-size:16px;font-weight:700;color:var(--text-main);">Race Notifications</h3>
        </div>
        <button type="button" class="modal-close-btn" aria-label="Close modal" @click="handleClose">✕</button>
      </div>

      <div class="modal-body">
        <div class="modal-section">
          <label class="modal-label">Alert Target</label>
          <div class="modal-radio-group">
            <label class="modal-radio-card" @click="setAlertTarget('warmup')">
              <input :checked="notifConfig.target === 'warmup'" type="radio" value="warmup" @change="setAlertTarget('warmup')">
              <div class="radio-card-content">
                <strong>Warm-up Time</strong>
                <small>Alert prior to rider & team warm-up</small>
              </div>
            </label>
            <label class="modal-radio-card" @click="setAlertTarget('stage')">
              <input :checked="notifConfig.target === 'stage'" type="radio" value="stage" @change="setAlertTarget('stage')">
              <div class="radio-card-content">
                <strong>Staging Time</strong>
                <small>Alert prior to staging grid call-up</small>
              </div>
            </label>
            <label class="modal-radio-card" @click="setAlertTarget('start')">
              <input :checked="notifConfig.target === 'start'" type="radio" value="start" @change="setAlertTarget('start')">
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
              :class="{ active: notifConfig.warmupOffset === 60 }"
              @click="setWarmupOffset(60)"
            >60 mins</button>
            <button
              type="button"
              class="lead-time-btn"
              :class="{ active: notifConfig.warmupOffset === 45 }"
              @click="setWarmupOffset(45)"
            >45 mins</button>
            <button
              type="button"
              class="lead-time-btn"
              :class="{ active: notifConfig.warmupOffset === 30 }"
              @click="setWarmupOffset(30)"
            >30 mins</button>
            <button
              type="button"
              class="lead-time-btn"
              :class="{ active: ![60, 45, 30].includes(notifConfig.warmupOffset) }"
              @click="setWarmupOffset('custom')"
            >Custom</button>
          </div>
          <div v-show="![60, 45, 30].includes(notifConfig.warmupOffset)" class="custom-time-row" style="margin-top:8px;display:flex;align-items:center;gap:8px;">
            <input v-model.number="customWarmupInput" type="number" min="1" max="180" placeholder="Minutes" class="custom-minutes-input" @input="onCustomWarmupChange">
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
              :class="{ active: notifConfig.offset === 30 }"
              @click="setLeadTime(30)"
            >30 mins</button>
            <button
              type="button"
              class="lead-time-btn"
              :class="{ active: notifConfig.offset === 15 }"
              @click="setLeadTime(15)"
            >15 mins</button>
            <button
              type="button"
              class="lead-time-btn"
              :class="{ active: notifConfig.offset === 5 }"
              @click="setLeadTime(5)"
            >5 mins</button>
            <button
              type="button"
              class="lead-time-btn"
              :class="{ active: ![30, 15, 5].includes(notifConfig.offset) }"
              @click="setLeadTime('custom')"
            >Custom</button>
          </div>
          <div v-show="![30, 15, 5].includes(notifConfig.offset)" class="custom-time-row" style="margin-top:8px;display:flex;align-items:center;gap:8px;">
            <input v-model.number="customLeadTimeInput" type="number" min="1" max="180" placeholder="Minutes" class="custom-minutes-input" @input="onCustomLeadTimeChange">
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
            <button type="button" class="action-mini-btn" @click="requestBrowserPermission">
              {{ permissionStatus === 'granted' ? 'Allowed' : 'Enable' }}
            </button>
          </div>
          <div style="margin-top:6px;font-size:11px;color:var(--text-muted);line-height:1.35;">
            📱 <strong>iPhone users:</strong> Tap Safari Share ⎋ &rarr; <em>"Add to Home Screen"</em> to enable system notifications. In-app chimes and alerts always work!
          </div>
          <div style="margin-top:10px;">
            <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;width:100%;">
              <span style="font-size:13px;font-weight:600;color:var(--text-main);">Sound Chime</span>
              <input v-model="notifConfig.sound" type="checkbox" @change="onSoundChange">
            </label>
          </div>
        </div>

        <div class="modal-section">
          <label class="modal-label">Active Subscriptions</label>
          <div class="active-subs-box">
            <template v-if="subscribedCategories.length === 0 && subscribedWaves.length === 0 && subscribedRideGroups.length === 0">
              <span style="color:var(--text-muted);font-size:12px;">No active alerts. Tap 🔔 on any category, wave, or sign up for a ride group to subscribe.</span>
            </template>
            <template v-else>
              <div v-for="(grp, idx) in subscribedRideGroups" :key="`grp-${idx}`" class="active-sub-item">
                <span><strong>{{ grp.sessionType === 'wu' ? '🔥 Warm-up Group:' : '🚵 Pre-Ride:' }}</strong> {{ grp.name }} ({{ grp.meetingTime }})</span>
                <button type="button" class="remove-sub-btn" style="background:none;border:none;color:var(--accent-red);cursor:pointer;font-size:14px;padding:0 4px;" title="Remove alert" @click="removeRideGroupByIndex(idx)">✕</button>
              </div>
              <div v-for="(cat, idx) in subscribedCategories" :key="`cat-${idx}`" class="active-sub-item">
                <span><strong>Category:</strong> {{ cat }}</span>
                <button type="button" class="remove-sub-btn" style="background:none;border:none;color:var(--accent-red);cursor:pointer;font-size:14px;padding:0 4px;" title="Remove alert" @click="removeSubByIndex(idx, false)">✕</button>
              </div>
              <div v-for="(wKey, idx) in subscribedWaves" :key="`wave-${idx}`" class="active-sub-item">
                <span><strong>Wave:</strong> {{ wKey.replace('::', ' - ') }}</span>
                <button type="button" class="remove-sub-btn" style="background:none;border:none;color:var(--accent-red);cursor:pointer;font-size:14px;padding:0 4px;" title="Remove alert" @click="removeSubByIndex(idx, true)">✕</button>
              </div>
            </template>
          </div>
          <button
            v-if="subscribedCategories.length > 0 || subscribedWaves.length > 0 || subscribedRideGroups.length > 0"
            type="button"
            class="clear-subs-btn"
            style="margin-top:8px;background:none;border:none;color:var(--accent-red);font-size:11.5px;font-weight:600;cursor:pointer;padding:0;"
            @click="clearAllSubscriptions"
          >
            Clear All Subscriptions
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="test-alert-btn" @click="triggerTestNotification">🔔 Test Notification</button>
        <button type="button" class="done-modal-btn" @click="handleClose">Done</button>
      </div>
    </div>
  </div>
</template>
