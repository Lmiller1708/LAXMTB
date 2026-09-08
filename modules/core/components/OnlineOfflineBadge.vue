<script setup lang="ts">
const { isOnline } = useNetworkStatus()
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase transition-all duration-200 shrink-0"
    :class="isOnline 
      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'"
  >
    <span
      class="w-1.5 h-1.5 rounded-full"
      :class="isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'"
    />
    <span>{{ isOnline ? 'Online' : 'Offline' }}</span>
  </span>
</template>
