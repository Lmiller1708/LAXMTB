<script setup lang="ts">
import type { Race, CoachSlot } from '../types/race'
import { useCurrentRace } from '../composables/useCurrentRace'
import { useCoachAuth } from '~/modules/coach-admin/composables/useCoachAuth'

type SessionKey = 'pr' | 'wu'

const props = defineProps<{
  race: Race
  isCoachAuth?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
}>()

const { updateRace } = useCurrentRace()
const { user } = useCoachAuth()

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

const warmupSlots = computed<CoachSlot[]>(() => {
  return coachData.value?.warmups || []
})

interface DayGroup {
  day: string
  date: string
  subtitle: string
  isRaceDay: boolean
  slots: CoachSlot[]
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
  return user.value?.displayName || user.value?.email?.split('@')[0] || 'Coach'
})

const addMeQuick = async (slot: CoachSlot, role: 'leader' | 'support') => {
  const name = getMyName.value
  if (!name) return
  await saveCoachName(slot, role, name)
  cancelInlineInput()
}

const submitInlineName = async (slot: CoachSlot, role: 'leader' | 'support') => {
  const val = inlineNameInput.value.trim()
  if (!val) {
    cancelInlineInput()
    return
  }
  await saveCoachName(slot, role, val)
  cancelInlineInput()
}

const saveCoachName = async (slot: CoachSlot, role: 'leader' | 'support', name: string) => {
  const updatedRace = JSON.parse(JSON.stringify(props.race)) as Race
  if (!updatedRace.coachSignups) {
    updatedRace.coachSignups = { policy: '', preRides: [], warmups: [] }
  }

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
    await updateRace(updatedRace)
  }
}

const removeCoachName = async (slot: CoachSlot, role: 'leader' | 'support', index: number) => {
  const updatedRace = JSON.parse(JSON.stringify(props.race)) as Race
  const list = activeSession.value === 'pr'
    ? updatedRace.coachSignups?.preRides
    : updatedRace.coachSignups?.warmups

  const targetSlot = list?.find(s => s.id === slot.id)
  if (targetSlot) {
    if (role === 'leader') {
      targetSlot.leaders?.splice(index, 1)
    } else {
      targetSlot.support?.splice(index, 1)
    }
    await updateRace(updatedRace)
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
          <span class="signup-badge-closed">Coaches Only</span>
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button
          v-if="isCoachAuth"
          type="button"
          class="card-inline-edit-btn"
          title="Edit Coach Sign-ups"
          @click.stop="emit('edit')"
        >
          <span>✏️</span>
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

      <!-- Schedule Days Container -->
      <div class="detail-section-body" style="padding-top:0;">
        <div v-if="activeDayGroups.length === 0" class="no-results" style="padding:16px;text-align:center;">
          No coach sign-up sessions configured for this event yet.
        </div>

        <div v-else class="schedule-days-container">
          <div
            v-for="grp in activeDayGroups"
            :key="grp.day"
            class="schedule-day-group"
            :class="{ 'group-raceday': grp.isRaceDay }"
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

                  <!-- Time Badges -->
                  <div class="coach-slot-time-group">
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
                  </div>
                </div>

                <!-- Slot Body -->
                <div class="coach-slot-body">
                  <div v-if="slot.ridersAllowed" class="coach-slot-desc">
                    {{ slot.ridersAllowed }}
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
                          <button
                            type="button"
                            class="coach-chip-remove"
                            title="Remove coach"
                            @click="removeCoachName(slot, 'leader', idx)"
                          >
                            ✕
                          </button>
                        </div>

                        <!-- Add Leader Button -->
                        <button
                          v-if="!(activeInputSlotId === slot.id && activeInputRole === 'leader')"
                          type="button"
                          class="coach-add-btn"
                          @click="startInlineInput(slot.id, 'leader')"
                        >
                          <span>+</span> {{ (slot.leaders && slot.leaders.length > 0) ? 'Add' : 'Add Leader' }}
                        </button>

                        <!-- Inline Leader Input -->
                        <div
                          v-if="activeInputSlotId === slot.id && activeInputRole === 'leader'"
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
                          <button
                            type="button"
                            class="coach-chip-remove"
                            title="Remove coach"
                            @click="removeCoachName(slot, 'support', idx)"
                          >
                            ✕
                          </button>
                        </div>

                        <!-- Add Support Button -->
                        <button
                          v-if="!(activeInputSlotId === slot.id && activeInputRole === 'support')"
                          type="button"
                          class="coach-add-btn btn-support"
                          @click="startInlineInput(slot.id, 'support')"
                        >
                          <span>+</span> {{ (slot.support && slot.support.length > 0) ? 'Add' : 'Add Support' }}
                        </button>

                        <!-- Inline Support Input -->
                        <div
                          v-if="activeInputSlotId === slot.id && activeInputRole === 'support'"
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
.coach-slot-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 5px;
}

.coach-slot-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.coach-slot-header {
  padding: 6px 10px;
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.coach-slot-title-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.coach-slot-title {
  font-size: 12.5px;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: 0.2px;
}

.coach-slot-time-group {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: auto;
}

.coach-slot-body {
  padding: 5px 10px 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.coach-slot-desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.35;
  margin-bottom: 2px;
}

.coach-roles-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.coach-role-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
  min-height: 24px;
}

.coach-role-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-main);
  min-width: 112px;
  flex-shrink: 0;
  line-height: 1.2;
}

.role-bullet {
  font-size: 14px;
  line-height: 1;
}
.role-bullet.bullet-leader {
  color: var(--accent-red);
}
.role-bullet.bullet-support {
  color: #60a5fa;
}

.role-req {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
}

.coach-role-content {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  flex: 1;
}

.coach-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1.5px 7px;
  background: var(--bg-surface, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.25;
}

.coach-chip-remove {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0 1px;
  font-size: 9.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  opacity: 0.75;
  transition: opacity 0.15s ease, background 0.15s ease;
}

.coach-chip-remove:hover {
  opacity: 1;
  background: rgba(239, 68, 68, 0.15);
}

.coach-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10.5px;
  font-weight: 600;
  padding: 1.5px 7px;
  border-radius: 4px;
  border: 1px solid rgba(220, 38, 38, 0.35);
  background: rgba(220, 38, 38, 0.08);
  color: var(--accent-red);
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.3;
}

.coach-add-btn:hover {
  background: rgba(220, 38, 38, 0.18);
  border-color: var(--accent-red);
}

.coach-add-btn.btn-support {
  border-color: rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.08);
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
