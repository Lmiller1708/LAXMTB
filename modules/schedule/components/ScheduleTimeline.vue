<script setup lang="ts">
import type { ScheduleDay } from '~/modules/races/types/race'

defineProps<{
  schedule?: ScheduleDay[]
}>()
</script>

<template>
  <div class="bg-[#171717] border border-[#262626] rounded-xl p-5 mb-6">
    <div class="flex items-center gap-2 border-b border-[#262626] pb-3 mb-4">
      <span class="text-xl">⏱️</span>
      <h2 class="text-base font-bold text-white uppercase tracking-wide">LAXMTB Weekend Itinerary</h2>
    </div>

    <div v-if="!schedule || schedule.length === 0" class="text-xs text-gray-500 text-center py-6">
      Weekend schedule will be posted on race week.
    </div>

    <div v-else class="space-y-6">
      <div v-for="dayGroup in schedule" :key="dayGroup.day" class="border-l-2 border-red-600/60 pl-4 space-y-3">
        <!-- Day Title -->
        <div class="flex items-baseline gap-2">
          <h3 class="text-sm font-extrabold text-white">{{ dayGroup.day }}</h3>
          <span class="text-xs font-semibold text-red-400">• {{ dayGroup.date }}</span>
          <span v-if="dayGroup.subtitle" class="text-xs text-gray-400">({{ dayGroup.subtitle }})</span>
        </div>

        <!-- Event Rows -->
        <div class="space-y-2">
          <div
            v-for="(event, idx) in dayGroup.events"
            :key="idx"
            class="flex items-start justify-between gap-3 text-xs p-2.5 rounded-lg transition"
            :class="event.isSpecial ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-[#202020]'"
          >
            <div>
              <div class="font-bold" :class="event.isSpecial ? 'text-amber-300' : 'text-gray-100'">
                {{ event.desc }}
              </div>
              <div class="text-[11px] text-gray-400 mt-0.5">{{ event.time }}</div>
            </div>

            <span
              v-if="event.tag"
              class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0"
              :class="event.isSpecial 
                ? 'bg-amber-500/20 text-amber-300' 
                : 'bg-white/10 text-gray-300'"
            >
              {{ event.tag }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
