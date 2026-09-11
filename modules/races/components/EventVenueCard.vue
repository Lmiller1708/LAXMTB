<script setup lang="ts">
import DOMPurify from 'dompurify'
import type { Race } from '../types/race'

const props = defineProps<{
  race: Race
  isCoachAuth?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
}>()

const isOpen = ref(true)

const getNavigationUrl = computed(() => {
  if (props.race.navigationUrl?.trim()) return props.race.navigationUrl.trim()
  if (props.race.googleMapsUrl?.trim()) return props.race.googleMapsUrl.trim()
  const dest = [props.race.exactTrailhead, props.race.venue, props.race.address].filter(Boolean).join(' ')
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest || props.race.address || props.race.name)}`
})

const sanitizedWarning = computed(() => {
  if (!props.race.warning) return ''
  if (import.meta.server) return props.race.warning
  return DOMPurify.sanitize(props.race.warning, {
    ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'span', 'br'],
    ALLOWED_ATTR: []
  })
})
</script>

<template>
  <div class="event-location-card">
    <div class="location-card-header collapsible-header" @click="isOpen = !isOpen">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="location-card-title"><span>📍</span> Venue Location & Directions</span>
        <span v-if="race.city" class="category-badge">{{ race.city }}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button
          v-if="isCoachAuth"
          type="button"
          class="card-inline-edit-btn"
          title="Edit Venue & Directions"
          @click.stop="emit('edit')"
        >
          <span>✏️</span>
        </button>
        <span class="card-toggle-icon" :class="{ collapsed: !isOpen }" title="Toggle Location">▼</span>
      </div>
    </div>
    <div v-show="isOpen" class="collapsible-body location-card-body">
      <div class="location-venue-name">
        {{ race.exactTrailhead || race.venue }}
      </div>
      <div class="location-address-text">{{ race.address }}</div>
      <div v-if="sanitizedWarning" class="event-warning-banner" style="margin-top:10px;">
        <span v-html="sanitizedWarning" />
      </div>
      <div class="event-action-buttons">
        <a :href="getNavigationUrl" target="_blank" rel="noopener noreferrer" class="btn-maps btn-navigation">
          <span>🧭</span> Navigation Directions
        </a>
      </div>
    </div>
  </div>
</template>
