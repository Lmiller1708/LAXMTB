<script setup lang="ts">
import type { Race } from '../types/race'

defineProps<{
  race: Race
  isCoachAuth?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
}>()
</script>

<template>
  <div class="event-hero-card">
    <div style="display:flex;align-items:center;gap:18px;flex:1;min-width:260px;">
      <img :src="resolveLogoUrl(race.logo)" :alt="race.name" class="event-hero-logo" onerror="this.style.display='none'">
      <div class="event-hero-meta">
        <h2>{{ race.name }}</h2>
        <div v-if="race.theme" class="event-hero-theme" style="font-size:15px;font-weight:800;color:#22c55e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;display:flex;align-items:center;gap:6px;line-height:1.3;">
          {{ race.theme }}
        </div>
        <div class="event-hero-meta-badges">
          <span class="event-meta-pill">📅 <strong>{{ race.dateStr }}</strong></span>
          <span v-if="race.conference" class="event-meta-pill pill-conf">🏆 {{ race.conference }}</span>
        </div>
      </div>
    </div>
    <div class="event-hero-actions" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <a
        v-if="race.eventGuideUrl"
        :href="race.eventGuideUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="btn-hero-league"
        title="Visit the official Wisconsin League Event Page on NICA"
      >
        <img src="/logos/nica-logo.png" alt="NICA" class="nica-badge-icon" onerror="this.style.display='none'">
        <span>Wisconsin League Page</span>
      </a>
      <button
        v-if="isCoachAuth"
        type="button"
        class="card-inline-edit-btn"
        title="Edit Race Details & Dates"
        @click.stop="emit('edit')"
      >
        <span>✏️</span>
      </button>
    </div>
  </div>
</template>
