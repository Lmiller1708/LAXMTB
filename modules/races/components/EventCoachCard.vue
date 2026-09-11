<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import type { Race, CoachSlot, WarmupGroup } from '../types/race'
import { useCurrentRace, isRaceCompleted } from '../composables/useCurrentRace'
import { useCoachAuth } from '~/modules/coach-admin/composables/useCoachAuth'
import {
  getCategoryStartTime,
  getCategoryStageTime,
  getCategoryStartTimeMinutes,
  parseTimeStrToMinutes,
  formatMinutesToTimeStr
} from '~/modules/results/services/raceresultService'
import { useNotificationSubscriptions } from '~/modules/notifications/composables/useNotificationSubscriptions'

type SessionKey = 'pr' | 'wu'

const props = defineProps<{
  race: Race
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
    const dateKey = slot.date || (dayKey.toLowerCase().includes('sun') ? 'Sept 6' : 'Sept 5')
    const isRaceDay = dayKey.toLowerCase().includes('sun')
    const subtitle = slot.subtitle || (isRaceDay ? 'North Conference • Race Day' : 'South Conference')

    if (!groupMap[dayKey]) {
      groupMap[dayKey] = {
        day: dayKey,
        date: dateKey,
        subtitle,
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

const startInlineInput = (slotId: string, role: 'leader' | 'support') => {
  if (isSignupsClosed.value) return
  if (!canEditCoachSignups.value) {
    emit('openAuth')
    return
  }
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
  <div class="signup-hub-section" :class="{ 'card-collapsed': !isOpen }" id="coachSignupHub">
    <!-- Collapsible Header -->
    <div class="signup-hub-header collapsible-header" @click="isOpen = !isOpen">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="signup-hub-title">
          <span>🚵</span> Coach Sign-Ups
          <span v-if="isSignupsClosed" class="signup-badge-closed">🔒 Sign-Ups Closed</span>
          <span v-else-if="canEditCoachSignups" class="signup-badge-active">✏️ Editing Enabled</span>
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button
          v-if="isCoachAuth"
          type="button"
          class="card-inline-edit-btn"
          title="Edit Coach Sign-ups Config in Admin"
          @click.stop="emit('edit')"
        >
          <span>⚙️</span>
        </button>
        <span class="card-toggle-icon" :class="{ collapsed: !isOpen }" title="Toggle Coach Sign-Ups">▼</span>
      </div>
    </div>

    <div v-show="isOpen" class="collapsible-body">
      <!-- Closed banner if race date range has passed -->
      <div v-if="isSignupsClosed" class="signups-closed-banner">
        <span>🔒</span>
        <span>This event has concluded ({{ race.dateStr }}). Coach sign-ups are closed.</span>
      </div>

      <!-- Session Pills Toolbar -->
      <div class="signup-tabs-toolbar" style="margin-bottom:8px;">
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
      </div>

      <!-- Schedule Days Container -->
      <div class="detail-section-body" style="padding-top:0;">
        <div v-if="activeDayGroups.length === 0" class="no-results" style="padding:16px;text-align:center;">
          <p style="margin:0;color:var(--text-muted);font-size:13px;">No {{ activeSession === 'pr' ? 'pre-ride' : 'warm-up' }} slots scheduled.</p>
        </div>

        <div
          v-for="grp in activeDayGroups"
          :key="grp.day"
          class="schedule-day-group"
          style="margin-bottom:8px;"
        >
          <!-- Day Header -->
          <div class="schedule-day-header" :class="{ 'day-raceday': grp.isRaceDay }" style="padding:6px 10px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span>{{ grp.isRaceDay ? '🏁' : '🚵' }}</span>
              <span style="font-weight:800;font-size:12.5px;">{{ grp.day }}</span>
              <span v-if="grp.date" class="schedule-date-badge" style="font-size:10.5px;">📅 {{ grp.date }}</span>
            </div>
            <span class="schedule-day-badge" style="font-size:10px;">{{ grp.subtitle }}</span>
          </div>

          <!-- Slots in Day -->
          <div class="coach-slot-list">
            <div
              v-for="slot in grp.slots"
              :key="slot.id"
              class="coach-slot-card"
            >
              <!-- Slot Header (Title & Time) -->
              <div class="coach-slot-header">
                <div class="coach-slot-title-group">
                  <span class="coach-slot-title">{{ slot.name }}</span>
                  <span v-if="slot.tag" class="schedule-tag" :class="slot.tagClass" style="font-size:9.5px;padding:1px 5px;">{{ slot.tag }}</span>
                </div>

                <!-- Time Badges & Alert Status -->
                <div class="coach-slot-time-group" style="display:flex;align-items:center;gap:6px;">
                  <template v-if="slot.stagingTime || getSlotStartTime(slot)">
                    <span v-if="slot.meetingTime" class="time-badge" style="font-size:10.5px;padding:1px 6px;">
                      <span style="font-size:9px;color:var(--text-muted);font-weight:700;margin-right:2px;">MEET</span>{{ slot.meetingTime }}
                    </span>
                    <span v-if="slot.stagingTime" class="time-badge" style="border-color:rgba(239,68,68,0.4);color:#f87171;font-size:10.5px;padding:1px 6px;">
                      <span style="font-size:9px;opacity:0.8;font-weight:700;margin-right:2px;">STAGE</span>{{ slot.stagingTime }}
                    </span>
                    <span v-if="getSlotStartTime(slot)" class="time-badge" style="border-color:rgba(34,197,94,0.4);color:#4ade80;font-size:10.5px;padding:1px 6px;">
                      <span style="font-size:9px;opacity:0.8;font-weight:700;margin-right:2px;">START</span>{{ getSlotStartTime(slot) }}
                    </span>
                  </template>
                  <template v-else>
                    <span class="time-badge" style="font-size:10.5px;padding:1px 6px;">
                      {{ splitTime(slot.meetingTime).start }}
                      <template v-if="splitTime(slot.meetingTime).end">
                        <span class="time-to-badge">to</span>{{ splitTime(slot.meetingTime).end }}
                      </template>
                    </span>
                  </template>

                  <!-- Ride Group Alert Toggle Button with Sleek Outline Bell SVG -->
                  <button
                    type="button"
                    class="action-mini-btn notif-bell-btn"
                    :class="{ active: isRideGroupSubscribed(slot.id) }"
                    :title="isRideGroupSubscribed(slot.id) ? 'Notifications active for this ride group! Click to toggle' : 'Enable notifications for this ride group'"
                    @click.stop="toggleRideGroupSubscription({
                      id: slot.id,
                      name: slot.name || (activeSession === 'wu' ? 'Warm-up Group' : 'Pre-Ride Wave'),
                      sessionType: activeSession,
                      meetingTime: slot.meetingTime || '8:00 AM',
                      stagingTime: slot.stagingTime,
                      startTime: getSlotStartTime(slot) || undefined,
                      day: slot.day,
                      date: slot.date,
                      categories: getSlotCategories(slot),
                      raceId: race.id
                    })"
                  >
                    <!-- Modern outline bell SVG matching reference -->
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="bell-icon"
                    >
                      <path
                        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                        :fill="isRideGroupSubscribed(slot.id) ? 'rgba(239, 68, 68, 0.25)' : 'none'"
                      />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <span class="bell-text">{{ isRideGroupSubscribed(slot.id) ? 'Alerts On' : 'Alerts' }}</span>
                  </button>
                </div>
              </div>

              <!-- Slot Body -->
              <div class="coach-slot-body">
                <div v-if="activeSession === 'pr' && slot.ridersAllowed" class="coach-slot-desc">
                  {{ slot.ridersAllowed }}
                </div>

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

                <div class="coach-roles-container">
                  <!-- 1. Ride Leaders Row -->
                  <div class="coach-role-row">
                    <div class="coach-role-label">
                      <span class="role-bullet bullet-leader">•</span>
                      <span>Leader <span class="role-req">(L2+)</span>:</span>
                    </div>

                    <div class="coach-role-content">
                      <!-- Leader Names with Avatars -->
                      <div
                        v-for="(coachItem, idx) in (slot.leaders || [])"
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

                      <!-- Empty slot notice when locked or closed -->
                      <span
                        v-if="!canEditSignupsActive && (!slot.leaders || slot.leaders.length === 0)"
                        class="coach-empty-slot"
                      >
                        {{ isSignupsClosed ? 'No coaches signed up' : 'Open slot (Sign in to claim)' }}
                      </span>

                      <!-- Add Leader Button -->
                      <template v-if="canEditSignupsActive && !(activeInputSlotId === slot.id && activeInputRole === 'leader')">
                        <button
                          type="button"
                          class="coach-add-btn"
                          title="Add a coach leader"
                          @click="startInlineInput(slot.id, 'leader')"
                        >
                          + Add
                        </button>
                      </template>

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

                  <!-- 2. Ride Support Row -->
                  <div class="coach-role-row">
                    <div class="coach-role-label">
                      <span class="role-bullet bullet-support">•</span>
                      <span>Support <span class="role-req">(L1–L3)</span>:</span>
                    </div>

                    <div class="coach-role-content">
                      <!-- Support Names with Avatars -->
                      <div
                        v-for="(coachItem, idx) in (slot.support || [])"
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

                      <!-- Empty slot notice when locked or closed -->
                      <span
                        v-if="!canEditSignupsActive && (!slot.support || slot.support.length === 0)"
                        class="coach-empty-slot"
                      >
                        {{ isSignupsClosed ? 'No coaches signed up' : 'Open slot (Sign in to claim)' }}
                      </span>

                      <!-- Add Support Button -->
                      <template v-if="canEditSignupsActive && !(activeInputSlotId === slot.id && activeInputRole === 'support')">
                        <button
                          type="button"
                          class="coach-add-btn btn-support"
                          title="Add ride support"
                          @click="startInlineInput(slot.id, 'support')"
                        >
                          + Add
                        </button>
                      </template>

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

        <!-- Policy Banner -->
        <div class="event-warning-banner" style="margin-top:8px;padding:7px 10px;font-size:11px;">
          <span>⚠️</span>
          <span>
            <strong>Policy:</strong>
            {{ coachData?.policy || 'Ride Leader must hold NICA Level 2+ and is responsible for participants. Multiple coaches can sign up for each spot.' }}
          </span>
        </div>
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

.coach-slot-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 5px;
}

.coach-slot-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.coach-slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.coach-slot-title-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.coach-slot-title {
  font-weight: 700;
  font-size: 12.5px;
  color: var(--text-main);
}

.coach-slot-desc {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 2px;
}

.coach-roles-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.coach-role-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  flex-wrap: wrap;
}

.coach-role-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-muted);
  min-width: 115px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding-top: 2px;
}

.role-bullet {
  font-size: 14px;
  line-height: 1;
}

.bullet-leader {
  color: #f59e0b;
}

.bullet-support {
  color: #60a5fa;
}

.role-req {
  font-size: 9.5px;
  font-weight: 400;
  opacity: 0.7;
}

.coach-role-content {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  flex: 1;
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
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 9px;
  padding: 0 1px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.coach-chip-remove:hover {
  color: var(--accent-red);
}

.coach-add-btn {
  background: rgba(245, 158, 11, 0.1);
  border: 1px dashed rgba(245, 158, 11, 0.35);
  color: #f59e0b;
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
  background: rgba(245, 158, 11, 0.2);
  border-color: #f59e0b;
}

.coach-add-btn.btn-support {
  background: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.35);
  color: #60a5fa;
}

:root[data-theme="light"] .coach-add-btn.btn-support {
  color: #2563eb;
}

.coach-add-btn.btn-support:hover {
  background: rgba(59, 130, 246, 0.18);
  border-color: #3b82f6;
}

.inline-name-box {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
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
