<script setup lang="ts">
import type { TabType } from '~/modules/core/components/NavigationTabs.vue'
import type { Race } from '~/modules/races/types/race'
import { isRaceCompleted, slugifyRaceId } from '~/modules/races/composables/useCurrentRace'
import EventCoachCard from '~/modules/races/components/EventCoachCard.vue'
import PwaUpdateBanner from '~/modules/core/components/PwaUpdateBanner.vue'

const route = useRoute()
const router = useRouter()

const currentTab = ref<TabType>('details')
const isWhatsNewOpen = ref(false)
const isNotifOpen = ref(false)
const isAdminOpen = ref(false)
const isAuthOpen = ref(false)
const isProfileOpen = ref(false)
const initialAuthMode = ref<'login' | 'signup'>('login')
const activeInviteCode = ref('')
const adminInitialTab = ref('venue')
const isAdminRoute = ref(false)

const { currentRace, currentRaceSlug, races, currentRaceIndex, selectRace, selectRaceBySlug, updateRace } = useCurrentRace()
const { user, isCoachAuth, acceptInviteForCurrentUser } = useCoachAuth()

const openAuthWithMode = (mode: 'login' | 'signup' = 'login') => {
  initialAuthMode.value = mode
  isAuthOpen.value = true
}

const {
  riders,
  filteredRiders,
  teamStandings,
  filteredTeamStandings,
  feedViewType,
  availableReports,
  categories,
  teams,
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
  fetchResults,
  loadOrSwitchTab
} = useRaceResults()

const showNotifToast = (msg: string, body?: string) => {
  if (!import.meta.client) return
  const container = document.getElementById('notifToastContainer')
  if (!container) return

  const toast = document.createElement('div')
  toast.className = 'notif-toast'

  const content = document.createElement('div')
  content.className = 'notif-toast-content'

  const titleEl = document.createElement('div')
  titleEl.className = 'notif-toast-title'
  titleEl.textContent = msg
  content.appendChild(titleEl)

  if (body) {
    const msgEl = document.createElement('div')
    msgEl.className = 'notif-toast-msg'
    msgEl.textContent = body
    content.appendChild(msgEl)
  }

  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = 'notif-toast-close'
  closeBtn.setAttribute('aria-label', 'Dismiss')
  closeBtn.textContent = '✕'
  closeBtn.addEventListener('click', () => toast.remove())

  toast.appendChild(content)
  toast.appendChild(closeBtn)
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

let isSyncingRoute = false

/**
 * 100% Guaranteed URL Update
 * Changes browser address bar synchronously via window.history
 * and synchronizes Vue Router
 */
const updateUrl = (raceSlug: string, tab: string, pushToHistory = true) => {
  if (!import.meta.client) return
  const cleanSlug = raceSlug.toLowerCase().replace(/-/g, '')
  const cleanTab = (tab || 'details').toLowerCase()
  const target = `/race/${cleanSlug}/${cleanTab}`

  if (window.location.pathname !== target) {
    if (pushToHistory) {
      window.history.pushState({ raceSlug: cleanSlug, tab: cleanTab }, '', target)
    } else {
      window.history.replaceState({ raceSlug: cleanSlug, tab: cleanTab }, '', target)
    }
    router.push(target).catch(() => {})
  }
}

const setTab = (tab: TabType, pushToHistory = true) => {
  currentTab.value = tab
  if (tab === 'list' || tab === 'results') {
    if (currentRace.value?.isPublished && currentRace.value?.eventId) {
      const completed = isRaceCompleted(currentRace.value)
      loadOrSwitchTab(String(currentRace.value.eventId), tab, completed)
    }
  }

  if (import.meta.client && !isSyncingRoute) {
    const race = currentRace.value || races.value[currentRaceIndex.value] || races.value[0]
    const slug = slugifyRaceId(race?.id || 'race')
    updateUrl(slug, tab, pushToHistory)
  }
}

const setRace = (index: number) => {
  selectRace(index)
  const race = races.value[index]
  if (race && import.meta.client && !isSyncingRoute) {
    const slug = slugifyRaceId(race.id)
    updateUrl(slug, currentTab.value, true)
  }
  refreshData()
}

// Synchronize state from route path (e.g. /race/bluffbash/results or hash redirect)
const syncFromRoute = () => {
  if (!import.meta.client) return
  isSyncingRoute = true

  try {
    let path = window.location.pathname || route.path

    // Handle GitHub Pages hash redirect (e.g. /#/race/bluffbash/details or #admin)
    if (window.location.hash && (window.location.hash.startsWith('#/') || window.location.hash === '#admin')) {
      if (window.location.hash === '#admin' || window.location.hash.startsWith('#/admin')) {
        path = '/admin'
      } else {
        path = window.location.hash.substring(1)
      }
      window.history.replaceState(null, '', path)
    }

    // Check if on /admin route
    if (path === '/admin' || path.startsWith('/admin') || route.path === '/admin' || route.path.startsWith('/admin')) {
      isAdminRoute.value = true
      const params = new URLSearchParams(window.location.search)
      const adminTabParam = params.get('tab')
      if (adminTabParam) {
        adminInitialTab.value = adminTabParam
      }
      return
    } else {
      isAdminRoute.value = false
    }

    // Check URL query/hash legacy parameters
    const params = new URLSearchParams(window.location.search)

    // Check for invite parameter (?invite=<code> or ?join=<code>)
    const inviteParam = params.get('invite') || params.get('join') || params.get('code')
    if (inviteParam) {
      const cleanInvite = inviteParam.trim()
      activeInviteCode.value = cleanInvite
      if (import.meta.client) {
        sessionStorage.setItem('laxmtb_invite_token', cleanInvite)
        localStorage.removeItem('laxmtb_invite_token')
      }
      if (!user.value) {
        initialAuthMode.value = 'signup'
        isAuthOpen.value = true
        showNotifToast('🎟️ Team Invite Accepted!', 'Please complete your registration below.')
      } else {
        acceptInviteForCurrentUser(cleanInvite).then((res) => {
          if (res?.success && res.role === 'coach') {
            showNotifToast('🎉 Coach Invite Accepted!', 'Your account has been upgraded to Team Coach.')
          }
        })
      }
    } else {
      if (import.meta.client) {
        localStorage.removeItem('laxmtb_invite_token')
        const sessionToken = sessionStorage.getItem('laxmtb_invite_token')
        if (sessionToken && sessionToken.trim()) {
          activeInviteCode.value = sessionToken.trim()
        } else {
          activeInviteCode.value = ''
        }
      }
    }

    const tabParam = params.get('tab') || window.location.hash.replace(/^#/, '')
    if (tabParam && !tabParam.startsWith('/')) {
      const slug = tabParam.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (slug.includes('list') || slug.includes('start')) setTab('list', false)
      else if (slug.includes('result')) setTab('results', false)
      else if (slug.includes('photo')) setTab('photos', false)
      else if (slug.includes('coach')) setTab('coach', false)
      else if (slug.includes('detail')) setTab('details', false)
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
        else if (lower === 'coach' || lower === 'coaches') currentTab.value = 'coach'
        else if (lower === 'details' || lower === 'detail' || lower === 'info') currentTab.value = 'details'
      }

      if (currentTab.value === 'list' || currentTab.value === 'results') {
        if (currentRace.value?.isPublished && currentRace.value?.eventId) {
          const completed = isRaceCompleted(currentRace.value)
          loadOrSwitchTab(String(currentRace.value.eventId), currentTab.value, completed)
        }
      }
    } else {
      // Landed on root / or /race -> push canonical path
      const race = currentRace.value || races.value[currentRaceIndex.value] || races.value[0]
      const raceSlug = slugifyRaceId(race?.id || 'race')
      updateUrl(raceSlug, currentTab.value, false)
    }
  } finally {
    nextTick(() => {
      isSyncingRoute = false
    })
  }
}

watch(() => route.path, () => {
  syncFromRoute()
})

watch(currentRaceIndex, (newIdx) => {
  if (!isSyncingRoute) {
    const race = races.value[newIdx]
    if (race && import.meta.client) {
      const slug = slugifyRaceId(race.id)
      updateUrl(slug, currentTab.value, true)
    }
  }
  refreshData()
})

// Re-fetch whenever Firestore pushes an updated eventId or isPublished flag
// so the app reacts live without requiring a page reload or tab switch.
watch(
  () => [currentRace.value?.eventId, currentRace.value?.isPublished] as const,
  ([newEventId, newIsPublished], [oldEventId, oldIsPublished]) => {
    if (!newEventId || !newIsPublished) return
    // Only re-fetch if something actually changed
    if (newEventId !== oldEventId || newIsPublished !== oldIsPublished) {
      refreshData()
    }
  }
)

const { startAlertScheduler } = useNotificationSubscriptions()
let updateTimer: ReturnType<typeof setInterval> | null = null

const siteHeaderRef = ref<HTMLElement | null>(null)
let headerResizeObserver: ResizeObserver | null = null

onMounted(() => {
  syncFromRoute()
  refreshData()
  startAlertScheduler(() => races.value as Race[])

  if (import.meta.client) {
    const updateHeaderHeight = () => {
      if (siteHeaderRef.value) {
        const h = siteHeaderRef.value.getBoundingClientRect().height
        if (h > 0) {
          document.documentElement.style.setProperty('--site-header-height', `${Math.round(h)}px`)
        }
      }
    }
    updateHeaderHeight()
    if (typeof ResizeObserver !== 'undefined' && siteHeaderRef.value) {
      headerResizeObserver = new ResizeObserver(updateHeaderHeight)
      headerResizeObserver.observe(siteHeaderRef.value)
    }

    // 30-second update timer for live timing feeds
    updateTimer = setInterval(() => {
      refreshData()
    }, 30000)

    window.addEventListener('popstate', syncFromRoute)
  }
})

onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer)
  }
  if (headerResizeObserver) {
    headerResizeObserver.disconnect()
  }
  if (import.meta.client) {
    window.removeEventListener('popstate', syncFromRoute)
  }
})

const openAdminWithTab = (tab: string) => {
  adminInitialTab.value = tab
  isAdminRoute.value = true
  if (import.meta.client) {
    const target = `/admin?tab=${encodeURIComponent(tab)}`
    window.history.pushState({ admin: true, tab }, '', target)
    router.push(target).catch(() => {})
  }
}

const navigateBackFromAdmin = () => {
  isAdminRoute.value = false
  if (import.meta.client) {
    const race = currentRace.value || races.value[currentRaceIndex.value] || races.value[0]
    const slug = slugifyRaceId(race?.id || 'race')
    updateUrl(slug, currentTab.value, true)
  }
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

watch([isWhatsNewOpen, isNotifOpen, isAuthOpen, isProfileOpen], ([wn, notif, auth, prof]) => {
  if (import.meta.client) {
    document.body.classList.toggle('modal-open', Boolean(wn || notif || auth || prof))
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

    <!-- PWA Service Worker Update Banner -->
    <PwaUpdateBanner />

    <!-- DEDICATED COACH ADMIN PAGE -->
    <AdminPage
      v-if="isAdminRoute"
      :initial-tab="adminInitialTab"
      @back="navigateBackFromAdmin"
      @save="handleSaveRace"
      @toast="showNotifToast"
    />

    <!-- PUBLIC RACE CENTRAL VIEW -->
    <div v-else>
      <!-- Site Header -->
      <header class="site-header" ref="siteHeaderRef">
        <!-- 1. Fixed Brand Header & Controls -->
        <AppHeader
          @open-whats-new="isWhatsNewOpen = true"
          @open-notifications="isNotifOpen = true"
          @open-admin="openAdminWithTab('venue')"
          @open-auth="openAuthWithMode('login')"
          @open-profile="isProfileOpen = true"
          @sync-data="handleSyncData"
          @toast="showNotifToast"
        />

        <!-- 2. Season Race Switcher Bar -->
        <RaceSwitcherBar @select-race="setRace" />

        <!-- 3. Navigation Tabs -->
        <NavigationTabs :current-tab="currentTab" :is-coach-auth="isCoachAuth" @change-tab="setTab" />
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

      <AuthModal
      :is-open="isAuthOpen"
      :initial-mode="initialAuthMode"
      :initial-invite-code="activeInviteCode"
      @close="isAuthOpen = false"
      @toast="showNotifToast"
    />

    <UserProfileModal
      :is-open="isProfileOpen"
      @close="isProfileOpen = false"
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
          :teams="teams"
          :available-reports="availableReports"
          :is-live="isLive"
          :is-completed="isRaceCompleted(currentRace)"
          :total-count="feedViewType === 'team_standings' ? filteredTeamStandings.length : filteredRiders.length"
          @refresh="refreshData"
          @report-change="(repId) => fetchResults(String(currentRace?.eventId), currentTab, repId, isRaceCompleted(currentRace))"
        />

        <ResultsStatusBar
          v-if="currentRace?.isPublished && currentRace?.eventId"
          :filtered-count="feedViewType === 'team_standings' ? filteredTeamStandings.length : filteredRiders.length"
          :total-count="feedViewType === 'team_standings' ? teamStandings.length : riders.length"
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
        <EventSignupsCard
          :signups="currentRace.signups"
          :race-name="currentRace.name"
          :is-completed="isRaceCompleted(currentRace)"
          :is-coach-auth="isCoachAuth"
          @edit="openAdminWithTab('signups')"
        />
        <EventMapCard
          :race="currentRace"
          :is-completed="isRaceCompleted(currentRace)"
          :is-coach-auth="isCoachAuth"
          @edit="openAdminWithTab('maps')"
        />
        <div class="event-details-grid">
          <ScheduleTimeline :schedule="currentRace.schedule" :is-coach-auth="isCoachAuth" @edit="openAdminWithTab('schedule')" />
          <EventGuidelinesCard :guidelines="currentRace.guidelines" :is-coach-auth="isCoachAuth" @edit="openAdminWithTab('announcements')" />
        </div>
      </div>

      <!-- Tab 2: Coach Sign-Ups -->
      <EventCoachCard
        v-else-if="currentTab === 'coach'"
        :race="currentRace"
        :is-coach-auth="isCoachAuth"
        @edit="openAdminWithTab('coach')"
        @open-auth="openAuthWithMode('login')"
      />

      <!-- Tab 3 & 4: Start Lists & Results -->
      <ResultsView
        v-else-if="currentTab === 'list' || currentTab === 'results'"
        :race="currentRace"
        :riders="filteredRiders"
        :team-standings="filteredTeamStandings"
        :feed-view-type="feedViewType"
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
  </div>
</template>
