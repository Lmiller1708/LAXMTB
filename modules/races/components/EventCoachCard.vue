<script setup lang="ts">
import type { Race } from '../types/race'

type SessionKey = 'pr' | 'wu'
type SlotTagClass = 'tag-preride' | 'tag-special' | ''

interface CoachSlot {
  id: string
  start: string
  end: string
  duration: string
  name: string
  desc: string
  tag: string
  tagClass: SlotTagClass
  cap: { fill: number; text: string; tone: 'ok' | 'warn' | 'full' }
}

const props = defineProps<{
  race: Race
  isCoachAuth?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
}>()

const isOpen = ref(true)
const activeSession = ref<SessionKey>('pr')

const leaderClaims = ref<Record<string, string | null>>({})
const supportCoaches = ref<Record<string, string[]>>({})

const preRideSlots: CoachSlot[] = [
  {
    id: 'A',
    start: '5:00 PM',
    end: '6:00 PM',
    duration: '60 min',
    name: 'Coaches Only Pre-Ride',
    desc: 'Course preview for credentialed coaches only.',
    tag: 'Coaches',
    tagClass: 'tag-preride',
    cap: { fill: 50, text: '2 / 4', tone: 'ok' }
  },
  {
    id: 'B',
    start: '6:00 PM',
    end: '7:00 PM',
    duration: '60 min',
    name: 'Varsity / JV3 Pre-Ride',
    desc: 'Guided preview for Varsity & JV3 athletes.',
    tag: 'Varsity / JV3',
    tagClass: 'tag-special',
    cap: { fill: 75, text: '3 / 4', tone: 'warn' }
  }
]

const warmupSlots: CoachSlot[] = [
  {
    id: 'E',
    start: '8:30 AM',
    end: '9:00 AM',
    duration: '30 min',
    name: 'JV1 / JV2 Warm-up',
    desc: 'Warm-up for younger athletes.',
    tag: 'JV1 / JV2',
    tagClass: '',
    cap: { fill: 33, text: '1 / 3', tone: 'ok' }
  },
  {
    id: 'F',
    start: '8:30 AM',
    end: '9:15 AM',
    duration: '45 min',
    name: 'JV3 / Varsity Warm-up',
    desc: 'Higher-intensity warm-up.',
    tag: 'JV3 / Varsity',
    tagClass: 'tag-special',
    cap: { fill: 0, text: '0 / 3', tone: 'ok' }
  },
  {
    id: 'G',
    start: '9:00 AM',
    end: '9:30 AM',
    duration: '30 min',
    name: 'First-Wave Activation',
    desc: 'Last-minute activation.',
    tag: 'First Wave',
    tagClass: '',
    cap: { fill: 67, text: '2 / 3', tone: 'warn' }
  },
  {
    id: 'H',
    start: '7:00 AM',
    end: '7:45 AM',
    duration: '45 min',
    name: 'All-Levels Warm-up',
    desc: 'General warm-up for all.',
    tag: 'All Levels',
    tagClass: '',
    cap: { fill: 0, text: '0 / 4', tone: 'ok' }
  }
]

const sessionMeta = computed(() => {
  if (activeSession.value === 'pr') {
    return {
      icon: '🚵',
      badgeText: 'Pre-Rides',
      badgeClass: 'signup-badge-lax',
      desc: 'Each session needs a Ride Leader (NICA Level 2+) and optional Ride Support (L1–L3). Add a name to volunteer.',
      day: 'Saturday',
      date: 'Sept 5',
      subtitle: 'South Conference',
      isRaceDay: false,
      slots: preRideSlots
    }
  }
  return {
    icon: '🔥',
    badgeText: 'Warm-ups',
    badgeClass: 'signup-badge-league',
    desc: 'Race-day warm-up shifts. Ride Leader (NICA Level 2+) required; Ride Support is optional.',
    day: 'Sunday',
    date: 'Sept 6',
    subtitle: 'North Conference • Race Day',
    isRaceDay: true,
    slots: warmupSlots
  }
})

function getLeaderName(slotId: string): string | null {
  return leaderClaims.value[slotId] || null
}

function toggleLeader(slotId: string) {
  const current = getLeaderName(slotId)
  if (current) {
    leaderClaims.value[slotId] = null
    return
  }
  const name = window.prompt('Enter Ride Leader name:')
  if (name && name.trim()) {
    leaderClaims.value[slotId] = name.trim()
  }
}

function addSupport(slotId: string) {
  const name = window.prompt('Enter Ride Support name:')
  if (!name || !name.trim()) return
  if (!supportCoaches.value[slotId]) supportCoaches.value[slotId] = []
  supportCoaches.value[slotId].push(name.trim())
}

function removeSupport(slotId: string, idx: number) {
  supportCoaches.value[slotId]?.splice(idx, 1)
}

function capBadgeClass(tone: CoachSlot['cap']['tone']) {
  if (tone === 'full') return 'category-time-badge'
  if (tone === 'warn') return 'category-time-badge'
  return 'category-badge'
}
</script>

<template>
  <div class="signup-hub-section" :class="{ 'card-collapsed': !isOpen }" id="coachSignupHub">
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
      <div class="signup-tabs-toolbar">
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

      <div class="signup-shift-summary">
        <span :class="sessionMeta.badgeClass">{{ sessionMeta.badgeText }}</span>
        <span class="signup-shift-desc">{{ sessionMeta.desc }}</span>
      </div>

      <div class="detail-section-body">
        <div class="schedule-days-container">
          <div class="schedule-day-group" :class="{ 'group-raceday': sessionMeta.isRaceDay }">
            <div class="schedule-day-header" :class="{ 'day-raceday': sessionMeta.isRaceDay }">
              <div style="display:flex;align-items:center;gap:6px;">
                <span>{{ sessionMeta.icon }}</span>
                <span style="font-weight:800;">{{ sessionMeta.day }}</span>
                <span class="schedule-date-badge">📅 {{ sessionMeta.date }}</span>
              </div>
              <span class="schedule-day-badge">{{ sessionMeta.subtitle }}</span>
            </div>

            <div class="coach-slot-list">
              <div
                v-for="slot in sessionMeta.slots"
                :key="slot.id"
                class="event-location-card coach-slot-card"
                :class="{ 'coach-slot-full': slot.cap.tone === 'full' }"
              >
                <div class="location-card-header">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0;">
                    <span class="location-card-title">{{ slot.name }}</span>
                    <span class="schedule-tag" :class="slot.tagClass">{{ slot.tag }}</span>
                    <span :class="capBadgeClass(slot.cap.tone)">{{ slot.cap.text }}</span>
                  </div>
                  <span class="schedule-row-time" style="display:flex;align-items:center;gap:4px;">
                    <span class="time-badge">{{ slot.start }}</span>
                    <span class="time-to-badge">to</span>
                    <span class="time-badge">{{ slot.end }}</span>
                  </span>
                </div>

                <div class="location-card-body" style="padding:12px 16px 14px;">
                  <div class="location-address-text" style="margin-top:0;margin-bottom:10px;">
                    {{ slot.desc }} · {{ slot.duration }}
                  </div>

                  <ul class="schedule-day-list" style="padding:0;">
                    <li class="schedule-row">
                      <span class="schedule-row-time">
                        <span class="schedule-tag tag-special">Ride Leader</span>
                        <span class="schedule-tag tag-preride">L2+</span>
                      </span>
                      <div class="schedule-row-desc">
                        <span v-if="getLeaderName(slot.id)" style="color:var(--text-main);font-weight:700;">{{ getLeaderName(slot.id) }}</span>
                        <span v-else>Available</span>
                        <button
                          type="button"
                          class="btn-icon"
                          @click="toggleLeader(slot.id)"
                        >
                          {{ getLeaderName(slot.id) ? '✕ Remove' : '+ Add Name' }}
                        </button>
                      </div>
                    </li>

                    <li
                      v-if="!supportCoaches[slot.id] || supportCoaches[slot.id].length === 0"
                      class="schedule-row"
                    >
                      <span class="schedule-row-time">
                        <span class="schedule-tag">Ride Support</span>
                      </span>
                      <div class="schedule-row-desc">
                        <span>No ride support yet</span>
                      </div>
                    </li>
                    <li
                      v-for="(name, idx) in supportCoaches[slot.id]"
                      :key="idx"
                      class="schedule-row"
                    >
                      <span class="schedule-row-time">
                        <span class="schedule-tag">Ride Support</span>
                        <span class="schedule-tag">L1–L3</span>
                      </span>
                      <div class="schedule-row-desc">
                        <span style="color:var(--text-main);font-weight:700;">{{ name }}</span>
                        <button type="button" class="btn-icon" @click="removeSupport(slot.id, idx)">✕ Remove</button>
                      </div>
                    </li>
                  </ul>

                  <div class="event-action-buttons" style="margin-top:10px;">
                    <button type="button" class="btn-icon" @click="addSupport(slot.id)">
                      + Add Ride Support
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="event-warning-banner" style="margin-top:12px;">
          <span>⚠️</span>
          <span>
            <strong>Pre-Ride Policy:</strong> Ride Leader must hold NICA Level 2+ and is responsible for participants.
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
  gap: 10px;
  padding: 10px;
}

.coach-slot-card {
  margin-bottom: 0;
}

.coach-slot-full {
  opacity: 0.72;
}

@media (max-width: 650px) {
  .coach-slot-card .location-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
