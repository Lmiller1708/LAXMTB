<script setup lang="ts">
import type { Race } from '../types/race'

const props = defineProps<{
  race: Race
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
  <div v-if="race.embedMapUrl" class="event-map-container" :class="{ 'map-fullscreen-active': isFullscreen }" id="eventMapContainer">
    <div class="event-map-header collapsible-header" @click="isOpen = !isOpen">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="event-map-title"><span>🗺️</span> Interactive Course & Venue Map</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button
          v-if="isCoachAuth"
          type="button"
          class="card-inline-edit-btn"
          title="Edit Course Map Links"
          @click.stop="emit('edit')"
        >
          <span>✏️</span>
        </button>
        <div class="map-header-actions" style="display:flex;align-items:center;gap:6px;">
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
    <div v-show="isOpen" class="collapsible-body">
      <div class="map-iframe-wrapper">
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
