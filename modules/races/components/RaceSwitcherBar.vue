<script setup lang="ts">
const { races, currentRaceIndex, selectRace } = useCurrentRace()
</script>

<template>
  <div class="race-switcher-section">
    <div class="race-switcher-container">
      <div class="race-switcher-bar" id="raceSwitcherBar">
        <button
          v-for="(race, index) in races"
          :key="race.id"
          class="race-tab-btn"
          :class="{ active: currentRaceIndex === index }"
          @click="selectRace(index)"
        >
          <img :src="race.logo" :alt="race.name" class="tab-mini-logo" onerror="this.style.display='none'">
          <div class="tab-text-col">
            <span class="race-tab-date">Race {{ index + 1 }} • {{ race.dateStr.split('2026')[0].trim() }}</span>
            <span class="race-tab-title">{{ race.name }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
