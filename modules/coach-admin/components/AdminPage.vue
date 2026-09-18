<script setup lang="ts">
import type { Race, ScheduleDay, ScheduleEvent, CoachSlot, WarmupGroup } from '~/modules/races/types/race'
import {
  categoryOrder,
  getCategoryStartTime,
  getCategoryStageTime,
  calculateDefaultGroupWarmupTime,
  formatWarmupGroupTitle,
  parseTimeStrToMinutes,
  formatMinutesToTimeStr,
  parseDateRange,
  formatDateRange,
  MONTHS_SHORT,
  MONTH_MAP,
  defaultWaveSchedule,
  getCategoryWaves
} from '~/modules/results/services/raceresultService'
import { type TeamUserItem } from '~/modules/coach-admin/composables/useCoachAuth'
import CustomDatePicker from './CustomDatePicker.vue'
import CustomTimePicker from './CustomTimePicker.vue'

const props = defineProps<{
  initialTab?: string
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'save', race: Race): void
  (e: 'toast', msg: string): void
}>()

const { races, currentRaceIndex, selectRace, currentRace } = useCurrentRace()
const {
  user,
  isCoachAuth,
  isAuthorizedCoach,
  isAdminCoach,
  isAdminUnlocked,
  authError,
  authLoading,
  adminsList,
  adminsLoading,
  allUsersList,
  allUsersLoading,
  fetchAdmins,
  fetchAllUsers,
  inviteSettings,
  fetchInviteSettings,
  updateInviteCodes,
  addCoachAdmin,
  updateCoachRole,
  updateUserRole,
  removeCoachAdmin,
  signInWithGoogle,
  signOut,
  lockAdmin,
  unlockAdmin
} = useCoachAuth()

export type AdminScope = 'race' | 'site'

const currentScope = ref<AdminScope>('race')
const activeRaceTab = ref('venue')
const activeSiteTab = ref('site-alert')

const resolveScopeAndTab = (inputTabOrScope?: string) => {
  if (!inputTabOrScope) {
    return { scope: 'race' as AdminScope, raceTab: 'venue', siteTab: 'site-alert' }
  }
  const clean = inputTabOrScope.trim().toLowerCase()

  if (clean === 'site' || clean === 'site-admin') {
    return { scope: 'site' as AdminScope, raceTab: activeRaceTab.value || 'venue', siteTab: activeSiteTab.value || 'site-alert' }
  }
  if (clean === 'race' || clean === 'race-admin') {
    return { scope: 'race' as AdminScope, raceTab: activeRaceTab.value || 'venue', siteTab: activeSiteTab.value || 'site-alert' }
  }

  // Site tabs
  if (['alert', 'announcement', 'site-alert', 'urgent'].includes(clean)) {
    return { scope: 'site' as AdminScope, raceTab: activeRaceTab.value || 'venue', siteTab: 'site-alert' }
  }
  if (['media', 'photos-site', 'site-photos', 'site-media', 'banners'].includes(clean)) {
    return { scope: 'site' as AdminScope, raceTab: activeRaceTab.value || 'venue', siteTab: 'site-media' }
  }
  if (['leadership', 'leaders', 'site-leaders', 'team-leaders'].includes(clean)) {
    return { scope: 'site' as AdminScope, raceTab: activeRaceTab.value || 'venue', siteTab: 'site-leaders' }
  }
  if (['sponsors', 'site-sponsors', 'partners'].includes(clean)) {
    return { scope: 'site' as AdminScope, raceTab: activeRaceTab.value || 'venue', siteTab: 'site-sponsors' }
  }
  if (['users', 'coaches', 'admins', 'permissions'].includes(clean)) {
    return { scope: 'site' as AdminScope, raceTab: activeRaceTab.value || 'venue', siteTab: 'coaches' }
  }

  // Race tabs
  let rTab = clean
  if (rTab === 'coach') rTab = 'waves'
  if (rTab === 'photos') rTab = 'signups'
  if (!['venue', 'schedule', 'waves', 'signups', 'maps', 'announcements'].includes(rTab)) {
    rTab = 'venue'
  }
  return { scope: 'race' as AdminScope, raceTab: rTab, siteTab: activeSiteTab.value || 'site-alert' }
}

const normalizeTab = (tab?: string): string => {
  if (!tab) return 'venue'
  const res = resolveScopeAndTab(tab)
  return res.scope === 'race' ? res.raceTab : res.siteTab
}

const initNav = resolveScopeAndTab(props.initialTab)
currentScope.value = initNav.scope
activeRaceTab.value = initNav.raceTab
activeSiteTab.value = initNav.siteTab

// activeTab computed for backward compatibility
const activeTab = computed({
  get: () => currentScope.value === 'race' ? activeRaceTab.value : activeSiteTab.value,
  set: (val: string) => {
    selectTab(val)
  }
})

const updateAdminUrl = (scope: AdminScope, tab: string) => {
  if (import.meta.client && typeof window !== 'undefined') {
    const target = `/admin?scope=${encodeURIComponent(scope)}&tab=${encodeURIComponent(tab)}`
    if (window.location.pathname + window.location.search !== target) {
      window.history.replaceState({ admin: true, scope, tab }, '', target)
    }
  }
}

const selectScope = (scope: AdminScope) => {
  currentScope.value = scope
  const tab = scope === 'race' ? activeRaceTab.value : activeSiteTab.value
  updateAdminUrl(scope, tab)
  nextTick(updateAdminHeaderHeight)
}

const selectRaceTab = (tab: string) => {
  currentScope.value = 'race'
  activeRaceTab.value = tab
  updateAdminUrl('race', tab)
  nextTick(updateAdminHeaderHeight)
}

const selectSiteTab = (tab: string) => {
  currentScope.value = 'site'
  activeSiteTab.value = tab
  updateAdminUrl('site', tab)
  nextTick(updateAdminHeaderHeight)
}

const selectTab = (tab: string) => {
  const res = resolveScopeAndTab(tab)
  currentScope.value = res.scope
  if (res.scope === 'race') {
    activeRaceTab.value = res.raceTab
    updateAdminUrl('race', res.raceTab)
  } else {
    activeSiteTab.value = res.siteTab
    updateAdminUrl('site', res.siteTab)
  }
  nextTick(updateAdminHeaderHeight)
}

const handleSiteHeaderSave = () => {
  if (activeSiteTab.value === 'site-alert') handlePublishAlert()
  else if (activeSiteTab.value === 'site-media') handleSaveSiteMedia()
  else if (activeSiteTab.value === 'site-leaders') handleSaveAdminLeaders()
  else if (activeSiteTab.value === 'site-sponsors') handleSaveAdminSponsors()
}

const siteSaveButtonText = computed(() => {
  if (activeSiteTab.value === 'site-alert') return isSavingAlert.value ? 'Publishing...' : 'Publish Alert'
  if (activeSiteTab.value === 'site-media') return isSavingMedia.value ? 'Saving...' : 'Save Photos'
  if (activeSiteTab.value === 'site-leaders') return isSavingLeaders.value ? 'Saving...' : 'Save Leaders'
  if (activeSiteTab.value === 'site-sponsors') return isSavingSponsors.value ? 'Saving...' : 'Save Sponsors'
  return ''
})

watch(() => props.initialTab, (newTab) => {
  if (newTab) selectTab(newTab)
})

const onPopState = () => {
  if (import.meta.client && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const scopeParam = params.get('scope') || params.get('page')
    const tabParam = params.get('tab')
    if (scopeParam === 'site' || scopeParam === 'race') {
      currentScope.value = scopeParam
    }
    if (tabParam) {
      const res = resolveScopeAndTab(tabParam)
      if (!scopeParam) currentScope.value = res.scope
      if (currentScope.value === 'race') activeRaceTab.value = res.raceTab
      else activeSiteTab.value = res.siteTab
    }
    nextTick(updateAdminHeaderHeight)
  }
}

const adminStickyHeaderRef = ref<HTMLElement | null>(null)
let adminHeaderResizeObserver: ResizeObserver | null = null

const updateAdminHeaderHeight = () => {
  if (adminStickyHeaderRef.value) {
    const h = adminStickyHeaderRef.value.getBoundingClientRect().height
    if (h > 0) {
      document.documentElement.style.setProperty('--admin-header-height', `${Math.round(h)}px`)
    }
  }
}

watch([currentScope, activeRaceTab, activeSiteTab], () => {
  nextTick(updateAdminHeaderHeight)
})

onMounted(() => {
  if (import.meta.client && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const scopeParam = params.get('scope') || params.get('page')
    const tabParam = params.get('tab')
    if (scopeParam === 'site' || scopeParam === 'race') {
      currentScope.value = scopeParam
    }
    if (tabParam) {
      selectTab(tabParam)
    } else if (props.initialTab) {
      selectTab(props.initialTab)
    }
    window.addEventListener('popstate', onPopState)

    nextTick(() => {
      updateAdminHeaderHeight()
      if (typeof ResizeObserver !== 'undefined' && adminStickyHeaderRef.value) {
        adminHeaderResizeObserver = new ResizeObserver(updateAdminHeaderHeight)
        adminHeaderResizeObserver.observe(adminStickyHeaderRef.value)
      }
    })
  }
})

onUnmounted(() => {
  if (adminHeaderResizeObserver) {
    adminHeaderResizeObserver.disconnect()
  }
  if (import.meta.client && typeof window !== 'undefined') {
    window.removeEventListener('popstate', onPopState)
  }
})

// Local editable copy of current race
const form = ref<Race>({ ...currentRace.value })

// Date Range Picker State
const dateRangeStart = ref('')
const dateRangeEnd = ref('')

const eventYear = computed(() => {
  if (dateRangeStart.value) {
    const y = parseInt(dateRangeStart.value.split('-')[0], 10)
    if (!isNaN(y)) return y
  }
  return new Date().getFullYear()
})

function updateDateRangeFromForm() {
  const { start, end } = parseDateRange(form.value.dateStr || '')
  dateRangeStart.value = start
  dateRangeEnd.value = end
}

const onDateRangeChange = () => {
  if (dateRangeStart.value) {
    if (dateRangeEnd.value && dateRangeEnd.value < dateRangeStart.value) {
      dateRangeEnd.value = dateRangeStart.value
    }
    form.value.dateStr = formatDateRange(dateRangeStart.value, dateRangeEnd.value || dateRangeStart.value)
  }
}

const onDateStrManualInput = () => {
  const { start, end } = parseDateRange(form.value.dateStr || '')
  if (start) dateRangeStart.value = start
  if (end) dateRangeEnd.value = end
}

const syncScheduleDaysFromDateRange = () => {
  if (!dateRangeStart.value) return
  const endVal = dateRangeEnd.value || dateRangeStart.value
  const [y1, m1, d1] = dateRangeStart.value.split('-').map(Number)
  const [y2, m2, d2] = endVal.split('-').map(Number)

  const startDt = new Date(y1, m1 - 1, d1)
  const endDt = new Date(y2, m2 - 1, d2)

  const days: { day: string, date: string, isRaceDay: boolean }[] = []
  const cur = new Date(startDt)
  while (cur <= endDt) {
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][cur.getDay()]
    const monName = MONTHS_SHORT[cur.getMonth()]
    const isRaceDay = cur.getTime() === endDt.getTime() || dayName === 'Sunday'
    days.push({
      day: dayName,
      date: `${monName} ${cur.getDate()}`,
      isRaceDay
    })
    cur.setDate(cur.getDate() + 1)
  }

  if (!form.value.schedule) form.value.schedule = []

  days.forEach((newD, i) => {
    if (form.value.schedule[i]) {
      form.value.schedule[i].day = newD.day
      form.value.schedule[i].date = newD.date
      if (newD.isRaceDay) form.value.schedule[i].isRaceDay = true
    } else {
      form.value.schedule.push({
        day: newD.day,
        date: newD.date,
        subtitle: newD.isRaceDay ? 'Race Day' : '',
        isRaceDay: newD.isRaceDay,
        events: []
      })
    }
  })
}

const getDayIso = (dateStr?: string): string => {
  if (!dateStr) return ''
  const m = dateStr.trim().match(/^([A-Za-z]+)\s+(\d{1,2})$/)
  if (m) {
    const mon = MONTH_MAP[m[1].toLowerCase()]
    if (mon !== undefined) {
      const d = parseInt(m[2], 10)
      const yr = dateRangeStart.value ? parseInt(dateRangeStart.value.split('-')[0], 10) : new Date().getFullYear()
      return `${yr}-${String(mon + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  return ''
}

const onScheduleDayDateChange = (day: ScheduleDay, isoDate: string) => {
  if (!isoDate) return
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  day.day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dt.getDay()]
  day.date = `${MONTHS_SHORT[m - 1]} ${d}`
}

function syncFormFromRace(raceData: Race | null) {
  if (!raceData) return
  form.value = JSON.parse(JSON.stringify(raceData))
  if (typeof form.value.stagingOffsetMinutes !== 'number' || isNaN(form.value.stagingOffsetMinutes)) {
    form.value.stagingOffsetMinutes = 15
  }
  if (typeof form.value.warmupOffsetMinutes !== 'number' || isNaN(form.value.warmupOffsetMinutes)) {
    form.value.warmupOffsetMinutes = 45
  }
  if (!form.value.schedule) {
    form.value.schedule = []
  }
  if (!form.value.signups) {
    form.value.signups = { volunteer: '', food: '', league: '', photos: '', camping: '' }
  }
  if (!form.value.guidelines) {
    form.value.guidelines = []
  }
  if (!form.value.coachSignups) {
    form.value.coachSignups = {
      policy: 'Ride Leader must hold NICA Level 2+ and is responsible for participants. Multiple coaches can sign up for each spot.',
      preRides: [],
      warmups: []
    }
  }
  if (!form.value.coachSignups.preRides) {
    form.value.coachSignups.preRides = []
  }
  if (!form.value.waveSchedule || Object.keys(form.value.waveSchedule).length === 0) {
    form.value.waveSchedule = JSON.parse(JSON.stringify(defaultWaveSchedule))
  }
  updateDateRangeFromForm()
  initWarmupGroups()
}

const setStagingOffset = (val: number | 'custom') => {
  if (val === 'custom') {
    if (!form.value.stagingOffsetMinutes || [15, 20, 30].includes(form.value.stagingOffsetMinutes)) {
      form.value.stagingOffsetMinutes = 15
    }
  } else {
    form.value.stagingOffsetMinutes = val
  }
  autoConfigureAllGroups()
}

const setWarmupOffset = (val: number | 'custom') => {
  if (val === 'custom') {
    if (!form.value.warmupOffsetMinutes || [60, 45, 30].includes(form.value.warmupOffsetMinutes)) {
      form.value.warmupOffsetMinutes = 45
    }
  } else {
    form.value.warmupOffsetMinutes = val
  }
  autoConfigureAllGroups()
}

syncFormFromRace(currentRace.value)

watch(currentRace, (newRace) => {
  syncFormFromRace(newRace)
}, { deep: true })

watch(activeTab, (newTab) => {
  if (newTab === 'waves' || newTab === 'coach') {
    initWarmupGroups()
  }
})

// State for adding new coach administrator
const newCoachEmail = ref('')
const newCoachName = ref('')
const isAddingCoach = ref(false)

const handleAddCoach = async () => {
  if (!newCoachEmail.value) return
  isAddingCoach.value = true
  const res = await addCoachAdmin(newCoachEmail.value, newCoachName.value)
  isAddingCoach.value = false
  if (res.success) {
    emit('toast', `✅ Added ${newCoachEmail.value} as Coach Administrator!`)
    newCoachEmail.value = ''
    newCoachName.value = ''
  } else {
    emit('toast', `⛔ ${res.error || 'Failed to add administrator'}`)
  }
}

// User Directory State (Search, Role Filter, Column Sorting)
const userSearchQuery = ref('')
const userRoleFilter = ref<'all' | 'admin' | 'coach' | 'guardian'>('all')
const userSortField = ref<'name' | 'email' | 'role' | 'date' | 'lastLogin'>('lastLogin')
const userSortOrder = ref<'asc' | 'desc'>('desc')

const toggleUserSort = (field: 'name' | 'email' | 'role' | 'date' | 'lastLogin') => {
  if (userSortField.value === field) {
    userSortOrder.value = userSortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    userSortField.value = field
    userSortOrder.value = field === 'lastLogin' || field === 'date' ? 'desc' : 'asc'
  }
}

const formatLastLogin = (isoStr?: string): string => {
  if (!isoStr) return 'Never'
  try {
    const d = new Date(isoStr)
    if (isNaN(d.getTime())) return 'Never'
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    if (diffMs < 0) return 'Just now'
    const diffMins = Math.floor(diffMs / (60 * 1000))
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24 && now.getDate() === d.getDate()) {
      return `Today at ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    }
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1 || (diffHours < 48 && now.getDate() - d.getDate() === 1)) {
      return `Yesterday at ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return 'Never'
  }
}

const filteredUsers = computed(() => {
  let list = [...allUsersList.value]

  // Search filter (name, email, phone)
  if (userSearchQuery.value.trim()) {
    const q = userSearchQuery.value.toLowerCase().trim()
    list = list.filter(u =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q))
    )
  }

  // Role filter
  if (userRoleFilter.value !== 'all') {
    list = list.filter(u => {
      if (userRoleFilter.value === 'admin') return u.role === 'admin' || u.role === 'owner'
      return u.role === userRoleFilter.value
    })
  }

  // Sorting
  list.sort((a, b) => {
    let comparison = 0
    if (userSortField.value === 'name') {
      comparison = (a.name || '').localeCompare(b.name || '')
    } else if (userSortField.value === 'email') {
      comparison = (a.email || '').localeCompare(b.email || '')
    } else if (userSortField.value === 'role') {
      const roleWeight = (r: string) => r === 'owner' ? 4 : (r === 'admin' ? 3 : (r === 'coach' ? 2 : 1))
      comparison = roleWeight(b.role) - roleWeight(a.role)
    } else if (userSortField.value === 'lastLogin') {
      const dateA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0
      const dateB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0
      comparison = dateB - dateA
    } else if (userSortField.value === 'date') {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      comparison = dateB - dateA
    }
    return userSortOrder.value === 'asc' ? comparison : -comparison
  })

  return list
})

const handleUpdateUserRole = async (userItem: TeamUserItem, newRole: 'admin' | 'coach' | 'guardian') => {
  const res = await updateUserRole(userItem.email, newRole, userItem.uid || userItem.id)
  if (res.success) {
    const roleLabel = newRole === 'admin' ? 'Coach Admin' : (newRole === 'guardian' ? 'Guardian' : 'Coach')
    emit('toast', `🔄 Updated ${userItem.name || userItem.email} to ${roleLabel}`)
  } else {
    emit('toast', `⛔ ${res.error || 'Failed to update access'}`)
  }
}

const handleRemoveUser = async (userItem: TeamUserItem) => {
  if (confirm(`Are you sure you want to remove access for ${userItem.name || userItem.email}?`)) {
    const res = await removeCoachAdmin(userItem.email, userItem.uid || userItem.id)
    if (res.success) {
      emit('toast', `🗑️ Removed ${userItem.name || userItem.email}`)
    } else {
      emit('toast', `⛔ ${res.error || 'Failed to remove user'}`)
    }
  }
}

// State for invite codes & shareable links
const coachCodeInput = ref('')
const guardianCodeInput = ref('')
const isSavingInvites = ref(false)
const copiedCoach = ref(false)
const copiedGuardian = ref(false)

const originUrl = computed(() => {
  if (import.meta.client && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'https://laxmtb.org'
})

const coachInviteUrl = computed(() => {
  const code = coachCodeInput.value.trim() || inviteSettings.value.coachCode || 'lax-coach-2026'
  return `${originUrl.value}/?invite=${encodeURIComponent(code)}`
})

const guardianInviteUrl = computed(() => {
  const code = guardianCodeInput.value.trim() || inviteSettings.value.guardianCode || 'lax-guardian-2026'
  return `${originUrl.value}/?invite=${encodeURIComponent(code)}`
})

watch(inviteSettings, (val) => {
  if (val) {
    coachCodeInput.value = val.coachCode || 'lax-coach-2026'
    guardianCodeInput.value = val.guardianCode || 'lax-guardian-2026'
  }
}, { immediate: true })

onMounted(() => {
  fetchInviteSettings()
  fetchAdmins()
  fetchAllUsers()
})

const copyCoachLink = async () => {
  try {
    await navigator.clipboard.writeText(coachInviteUrl.value)
    copiedCoach.value = true
    emit('toast', '📋 Coach invite link copied to clipboard!')
    setTimeout(() => { copiedCoach.value = false }, 2500)
  } catch {
    emit('toast', 'Could not copy link automatically. Please select and copy manually.')
  }
}

const copyGuardianLink = async () => {
  try {
    await navigator.clipboard.writeText(guardianInviteUrl.value)
    copiedGuardian.value = true
    emit('toast', '📋 Guardian invite link copied to clipboard!')
    setTimeout(() => { copiedGuardian.value = false }, 2500)
  } catch {
    emit('toast', 'Could not copy link automatically. Please select and copy manually.')
  }
}

const handleSaveInviteCodes = async () => {
  isSavingInvites.value = true
  const res = await updateInviteCodes({
    coachCode: coachCodeInput.value,
    guardianCode: guardianCodeInput.value
  })
  isSavingInvites.value = false
  if (res.success) {
    emit('toast', '💾 Invite links & access codes updated!')
  } else {
    emit('toast', `⛔ ${res.error || 'Failed to update invite codes'}`)
  }
}

// Access gate condition
const screen = computed(() => {
  if (!user.value) return 'signin'
  if (!isAuthorizedCoach.value) return 'signin'
  if (!isAdminUnlocked.value) return 'locked'
  return 'dashboard'
})

const handleSignIn = async () => {
  const result = await signInWithGoogle()
  if (result.success) {
    emit('toast', `🔓 Signed in as ${user.value?.displayName || user.value?.email}`)
  }
}

const handleSignOut = async () => {
  await signOut()
  emit('toast', '👋 Signed out of Coach Admin')
  emit('back')
}

const handleLockAdmin = () => {
  lockAdmin()
  emit('toast', '🔒 Admin editing locked')
  emit('back')
}

const handleUnlockAdmin = () => {
  unlockAdmin()
  emit('toast', `🔓 Admin editing unlocked — welcome back, ${user.value?.displayName?.split(' ')[0] || 'Coach'}!`)
}

const handleSave = () => {
  if (!form.value.coachSignups) {
    form.value.coachSignups = { policy: '', preRides: [], warmups: [] }
  }
  if (!form.value.coachSignups.preRides) {
    form.value.coachSignups.preRides = []
  }
  if (form.value.warmupGroups) {
    form.value.coachSignups.warmups = form.value.warmupGroups.map(wg => ({
      id: wg.id,
      name: wg.name,
      meetingTime: wg.meetingTime,
      stagingTime: wg.stagingTime || '',
      startTime: wg.startTime || '',
      day: wg.day,
      date: wg.date,
      subtitle: wg.subtitle,
      categories: wg.categories || [],
      ridersAllowed: wg.ridersAllowed || (wg.categories && wg.categories.length > 0 ? wg.categories.join(', ') : ''),
      duration: wg.duration || '60 min',
      tag: wg.tag || '',
      tagClass: wg.tagClass || '',
      leaders: wg.leaders || [],
      support: wg.support || []
    }))
  }

  emit('save', JSON.parse(JSON.stringify(form.value)))
  emit('toast', '💾 Changes saved successfully!')
}

// Guidelines helpers & Drag-and-Drop
const addGuideline = () => {
  if (!form.value.guidelines) form.value.guidelines = []
  form.value.guidelines.push('')
}
const removeGuideline = (idx: number) => {
  form.value.guidelines?.splice(idx, 1)
}

const draggedGuidelineIdx = ref<number | null>(null)
const guidelineDragOverIdx = ref<number | null>(null)

const onGuidelineDragStart = (idx: number, e: DragEvent) => {
  draggedGuidelineIdx.value = idx
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }
}

const onGuidelineDragOver = (idx: number, e: DragEvent) => {
  e.preventDefault()
  if (draggedGuidelineIdx.value === null || draggedGuidelineIdx.value === idx) return
  guidelineDragOverIdx.value = idx
}

const onGuidelineDrop = (idx: number, e: DragEvent) => {
  e.preventDefault()
  if (draggedGuidelineIdx.value === null || !form.value.guidelines) return
  const from = draggedGuidelineIdx.value
  const to = idx
  if (from !== to && form.value.guidelines[from] !== undefined) {
    const item = form.value.guidelines.splice(from, 1)[0]
    form.value.guidelines.splice(to, 0, item)
  }
  guidelineDragOverIdx.value = null
  draggedGuidelineIdx.value = null
}

const onGuidelineDragEnd = () => {
  draggedGuidelineIdx.value = null
  guidelineDragOverIdx.value = null
}

// Schedule Days & Events Helpers
const addScheduleDay = () => {
  if (!form.value.schedule) form.value.schedule = []
  const dayNum = form.value.schedule.length + 1
  form.value.schedule.push({
    day: `Day ${dayNum}`,
    date: '',
    subtitle: '',
    isRaceDay: false,
    events: [
      { time: '8:00 AM', desc: '', tag: 'Team Event' }
    ]
  })
}

const removeScheduleDay = (idx: number) => {
  form.value.schedule?.splice(idx, 1)
}

const addScheduleEvent = (dayIdx: number) => {
  if (!form.value.schedule || !form.value.schedule[dayIdx]) return
  if (!form.value.schedule[dayIdx].events) form.value.schedule[dayIdx].events = []
  form.value.schedule[dayIdx].events.push({
    time: '10:00 AM',
    desc: '',
    tag: 'Team Event'
  })
}

const removeScheduleEvent = (dayIdx: number, evIdx: number) => {
  form.value.schedule?.[dayIdx]?.events?.splice(evIdx, 1)
}

const isEventTbd = (timeStr?: string) => {
  if (!timeStr) return false
  return timeStr.trim().toUpperCase() === 'TBD'
}

const getEventStart = (timeStr?: string) => {
  const str = String(timeStr || '').trim()
  if (!str || str.toUpperCase() === 'TBD') return ''
  const parts = str.split(/\s*[-–—]\s*|\s+to\s+/i)
  return parts[0]?.trim() || ''
}

const getEventEnd = (timeStr?: string) => {
  const str = String(timeStr || '').trim()
  if (!str || str.toUpperCase() === 'TBD') return ''
  const parts = str.split(/\s*[-–—]\s*|\s+to\s+/i)
  return parts.length >= 2 ? parts[1]?.trim() || '' : ''
}

const onStartChange = (ev: ScheduleEvent, newStart: string) => {
  if (newStart === 'TBD') {
    ev.time = 'TBD'
    return
  }
  const end = getEventEnd(ev.time)
  if (!newStart && !end) {
    ev.time = 'TBD'
  } else if (newStart && end) {
    ev.time = `${newStart} - ${end}`
  } else {
    ev.time = newStart || end
  }
}

const onEndChange = (ev: ScheduleEvent, newEnd: string) => {
  const start = getEventStart(ev.time) || '9:00 AM'
  if (newEnd) {
    ev.time = `${start} - ${newEnd}`
  } else {
    ev.time = start
  }
}

const toggleTbd = (ev: ScheduleEvent, isTbd: boolean) => {
  if (isTbd) {
    ev.time = 'TBD'
  } else {
    ev.time = '9:00 AM'
  }
}

// Drag and Drop: Schedule Events (within and across days)
const draggedEvent = ref<{ dayIdx: number; evIdx: number } | null>(null)
const eventDragOver = ref<{ dayIdx: number; evIdx: number } | null>(null)

const onEventDragStart = (dayIdx: number, evIdx: number, e: DragEvent) => {
  draggedEvent.value = { dayIdx, evIdx }
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `${dayIdx}:${evIdx}`)
  }
}

const onEventDragOver = (dayIdx: number, evIdx: number, e: DragEvent) => {
  e.preventDefault()
  if (draggedEvent.value) {
    eventDragOver.value = { dayIdx, evIdx }
  }
}

const onEventDrop = (targetDayIdx: number, targetEvIdx: number, e: DragEvent) => {
  e.preventDefault()
  if (!draggedEvent.value || !form.value.schedule) return
  const { dayIdx: srcDayIdx, evIdx: srcEvIdx } = draggedEvent.value
  const srcEvents = form.value.schedule[srcDayIdx]?.events
  const targetEvents = form.value.schedule[targetDayIdx]?.events
  if (!srcEvents || !targetEvents) return

  const item = srcEvents.splice(srcEvIdx, 1)[0]
  if (item) {
    targetEvents.splice(targetEvIdx, 0, item)
  }

  draggedEvent.value = null
  eventDragOver.value = null
}

const onEventDragEnd = () => {
  draggedEvent.value = null
  eventDragOver.value = null
}

// Drag and Drop: Schedule Days
const draggedDayIdx = ref<number | null>(null)
const dayDragOverIdx = ref<number | null>(null)

const onDayDragStart = (dayIdx: number, e: DragEvent) => {
  draggedDayIdx.value = dayIdx
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(dayIdx))
  }
}

const onDayDragOver = (dayIdx: number, e: DragEvent) => {
  e.preventDefault()
  if (draggedDayIdx.value !== null && draggedDayIdx.value !== dayIdx) {
    dayDragOverIdx.value = dayIdx
  }
}

const onDayDrop = (targetDayIdx: number, e: DragEvent) => {
  e.preventDefault()
  if (draggedDayIdx.value === null || !form.value.schedule) return
  const from = draggedDayIdx.value
  const to = targetDayIdx
  if (from !== to && form.value.schedule[from] !== undefined) {
    const dayItem = form.value.schedule.splice(from, 1)[0]
    form.value.schedule.splice(to, 0, dayItem)
  }
  draggedDayIdx.value = null
  dayDragOverIdx.value = null
}

const onDayDragEnd = () => {
  draggedDayIdx.value = null
  dayDragOverIdx.value = null
}

// Wave Schedule helpers
const ALL_CATEGORIES = categoryOrder
const getCatStart = (cat: string) => getCategoryStartTime(form.value, cat)
const getCatStage = (cat: string) => getCategoryStageTime(form.value, cat)

const getWavesForCategory = (cat: string): Record<string, { start: string; stage?: string }> => {
  if (!form.value.waveSchedule) {
    form.value.waveSchedule = JSON.parse(JSON.stringify(defaultWaveSchedule))
  }
  if (!form.value.waveSchedule[cat]) {
    const def = defaultWaveSchedule[cat]
    if (def) {
      form.value.waveSchedule[cat] = JSON.parse(JSON.stringify(def))
    } else {
      form.value.waveSchedule[cat] = { '1': { start: '8:00 AM', stage: '7:45 AM' } }
    }
  }
  return form.value.waveSchedule[cat] as Record<string, { start: string; stage?: string }>
}

const getSortedWaveKeys = (cat: string): string[] => {
  const wavesObj = getWavesForCategory(cat)
  return Object.keys(wavesObj).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10) || 0
    const numB = parseInt(b.replace(/\D/g, ''), 10) || 0
    return numA - numB
  })
}

const onWaveStartChange = (cat: string, waveKey: string, newTime?: string) => {
  form.value.hasCustomWaveSchedule = true
  const wavesObj = getWavesForCategory(cat)
  if (wavesObj[waveKey]) {
    if (newTime) {
      wavesObj[waveKey].start = newTime
    }
    const stagingOffset = form.value.stagingOffsetMinutes || 15
    const parsedMins = parseTimeStrToMinutes(wavesObj[waveKey].start)
    if (parsedMins !== null) {
      wavesObj[waveKey].stage = formatMinutesToTimeStr(parsedMins - stagingOffset)
    }
  }
}

const addWaveToCategory = (cat: string) => {
  form.value.hasCustomWaveSchedule = true
  const wavesObj = getWavesForCategory(cat)
  const keys = getSortedWaveKeys(cat)
  const lastKey = keys[keys.length - 1] || '0'
  const lastNum = parseInt(lastKey.replace(/\D/g, ''), 10) || 0
  const nextNum = lastNum + 1

  let newStart = '10:55 AM'
  if (lastKey && wavesObj[lastKey]?.start) {
    const prevMins = parseTimeStrToMinutes(wavesObj[lastKey].start)
    if (prevMins !== null) {
      newStart = formatMinutesToTimeStr(prevMins + 2)
    }
  }
  const stagingOffset = form.value.stagingOffsetMinutes || 15
  const startMins = parseTimeStrToMinutes(newStart)
  const newStage = startMins !== null ? formatMinutesToTimeStr(startMins - stagingOffset) : ''

  wavesObj[String(nextNum)] = {
    start: newStart,
    stage: newStage
  }
}

const removeWaveFromCategory = (cat: string, waveKey: string) => {
  form.value.hasCustomWaveSchedule = true
  const wavesObj = getWavesForCategory(cat)
  const keys = getSortedWaveKeys(cat)
  if (keys.length <= 1) {
    alert('Each category must have at least 1 wave.')
    return
  }
  delete wavesObj[waveKey]
}

const resetWaveScheduleToDefaults = () => {
  if (confirm('Reset all category wave times back to official Wisconsin League 2026 default schedule?')) {
    form.value.waveSchedule = JSON.parse(JSON.stringify(defaultWaveSchedule))
    form.value.hasCustomWaveSchedule = false
    emit('toast', 'Wave schedule reset to official defaults!')
  }
}

function initWarmupGroups() {
  if (!form.value) return
  if (!form.value.warmupGroups || form.value.warmupGroups.length === 0) {
    if (form.value.coachSignups?.warmups && form.value.coachSignups.warmups.length > 0) {
      const assigned = new Set<string>()
      form.value.warmupGroups = form.value.coachSignups.warmups.map(w => {
        let cats = w.categories ? [...w.categories] : []
        if (cats.length === 0) {
          cats = ALL_CATEGORIES.filter(c => 
            !assigned.has(c.toLowerCase()) && 
            w.name && (
              w.name.toLowerCase().includes(c.toLowerCase()) || 
              (w.name.toLowerCase().includes('varsity') && w.name.toLowerCase().includes('jv3') && (c.includes('Varsity') || c.includes('JV III')))
            )
          )
        }
        cats.forEach((c: string) => assigned.add(c.toLowerCase()))
        const autoMeeting = calculateDefaultGroupWarmupTime(form.value, cats)
        return {
          id: w.id || `wu-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: w.name || formatWarmupGroupTitle(cats),
          meetingTime: w.meetingTime || autoMeeting || '8:00 AM',
          stagingTime: w.stagingTime || '',
          startTime: w.startTime || '',
          day: w.day || 'Sunday',
          date: w.date || '',
          subtitle: w.subtitle || '',
          categories: cats,
          ridersAllowed: w.ridersAllowed || '',
          duration: w.duration || '60 min',
          tag: w.tag || '',
          tagClass: w.tagClass || '',
          leaders: w.leaders || [],
          support: w.support || []
        }
      })
    } else {
      form.value.warmupGroups = []
    }
  }

  // Ensure any groups without meetingTime get populated from auto-time
  if (form.value.warmupGroups) {
    form.value.warmupGroups.forEach(grp => {
      if (!grp.meetingTime) {
        const auto = calculateDefaultGroupWarmupTime(form.value, grp.categories || [])
        if (auto) grp.meetingTime = auto
      }
    })
  }
}

const getAutoWarmupTime = (grp: WarmupGroup) => {
  return calculateDefaultGroupWarmupTime(form.value, grp.categories || [])
}

const applyAutoWarmupTime = (grp: WarmupGroup) => {
  const autoTime = getAutoWarmupTime(grp)
  if (autoTime) {
    grp.meetingTime = autoTime
  }
}

const getWarmupTimeOptions = (grp: WarmupGroup) => {
  const options = new Set<string>(TIME_OPTIONS)
  const autoTime = getAutoWarmupTime(grp)
  if (autoTime) options.add(autoTime)
  if (grp.meetingTime) options.add(grp.meetingTime)

  return Array.from(options).sort((a, b) => {
    const minA = parseTimeStrToMinutes(a) ?? 0
    const minB = parseTimeStrToMinutes(b) ?? 0
    return minA - minB
  })
}

const getCategoryAssignedGroup = (catName: string) => {
  if (!form.value.warmupGroups) return null
  return form.value.warmupGroups.find(g => 
    g.categories && g.categories.some(c => c.toLowerCase() === catName.toLowerCase())
  ) || null
}

const isCategoryInWarmupGroup = (grp: WarmupGroup, catName: string) => {
  if (!grp.categories) return false
  return grp.categories.some(c => c.toLowerCase() === catName.toLowerCase())
}

const isCategoryInOtherWarmupGroup = (currentGrp: WarmupGroup, catName: string) => {
  const assigned = getCategoryAssignedGroup(catName)
  return assigned !== null && assigned.id !== currentGrp.id
}

const toggleCategoryInWarmupGroup = (grp: WarmupGroup, catName: string) => {
  if (!grp.categories) grp.categories = []
  const idx = grp.categories.findIndex(c => c.toLowerCase() === catName.toLowerCase())
  if (idx >= 0) {
    grp.categories.splice(idx, 1)
  } else {
    // If locked to another group, do NOT allow clicking to move it
    const otherGrp = getCategoryAssignedGroup(catName)
    if (otherGrp && otherGrp.id !== grp.id) {
      return
    }
    grp.categories.push(catName)
  }

  // Dynamically update group title to reflect assigned categories
  grp.name = formatWarmupGroupTitle(grp.categories)

  // Dynamically update warmup meeting time
  const autoTime = getAutoWarmupTime(grp)
  if (autoTime) {
    grp.meetingTime = autoTime
  }
}

const getCategoryPillStyle = (grp: WarmupGroup, catName: string) => {
  if (isCategoryInWarmupGroup(grp, catName)) {
    return 'background:#dc2626;color:#ffffff;font-weight:700;cursor:pointer;border:1px solid #b91c1c;'
  }
  if (isCategoryInOtherWarmupGroup(grp, catName)) {
    return 'background:var(--bg-card);color:var(--text-muted);border:1px dashed var(--border);opacity:0.4;cursor:not-allowed;'
  }
  return 'background:var(--bg-card);color:var(--text-main);border:1px solid var(--border);cursor:pointer;'
}

const getCategoryPillTitle = (grp: WarmupGroup, catName: string) => {
  if (isCategoryInWarmupGroup(grp, catName)) return `Click to remove ${catName} from this group`
  const other = getCategoryAssignedGroup(catName)
  if (other) return `🔒 ${catName} is locked to "${other.name}". Unclick it in "${other.name}" first to move it.`
  return `Click to assign ${catName} to this group`
}

const autoConfigureAllGroups = () => {
  initWarmupGroups()
  const assigned = new Set<string>()
  for (const g of (form.value.warmupGroups || [])) {
    if (g.categories) {
      g.categories.forEach(c => assigned.add(c.toLowerCase()))
    }
  }
  for (const g of (form.value.warmupGroups || [])) {
    applyAutoWarmupTime(g)
  }
  emit('toast', '⚡ Calculated auto-times based on wave schedules!')
}

const addWarmupGroup = () => {
  initWarmupGroups()
  const newId = `wu-${Date.now()}`
  const assigned = new Set<string>()
  form.value.warmupGroups?.forEach(g => (g.categories || []).forEach(c => assigned.add(c.toLowerCase())))
  const unassigned = ALL_CATEGORIES.filter(c => !assigned.has(c.toLowerCase()))
  const defaultCats = unassigned.length > 0 ? [unassigned[0]] : []
  const autoMeeting = defaultCats.length > 0 
    ? (calculateDefaultGroupWarmupTime(form.value, defaultCats) || '7:00 AM')
    : '7:00 AM'

  form.value.warmupGroups!.push({
    id: newId,
    name: defaultCats.length > 0 ? defaultCats.join(', ') : 'New Warm-up Group',
    meetingTime: autoMeeting,
    stagingTime: '',
    startTime: '',
    day: 'Sunday',
    date: 'Sept 6',
    subtitle: 'North Conference • Race Day',
    categories: [...defaultCats],
    ridersAllowed: '',
    duration: '60 min',
    tag: '',
    tagClass: '',
    leaders: [],
    support: []
  })
}

const removeWarmupGroup = (idx: number) => {
  form.value.warmupGroups?.splice(idx, 1)
}

// Drag reordering for Warmup Groups
const draggedWarmupIdx = ref<number | null>(null)
const warmupDragOverIdx = ref<number | null>(null)
const onWarmupDragStart = (idx: number, e: DragEvent) => {
  draggedWarmupIdx.value = idx
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
const onWarmupDragOver = (idx: number, e: DragEvent) => {
  e.preventDefault()
  if (draggedWarmupIdx.value === null || draggedWarmupIdx.value === idx) return
  warmupDragOverIdx.value = idx
}
const onWarmupDrop = (idx: number, e: DragEvent) => {
  e.preventDefault()
  const from = draggedWarmupIdx.value
  const to = idx
  if (draggedWarmupIdx.value === null || !form.value.warmupGroups) return
  if (from !== null && to !== null) {
    if (from !== to && form.value.warmupGroups[from] !== undefined) {
      const item = form.value.warmupGroups.splice(from, 1)[0]
      form.value.warmupGroups.splice(to, 0, item)
    }
  }
  draggedWarmupIdx.value = null
  warmupDragOverIdx.value = null
}
const onWarmupDragEnd = () => {
  draggedWarmupIdx.value = null
  warmupDragOverIdx.value = null
}

// Coach Sign-Ups & Pre-Rides Admin State & Methods
const activeCoachAdminTab = ref<'wu' | 'pr' | 'waves'>('wu')
const DAY_OPTIONS = ['Friday', 'Saturday', 'Sunday', 'Monday']

const initCoachSignups = () => {
  if (!form.value.coachSignups) {
    form.value.coachSignups = {
      policy: 'Ride Leader must hold NICA Level 2+ and is responsible for participants. Multiple coaches can sign up for each spot.',
      preRides: [],
      warmups: []
    }
  }
  if (!form.value.coachSignups.preRides) form.value.coachSignups.preRides = []
  if (!form.value.coachSignups.warmups) form.value.coachSignups.warmups = []
}

const addCoachSlot = (type: 'pr' | 'wu') => {
  initCoachSignups()
  const list = type === 'pr' ? form.value.coachSignups!.preRides! : form.value.coachSignups!.warmups!
  const newId = `${type}-${Date.now()}`
  if (type === 'pr') {
    const waveNum = list.length + 1
    list.push({
      id: newId,
      name: `Pre-Ride - Wave ${waveNum}`,
      meetingTime: '2:00 PM - 3:00 PM',
      ridersAllowed: 'Registered Riders & Coaches',
      day: 'Saturday',
      subtitle: 'South Conference',
      tag: 'Pre-Ride',
      tagClass: 'tag-preride',
      leaders: [],
      support: []
    })
  } else {
    list.push({
      id: newId,
      name: 'New Warm-up Session',
      meetingTime: '8:45 AM',
      stagingTime: '9:45 AM',
      startTime: '',
      ridersAllowed: 'Wave Participants',
      day: 'Sunday',
      subtitle: 'North Conference • Race Day',
      tag: 'Warm-up',
      tagClass: 'tag-special',
      leaders: [],
      support: []
    })
  }
}

const removeCoachSlot = (type: 'pr' | 'wu', idx: number) => {
  if (type === 'pr') {
    form.value.coachSignups?.preRides?.splice(idx, 1)
  } else {
    form.value.coachSignups?.warmups?.splice(idx, 1)
  }
}

// Drag & drop for coach slots
const draggedCoachSlotIdx = ref<number | null>(null)
const coachSlotDragOverIdx = ref<number | null>(null)

const onCoachSlotDragStart = (idx: number, e: DragEvent) => {
  draggedCoachSlotIdx.value = idx
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }
}

const onCoachSlotDragOver = (idx: number, e: DragEvent) => {
  e.preventDefault()
  if (draggedCoachSlotIdx.value !== null && draggedCoachSlotIdx.value !== idx) {
    coachSlotDragOverIdx.value = idx
  }
}

const onCoachSlotDrop = (targetIdx: number, type: 'pr' | 'wu', e: DragEvent) => {
  e.preventDefault()
  if (draggedCoachSlotIdx.value === null) return
  const list = type === 'pr' ? form.value.coachSignups?.preRides : form.value.coachSignups?.warmups
  if (!list) return
  const from = draggedCoachSlotIdx.value
  const to = targetIdx
  if (from !== to && list[from] !== undefined) {
    const item = list.splice(from, 1)[0]
    list.splice(to, 0, item)
  }
  draggedCoachSlotIdx.value = null
  coachSlotDragOverIdx.value = null
}

const onCoachSlotDragEnd = () => {
  draggedCoachSlotIdx.value = null
  coachSlotDragOverIdx.value = null
}

const TIME_OPTIONS = [
  '7:00 AM', '7:15 AM', '7:30 AM', '7:45 AM',
  '8:00 AM', '8:15 AM', '8:20 AM', '8:30 AM', '8:45 AM',
  '9:00 AM', '9:15 AM', '9:30 AM', '9:45 AM',
  '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM',
  '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM',
  '12:00 PM', '12:15 PM', '12:30 PM', '12:45 PM',
  '1:00 PM', '1:15 PM', '1:30 PM', '1:45 PM',
  '2:00 PM', '2:15 PM', '2:30 PM', '2:45 PM',
  '3:00 PM', '3:15 PM', '3:30 PM', '3:45 PM',
  '4:00 PM', '4:15 PM', '4:30 PM', '4:45 PM',
  '5:00 PM', '5:15 PM', '5:30 PM', '5:45 PM',
  '6:00 PM', '6:15 PM', '6:30 PM', '6:45 PM',
  '7:00 PM'
]

const getSlotStart = (timeStr?: string) => {
  const str = String(timeStr || '').trim()
  if (!str || str.toUpperCase() === 'TBD') return ''
  const parts = str.split(/\s*[-–—]\s*|\s+to\s+/i)
  return parts[0]?.trim() || ''
}

const getSlotEnd = (timeStr?: string) => {
  const str = String(timeStr || '').trim()
  if (!str || str.toUpperCase() === 'TBD') return ''
  const parts = str.split(/\s*[-–—]\s*|\s+to\s+/i)
  return parts.length >= 2 ? parts[1]?.trim() || '' : ''
}

const onSlotStartChange = (slot: CoachSlot, newStart: string) => {
  const end = getSlotEnd(slot.meetingTime)
  if (newStart && end) {
    slot.meetingTime = `${newStart} - ${end}`
  } else {
    slot.meetingTime = newStart || end || '8:00 AM'
  }
}

const onSlotEndChange = (slot: CoachSlot, newEnd: string) => {
  const start = getSlotStart(slot.meetingTime) || '8:00 AM'
  if (newEnd) {
    slot.meetingTime = `${start} - ${newEnd}`
  } else {
    slot.meetingTime = start
  }
}


// Photos tab helper
const newPhotoUrl = ref('')
const addPhoto = () => {
  if (!newPhotoUrl.value.trim()) return
  if (!form.value.photos) form.value.photos = []
  form.value.photos.push({ url: newPhotoUrl.value.trim() })
  newPhotoUrl.value = ''
}
const removePhoto = (idx: number) => {
  form.value.photos?.splice(idx, 1)
}

// --- Site-Wide Urgent Announcements Manager ---
import { useSiteAnnouncement, type SiteAnnouncement } from '~/modules/core/composables/useSiteAnnouncement'
import { useSiteMedia, defaultSiteMedia, type SiteMediaConfig } from '~/modules/core/composables/useSiteMedia'
import { useSiteLeadership, type LeaderMember } from '~/modules/core/composables/useSiteLeadership'
import { useSiteSponsors, type Sponsor } from '~/modules/core/composables/useSiteSponsors'
import { compressImage } from '~/modules/core/utils/imageCompressor'
import { uploadMediaFile } from '~/modules/core/utils/mediaUploader'
import ImageCropperModal, { type AspectPreset } from '~/modules/core/components/ImageCropperModal.vue'

const isCropperModalOpen = ref(false)
const cropperModalSrc = ref('')
const cropperModalAspect = ref<AspectPreset>('16:9')
const cropperModalTitle = ref('Crop & Reposition Image')
let onCropperApplyCallback: ((result: string) => void) | null = null

const openAdminCropper = (
  src: string,
  aspect: AspectPreset = '16:9',
  title = 'Crop & Reposition Image',
  onApply: (res: string) => void
) => {
  if (!src) return
  cropperModalSrc.value = src
  cropperModalAspect.value = aspect
  cropperModalTitle.value = title
  onCropperApplyCallback = onApply
  isCropperModalOpen.value = true
}

const handleAdminCropperResult = (croppedUrl: string) => {
  if (onCropperApplyCallback) {
    onCropperApplyCallback(croppedUrl)
    onCropperApplyCallback = null
  }
}

const { announcement, saveAnnouncement, formatExpiresAt } = useSiteAnnouncement()

const toLocalDatetimeInput = (iso: string) => {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const offset = d.getTimezoneOffset() * 60000
    const local = new Date(d.getTime() - offset)
    return local.toISOString().slice(0, 16)
  } catch {
    return ''
  }
}

const getDefaultPracticeEndTime = () => {
  const d = new Date()
  d.setHours(19, 30, 0, 0)
  if (d.getTime() < Date.now()) {
    d.setTime(Date.now() + 2 * 60 * 60 * 1000)
  }
  const offset = d.getTimezoneOffset() * 60000
  const local = new Date(d.getTime() - offset)
  return local.toISOString().slice(0, 16)
}

const alertForm = ref({
  title: 'PRACTICE UPDATE',
  message: '',
  type: 'danger' as 'danger' | 'warning' | 'info',
  location: '',
  hasExpiration: true,
  expiresAt: getDefaultPracticeEndTime(),
  active: false
})

const setExpirationPreset = (preset: 'practice730' | 'practice800' | '2h' | '4h' | 'endOfDay' | 'none') => {
  alertForm.value.hasExpiration = preset !== 'none'
  const d = new Date()

  if (preset === 'practice730') {
    d.setHours(19, 30, 0, 0)
    if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1)
  } else if (preset === 'practice800') {
    d.setHours(20, 0, 0, 0)
    if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1)
  } else if (preset === '2h') {
    d.setTime(Date.now() + 2 * 3600 * 1000)
  } else if (preset === '4h') {
    d.setTime(Date.now() + 4 * 3600 * 1000)
  } else if (preset === 'endOfDay') {
    d.setHours(23, 59, 0, 0)
  }

  const offset = d.getTimezoneOffset() * 60000
  const local = new Date(d.getTime() - offset)
  alertForm.value.expiresAt = local.toISOString().slice(0, 16)
}

const alertExpirationStatusText = computed(() => {
  if (!alertForm.value.hasExpiration || !alertForm.value.expiresAt) {
    return 'No auto-expiration set (will stay active until manually cleared).'
  }
  const expDate = new Date(alertForm.value.expiresAt)
  if (isNaN(expDate.getTime())) return ''
  const diffMs = expDate.getTime() - Date.now()
  if (diffMs <= 0) {
    return `⚠️ Time passed (${formatExpiresAt(alertForm.value.expiresAt)}). The banner is automatically hidden.`
  }
  const diffMins = Math.round(diffMs / (60 * 1000))
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`
  return `⏳ Auto-expires at ${formatExpiresAt(alertForm.value.expiresAt)} (in ${durationStr}) — no need to manually turn off!`
})

watch(announcement, (newAnn) => {
  if (newAnn) {
    alertForm.value = {
      title: newAnn.title || 'PRACTICE UPDATE',
      message: newAnn.message || '',
      type: newAnn.type || 'danger',
      location: newAnn.location || '',
      hasExpiration: Boolean(newAnn.expiresAt),
      expiresAt: newAnn.expiresAt ? toLocalDatetimeInput(newAnn.expiresAt) : getDefaultPracticeEndTime(),
      active: Boolean(newAnn.active)
    }
  }
}, { immediate: true, deep: true })

const isSavingAlert = ref(false)

const applyAlertPreset = (preset: { title: string; message: string; type: 'danger' | 'warning' | 'info'; location?: string }) => {
  alertForm.value.title = preset.title
  alertForm.value.message = preset.message
  alertForm.value.type = preset.type
  alertForm.value.location = preset.location || ''
  alertForm.value.hasExpiration = true
  alertForm.value.expiresAt = getDefaultPracticeEndTime()
  alertForm.value.active = true
}

const handlePublishAlert = async () => {
  if (!alertForm.value.message.trim()) {
    emit('toast', '⚠️ Please enter an alert message before publishing.')
    return
  }
  isSavingAlert.value = true
  try {
    const finalExpiresAt = alertForm.value.hasExpiration && alertForm.value.expiresAt
      ? new Date(alertForm.value.expiresAt).toISOString()
      : ''

    await saveAnnouncement({
      title: alertForm.value.title.trim() || 'ANNOUNCEMENT',
      message: alertForm.value.message.trim(),
      type: alertForm.value.type,
      location: alertForm.value.location.trim(),
      expiresAt: finalExpiresAt,
      active: true
    }, user.value?.email || undefined)
    
    if (finalExpiresAt) {
      emit('toast', `🚨 Urgent Alert published! Auto-expires at ${formatExpiresAt(finalExpiresAt)}`)
    } else {
      emit('toast', '🚨 Urgent Announcement published live to all visitors!')
    }
  } catch (e: any) {
    emit('toast', `❌ Error saving announcement: ${e?.message || e}`)
  } finally {
    isSavingAlert.value = false
  }
}

const handleClearAlert = async () => {
  isSavingAlert.value = true
  try {
    await saveAnnouncement({
      active: false
    }, user.value?.email || undefined)
    alertForm.value.active = false
    emit('toast', '✅ Urgent Announcement cleared and hidden.')
  } catch (e: any) {
    emit('toast', `❌ Error clearing announcement: ${e?.message || e}`)
  } finally {
    isSavingAlert.value = false
  }
}

// --- Site Photos & Google Drive Album Manager ---
const { media, updateAllMedia } = useSiteMedia()

const siteMediaForm = ref<SiteMediaConfig>({
  ...defaultSiteMedia,
  ...media.value
})

watch(media, (newMed) => {
  if (newMed) {
    siteMediaForm.value = { ...defaultSiteMedia, ...newMed }
  }
}, { immediate: true, deep: true })

const isSavingMedia = ref(false)

const handleSaveSiteMedia = async () => {
  isSavingMedia.value = true
  try {
    await updateAllMedia(siteMediaForm.value)
    emit('toast', '🖼️ Site photos and Google Drive album link updated!')
  } catch (e: any) {
    emit('toast', `❌ Error saving photos: ${e?.message || e}`)
  } finally {
    isSavingMedia.value = false
  }
}

const handleResetPhotoDefault = (key: keyof SiteMediaConfig) => {
  siteMediaForm.value[key] = defaultSiteMedia[key]
}

const handlePhotoUpload = async (key: keyof SiteMediaConfig, event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const url = await uploadMediaFile(file, 'site-media', key)
    siteMediaForm.value[key] = url
    openAdminCropper(
      url,
      key === 'teamPhoto' ? '4:3' : '16:9',
      `Crop & Reposition: ${key}`,
      (cropped) => {
        siteMediaForm.value[key] = cropped
        emit('toast', '✂️ Photo cropped and updated! Click "Save All Photos & Links" to publish.')
      }
    )
    emit('toast', `📷 Photo loaded! Adjust framing and position in the cropper.`)
  } catch (err: any) {
    emit('toast', `⚠️ ${err?.message || 'Failed to process photo.'}`)
  } finally {
    target.value = ''
  }
}

// --- Leadership Team Admin Manager ---
const { leaders: leadershipList, saveLeaders } = useSiteLeadership()
const adminLeadersForm = ref<LeaderMember[]>([])

watch(leadershipList, (newVal) => {
  if (newVal) {
    adminLeadersForm.value = JSON.parse(JSON.stringify(newVal))
  }
}, { immediate: true, deep: true })

const isSavingLeaders = ref(false)
const handleSaveAdminLeaders = async () => {
  isSavingLeaders.value = true
  try {
    await saveLeaders(adminLeadersForm.value)
    emit('toast', '👥 Leadership team updated successfully!')
  } catch (e: any) {
    emit('toast', `❌ Error saving leadership: ${e?.message || e}`)
  } finally {
    isSavingLeaders.value = false
  }
}

const handleAddAdminLeader = () => {
  adminLeadersForm.value.push({
    id: `leader_${Date.now()}`,
    name: '',
    role: '',
    image: '',
    desc: ''
  })
}

const handleRemoveAdminLeader = (idx: number) => {
  adminLeadersForm.value.splice(idx, 1)
}

const handleLeaderPhotoUpload = async (leader: LeaderMember, event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const url = await uploadMediaFile(file, 'leadership', leader.id)
    leader.image = url
    openAdminCropper(
      url,
      '1:1',
      `Crop Portrait: ${leader.name || 'Team Leader'}`,
      (cropped) => {
        leader.image = cropped
        emit('toast', '✂️ Portrait cropped and updated! Click "Save Leadership Team".')
      }
    )
    emit('toast', '📷 Photo loaded! Adjust framing and position in the cropper.')
  } catch (err: any) {
    emit('toast', `⚠️ ${err?.message || 'Failed to process photo.'}`)
  } finally {
    target.value = ''
  }
}

// --- Sponsors Admin Manager ---
const { sponsors: sponsorsList, saveSponsors } = useSiteSponsors()
const adminSponsorsForm = ref<Sponsor[]>([])

watch(sponsorsList, (newVal) => {
  if (newVal) {
    adminSponsorsForm.value = JSON.parse(JSON.stringify(newVal))
  }
}, { immediate: true, deep: true })

const isSavingSponsors = ref(false)
const handleSaveAdminSponsors = async () => {
  isSavingSponsors.value = true
  try {
    await saveAdminSponsors()
  } catch (e: any) {
    emit('toast', `❌ Error saving sponsors: ${e?.message || e}`)
  } finally {
    isSavingSponsors.value = false
  }
}

const saveAdminSponsors = async () => {
  await saveSponsors(adminSponsorsForm.value)
  emit('toast', '🌟 Sponsors updated successfully!')
}

const handleAddAdminSponsor = () => {
  adminSponsorsForm.value.push({
    id: `sponsor_${Date.now()}`,
    name: '',
    logoUrl: '',
    websiteUrl: ''
  })
}

const handleRemoveAdminSponsor = (idx: number) => {
  adminSponsorsForm.value.splice(idx, 1)
}

const handleSponsorLogoUpload = async (sponsor: Sponsor, event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const url = await uploadMediaFile(file, 'sponsors', sponsor.id)
    sponsor.logoUrl = url
    openAdminCropper(
      url,
      'free',
      `Crop Logo: ${sponsor.name || 'Sponsor'}`,
      (cropped) => {
        sponsor.logoUrl = cropped
        emit('toast', '✂️ Sponsor logo cropped! Click "Save Sponsors".')
      }
    )
    emit('toast', '🌟 Sponsor logo loaded! Adjust framing and position in the cropper.')
  } catch (err: any) {
    emit('toast', `⚠️ ${err?.message || 'Failed to process logo.'}`)
  } finally {
    target.value = ''
  }
}
</script>

<template>
  <div class="admin-page-container">

    <!-- ACCESS GATE: NOT SIGNED IN OR NOT AUTHORIZED -->
    <div v-if="screen === 'signin'" class="admin-gate-screen">
      <div class="admin-gate-card">
        <div style="font-size:48px;margin-bottom:12px;">🔒</div>
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:var(--text-main);">Coach Admin Portal</h2>
        <p style="margin:0 0 20px;font-size:13.5px;color:var(--text-muted);line-height:1.5;">
          Access is restricted to authorized team administrators and coaches.<br>
          Please sign in with your verified Google account.
        </p>

        <div v-if="authError" style="margin-bottom:14px;padding:8px 12px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#ef4444;font-size:12px;">
          {{ authError }}
        </div>

        <button
          type="button"
          class="done-modal-btn admin-save-btn"
          style="width:100%;justify-content:center;padding:12px;font-size:14px;"
          :disabled="authLoading"
          @click="handleSignIn"
        >
          <span style="font-size:18px;">🔑</span>
          <span>{{ authLoading ? 'Signing in...' : 'Sign in with Google' }}</span>
        </button>

        <div style="margin-top:16px;">
          <button
            type="button"
            class="admin-back-text-btn"
            @click="emit('back')"
          >
            ← Return to Race Central
          </button>
        </div>
      </div>
    </div>

    <!-- ACCESS GATE: SIGNED IN BUT LOCKED -->
    <div v-else-if="screen === 'locked'" class="admin-gate-screen">
      <div class="admin-gate-card">
        <div style="font-size:48px;margin-bottom:12px;">👋</div>
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:var(--text-main);">
          Welcome back, {{ user?.displayName?.split(' ')[0] || 'Coach' }}!
        </h2>
        <p style="margin:0 0 20px;font-size:13.5px;color:var(--text-muted);line-height:1.5;">
          You're signed in as <strong>{{ user?.email }}</strong>, but admin editing is currently locked.<br>
          Unlock to enable live configuration and schedule controls.
        </p>

        <button
          type="button"
          class="done-modal-btn admin-save-btn"
          style="width:100%;justify-content:center;padding:12px;font-size:14px;margin-bottom:10px;"
          @click="handleUnlockAdmin"
        >
          <span>🔓 Unlock Admin Editing</span>
        </button>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
          <button type="button" class="admin-back-text-btn" @click="emit('back')">
            ← Return to Race Central
          </button>
          <button type="button" class="admin-back-text-btn" style="color:#ef4444;" @click="handleSignOut">
            Sign Out
          </button>
        </div>
      </div>
    </div>

    <!-- FULL ADMIN DASHBOARD -->
    <div v-else class="admin-dashboard-layout">
      
      <!-- Combined Sticky Header (Nav + Tabs) -->
      <div class="admin-sticky-header" ref="adminStickyHeaderRef">
        <!-- Top Sticky Navigation Bar -->
        <header class="admin-top-nav">
          <div class="admin-nav-inner">
            <!-- Left: Back Button & Admin Title -->
            <div class="admin-nav-left">
              <button
                type="button"
                class="admin-back-btn"
                title="Return to public race dashboard"
                @click="emit('back')"
              >
                <span>←</span>
                <span class="back-text">Back to Site</span>
              </button>

              <div class="admin-brand-separator">|</div>

              <div class="admin-brand-box">
                <span class="admin-brand-icon">⚙️</span>
                <div class="admin-brand-text">
                  <span class="admin-brand-title">COACH ADMIN</span>
                  <span class="admin-brand-sub">{{ user?.email }}</span>
                </div>
              </div>
            </div>

            <!-- Center Scope Switcher (Race Admin vs Site Admin) -->
            <div class="admin-nav-center">
              <div class="admin-scope-switcher" role="tablist" aria-label="Admin Scope Switcher">
                <button
                  type="button"
                  class="scope-pill-btn"
                  :class="{ active: currentScope === 'race' }"
                  role="tab"
                  :aria-selected="currentScope === 'race'"
                  @click="selectScope('race')"
                >
                  <span class="scope-icon">🏁</span>
                  <span>Race Admin</span>
                </button>
                <button
                  type="button"
                  class="scope-pill-btn"
                  :class="{ active: currentScope === 'site' }"
                  role="tab"
                  :aria-selected="currentScope === 'site'"
                  @click="selectScope('site')"
                >
                  <span class="scope-icon">🌐</span>
                  <span>Site Admin</span>
                </button>
              </div>
            </div>

            <!-- Top Actions (Race Picker in Race mode, Lock + Save) -->
            <div class="admin-nav-right">
              <!-- Active Race Switcher (Shown ONLY in Race Admin) -->
              <div v-if="currentScope === 'race'" class="admin-race-picker">
                <label class="admin-race-label">Event:</label>
                <select
                  :value="currentRaceIndex"
                  class="admin-race-select"
                  @change="selectRace(Number(($event.target as HTMLSelectElement).value))"
                >
                  <option v-for="(r, idx) in races" :key="r.id" :value="idx">{{ r.name }}</option>
                </select>
              </div>
              <div v-else class="admin-site-badge">
                <span>🌐 Global Settings</span>
              </div>

              <!-- Lock Admin -->
              <button
                type="button"
                class="admin-lock-btn"
                title="Lock editing and return to viewer mode"
                @click="handleLockAdmin"
              >
                <span>🔒</span>
                <span class="action-btn-text">Lock</span>
              </button>

              <!-- Save Changes Button (Context-Sensitive) -->
              <button
                v-if="currentScope === 'race'"
                type="button"
                class="done-modal-btn admin-save-btn"
                style="padding:7px 16px;font-size:13px;display:inline-flex;align-items:center;gap:6px;"
                @click="handleSave"
              >
                <span>💾</span>
                <span>Save Race</span>
              </button>
              <button
                v-else-if="siteSaveButtonText"
                type="button"
                class="done-modal-btn admin-save-btn"
                style="padding:7px 16px;font-size:13px;display:inline-flex;align-items:center;gap:6px;"
                @click="handleSiteHeaderSave"
              >
                <span>💾</span>
                <span>{{ siteSaveButtonText }}</span>
              </button>
            </div>
          </div>
        </header>

        <!-- Subnav Tabs Strip -->
        <nav class="admin-subnav-tabs">
          <!-- RACE ADMIN TABS -->
          <div v-if="currentScope === 'race'" class="admin-tabs-scroller">
            <button type="button" class="admin-tab-btn" :class="{ active: activeRaceTab === 'venue' }" @click="selectRaceTab('venue')">
              📍 Venue & Info
            </button>
            <button type="button" class="admin-tab-btn" :class="{ active: activeRaceTab === 'schedule' }" @click="selectRaceTab('schedule')">
              ⏱️ Weekend Schedule
            </button>
            <button type="button" class="admin-tab-btn" :class="{ active: activeRaceTab === 'waves' }" @click="selectRaceTab('waves')">
              🚵 Waves & Warm-ups
            </button>
            <button type="button" class="admin-tab-btn" :class="{ active: activeRaceTab === 'signups' }" @click="selectRaceTab('signups')">
              🤝 Volunteers, Food & Camping
            </button>
            <button type="button" class="admin-tab-btn" :class="{ active: activeRaceTab === 'maps' }" @click="selectRaceTab('maps')">
              🗺️ Course Maps
            </button>
            <button type="button" class="admin-tab-btn" :class="{ active: activeRaceTab === 'announcements' }" @click="selectRaceTab('announcements')">
              📢 Guidelines
            </button>
          </div>

          <!-- SITE ADMIN TABS -->
          <div v-else class="admin-tabs-scroller">
            <button type="button" class="admin-tab-btn" :class="{ active: activeSiteTab === 'site-alert' }" @click="selectSiteTab('site-alert')">
              🚨 Urgent Site Alert
            </button>
            <button type="button" class="admin-tab-btn" :class="{ active: activeSiteTab === 'site-media' }" @click="selectSiteTab('site-media')">
              🖼️ Photos & Banners
            </button>
            <button type="button" class="admin-tab-btn" :class="{ active: activeSiteTab === 'site-leaders' }" @click="selectSiteTab('site-leaders')">
              👥 Leadership Team ({{ adminLeadersForm.length }})
            </button>
            <button type="button" class="admin-tab-btn" :class="{ active: activeSiteTab === 'site-sponsors' }" @click="selectSiteTab('site-sponsors')">
              🌟 Sponsors & Partners ({{ adminSponsorsForm.length }})
            </button>
            <button type="button" class="admin-tab-btn" :class="{ active: activeSiteTab === 'coaches' }" @click="selectSiteTab('coaches')">
              🛡️ Team Admins & Users ({{ allUsersList.length }})
            </button>
          </div>
        </nav>
      </div>

      <!-- Main Body Container -->
      <main class="admin-page-body">
        <div class="admin-body-container">

          <!-- Clean Context Breadcrumb Banner -->
          <div class="admin-context-bar">
            <div class="admin-context-left">
              <span class="context-scope-tag" :class="currentScope">
                {{ currentScope === 'race' ? '🏁 RACE ADMIN' : '🌐 SITE ADMIN' }}
              </span>
              <span class="context-separator">/</span>
              <span class="context-target-name">
                {{ currentScope === 'race' ? currentRace.name : 'LA CROSSE AREA MTB TEAM // GLOBAL WEBSITE SETTINGS' }}
              </span>
            </div>
            <div class="admin-context-right">
              <span v-if="currentScope === 'race'" class="context-pill race">
                📅 {{ currentRace.dateStr || 'No dates set' }}
              </span>
              <span v-else class="context-pill site">
                Settings apply sitewide across all pages
              </span>
            </div>
          </div>

          <!-- 1. Venue Info Tab -->
          <div v-if="activeTab === 'venue'" class="admin-section-card">
            <h3 class="admin-card-title">📍 Event Venue & Basic Setup</h3>
            <div style="display:flex;flex-direction:column;gap:14px;">
              <div>
                <label class="modal-label">Event Name</label>
                <input v-model="form.name" type="text" class="custom-minutes-input" style="width:100%;">
              </div>
              <div>
                <label class="modal-label">Camping Theme</label>
                <input v-model="form.theme" type="text" placeholder="Camping Theme" class="custom-minutes-input" style="width:100%;">
              </div>
              <!-- Event Date Range Picker -->
              <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:8px;padding:12px;">
                <label class="modal-label" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                  <span>📅 Event Date Range</span>
                  <span v-if="form.dateStr" style="color:var(--accent-red);font-weight:700;font-size:12px;">{{ form.dateStr }}</span>
                </label>
                <div class="date-range-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;">
                  <div style="display:flex;flex-direction:column;gap:4px;">
                    <span style="font-size:11px;font-weight:700;color:var(--text-muted);">Start Date:</span>
                    <CustomDatePicker
                      mode="single"
                      v-model="dateRangeStart"
                      :full-width="true"
                      :default-year="eventYear"
                      placeholder="Select Start Date"
                      @change="onDateRangeChange"
                    />
                  </div>
                  <div style="display:flex;flex-direction:column;gap:4px;">
                    <span style="font-size:11px;font-weight:700;color:var(--text-muted);">End Date:</span>
                    <CustomDatePicker
                      mode="single"
                      v-model="dateRangeEnd"
                      :min-date="dateRangeStart"
                      :full-width="true"
                      :default-year="eventYear"
                      placeholder="Select End Date"
                      @change="onDateRangeChange"
                    />
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <input
                    v-model="form.dateStr"
                    type="text"
                    placeholder="e.g. 11 - 13 Sept 2026"
                    class="custom-minutes-input"
                    style="flex:1;min-width:160px;font-size:12px;font-weight:600;"
                    @input="onDateStrManualInput"
                  >
                  <button
                    type="button"
                    class="action-mini-btn"
                    style="font-size:11px;padding:6px 12px;white-space:nowrap;font-weight:700;"
                    title="Populate or sync schedule days from this date range"
                    @click="syncScheduleDaysFromDateRange"
                  >
                    🔄 Sync Schedule Days
                  </button>
                </div>
              </div>

              <div>
                <label class="modal-label">Conference</label>
                <input v-model="form.conference" type="text" class="custom-minutes-input" style="width:100%;">
              </div>
              <div>
                <label class="modal-label">Trailhead / Venue Name</label>
                <input v-model="form.exactTrailhead" type="text" class="custom-minutes-input" style="width:100%;">
              </div>
              <div>
                <label class="modal-label">Physical Address</label>
                <input v-model="form.address" type="text" class="custom-minutes-input" style="width:100%;">
              </div>
              <div>
                <label class="modal-label">Important Venue Warning / Notice (Sanitized)</label>
                <textarea v-model="form.warning" class="custom-minutes-input" rows="2" style="width:100%;resize:vertical;" />
              </div>
              <div>
                <label class="modal-label">Live Timing Event ID (CrossMgr / RaceResult)</label>
                <input v-model="form.eventId" type="number" class="custom-minutes-input" style="width:100%;">
              </div>
            </div>
          </div>

          <!-- 2. Schedule Timeline Tab -->
          <div v-else-if="activeTab === 'schedule'" class="admin-section-card">
            <div style="margin-bottom:12px;">
              <h3 class="admin-card-title" style="margin:0;">⏱️ Weekend Schedule Timeline</h3>
            </div>

            <div v-if="!form.schedule || form.schedule.length === 0" class="no-results" style="padding:16px;">
              No schedule days added yet. Click "+ Add Schedule Day" below.
            </div>

            <div style="display:flex;flex-direction:column;gap:12px;">
              <div
                v-for="(day, dayIdx) in form.schedule"
                :key="dayIdx"
                draggable="true"
                class="drag-row"
                :style="{
                  background: 'var(--bg-card)',
                  border: dayDragOverIdx === dayIdx ? '2px dashed #6366f1' : '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  opacity: draggedDayIdx === dayIdx ? '0.4' : '1',
                  transition: 'all 0.15s ease'
                }"
                @dragstart="onDayDragStart(dayIdx, $event)"
                @dragover="onDayDragOver(dayIdx, $event)"
                @dragleave="dayDragOverIdx = null"
                @drop="onDayDrop(dayIdx, $event)"
                @dragend="onDayDragEnd"
              >
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:8px;gap:8px;flex-wrap:wrap;">
                  <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;flex-wrap:wrap;">
                    <span
                      class="drag-handle"
                      title="Drag day to reorder"
                      style="cursor:grab;color:var(--text-muted);font-size:16px;line-height:1;user-select:none;padding:2px 4px;"
                    >
                      ⠿
                    </span>
                    <span style="font-weight:800;font-size:13px;color:var(--text-main);white-space:nowrap;">Day {{ dayIdx + 1 }}:</span>
                    <CustomDatePicker
                      mode="scheduleDay"
                      :day="day"
                      :default-year="eventYear"
                      placeholder="Select Day & Date"
                      @update:day="(newVal) => Object.assign(day, newVal)"
                    />
                    <input
                      v-model="day.subtitle"
                      type="text"
                      placeholder="Subtitle (e.g. Race Day, Camping Opens)"
                      class="custom-minutes-input"
                      style="flex:1;min-width:140px;max-width:100%;"
                      draggable="false"
                      @dragstart.stop
                    >
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-left:auto;">
                    <label style="display:flex;align-items:center;gap:5px;font-size:11.5px;cursor:pointer;color:var(--text-muted);white-space:nowrap;" draggable="false" @dragstart.stop>
                      <input v-model="day.isRaceDay" type="checkbox">
                      <span>🏁 Race Day</span>
                    </label>
                    <button
                      type="button"
                      class="search-clear-btn"
                      style="position:static;display:inline-flex;color:#ef4444;font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.08);cursor:pointer;"
                      title="Delete this whole day"
                      @click="removeScheduleDay(dayIdx)"
                    >
                      ✕ Delete Day
                    </button>
                  </div>
                </div>

                <!-- Events within Day -->
                <div style="display:flex;flex-direction:column;gap:6px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Events ({{ day.events?.length || 0 }})</span>
                  </div>

                  <div
                    v-for="(ev, evIdx) in day.events"
                    :key="evIdx"
                    draggable="true"
                    class="drag-row"
                    :style="{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 8px',
                      background: eventDragOver?.dayIdx === dayIdx && eventDragOver?.evIdx === evIdx ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-subtle)',
                      borderRadius: '6px',
                      border: eventDragOver?.dayIdx === dayIdx && eventDragOver?.evIdx === evIdx ? '2px dashed #6366f1' : '1px solid var(--border)',
                      opacity: draggedEvent?.dayIdx === dayIdx && draggedEvent?.evIdx === evIdx ? '0.4' : '1',
                      flexWrap: 'wrap',
                      transition: 'all 0.15s ease'
                    }"
                    @dragstart="onEventDragStart(dayIdx, evIdx, $event)"
                    @dragover="onEventDragOver(dayIdx, evIdx, $event)"
                    @dragleave="eventDragOver = null"
                    @drop="onEventDrop(dayIdx, evIdx, $event)"
                    @dragend="onEventDragEnd"
                  >
                    <span
                      class="drag-handle"
                      title="Drag event to reorder"
                      style="cursor:grab;color:var(--text-muted);font-size:16px;line-height:1;user-select:none;padding:2px 2px;"
                    >
                      ⠿
                    </span>

                    <!-- Time Selection: Start / End / TBD -->
                    <div
                      style="display:flex;align-items:center;gap:4px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:3px 6px;"
                      draggable="false"
                      @dragstart.stop
                    >
                      <label style="display:flex;align-items:center;gap:3px;font-size:11px;font-weight:700;cursor:pointer;color:var(--text-muted);user-select:none;">
                        <input
                          type="checkbox"
                          :checked="isEventTbd(ev.time)"
                          @change="toggleTbd(ev, ($event.target as HTMLInputElement).checked)"
                        >
                        <span :style="{ color: isEventTbd(ev.time) ? '#f59e0b' : 'inherit' }">TBD</span>
                      </label>

                      <template v-if="!isEventTbd(ev.time)">
                        <span style="font-size:10.5px;color:var(--text-muted);margin-left:2px;">Start:</span>
                        <CustomTimePicker
                          :model-value="getEventStart(ev.time)"
                          placeholder="Start time"
                          title="Event start time"
                          @update:model-value="onStartChange(ev, $event)"
                        />

                        <span style="font-size:10.5px;color:var(--text-muted);">to</span>
                        <CustomTimePicker
                          :model-value="getEventEnd(ev.time)"
                          placeholder="-- None --"
                          allow-clear
                          title="Event end time (optional)"
                          @update:model-value="onEndChange(ev, $event)"
                        />
                      </template>
                    </div>
                    <input
                      v-model="ev.desc"
                      type="text"
                      placeholder="Event Description (e.g. LAXMTB Team Dinner)"
                      class="custom-minutes-input"
                      style="flex:1;min-width:180px;font-size:11.5px;"
                      draggable="false"
                      @dragstart.stop
                    >
                    <input
                      v-model="ev.tag"
                      type="text"
                      placeholder="Tag (e.g. Pre-Ride, Venue)"
                      class="custom-minutes-input"
                      style="width:105px;font-size:11.5px;"
                      draggable="false"
                      @dragstart.stop
                    >
                    <label
                      style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;color:var(--text-muted);white-space:nowrap;"
                      draggable="false"
                      @dragstart.stop
                    >
                      <input v-model="ev.isSpecial" type="checkbox">
                      <span>⭐ Special</span>
                    </label>
                    <button
                      type="button"
                      class="search-clear-btn"
                      style="position:static;display:inline-flex;color:#ef4444;font-size:11px;padding:2px 6px;border-radius:4px;border:1px solid rgba(239,68,68,0.2);background:rgba(239,68,68,0.06);cursor:pointer;"
                      title="Delete event"
                      @click="removeScheduleEvent(dayIdx, evIdx)"
                    >
                      ✕
                    </button>
                  </div>

                  <!-- Bottom Add Event Button -->
                  <div style="display:flex;justify-content:center;margin-top:2px;">
                    <button
                      type="button"
                      class="action-mini-btn"
                      style="width:100%;padding:8px;font-size:11.5px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;border:1px dashed rgba(239,68,68,0.4);background:rgba(239,68,68,0.06);color:var(--accent-red);border-radius:6px;cursor:pointer;transition:all 0.15s ease;"
                      @click="addScheduleEvent(dayIdx)"
                    >
                      <span style="font-size:13px;">➕</span>
                      <span>Add Event</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Bottom Add Schedule Day Button -->
              <div style="display:flex;justify-content:center;margin-top:4px;">
                <button
                  type="button"
                  class="action-mini-btn"
                  style="width:100%;padding:9px;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;border:1px dashed rgba(239,68,68,0.4);background:rgba(239,68,68,0.06);color:var(--accent-red);border-radius:8px;cursor:pointer;transition:all 0.15s ease;"
                  @click="addScheduleDay"
                >
                  <span style="font-size:14px;">➕</span>
                  <span>Add Schedule Day</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 3. Waves & Warm-ups Tab -->
          <div v-else-if="activeTab === 'waves' || activeTab === 'coach'" class="admin-section-card">
            <!-- Sub-Tabs: Warm-ups, Pre-Rides, Category Wave Schedule -->
            <div class="signup-tabs" style="margin-bottom: 16px; display: flex; gap: 8px; border-bottom: 1px solid var(--border); padding-bottom: 10px; flex-wrap: wrap;">
              <button
                type="button"
                class="signup-tab-pill"
                :class="{ active: activeCoachAdminTab === 'wu' }"
                @click="activeCoachAdminTab = 'wu'"
              >
                <span>🔥</span> Warm-up Groups ({{ (form.warmupGroups || form.coachSignups?.warmups || []).length }})
              </button>
              <button
                type="button"
                class="signup-tab-pill"
                :class="{ active: activeCoachAdminTab === 'pr' }"
                @click="activeCoachAdminTab = 'pr'"
              >
                <span>🚵</span> Pre-Rides ({{ (form.coachSignups?.preRides || []).length }})
              </button>
              <button
                type="button"
                class="signup-tab-pill pill-league"
                :class="{ active: activeCoachAdminTab === 'waves' }"
                @click="activeCoachAdminTab = 'waves'"
              >
                <span>🏁</span> Category Wave Schedule
              </button>
            </div>

            <!-- SUB-PANEL 1: WARM-UP GROUPS -->
            <div v-if="activeCoachAdminTab === 'wu'">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                <div>
                  <h3 class="admin-card-title" style="margin:0;">🔥 Race-Day Warm-up Groups & Waves</h3>
                  <div style="font-size:11.5px;color:var(--text-muted);">Assign categories to unified warm-up groups. Staging and start times are calculated automatically.</div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;">
                  <button type="button" class="action-mini-btn" style="padding:6px 12px;font-size:12px;font-weight:700;" @click="autoConfigureAllGroups">
                    ⚡ Auto-Calculate Times
                  </button>
                </div>
              </div>

              <!-- Global Staging & Warm-up Schedule Lead Times -->
              <div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.22);border-radius:10px;padding:14px 16px;margin-bottom:14px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:16px;">⏱️</span>
                    <strong style="font-size:13px;color:var(--text-main);letter-spacing:0.3px;">SCHEDULE LEAD TIMES</strong>
                    <span style="font-size:10px;color:var(--accent-red);background:rgba(239,68,68,0.12);padding:1px 6px;border-radius:4px;font-weight:700;">Admin Calculation</span>
                  </div>
                  <div style="font-size:11px;color:var(--text-muted);">
                    Staging: <strong style="color:var(--accent-red);">{{ form.stagingOffsetMinutes || 15 }}m</strong> before start • Warm-up: <strong style="color:#f59e0b;">{{ form.warmupOffsetMinutes || 45 }}m</strong> before staging
                  </div>
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(270px, 1fr));gap:16px;">
                  <!-- 1. Staging Schedule (Before Gun Start) -->
                  <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:8px;padding:12px;">
                    <label class="modal-label" style="font-size:11px;font-weight:800;display:flex;align-items:center;gap:6px;margin-bottom:8px;letter-spacing:0.4px;">
                      <span>🚩</span>
                      <span>STAGING SCHEDULE (BEFORE START)</span>
                    </label>
                    <div class="lead-time-buttons" style="display:flex;gap:6px;flex-wrap:wrap;">
                      <button
                        type="button"
                        class="lead-time-btn"
                        :class="{ active: (form.stagingOffsetMinutes || 15) === 15 }"
                        @click="setStagingOffset(15)"
                      >15 mins</button>
                      <button
                        type="button"
                        class="lead-time-btn"
                        :class="{ active: form.stagingOffsetMinutes === 20 }"
                        @click="setStagingOffset(20)"
                      >20 mins</button>
                      <button
                        type="button"
                        class="lead-time-btn"
                        :class="{ active: form.stagingOffsetMinutes === 30 }"
                        @click="setStagingOffset(30)"
                      >30 mins</button>
                      <button
                        type="button"
                        class="lead-time-btn"
                        :class="{ active: ![15, 20, 30].includes(form.stagingOffsetMinutes || 15) }"
                        @click="setStagingOffset('custom')"
                      >Custom</button>
                    </div>
                    <div v-show="![15, 20, 30].includes(form.stagingOffsetMinutes || 15)" style="margin-top:8px;display:flex;align-items:center;gap:8px;">
                      <input
                        v-model.number="form.stagingOffsetMinutes"
                        type="number"
                        min="5"
                        max="60"
                        placeholder="Minutes"
                        class="custom-minutes-input"
                        style="width:75px;text-align:center;font-weight:700;"
                        @change="autoConfigureAllGroups"
                      >
                      <span style="font-size:12px;color:var(--text-muted);">mins before start</span>
                    </div>
                    <div style="margin-top:6px;font-size:11px;color:var(--text-muted);line-height:1.35;">
                      Automatically schedules call-up staging time relative to start (default 15 mins).
                    </div>
                  </div>

                  <!-- 2. Warm-up Schedule (Before Staging) -->
                  <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:8px;padding:12px;">
                    <label class="modal-label" style="font-size:11px;font-weight:800;display:flex;align-items:center;gap:6px;margin-bottom:8px;letter-spacing:0.4px;">
                      <span>🔥</span>
                      <span>WARM-UP SCHEDULE (BEFORE STAGING)</span>
                    </label>
                    <div class="lead-time-buttons" style="display:flex;gap:6px;flex-wrap:wrap;">
                      <button
                        type="button"
                        class="lead-time-btn"
                        :class="{ active: (form.warmupOffsetMinutes || 45) === 60 }"
                        @click="setWarmupOffset(60)"
                      >60 mins</button>
                      <button
                        type="button"
                        class="lead-time-btn"
                        :class="{ active: (form.warmupOffsetMinutes || 45) === 45 }"
                        @click="setWarmupOffset(45)"
                      >45 mins</button>
                      <button
                        type="button"
                        class="lead-time-btn"
                        :class="{ active: (form.warmupOffsetMinutes || 45) === 30 }"
                        @click="setWarmupOffset(30)"
                      >30 mins</button>
                      <button
                        type="button"
                        class="lead-time-btn"
                        :class="{ active: ![60, 45, 30].includes(form.warmupOffsetMinutes || 45) }"
                        @click="setWarmupOffset('custom')"
                      >Custom</button>
                    </div>
                    <div v-show="![60, 45, 30].includes(form.warmupOffsetMinutes || 45)" style="margin-top:8px;display:flex;align-items:center;gap:8px;">
                      <input
                        v-model.number="form.warmupOffsetMinutes"
                        type="number"
                        min="15"
                        max="120"
                        placeholder="Minutes"
                        class="custom-minutes-input"
                        style="width:75px;text-align:center;font-weight:700;"
                        @change="autoConfigureAllGroups"
                      >
                      <span style="font-size:12px;color:var(--text-muted);">mins before staging</span>
                    </div>
                    <div style="margin-top:6px;font-size:11px;color:var(--text-muted);line-height:1.35;">
                      Automatically schedules rider warm-up for every race & category relative to staging time.
                    </div>
                  </div>
                </div>
              </div>

              <div style="display:flex;flex-direction:column;gap:12px;">
                <div
                  v-for="(grp, grpIdx) in form.warmupGroups"
                  :key="grp.id"
                  class="drag-row"
                  style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:10px;"
                  draggable="true"
                  @dragstart="onWarmupDragStart(grpIdx, $event)"
                  @dragover="onWarmupDragOver(grpIdx, $event)"
                  @dragleave="warmupDragOverIdx = null"
                  @drop="onWarmupDrop(grpIdx, $event)"
                  @dragend="onWarmupDragEnd"
                >
                  <!-- Group Top Row -->
                  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:8px;gap:8px;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;flex-wrap:wrap;">
                      <span class="drag-handle" title="Drag to reorder">⠿</span>
                      <input v-model="grp.name" type="text" placeholder="Group Name" class="custom-minutes-input" style="flex:2;min-width:140px;max-width:100%;font-weight:700;" draggable="false" @dragstart.stop>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-left:auto;" draggable="false" @dragstart.stop>
                      <div style="display:flex;align-items:center;gap:4px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);padding:2px 6px;border-radius:6px;flex-wrap:wrap;">
                        <span style="font-size:11px;font-weight:700;color:#f59e0b;">🔥 Warm-up Time:</span>
                        <CustomTimePicker
                          v-model="grp.meetingTime"
                          placeholder="Select time"
                          title="Warm-up meeting time"
                        />
                        <button v-if="getAutoWarmupTime(grp)" type="button" class="action-mini-btn" style="font-size:10px;padding:1px 5px;height:22px;" @click="applyAutoWarmupTime(grp)">
                          ⚡ Auto ({{ getAutoWarmupTime(grp) }})
                        </button>
                      </div>
                      <button type="button" class="search-clear-btn" style="position:static;color:#ef4444;font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.08);" @click="removeWarmupGroup(grpIdx)">
                        ✕ Delete
                      </button>
                    </div>
                  </div>

                  <!-- Assigned Categories Selection -->
                  <div draggable="false" @dragstart.stop>
                    <label class="modal-label" style="font-size:11px;margin-bottom:6px;display:block;">Assigned Categories (Click to add / remove):</label>
                    <div style="display:flex;flex-wrap:wrap;gap:5px;">
                      <span
                        v-for="cat in ALL_CATEGORIES"
                        :key="cat"
                        style="font-size:11px;padding:3px 8px;border-radius:6px;display:inline-flex;align-items:center;gap:4px;user-select:none;transition:all 0.15s ease;"
                        :style="getCategoryPillStyle(grp, cat)"
                        :title="getCategoryPillTitle(grp, cat)"
                        @click="toggleCategoryInWarmupGroup(grp, cat)"
                      >
                        <span>{{ isCategoryInWarmupGroup(grp, cat) ? '✓' : isCategoryInOtherWarmupGroup(grp, cat) ? '🔒' : '+' }}</span>
                        <span>{{ cat }}</span>
                      </span>
                    </div>

                    <!-- Category Staging & Gun Start Breakdown -->
                    <div v-if="grp.categories && grp.categories.length > 0" style="background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:8px 10px;margin-top:8px;">
                      <div style="font-size:10.5px;font-weight:700;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.4px;">
                        Assigned Waves Schedule
                      </div>
                      <div style="display:flex;flex-direction:column;gap:4px;">
                        <div
                          v-for="cName in grp.categories"
                          :key="cName"
                          style="display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:2px 0;border-bottom:1px dashed var(--border);flex-wrap:wrap;gap:4px;"
                        >
                          <span style="font-weight:700;color:var(--text-main);">🚩 {{ cName }}</span>
                          <div style="display:flex;align-items:center;gap:8px;font-size:11px;">
                            <span style="color:#f87171;font-weight:600;">Stage: {{ getCatStage(cName) || 'TBD' }} (-{{ form.stagingOffsetMinutes || 15 }}m)</span>
                            <span style="color:var(--text-muted);">•</span>
                            <span style="color:var(--text-main);font-weight:700;">Start: {{ getCatStart(cName) || 'TBD' }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Bottom Add Warm-Up Group Button -->
                <div style="display:flex;justify-content:center;margin-top:4px;">
                  <button
                    type="button"
                    class="action-mini-btn"
                    style="width:100%;padding:10px;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;border:1px dashed rgba(239,68,68,0.4);background:rgba(239,68,68,0.06);color:var(--accent-red);border-radius:8px;cursor:pointer;transition:all 0.15s ease;"
                    @click="addWarmupGroup"
                  >
                    <span style="font-size:14px;">➕</span>
                    <span>Add Warm-Up Group</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- SUB-PANEL 2: PRE-RIDES -->
            <div v-else-if="activeCoachAdminTab === 'pr'" style="display:flex;flex-direction:column;gap:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div>
                  <h3 class="admin-card-title" style="margin:0;">🚵 Weekend Pre-Ride Waves</h3>
                  <div style="font-size:11.5px;color:var(--text-muted);">Manage weekend pre-ride waves, meeting times, and coach leader/support slots.</div>
                </div>
                <button
                  type="button"
                  class="action-mini-btn"
                  style="padding:6px 12px;font-size:12px;font-weight:700;"
                  @click="addCoachSlot('pr')"
                >
                  ➕ Add Pre-Ride Wave
                </button>
              </div>

              <div
                v-if="!form.coachSignups?.preRides || form.coachSignups.preRides.length === 0"
                class="no-results"
                style="padding:16px;"
              >
                No pre-ride sessions configured yet. Click "+ Add Pre-Ride Wave" above.
              </div>

              <div style="display:flex;flex-direction:column;gap:12px;">
                <div
                  v-for="(slot, slotIdx) in form.coachSignups?.preRides"
                  :key="slot.id || slotIdx"
                  draggable="true"
                  class="drag-row"
                  :style="{
                    background: 'var(--bg-subtle)',
                    border: coachSlotDragOverIdx === slotIdx ? '2px dashed #6366f1' : '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    opacity: draggedCoachSlotIdx === slotIdx ? '0.4' : '1',
                    transition: 'all 0.15s ease'
                  }"
                  @dragstart="onCoachSlotDragStart(slotIdx, $event)"
                  @dragover="onCoachSlotDragOver(slotIdx, $event)"
                  @dragleave="coachSlotDragOverIdx = null"
                  @drop="onCoachSlotDrop(slotIdx, 'pr', $event)"
                  @dragend="onCoachSlotDragEnd"
                >
                  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:8px;gap:8px;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:240px;">
                      <span
                        class="drag-handle"
                        title="Drag slot to reorder"
                        style="cursor:grab;color:var(--text-muted);font-size:16px;line-height:1;user-select:none;padding:2px 4px;"
                      >
                        ⠿
                      </span>
                      <input
                        v-model="slot.name"
                        type="text"
                        placeholder="Session Name (e.g. Saturday Coaches Pre-Ride)"
                        class="custom-minutes-input"
                        style="flex:2;min-width:160px;font-weight:700;"
                        draggable="false"
                        @dragstart.stop
                      >
                      <input
                        v-model="slot.tag"
                        type="text"
                        placeholder="Tag (e.g. Pre-Ride)"
                        class="custom-minutes-input"
                        style="width:95px;"
                        draggable="false"
                        @dragstart.stop
                      >
                    </div>

                    <div style="display:flex;align-items:center;gap:8px;">
                      <button
                        type="button"
                        class="search-clear-btn"
                        style="position:static;display:inline-flex;color:#ef4444;font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.08);cursor:pointer;"
                        title="Delete this slot"
                        @click="removeCoachSlot('pr', slotIdx)"
                      >
                        ✕ Delete
                      </button>
                    </div>
                  </div>

                  <!-- Day & Time -->
                  <div style="display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap;" draggable="false" @dragstart.stop>
                    <div style="min-width:120px;">
                      <label class="modal-label" style="font-size:10.5px;">Day</label>
                      <select
                        v-model="slot.day"
                        class="custom-minutes-input"
                        style="width:100%;font-size:11.5px;height:30px;padding:2px 6px;"
                      >
                        <option v-for="d in DAY_OPTIONS" :key="d" :value="d">{{ d }}</option>
                      </select>
                    </div>

                    <div style="flex:1;min-width:210px;">
                      <label class="modal-label" style="font-size:10.5px;">Meeting Time</label>
                      <div style="display:flex;align-items:center;gap:4px;">
                        <CustomTimePicker
                          :model-value="getSlotStart(slot.meetingTime)"
                          placeholder="Start time"
                          title="Meeting start time"
                          @update:model-value="onSlotStartChange(slot, $event)"
                        />
                        <span style="font-size:10.5px;color:var(--text-muted);">to</span>
                        <CustomTimePicker
                          :model-value="getSlotEnd(slot.meetingTime)"
                          placeholder="-- Single Time --"
                          allow-clear
                          title="Meeting end time (optional)"
                          @update:model-value="onSlotEndChange(slot, $event)"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Description -->
                  <div draggable="false" @dragstart.stop>
                    <label class="modal-label" style="font-size:10.5px;">Riders Allowed / Description</label>
                    <input
                      v-model="slot.ridersAllowed"
                      type="text"
                      placeholder="e.g. Registered Riders & Coaches"
                      class="custom-minutes-input"
                      style="width:100%;font-size:11.5px;"
                    >
                  </div>
                </div>

                <!-- Bottom Add Pre-Ride Wave Button -->
                <div style="display:flex;justify-content:center;margin-top:4px;">
                  <button
                    type="button"
                    class="action-mini-btn"
                    style="width:100%;padding:10px;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;border:1px dashed rgba(239,68,68,0.4);background:rgba(239,68,68,0.06);color:var(--accent-red);border-radius:8px;cursor:pointer;transition:all 0.15s ease;"
                    @click="addCoachSlot('pr')"
                  >
                    <span style="font-size:14px;">➕</span>
                    <span>Add Pre-Ride Wave</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- SUB-PANEL 3: CATEGORY WAVE SCHEDULE OVERVIEW & EDITOR -->
            <div v-else-if="activeCoachAdminTab === 'waves'" style="display:flex;flex-direction:column;gap:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div>
                  <h4 style="margin:0;font-size:14px;font-weight:700;color:var(--text-main);display:flex;align-items:center;gap:6px;">
                    <span>🏁</span> Category Wave Schedule
                    <span
                      v-if="form.hasCustomWaveSchedule"
                      style="font-size:10px;background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);padding:2px 8px;border-radius:999px;font-weight:700;"
                    >
                      Customized
                    </span>
                    <span
                      v-else
                      style="font-size:10px;background:rgba(34,197,94,0.12);color:#4ade80;border:1px solid rgba(34,197,94,0.25);padding:2px 8px;border-radius:999px;font-weight:700;"
                    >
                      Official 2026 Defaults
                    </span>
                  </h4>
                  <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px;">
                    Edit wave start times or add waves (e.g. Freshman Boys have 2 waves). Staging call-up is auto-calculated with {{ form.stagingOffsetMinutes || 15 }}m lead time.
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <button
                    type="button"
                    class="action-mini-btn"
                    style="padding:5px 10px;font-size:11.5px;font-weight:600;"
                    title="Reset to official 2026 schedule"
                    @click="resetWaveScheduleToDefaults"
                  >
                    🔄 Reset to Defaults
                  </button>
                </div>
              </div>

              <!-- Wave Schedule Table -->
              <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;width:100%;">
                <table class="results-table" style="font-size:12px;width:100%;min-width:540px;border-collapse:collapse;">
                  <thead>
                    <tr>
                      <th style="text-align:left;padding:8px 12px;min-width:140px;">Category</th>
                      <th style="width:75px;text-align:center;padding:8px 6px;">Wave</th>
                      <th style="width:130px;text-align:center;padding:8px 6px;">Start Time</th>
                      <th style="width:125px;text-align:center;color:#f87171;padding:8px 6px;">Staging Call-Up</th>
                      <th style="width:110px;text-align:center;padding:8px 6px;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="cat in ALL_CATEGORIES" :key="cat">
                      <tr
                        v-for="(wKey, wIdx) in getSortedWaveKeys(cat)"
                        :key="cat + '-' + wKey"
                        :style="{ borderBottom: wIdx === getSortedWaveKeys(cat).length - 1 ? '1px solid var(--border)' : '1px dashed rgba(255,255,255,0.06)' }"
                      >
                        <!-- Category name (rendered on first wave of category) -->
                        <td
                          v-if="wIdx === 0"
                          :rowspan="getSortedWaveKeys(cat).length"
                          style="font-weight:700;color:var(--text-main);padding:8px 12px;vertical-align:top;border-right:1px solid var(--border);"
                        >
                          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                            <span>{{ cat }}</span>
                            <span style="font-size:10px;color:var(--text-muted);font-weight:600;">
                              ({{ getSortedWaveKeys(cat).length }} {{ getSortedWaveKeys(cat).length === 1 ? 'wave' : 'waves' }})
                            </span>
                          </div>
                        </td>

                        <!-- Wave label -->
                        <td style="text-align:center;padding:6px;vertical-align:middle;">
                          <span class="schedule-tag" style="font-size:10px;padding:2px 8px;font-weight:700;border-radius:6px;background:rgba(255,255,255,0.08);color:var(--text-main);">
                            Wave {{ wKey }}
                          </span>
                        </td>

                        <!-- Start time input -->
                        <td style="text-align:center;padding:6px;vertical-align:middle;">
                          <CustomTimePicker
                            v-model="getWavesForCategory(cat)[wKey].start"
                            @change="onWaveStartChange(cat, wKey, $event)"
                          />
                        </td>

                        <!-- Staging Call-Up -->
                        <td style="text-align:center;color:#f87171;font-weight:700;padding:6px;vertical-align:middle;">
                          <span>{{ getWavesForCategory(cat)[wKey].stage || 'TBD' }}</span>
                        </td>

                        <!-- Actions -->
                        <td style="text-align:center;padding:6px;vertical-align:middle;">
                          <button
                            v-if="wIdx === 0"
                            type="button"
                            class="wave-add-btn"
                            title="Add another wave to this category"
                            @click="addWaveToCategory(cat)"
                          >
                            + Add Wave
                          </button>
                          <button
                            v-else
                            type="button"
                            class="wave-del-btn"
                            title="Delete this wave"
                            @click="removeWaveFromCategory(cat, wKey)"
                          >
                            ✕ Remove
                          </button>
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- 4. Volunteers & Logistics Tab -->
          <div v-else-if="activeTab === 'signups'" class="admin-section-card">
            <h3 class="admin-card-title">🤝 Volunteer, Hospitality, Camping & Photos</h3>
            <div style="display:flex;flex-direction:column;gap:14px;">
              <div>
                <label class="modal-label">Team Volunteers Signup Code or URL</label>
                <input v-model="form.signups!.volunteer" type="text" placeholder="https://signup.com/client/invitation2/secure/..." class="custom-minutes-input" style="width:100%;">
              </div>
              <div>
                <label class="modal-label">Food & Hospitality Signup Code or URL</label>
                <input v-model="form.signups!.food" type="text" placeholder="https://signup.com/client/invitation2/secure/..." class="custom-minutes-input" style="width:100%;">
              </div>
              <div>
                <label class="modal-label">Camping Sign-Up Code or URL</label>
                <input v-model="form.signups!.camping" type="text" placeholder="https://... or SignUp.com invitation code" class="custom-minutes-input" style="width:100%;">
              </div>
              <div>
                <label class="modal-label">Wisconsin League Volunteer Code or URL</label>
                <input v-model="form.signups!.league" type="text" placeholder="https://signup.com/client/invitation2/secure/..." class="custom-minutes-input" style="width:100%;">
              </div>
              <!-- Official Race Photos Album Section -->
              <div style="margin-top:4px;padding-top:14px;border-top:1px solid var(--border);">
                <label class="modal-label" style="display:flex;align-items:center;gap:6px;">
                  <span>📸 Google Photos Shared Album URL</span>
                </label>
                <div style="display:flex;gap:10px;">
                  <input
                    v-model="form.photosUrl"
                    type="text"
                    placeholder="https://photos.app.goo.gl/..."
                    class="custom-minutes-input"
                    style="flex:1;"
                  />
                  <a
                    v-if="form.photosUrl"
                    :href="form.photosUrl"
                    target="_blank"
                    rel="noopener"
                    class="admin-tab-btn"
                    style="display:inline-flex;align-items:center;padding:0 14px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:12px;text-decoration:none;"
                  >
                    Open ↗
                  </a>
                </div>
                <span style="font-size:11px;color:var(--text-muted);margin-top:4px;display:block;">
                  Athletes and families can tap the Photos tab on this event's page to view and contribute their race weekend photos.
                </span>
              </div>
            </div>
          </div>

          <!-- 6. Course Maps Tab -->
          <div v-else-if="activeTab === 'maps'" class="admin-section-card">
            <h3 class="admin-card-title">🗺️ Course Maps & GPS Links</h3>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div>
                <label class="modal-label">Google MyMaps Embed URL</label>
                <input v-model="form.embedMapUrl" type="text" placeholder="https://www.google.com/maps/d/embed?mid=..." class="custom-minutes-input" style="width:100%;">
              </div>
              <div>
                <label class="modal-label">Direct Full Map URL</label>
                <input v-model="form.fullMapUrl" type="text" placeholder="https://www.google.com/maps/d/viewer?mid=..." class="custom-minutes-input" style="width:100%;">
              </div>
            </div>
          </div>

          <!-- 7. Guidelines Tab -->
          <div v-else-if="activeTab === 'announcements'" class="admin-section-card">
            <h3 class="admin-card-title">📢 Team Guidelines & Reminders</h3>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <div v-if="!form.guidelines || form.guidelines.length === 0" class="no-results" style="padding:16px;">
                No team guidelines added yet. Click "+ Add Guideline" below.
              </div>

              <div
                v-for="(g, idx) in form.guidelines"
                :key="idx"
                draggable="true"
                class="drag-row"
                :style="{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  transition: 'all 0.15s ease',
                  opacity: draggedGuidelineIdx === idx ? '0.4' : '1',
                  border: guidelineDragOverIdx === idx ? '2px dashed #6366f1' : '1px solid var(--border)',
                  background: guidelineDragOverIdx === idx ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-subtle)'
                }"
                @dragstart="onGuidelineDragStart(idx, $event)"
                @dragover="onGuidelineDragOver(idx, $event)"
                @dragleave="guidelineDragOverIdx = null"
                @drop="onGuidelineDrop(idx, $event)"
                @dragend="onGuidelineDragEnd"
              >
                <span
                  class="drag-handle"
                  title="Drag to rearrange"
                  style="cursor:grab;color:var(--text-muted);font-size:16px;line-height:1;user-select:none;padding:2px 4px;"
                >
                  ⠿
                </span>
                <input
                  v-model="form.guidelines[idx]"
                  type="text"
                  placeholder="Guideline text (HTML supported, e.g. <strong>Trails:</strong> ...)"
                  class="custom-minutes-input"
                  style="flex:1;"
                  draggable="false"
                  @dragstart.stop
                >
                <button
                  type="button"
                  class="search-clear-btn"
                  style="position:static;display:inline-flex;color:#ef4444;font-size:11px;padding:2px 6px;border-radius:4px;border:1px solid rgba(239,68,68,0.2);background:rgba(239,68,68,0.06);cursor:pointer;"
                  title="Delete guideline"
                  @click="removeGuideline(idx)"
                >
                  ✕
                </button>
              </div>

              <!-- Bottom Add Guideline Button -->
              <div style="display:flex;justify-content:center;margin-top:4px;">
                <button
                  type="button"
                  class="action-mini-btn"
                  style="width:100%;padding:9px;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;border:1px dashed rgba(239,68,68,0.4);background:rgba(239,68,68,0.06);color:var(--accent-red);border-radius:8px;cursor:pointer;transition:all 0.15s ease;"
                  @click="addGuideline"
                >
                  <span style="font-size:14px;">➕</span>
                  <span>Add Guideline</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 8. Team Admins & Users Tab (Overhauled Directory) -->
          <div v-else-if="activeTab === 'coaches' || activeTab === 'users'" class="admin-section-card">
            
            <!-- Invite Links Config Section -->
            <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:18px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                <div>
                  <h4 style="margin:0;font-size:14px;font-weight:700;color:var(--text-main);">Shareable Team Registration Links</h4>
                  <div style="font-size:11.5px;color:var(--text-muted);">Share these secure links with coaches to let them create verified accounts.</div>
                </div>
                <button type="button" class="done-modal-btn admin-save-btn" style="padding:5px 12px;font-size:11.5px;" :disabled="isSavingInvites" @click="handleSaveInviteCodes">
                  {{ isSavingInvites ? 'Saving...' : '💾 Save Invite Codes' }}
                </button>
              </div>

              <div style="display:flex;flex-direction:column;gap:10px;">
                <!-- Coach Invite Link -->
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  <span style="font-size:11.5px;font-weight:700;color:#60a5fa;min-width:90px;">Coach Invite:</span>
                  <div style="flex:1;min-width:0;max-width:100%;display:flex;align-items:center;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-family:monospace;font-size:11.5px;color:var(--text-main);overflow-x:auto;white-space:nowrap;box-sizing:border-box;">
                    {{ coachInviteUrl }}
                  </div>
                  <button type="button" class="action-mini-btn" style="padding:5px 12px;font-size:11.5px;" @click="copyCoachLink">
                    {{ copiedCoach ? '✓ Copied' : '📋 Copy Link' }}
                  </button>
                </div>

                <!-- Guardian Invite Link -->
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  <span style="font-size:11.5px;font-weight:700;color:#c084fc;min-width:90px;">Guardian Invite:</span>
                  <div style="flex:1;min-width:0;max-width:100%;display:flex;align-items:center;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-family:monospace;font-size:11.5px;color:var(--text-main);overflow-x:auto;white-space:nowrap;box-sizing:border-box;">
                    {{ guardianInviteUrl }}
                  </div>
                  <button type="button" class="action-mini-btn" style="padding:5px 12px;font-size:11.5px;" @click="copyGuardianLink">
                    {{ copiedGuardian ? '✓ Copied' : '📋 Copy Link' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Add Administrator Form (Strictly Administrator, no Coach option) -->
            <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:18px;">
              <h4 style="margin:0 0 4px;font-size:14px;font-weight:700;color:var(--text-main);">Add Team Administrator</h4>
              <p style="margin:0 0 12px;font-size:12px;color:var(--text-muted);line-height:1.4;">
                Users added here as <strong>Coach Admin</strong> receive full race configuration, schedule editing, and settings control. Ordinary coaches and guardians register themselves using the team invite links above.
              </p>
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                <input
                  v-model="newCoachEmail"
                  type="email"
                  placeholder="admin.email@gmail.com"
                  class="custom-minutes-input"
                  style="flex:2;min-width:160px;max-width:100%;"
                >
                <input
                  v-model="newCoachName"
                  type="text"
                  placeholder="Admin Name (Optional)"
                  class="custom-minutes-input"
                  style="flex:1.5;min-width:130px;max-width:100%;"
                >
                <button
                  type="button"
                  class="done-modal-btn admin-save-btn"
                  style="padding:8px 18px;white-space:nowrap;max-width:100%;"
                  :disabled="isAddingCoach"
                  @click="handleAddCoach"
                >
                  <span>{{ isAddingCoach ? 'Adding...' : '+ Add Administrator' }}</span>
                </button>
              </div>
            </div>

            <!-- User Directory Section -->
            <div>
              <!-- Directory Header -->
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
                <div>
                  <h4 style="margin:0;font-size:15px;font-weight:800;color:var(--text-main);">Registered Team Users & Admins ({{ allUsersList.length }})</h4>
                  <div style="font-size:11.5px;color:var(--text-muted);">Sort and search all registered accounts, and manage administrator access.</div>
                </div>
                <button type="button" class="action-mini-btn" style="padding:5px 12px;" @click="fetchAllUsers" :disabled="allUsersLoading">
                  <span>{{ allUsersLoading ? '⏳ Loading...' : '🔄 Refresh Directory' }}</span>
                </button>
              </div>

              <!-- Search Bar & Role Filter Chips -->
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;">
                <div style="position:relative;flex:1;min-width:220px;">
                  <input
                    v-model="userSearchQuery"
                    type="text"
                    placeholder="🔍 Search by name, email, or phone..."
                    class="custom-minutes-input"
                    style="width:100%;padding-left:12px;height:36px;font-size:12.5px;"
                  />
                  <button
                    v-if="userSearchQuery"
                    type="button"
                    class="search-clear-btn"
                    style="right:8px;top:50%;transform:translateY(-50%);"
                    @click="userSearchQuery = ''"
                  >✕</button>
                </div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                  <button
                    type="button"
                    class="action-mini-btn"
                    :class="{ active: userRoleFilter === 'all' }"
                    style="font-size:11.5px;padding:5px 10px;"
                    @click="userRoleFilter = 'all'"
                  >All ({{ allUsersList.length }})</button>
                  <button
                    type="button"
                    class="action-mini-btn"
                    :class="{ active: userRoleFilter === 'admin' }"
                    style="font-size:11.5px;padding:5px 10px;"
                    @click="userRoleFilter = 'admin'"
                  >🛡️ Admins ({{ allUsersList.filter(u => u.role === 'admin' || u.role === 'owner').length }})</button>
                  <button
                    type="button"
                    class="action-mini-btn"
                    :class="{ active: userRoleFilter === 'coach' }"
                    style="font-size:11.5px;padding:5px 10px;"
                    @click="userRoleFilter = 'coach'"
                  >🚵 Coaches ({{ allUsersList.filter(u => u.role === 'coach').length }})</button>
                  <button
                    type="button"
                    class="action-mini-btn"
                    :class="{ active: userRoleFilter === 'guardian' }"
                    style="font-size:11.5px;padding:5px 10px;"
                    @click="userRoleFilter = 'guardian'"
                  >👨‍👩‍👧 Guardians ({{ allUsersList.filter(u => u.role === 'guardian').length }})</button>
                </div>
              </div>

              <!-- Interactive Sort Column Headers -->
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:14px;flex:1;">
                  <span style="cursor:pointer;user-select:none;display:inline-flex;align-items:center;gap:4px;" @click="toggleUserSort('name')">
                    User {{ userSortField === 'name' ? (userSortOrder === 'asc' ? '▲' : '▼') : '' }}
                  </span>
                  <span style="cursor:pointer;user-select:none;display:inline-flex;align-items:center;gap:4px;" @click="toggleUserSort('email')">
                    Email {{ userSortField === 'email' ? (userSortOrder === 'asc' ? '▲' : '▼') : '' }}
                  </span>
                </div>
                <div style="display:flex;align-items:center;gap:18px;">
                  <span style="cursor:pointer;user-select:none;display:inline-flex;align-items:center;gap:4px;" @click="toggleUserSort('role')">
                    Role {{ userSortField === 'role' ? (userSortOrder === 'asc' ? '▲' : '▼') : '' }}
                  </span>
                  <span style="cursor:pointer;user-select:none;display:inline-flex;align-items:center;gap:4px;" @click="toggleUserSort('lastLogin')">
                    Last Login {{ userSortField === 'lastLogin' ? (userSortOrder === 'asc' ? '▲' : '▼') : '' }}
                  </span>
                  <span style="cursor:pointer;user-select:none;display:inline-flex;align-items:center;gap:4px;" @click="toggleUserSort('date')">
                    Joined {{ userSortField === 'date' ? (userSortOrder === 'asc' ? '▲' : '▼') : '' }}
                  </span>
                  <span style="width:80px;text-align:right;">Actions</span>
                </div>
              </div>

              <!-- User List Rows -->
              <div v-if="allUsersLoading" style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px;">
                Loading team directory...
              </div>
              <div v-else-if="filteredUsers.length === 0" style="text-align:center;padding:32px;background:var(--bg-subtle);border:1px dashed var(--border);border-radius:8px;color:var(--text-muted);font-size:13px;">
                No users found matching your search or filter.
              </div>
              <div v-else style="display:flex;flex-direction:column;gap:8px;">
                <div
                  v-for="u in filteredUsers"
                  :key="u.id || u.email"
                  style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:10px;gap:12px;flex-wrap:wrap;transition:all 0.15s ease;"
                >
                  <!-- Left: Avatar + Name + Email + Badges -->
                  <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;max-width:100%;">
                    <img
                      v-if="u.photoURL"
                      :src="u.photoURL"
                      alt="Avatar"
                      referrerpolicy="no-referrer"
                      style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(255,255,255,0.15);flex-shrink:0;"
                    />
                    <div
                      v-else
                      style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.08);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:var(--text-main);flex-shrink:0;"
                    >
                      {{ (u.name || u.email).slice(0, 2).toUpperCase() }}
                    </div>

                    <div style="min-width:0;flex:1;">
                      <div style="font-weight:700;font-size:13.5px;color:var(--text-main);display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span>{{ u.name }}</span>
                        <span
                          class="category-badge"
                          :style="u.role === 'owner' ? 'background:rgba(168,85,247,0.15);border-color:rgba(168,85,247,0.35);color:#c084fc;' :
                                 u.role === 'admin' ? 'background:rgba(220,38,38,0.15);border-color:rgba(220,38,38,0.35);color:var(--accent-red);' :
                                 u.role === 'guardian' ? 'background:rgba(34,197,94,0.15);border-color:rgba(34,197,94,0.35);color:#4ade80;' :
                                 'background:rgba(59,130,246,0.15);border-color:rgba(59,130,246,0.35);color:#60a5fa;'"
                        >
                          {{ u.role === 'owner' ? 'Owner' : (u.role === 'admin' ? 'Admin' : (u.role === 'guardian' ? 'Guardian' : 'Coach')) }}
                        </span>
                        <span
                          v-if="u.email.toLowerCase() === user?.email?.toLowerCase()"
                          style="font-size:10px;color:#22c55e;background:rgba(34,197,94,0.15);padding:1px 6px;border-radius:4px;font-weight:700;"
                        >You</span>
                        <span
                          v-if="u.isPendingAdmin"
                          style="font-size:10px;color:#f59e0b;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);padding:1px 6px;border-radius:4px;font-weight:600;"
                          title="Administrator added in database, awaiting account registration"
                        >Invited Admin</span>
                      </div>
                      <div style="font-size:11.5px;color:var(--text-muted);display:flex;align-items:center;gap:8px;margin-top:3px;flex-wrap:wrap;">
                        <span style="word-break:break-all;">{{ u.email }}</span>
                        <span v-if="u.phone" style="opacity:0.8;">• 📞 {{ u.phone }}</span>
                        <span style="display:inline-flex;align-items:center;gap:4px;color:var(--text-dim);">
                          • 🕒 Last Login: <strong :style="u.lastLoginAt ? 'color:var(--text-main);font-weight:600;' : 'color:var(--text-muted);font-weight:normal;'">{{ formatLastLogin(u.lastLoginAt) }}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Right: Interactive Role Dropdown + Remove action -->
                  <div style="display:flex;align-items:center;gap:10px;margin-left:auto;flex-wrap:wrap;">
                    <!-- Dropdown for role changes -->
                    <select
                      v-if="u.role !== 'owner' && u.email.toLowerCase() !== user?.email?.toLowerCase()"
                      :value="u.role === 'admin' ? 'admin' : (u.role === 'guardian' ? 'guardian' : 'coach')"
                      class="custom-minutes-input"
                      style="font-size:12px;height:32px;padding:2px 8px;font-weight:600;min-width:130px;"
                      @change="handleUpdateUserRole(u, ($event.target as HTMLSelectElement).value as 'admin' | 'coach' | 'guardian')"
                    >
                      <option value="admin">🛡️ Admin</option>
                      <option value="coach">🚵 Coach</option>
                      <option value="guardian">👨‍👩‍👧 Guardian</option>
                    </select>
                    <span
                      v-else
                      style="font-size:11.5px;color:var(--text-muted);padding:4px 8px;font-style:italic;"
                    >
                      {{ u.role === 'owner' ? '🔒 Founder' : '🔒 Active Session' }}
                    </span>

                    <!-- Remove Button -->
                    <button
                      v-if="u.role !== 'owner' && u.email.toLowerCase() !== user?.email?.toLowerCase()"
                      type="button"
                      class="search-clear-btn"
                      style="position:static;display:inline-flex;align-items:center;color:#ef4444;font-size:11.5px;padding:5px 10px;border-radius:6px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.08);cursor:pointer;"
                      title="Remove user or revoke admin access"
                      @click="handleRemoveUser(u)"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- 9. Urgent Site Announcement Tab -->
          <div v-else-if="activeTab === 'site-alert'" class="admin-section-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:16px;">
              <div>
                <h3 class="admin-card-title" style="margin-bottom:4px;">🚨 Site-Wide Urgent Announcement Banner</h3>
                <p style="font-size:13px;color:var(--text-muted);margin:0;max-width:700px;line-height:1.5;">
                  Broadcast instant cancellations, weather delays, or practice relocations across the entire portal. The banner renders boldly at the top of every page and updates in real-time for all athletes and parents.
                </p>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span
                  v-if="alertForm.active"
                  style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:800;color:#22c55e;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);padding:4px 10px;border-radius:20px;"
                >
                  <span style="width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block;"></span>
                  LIVE BANNER ACTIVE
                </span>
                <span
                  v-else
                  style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:var(--text-muted);background:var(--bg-subtle);border:1px solid var(--border);padding:4px 10px;border-radius:20px;"
                >
                  ⚪ BANNER INACTIVE
                </span>
              </div>
            </div>

            <!-- Quick One-Click Presets -->
            <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:20px;">
              <span style="font-size:11.5px;font-weight:800;color:var(--accent-red);letter-spacing:0.6px;text-transform:uppercase;display:block;margin-bottom:8px;">
                ⚡ Fast 1-Click Practice Presets
              </span>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button
                  type="button"
                  class="admin-tab-btn"
                  style="background:rgba(239,68,68,0.12);border-color:rgba(239,68,68,0.3);color:#f87171;font-size:12px;padding:6px 12px;"
                  @click="applyAlertPreset({
                    title: 'PRACTICE CANCELED',
                    message: 'Practice today is cancelled due to rain and muddy trail conditions. To protect the trails, we never ride when muddy. See you Thursday!',
                    type: 'danger'
                  })"
                >
                  🌧️ Practice Canceled (Mud / Rain)
                </button>
                <button
                  type="button"
                  class="admin-tab-btn"
                  style="background:rgba(245,158,11,0.12);border-color:rgba(245,158,11,0.3);color:#fbbf24;font-size:12px;padding:6px 12px;"
                  @click="applyAlertPreset({
                    title: 'PRACTICE RELOCATED',
                    message: 'Practice today is moved to Forest Hills as an alternative location from 5:30 to 6:30 PM. Helmets and full gear required.',
                    location: 'Forest Hills',
                    type: 'warning'
                  })"
                >
                  📍 Move to Forest Hills
                </button>
                <button
                  type="button"
                  class="admin-tab-btn"
                  style="background:rgba(59,130,246,0.12);border-color:rgba(59,130,246,0.3);color:#60a5fa;font-size:12px;padding:6px 12px;"
                  @click="applyAlertPreset({
                    title: 'PRACTICE AT CTF',
                    message: 'Practice tonight meets at Community Trail Farm (W5723 HWY 33). All-weather loop and trail ride!',
                    location: 'Community Trail Farm (CTF)',
                    type: 'info'
                  })"
                >
                  🌲 Meet at Trail Farm (CTF)
                </button>
              </div>
            </div>

            <!-- Form -->
            <div style="display:flex;flex-direction:column;gap:16px;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div>
                  <label class="modal-label">Alert Headline</label>
                  <input
                    v-model="alertForm.title"
                    type="text"
                    placeholder="e.g. PRACTICE CANCELED"
                    class="custom-minutes-input"
                    style="width:100%;font-weight:700;"
                  />
                </div>
                <div>
                  <label class="modal-label">Alert Severity Style</label>
                  <select
                    v-model="alertForm.type"
                    class="custom-minutes-input"
                    style="width:100%;font-weight:600;"
                  >
                    <option value="danger">🔴 Red / Danger (Cancellations, Storms, Mud)</option>
                    <option value="warning">🟡 Amber / Warning (Relocations, Delays)</option>
                    <option value="info">🔵 Blue / Info (General Updates, Reminders)</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="modal-label">Relocation / Venue (Optional)</label>
                <input
                  v-model="alertForm.location"
                  type="text"
                  placeholder="e.g. Forest Hills or Community Trail Farm"
                  class="custom-minutes-input"
                  style="width:100%;"
                />
              </div>

              <div>
                <label class="modal-label">Detailed Notification Message</label>
                <textarea
                  v-model="alertForm.message"
                  rows="3"
                  placeholder="e.g. Due to heavy rainfall, practice tonight is moved to the pump track. Please bring helmets and full hydration..."
                  class="custom-minutes-input"
                  style="width:100%;height:auto;padding:10px 12px;line-height:1.5;resize:vertical;"
                ></textarea>
              </div>

              <!-- Timeframe & Auto-Expiration -->
              <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:16px;">⏱️</span>
                    <strong style="font-size:12.5px;color:var(--text-main);">Auto-Expire Timeframe</strong>
                    <span style="font-size:11px;color:#10b981;background:rgba(16,185,129,0.12);padding:1px 6px;border-radius:4px;font-weight:700;">
                      Auto-Turn Off
                    </span>
                  </div>
                  <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);cursor:pointer;">
                    <input type="checkbox" v-model="alertForm.hasExpiration" style="accent-color:#10b981;" />
                    <span style="font-weight:600;color:var(--text-main);">Enable Auto-Expiration</span>
                  </label>
                </div>

                <p style="font-size:11.5px;color:var(--text-muted);margin:0;line-height:1.4;">
                  Set a timeframe so the alert turns off automatically (e.g. at 7:30 PM after practice). You won't have to remember to log in and turn it off!
                </p>

                <!-- Quick Presets -->
                <div v-if="alertForm.hasExpiration" style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button
                    type="button"
                    class="admin-tab-btn"
                    style="font-size:11px;padding:4px 9px;"
                    @click="setExpirationPreset('practice730')"
                  >
                    ⏰ Tonight at 7:30 PM (End of Practice)
                  </button>
                  <button
                    type="button"
                    class="admin-tab-btn"
                    style="font-size:11px;padding:4px 9px;"
                    @click="setExpirationPreset('practice800')"
                  >
                    ⏰ Tonight at 8:00 PM
                  </button>
                  <button
                    type="button"
                    class="admin-tab-btn"
                    style="font-size:11px;padding:4px 9px;"
                    @click="setExpirationPreset('2h')"
                  >
                    ⏱️ In 2 Hours
                  </button>
                  <button
                    type="button"
                    class="admin-tab-btn"
                    style="font-size:11px;padding:4px 9px;"
                    @click="setExpirationPreset('4h')"
                  >
                    ⏱️ In 4 Hours
                  </button>
                  <button
                    type="button"
                    class="admin-tab-btn"
                    style="font-size:11px;padding:4px 9px;"
                    @click="setExpirationPreset('endOfDay')"
                  >
                    🌙 End of Day (11:59 PM)
                  </button>
                </div>

                <!-- Datetime input -->
                <div v-if="alertForm.hasExpiration" style="display:grid;grid-template-columns:1fr;gap:8px;">
                  <div>
                    <label class="modal-label" style="font-size:11px;">Expires On Date & Time</label>
                    <input
                      v-model="alertForm.expiresAt"
                      type="datetime-local"
                      class="custom-minutes-input"
                      style="width:100%;font-size:12px;padding:6px 10px;"
                    />
                  </div>
                  <div style="font-size:11.5px;font-weight:600;color:#34d399;display:flex;align-items:center;gap:6px;">
                    <span>{{ alertExpirationStatusText }}</span>
                  </div>
                </div>
              </div>

              <!-- Live Preview Card -->
              <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:12px;padding:14px;">
                <span style="font-size:11px;font-weight:800;color:var(--text-muted);letter-spacing:0.6px;text-transform:uppercase;display:block;margin-bottom:8px;">
                  Banner Live Preview
                </span>
                <div
                  :style="{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: alertForm.type === 'danger' ? 'rgba(239, 68, 68, 0.15)' : (alertForm.type === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)'),
                    border: '1px solid ' + (alertForm.type === 'danger' ? 'rgba(239, 68, 68, 0.4)' : (alertForm.type === 'warning' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(59, 130, 246, 0.4)')),
                    color: alertForm.type === 'danger' ? '#fca5a5' : (alertForm.type === 'warning' ? '#fde68a' : '#bfdbfe')
                  }"
                >
                  <strong style="color:#fff;margin-right:8px;">{{ alertForm.title || 'ALERT' }}:</strong>
                  <span>{{ alertForm.message || '(Enter alert message above)' }}</span>
                  <span v-if="alertForm.location" style="display:inline-block;margin-left:8px;font-weight:700;color:#fff;background:rgba(0,0,0,0.3);padding:1px 6px;border-radius:4px;font-size:11px;">
                    📍 {{ alertForm.location }}
                  </span>
                  <span v-if="alertForm.hasExpiration && alertForm.expiresAt" style="display:inline-block;margin-left:8px;font-weight:700;color:#fff;background:rgba(0,0,0,0.35);padding:1px 8px;border-radius:9999px;font-size:11px;border:1px solid rgba(255,255,255,0.25);">
                    ⏳ Until {{ formatExpiresAt(alertForm.expiresAt) }}
                  </span>
                </div>
              </div>

              <!-- Action Buttons -->
              <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;">
                <button
                  type="button"
                  class="done-modal-btn admin-save-btn"
                  style="padding:10px 20px;"
                  :disabled="isSavingAlert"
                  @click="handlePublishAlert"
                >
                  <span>🚀</span>
                  <span>{{ isSavingAlert ? 'Publishing...' : 'Publish Live Alert Banner' }}</span>
                </button>
                <button
                  v-if="alertForm.active || announcement.active"
                  type="button"
                  class="admin-back-text-btn"
                  style="color:#ef4444;border:1px solid rgba(239,68,68,0.3);padding:8px 16px;border-radius:8px;background:rgba(239,68,68,0.08);"
                  :disabled="isSavingAlert"
                  @click="handleClearAlert"
                >
                  <span>✕ Turn Off / Clear Banner</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 10. Site Photos & Links Manager Tab -->
          <div v-else-if="activeTab === 'site-media'" class="admin-section-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:16px;">
              <div>
                <h3 class="admin-card-title" style="margin-bottom:4px;">🖼️ Site Photos & Team Links</h3>
                <p style="font-size:13px;color:var(--text-muted);margin:0;max-width:700px;line-height:1.5;">
                  Change any image across the site (Home page team photo, Practice page coaches photo, Leadership portraits, Coach Carey) and configure the Google Drive practice album link.
                </p>
              </div>
              <button
                type="button"
                class="done-modal-btn admin-save-btn"
                style="padding:10px 20px;"
                :disabled="isSavingMedia"
                @click="handleSaveSiteMedia"
              >
                <span>💾</span>
                <span>{{ isSavingMedia ? 'Saving...' : 'Save All Photos & Links' }}</span>
              </button>
            </div>

            <!-- Google Drive Section -->
            <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:24px;">
              <span style="font-size:11.5px;font-weight:800;color:#3b82f6;letter-spacing:0.6px;text-transform:uppercase;display:block;margin-bottom:8px;">
                📁 Practice Photos Google Drive Link
              </span>
              <div>
                <label class="modal-label">Google Drive Public Folder URL</label>
                <div style="display:flex;gap:10px;">
                  <input
                    v-model="siteMediaForm.practiceDriveUrl"
                    type="url"
                    placeholder="https://drive.google.com/drive/folders/..."
                    class="custom-minutes-input"
                    style="flex:1;"
                  />
                  <a
                    v-if="siteMediaForm.practiceDriveUrl"
                    :href="siteMediaForm.practiceDriveUrl"
                    target="_blank"
                    rel="noopener"
                    class="admin-tab-btn"
                    style="display:inline-flex;align-items:center;padding:0 14px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:12px;text-decoration:none;"
                  >
                    Open ↗
                  </a>
                </div>
                <span style="font-size:11px;color:var(--text-muted);margin-top:4px;display:block;">
                  This link is displayed prominently on the Practice Page for athletes and parents to access and view practice photos.
                </span>
              </div>
            </div>

            <!-- Photos Grid -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;">
              <!-- 1. Team Hero Photo -->
              <div class="admin-photo-card" style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <strong style="font-size:13px;color:var(--text-main);">📸 Team Hero Photo (Home)</strong>
                  <button type="button" class="admin-back-text-btn" style="font-size:11px;" @click="handleResetPhotoDefault('teamPhoto')">Reset</button>
                </div>
                <div style="height:140px;background:#000;border-radius:8px;overflow:hidden;border:1px solid var(--border);position:relative;">
                  <img :src="siteMediaForm.teamPhoto" alt="Preview" style="width:100%;height:100%;object-fit:cover;object-position:center 15%;" />
                  <span v-if="siteMediaForm.teamPhoto && siteMediaForm.teamPhoto.startsWith('/images/')" style="position:absolute;top:6px;left:6px;background:rgba(16,185,129,0.9);color:#fff;font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:4px;">
                    📁 /images (Lossless)
                  </span>
                </div>
                <div>
                  <label class="modal-label" style="font-size:11px;">Image URL (e.g. /images/... or https://...)</label>
                  <input v-model="siteMediaForm.teamPhoto" type="text" class="custom-minutes-input" style="width:100%;font-size:11.5px;" />
                </div>
                <div style="display:flex;gap:6px;">
                  <label class="admin-tab-btn" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:11.5px;cursor:pointer;">
                    <span>📁 Upload</span>
                    <input type="file" accept="image/*" class="sr-only" @change="handlePhotoUpload('teamPhoto', $event)" />
                  </label>
                  <button
                    v-if="siteMediaForm.teamPhoto"
                    type="button"
                    class="admin-tab-btn"
                    style="font-size:11.5px;padding:6px 10px;"
                    title="Crop and position this photo"
                    @click="openAdminCropper(siteMediaForm.teamPhoto, '4:3', 'Crop & Reposition: Team Photo', (c) => siteMediaForm.teamPhoto = c)"
                  >
                    ✂️ Crop
                  </button>
                </div>
              </div>

              <!-- 2. Coaches Photo -->
              <div class="admin-photo-card" style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <strong style="font-size:13px;color:var(--text-main);">📸 Coaches Photo (Practice)</strong>
                  <button type="button" class="admin-back-text-btn" style="font-size:11px;" @click="handleResetPhotoDefault('coachesPhoto')">Reset</button>
                </div>
                <div style="height:140px;background:#000;border-radius:8px;overflow:hidden;border:1px solid var(--border);position:relative;">
                  <img :src="siteMediaForm.coachesPhoto" alt="Preview" style="width:100%;height:100%;object-fit:cover;object-position:center 15%;" />
                  <span v-if="siteMediaForm.coachesPhoto && siteMediaForm.coachesPhoto.startsWith('/images/')" style="position:absolute;top:6px;left:6px;background:rgba(16,185,129,0.9);color:#fff;font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:4px;">
                    📁 /images (Lossless)
                  </span>
                </div>
                <div>
                  <label class="modal-label" style="font-size:11px;">Image URL (e.g. /images/... or https://...)</label>
                  <input v-model="siteMediaForm.coachesPhoto" type="text" class="custom-minutes-input" style="width:100%;font-size:11.5px;" />
                </div>
                <div style="display:flex;gap:6px;">
                  <label class="admin-tab-btn" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:11.5px;cursor:pointer;">
                    <span>📁 Upload</span>
                    <input type="file" accept="image/*" class="sr-only" @change="handlePhotoUpload('coachesPhoto', $event)" />
                  </label>
                  <button
                    v-if="siteMediaForm.coachesPhoto"
                    type="button"
                    class="admin-tab-btn"
                    style="font-size:11.5px;padding:6px 10px;"
                    title="Crop and position this photo"
                    @click="openAdminCropper(siteMediaForm.coachesPhoto, '16:9', 'Crop & Reposition: Coaches Photo', (c) => siteMediaForm.coachesPhoto = c)"
                  >
                    ✂️ Crop
                  </button>
                </div>
              </div>

              <!-- 3. Carey Falkenberry Photo -->
              <div class="admin-photo-card" style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <strong style="font-size:13px;color:var(--text-main);">👤 Coach Carey (Testimonial Portrait)</strong>
                  <button type="button" class="admin-back-text-btn" style="font-size:11px;" @click="handleResetPhotoDefault('careyPhoto')">Reset</button>
                </div>
                <div style="height:140px;background:#000;border-radius:8px;overflow:hidden;border:1px solid var(--border);position:relative;">
                  <img :src="siteMediaForm.careyPhoto" alt="Preview" style="width:100%;height:100%;object-fit:cover;object-position:top center;" />
                  <span v-if="siteMediaForm.careyPhoto && siteMediaForm.careyPhoto.startsWith('/images/')" style="position:absolute;top:6px;left:6px;background:rgba(16,185,129,0.9);color:#fff;font-size:9.5px;font-weight:800;padding:2px 6px;border-radius:4px;">
                    📁 /images (Lossless)
                  </span>
                </div>
                <div>
                  <label class="modal-label" style="font-size:11px;">Image URL</label>
                  <input v-model="siteMediaForm.careyPhoto" type="text" class="custom-minutes-input" style="width:100%;font-size:11.5px;" />
                </div>
                <div style="display:flex;gap:6px;">
                  <label class="admin-tab-btn" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:11.5px;cursor:pointer;">
                    <span>📁 Upload</span>
                    <input type="file" accept="image/*" class="sr-only" @change="handlePhotoUpload('careyPhoto', $event)" />
                  </label>
                  <button
                    v-if="siteMediaForm.careyPhoto"
                    type="button"
                    class="admin-tab-btn"
                    style="font-size:11.5px;padding:6px 10px;"
                    title="Crop and position portrait"
                    @click="openAdminCropper(siteMediaForm.careyPhoto, '1:1', 'Crop Portrait: Coach Carey', (c) => siteMediaForm.careyPhoto = c)"
                  >
                    ✂️ Crop
                  </button>
                </div>
              </div>
            </div>

            <div style="margin-top:20px;">
              <button
                type="button"
                class="done-modal-btn admin-save-btn"
                style="padding:10px 24px;"
                :disabled="isSavingMedia"
                @click="handleSaveSiteMedia"
              >
                <span>💾</span>
                <span>{{ isSavingMedia ? 'Saving...' : 'Save All Photos & Links' }}</span>
              </button>
            </div>
          </div>

          <!-- 11. Leadership Team Management Tab -->
          <div v-else-if="activeTab === 'site-leaders' || activeTab === 'leadership'" class="admin-section-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:16px;">
              <div>
                <h3 class="admin-card-title" style="margin-bottom:4px;">👥 Team Leadership & Coaches</h3>
                <p style="font-size:13px;color:var(--text-muted);margin:0;max-width:700px;line-height:1.5;">
                  Manage head coaches, assistant coaches, ride leaders, and team directors displayed on the About & Leadership page.
                </p>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button
                  type="button"
                  class="admin-tab-btn"
                  style="background:#2563eb;color:#fff;border:none;font-weight:700;padding:8px 14px;"
                  @click="handleAddAdminLeader"
                >
                  ➕ Add Member
                </button>
                <button
                  type="button"
                  class="done-modal-btn admin-save-btn"
                  style="padding:8px 18px;"
                  :disabled="isSavingLeaders"
                  @click="handleSaveAdminLeaders"
                >
                  <span>💾</span>
                  <span>{{ isSavingLeaders ? 'Saving...' : 'Save Leadership Team' }}</span>
                </button>
              </div>
            </div>

            <!-- Leaders List -->
            <div style="display:flex;flex-direction:column;gap:16px;">
              <div
                v-for="(leader, idx) in adminLeadersForm"
                :key="leader.id"
                style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;"
              >
                <div style="width:100px;display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
                  <div style="width:100px;height:110px;background:#000;border-radius:8px;overflow:hidden;border:1px solid var(--border);">
                    <img v-if="leader.image" :src="leader.image" alt="Preview" style="width:100%;height:100%;object-fit:cover;object-position:top center;" />
                    <div v-else style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:11px;">No Photo</div>
                  </div>
                  <label class="admin-tab-btn" style="font-size:11px;padding:4px 6px;text-align:center;cursor:pointer;">
                    <span>📁 Upload</span>
                    <input type="file" accept="image/*" class="sr-only" @change="handleLeaderPhotoUpload(leader, $event)" />
                  </label>
                  <button
                    v-if="leader.image"
                    type="button"
                    class="admin-tab-btn"
                    style="font-size:11px;padding:4px 6px;"
                    title="Crop portrait"
                    @click="openAdminCropper(leader.image, '1:1', `Crop Portrait: ${leader.name || 'Leader'}`, (c) => leader.image = c)"
                  >
                    ✂️ Crop
                  </button>
                </div>

                <div style="flex:1;min-width:260px;display:flex;flex-direction:column;gap:10px;">
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div>
                      <label class="modal-label" style="font-size:11px;">Full Name</label>
                      <input v-model="leader.name" type="text" placeholder="e.g. Ben Wilde" class="custom-minutes-input" style="width:100%;font-size:12px;" />
                    </div>
                    <div>
                      <label class="modal-label" style="font-size:11px;">Role / Title</label>
                      <input v-model="leader.role" type="text" placeholder="e.g. Head Coach" class="custom-minutes-input" style="width:100%;font-size:12px;" />
                    </div>
                  </div>

                  <div>
                    <label class="modal-label" style="font-size:11px;">Image Location in /images/ or URL</label>
                    <input v-model="leader.image" type="text" placeholder="/images/ben-wilde.jpg or https://..." class="custom-minutes-input" style="width:100%;font-size:12px;" />
                  </div>

                  <div>
                    <label class="modal-label" style="font-size:11px;">Bio & Background</label>
                    <textarea v-model="leader.desc" rows="2" placeholder="Brief bio..." class="custom-minutes-input" style="width:100%;font-size:12px;height:auto;padding:6px 10px;line-height:1.4;resize:vertical;"></textarea>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    class="admin-back-text-btn"
                    style="color:#ef4444;font-size:12px;padding:6px 10px;border:1px solid rgba(239,68,68,0.25);border-radius:6px;background:rgba(239,68,68,0.06);"
                    title="Remove leader from roster"
                    @click="handleRemoveAdminLeader(idx)"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 12. Sponsor Management Tab -->
          <div v-else-if="activeTab === 'site-sponsors' || activeTab === 'sponsors'" class="admin-section-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:16px;">
              <div>
                <h3 class="admin-card-title" style="margin-bottom:4px;">🤝 Team Sponsors & Community Champions</h3>
                <p style="font-size:13px;color:var(--text-muted);margin:0;max-width:700px;line-height:1.5;">
                  Manage community partners, local bike shops, and corporate champions displayed on the home page and throughout the website.
                </p>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button
                  type="button"
                  class="admin-tab-btn"
                  style="background:#2563eb;color:#fff;border:none;font-weight:700;padding:8px 14px;"
                  @click="handleAddAdminSponsor"
                >
                  ➕ Add Sponsor
                </button>
                <button
                  type="button"
                  class="done-modal-btn admin-save-btn"
                  style="padding:8px 18px;"
                  :disabled="isSavingSponsors"
                  @click="handleSaveAdminSponsors"
                >
                  <span>💾</span>
                  <span>{{ isSavingSponsors ? 'Saving...' : 'Save All Sponsors' }}</span>
                </button>
              </div>
            </div>

            <!-- Sponsor Grid -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:16px;">
              <div
                v-for="(sp, idx) in adminSponsorsForm"
                :key="sp.id"
                style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px;"
              >
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <strong style="font-size:13px;color:var(--text-main);">{{ sp.name || 'New Sponsor' }}</strong>
                  <button
                    type="button"
                    class="admin-back-text-btn"
                    style="color:#ef4444;font-size:11px;"
                    @click="handleRemoveAdminSponsor(idx)"
                  >
                    Remove
                  </button>
                </div>

                <div style="height:90px;background:#fff;border-radius:8px;overflow:hidden;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;padding:8px;">
                  <img v-if="sp.logoUrl" :src="sp.logoUrl" alt="Logo" style="max-width:100%;max-height:100%;object-fit:contain;" />
                  <span v-else style="color:#6b7280;font-size:11px;">No Logo</span>
                </div>

                <div>
                  <label class="modal-label" style="font-size:11px;">Company Name</label>
                  <input v-model="sp.name" type="text" placeholder="e.g. Trek Bicycle Store" class="custom-minutes-input" style="width:100%;font-size:12px;" />
                </div>

                <div>
                  <label class="modal-label" style="font-size:11px;">Logo Location in /images/ or URL</label>
                  <input v-model="sp.logoUrl" type="text" placeholder="/images/your-logo.png or https://..." class="custom-minutes-input" style="width:100%;font-size:12px;" />
                </div>

                <div>
                  <label class="modal-label" style="font-size:11px;">Website URL (Optional)</label>
                  <input v-model="sp.websiteUrl" type="url" placeholder="https://example.com" class="custom-minutes-input" style="width:100%;font-size:12px;" />
                </div>

                <div style="display:flex;gap:6px;">
                  <label class="admin-tab-btn" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:11px;cursor:pointer;">
                    <span>📁 Upload</span>
                    <input type="file" accept="image/*" class="sr-only" @change="handleSponsorLogoUpload(sp, $event)" />
                  </label>
                  <button
                    v-if="sp.logoUrl"
                    type="button"
                    class="admin-tab-btn"
                    style="font-size:11px;padding:6px 8px;"
                    title="Crop logo"
                    @click="openAdminCropper(sp.logoUrl, 'free', `Crop Logo: ${sp.name || 'Sponsor'}`, (c) => sp.logoUrl = c)"
                  >
                    ✂️ Crop
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

    </div>

    <!-- Interactive Admin Image Cropper Modal -->
    <ImageCropperModal
      :is-open="isCropperModalOpen"
      :image-src="cropperModalSrc"
      :aspect-ratio-preset="cropperModalAspect"
      :title="cropperModalTitle"
      @crop="handleAdminCropperResult"
      @close="isCropperModalOpen = false"
    />
  </div>
</template>

<style scoped>
.admin-page-container {
  min-height: 100vh;
  background: var(--bg-main, #0d0d0d);
  color: var(--text-main, #f3f4f6);
  font-family: 'Inter', sans-serif;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  box-sizing: border-box;
}

.admin-gate-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.admin-gate-card {
  max-width: 440px;
  width: 100%;
  background: var(--bg-card, #171717);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  padding: 32px 24px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.admin-back-text-btn {
  background: none;
  border: none;
  color: var(--text-muted, #9ca3af);
  font-size: 12.5px;
  cursor: pointer;
  padding: 4px 8px;
  text-decoration: underline;
  transition: color 0.15s ease;
}
.admin-back-text-btn:hover {
  color: var(--text-main, #ffffff);
}

.admin-dashboard-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
}

/* Combined Fixed Top Header (Nav + Tabs) - Locked to top like main page */
.admin-sticky-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 100;
  box-sizing: border-box;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.admin-top-nav {
  background: rgba(13, 13, 13, 0.96);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  padding: 10px 16px;
  width: 100%;
  box-sizing: border-box;
}

.admin-nav-inner {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  width: 100%;
  box-sizing: border-box;
}

.admin-nav-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  color: var(--text-main, #ffffff);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.admin-back-btn:hover {
  background: rgba(220, 38, 38, 0.15);
  border-color: rgba(220, 38, 38, 0.4);
  color: var(--accent-red, #ef4444);
}

.admin-brand-separator {
  color: var(--border, rgba(255, 255, 255, 0.2));
  font-weight: 300;
}

.admin-brand-box {
  display: flex;
  align-items: center;
  gap: 8px;
}
.admin-brand-icon {
  font-size: 20px;
}
.admin-brand-text {
  display: flex;
  flex-direction: column;
}
.admin-brand-title {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: var(--text-main, #ffffff);
  white-space: nowrap;
}
.admin-brand-sub {
  font-size: 10.5px;
  color: var(--text-muted, #9ca3af);
  white-space: nowrap;
}

.admin-nav-center {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 220px;
  justify-content: center;
}

.admin-scope-switcher {
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
  border-radius: 9999px;
  padding: 3px;
  gap: 3px;
}

.scope-pill-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #9ca3af);
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.scope-pill-btn:hover {
  color: var(--text-main, #ffffff);
  background: rgba(255, 255, 255, 0.06);
}
.scope-pill-btn.active {
  background: var(--accent-red, #dc2626);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.35);
}

.admin-race-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.admin-site-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.25);
  color: #60a5fa;
  white-space: nowrap;
}

.admin-race-label {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted, #9ca3af);
  letter-spacing: 0.5px;
  white-space: nowrap;
}
.admin-race-select {
  background: var(--bg-card, #171717);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  color: var(--text-main, #ffffff);
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  max-width: 280px;
  width: 100%;
}

.admin-nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.admin-subnav-tabs {
  background: var(--bg-surface, #141414);
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
}

.admin-tabs-scroller {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding: 6px 16px;
  scrollbar-width: none;
  max-width: 100%;
  box-sizing: border-box;
}
.admin-tabs-scroller::-webkit-scrollbar {
  display: none;
}

.admin-tab-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted, #9ca3af);
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.admin-tab-btn:hover {
  color: var(--text-main, #ffffff);
  background: rgba(255, 255, 255, 0.04);
}
.admin-tab-btn.active {
  color: #ffffff;
  background: var(--accent-red, #dc2626);
  border-color: #b91c1c;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}

.admin-page-body {
  flex: 1;
  padding: calc(var(--admin-header-height, 108px) + 20px) 16px 40px 16px;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  overflow-x: hidden;
}

.admin-body-container {
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.admin-context-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: 10px;
  margin-bottom: 20px;
  box-sizing: border-box;
}

.admin-context-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.context-scope-tag {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 3px 8px;
  border-radius: 5px;
  white-space: nowrap;
}
.context-scope-tag.race {
  background: rgba(220, 38, 38, 0.16);
  color: #f87171;
  border: 1px solid rgba(220, 38, 38, 0.3);
}
.context-scope-tag.site {
  background: rgba(59, 130, 246, 0.16);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.context-separator {
  color: var(--border, rgba(255, 255, 255, 0.2));
  font-weight: 300;
}

.context-target-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main, #ffffff);
}

.admin-context-right {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.context-pill {
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.context-pill.race {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted, #9ca3af);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.context-pill.site {
  background: rgba(59, 130, 246, 0.1);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.admin-section-card {
  background: var(--bg-card, #171717);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.admin-card-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-main, #ffffff);
  letter-spacing: -0.2px;
}

.drag-handle {
  cursor: grab;
  color: var(--text-muted);
  font-size: 16px;
  line-height: 1;
  user-select: none;
  padding: 3px 5px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease, background 0.15s ease;
}
.drag-handle:hover {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.08);
}
.drag-handle:active {
  cursor: grabbing;
}
.drag-row {
  transition: border-color 0.15s ease, background 0.15s ease, opacity 0.15s ease;
  max-width: 100%;
  box-sizing: border-box;
}

@media (max-width: 640px) {
  .admin-top-nav {
    padding: 8px 10px;
  }
  .admin-nav-inner {
    gap: 8px;
  }
  .admin-nav-left {
    gap: 6px;
  }
  .admin-back-btn {
    padding: 5px 8px;
  }
  .back-text {
    display: none;
  }
  .action-btn-text {
    display: none;
  }
  .admin-brand-separator {
    display: none;
  }
  .admin-brand-icon {
    display: none;
  }
  .admin-brand-title {
    font-size: 11px;
    letter-spacing: 0;
  }
  .admin-brand-sub {
    display: none;
  }
  .admin-nav-center {
    order: 3;
    width: 100%;
    min-width: 0;
    justify-content: stretch;
    margin-top: 2px;
  }
  .admin-race-select {
    max-width: 100%;
    flex: 1;
  }
  .admin-tabs-scroller {
    padding: 6px 10px;
  }
  .admin-page-body {
    padding: calc(var(--admin-header-height, 130px) + 14px) 8px 30px 8px;
  }
  .admin-section-card {
    padding: 14px 10px;
    border-radius: 8px;
  }
  .date-range-grid {
    grid-template-columns: 1fr !important;
  }
  /* Prevent inputs and cards from pushing past mobile viewport */
  .admin-section-card input:not(.wave-time-input),
  .admin-section-card select,
  .admin-section-card textarea {
    max-width: 100%;
    box-sizing: border-box;
  }
  .admin-scope-switcher {
    width: 100%;
    justify-content: center;
  }
  .scope-pill-btn {
    flex: 1;
    justify-content: center;
    padding: 6px 10px;
    font-size: 11.5px;
  }
  .admin-context-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 14px;
  }
}

.wave-time-input {
  width: 108px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 700;
  padding: 4px 6px;
  text-align: center;
  color-scheme: dark;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  cursor: pointer;
  box-sizing: border-box;
}
.wave-time-input::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.8;
  filter: invert(0.8);
}
:root.theme-light .wave-time-input,
.theme-light .wave-time-input,
:root[data-theme="light"] .wave-time-input {
  background: #ffffff;
  color: #0f172a;
  border-color: #cbd5e1;
  color-scheme: light;
}
:root.theme-light .wave-time-input::-webkit-calendar-picker-indicator,
.theme-light .wave-time-input::-webkit-calendar-picker-indicator,
:root[data-theme="light"] .wave-time-input::-webkit-calendar-picker-indicator {
  filter: none;
}
.wave-time-input:focus {
  outline: none;
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

.wave-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #f87171;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.wave-add-btn:hover {
  background: rgba(239, 68, 68, 0.25);
  border-color: #ef4444;
  color: #ffffff;
}
:root.theme-light .wave-add-btn,
.theme-light .wave-add-btn,
:root[data-theme="light"] .wave-add-btn {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.3);
  color: #dc2626;
}
:root.theme-light .wave-add-btn:hover,
.theme-light .wave-add-btn:hover,
:root[data-theme="light"] .wave-add-btn:hover {
  background: #dc2626;
  color: #ffffff;
}

.wave-del-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #f87171;
  border-radius: 6px;
  padding: 4px 9px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.wave-del-btn:hover {
  background: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
}
:root.theme-light .wave-del-btn,
.theme-light .wave-del-btn,
:root[data-theme="light"] .wave-del-btn {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.25);
  color: #dc2626;
}
:root.theme-light .wave-del-btn:hover,
.theme-light .wave-del-btn:hover,
:root[data-theme="light"] .wave-del-btn:hover {
  background: #dc2626;
  color: #ffffff;
}
</style>
