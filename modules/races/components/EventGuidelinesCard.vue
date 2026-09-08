<script setup lang="ts">
defineProps<{
  guidelines?: string[]
}>()
</script>

<template>
  <div class="bg-[#171717] border border-[#262626] rounded-xl p-5 mb-6">
    <div class="flex items-center gap-2 border-b border-[#262626] pb-3 mb-4">
      <span class="text-xl">🏕️</span>
      <h2 class="text-base font-bold text-white uppercase tracking-wide">Venue Guidelines & Spectator Info</h2>
    </div>

    <div v-if="!guidelines || guidelines.length === 0" class="text-xs text-gray-500 text-center py-4">
      No specific venue guidelines posted.
    </div>

    <ul v-else class="space-y-2.5">
      <li
        v-for="(guideline, idx) in guidelines"
        :key="idx"
        class="text-xs text-gray-300 leading-relaxed flex items-start gap-2"
      >
        <span class="text-red-500 font-bold">•</span>
        <span v-html="guideline" />
      </li>
    </ul>
  </div>
</template>
