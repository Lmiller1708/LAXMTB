<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import type { Race, CoachSlot, WarmupGroup } from '../types/race'
import { useCurrentRace, isRaceCompleted } from '../composables/useCurrentRace'
import { useCoachAuth } from '~/modules/coach-admin/composables/useCoachAuth'
import {
  getCategoryStartTime,
  getCategoryStageTime,
  getCategoryStartTimeMinutes,
  calculateEarliestGroupStageTime,
  parseTimeStrToMinutes,
  formatMinutesToTimeStr,
  normalizeCategoryName,
  targetTeamKeywords
} from '~/modules/results/services/raceresultService'
import { readFromStorageCache } from '~/modules/results/composables/useRaceResults'
import { getFallbackSeedResults } from '~/modules/results/services/fallbackResultsService'
import { useNotificationSubscriptions } from '~/modules/notifications/composables/useNotificationSubscriptions'

type SessionKey = 'pr' | 'wu'

const props = defineProps<{
  race: Race
  riders?: any[]
  isCoachAuth?: boolean
  initialSession?: 'pr' | 'wu'
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'openAuth'): void
  (e: 'changeSession', session: 'pr' | 'wu'): void
}>()

const { updateRace, updateCoachSignups } = useCurrentRace()
const {
  user,
  userProfile,
  userPhoto,
  isAdminCoach,
  canEditCoachSignups,
  coachAvatarMap,
  fetchCoachAvatars
} = useCoachAuth()

const isEventCompleted = computed(() => isRaceCompleted(props.race))
const isSignupsClosed = computed(() => isEventCompleted.value)
const canEditSignupsActive = computed(() => canEditCoachSignups.value && !isSignupsClosed.value)

onMounted(() => {
  fetchCoachAvatars()
})
const {
  subscribeRideGroup,
  unsubscribeRideGroup,
  toggleRideGroupSubscription,
  isRideGroupSubscribed
} = useNotificationSubscriptions()

const isOpen = ref(true)
const activeSession = ref<SessionKey>(props.initialSession || 'pr')

watch(() => props.initialSession, (newVal) => {
  if (newVal && (newVal === 'pr' || newVal === 'wu')) {
    activeSession.value = newVal
  }
})

const selectSession = (sess: SessionKey) => {
  activeSession.value = sess
  emit('changeSession', sess)
}

// Inline input state
const activeInputSlotId = ref<string | null>(null)
const activeInputRole = ref<'leader' | 'support' | null>(null)
const inlineNameInput = ref('')
const inlineInputRef = ref<HTMLInputElement | null>(null)

const coachData = computed(() => props.race.coachSignups)

const preRideSlots = computed<CoachSlot[]>(() => {
  return coachData.value?.preRides || []
})

const warmupSlots = computed<any[]>(() => {
  if (props.race.warmupGroups && props.race.warmupGroups.length > 0) {
    return props.race.warmupGroups.map(group => {
      const signupSlot = coachData.value?.warmups?.find(w => w.id === group.id)
      return {
        ...group,
        leaders: signupSlot?.leaders ?? group.leaders ?? [],
        support: signupSlot?.support ?? group.support ?? []
      }
    })
  }
  return coachData.value?.warmups || []
})

const getSlotCategories = (slot: any): string[] => {
  if (Array.isArray(slot.categories)) return slot.categories
  return []
}

// Effective riders resolved from props or offline storage/fixtures
const effectiveRiders = computed(() => {
  if (props.riders && props.riders.length > 0) {
    return props.riders
  }
  if (!props.race?.eventId) return []
  const eventId = String(props.race.eventId)
  const cached = readFromStorageCache(eventId, 'list') || getFallbackSeedResults(eventId, 'list')
  if (cached?.riders && cached.riders.length > 0) {
    const teamOnly = cached.riders.filter((r: any) =>
      targetTeamKeywords.some((kw: string) => (r.team || '').toLowerCase().includes(kw))
    )
    return teamOnly.length > 0 ? teamOnly : cached.riders
  }
  return []
})

const canonicalCategoryName = (name: string): string => {
  if (!name) return ''
  const lower = name.toLowerCase().trim()
  const isGirl = lower.includes('girl')
  const isBoy = lower.includes('boy')
  const gender = isGirl ? 'Girls' : (isBoy ? 'Boys' : '')

  let div = ''
  if (lower.includes('varsity')) div = 'Varsity'
  else if (/\bjv\s*(iii|3)\b/i.test(lower)) div = 'JV III'
  else if (/\bjv\s*(ii|2)\b/i.test(lower)) div = 'JV II'
  else if (/\b(freshman|9th)\b/i.test(lower)) div = 'Freshman'
  else if (/\bms2\b/i.test(lower)) div = 'MS2'
  else if (/\b8th\b/i.test(lower)) div = '8th Grade'
  else if (/\b7th\b/i.test(lower)) div = '7th Grade'
  else if (/\b6th\b/i.test(lower)) div = '6th Grade'
  else if (/\b(hs\s*open|hso)\b/i.test(lower)) div = 'HS Open'

  return div && gender ? `${div} ${gender}` : normalizeCategoryName(name).trim()
}

const getSlotCanonicalCategories = (slot: any): string[] => {
  if (Array.isArray(slot.categories) && slot.categories.length > 0) {
    return slot.categories.map((c: string) => canonicalCategoryName(c)).filter(Boolean)
  }

  // Fallback parsing from name / ridersAllowed only if slot.categories is empty
  const text = `${slot.ridersAllowed || ''} ${slot.name || ''}`.toLowerCase()
  const isGirl = text.includes('girl')
  const isBoy = text.includes('boy')
  const genders: string[] = []
  if (isGirl) genders.push('Girls')
  if (isBoy) genders.push('Boys')
  if (genders.length === 0) genders.push('Boys', 'Girls')

  const divs: string[] = []
  if (text.includes('varsity')) divs.push('Varsity')
  if (/\bjv\s*(iii|3)\b/i.test(text)) divs.push('JV III')
  if (/\bjv\s*(ii|2)\b/i.test(text)) divs.push('JV II')
  if (/\b(freshman|9th)\b/i.test(text)) divs.push('Freshman')
  if (/\bms2\b/i.test(text)) divs.push('MS2')
  if (/\b8th\b/i.test(text)) divs.push('8th Grade')
  if (/\b7th\b/i.test(text)) divs.push('7th Grade')
  if (/\b6th\b/i.test(text)) divs.push('6th Grade')
  if (/\b(hs\s*open|hso)\b/i.test(text)) divs.push('HS Open')

  const result: string[] = []
  for (const d of divs) {
    for (const g of genders) {
      result.push(`${d} ${g}`)
    }
  }
  return result
}

const matchCategoryToSlot = (catName: string, slot: any): boolean => {
  if (!catName || !slot) return false
  const riderCat = canonicalCategoryName(catName).toLowerCase()
  const slotCats = getSlotCanonicalCategories(slot)
  return slotCats.some(sc => sc.toLowerCase() === riderCat)
}

const getSlotRiders = (slot: any): any[] => {
  if (!slot || !effectiveRiders.value || effectiveRiders.value.length === 0) return []
  return effectiveRiders.value.filter((r: any) => matchCategoryToSlot(r.category, slot))
}

const getSlotRiderCount = (slot: any): number => {
  return getSlotRiders(slot).length
}

const getSlotRiderTooltip = (slot: any): string => {
  const count = getSlotRiderCount(slot)
  return `${count} team rider${count === 1 ? '' : 's'}`
}

const getCatStart = (cat: string) => getCategoryStartTime(props.race, cat)
const getCatStage = (cat: string) => getCategoryStageTime(props.race, cat)

const getSlotStartTime = (slot: any): string | null => {
  if (slot.startTime) return slot.startTime

  const cats = getSlotCategories(slot)
  if (cats && cats.length > 0) {
    let earliestMins: number | null = null
    let earliestStr: string | null = null
    for (const cat of cats) {
      const startStr = getCatStart(cat)
      if (startStr) {
        const mins = getCategoryStartTimeMinutes(props.race, cat)
        if (mins !== 9999 && (earliestMins === null || mins < earliestMins)) {
          earliestMins = mins
          earliestStr = startStr
        }
      }
    }
    if (earliestStr) return earliestStr
  }

  if (slot.stagingTime) {
    const stageMins = parseTimeStrToMinutes(slot.stagingTime)
    if (stageMins !== null) {
      const offset = (props.race && typeof props.race.stagingOffsetMinutes === 'number')
        ? props.race.stagingOffsetMinutes
        : 15
      return formatMinutesToTimeStr(stageMins + offset)
    }
  }

  return null
}

const getSlotStagingTime = (slot: any): string | null => {
  const cats = getSlotCategories(slot)
  if (cats && cats.length > 0) {
    const earliestCatStage = calculateEarliestGroupStageTime(props.race, cats)
    if (earliestCatStage) return earliestCatStage
  }

  if (slot.stagingTime && typeof slot.stagingTime === 'string' && slot.stagingTime.trim() !== '') {
    return slot.stagingTime
  }

  const startStr = getSlotStartTime(slot)
  if (startStr) {
    const startMins = parseTimeStrToMinutes(startStr)
    if (startMins !== null) {
      const offset = (props.race && typeof props.race.stagingOffsetMinutes === 'number')
        ? props.race.stagingOffsetMinutes
        : 15
      return formatMinutesToTimeStr(startMins - offset)
    }
  }

  return null
}

interface DayGroup {
  day: string
  date: string
  subtitle: string
  isRaceDay: boolean
  slots: any[]
}

const activeDayGroups = computed<DayGroup[]>(() => {
  const rawSlots = activeSession.value === 'pr' ? preRideSlots.value : warmupSlots.value
  if (!rawSlots || rawSlots.length === 0) return []

  const groups: DayGroup[] = []
  const groupMap: Record<string, DayGroup> = {}

  rawSlots.forEach((slot) => {
    const dayKey = slot.day || (activeSession.value === 'pr' ? 'Saturday' : 'Sunday')

    // Dynamically look up matching day from props.race.schedule so edits in Admin Schedule are immediately reflected
    const matchingDay = (props.race?.schedule || []).find((d: any) =>
      d.day && d.day.toLowerCase().trim() === dayKey.toLowerCase().trim()
    )

    const dateKey = matchingDay?.date || slot.date || ''
    // NEVER fall back to hardcoded "North Conference • Race Day" or "South Conference"
    const subtitle = (matchingDay?.subtitle !== undefined ? matchingDay.subtitle : slot.subtitle) || ''
    const isRaceDay = matchingDay?.isRaceDay ?? (dayKey.toLowerCase().includes('sun'))

    if (!groupMap[dayKey]) {
      groupMap[dayKey] = {
        day: dayKey,
        date: dateKey,
        subtitle: subtitle.trim(),
        isRaceDay,
        slots: []
      }
      groups.push(groupMap[dayKey])
    }
    groupMap[dayKey].slots.push(slot)
  })

  return groups
})

const splitTime = (timeStr?: string) => {
  if (!timeStr) return { start: '', end: '' }
  const parts = timeStr.split(/\s*[-–—]\s*|\s+to\s+/i)
  if (parts.length >= 2) {
    return { start: parts[0].trim(), end: parts[1].trim() }
  }
  return { start: timeStr.trim(), end: '' }
}

// Collapsible state for individual slot cards (collapsed by default for clean scannable view)
const expandedSlotIds = ref<Record<string, boolean>>({})

const isSlotExpanded = (slotId: string): boolean => {
  if (activeInputSlotId.value === slotId) return true
  return !!expandedSlotIds.value[slotId]
}

const toggleSlotCollapse = (slotId: string) => {
  expandedSlotIds.value[slotId] = !isSlotExpanded(slotId)
}

const areAllSlotsExpanded = computed(() => {
  const currentSlots = activeSession.value === 'pr' ? preRideSlots.value : warmupSlots.value
  if (!currentSlots || currentSlots.length === 0) return false
  return currentSlots.every(s => expandedSlotIds.value[s.id])
})

const toggleAllSlots = () => {
  const currentSlots = activeSession.value === 'pr' ? preRideSlots.value : warmupSlots.value
  if (!currentSlots || currentSlots.length === 0) return
  const nextState = !areAllSlotsExpanded.value
  const map: Record<string, boolean> = {}
  currentSlots.forEach(s => {
    map[s.id] = nextState
  })
  expandedSlotIds.value = map
}

const startInlineInput = (slotId: string, role: 'leader' | 'support') => {
  if (isSignupsClosed.value) return
  if (!canEditCoachSignups.value) {
    emit('openAuth')
    return
  }
  expandedSlotIds.value[slotId] = true
  activeInputSlotId.value = slotId
  activeInputRole.value = role
  inlineNameInput.value = ''
  nextTick(() => {
    const inputEl = (document.querySelector(`.inline-field-${slotId}-${role}`) as HTMLInputElement)
      || inlineInputRef.value
      || (document.querySelector('.inline-name-field') as HTMLInputElement)
    if (inputEl) {
      inputEl.focus()
      inputEl.select()
    }
  })
}

const cancelInlineInput = () => {
  activeInputSlotId.value = null
  activeInputRole.value = null
  inlineNameInput.value = ''
}

const getMyName = computed(() => {
  return userProfile.value?.name || user.value?.displayName || user.value?.email?.split('@')[0] || 'Coach'
})

const userInitials = computed(() => {
  const n = getMyName.value || 'C'
  const parts = n.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return n.slice(0, 2).toUpperCase()
})

const getCoachName = (item: any): string => {
  if (!item) return ''
  return typeof item === 'object' ? (item.name || '') : String(item)
}

const getCoachPhoto = (item: any): string => {
  if (typeof item === 'object' && item.photoURL) return item.photoURL
  const name = getCoachName(item).toLowerCase().trim()
  if (!name) return ''
  if (name === getMyName.value.toLowerCase().trim() && userPhoto.value) {
    return userPhoto.value
  }
  if (coachAvatarMap.value[name]) {
    return coachAvatarMap.value[name]
  }
  return ''
}

const getCoachInitials = (item: any): string => {
  const name = getCoachName(item)
  if (!name) return 'C'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const hasCoach = (list: any[] | undefined, name: string): boolean => {
  if (!list || !name) return false
  const clean = name.toLowerCase().trim()
  return list.some(item => getCoachName(item).toLowerCase().trim() === clean)
}

const isMeSignedUp = (slot: any, role: 'leader' | 'support'): boolean => {
  if (!user.value) return false
  const myName = getMyName.value.toLowerCase().trim()
  if (!myName) return false
  const list = role === 'leader' ? (slot.leaders || []) : (slot.support || [])
  return hasCoach(list, myName)
}

const isCurrentUserSignedUpForSlot = (slot: any): boolean => {
  return isMeSignedUp(slot, 'leader') || isMeSignedUp(slot, 'support')
}

const addMeQuick = async (slot: any, role: 'leader' | 'support') => {
  if (isSignupsClosed.value) return
  if (!canEditCoachSignups.value) {
    emit('openAuth')
    return
  }
  const name = getMyName.value
  if (!name) return
  const item: { name: string; photoURL?: string } = { name }
  if (userPhoto.value) {
    item.photoURL = userPhoto.value
  }
  await saveCoachName(slot, role, item)
  cancelInlineInput()
}

const submitInlineName = async (slot: any, role: 'leader' | 'support') => {
  if (isSignupsClosed.value) return
  const val = inlineNameInput.value.trim()
  if (!val) {
    cancelInlineInput()
    return
  }
  const photo = val.toLowerCase() === getMyName.value.toLowerCase()
    ? userPhoto.value
    : coachAvatarMap.value[val.toLowerCase()]
  const item: { name: string; photoURL?: string } = { name: val }
  if (photo) {
    item.photoURL = photo
  }
  await saveCoachName(slot, role, item)
  cancelInlineInput()
}

const saveCoachName = async (slot: any, role: 'leader' | 'support', itemToSave: any) => {
  if (isSignupsClosed.value) return
  const name = getCoachName(itemToSave)
  const updatedRace = JSON.parse(JSON.stringify(props.race)) as Race
  if (!updatedRace.coachSignups) {
    updatedRace.coachSignups = { policy: '', preRides: [], warmups: [] }
  }
  if (!updatedRace.coachSignups.preRides) {
    updatedRace.coachSignups.preRides = []
  }
  if (!updatedRace.coachSignups.warmups) {
    updatedRace.coachSignups.warmups = []
  }

  // Sanitize itemToSave so NO undefined property is ever passed
  const cleanItem = typeof itemToSave === 'object'
    ? {
        name: itemToSave.name || name,
        ...(itemToSave.photoURL ? { photoURL: itemToSave.photoURL } : {})
      }
    : { name: String(itemToSave) }

  // Update in coachSignups.preRides / coachSignups.warmups
  const list = activeSession.value === 'pr'
    ? updatedRace.coachSignups.preRides
    : updatedRace.coachSignups.warmups

  let targetSlot = list?.find(s => s.id === slot.id)
  if (!targetSlot) {
    // If slot was not yet in array, clone from slot props and add to list
    targetSlot = JSON.parse(JSON.stringify(slot))
    targetSlot.leaders = targetSlot.leaders || []
    targetSlot.support = targetSlot.support || []
    list.push(targetSlot)
  }

  if (role === 'leader') {
    if (!targetSlot.leaders) targetSlot.leaders = []
    if (!hasCoach(targetSlot.leaders, name)) {
      targetSlot.leaders.push(cleanItem)
    }
  } else {
    if (!targetSlot.support) targetSlot.support = []
    if (!hasCoach(targetSlot.support, name)) {
      targetSlot.support.push(cleanItem)
    }
  }

  // Also update in updatedRace.warmupGroups if applicable (ADMINS ONLY)
  if (isAdminCoach.value && activeSession.value === 'wu' && updatedRace.warmupGroups) {
    const wgSlot = updatedRace.warmupGroups.find(w => w.id === slot.id)
    if (wgSlot) {
      if (role === 'leader') {
        if (!wgSlot.leaders) wgSlot.leaders = []
        if (!hasCoach(wgSlot.leaders, name)) wgSlot.leaders.push(cleanItem)
      } else {
        if (!wgSlot.support) wgSlot.support = []
        if (!hasCoach(wgSlot.support, name)) wgSlot.support.push(cleanItem)
      }
    }
  }

  if (!isAdminCoach.value) {
    // Ordinary coach: strictly update coachSignups to satisfy Firestore security rules
    await updateCoachSignups(props.race.id, updatedRace.coachSignups)
  } else {
    const sanitized = JSON.parse(JSON.stringify(updatedRace))
    await updateRace(sanitized)
  }

  // Automatically subscribe the coach to ride group notifications
  if (!isRideGroupSubscribed(slot.id)) {
    subscribeRideGroup({
      id: slot.id,
      name: slot.name || (activeSession.value === 'wu' ? 'Warm-up Group' : 'Pre-Ride Wave'),
      sessionType: activeSession.value,
      meetingTime: slot.meetingTime || '8:00 AM',
      stagingTime: slot.stagingTime,
      startTime: getSlotStartTime(slot) || undefined,
      day: slot.day,
      date: slot.date,
      categories: getSlotCategories(slot),
      raceId: props.race.id
    })
  }
}

const removeCoachName = async (slot: any, role: 'leader' | 'support', index: number) => {
  if (isSignupsClosed.value) return
  if (!canEditCoachSignups.value) {
    emit('openAuth')
    return
  }
  const updatedRace = JSON.parse(JSON.stringify(props.race)) as Race
  if (!updatedRace.coachSignups) return

  const list = activeSession.value === 'pr'
    ? updatedRace.coachSignups.preRides
    : updatedRace.coachSignups.warmups

  const targetSlot = list?.find(s => s.id === slot.id)
  if (targetSlot) {
    if (role === 'leader' && targetSlot.leaders) {
      targetSlot.leaders.splice(index, 1)
    } else if (role === 'support' && targetSlot.support) {
      targetSlot.support.splice(index, 1)
    }
  }

  // Also remove from updatedRace.warmupGroups if applicable (ADMINS ONLY)
  if (isAdminCoach.value && activeSession.value === 'wu' && updatedRace.warmupGroups) {
    const wgSlot = updatedRace.warmupGroups.find(w => w.id === slot.id)
    if (wgSlot) {
      if (role === 'leader' && wgSlot.leaders) {
        wgSlot.leaders.splice(index, 1)
      } else if (role === 'support' && wgSlot.support) {
        wgSlot.support.splice(index, 1)
      }
    }
  }

  if (!isAdminCoach.value) {
    // Ordinary coach: strictly update coachSignups to satisfy Firestore security rules
    await updateCoachSignups(props.race.id, updatedRace.coachSignups)
  } else {
    const sanitized = JSON.parse(JSON.stringify(updatedRace))
    await updateRace(sanitized)
  }

  // Check if current coach is still signed up for this slot; if not, remove subscription
  const myName = getMyName.value
  const slotAfter = (activeSession.value === 'pr'
    ? updatedRace.coachSignups?.preRides
    : (updatedRace.coachSignups?.warmups || updatedRace.warmupGroups)
  )?.find(s => s.id === slot.id)

  const stillSignedUp = slotAfter && (
    hasCoach(slotAfter.leaders, myName) ||
    hasCoach(slotAfter.support, myName)
  )
  if (!stillSignedUp && isRideGroupSubscribed(slot.id)) {
    unsubscribeRideGroup(slot.id)
  }
}
</script>

<template>
  <div class="coach-signups-page" id="coachSignupHub">
    <!-- Closed banner if race date range has passed -->
    <div v-if="isSignupsClosed" class="signups-closed-banner">
      <span>🔒</span>
      <span>This event has concluded ({{ race.dateStr }}). Coach sign-ups are closed.</span>
    </div>

    <!-- Session Pills Toolbar with Expand/Collapse All -->
    <div class="signup-tabs-toolbar">
      <div class="signup-pills-group">
        <button
          type="button"
          class="signup-tab-pill"
          :class="{ active: activeSession === 'pr' }"
          @click="selectSession('pr')"
        >
          <span>🚵</span> Pre-Rides
        </button>
        <button
          type="button"
          class="signup-tab-pill pill-league"
          :class="{ active: activeSession === 'wu' }"
          @click="selectSession('wu')"
        >
          <span>🔥</span> Warm-ups
        </button>
      </div>

      <div class="signup-toolbar-actions">
        <button
          v-if="isCoachAuth"
          type="button"
          class="btn-action-pill"
          title="Edit Coach Sign-ups Config in Admin"
          @click="emit('edit')"
        >
          <span>⚙️</span>
          <span>Edit Config</span>
        </button>

        <button
          type="button"
          class="btn-action-pill"
          :title="areAllSlotsExpanded ? 'Collapse all wave cards' : 'Expand all wave cards'"
          @click="toggleAllSlots"
        >
          <span>↕️</span>
          <span>{{ areAllSlotsExpanded ? 'Collapse All' : 'Expand All' }}</span>
        </button>
      </div>
    </div>

    <!-- Schedule Days Container -->
    <div class="coach-days-container">
      <div v-if="activeDayGroups.length === 0" class="no-results" style="padding:24px;text-align:center;">
        <p style="margin:0;color:var(--text-muted);font-size:13px;">No {{ activeSession === 'pr' ? 'pre-ride' : 'warm-up' }} slots scheduled.</p>
      </div>

        <div
          v-for="grp in activeDayGroups"
          :key="grp.day"
          class="schedule-day-group"
        >
          <!-- Day Header -->
          <div class="schedule-day-header" :class="{ 'day-raceday': grp.isRaceDay }">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;">
              <span>{{ grp.isRaceDay ? '🏁' : '🚵' }}</span>
              <span style="font-weight:800;font-size:12.5px;white-space:nowrap;">{{ grp.day }}</span>
              <span v-if="grp.date" class="schedule-date-badge" style="font-size:10.5px;white-space:nowrap;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.8;margin-right:2px;">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                {{ grp.date }}
              </span>
            </div>
            <span v-if="grp.subtitle && grp.subtitle.trim()" class="schedule-day-badge" style="font-size:10px;white-space:nowrap;">{{ grp.subtitle }}</span>
          </div>

          <!-- Slots in Day (Collapsible Cards - exactly matching list cards) -->
          <div class="coach-slot-list">
            <div
              v-for="slot in grp.slots"
              :key="slot.id"
              class="coach-slot-card table-card"
              :class="{ 'card-collapsed': !isSlotExpanded(slot.id) }"
            >
              <!-- Slot Header (Clickable to Toggle Collapse) - styled exactly like the lists -->
              <div
                class="coach-slot-header category-header collapsible-header"
                title="Click to expand/collapse"
                @click="toggleSlotCollapse(slot.id)"
              >
                <!-- Main Info Area (Title on Left, Badges on Right) -->
                <div class="coach-slot-main-info">
                  <div class="coach-slot-title-row">
                    <span
                      v-if="isCurrentUserSignedUpForSlot(slot)"
                      class="user-signed-up-indicator"
                      title="You are signed up for this ride"
                    >
                      <svg
                        class="signed-up-bookmark-icon"
                        viewBox="0 0 24 24"
                        width="13"
                        height="13"
                        fill="currentColor"
                        fill-opacity="0.25"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                      </svg>
                    </span>
                    <span class="coach-slot-title">{{ slot.name }}</span>
                    <!-- Warm-up Riders Count Badge (Matching exact design from list category headers) -->
                    <span
                      v-if="activeSession === 'wu'"
                      class="category-badge warmup-riders-badge"
                      :title="getSlotRiderTooltip(slot)"
                    >
                      {{ getSlotRiderCount(slot) }} {{ getSlotRiderCount(slot) === 1 ? 'RIDER' : 'RIDERS' }}
                    </span>
                  </div>

                  <!-- Badges Row: Status Badges (Needed) & Time Strip -->
                  <div class="coach-slot-badges-row">
                    <!-- Leader & Support Needed Badges -->
                    <span
                      v-if="(!slot.leaders || slot.leaders.length === 0)"
                      class="role-status-badge badge-needed"
                    >
                      ⚠️ Leader Needed
                    </span>
                    <span
                      v-if="(!slot.support || slot.support.length === 0)"
                      class="role-status-badge badge-support-needed"
                    >
                      ⚠️ Support Needed
                    </span>

                    <!-- Unified Schedule Strip (Warm › Stage › Start) matching list cards -->
                    <div v-if="slot.meetingTime || getSlotStagingTime(slot) || getSlotStartTime(slot)" class="wave-schedule-strip slot-schedule-strip">
                      <template v-if="getSlotStagingTime(slot) || getSlotStartTime(slot)">
                        <span v-if="slot.meetingTime" class="wave-schedule-step step-warmup" :title="activeSession === 'wu' ? 'Warm-up meeting time' : 'Meeting time'">
                          <span class="step-lbl">{{ activeSession === 'wu' ? 'Warm:' : 'Meet:' }}</span>
                          <span class="step-time">{{ slot.meetingTime }}</span>
                        </span>
                        <span v-if="slot.meetingTime && (getSlotStagingTime(slot) || getSlotStartTime(slot))" class="wave-schedule-sep">›</span>
                        <span v-if="getSlotStagingTime(slot)" class="wave-schedule-step step-stage" title="Staging grid call-up">
                          <span class="step-lbl">Stage:</span>
                          <span class="step-time">{{ getSlotStagingTime(slot) }}</span>
                        </span>
                        <span v-if="getSlotStagingTime(slot) && getSlotStartTime(slot)" class="wave-schedule-sep">›</span>
                        <span v-if="getSlotStartTime(slot)" class="wave-schedule-step step-start" title="Official wave start">
                          <span class="step-lbl">Start:</span>
                          <span class="step-time">{{ getSlotStartTime(slot) }}</span>
                        </span>
                      </template>
                      <template v-else>
                        <span class="wave-schedule-step">
                          <span class="step-lbl">{{ activeSession === 'wu' ? 'Warm:' : 'Time:' }}</span>
                          <span class="step-time">
                            {{ splitTime(slot.meetingTime).start }}
                            <template v-if="splitTime(slot.meetingTime).end">
                              to {{ splitTime(slot.meetingTime).end }}
                            </template>
                          </span>
                        </span>
                      </template>
                    </div>
                  </div>
                </div>

                <!-- Actions Area (Fixed to Far Right) -->
                <div class="coach-slot-actions">
                  <!-- Ride Group Alert Toggle Button with Sleek Outline Bell SVG (Icon Only) -->
                  <button
                    type="button"
                    class="action-mini-btn notif-bell-btn slot-bell-btn"
                    :class="{ active: isRideGroupSubscribed(slot.id) }"
                    :title="isRideGroupSubscribed(slot.id) ? 'Notifications active for this ride group! Click to toggle' : 'Enable notifications for this ride group'"
                    @click.stop="toggleRideGroupSubscription({
                      id: slot.id,
                      name: slot.name || (activeSession === 'wu' ? 'Warm-up Group' : 'Pre-Ride Wave'),
                      sessionType: activeSession,
                      meetingTime: slot.meetingTime || '8:00 AM',
                      stagingTime: getSlotStagingTime(slot) || undefined,
                      startTime: getSlotStartTime(slot) || undefined,
                      day: slot.day,
                      date: slot.date,
                      categories: getSlotCategories(slot),
                      raceId: race.id
                    })"
                  >
                    <!-- Bell icon matching user screenshot and cat-notif-btn -->
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      :fill="isRideGroupSubscribed(slot.id) ? 'currentColor' : 'none'"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="bell-icon"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </button>

                  <!-- Smaller List-style Toggle Chevron fixed on far right -->
                  <span
                    class="card-toggle-icon slot-toggle-icon"
                    :class="{ collapsed: !isSlotExpanded(slot.id) }"
                    title="Toggle card"
                  >▼</span>
                </div>
              </div>

              <!-- Slot Body (Collapsible) -->
              <div v-show="isSlotExpanded(slot.id)" class="coach-slot-body collapsible-body">
                <!-- Grouped Categories Breakdown -->
                <div v-if="getSlotCategories(slot).length > 0" style="display:flex;flex-wrap:wrap;gap:4px;margin:2px 0 4px;">
                  <span
                    v-for="cName in getSlotCategories(slot)"
                    :key="cName"
                    style="font-size:10.5px;background:rgba(255,255,255,0.05);border:1px solid var(--border);padding:1px 6px;border-radius:4px;color:var(--text-main);font-weight:600;"
                  >
                    <span style="color:var(--accent-red);">🚩</span> {{ cName }}
                    <span v-if="getCatStage(cName)" style="color:var(--text-muted);font-size:9.5px;margin-left:2px;">
                      (Stage {{ getCatStage(cName) }} • Start {{ getCatStart(cName) }})
                    </span>
                  </span>
                </div>

                <!-- Coaching Staff Section (Clean Neutral Cards, No Icons, No Yellow/Blue) -->
                <div class="coach-staff-section">
                  <div class="coach-roles-grid">
                    <!-- 1. Ride Leader Bay -->
                    <div
                      class="coach-role-bay bay-leader"
                      :class="{
                        'is-needed': !slot.leaders || slot.leaders.length === 0
                      }"
                    >
                      <div class="role-bay-header">
                        <div class="role-bay-title-wrap">
                          <span class="role-bay-dot dot-leader">●</span>
                          <span class="role-bay-name">Ride Leader</span>
                          <span class="role-req-tag tag-leader">L2+ Req</span>
                        </div>
                        <span
                          v-if="!slot.leaders || slot.leaders.length === 0"
                          class="role-status-badge badge-needed"
                        >
                          ⚠️ Leader Needed
                        </span>
                        <span
                          v-else
                          class="role-status-badge badge-assigned"
                        >
                          ✓ {{ slot.leaders.length > 1 ? `${slot.leaders.length} Assigned` : 'Assigned' }}
                        </span>
                      </div>

                      <div class="role-bay-body">
                        <!-- Leader Names with Avatars -->
                        <div
                          v-if="slot.leaders && slot.leaders.length > 0"
                          class="coach-chips-wrap"
                        >
                          <div
                            v-for="(coachItem, idx) in slot.leaders"
                            :key="idx"
                            class="coach-chip"
                          >
                            <img
                              v-if="getCoachPhoto(coachItem)"
                              :src="getCoachPhoto(coachItem)"
                              class="coach-chip-avatar img"
                              alt=""
                              referrerpolicy="no-referrer"
                            />
                            <span v-else class="coach-chip-avatar initials">
                              {{ getCoachInitials(coachItem) }}
                            </span>
                            <span class="coach-chip-name">{{ getCoachName(coachItem) }}</span>
                            <!-- ✕ Remove button only visible if user can edit and event is active -->
                            <button
                              v-if="canEditSignupsActive"
                              type="button"
                              class="coach-chip-remove"
                              title="Remove coach"
                              @click="removeCoachName(slot, 'leader', idx)"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <!-- Empty slot notice when locked or closed -->
                        <div
                          v-else-if="!canEditSignupsActive"
                          class="coach-unassigned-notice"
                        >
                          {{ isSignupsClosed ? 'No leader signed up' : 'Open slot' }}
                        </div>

                        <!-- Add Coach Action -->
                        <div
                          v-if="canEditSignupsActive && !(activeInputSlotId === slot.id && activeInputRole === 'leader')"
                          class="role-actions-wrap"
                        >
                          <button
                            type="button"
                            class="coach-add-btn"
                            title="Add a coach leader"
                            @click="startInlineInput(slot.id, 'leader')"
                          >
                            + Add Coach
                          </button>
                        </div>

                        <!-- Inline Leader Input -->
                        <div
                          v-if="canEditSignupsActive && activeInputSlotId === slot.id && activeInputRole === 'leader'"
                          class="inline-name-box"
                        >
                          <input
                            ref="inlineInputRef"
                            :class="['custom-minutes-input inline-name-field', `inline-field-${slot.id}-leader`]"
                            v-model="inlineNameInput"
                            type="text"
                            placeholder="Coach name..."
                            autofocus
                            @keydown.enter="submitInlineName(slot, 'leader')"
                            @keydown.esc="cancelInlineInput"
                          >
                          <button
                            type="button"
                            class="done-modal-btn admin-save-btn inline-btn"
                            @click="submitInlineName(slot, 'leader')"
                          >
                            Add
                          </button>
                          <button
                            v-if="user && !isMeSignedUp(slot, 'leader')"
                            type="button"
                            class="action-mini-btn inline-btn btn-quick-me"
                            title="Add your signed-in name"
                            @click="addMeQuick(slot, 'leader')"
                          >
                            + Me ({{ getMyName }})
                          </button>
                          <button
                            type="button"
                            class="action-mini-btn inline-btn"
                            @click="cancelInlineInput"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- 2. Ride Support Bay -->
                    <div
                      class="coach-role-bay bay-support"
                      :class="{
                        'is-needed': !slot.support || slot.support.length === 0
                      }"
                    >
                      <div class="role-bay-header">
                        <div class="role-bay-title-wrap">
                          <span class="role-bay-dot dot-support">●</span>
                          <span class="role-bay-name">Ride Support</span>
                          <span class="role-req-tag tag-support">L1–L3</span>
                        </div>
                        <span
                          v-if="!slot.support || slot.support.length === 0"
                          class="role-status-badge badge-support-needed"
                        >
                          ⚠️ Support Needed
                        </span>
                        <span
                          v-else
                          class="role-status-badge badge-assigned"
                        >
                          ✓ {{ slot.support.length }} Assigned
                        </span>
                      </div>

                      <div class="role-bay-body">
                        <!-- Support Names with Avatars -->
                        <div
                          v-if="slot.support && slot.support.length > 0"
                          class="coach-chips-wrap"
                        >
                          <div
                            v-for="(coachItem, idx) in slot.support"
                            :key="idx"
                            class="coach-chip"
                          >
                            <img
                              v-if="getCoachPhoto(coachItem)"
                              :src="getCoachPhoto(coachItem)"
                              class="coach-chip-avatar img"
                              alt=""
                              referrerpolicy="no-referrer"
                            />
                            <span v-else class="coach-chip-avatar initials">
                              {{ getCoachInitials(coachItem) }}
                            </span>
                            <span class="coach-chip-name">{{ getCoachName(coachItem) }}</span>
                            <!-- ✕ Remove button only visible if user can edit and event is active -->
                            <button
                              v-if="canEditSignupsActive"
                              type="button"
                              class="coach-chip-remove"
                              title="Remove coach"
                              @click="removeCoachName(slot, 'support', idx)"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <!-- Empty slot notice when locked or closed -->
                        <div
                          v-else-if="!canEditSignupsActive"
                          class="coach-unassigned-notice"
                        >
                          {{ isSignupsClosed ? 'No support signed up' : 'Open slot' }}
                        </div>

                        <!-- Add Coach Action -->
                        <div
                          v-if="canEditSignupsActive && !(activeInputSlotId === slot.id && activeInputRole === 'support')"
                          class="role-actions-wrap"
                        >
                          <button
                            type="button"
                            class="coach-add-btn"
                            title="Add ride support"
                            @click="startInlineInput(slot.id, 'support')"
                          >
                            + Add Coach
                          </button>
                        </div>

                        <!-- Inline Support Input -->
                        <div
                          v-if="canEditSignupsActive && activeInputSlotId === slot.id && activeInputRole === 'support'"
                          class="inline-name-box"
                        >
                          <input
                            ref="inlineInputRef"
                            :class="['custom-minutes-input inline-name-field', `inline-field-${slot.id}-support`]"
                            v-model="inlineNameInput"
                            type="text"
                            placeholder="Coach name..."
                            autofocus
                            @keydown.enter="submitInlineName(slot, 'support')"
                            @keydown.esc="cancelInlineInput"
                          >
                          <button
                            type="button"
                            class="done-modal-btn admin-save-btn inline-btn"
                            @click="submitInlineName(slot, 'support')"
                          >
                            Add
                          </button>
                          <button
                            v-if="user && !isMeSignedUp(slot, 'support')"
                            type="button"
                            class="action-mini-btn inline-btn btn-quick-me"
                            title="Add your signed-in name"
                            @click="addMeQuick(slot, 'support')"
                          >
                            + Me ({{ getMyName }})
                          </button>
                          <button
                            type="button"
                            class="action-mini-btn inline-btn"
                            @click="cancelInlineInput"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Policy Banner -->
        <div class="event-warning-banner" style="margin-top:12px;padding:8px 12px;font-size:11px;">
          <span>⚠️</span>
          <span>
            <strong>Policy:</strong>
            {{ coachData?.policy || 'Ride Leader must hold NICA Level 2+ and is responsible for participants. Multiple coaches can sign up for each spot.' }}
          </span>
        </div>
      </div>
    </div>
  </template>

<style scoped>
.coach-locked-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  margin: 0 4px 10px 4px;
}

.locked-banner-text {
  display: flex;
  align-items: center;
  gap: 8px;
}

.locked-banner-title {
  font-size: 12px;
  font-weight: 800;
  color: #f87171;
}

.locked-banner-desc {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 1px;
}

.coach-unlock-signin-btn {
  padding: 5px 12px;
  background: var(--accent-red);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.coach-unlock-signin-btn:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.coach-empty-slot {
  font-size: 10.5px;
  color: var(--text-muted);
  font-style: italic;
  padding: 2px 4px;
}

.signup-badge-active {
  display: inline-block;
  font-size: 9.5px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: #4ade80;
  margin-left: 6px;
  vertical-align: middle;
}

.signup-badge-closed {
  display: inline-block;
  font-size: 9.5px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #f87171;
  margin-left: 6px;
  vertical-align: middle;
}

.signups-closed-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  color: #fca5a5;
  font-size: 11.5px;
  font-weight: 600;
}

/* Modern Outline Notification Bell Button */
.notif-bell-btn {
  font-size: 10px;
  padding: 2px 7px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-subtle);
  color: var(--text-muted);
  transition: all 0.15s ease;
  cursor: pointer;
}

.notif-bell-btn:hover {
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--text-main);
}

.notif-bell-btn.active {
  border-color: var(--accent-red);
  background: rgba(239, 68, 68, 0.12);
  color: var(--accent-red);
  font-weight: 700;
}

.notif-bell-btn .bell-icon {
  transition: all 0.15s ease;
}

.notif-bell-btn.active .bell-icon {
  color: var(--accent-red);
  filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.4));
}

.notif-bell-btn .bell-text {
  font-size: 10px;
  letter-spacing: 0.2px;
}

/* Compact toolbar styled like the lists controls toolbar */
.coach-signups-page .signup-tabs-toolbar {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 12px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.signup-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.coach-signups-page .signup-tab-pill {
  padding: 5px 12px;
  min-height: 28px;
  font-size: 11.5px;
}

/* Day Groups: Remove outer nested container border and shadow */
.coach-days-container .schedule-day-group {
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: 0;
  overflow: visible;
  margin-bottom: 16px;
  padding: 0;
}

/* Day Header: Standalone card matching list design with equal 8px spacing to the first card */
.coach-days-container .schedule-day-header {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
  box-shadow: var(--shadow-sm);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.coach-days-container .schedule-day-header.day-raceday {
  background: rgba(220, 38, 38, 0.1);
  border-color: rgba(220, 38, 38, 0.35);
  color: var(--accent-red);
}

.coach-slot-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
}

.coach-slot-list .coach-slot-card {
  margin-bottom: 0 !important;
}

.coach-slot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
}

.coach-slot-main-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px 12px;
}

.coach-slot-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.user-signed-up-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-red, #ef4444);
  flex-shrink: 0;
  line-height: 1;
  cursor: help;
}

:root[data-theme="dark"] .user-signed-up-indicator {
  color: #f87171;
}

:root[data-theme="light"] .user-signed-up-indicator {
  color: #dc2626;
}

.signed-up-bookmark-icon {
  display: block;
}

.coach-slot-title {
  font-weight: 800;
  font-size: 13px;
  color: var(--text-main);
  line-height: 1.3;
  word-break: break-word;
}

.warmup-riders-badge {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px solid var(--border);
  padding: 1px 6px;
  border-radius: 10px;
  white-space: nowrap;
  letter-spacing: 0.3px;
  cursor: help;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.warmup-riders-badge:hover {
  color: var(--text-main);
  border-color: rgba(255, 255, 255, 0.25);
}

.coach-slot-badges-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  margin-left: auto;
  gap: 4px 6px;
}

.coach-slot-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-left: auto;
  align-self: flex-start;
  padding-top: 1px;
}

/* Smaller Collapse Toggle Chevron (Fixed to Far Right) */
.card-toggle-icon.slot-toggle-icon {
  width: 18px;
  height: 18px;
  min-width: 18px;
  min-height: 18px;
  font-size: 8px;
  border-radius: 4px;
  margin-left: 0;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-muted);
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.15s ease, color 0.15s ease;
}

.card-toggle-icon.slot-toggle-icon.collapsed {
  transform: rotate(-90deg);
}

.category-header:hover .card-toggle-icon.slot-toggle-icon {
  color: var(--text-main);
  border-color: var(--border-strong);
}

.slot-bell-btn {
  width: 22px;
  height: 22px;
  min-width: 22px;
  min-height: 22px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

@media (min-width: 860px) {
  .coach-slot-header {
    align-items: center;
    padding: 9px 12px;
  }
  .coach-slot-main-info {
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 10px;
  }
  .coach-slot-title {
    font-size: 13.5px;
  }
  .coach-slot-actions {
    align-self: center;
    padding-top: 0;
  }
}

@media (max-width: 859px) {
  .coach-slot-main-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .coach-slot-badges-row {
    margin-left: 0;
    justify-content: flex-start;
    width: 100%;
  }
  .coach-slot-badges-row .slot-schedule-strip {
    order: 1;
  }
  .coach-slot-badges-row .role-status-badge {
    order: 2;
  }
  .coach-slot-actions {
    align-self: flex-start;
    padding-top: 2px;
  }
}

@media (max-width: 480px) {
  .coach-slot-header {
    padding: 7px 9px;
    gap: 6px;
  }
}

.coach-slot-body {
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.coach-slot-desc {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 2px;
}

.coach-staff-section {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.coach-staff-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.coach-staff-title {
  font-size: 9.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}

.coach-staff-divider {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
}

:root[data-theme="light"] .coach-staff-divider {
  background: rgba(0, 0, 0, 0.06);
}

.coach-roles-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

@media (max-width: 620px) {
  .coach-roles-grid {
    grid-template-columns: 1fr;
  }
}

.coach-role-bay {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.15s ease;
}

:root[data-theme="light"] .coach-role-bay {
  background: transparent;
  border-color: #e2e8f0;
}

/* Default border color for assigned bays (uses standard theme border) */
.coach-role-bay.bay-leader,
.coach-role-bay.bay-support {
  border: 1px solid var(--border);
  background: transparent;
}

:root[data-theme="light"] .coach-role-bay.bay-leader,
:root[data-theme="light"] .coach-role-bay.bay-support {
  border-color: #e2e8f0;
}

/* ONLY when needed: highlighted with distinct colors for leader vs. support */
.coach-role-bay.bay-leader.is-needed {
  border: 1px dashed rgba(245, 158, 11, 0.6);
  border-left: 3.5px solid #f59e0b;
  background: rgba(245, 158, 11, 0.04);
}

.coach-role-bay.bay-support.is-needed {
  border: 1px dashed rgba(56, 189, 248, 0.6);
  border-left: 3.5px solid #38bdf8;
  background: rgba(56, 189, 248, 0.04);
}

:root[data-theme="light"] .coach-role-bay.bay-leader.is-needed {
  border-color: #f59e0b;
  border-left-color: #d97706;
  background: #fffbeb;
}

:root[data-theme="light"] .coach-role-bay.bay-support.is-needed {
  border-color: #38bdf8;
  border-left-color: #0284c7;
  background: #f0f9ff;
}

.role-bay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding-bottom: 2px;
}

.role-bay-title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.role-bay-dot {
  font-size: 10px;
  line-height: 1;
}

.dot-leader {
  color: #f59e0b;
}

.dot-support {
  color: #38bdf8;
}

.role-bay-name {
  font-size: 12px;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.2;
  letter-spacing: 0.2px;
}

.role-req-tag {
  font-size: 8.5px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  line-height: 1.2;
  letter-spacing: 0.3px;
}

.tag-leader {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #fbbf24;
}

:root[data-theme="light"] .tag-leader {
  background: #fef3c7;
  border-color: #fcd34d;
  color: #92400e;
}

.tag-support {
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #38bdf8;
}

:root[data-theme="light"] .tag-support {
  background: #e0f2fe;
  border-color: #7dd3fc;
  color: #0369a1;
}

.role-status-badge {
  font-size: 9.5px;
  font-weight: 700;
  padding: 1.5px 6px;
  border-radius: 4px;
  line-height: 1.2;
  white-space: nowrap;
}

.badge-needed {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.45);
  color: #fbbf24;
}

:root[data-theme="light"] .badge-needed {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(217, 119, 6, 0.4);
  color: #b45309;
}

.badge-support-needed {
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.45);
  color: #38bdf8;
}

:root[data-theme="light"] .badge-support-needed {
  background: rgba(14, 165, 233, 0.12);
  border-color: rgba(2, 132, 199, 0.4);
  color: #0284c7;
}

.badge-assigned {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: #4ade80;
}

:root[data-theme="light"] .badge-assigned {
  background: #dcfce7;
  border-color: #86efac;
  color: #15803d;
}

.badge-neutral {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  color: var(--text-muted);
}

:root[data-theme="light"] .badge-neutral {
  background: rgba(0, 0, 0, 0.04);
}

.role-bay-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.coach-chips-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.coach-unassigned-notice {
  font-size: 10px;
  color: var(--text-muted);
  font-style: italic;
  padding: 2px 0;
}

.role-actions-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: auto;
  padding-top: 4px;
  width: 100%;
}

.coach-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 2px 8px 2px 3px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1;
}

.coach-chip-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 8.5px;
  font-weight: 800;
}

.coach-chip-avatar.initials {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.bay-leader .coach-chip-avatar.initials {
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.bay-support .coach-chip-avatar.initials {
  background: rgba(56, 189, 248, 0.18);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.35);
}

.coach-chip-name {
  line-height: 1.2;
}

.coach-btn-avatar {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 800;
}

.coach-btn-avatar.initials {
  background: rgba(255, 255, 255, 0.2);
  color: inherit;
}

.coach-add-me-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px 2px 3px !important;
  border-radius: 999px !important;
  background: rgba(245, 158, 11, 0.15) !important;
  border: 1px solid rgba(245, 158, 11, 0.45) !important;
  color: #fbbf24 !important;
  font-weight: 700 !important;
}

.coach-add-me-btn.btn-support {
  background: rgba(59, 130, 246, 0.15) !important;
  border: 1px solid rgba(59, 130, 246, 0.45) !important;
  color: #60a5fa !important;
}

.coach-add-me-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.15);
}

.coach-add-other-btn {
  font-size: 10px !important;
  opacity: 0.75;
  padding: 2px 6px !important;
}

.coach-add-other-btn:hover {
  opacity: 1;
}

.coach-chip-remove {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 10px;
  cursor: pointer;
  padding: 0 1px;
  line-height: 1;
  transition: color 0.15s ease;
}

.coach-chip-remove:hover {
  color: var(--accent-red);
}

.coach-add-btn {
  background: rgba(245, 158, 11, 0.08);
  border: 1px dashed rgba(245, 158, 11, 0.4);
  color: #fbbf24;
  border-radius: 12px;
  padding: 1px 8px;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.coach-add-btn:hover {
  background: rgba(245, 158, 11, 0.18);
  border-color: #f59e0b;
}

.bay-support .coach-add-btn {
  background: rgba(56, 189, 248, 0.08);
  border-color: rgba(56, 189, 248, 0.4);
  color: #38bdf8;
}

:root[data-theme="light"] .bay-support .coach-add-btn {
  color: #0284c7;
}

.bay-support .coach-add-btn:hover {
  background: rgba(56, 189, 248, 0.18);
  border-color: #38bdf8;
}

.inline-name-box {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 4px;
  width: 100%;
}

.inline-name-field {
  width: 130px;
  height: 22px;
  font-size: 10.5px;
  padding: 1px 6px;
}

.inline-btn {
  height: 22px;
  padding: 1px 7px;
  font-size: 10px;
}

.btn-quick-me {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.35);
  color: #4ade80;
}

:root[data-theme="light"] .btn-quick-me {
  color: #16a34a;
}

@media (max-width: 520px) {
  .coach-locked-banner {
    flex-direction: column;
    align-items: flex-start;
  }
  .coach-unlock-signin-btn {
    width: 100%;
    text-align: center;
  }
  .coach-slot-header {
    gap: 4px;
  }
  .coach-role-label {
    min-width: 100px;
    font-size: 11px;
  }
  .inline-name-field {
    width: 100%;
  }
}
</style>
