<script setup lang="ts">
import type { TabType } from '~/modules/core/components/NavigationTabs.vue'
import type { Race } from '~/modules/races/types/race'
import { isRaceCompleted } from '~/modules/races/composables/useCurrentRace'

const route = useRoute()
const router = useRouter()

const currentTab = ref<TabType>('details')
const isWhatsNewOpen = ref(false)
const isNotifOpen = ref(false)
const isAdminOpen = ref(false)
const adminInitialTab = ref('venue')

const { currentRace, currentRaceSlug, races, selectRaceBySlug, updateRace } = useCurrentRace()
const { isCoachAuth } = useCoachAuth()

const {
  riders,
  filteredRiders,
  categories,
  loading,
  lastUpdated,
  isLive,
  searchQuery,
  listMode,
  selectedListId,
  sortOrder,
  selectedCategory,
  selectedTeamScope,
  allCardsCollapsed,
  toggleAllCards,
  fetchResults
} = useRaceResults()

const showNotifToast = (msg: string, body?: string) => {
  if (!import.meta.client) return
  const container = document.getElementById('notifToastContainer')
  if (!container) return
  const toast = document.createElement('div')
  toast.className = 'notif-toast'
  toast.innerHTML = `
    <div class="notif-toast-content">
      <div class="notif-toast-title">${msg}</div>
      ${body ? `<div class="notif-toast-msg">${body}</div>` : ''}
    </div>
    <button type="button" class="notif-toast-close" aria-label="Dismiss">✕</button>
  `
  toast.querySelector('.notif-toast-close')?.addEventListener('click', () => toast.remove())
  container.appendChild(toast)
  setTimeout(() => {
    toast.remove()
  }, body ? 6500 : 3500)
}

const refreshData = () => {
  if (currentTab.value === 'list' || currentTab.value === 'results') {
    if (currentRace.value?.isPublished && currentRace.value?.eventId) {
      const completed = isRaceCompleted(currentRace.value)
      fetchResults(String(currentRace.value.eventId), currentTab.value, selectedListId.value, completed)
    }
  }
}

const setTab = (tab: TabType, updateUrl = true) => {
  currentTab.value = tab
  if (tab === 'list' || tab === 'results') {
    if (tab === 'list') {
      selectedListId.value = listMode.value === 'TEAM' ? '747B52' : 'A76F6B'
    } else {
      selectedListId.value = listMode.value === 'TEAM' ? 'E07F7C' : '4C8C1F'
    }
    refreshData()
  }

  if (updateUrl && import.meta.client) {
    const target = `/race/${currentRaceSlug.value}/${tab}`
    if (route.path !== target) {
      router.push(target).catch(() => {})
    }
  }
}

// Synchronize state from route path (e.g. /race/bluffbash/results)
const syncFromRoute = () => {
  if (!import.meta.client) return
  const path = route.path

  // Check URL query/hash legacy parameters first
  const params = new URLSearchParams(window.location.search)
  const tabParam = params.get('tab') || window.location.hash.replace(/^#/, '')
  if (tabParam) {
    const slug = tabParam.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (slug.includes('list') || slug.includes('start')) setTab('list')
    else if (slug.includes('result')) setTab('results')
    else if (slug.includes('photo')) setTab('photos')
    else if (slug.includes('detail')) setTab('details')
    return
  }

  // Parse path: /race/:slug/:tab
  const match = path.match(/\/race\/([^\/]+)(?:\/([^\/]+))?/)
  if (match) {
    const raceSlug = match[1]
    const tabSlug = match[2]

    selectRaceBySlug(raceSlug)

    if (tabSlug) {
      const lower = tabSlug.toLowerCase()
      if (lower === 'results' || lower === 'result') currentTab.value = 'results'
      else if (lower === 'list' || lower === 'start' || lower === 'startlist') currentTab.value = 'list'
      else if (lower === 'photos' || lower === 'photo') currentTab.value = 'photos'
      else if (lower === 'details' || lower === 'detail' || lower === 'info') currentTab.value = 'details'
      refreshData()
    }
  } else {
    // Landed on root / or /race -> push canonical path
    const target = `/race/${currentRaceSlug.value}/${currentTab.value}`
    if (route.path !== target) {
      router.replace(target).catch(() => {})
    }
  }
}

watch(() => route.path, () => {
  syncFromRoute()
})

watch(currentRace, (newRace) => {
  if (import.meta.client) {
    const target = `/race/${currentRaceSlug.value}/${currentTab.value}`
    if (route.path !== target) {
      router.push(target).catch(() => {})
    }
  }
  refreshData()
})

const { startAlertScheduler } = useNotificationSubscriptions()

onMounted(() => {
  syncFromRoute()
  startAlertScheduler(() => races.value as Race[])
})

const openAdminWithTab = (tab: string) => {
  adminInitialTab.value = tab
  isAdminOpen.value = true
}

const handleSaveRace = (updated: Race) => {
  updateRace(updated)
}

const handleSyncData = () => {
  showNotifToast('🔄 Checking Cloud Firestore & Live Timing for updates...')
  refreshData()
  setTimeout(() => {
    showNotifToast('✅ Data synced successfully with Cloud Firestore!')
  }, 1000)
}

watch([isWhatsNewOpen, isNotifOpen, isAdminOpen], ([wn, notif, admin]) => {
  if (import.meta.client) {
    document.body.classList.toggle('modal-open', Boolean(wn || notif || admin))
  }
})

const handlePrint = () => {
  if (import.meta.client) {
    window.print()
  }
}
</script>

<template>
  <div>
    <!-- Toast Notification Container -->
    <div class="notif-toast-container" id="notifToastContainer"></div>

    <!-- Site Header -->
    <header class="site-header">
      <!-- 1. Fixed Brand Header & Controls -->
      <AppHeader
        @open-whats-new="isWhatsNewOpen = true"
        @open-notifications="isNotifOpen = true"
        @open-admin="openAdminWithTab('venue')"
        @sync-data="handleSyncData"
        @toast="showNotifToast"
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
      @toast="showNotifToast"
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
          v-model:selected-list-id="selectedListId"
          v-model:sort-order="sortOrder"
          v-model:selected-category="selectedCategory"
          v-model:selected-team-scope="selectedTeamScope"
          :current-tab="currentTab"
          :categories="categories"
          :is-live="isLive"
          :is-completed="isRaceCompleted(currentRace)"
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
        <EventHeroCard :race="currentRace" :is-coach-auth="isCoachAuth" @edit="openAdminWithTab('venue')" />
        <EventVenueCard :race="currentRace" :is-coach-auth="isCoachAuth" @edit="openAdminWithTab('venue')" />
        <EventSignupsCard :signups="currentRace.signups" :race-name="currentRace.name" :is-coach-auth="isCoachAuth" @edit="openAdminWithTab('signups')" />
        <EventMapCard :race="currentRace" :is-coach-auth="isCoachAuth" @edit="openAdminWithTab('maps')" />
        <div class="event-details-grid">
          <ScheduleTimeline :schedule="currentRace.schedule" :is-coach-auth="isCoachAuth" @edit="openAdminWithTab('schedule')" />
          <EventGuidelinesCard :guidelines="currentRace.guidelines" :is-coach-auth="isCoachAuth" @edit="openAdminWithTab('announcements')" />
        </div>
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
        :is-coach-auth="isCoachAuth"
        @switch-tab="setTab('details')"
        @edit-waves="openAdminWithTab('waves')"
      />

      <!-- Tab 4: Team Photos -->
      <PhotosGallery
        v-else-if="currentTab === 'photos'"
        :race="currentRace"
        :is-coach-auth="isCoachAuth"
        @edit="openAdminWithTab('photos')"
      />
    </main>
  </div>
</template>
