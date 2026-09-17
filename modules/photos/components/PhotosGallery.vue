<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Race } from '~/modules/races/types/race'
import { useCoachAuth } from '~/modules/coach-admin/composables/useCoachAuth'

const props = defineProps<{
  race: Race
  isCoachAuth?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'openAuth', mode?: 'login' | 'signup'): void
}>()

const {
  user,
  userProfile,
  canViewPhotos,
  isGuardianOrAbove,
  profileLoading,
  authLoading
} = useCoachAuth()

const copied = ref(false)

const DEFAULT_TEAM_PHOTOS_URL = 'https://photos.app.goo.gl/XgNFXXB5XMakNz5U9'
const DEFAULT_RACE_PHOTOS_MAP: Record<string, string> = {
  'bluff-bash': 'https://photos.app.goo.gl/XgNFXXB5XMakNz5U9',
  'cable-conquest': 'https://photos.app.goo.gl/9GiHDEfZ3DTP13i19',
  'hodag-hustle': 'https://photos.app.goo.gl/NBgQ8MtjhqLgXref9',
  'gnarly-nordic': 'https://photos.app.goo.gl/FM8oW7tioTPXoz5p9',
  'red-barn': 'https://photos.app.goo.gl/eqEaqUA1C1QiuTiZA',
  'trek-trails': 'https://photos.app.goo.gl/eqEaqUA1C1QiuTiZA'
}

// Only compute and expose the album URL when the user has minimum Guardian access
const albumUrl = computed(() => {
  if (!canViewPhotos.value) return ''
  const fallback = DEFAULT_RACE_PHOTOS_MAP[props.race?.id] || DEFAULT_TEAM_PHOTOS_URL
  let url = props.race?.photosUrl?.trim() || fallback
  if (url && !/^https?:\/\//i.test(url)) {
    url = 'https://' + url
  }
  return url
})

const copyLink = () => {
  if (!import.meta.client || !canViewPhotos.value) return
  navigator.clipboard.writeText(albumUrl.value)
    .then(() => {
      copied.value = true
      setTimeout(() => { copied.value = false }, 2500)
    })
    .catch(() => prompt('Copy album link:', albumUrl.value))
}

const handleOpenLogin = () => {
  emit('openAuth', 'login')
}

const handleOpenSignup = () => {
  emit('openAuth', 'signup')
}
</script>

<template>
  <div class="photos-tab-wrapper">
    <!-- LOADING STATE -->
    <div v-if="authLoading || (user && profileLoading && !canViewPhotos)" class="photos-loading-card">
      <div class="photos-loading-spinner" />
      <p>Verifying team access permissions...</p>
    </div>

    <!-- LOCKED STATE: Unauthenticated or Non-Guardian -->
    <div v-else-if="!canViewPhotos" class="photos-locked-section">
      <div class="photos-locked-card">
        <h3 class="photos-locked-title">
          <span>📸</span> {{ race.name }} Photos
        </h3>

        <p class="photos-locked-desc">
          Official shared Google Photos album for {{ race.name }} • {{ race.dateStr }}
        </p>

        <!-- Case 1: Unauthenticated Visitor -->
        <div v-if="!user" class="photos-auth-actions">
          <button
            type="button"
            class="btn-photos-login"
            @click="handleOpenLogin"
          >
            <span>🔐</span> Log In to View Photos
          </button>
        </div>

        <!-- Case 2: Authenticated but Insufficient Role (e.g. Member) -->
        <div v-else class="photos-insufficient-box">
          <div class="photos-current-account">
            Signed in as <strong>{{ userProfile?.name || user.displayName || user.email }}</strong>
            <span class="photos-role-chip">{{ userProfile?.role || 'Member' }}</span>
          </div>
          <p class="photos-insufficient-msg">
            Guardian or Coach access is required to view team photos.
          </p>
          <button
            type="button"
            class="btn-photos-secondary"
            style="margin: 0 auto; display: inline-flex; align-items: center; gap: 6px;"
            @click="handleOpenSignup"
          >
            <span>🎟️</span> Enter Access Code
          </button>
        </div>
      </div>
    </div>

    <!-- UNLOCKED STATE: Authorized Guardian, Coach, Admin, or Owner -->
    <template v-else>
      <!-- Hero Album Showcase Card -->
      <div class="photos-gallery-section" style="margin-top:0;">
        <div class="photos-gallery-header" style="flex-wrap:wrap;gap:14px;align-items:center;">
          <div style="flex:1;min-width:240px;">
            <h3 class="photos-gallery-title" style="font-size:18px;margin-bottom:4px;">
              <span>📸</span> {{ race.name }} Photos
            </h3>
            <span style="font-size:12.5px;color:var(--text-muted);display:block;line-height:1.4;">
              Official shared Google Photos album for {{ race.name }} • {{ race.dateStr }}
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
              :title="copied ? 'Copied!' : 'Copy shareable album link'"
              @click="copyLink"
            >
              <span>{{ copied ? '✅' : '🔗' }}</span> {{ copied ? 'Copied!' : 'Copy Link' }}
            </button>
            <button
              v-if="isCoachAuth"
              type="button"
              class="card-inline-edit-btn"
              title="Edit Album Link for this Event"
              style="padding:9px 12px;border-radius:8px;font-size:12px;font-weight:700;"
              @click.stop="emit('edit')"
            >
              <span>✏️</span> Edit Link
            </button>
          </div>
        </div>

        <!-- Main Interactive Hub Card -->
        <div style="text-align:center;padding:48px 24px;background:var(--bg-subtle);border-radius:14px;margin-top:16px;border:1px solid var(--border);">
          <div style="font-size:52px;margin-bottom:14px;line-height:1;">📸</div>
          <h4 style="font-size:20px;font-weight:800;margin-bottom:8px;color:var(--text-main);letter-spacing:-0.3px;">
            {{ race.name }} Shared Album
          </h4>
          <p style="font-size:14px;color:var(--text-muted);max-width:520px;margin:0 auto 24px;line-height:1.55;">
            The team Google Photos album is ready for {{ race.name }}! Open the album to browse full-resolution photos, download favorites, and upload your race day pictures and videos.
          </p>

          <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
            <a
              :href="albumUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-primary"
              style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;font-size:14px;text-decoration:none;border-radius:10px;font-weight:700;box-shadow:0 4px 12px rgba(220,38,38,0.25);"
            >
              <span>📷</span> Open in Google Photos ↗
            </a>
            <button
              type="button"
              class="btn-photos-secondary"
              style="padding:12px 20px;font-size:14px;border-radius:10px;"
              @click="copyLink"
            >
              <span>{{ copied ? '✅ Link Copied!' : '🔗 Copy Shareable Link' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Features Grid -->
      <div class="photos-features-grid">
        <div class="photo-feature-card">
          <div class="photo-feature-icon">📤</div>
          <div>
            <h4 class="photo-feature-title">Add Your Photos</h4>
            <p class="photo-feature-desc">Parents &amp; riders can upload directly from their phone camera roll to the team album during race weekends.</p>
          </div>
        </div>
        <div class="photo-feature-card">
          <div class="photo-feature-icon">💬</div>
          <div>
            <h4 class="photo-feature-title">Comment &amp; Cheer</h4>
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

      <!-- How to Share Your Photos with the Team -->
      <div class="photos-guide-card">
        <h4><span>💡</span> How to Share Your Photos with the Team</h4>
        <ul class="photos-guide-steps">
          <li>
            <span class="photos-step-num">1</span>
            <div>
              <strong>Open the Album:</strong> Tap <strong>"Open Google Photos Album"</strong> above.
              If you have the Google Photos app installed, it opens instantly.
            </div>
          </li>
          <li>
            <span class="photos-step-num">2</span>
            <div>
              <strong>Tap "Join":</strong> Tap the <strong>Join</strong> button at the top of the album
              in Google Photos so you can contribute and comment.
            </div>
          </li>
          <li>
            <span class="photos-step-num">3</span>
            <div>
              <strong>Tap the "+" or "Add Photos" Icon:</strong> Select your best course shots,
              pit zone candids, and podium moments from your camera roll.
            </div>
          </li>
          <li>
            <span class="photos-step-num">4</span>
            <div>
              <strong>Upload &amp; Enjoy:</strong> Your photos will appear instantly for all LAX MTB
              team families and athletes to see and save!
            </div>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<style scoped>
.photos-loading-card {
  text-align: center;
  padding: 48px 20px;
  background: var(--bg-card, #1c1917);
  border-radius: 14px;
  border: 1px solid var(--border, #292524);
  color: var(--text-muted, #a8a29e);
  font-size: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.photos-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(220, 38, 38, 0.2);
  border-top-color: var(--accent-red, #dc2626);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.photos-locked-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.photos-locked-card {
  text-align: center;
  padding: 48px 24px;
  background: var(--bg-card, #1c1917);
  border-radius: 14px;
  border: 1px solid var(--border, #292524);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  position: relative;
  overflow: hidden;
}

.photos-locked-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-main, #f5f5f4);
  margin-bottom: 8px;
  letter-spacing: -0.3px;
}

.photos-locked-desc {
  font-size: 13.5px;
  color: var(--text-muted, #a8a29e);
  max-width: 480px;
  margin: 0 auto 20px;
  line-height: 1.5;
}

.photos-auth-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.btn-photos-login {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: #ffffff;
  font-weight: 700;
  font-size: 15px;
  padding: 13px 32px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35);
  transition: all 0.2s ease;
}

.btn-photos-login:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(220, 38, 38, 0.45);
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.photos-insufficient-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border, #292524);
  border-radius: 10px;
  padding: 18px 20px;
  max-width: 460px;
  margin: 0 auto;
  text-align: center;
}

.photos-current-account {
  font-size: 13.5px;
  color: var(--text-main, #f5f5f4);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.photos-role-chip {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-muted, #a8a29e);
}

.photos-insufficient-msg {
  font-size: 13px;
  color: var(--text-muted, #a8a29e);
  line-height: 1.5;
  margin: 0 auto 14px;
}
</style>

