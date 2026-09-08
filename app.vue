<script setup lang="ts">
import type { TabType } from '~/modules/core/components/NavigationTabs.vue'
import type { Race } from '~/modules/races/types/race'

const currentTab = ref<TabType>('details')
const isWhatsNewOpen = ref(false)
const isNotifOpen = ref(false)
const isAdminOpen = ref(false)
const adminInitialTab = ref('venue')

const { currentRace, updateRace } = useCurrentRace()

const {
  riders,
  filteredRiders,
  categories,
  loading,
  lastUpdated,
  isLive,
  searchQuery,
  listMode,
  sortOrder,
  selectedCategory,
  selectedTeamScope,
  allCardsCollapsed,
  toggleAllCards,
  fetchResults
} = useRaceResults()

const setTab = (tab: TabType) => {
  currentTab.value = tab
  if (tab === 'list' || tab === 'results') {
    if (currentRace.value?.isPublished && currentRace.value?.eventId) {
      fetchResults(String(currentRace.value.eventId), tab)
    }
  }
}

watch(currentRace, (newRace) => {
  if (currentTab.value === 'list' || currentTab.value === 'results') {
    if (newRace?.isPublished && newRace?.eventId) {
      fetchResults(String(newRace.eventId), currentTab.value)
    }
  }
})

onMounted(() => {
  if (import.meta.client) {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab') || window.location.hash.replace(/^#/, '')
    if (tabParam) {
      const slug = tabParam.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (slug.includes('list') || slug.includes('start')) {
        setTab('list')
      } else if (slug.includes('result')) {
        setTab('results')
      } else if (slug.includes('photo')) {
        setTab('photos')
      } else if (slug.includes('detail')) {
        setTab('details')
      }
    }
  }
})

const openAdminWithTab = (tab: string) => {
  adminInitialTab.value = tab
  isAdminOpen.value = true
}

const handleSaveRace = (updated: Race) => {
  updateRace(updated)
}

const refreshData = () => {
  if (currentTab.value === 'list' || currentTab.value === 'results') {
    if (currentRace.value?.isPublished && currentRace.value?.eventId) {
      fetchResults(String(currentRace.value.eventId), currentTab.value)
    }
  }
}

const handlePrint = () => {
  if (import.meta.client) {
    window.print()
  }
}
</script>

<template>
  <div>
    <!-- Site Header -->
    <header class="site-header">
      <!-- 1. Fixed Brand Header & Controls -->
      <AppHeader
        @open-whats-new="isWhatsNewOpen = true"
        @open-notifications="isNotifOpen = true"
        @open-admin="openAdminWithTab('venue')"
        @sync-data="refreshData"
      />

      <!-- 2. Season Race Switcher Bar -->
      <RaceSwitcherBar />

      <!-- 3. Navigation Tabs -->
      <NavigationTabs :current-tab="currentTab" @change-tab="setTab" />
    </header>

    <!-- Modals -->
    <WhatsNewModal
      :is-open="isWhatsNewOpen"
      @close="isWhatsNewOpen = false"
      @open-notifications="isNotifOpen = true"
    />

    <NotificationModal
      :is-open="isNotifOpen"
      @close="isNotifOpen = false"
    />

    <AdminModal
      :is-open="isAdminOpen"
      :initial-tab="adminInitialTab"
      @close="isAdminOpen = false"
      @save="handleSaveRace"
    />

    <!-- Main Content Container -->
    <main class="main-container">
      <!-- Dedicated High-Quality Printable Header (Paper / PDF export only) -->
      <div class="print-header" id="printHeader">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2pt solid #dc2626;padding-bottom:6pt;margin-bottom:12pt;">
          <div>
            <div style="font-size:18pt;font-weight:900;color:#111827;letter-spacing:-0.5px;">LAX MTB // RACE CENTRAL</div>
            <div id="printSubTitle" style="font-size:11pt;color:#dc2626;font-weight:700;margin-top:2pt;">{{ currentRace?.name }} • Start Lists</div>
          </div>
          <div style="text-align:right;">
            <div id="printScopeText" style="font-size:9pt;color:#374151;font-weight:700;">Scope: LAXMTB Team</div>
            <div id="printDateText" style="font-size:8pt;color:#6b7280;margin-top:2pt;">Generated on Race Day</div>
          </div>
        </div>
      </div>

      <div id="noticeContainer" />

      <!-- Controls Panel & Status Bar (Start Lists & Results) -->
      <template v-if="currentTab === 'list' || currentTab === 'results'">
        <ResultsToolbar
          v-if="currentRace?.isPublished && currentRace?.eventId"
          v-model:search-query="searchQuery"
          v-model:list-mode="listMode"
          v-model:sort-order="sortOrder"
          v-model:selected-category="selectedCategory"
          v-model:selected-team-scope="selectedTeamScope"
          :categories="categories"
          :is-live="isLive"
          :total-count="filteredRiders.length"
          @refresh="refreshData"
        />

        <ResultsStatusBar
          v-if="currentRace?.isPublished && currentRace?.eventId"
          :filtered-count="filteredRiders.length"
          :total-count="riders.length"
          :last-updated="lastUpdated"
          :all-cards-collapsed="allCardsCollapsed"
          @toggle-all="toggleAllCards"
          @print="handlePrint"
        />
      </template>

      <!-- Tab 1: Event Details -->
      <div v-if="currentTab === 'details'">
        <EventHeroCard :race="currentRace" :is-coach-auth="true" @edit="openAdminWithTab('venue')" />
        <EventVenueCard :race="currentRace" :is-coach-auth="true" @edit="openAdminWithTab('venue')" />
        <EventSignupsCard :signups="currentRace.signups" :race-name="currentRace.name" :is-coach-auth="true" @edit="openAdminWithTab('signups')" />
        <EventMapCard :race="currentRace" :is-coach-auth="true" @edit="openAdminWithTab('maps')" />
        <ScheduleTimeline :schedule="currentRace.schedule" :is-coach-auth="true" @edit="openAdminWithTab('schedule')" />
        <EventGuidelinesCard :guidelines="currentRace.guidelines" :is-coach-auth="true" @edit="openAdminWithTab('announcements')" />
      </div>

      <!-- Tab 2 & 3: Start Lists & Results -->
      <ResultsView
        v-else-if="currentTab === 'list' || currentTab === 'results'"
        :race="currentRace"
        :riders="filteredRiders"
        :current-tab="currentTab"
        :list-mode="listMode"
        :sort-order="sortOrder"
        :search-query="searchQuery"
        :all-cards-collapsed="allCardsCollapsed"
        :is-coach-auth="true"
        @switch-tab="setTab('details')"
        @edit-waves="openAdminWithTab('waves')"
      />

      <!-- Tab 4: Team Photos -->
      <PhotosGallery
        v-else-if="currentTab === 'photos'"
        :race="currentRace"
        :is-coach-auth="true"
        @edit="openAdminWithTab('photos')"
      />
    </main>
  </div>
</template>
