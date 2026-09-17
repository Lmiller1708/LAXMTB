<script setup lang="ts">
import { useSiteAnnouncement } from '../composables/useSiteAnnouncement'

const { announcement, isBannerVisible, formatExpiresAt, dismissAnnouncement } = useSiteAnnouncement()
</script>

<template>
  <Transition name="banner-slide">
    <div
      v-if="isBannerVisible"
      class="site-announcement-banner"
      :class="announcement.type"
      role="alert"
      aria-live="assertive"
    >
      <div class="banner-inner-container">
        <div class="banner-content">
          <div class="banner-icon-badge">
            <span v-if="announcement.type === 'danger'">🚨</span>
            <span v-else-if="announcement.type === 'warning'">📍</span>
            <span v-else>ℹ️</span>
          </div>

          <div class="banner-text-col">
            <div class="banner-headline">
              <span class="banner-title">{{ announcement.title || 'TEAM ANNOUNCEMENT' }}</span>
              <span v-if="announcement.location" class="banner-location-tag">
                📍 {{ announcement.location }}
              </span>
              <span v-if="announcement.expiresAt && formatExpiresAt(announcement.expiresAt)" class="banner-expires-tag">
                ⏳ Until {{ formatExpiresAt(announcement.expiresAt) }}
              </span>
            </div>
            <div class="banner-message">{{ announcement.message }}</div>
          </div>
        </div>

        <button
          type="button"
          class="banner-dismiss-btn"
          aria-label="Dismiss Announcement"
          title="Dismiss notification"
          @click="dismissAnnouncement"
        >
          <span class="dismiss-label">Dismiss</span>
          <span class="dismiss-cross">✕</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.site-announcement-banner {
  position: relative;
  z-index: 200;
  width: 100%;
  padding: 10px 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  transition: all 0.25s ease;
}

.site-announcement-banner.danger {
  background: linear-gradient(90deg, #991b1b 0%, #dc2626 50%, #991b1b 100%);
  color: #ffffff;
  border-bottom: 2px solid #f87171;
}

.site-announcement-banner.warning {
  background: linear-gradient(90deg, #92400e 0%, #d97706 50%, #92400e 100%);
  color: #ffffff;
  border-bottom: 2px solid #fbbf24;
}

.site-announcement-banner.info {
  background: linear-gradient(90deg, #1e40af 0%, #2563eb 50%, #1e40af 100%);
  color: #ffffff;
  border-bottom: 2px solid #60a5fa;
}

.banner-inner-container {
  max-width: 1220px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.banner-icon-badge {
  font-size: 22px;
  line-height: 1;
  flex-shrink: 0;
  animation: pulse-icon 2s infinite;
}

@keyframes pulse-icon {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.banner-text-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.banner-headline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.banner-title {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  background: rgba(0, 0, 0, 0.25);
  padding: 2px 7px;
  border-radius: 4px;
}

.banner-location-tag {
  font-size: 11px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 7px;
  border-radius: 4px;
}

.banner-expires-tag {
  font-size: 11px;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 2px 8px;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #fff;
}

.banner-message {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.4;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

.banner-dismiss-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #ffffff;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.banner-dismiss-btn:hover {
  background: rgba(0, 0, 0, 0.5);
  border-color: #ffffff;
}

.dismiss-cross {
  font-size: 12px;
  font-weight: 800;
}

/* Slide Transition */
.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.banner-slide-enter-from,
.banner-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

@media (max-width: 640px) {
  .site-announcement-banner {
    padding: 8px 12px;
  }
  .banner-message {
    font-size: 12.5px;
  }
  .dismiss-label {
    display: none;
  }
  .banner-dismiss-btn {
    padding: 4px 8px;
  }
}
</style>
