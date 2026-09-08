<script setup lang="ts">
const { races, currentRaceIndex, selectRace } = useCurrentRace()
</script>

<template>
  <div class="bg-[#141414] border-b border-[#262626] overflow-x-auto no-scrollbar py-2 px-3 sm:px-6">
    <div class="flex items-center gap-2 max-w-7xl mx-auto min-w-max">
      <button
        v-for="(race, index) in races"
        :key="race.id"
        class="px-3.5 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5"
        :class="currentRaceIndex === index
          ? 'bg-red-600 text-white shadow-sm shadow-red-900/50'
          : 'bg-[#222222] text-gray-400 hover:text-white hover:bg-[#2b2b2b]'"
        @click="selectRace(index)"
      >
        <span>{{ race.name.replace(/ Festival$/i, '').replace(/ Challenge$/i, '') }}</span>
        <span
          v-if="race.isPublished"
          class="w-1.5 h-1.5 rounded-full bg-emerald-400"
          title="Start lists / Live times published"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
