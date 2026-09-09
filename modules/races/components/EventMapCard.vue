<script setup lang="ts">
import type { Race } from '../types/race'

const props = defineProps<{
  race: Race
  isCompleted?: boolean
  isCoachAuth?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
}>()

const isOpen = ref(true)
const isFullscreen = ref(false)

const formatCourseMapEmbedUrl = (url?: string) => {
  if (!url || typeof url !== 'string') return ''
  let trimmed = url.trim()
  if (!trimmed) return ''
  const iframeMatch = trimmed.match(/src=["']([^"']+)["']/i)
  if (iframeMatch && iframeMatch[1]) {
    trimmed = iframeMatch[1].trim()
  }
  const midMatch = trimmed.match(/[?&]mid=([a-zA-Z0-9_\-]+)/)
  if (midMatch && midMatch[1]) {
    return `https://www.google.com/maps/d/embed?mid=${midMatch[1]}&ehbc=2E312F`
  }
  return trimmed
}

const directMapUrl = computed(() => {
  if (props.race.fullMapUrl?.trim()) return props.race.fullMapUrl.trim()
  if (props.race.embedMapUrl) {
    return props.race.embedMapUrl.replace(/\/embed(\?|$)/, '/viewer$1')
  }
  return ''
})

const mapEmbedUrl = computed(() => {
  return formatCourseMapEmbedUrl(props.race.embedMapUrl)
})

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}
</script>

<template>
  <div v-if="race.embedMapUrl" class="event-map-container" :class="{ 'card-collapsed': !isOpen, 'map-fullscreen-active': isFullscreen }" id="eventMapContainer">
    <div class="event-map-header collapsible-header" @click="isOpen = !isOpen">
      <div class="event-map-header-main" style="display:flex;align-items:center;justify-content:space-between;width:100%;min-width:0;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;min-width:0;">
          <span class="event-map-title">
            <span>🗺️</span> Interactive Course & Venue Map
            <span v-if="isCompleted" class="signup-badge-closed">Event Concluded • Archived</span>
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
          <button
            v-if="isCoachAuth"
            type="button"
            class="card-inline-edit-btn"
            title="Edit Course Map Links"
            @click.stop="emit('edit')"
          >
            <span>✏️</span>
          </button>
          <div v-show="isOpen && !isCompleted" class="map-header-actions desktop-map-actions" style="display:flex;align-items:center;gap:6px;">
            <a
              v-if="directMapUrl"
              :href="directMapUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-icon"
              style="text-decoration:none;font-size:11px;padding:4px 10px;font-weight:700;display:inline-flex;align-items:center;gap:4px;"
              title="Open course map in Google Maps"
              @click.stop
            >
              <span>🗺️</span> <span>Open Map ↗</span>
            </a>
            <button
              type="button"
              class="btn-icon"
              id="mapAppFullscreenBtn"
              style="font-size:11px;padding:4px 10px;font-weight:700;"
              @click.stop="toggleFullscreen"
            >
              <span id="mapFsIcon">{{ isFullscreen ? '✕' : '⛶' }}</span>
              <span id="mapFsLabel">{{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map' }}</span>
            </button>
          </div>
          <span class="card-toggle-icon" :class="{ collapsed: !isOpen }" id="mapToggleChevron" title="Toggle Map">▼</span>
        </div>
      </div>
      <div v-show="isOpen && !isCompleted" class="map-header-actions mobile-map-actions" style="display:none;width:100%;gap:6px;margin-top:8px;" @click.stop>
        <a
          v-if="directMapUrl"
          :href="directMapUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-icon"
          style="text-decoration:none;font-size:11px;padding:4px 10px;font-weight:700;display:inline-flex;align-items:center;gap:4px;"
          title="Open course map in Google Maps"
        >
          <span>🗺️</span> <span>Open Map ↗</span>
        </a>
        <button
          type="button"
          class="btn-icon"
          style="font-size:11px;padding:4px 10px;font-weight:700;"
          @click="toggleFullscreen"
        >
          <span>{{ isFullscreen ? '✕' : '⛶' }}</span>
          <span>{{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map' }}</span>
        </button>
      </div>
    </div>
    <div v-show="isOpen" class="collapsible-body">
      <!-- State A: Completed / Past Race Map -->
      <div v-if="isCompleted" class="map-closed-container">
        <div class="map-closed-card">
          <div class="map-closed-icon-bubble">
            <span>🏁</span>
          </div>
          <div class="map-closed-badge">Course Map Archived</div>
          <h3 class="map-closed-title">{{ race.name }} Course Map</h3>
          <p class="map-closed-desc">
            This race has concluded and the active race-day course map has been archived by the league. Trailhead and venue directions are still available above!
          </p>
          <div v-if="race.navigationUrl || race.googleMapsUrl || directMapUrl" class="map-closed-actions">
            <a
              v-if="race.navigationUrl || race.googleMapsUrl"
              :href="race.navigationUrl || race.googleMapsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-primary"
              style="font-size:12px;padding:8px 16px;"
            >
              <span>🧭</span> Navigate to Venue
            </a>
            <a
              v-if="directMapUrl"
              :href="directMapUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-secondary"
              style="font-size:12px;padding:8px 16px;"
            >
              <span>🗺️</span> Google My Maps Archive ↗
            </a>
          </div>
        </div>
      </div>

      <!-- State B: Active / Live Event Map -->
      <div v-else class="map-iframe-wrapper">
        <iframe
          :src="mapEmbedUrl"
          width="100%"
          height="100%"
          loading="lazy"
          allowfullscreen
          referrerpolicy="no-referrer-when-downgrade"
          :title="`Course & Venue Map for ${race.name}`"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mobile-map-actions {
  display: none;
}
@media (max-width: 600px) {
  .desktop-map-actions {
    display: none !important;
  }
  .mobile-map-actions {
    display: flex !important;
  }
}
</style>
