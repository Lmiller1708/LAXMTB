<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { Race, CoachSlot, WarmupGroup } from '../types/race'
import { useCurrentRace } from '../composables/useCurrentRace'
import { useCoachAuth } from '~/modules/coach-admin/composables/useCoachAuth'
import { getCategoryStartTime, getCategoryStageTime } from '~/modules/results/services/raceresultService'
import { useNotificationSubscriptions } from '~/modules/notifications/composables/useNotificationSubscriptions'

type SessionKey = 'pr' | 'wu'

const props = defineProps<{
  race: Race
  isCoachAuth?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'openAuth'): void
}>()

const { updateRace } = useCurrentRace()
const { user, userProfile, canEditCoachSignups } = useCoachAuth()
const {
  subscribeRideGroup,
  unsubscribeRideGroup,
  toggleRideGroupSubscription,
  isRideGroupSubscribed
} = useNotificationSubscriptions()

const isOpen = ref(true)
const activeSession = ref<SessionKey>('pr')

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
    return props.race.warmupGroups
  }
  return coachData.value?.warmups || []
})

const getSlotCategories = (slot: any): string[] => {
  if (Array.isArray(slot.categories)) return slot.categories
  return []
}

const getCatStart = (cat: string) => getCategoryStartTime(props.race, cat)
const getCatStage = (cat: string) => getCategoryStageTime(props.race, cat)

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
  if (!canEditCoachSignups.value) {
    emit('openAuth')
    return
  }
  activeInputSlotId.value = slotId
  activeInputRole.value = role
  inlineNameInput.value = ''
  nextTick(() => {
    inlineInputRef.value?.focus()
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

const addMeQuick = async (slot: any, role: 'leader' | 'support') => {
  const name = getMyName.value
  if (!name) return
  await saveCoachName(slot, role, name)
  cancelInlineInput()
}

const submitInlineName = async (slot: any, role: 'leader' | 'support') => {
  const val = inlineNameInput.value.trim()
  if (!val) {
    cancelInlineInput()
    return
  }
  await saveCoachName(slot, role, val)
  cancelInlineInput()
}

const saveCoachName = async (slot: any, role: 'leader' | 'support', name: string) => {
  const updatedRace = JSON.parse(JSON.stringify(props.race)) as Race
  if (!updatedRace.coachSignups) {
    updatedRace.coachSignups = { policy: '', preRides: [], warmups: [] }
  }

  // Update in coachSignups.preRides / coachSignups.warmups
  const list = activeSession.value === 'pr'
    ? updatedRace.coachSignups.preRides
    : updatedRace.coachSignups.warmups

  const targetSlot = list?.find(s => s.id === slot.id)
  if (targetSlot) {
    if (role === 'leader') {
      if (!targetSlot.leaders) targetSlot.leaders = []
      if (!targetSlot.leaders.includes(name)) {
        targetSlot.leaders.push(name)
      }
    } else {
      if (!targetSlot.support) targetSlot.support = []
      if (!targetSlot.support.includes(name)) {
        targetSlot.support.push(name)
      }
    }
  }

  // Also update in updatedRace.warmupGroups if applicable
  if (activeSession.value === 'wu' && updatedRace.warmupGroups) {
    const wgSlot = updatedRace.warmupGroups.find(w => w.id === slot.id)
    if (wgSlot) {
      if (role === 'leader') {
        if (!wgSlot.leaders) wgSlot.leaders = []
        if (!wgSlot.leaders.includes(name)) wgSlot.leaders.push(name)
      } else {
        if (!wgSlot.support) wgSlot.support = []
        if (!wgSlot.support.includes(name)) wgSlot.support.push(name)
      }
    }
  }

  await updateRace(updatedRace)

  // Automatically subscribe the coach to ride group notifications
  if (!isRideGroupSubscribed(slot.id)) {
    subscribeRideGroup({
      id: slot.id,
      name: slot.name || (activeSession.value === 'wu' ? 'Warm-up Group' : 'Pre-Ride Wave'),
      sessionType: activeSession.value,
      meetingTime: slot.meetingTime || '8:00 AM',
      stagingTime: slot.stagingTime,
      day: slot.day,
      date: slot.date,
      categories: getSlotCategories(slot),
      raceId: props.race.id
    })
  }
}

const removeCoachName = async (slot: any, role: 'leader' | 'support', index: number) => {
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

  // Also remove from updatedRace.warmupGroups if applicable
  if (activeSession.value === 'wu' && updatedRace.warmupGroups) {
    const wgSlot = updatedRace.warmupGroups.find(w => w.id === slot.id)
    if (wgSlot) {
      if (role === 'leader' && wgSlot.leaders) {
        wgSlot.leaders.splice(index, 1)
      } else if (role === 'support' && wgSlot.support) {
        wgSlot.support.splice(index, 1)
      }
    }
  }

  await updateRace(updatedRace)

  // Check if current coach is still signed up for this slot; if not, remove subscription
  const myName = getMyName.value
  const slotAfter = (activeSession.value === 'pr'
    ? updatedRace.coachSignups?.preRides
    : (updatedRace.warmupGroups || updatedRace.coachSignups?.warmups)
  )?.find(s => s.id === slot.id)

  const stillSignedUp = slotAfter && (
    (slotAfter.leaders && slotAfter.leaders.includes(myName)) ||
    (slotAfter.support && slotAfter.support.includes(myName))
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
          <span v-if="!canEditCoachSignups" class="signup-badge-closed">🔒 Locked</span>
          <span v-else class="signup-badge-active">✏️ Editing Enabled</span>
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
      <!-- Session Pills Toolbar -->
      <div class="signup-tabs-toolbar" style="margin-bottom:8px;">
        <div class="signup-pills-group">
          <button
            type="button"
            class="signup-tab-pill"
            :class="{ active: activeSession === 'pr' }"
            @click="activeSession = 'pr'"
          >
            <span>🚵</span> Pre-Rides
          </button>
          <button
            type="button"
            class="signup-tab-pill pill-league"
            :class="{ active: activeSession === 'wu' }"
            @click="activeSession = 'wu'"
          >
            <span>🔥</span> Warm-ups
          </button>
        </div>
      </div>

      <!-- Locked Banner for Logged-Out Users -->
      <div v-if="!canEditCoachSignups" class="coach-locked-banner">
        <div class="locked-banner-text">
          <span style="font-size:16px;">🔒</span>
          <div>
            <div class="locked-banner-title">Coach Sign-Up Locked</div>
            <div class="locked-banner-desc">Sign in to claim ride leader/support slots or edit names.</div>
          </div>
        </div>
        <button
          type="button"
          class="coach-unlock-signin-btn"
          @click="emit('openAuth')"
        >
          Sign In
        </button>
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
                  <template v-if="slot.stagingTime">
                    <span class="time-badge" style="font-size:10.5px;padding:1px 6px;">
                      <span style="font-size:9px;color:var(--text-muted);font-weight:700;margin-right:2px;">MEET</span>{{ slot.meetingTime }}
                    </span>
                    <span class="time-badge" style="border-color:rgba(239,68,68,0.4);color:#f87171;font-size:10.5px;padding:1px 6px;">
                      <span style="font-size:9px;opacity:0.8;font-weight:700;margin-right:2px;">STAGE</span>{{ slot.stagingTime }}
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
                      <!-- Leader Names -->
                      <div
                        v-for="(name, idx) in (slot.leaders || [])"
                        :key="idx"
                        class="coach-chip"
                      >
                        <span>{{ name }}</span>
                        <!-- ✕ Remove button only visible if user can edit -->
                        <button
                          v-if="canEditCoachSignups"
                          type="button"
                          class="coach-chip-remove"
                          title="Remove coach"
                          @click="removeCoachName(slot, 'leader', idx)"
                        >
                          ✕
                        </button>
                      </div>

                      <!-- Empty slot notice when locked -->
                      <span
                        v-if="!canEditCoachSignups && (!slot.leaders || slot.leaders.length === 0)"
                        class="coach-empty-slot"
                      >
                        Open slot (Sign in to claim)
                      </span>

                      <!-- Add Leader Button (only if can edit) -->
                      <button
                        v-if="canEditCoachSignups && !(activeInputSlotId === slot.id && activeInputRole === 'leader')"
                        type="button"
                        class="coach-add-btn"
                        @click="startInlineInput(slot.id, 'leader')"
                      >
                        <span>+</span> {{ (slot.leaders && slot.leaders.length > 0) ? 'Add' : 'Add Leader' }}
                      </button>

                      <!-- Inline Leader Input -->
                      <div
                        v-if="canEditCoachSignups && activeInputSlotId === slot.id && activeInputRole === 'leader'"
                        class="inline-name-box"
                      >
                        <input
                          ref="inlineInputRef"
                          v-model="inlineNameInput"
                          type="text"
                          placeholder="Coach name..."
                          class="custom-minutes-input inline-name-field"
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
                          v-if="user"
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
                      <!-- Support Names -->
                      <div
                        v-for="(name, idx) in (slot.support || [])"
                        :key="idx"
                        class="coach-chip"
                      >
                        <span>{{ name }}</span>
                        <!-- ✕ Remove button only visible if user can edit -->
                        <button
                          v-if="canEditCoachSignups"
                          type="button"
                          class="coach-chip-remove"
                          title="Remove coach"
                          @click="removeCoachName(slot, 'support', idx)"
                        >
                          ✕
                        </button>
                      </div>

                      <!-- Empty slot notice when locked -->
                      <span
                        v-if="!canEditCoachSignups && (!slot.support || slot.support.length === 0)"
                        class="coach-empty-slot"
                      >
                        Open slot (Sign in to claim)
                      </span>

                      <!-- Add Support Button (only if can edit) -->
                      <button
                        v-if="canEditCoachSignups && !(activeInputSlotId === slot.id && activeInputRole === 'support')"
                        type="button"
                        class="coach-add-btn btn-support"
                        @click="startInlineInput(slot.id, 'support')"
                      >
                        <span>+</span> {{ (slot.support && slot.support.length > 0) ? 'Add' : 'Add Support' }}
                      </button>

                      <!-- Inline Support Input -->
                      <div
                        v-if="canEditCoachSignups && activeInputSlotId === slot.id && activeInputRole === 'support'"
                        class="inline-name-box"
                      >
                        <input
                          ref="inlineInputRef"
                          v-model="inlineNameInput"
                          type="text"
                          placeholder="Coach name..."
                          class="custom-minutes-input inline-name-field"
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
                          v-if="user"
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
  gap: 4px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-main);
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
