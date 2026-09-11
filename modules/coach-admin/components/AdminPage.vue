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
  MONTH_MAP
} from '~/modules/results/services/raceresultService'
import { type TeamUserItem } from '~/modules/coach-admin/composables/useCoachAuth'
import CustomDatePicker from './CustomDatePicker.vue'

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

const activeTab = ref(props.initialTab || 'venue')

watch(() => props.initialTab, (newTab) => {
  if (newTab) activeTab.value = newTab
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
  if (!form.value.schedule) {
    form.value.schedule = []
  }
  if (!form.value.signups) {
    form.value.signups = { volunteer: '', food: '', league: '', photos: '' }
  }
  if (!form.value.guidelines) {
    form.value.guidelines = []
  }
  updateDateRangeFromForm()
  initWarmupGroups()
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
const userSortField = ref<'name' | 'email' | 'role' | 'date'>('name')
const userSortOrder = ref<'asc' | 'desc'>('asc')

const toggleUserSort = (field: 'name' | 'email' | 'role' | 'date') => {
  if (userSortField.value === field) {
    userSortOrder.value = userSortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    userSortField.value = field
    userSortOrder.value = 'asc'
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
  const res = await updateUserRole(userItem.email, newRole, userItem.uid)
  if (res.success) {
    const roleLabel = newRole === 'admin' ? 'Coach Admin' : (newRole === 'guardian' ? 'Guardian' : 'Coach')
    emit('toast', `🔄 Updated ${userItem.name || userItem.email} to ${roleLabel}`)
  } else {
    emit('toast', `⛔ ${res.error || 'Failed to update access'}`)
  }
}

const handleRemoveUser = async (userItem: TeamUserItem) => {
  if (confirm(`Are you sure you want to remove access for ${userItem.name || userItem.email}?`)) {
    const res = await removeCoachAdmin(userItem.email, userItem.uid)
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
  if (form.value.warmupGroups) {
    if (!form.value.coachSignups) {
      form.value.coachSignups = { policy: '', preRides: [], warmups: [] }
    }
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

// Pre-ride wave helpers
const newPreRideSlot = ref<CoachSlot>({
  id: '',
  name: '',
  meetingTime: '2:00 PM - 3:00 PM',
  ridersAllowed: '',
  duration: '60 min',
  day: 'Saturday',
  date: 'Sept 5',
  subtitle: 'North Conference',
  tag: 'Open Pre-Ride',
  tagClass: 'tag-preride',
  leaders: [],
  support: []
})

const addPreRideSlot = () => {
  if (!newPreRideSlot.value.name) return
  if (!form.value.coachSignups) {
    form.value.coachSignups = { policy: '', preRides: [], warmups: [] }
  }
  if (!form.value.coachSignups.preRides) {
    form.value.coachSignups.preRides = []
  }
  form.value.coachSignups.preRides.push({
    ...newPreRideSlot.value,
    id: `pr-${Date.now()}`
  })
  newPreRideSlot.value = {
    id: '',
    name: '',
    meetingTime: '2:00 PM - 3:00 PM',
    ridersAllowed: '',
    duration: '60 min',
    day: 'Saturday',
    date: 'Sept 5',
    subtitle: 'North Conference',
    tag: 'Open Pre-Ride',
    tagClass: 'tag-preride',
    leaders: [],
    support: []
  }
}

const removePreRideSlot = (idx: number) => {
  form.value.coachSignups?.preRides?.splice(idx, 1)
}

// Drag reordering for Pre-Rides
const draggedPreRideIdx = ref<number | null>(null)
const preRideDragOverIdx = ref<number | null>(null)
const onPreRideDragStart = (idx: number, e: DragEvent) => {
  draggedPreRideIdx.value = idx
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
const onPreRideDragOver = (idx: number, e: DragEvent) => {
  e.preventDefault()
  if (draggedPreRideIdx.value === null || draggedPreRideIdx.value === idx) return
  preRideDragOverIdx.value = idx
}
const onPreRideDrop = (idx: number, e: DragEvent) => {
  e.preventDefault()
  const from = draggedPreRideIdx.value
  const to = idx
  if (draggedPreRideIdx.value === null || !form.value.coachSignups?.preRides) return
  if (from !== null && to !== null) {
    if (from !== to && form.value.coachSignups.preRides[from] !== undefined) {
      const item = form.value.coachSignups.preRides.splice(from, 1)[0]
      form.value.coachSignups.preRides.splice(to, 0, item)
    }
  }
  draggedPreRideIdx.value = null
  preRideDragOverIdx.value = null
}
const onPreRideDragEnd = () => {
  draggedPreRideIdx.value = null
  preRideDragOverIdx.value = null
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

const getSlotStart = (meetingTime?: string) => {
  if (!meetingTime) return ''
  const parts = meetingTime.split(/\s*[-–—]\s*|\s+to\s+/i)
  return parts[0]?.trim() || ''
}

const getSlotEnd = (meetingTime?: string) => {
  if (!meetingTime) return ''
  const parts = meetingTime.split(/\s*[-–—]\s*|\s+to\s+/i)
  return parts.length >= 2 ? parts[1]?.trim() || '' : ''
}

const setSlotStart = (slot: CoachSlot, newStart: string) => {
  const end = getSlotEnd(slot.meetingTime)
  if (end) {
    slot.meetingTime = `${newStart} - ${end}`
  } else {
    slot.meetingTime = newStart || end || '8:00 AM'
  }
}

const setSlotEnd = (slot: CoachSlot, newEnd: string) => {
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
      
      <!-- Top Sticky Navigation Bar -->
      <header class="admin-top-nav">
        <div class="admin-nav-inner">
          <div class="admin-nav-left">
            <button
              type="button"
              class="admin-back-btn"
              title="Return to public race dashboard"
              @click="emit('back')"
            >
              <span>←</span>
              <span class="back-text">Back to Race Central</span>
            </button>

            <div class="admin-brand-separator">|</div>

            <div class="admin-brand-box">
              <span class="admin-brand-icon">⚙️</span>
              <div class="admin-brand-text">
                <span class="admin-brand-title">COACH ADMIN PORTAL</span>
                <span class="admin-brand-sub">{{ user?.email }}</span>
              </div>
            </div>
          </div>

          <!-- Active Race Switcher -->
          <div class="admin-nav-center">
            <label class="admin-race-label">Active Race:</label>
            <select
              :value="currentRaceIndex"
              class="admin-race-select"
              @change="selectRace(Number(($event.target as HTMLSelectElement).value))"
            >
              <option v-for="(r, idx) in races" :key="r.id" :value="idx">{{ r.name }}</option>
            </select>
          </div>

          <!-- Top Actions (Lock + Save) -->
          <div class="admin-nav-right">
            <button
              type="button"
              class="admin-lock-btn"
              title="Lock editing and return to viewer mode"
              @click="handleLockAdmin"
            >
              <span>🔒</span>
              <span class="action-btn-text">Lock Admin</span>
            </button>

            <button
              type="button"
              class="done-modal-btn admin-save-btn"
              style="padding:7px 16px;font-size:13px;display:inline-flex;align-items:center;gap:6px;"
              @click="handleSave"
            >
              <span>💾</span>
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Tab Navigation Strip -->
      <nav class="admin-subnav-tabs">
        <div class="admin-tabs-scroller">
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'venue' }" @click="activeTab = 'venue'">📍 Venue Info</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'schedule' }" @click="activeTab = 'schedule'">⏱️ Schedule</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'waves' || activeTab === 'coach' }" @click="activeTab = 'waves'">⏱️ Waves & Warm-ups</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'signups' }" @click="activeTab = 'signups'">🤝 Volunteers & Food</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'photos' }" @click="activeTab = 'photos'">📸 Photos Album</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'maps' }" @click="activeTab = 'maps'">🗺️ Course Maps</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'announcements' }" @click="activeTab = 'announcements'">📢 Guidelines</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'coaches' || activeTab === 'users' }" @click="activeTab = 'coaches'">
            👥 Team Admins & Users ({{ allUsersList.length }})
          </button>
        </div>
      </nav>

      <!-- Main Body Container -->
      <main class="admin-page-body">
        <div class="admin-body-container">

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
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;">
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
                  <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:240px;">
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
                      style="flex:1;min-width:140px;"
                      draggable="false"
                      @dragstart.stop
                    >
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;">
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
                        <select
                          :value="getEventStart(ev.time)"
                          class="custom-minutes-input"
                          style="padding:2px 4px;font-size:11px;height:26px;width:94px;background:var(--bg-subtle);"
                          @change="onStartChange(ev, ($event.target as HTMLSelectElement).value)"
                        >
                          <option value="TBD">TBD</option>
                          <option v-if="getEventStart(ev.time) && !TIME_OPTIONS.includes(getEventStart(ev.time)) && getEventStart(ev.time) !== 'TBD'" :value="getEventStart(ev.time)">
                            {{ getEventStart(ev.time) }}
                          </option>
                          <option v-for="t in TIME_OPTIONS" :key="t" :value="t">{{ t }}</option>
                        </select>

                        <span style="font-size:10.5px;color:var(--text-muted);">to</span>
                        <select
                          :value="getEventEnd(ev.time)"
                          class="custom-minutes-input"
                          style="padding:2px 4px;font-size:11px;height:26px;width:94px;background:var(--bg-subtle);"
                          @change="onEndChange(ev, ($event.target as HTMLSelectElement).value)"
                        >
                          <option value="">-- None --</option>
                          <option v-if="getEventEnd(ev.time) && !TIME_OPTIONS.includes(getEventEnd(ev.time))" :value="getEventEnd(ev.time)">
                            {{ getEventEnd(ev.time) }}
                          </option>
                          <option v-for="t in TIME_OPTIONS" :key="t" :value="t">{{ t }}</option>
                        </select>
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
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
              <div>
                <h3 class="admin-card-title" style="margin:0;">🔥 Race-Day Warm-up Groups & Waves</h3>
                <div style="font-size:11.5px;color:var(--text-muted);">Assign categories to unified warm-up groups. Staging and gun start times are calculated automatically.</div>
              </div>
              <div style="display:flex;gap:6px;align-items:center;">
                <button type="button" class="action-mini-btn" style="padding:6px 12px;font-size:12px;font-weight:700;" @click="autoConfigureAllGroups">
                  ⚡ Auto-Calculate Times
                </button>
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
                  <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:240px;">
                    <span class="drag-handle" title="Drag to reorder">⠿</span>
                    <input v-model="grp.name" type="text" placeholder="Group Name" class="custom-minutes-input" style="flex:2;min-width:160px;font-weight:700;" draggable="false" @dragstart.stop>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;" draggable="false" @dragstart.stop>
                    <div style="display:flex;align-items:center;gap:4px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);padding:2px 6px;border-radius:6px;">
                      <span style="font-size:11px;font-weight:700;color:#f59e0b;">🔥 Warm-up Time:</span>
                      <select v-model="grp.meetingTime" class="custom-minutes-input" style="font-size:11px;height:26px;padding:1px 4px;font-weight:700;color:#f59e0b;">
                        <option v-for="t in getWarmupTimeOptions(grp)" :key="t" :value="t">{{ t }}</option>
                      </select>
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

          <!-- 4. Volunteers & Food Tab -->
          <div v-else-if="activeTab === 'signups'" class="admin-section-card">
            <h3 class="admin-card-title">🤝 Volunteer Signups & Meal Planning</h3>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div>
                <label class="modal-label">Team Volunteers Signup Code or URL</label>
                <input v-model="form.signups!.volunteer" type="text" placeholder="https://signup.com/client/invitation2/secure/..." class="custom-minutes-input" style="width:100%;">
              </div>
              <div>
                <label class="modal-label">Food & Hospitality Signup Code or URL</label>
                <input v-model="form.signups!.food" type="text" placeholder="https://signup.com/client/invitation2/secure/..." class="custom-minutes-input" style="width:100%;">
              </div>
              <div>
                <label class="modal-label">Wisconsin League Volunteer Code or URL</label>
                <input v-model="form.signups!.league" type="text" placeholder="https://signup.com/client/invitation2/secure/..." class="custom-minutes-input" style="width:100%;">
              </div>
            </div>
          </div>

          <!-- 5. Photos Album Tab -->
          <div v-else-if="activeTab === 'photos'" class="admin-section-card">
            <h3 class="admin-card-title">📸 Photos Album</h3>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div>
                <label class="modal-label">Google Photos Shared Album URL</label>
                <input v-model="form.photosUrl" type="text" placeholder="https://photos.app.goo.gl/..." class="custom-minutes-input" style="width:100%;">
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
                  <span style="font-size:11.5px;font-weight:700;color:#60a5fa;min-width:110px;">Coach Invite:</span>
                  <div style="flex:1;min-width:220px;display:flex;align-items:center;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-family:monospace;font-size:11.5px;color:var(--text-main);overflow-x:auto;white-space:nowrap;">
                    {{ coachInviteUrl }}
                  </div>
                  <button type="button" class="action-mini-btn" style="padding:5px 12px;font-size:11.5px;" @click="copyCoachLink">
                    {{ copiedCoach ? '✓ Copied' : '📋 Copy Link' }}
                  </button>
                </div>

                <!-- Guardian Invite Link -->
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  <span style="font-size:11.5px;font-weight:700;color:#c084fc;min-width:110px;">Guardian Invite:</span>
                  <div style="flex:1;min-width:220px;display:flex;align-items:center;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-family:monospace;font-size:11.5px;color:var(--text-main);overflow-x:auto;white-space:nowrap;">
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
                  style="flex:2;min-width:180px;"
                >
                <input
                  v-model="newCoachName"
                  type="text"
                  placeholder="Admin Name (Optional)"
                  class="custom-minutes-input"
                  style="flex:1.5;min-width:140px;"
                >
                <button
                  type="button"
                  class="done-modal-btn admin-save-btn"
                  style="padding:8px 18px;white-space:nowrap;"
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
                <div style="display:flex;align-items:center;gap:20px;">
                  <span style="cursor:pointer;user-select:none;display:inline-flex;align-items:center;gap:4px;" @click="toggleUserSort('role')">
                    Role / Access {{ userSortField === 'role' ? (userSortOrder === 'asc' ? '▲' : '▼') : '' }}
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
                  <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:240px;">
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

                    <div style="min-width:0;">
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
                      <div style="font-size:11.5px;color:var(--text-muted);display:flex;align-items:center;gap:8px;margin-top:2px;">
                        <span>{{ u.email }}</span>
                        <span v-if="u.phone" style="opacity:0.8;">• 📞 {{ u.phone }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Right: Interactive Role Dropdown + Remove action -->
                  <div style="display:flex;align-items:center;gap:10px;margin-left:auto;">
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

        </div>
      </main>

    </div>

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
}

.admin-top-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(13, 13, 13, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  padding: 10px 16px;
}

.admin-nav-inner {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
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
}
.admin-brand-sub {
  font-size: 10.5px;
  color: var(--text-muted, #9ca3af);
}

.admin-nav-center {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 220px;
  justify-content: center;
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
}

.admin-subnav-tabs {
  background: var(--bg-surface, #141414);
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  position: sticky;
  top: 57px;
  z-index: 90;
}

.admin-tabs-scroller {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding: 6px 16px;
  scrollbar-width: none;
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
  padding: 24px 16px;
}

.admin-body-container {
  max-width: 1280px;
  margin: 0 auto;
}

.admin-section-card {
  background: var(--bg-card, #171717);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
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
}

@media (max-width: 640px) {
  .back-text {
    display: none;
  }
  .action-btn-text {
    display: none;
  }
  .admin-brand-sub {
    display: none;
  }
  .admin-section-card {
    padding: 16px;
  }
}
</style>
