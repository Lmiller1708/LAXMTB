<script setup lang="ts">
import type { Race } from '~/modules/races/types/race'

const props = defineProps<{
  race: Race
  isCoachAuth?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
}>()

const DEFAULT_TEAM_PHOTOS_URL = 'https://photos.app.goo.gl/XgNFXXB5XMakNz5U9'
const DEFAULT_RACE_PHOTOS_MAP: Record<string, string> = {
  'bluff-bash': 'https://photos.app.goo.gl/XgNFXXB5XMakNz5U9',
  'cable-conquest': 'https://photos.app.goo.gl/9GiHDEfZ3DTP13i19',
  'hodag-hustle': 'https://photos.app.goo.gl/NBgQ8MtjhqLgXref9',
  'gnarly-nordic': 'https://photos.app.goo.gl/FM8oW7tioTPXoz5p9',
  'red-barn': 'https://photos.app.goo.gl/eqEaqUA1C1QiuTiZA',
  'trek-trails': 'https://photos.app.goo.gl/eqEaqUA1C1QiuTiZA'
}

const albumUrl = computed(() => {
  const fallback = DEFAULT_RACE_PHOTOS_MAP[props.race?.id] || DEFAULT_TEAM_PHOTOS_URL
  let url = props.race?.photosUrl?.trim() || fallback
  if (url && !/^https?:\/\//i.test(url)) {
    url = 'https://' + url
  }
  return url
})

const copyLink = () => {
  if (import.meta.client) {
    navigator.clipboard.writeText(albumUrl.value)
      .then(() => alert('📋 Google Photos Album link copied to clipboard!'))
      .catch(() => prompt('Copy album link:', albumUrl.value))
  }
}
</script>

<template>
  <div class="photos-tab-wrapper">
    <div class="photos-gallery-section" style="margin-top:0;">
      <div class="photos-gallery-header" style="flex-wrap:wrap;gap:14px;align-items:center;">
        <div style="flex:1;min-width:240px;">
          <h3 class="photos-gallery-title" style="font-size:18px;margin-bottom:4px;">
            <span>📸</span> {{ race.name }} Photos
          </h3>
          <span style="font-size:12.5px;color:var(--text-muted);display:block;line-height:1.4;">
            Shared team photo album for {{ race.name }}.
          </span>
        </div>
        <div class="photos-actions-row" style="margin-left:auto;">
          <a
            :href="albumUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-photos-primary"
            style="font-size:13px;padding:9px 18px;"
            title="Open in Google Photos"
          >
            <span>📷</span> Open Google Photos ↗
          </a>
          <button
            type="button"
            class="btn-photos-secondary"
            style="font-size:13px;padding:9px 14px;"
            title="Copy shareable album link"
            @click="copyLink"
          >
            <span>🔗</span> Copy Link
          </button>
          <button
            v-if="isCoachAuth"
            type="button"
            class="card-inline-edit-btn"
            title="Edit Album Link for this Event"
            style="padding:9px 12px;border-radius:8px;font-size:12px;font-weight:700;"
            @click.stop="emit('edit')"
          >
            <span>✏️</span> Edit
          </button>
        </div>
      </div>

      <!-- In-App Photos Grid or Album Card -->
      <div style="text-align:center;padding:42px 20px;background:var(--bg-subtle);border-radius:12px;margin-top:16px;border:1px solid var(--border);">
        <div style="font-size:44px;margin-bottom:12px;">📸</div>
        <h4 style="font-size:17px;font-weight:700;margin-bottom:8px;color:var(--text-main);">
          {{ race.name }} Shared Album
        </h4>
        <p style="font-size:13px;color:var(--text-muted);max-width:460px;margin:0 auto 20px;line-height:1.5;">
          The shared Google Photos album for this event is ready! Tap below to open the album, browse shared photos, or upload your own pictures and videos.
        </p>
        <a
          :href="albumUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-primary"
          style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;font-size:14px;text-decoration:none;border-radius:8px;font-weight:700;"
        >
          <span>📷</span> Open Google Photos Album ↗
        </a>
      </div>
    </div>

    <!-- Features Grid -->
    <div class="photos-features-grid">
      <div class="photo-feature-card">
        <div class="photo-feature-icon">📤</div>
        <div>
          <h4 class="photo-feature-title">Add Your Photos</h4>
          <p class="photo-feature-desc">Parents & riders can upload directly from their phone camera roll to the team album during race weekends.</p>
        </div>
      </div>
      <div class="photo-feature-card">
        <div class="photo-feature-icon">💬</div>
        <div>
          <h4 class="photo-feature-title">Comment & Cheer</h4>
          <p class="photo-feature-desc">Leave comments on great trail captures, tag riders, and cheer on teammates with Google Photos reactions.</p>
        </div>
      </div>
      <div class="photo-feature-card">
        <div class="photo-feature-icon">💾</div>
        <div>
          <h4 class="photo-feature-title">Full Resolution Downloads</h4>
          <p class="photo-feature-desc">Save original high-resolution photos and videos directly to your device or Google Photos library for free.</p>
        </div>
      </div>
      <div class="photo-feature-card">
        <div class="photo-feature-icon">🔔</div>
        <div>
          <h4 class="photo-feature-title">Join for Updates</h4>
          <p class="photo-feature-desc">Tap "Join" in Google Photos to receive notifications as soon as coaches and parents upload fresh race shots.</p>
        </div>
      </div>
    </div>
  </div>
</template>
