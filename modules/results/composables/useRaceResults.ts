import type {
  Rider,
  ResultsSortOrder,
  ResultsGroupMode,
  TeamScope,
  TeamStanding,
  FeedViewType
} from '../types/results'
import {
  parseUniversalData,
  targetTeamKeywords,
  categoryOrder,
  normalizeCategoryName,
  compareCategories
} from '../services/raceresultService'
import { getFallbackSeedResults, type CachedResultsEntry } from '../services/fallbackResultsService'

const readFromStorageCache = (
  eventId: string,
  page: 'list' | 'results',
  explicitListId?: string
): CachedResultsEntry | null => {
  if (!import.meta.client) return null

  // 1. Check explicit list ID if requested
  if (explicitListId) {
    const raw = localStorage.getItem(`laxmtb_v2_cache_${eventId}_${page}_${explicitListId}`)
    if (raw) {
      try {
        const p = JSON.parse(raw)
        if (p.riders?.length > 0 || p.teamStandings?.length > 0) return p
      } catch {}
    }
  }

  // 2. Check primary tab cache
  const primaryRaw = localStorage.getItem(`laxmtb_v2_cache_${eventId}_${page}`)
  if (primaryRaw) {
    try {
      const p = JSON.parse(primaryRaw)
      if (p.riders?.length > 0 || p.teamStandings?.length > 0) return p
    } catch {}
  }

  // 3. Scan all keys for this event and tab
  try {
    const prefix = `laxmtb_v2_cache_${eventId}_${page}`
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const p = JSON.parse(raw)
          if (p.riders?.length > 0 || p.teamStandings?.length > 0) return p
        }
      }
    }
  } catch {}

  // 4. Fall back to bundled offline seed results for known races
  return getFallbackSeedResults(eventId, page)
}

const readReportsCache = (eventId: string, page: 'list' | 'results'): { ID: string; Name: string }[] => {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(`laxmtb_v2_reports_${eventId}_${page}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return []
}

export const useRaceResults = () => {
  const riders = ref<Rider[]>([])
  const teamStandings = ref<TeamStanding[]>([])
  const feedViewType = ref<FeedViewType>('category_start_list')
  const availableReports = ref<{ ID: string; Name: string }[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdated = ref<string>('')
  const isLive = ref(false)
  let activeRequestId = 0

  const tabCache = ref<Record<string, Record<string, any>>>({})

  // Filters state
  const searchQuery = ref('')
  const listMode = ref<ResultsGroupMode>('WAVE')
  const selectedListId = ref<string>('')

  // Initialize sortOrder from localStorage if available, default to 'TIME'
  const initialSortOrder = (import.meta.client && localStorage.getItem('laxmtb_sortOrder')) as ResultsSortOrder | null
  const validSortOrders: ResultsSortOrder[] = ['TIME', 'GRADE', 'GRADE_ASC', 'GRADE_DESC']
  const sortOrder = ref<ResultsSortOrder>(initialSortOrder && validSortOrders.includes(initialSortOrder) ? initialSortOrder : 'TIME')

  if (import.meta.client) {
    watch(sortOrder, (newVal) => {
      localStorage.setItem('laxmtb_sortOrder', newVal)
    })
  }

  const selectedCategory = ref('ALL')
  const selectedTeamScope = ref<string>('DEFAULT_TEAMS')
  const isFilterOpen = ref(false)
  const allCardsCollapsed = ref(true)
  const selectedRiderKeys = ref<Set<string>>(new Set())
  const cardStateOverrides = ref<Record<string, boolean>>({})

  const toggleRiderKey = (key: string) => {
    const next = new Set(selectedRiderKeys.value)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    selectedRiderKeys.value = next
  }

  const toggleRiderKeySet = (keys: string[]) => {
    const next = new Set(selectedRiderKeys.value)
    const allPresent = keys.every(k => next.has(k))
    if (allPresent) {
      keys.forEach(k => next.delete(k))
    } else {
      keys.forEach(k => next.add(k))
    }
    selectedRiderKeys.value = next
  }

  const toggleCardCollapse = (key: string) => {
    cardStateOverrides.value[key] = !isCardCollapsed(key)
  }

  const isCardCollapsed = (key: string) => {
    if (searchQuery.value.trim()) return false
    if (cardStateOverrides.value[key] !== undefined) {
      return cardStateOverrides.value[key]
    }
    return allCardsCollapsed.value
  }

  const toggleAllCards = () => {
    allCardsCollapsed.value = !allCardsCollapsed.value
    cardStateOverrides.value = {}
  }

  // Categories list from current riders
  const categories = computed(() => {
    const set = new Set<string>()
    riders.value.forEach(r => {
      if (r.category) set.add(r.category)
    })
    return Array.from(set).sort((a, b) => {
      return compareCategories(a, b, sortOrder.value, null)
    })
  })

  // Teams list from current riders and team standings
  const teams = computed(() => {
    const set = new Set<string>()
    riders.value.forEach(r => {
      if (r.team) set.add(r.team)
    })
    teamStandings.value.forEach(s => {
      if (s.team) set.add(s.team)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  })

  // Filtered and Sorted Riders
  const filteredRiders = computed(() => {
    let list = [...riders.value]

    // Team Scope filter
    if (selectedTeamScope.value === 'DEFAULT_TEAMS') {
      list = list.filter(r =>
        targetTeamKeywords.some(kw => r.team && r.team.toLowerCase().includes(kw))
      )
    } else if (selectedTeamScope.value && selectedTeamScope.value !== 'ALL') {
      list = list.filter(r => r.team === selectedTeamScope.value)
    }

    // Category filter
    if (selectedCategory.value !== 'ALL') {
      list = list.filter(r => r.category === selectedCategory.value)
    }

    // Search query filter
    const q = searchQuery.value.trim().toLowerCase()
    if (q) {
      list = list.filter(r =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.bib && r.bib.toLowerCase().includes(q)) ||
        (r.no && r.no.toLowerCase().includes(q)) ||
        (r.team && r.team.toLowerCase().includes(q)) ||
        (r.category && r.category.toLowerCase().includes(q))
      )
    }

    return list
  })

  // Filtered Team Standings
  const filteredTeamStandings = computed(() => {
    let list = [...teamStandings.value]

    // Team Scope filter
    if (selectedTeamScope.value === 'DEFAULT_TEAMS') {
      list = list.filter(s =>
        targetTeamKeywords.some(kw => s.team && s.team.toLowerCase().includes(kw))
      )
    } else if (selectedTeamScope.value && selectedTeamScope.value !== 'ALL') {
      list = list.filter(s => s.team === selectedTeamScope.value)
    }

    // Search query filter
    const q = searchQuery.value.trim().toLowerCase()
    if (q) {
      list = list.filter(s =>
        (s.team && s.team.toLowerCase().includes(q)) ||
        (s.division && s.division.toLowerCase().includes(q))
      )
    }

    return list
  })

  // Resolve best matching report from event config
  const resolveTargetReport = (
    lists: { ID: string; Name: string }[],
    page: 'list' | 'results',
    explicitId?: string,
    mode?: ResultsGroupMode
  ) => {
    if (!Array.isArray(lists) || lists.length === 0) return null

    // 1. If explicit ID exists and is in the lists, use it
    if (explicitId) {
      const match = lists.find(l => l.ID === explicitId)
      if (match) return match
    }

    // 2. Resolve by page and intent
    if (page === 'list') {
      if (mode === 'TEAM') {
        return (
          lists.find(l => (l.Name || '').toLowerCase().includes('start by team')) ||
          lists.find(l => (l.Name || '').toLowerCase().includes('by team')) ||
          lists[0]
        )
      }
      // Category / Wave / Field start list
      return (
        lists.find(l => (l.Name || '').toLowerCase().includes('first - print')) ||
        lists.find(l => (l.Name || '').toLowerCase().includes('category & wave')) ||
        lists.find(l => (l.Name || '').toLowerCase().includes('category & field')) ||
        lists.find(l => (l.Name || '').toLowerCase().includes('category') && !(l.Name || '').toLowerCase().includes('cable')) ||
        lists.find(l => (l.Name || '').toLowerCase().includes('category')) ||
        lists[0]
      )
    }

    // page === 'results'
    if (mode === 'TEAM') {
      return (
        lists.find(l => (l.Name || '').toLowerCase().includes('individual results - by team')) ||
        lists.find(l => (l.Name || '').toLowerCase().includes('by team')) ||
        lists[0]
      )
    }

    // Individual results - ALL
    return (
      lists.find(l => (l.Name || '').toLowerCase().includes('individual results - all')) ||
      lists.find(l => (l.Name || '').toLowerCase().includes('result lists')) ||
      lists.find(l => (l.Name || '').toLowerCase().includes('individual')) ||
      lists[0]
    )
  }

  const applyResultEntry = (entry: CachedResultsEntry, isOffline = false) => {
    riders.value = entry.riders || []
    teamStandings.value = entry.teamStandings || []
    feedViewType.value = entry.viewType || (entry as any).feedViewType || 'category_start_list'
    if (entry.availableReports && entry.availableReports.length > 0) {
      availableReports.value = entry.availableReports
    }
    if (entry.selectedListId) {
      selectedListId.value = entry.selectedListId
    }
    if (entry.listMode) {
      listMode.value = entry.listMode
    }
    isLive.value = isOffline ? false : !!entry.isLive
    const timeStr = entry.time || 'Cached'
    lastUpdated.value = isOffline && !timeStr.includes('(Offline')
      ? `${timeStr} (Offline Cache)`
      : timeStr
    error.value = null
  }

  // Fetch from RACE RESULT API
  const fetchResults = async (
    eventId: string,
    page: 'list' | 'results',
    explicitListId?: string,
    isCompleted?: boolean
  ) => {
    if (!eventId) return

    const requestId = ++activeRequestId
    loading.value = true
    error.value = null

    // 1. Immediately restore cached report list if available
    const cachedReports = readReportsCache(eventId, page)
    if (cachedReports.length > 0 && availableReports.value.length === 0) {
      availableReports.value = cachedReports
    }

    // 2. Offline-first: restore cached data immediately so UI is never blank
    const cached = readFromStorageCache(eventId, page, explicitListId)
    if (cached && (cached.riders?.length > 0 || cached.teamStandings?.length > 0)) {
      applyResultEntry(cached, !navigator.onLine)
      // If offline, finish immediately! No waiting, no network errors
      if (import.meta.client && !navigator.onLine) {
        loading.value = false
        return
      }
    }

    // 3. If offline and no localStorage cache exists, check bundled seed data
    if (import.meta.client && !navigator.onLine) {
      const fallback = getFallbackSeedResults(eventId, page)
      if (fallback) {
        applyResultEntry(fallback, true)
      } else {
        error.value = 'Offline - No cached timing data available for this race'
      }
      loading.value = false
      return
    }

    // 4. Live network fetch
    try {
      const configResp = await fetch(`https://my.raceresult.com/${eventId}/${page}/config?lang=en`)
      if (!configResp.ok) throw new Error(`Config HTTP ${configResp.status}`)
      const config = await configResp.json()
      const key = config.key

      if (requestId !== activeRequestId) return

      const lists = (config?.TabConfig?.Lists || []).map((l: any) => ({
        ID: l.ID,
        Name: l.Name
      }))
      availableReports.value = lists
      if (import.meta.client && lists.length > 0) {
        try {
          localStorage.setItem(`laxmtb_v2_reports_${eventId}_${page}`, JSON.stringify(lists))
        } catch {}
      }

      const targetList = resolveTargetReport(lists, page, explicitListId, listMode.value)
      if (!targetList) {
        throw new Error('No compatible report found for this event.')
      }

      selectedListId.value = targetList.ID
      listMode.value = (targetList.Name || '').toLowerCase().includes('by team') ? 'TEAM' : 'WAVE'

      const params = new URLSearchParams({
        key: key,
        listname: targetList.Name,
        page: page,
        contest: '0',
        r: 'all',
        l: '0'
      })

      const listResp = await fetch(`https://my.raceresult.com/${eventId}/${page}/list?` + params.toString())
      if (!listResp.ok) throw new Error(`List HTTP ${listResp.status}`)
      const resultData = await listResp.json()

      if (requestId !== activeRequestId) return

      const parsed = parseUniversalData(resultData, targetList.ID, page)

      const entry: CachedResultsEntry = {
        riders: parsed.riders,
        teamStandings: parsed.teamStandings,
        viewType: parsed.viewType,
        availableReports: lists,
        selectedListId: targetList.ID,
        listMode: (targetList.Name || '').toLowerCase().includes('by team') ? ('TEAM' as ResultsGroupMode) : ('WAVE' as ResultsGroupMode),
        time: isCompleted
          ? 'Final Results • ' + new Date().toLocaleTimeString()
          : 'Updated ' + new Date().toLocaleTimeString(),
        isLive: !isCompleted
      }

      if (!tabCache.value[eventId]) {
        tabCache.value[eventId] = {}
      }
      tabCache.value[eventId][page] = entry

      applyResultEntry(entry, false)

      // Persist to local storage: both specific list ID key and default tab key
      if (import.meta.client && (parsed.riders.length > 0 || parsed.teamStandings.length > 0)) {
        try {
          const serialized = JSON.stringify(entry)
          localStorage.setItem(`laxmtb_v2_cache_${eventId}_${page}_${targetList.ID}`, serialized)
          localStorage.setItem(`laxmtb_v2_cache_${eventId}_${page}`, serialized)
        } catch {}
      }
    } catch (err: any) {
      if (requestId !== activeRequestId) return
      console.warn('[RACE RESULT live fetch error]:', err?.message || err)
      isLive.value = false

      // Fallback: If we don't have riders in memory, recover from cache or seed data
      if (riders.value.length === 0 && teamStandings.value.length === 0) {
        const fallback = readFromStorageCache(eventId, page, explicitListId) || getFallbackSeedResults(eventId, page)
        if (fallback) {
          applyResultEntry(fallback, true)
        } else {
          error.value = 'Failed to connect to timing feed and no offline data cached'
        }
      } else {
        if (!lastUpdated.value.includes('(Offline')) {
          lastUpdated.value += ' (Offline Cache)'
        }
        error.value = null
      }
    } finally {
      if (requestId === activeRequestId) {
        loading.value = false
      }
    }
  }

  const loadOrSwitchTab = async (
    eventId: string,
    page: 'list' | 'results',
    isCompleted?: boolean
  ) => {
    if (!eventId) return

    // 1. Check in-memory tabCache
    const cached = tabCache.value[eventId]?.[page]
    if (cached && (cached.riders?.length > 0 || cached.teamStandings?.length > 0)) {
      applyResultEntry(cached, !navigator.onLine)
      if (import.meta.client && !navigator.onLine) {
        return
      }
    }

    // 2. Check localStorage cache
    const localCached = readFromStorageCache(eventId, page)
    if (localCached && (localCached.riders?.length > 0 || localCached.teamStandings?.length > 0)) {
      applyResultEntry(localCached, !navigator.onLine)
      if (import.meta.client && !navigator.onLine) {
        return
      }
    }

    // 3. Check fallback seed data if offline
    if (import.meta.client && !navigator.onLine) {
      const fallback = getFallbackSeedResults(eventId, page)
      if (fallback) {
        applyResultEntry(fallback, true)
        return
      }
    }

    // 4. Fetch live data
    await fetchResults(eventId, page, undefined, isCompleted)
  }

  return {
    riders,
    filteredRiders,
    teamStandings,
    filteredTeamStandings,
    feedViewType,
    availableReports,
    categories,
    teams,
    loading,
    error,
    lastUpdated,
    isLive,
    searchQuery,
    listMode,
    selectedListId,
    sortOrder,
    selectedCategory,
    selectedTeamScope,
    isFilterOpen,
    allCardsCollapsed,
    selectedRiderKeys,
    toggleRiderKey,
    toggleRiderKeySet,
    toggleCardCollapse,
    isCardCollapsed,
    toggleAllCards,
    fetchResults,
    loadOrSwitchTab
  }
}
