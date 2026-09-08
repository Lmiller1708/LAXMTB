<script setup lang="ts">
import type { Race } from '../types/race'

defineProps<{
  race: Race
}>()
</script>

<template>
  <div class="bg-gradient-to-br from-[#1c1c1c] to-[#121212] border border-[#2a2a2a] rounded-xl p-5 sm:p-6 mb-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <img
          :src="race.logo"
          :alt="race.name"
          class="w-14 h-14 sm:w-16 sm:h-16 object-contain shrink-0"
          onerror="this.style.display='none'"
        >
        <div>
          <h1 class="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            {{ race.name }}
          </h1>
          <div class="flex flex-wrap items-center gap-2 mt-1">
            <span class="text-xs font-bold text-red-500">📅 {{ race.dateStr }}</span>
            <span v-if="race.conference" class="text-xs font-semibold text-gray-400">
              • 🏆 {{ race.conference }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
