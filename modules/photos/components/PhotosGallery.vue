<script setup lang="ts">
import { doc, onSnapshot } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import type { Race, PhotoItem } from '~/modules/races/types/race'

const props = defineProps<{
  race: Race
  isCoachAuth?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
}>()

const db = useFirestore()
const { isOnline } = useNetworkStatus()

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

// Photos loading & pagination
const photos = ref<PhotoItem[]>([])
const photosPageLimit = ref(24)
const currentLightboxIdx = ref(-1)
let unsubscribePhotos: (() => void) | null = null

const visiblePhotos = computed(() => photos.value.slice(0, photosPageLimit.value))
const hasMore = computed(() => photos.value.length > photosPageLimit.value)

const loadPhotos = () => {
  if (!import.meta.client) return

  // 1. If race object already contains photos array
  if (Array.isArray(props.race?.photos) && props.race.photos.length > 0) {
    photos.value = props.race.photos
    return
  }

  // 2. Check offline guard: If offline, do not attempt network fetch
  if (!navigator.onLine || !isOnline.value) {
    console.info('[PhotosGallery] Device is offline — skipping live photos fetch')
    return
  }

  // 3. Connect to live Firestore photos collection
  if (db && props.race?.id) {
    if (unsubscribePhotos) {
      unsubscribePhotos()
      unsubscribePhotos = null
    }

    try {
      const docRef = doc(db, 'photos', props.race.id)
      unsubscribePhotos = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data()
            if (Array.isArray(data?.items)) {
              photos.value = data.items
              return
            }
          }
          if (Array.isArray(props.race?.photos)) {
            photos.value = props.race.photos
          } else {
            photos.value = []
          }
        },
        (err) => {
          console.warn('[PhotosGallery] Firestore live photos error:', err)
        }
      )
    } catch (err) {
      console.warn('[PhotosGallery] Could not attach Firestore photos listener:', err)
    }
  }
}

onMounted(() => {
  loadPhotos()
})

onUnmounted(() => {
  if (unsubscribePhotos) {
    unsubscribePhotos()
    unsubscribePhotos = null
  }
})

watch(() => props.race?.id, () => {
  photosPageLimit.value = 24
  currentLightboxIdx.value = -1
  loadPhotos()
})

// Lightbox controls
const openLightbox = (idx: number) => {
  currentLightboxIdx.value = idx
}

const closeLightbox = () => {
  currentLightboxIdx.value = -1
}

const navLightbox = (step: number) => {
  if (photos.value.length === 0) return
  let next = currentLightboxIdx.value + step
  if (next < 0) next = photos.value.length - 1
  if (next >= photos.value.length) next = 0
  currentLightboxIdx.value = next
}

// Touch swipe gestures for lightbox
let touchStartX = 0
let touchStartY = 0
let touchEndX = 0
let touchEndY = 0

const onTouchStart = (e: TouchEvent) => {
  if (!e.touches || e.touches.length !== 1) return
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  touchEndX = touchStartX
  touchEndY = touchStartY
}

const onTouchMove = (e: TouchEvent) => {
  if (!e.touches || e.touches.length !== 1) return
  touchEndX = e.touches[0].clientX
  touchEndY = e.touches[0].clientY
}

const onTouchEnd = () => {
  const diffX = touchEndX - touchStartX
  const diffY = touchEndY - touchStartY
  const absX = Math.abs(diffX)
  const absY = Math.abs(diffY)

  if (absX > 45 && absX > absY * 1.5) {
    if (diffX < 0) {
      navLightbox(1) // swipe left -> next
    } else {
      navLightbox(-1) // swipe right -> prev
    }
  } else if (diffY > 80 && absY > absX * 1.5) {
    closeLightbox() // swipe down -> close
  }
}

// Keyboard shortcuts for lightbox
onMounted(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    if (currentLightboxIdx.value === -1) return
    if (e.key === 'Escape') closeLightbox()
    else if (e.key === 'ArrowRight') navLightbox(1)
    else if (e.key === 'ArrowLeft') navLightbox(-1)
  }
  window.addEventListener('keydown', onKeyDown)
  onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
})
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
            <template v-if="photos.length > 0">
              Showing {{ visiblePhotos.length }} of {{ photos.length }} shared team photos • Tap any photo to view full-size
            </template>
            <template v-else>
              Shared team photo album for {{ race.name }}.
            </template>
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
            <span>📷</span> Open Google Photos {{ photos.length > 0 ? `(${photos.length})` : '↗' }}
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

      <!-- In-App Photos Grid -->
      <template v-if="photos.length > 0">
        <div class="photos-gallery-grid">
          <div
            v-for="(p, idx) in visiblePhotos"
            :key="idx"
            class="photo-thumb-card"
            title="View photo full-size"
            @click="openLightbox(idx)"
          >
            <img
              :src="`${p.url}=w400-h400-c`"
              alt="LAX MTB Team Photo"
              class="photo-thumb-img"
              loading="lazy"
              referrerpolicy="no-referrer"
            >
            <div class="photo-thumb-overlay">
              <span class="photo-zoom-icon">🔍</span>
            </div>
          </div>
        </div>

        <div v-if="hasMore" style="margin-top:16px;text-align:center;">
          <button
            type="button"
            class="btn-photos-secondary"
            style="font-size:13px;padding:10px 24px;"
            @click="photosPageLimit += 24"
          >
            <span>⬇️</span> Load More Photos ({{ photos.length - visiblePhotos.length }} remaining)
          </button>
        </div>
      </template>

      <!-- Empty / Fallback Album Card -->
      <div v-else style="text-align:center;padding:42px 20px;background:var(--bg-subtle);border-radius:12px;margin-top:16px;border:1px solid var(--border);">
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

    <!-- Lightbox Modal Container -->
    <div
      v-if="currentLightboxIdx >= 0 && photos[currentLightboxIdx]"
      class="photo-lightbox-overlay show"
      @click="closeLightbox"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div class="photo-lightbox-content" @click.stop>
        <button type="button" class="lightbox-close-btn" title="Close viewer" @click="closeLightbox">✕</button>
        <img
          :src="`${photos[currentLightboxIdx].url}=w1920-h1280`"
          alt="LAX MTB Full Photo"
          class="photo-lightbox-img"
          referrerpolicy="no-referrer"
        >
        <div class="photo-lightbox-controls">
          <button type="button" class="lightbox-nav-btn" title="Previous photo" @click="navLightbox(-1)">‹</button>
          <span style="font-weight:700;font-size:13px;">{{ currentLightboxIdx + 1 }} / {{ photos.length }}</span>
          <button type="button" class="lightbox-nav-btn" title="Next photo" @click="navLightbox(1)">›</button>
        </div>
      </div>
    </div>
  </div>
</template>
