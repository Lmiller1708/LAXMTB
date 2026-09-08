<script setup lang="ts">
defineEmits(['toggleMenu'])
</script>

<template>
  <header class="sticky top-0 z-40 bg-[#0d0d0d]/95 backdrop-blur-md border-b border-[#262626]">
    <div class="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
      <!-- Team Brand -->
      <div class="flex items-center gap-2.5 min-w-0">
        <img
          src="/logo.png"
          alt="La Crosse Area MTB Team"
          class="w-8 h-8 object-contain shrink-0"
          onerror="this.style.display='none'"
        >
        <div class="truncate">
          <span class="font-teko text-2xl font-bold tracking-wider text-white uppercase">
            LAX MTB <span class="text-red-500">//</span> <span class="text-gray-300 text-lg">RACE CENTRAL</span>
          </span>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex items-center gap-2 shrink-0">
        <OnlineOfflineBadge />
        <button
          class="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition"
          aria-label="Navigation Menu"
          @click="$emit('toggleMenu')"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>
