import type { Rider, ResultsSortOrder, ResultsGroupMode, TeamScope } from '../types/results'
import { parseUniversalData, targetTeamKeywords, categoryOrder, normalizeCategoryName } from '../services/raceresultService'

export const useRaceResults = () => {
  const riders = ref<Rider[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdated = ref<string>('')
  const isLive = ref(false)

  // Filters state
  const searchQuery = ref('')
  const listMode = ref<ResultsGroupMode>('WAVE')
  const sortOrder = ref<ResultsSortOrder>('GRADE')
  const selectedCategory = ref('ALL')
  const selectedTeamScope = ref<TeamScope>('DEFAULT_TEAMS')
  const isFilterOpen = ref(false)
  const allCardsCollapsed = ref(false)
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
      const ia = categoryOrder.indexOf(a)
      const ib = categoryOrder.indexOf(b)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.localeCompare(b)
    })
  })

  // Filtered and Sorted Riders
  const filteredRiders = computed(() => {
    let list = [...riders.value]

    // Team Scope filter
    if (selectedTeamScope.value === 'DEFAULT_TEAMS') {
      list = list.filter(r =>
        targetTeamKeywords.some(kw => r.team && r.team.toLowerCase().includes(kw))
      )
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

  // Fetch from RACE RESULT API
  const fetchResults = async (eventId: string, page: 'list' | 'results') => {
    if (!eventId) return

    loading.value = true
    error.value = null

    const selectedListId = listMode.value === 'TEAM' ? '747B52' : '22E0EB'
    const cacheKey = `laxmtb_cache_${eventId}_${page}_${selectedListId}`

    // Offline check
    if (import.meta.client && !navigator.onLine) {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          riders.value = parsed.riders || []
          lastUpdated.value = (parsed.time || '') + ' (Offline Cache)'
          loading.value = false
          return
        } catch (e) {}
      }
    }

    try {
      const configResp = await fetch(`https://my.raceresult.com/${eventId}/${page}/config?lang=en`)
      if (!configResp.ok) throw new Error(`Config HTTP ${configResp.status}`)
      const config = await configResp.json()
      const key = config.key

      const lists = config?.TabConfig?.Lists || []
      let targetList = null
      if (page === 'list') {
        if (selectedListId === '747B52') {
          targetList = lists.find((l: any) => l.ID === '747B52') || lists.find((l: any) => (l.Name || '').toLowerCase().includes('team'))
        } else {
          targetList = lists.find((l: any) => l.ID === selectedListId) ||
                       lists.find((l: any) => l.ID === 'A76F6B') ||
                       lists.find((l: any) => (l.Name || '').toLowerCase().includes('category') && !(l.Name || '').toLowerCase().includes('cable')) ||
                       lists.find((l: any) => (l.Name || '').toLowerCase().includes('category')) ||
                       lists[0]
        }
      } else {
        targetList = lists.find((l: any) => l.ID === selectedListId) || lists[0]
      }

      const listName = targetList ? targetList.Name : ''
      const params = new URLSearchParams({
        key: key,
        listname: listName,
        page: page,
        contest: '0',
        r: 'all',
        l: '0'
      })

      const listResp = await fetch(`https://my.raceresult.com/${eventId}/${page}/list?` + params.toString())
      if (!listResp.ok) throw new Error(`List HTTP ${listResp.status}`)
      let resultData = await listResp.json()

      // Fallback if empty data
      if (page === 'list' && Array.isArray(resultData?.data) && resultData.data.length === 0) {
        const altList = lists.find((l: any) => l.ID === 'A76F6B') || lists.find((l: any) => l.ID !== (targetList ? targetList.ID : ''))
        if (altList) {
          const altParams = new URLSearchParams({
            key: key,
            listname: altList.Name,
            page: page,
            contest: '0',
            r: 'all',
            l: '0'
          })
          const altResp = await fetch(`https://my.raceresult.com/${eventId}/${page}/list?` + altParams.toString())
          if (altResp.ok) {
            const altData = await altResp.json()
            if (altData?.data && (!Array.isArray(altData.data) || altData.data.length > 0)) {
              resultData = altData
              targetList = altList
            }
          }
        }
      }

      const targetListId = targetList?.ID || selectedListId
      const parsedRiders = parseUniversalData(resultData, targetListId, page)
      riders.value = parsedRiders
      isLive.value = true
      lastUpdated.value = 'Updated ' + new Date().toLocaleTimeString()

      if (import.meta.client && parsedRiders.length > 0) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            time: new Date().toLocaleTimeString(),
            riders: parsedRiders
          }))
        } catch (e) {}
      }
    } catch (err: any) {
      console.error('[RACE RESULT fetch error]:', err)
      error.value = err.message || 'Failed to connect to live timing'
      isLive.value = false

      // Try reading local storage
      if (import.meta.client) {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            riders.value = parsed.riders || []
            lastUpdated.value = (parsed.time || '') + ' (Offline Cache)'
          } catch (e) {}
        }
      }
    } finally {
      loading.value = false
    }
  }

  return {
    riders,
    filteredRiders,
    categories,
    loading,
    error,
    lastUpdated,
    isLive,
    searchQuery,
    listMode,
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
    fetchResults
  }
}
