<script setup lang="ts">
import type { TabType } from '~/modules/core/components/NavigationTabs.vue'

const currentTab = ref<TabType>('details')
const isMenuOpen = ref(false)
const { currentRace } = useCurrentRace()

const setTab = (tab: TabType) => {
  currentTab.value = tab
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#0d0d0d] text-gray-100 font-sans">
    <!-- 1. Header with Online/Offline Indicator -->
    <AppHeader @toggle-menu="isMenuOpen = !isMenuOpen" />

    <!-- 2. Season Race Switcher Bar -->
    <RaceSwitcherBar />

    <!-- 3. Navigation Tabs -->
    <NavigationTabs :current-tab="currentTab" @change-tab="setTab" />

    <!-- 4. Main Active View -->
    <main class="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
      <!-- Tab 1: Event Details -->
      <div v-if="currentTab === 'details'">
        <EventHeroCard :race="currentRace" />
        <EventVenueCard :race="currentRace" />
        <ScheduleTimeline :schedule="currentRace.schedule" />
        <EventSignupsCard :signups="currentRace.signups" />
        <EventGuidelinesCard :guidelines="currentRace.guidelines" />
      </div>

      <!-- Tab 2 & 3: Start Lists & Results -->
      <div v-else-if="currentTab === 'list' || currentTab === 'results'">
        <div class="flex items-center justify-between gap-3 p-3 bg-[#171717] border border-[#262626] rounded-lg mb-4">
          <div class="text-xs font-semibold text-gray-300">
            <span>{{ currentTab === 'list' ? 'Start Lists' : 'Live Results' }} for {{ currentRace.name }}</span>
          </div>
          <TimingStatusBadge :state="currentRace.isPublished && currentRace.eventId ? 'live' : 'upcoming'" />
        </div>
      </div>

      <!-- Tab 4: Photos -->
      <div v-else-if="currentTab === 'photos'">
        <div class="bg-[#171717] border border-[#262626] rounded-xl p-6 text-center">
          <span class="text-4xl">📸</span>
          <h2 class="text-lg font-bold text-white mt-2">Shared Team Photos</h2>
          <p class="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            View the high-resolution photo album or upload your own action shots from race weekend.
          </p>
          <div class="mt-4">
            <a
              :href="currentRace.photosUrl || 'https://photos.app.goo.gl/XgNFXXB5XMakNz5U9'"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition"
            >
              <span>📸 Open Shared Google Photos Album ↗</span>
            </a>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-[#262626] py-4 text-center text-xs text-gray-500">
      LAX MTB // RACE CENTRAL • Offline PWA Powered by Nuxt 3 & Firestore
    </footer>
  </div>
</template>
