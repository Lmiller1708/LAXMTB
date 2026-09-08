<script setup lang="ts">
defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'openNotifications'): void
}>()

const handleClose = () => {
  emit('close')
}

const handleSettings = () => {
  emit('close')
  emit('openNotifications')
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" id="whatsNewModalOverlay" @click.self="handleClose">
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="whatsNewModalTitle">
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:18px;">✨</span>
          <h3 id="whatsNewModalTitle" style="margin:0;font-size:16px;font-weight:700;color:var(--text-main);">What's New</h3>
        </div>
        <button type="button" class="modal-close-btn" aria-label="Close modal" @click="handleClose">✕</button>
      </div>

      <div class="modal-body">
        <!-- Notification Phone Guide Alert Box -->
        <div class="phone-alert-guide-box">
          <div class="phone-alert-guide-header">
            <span>📱</span>
            <span>Important: Getting Notifications On Your Phone</span>
          </div>
          <ul class="phone-alert-guide-list">
            <li><strong>iPhone / iPad (iOS Safari):</strong> Apple requires web apps to be installed to the home screen for lock screen push alerts. Tap <strong>Share <span style="font-size:13px;">⎋</span></strong> at bottom of Safari &rarr; tap <strong>"Add to Home Screen"</strong> &rarr; open the app from your home screen and enable notifications.</li>
            <li><strong>Android (Chrome):</strong> Tap the <strong>🔔 Notifications</strong> menu &rarr; tap <strong>Enable</strong> &rarr; press <strong>Allow</strong> when prompted by Chrome.</li>
            <li><strong>In-App Banners & Audio Chimes:</strong> Even without phone lock screen push alerts, in-app visual banners and sound chimes remain <strong>100% active</strong> whenever the page is open!</li>
          </ul>
        </div>

        <!-- Features Section -->
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div class="whatsnew-item">
            <div class="whatsnew-item-icon">🔔</div>
            <div class="whatsnew-item-body">
              <div style="display:flex;align-items:center;gap:6px;">
                <span class="whatsnew-item-title">Stage & Wave Notifications</span>
                <span class="whatsnew-pill-badge">New</span>
              </div>
              <div class="whatsnew-item-desc">Never miss a call-up! Subscribe with the 🔔 icon on any category, wave, or rider to receive automated staging grid or gun-time alerts (30, 15, 5, or custom minutes prior).</div>
            </div>
          </div>

          <div class="whatsnew-item">
            <div class="whatsnew-item-icon">⏱️</div>
            <div class="whatsnew-item-body">
              <div style="display:flex;align-items:center;gap:6px;">
                <span class="whatsnew-item-title">2026 Wave & Staging Schedule</span>
                <span class="whatsnew-pill-badge">Updated</span>
              </div>
              <div class="whatsnew-item-desc">Synchronized with the official 2026 Bluff Bash schedule, including category call-up times, staging grid positions, and Sunday morning pre-ride slots (7:00 AM – 9:30 AM).</div>
            </div>
          </div>

          <div class="whatsnew-item">
            <div class="whatsnew-item-icon">📱</div>
            <div class="whatsnew-item-body">
              <div style="display:flex;align-items:center;gap:6px;">
                <span class="whatsnew-item-title">Clean Mobile Header & Menu</span>
                <span class="whatsnew-pill-badge">Refined</span>
              </div>
              <div class="whatsnew-item-desc">A unified navigation drawer keeps controls accessible without cluttering your screen, while brand titles are crisp and perfectly scaled across phone displays.</div>
            </div>
          </div>

          <div class="whatsnew-item">
            <div class="whatsnew-item-icon">⚡</div>
            <div class="whatsnew-item-body">
              <div style="display:flex;align-items:center;gap:6px;">
                <span class="whatsnew-item-title">Offline Venue Caching</span>
                <span class="whatsnew-pill-badge">PWA</span>
              </div>
              <div class="whatsnew-item-desc">Built for venues with spotty cellular reception. Results and schedules cache locally so you can check start lists right from the staging area.</div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="test-alert-btn" @click="handleSettings">⚙️ Notification Settings</button>
        <button type="button" class="done-modal-btn" @click="handleClose">Got it</button>
      </div>
    </div>
  </div>
</template>
