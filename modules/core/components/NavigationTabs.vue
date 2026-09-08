<script setup lang="ts">
export type TabType = 'details' | 'list' | 'results' | 'photos'

defineProps<{
  currentTab: TabType
}>()

defineEmits<{
  (e: 'changeTab', tab: TabType): void
}>()
</script>

<template>
  <nav class="bg-[#171717] border-b border-[#262626] sticky top-14 z-30">
    <div class="max-w-7xl mx-auto px-3 sm:px-6 flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
      <button
        class="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold transition whitespace-nowrap"
        :class="currentTab === 'details'
          ? 'bg-white/10 text-white border-b-2 border-red-500'
          : 'text-gray-400 hover:text-gray-200'"
        @click="$emit('changeTab', 'details')"
      >
        <span>📋</span>
        <span>Event Details</span>
      </button>

      <button
        class="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold transition whitespace-nowrap"
        :class="currentTab === 'list'
          ? 'bg-white/10 text-white border-b-2 border-red-500'
          : 'text-gray-400 hover:text-gray-200'"
        @click="$emit('changeTab', 'list')"
      >
        <span>🏁</span>
        <span>Start Lists</span>
      </button>

      <button
        class="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold transition whitespace-nowrap"
        :class="currentTab === 'results'
          ? 'bg-white/10 text-white border-b-2 border-red-500'
          : 'text-gray-400 hover:text-gray-200'"
        @click="$emit('changeTab', 'results')"
      >
        <span>⏱️</span>
        <span>Results</span>
      </button>

      <button
        class="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold transition whitespace-nowrap"
        :class="currentTab === 'photos'
          ? 'bg-white/10 text-white border-b-2 border-red-500'
          : 'text-gray-400 hover:text-gray-200'"
        @click="$emit('changeTab', 'photos')"
      >
        <span>📸</span>
        <span>Team Photos</span>
      </button>
    </div>
  </nav>
</template>
