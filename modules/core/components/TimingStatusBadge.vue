<script setup lang="ts">
defineProps<{
  state: 'live' | 'cached' | 'upcoming'
}>()
</script>

<template>
  <div
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider shrink-0"
    :class="{
      'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30': state === 'live',
      'bg-gray-800/60 text-gray-400 border border-gray-700/50': state === 'cached' || state === 'upcoming'
    }"
  >
    <span
      class="w-1.5 h-1.5 rounded-full"
      :class="{
        'bg-emerald-400 animate-pulse': state === 'live',
        'bg-gray-500': state === 'cached' || state === 'upcoming'
      }"
    />
    <span>
      {{ state === 'live' ? 'Live Timing' : state === 'upcoming' ? 'Upcoming Race' : 'Cached Results' }}
    </span>
  </div>
</template>
