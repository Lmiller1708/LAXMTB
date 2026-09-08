<script setup lang="ts">
import type { Race } from '../types/race'

const props = defineProps<{
  race: Race
}>()

const getNavigationUrl = computed(() => {
  if (props.race.navigationUrl) return props.race.navigationUrl
  if (props.race.googleMapsUrl) return props.race.googleMapsUrl
  const destination = encodeURIComponent(`${props.race.exactTrailhead || props.race.venue} ${props.race.address}`)
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`
})

const getAppleMapsUrl = computed(() => {
  if (props.race.appleMapsUrl) return props.race.appleMapsUrl
  const destination = encodeURIComponent(`${props.race.exactTrailhead || props.race.venue}, ${props.race.address}`)
  return `https://maps.apple.com/?daddr=${destination}&dirflg=d`
})
</script>

<template>
  <div class="bg-[#171717] border border-[#262626] rounded-xl p-5 mb-6">
    <div class="flex items-center justify-between gap-3 border-b border-[#262626] pb-3 mb-4">
      <div class="flex items-center gap-2">
        <span class="text-xl">📍</span>
        <h2 class="text-base font-bold text-white uppercase tracking-wide">Venue Location & Directions</h2>
      </div>
      <span v-if="race.city" class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
        {{ race.city }}
      </span>
    </div>

    <!-- Trailhead and Address -->
    <div class="mb-4">
      <p class="text-sm font-extrabold text-white">{{ race.exactTrailhead || race.venue }}</p>
      <p class="text-xs text-gray-400 mt-0.5">{{ race.address }}</p>
    </div>

    <!-- Navigation Warning if applicable -->
    <div
      v-if="race.warning"
      class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200 mb-4 leading-relaxed"
      v-html="race.warning"
    />

    <!-- Action Buttons -->
    <div class="flex flex-wrap items-center gap-2 pt-1">
      <a
        :href="getNavigationUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
      >
        <span>🧭</span>
        <span>Google Navigation</span>
      </a>

      <a
        :href="getAppleMapsUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#262626] hover:bg-[#333333] text-gray-200 transition"
      >
        <span>🍏</span>
        <span>Apple Maps</span>
      </a>

      <a
        v-if="race.eventGuideUrl"
        :href="race.eventGuideUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#262626] hover:bg-[#333333] text-gray-200 transition"
      >
        <span>📄</span>
        <span>Wisconsin League Guide</span>
      </a>
    </div>
  </div>
</template>
