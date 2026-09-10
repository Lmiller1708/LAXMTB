<script setup lang="ts">
import type { Race, ScheduleEvent, CoachSlot } from '~/modules/races/types/race'

const props = defineProps<{
  isOpen: boolean
  initialTab?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', race: Race): void
  (e: 'toast', msg: string): void
}>()

const { races, currentRaceIndex, selectRace, currentRace } = useCurrentRace()
const {
  user,
  isCoachAuth,
  isAuthorizedCoach,
  isAdminUnlocked,
  authError,
  authLoading,
  adminsList,
  adminsLoading,
  fetchAdmins,
  addCoachAdmin,
  updateCoachRole,
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

watch(currentRace, (newRace) => {
  form.value = JSON.parse(JSON.stringify(newRace))
}, { deep: true })

// State for adding new coach
const newCoachEmail = ref('')
const newCoachName = ref('')
const newCoachRole = ref<'admin' | 'coach'>('coach')
const isAddingCoach = ref(false)

const handleAddCoach = async () => {
  if (!newCoachEmail.value) return
  isAddingCoach.value = true
  const res = await addCoachAdmin(newCoachEmail.value, newCoachName.value, newCoachRole.value)
  isAddingCoach.value = false
  if (res.success) {
    const roleLabel = newCoachRole.value === 'admin' ? 'Coach Admin' : 'Coach'
    emit('toast', `✅ Added ${newCoachEmail.value} as ${roleLabel}!`)
    newCoachEmail.value = ''
    newCoachName.value = ''
    newCoachRole.value = 'coach'
  } else {
    emit('toast', `⛔ ${res.error || 'Failed to add coach'}`)
  }
}

const handleUpdateRole = async (email: string, role: 'admin' | 'coach') => {
  const res = await updateCoachRole(email, role)
  if (res.success) {
    emit('toast', `🔄 Updated ${email} to ${role === 'admin' ? 'Coach Admin' : 'Coach'}`)
  } else {
    emit('toast', `⛔ ${res.error || 'Failed to update role'}`)
  }
}

const handleRemoveCoach = async (email: string) => {
  if (confirm(`Are you sure you want to remove access for ${email}?`)) {
    const res = await removeCoachAdmin(email)
    if (res.success) {
      emit('toast', `🗑️ Removed ${email}`)
    } else {
      emit('toast', `⛔ ${res.error || 'Failed to remove coach'}`)
    }
  }
}

// Which screen to show inside the modal
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
  emit('close')
}

const handleLockAdmin = () => {
  lockAdmin()
  emit('toast', '🔒 Admin editing locked')
  emit('close')
}

const handleUnlockAdmin = () => {
  unlockAdmin()
  emit('toast', `🔓 Admin editing unlocked — welcome back, ${user.value?.displayName?.split(' ')[0] || 'Coach'}!`)
}

const handleSave = () => {
  emit('save', JSON.parse(JSON.stringify(form.value)))
  emit('toast', '💾 Changes saved!')
  emit('close')
}

const addGuideline = () => {
  if (!form.value.guidelines) form.value.guidelines = []
  form.value.guidelines.push('')
}

const removeGuideline = (idx: number) => {
  form.value.guidelines.splice(idx, 1)
}

const addScheduleDay = () => {
  if (!form.value.schedule) form.value.schedule = []
  form.value.schedule.push({
    day: 'New Day',
    date: '',
    subtitle: '',
    isRaceDay: false,
    events: [
      { time: '9:00 AM', desc: '', tag: 'Team Event' }
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

const TIME_OPTIONS = (() => {
  const times: string[] = []
  const periods = ['AM', 'PM']
  for (let p = 0; p < 2; p++) {
    const period = periods[p]
    const hours = period === 'AM' ? [6, 7, 8, 9, 10, 11] : [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    for (const h of hours) {
      for (const m of ['00', '15', '30', '45']) {
        times.push(`${h}:${m} ${period}`)
      }
    }
  }
  return times
})()

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

// Drag and Drop: Venue Guidelines
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
  if (draggedGuidelineIdx.value !== null && draggedGuidelineIdx.value !== idx) {
    guidelineDragOverIdx.value = idx
  }
}

const onGuidelineDrop = (targetIdx: number, e: DragEvent) => {
  e.preventDefault()
  if (draggedGuidelineIdx.value === null || !form.value.guidelines) return
  const from = draggedGuidelineIdx.value
  const to = targetIdx
  if (from !== to && form.value.guidelines[from] !== undefined) {
    const item = form.value.guidelines.splice(from, 1)[0]
    form.value.guidelines.splice(to, 0, item)
  }
  draggedGuidelineIdx.value = null
  guidelineDragOverIdx.value = null
}

const onGuidelineDragEnd = () => {
  draggedGuidelineIdx.value = null
  guidelineDragOverIdx.value = null
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

// Coach Sign-Ups Admin State & Methods
const activeCoachAdminTab = ref<'pr' | 'wu'>('pr')

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
    list.push({
      id: newId,
      name: 'All Team Pre-Ride Wave',
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

const DAY_OPTIONS = ['Friday', 'Saturday', 'Sunday', 'Monday']

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
</script>

<template>
  <div v-if="isOpen" class="modal-overlay show" id="adminModalOverlay" @click.self="emit('close')">
    <div class="modal-card admin-modal-card" role="dialog" aria-modal="true" aria-labelledby="adminModalTitle">

      <!-- SCREEN 1: Sign-In (not authenticated) -->
      <div v-if="screen === 'signin'" style="display:flex;flex-direction:column;">
        <div class="modal-header" style="border-bottom:none;padding-bottom:14px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:22px;">🔒</span>
            <div>
              <h3 id="adminModalTitle" style="margin:0;font-size:17px;font-weight:700;color:var(--text-main);">Coach Portal Access</h3>
              <p style="margin:2px 0 0;font-size:12px;color:var(--text-muted);">Sign in with an authorized Google account to manage race settings</p>
            </div>
          </div>
          <button type="button" class="modal-close-btn" aria-label="Close modal" @click="emit('close')">✕</button>
        </div>

        <div style="padding:16px 18px 20px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;">
          <!-- Google Sign-In Button -->
          <button
            type="button"
            class="google-signin-btn"
            :disabled="authLoading"
            @click="handleSignIn"
          >
            <span v-if="authLoading" style="display:flex;align-items:center;gap:8px;">
              <span class="tab-loading-spinner" style="width:18px;height:18px;border-width:2px;" />
              Verifying...
            </span>
            <span v-else style="display:flex;align-items:center;gap:10px;">
              <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Sign in with Google
            </span>
          </button>

          <!-- Error message -->
          <div
            v-if="authError"
            style="font-size:12.5px;color:#ef4444;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);padding:10px 14px;border-radius:8px;line-height:1.4;text-align:left;width:100%;box-sizing:border-box;"
          >
            {{ authError }}
          </div>

          <p style="font-size:11.5px;color:var(--text-dim);margin:0;line-height:1.4;">
            Access is restricted to authorized team coaches listed in the team's admin database.
          </p>
        </div>
      </div>

      <!-- SCREEN 2: Signed in but LOCKED -->
      <div v-else-if="screen === 'locked'" style="display:flex;flex-direction:column;">
        <div class="modal-header">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:20px;">🔒</span>
            <div>
              <h3 style="margin:0;font-size:16px;font-weight:700;color:var(--text-main);">Admin Editing Locked</h3>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">{{ user?.email }}</div>
            </div>
          </div>
          <button type="button" class="modal-close-btn" aria-label="Close modal" @click="emit('close')">✕</button>
        </div>

        <div style="padding:20px 18px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;">
          <div style="font-size:44px;">👋</div>
          <div>
            <div style="font-size:16px;font-weight:700;color:var(--text-main);margin-bottom:4px;">
              Welcome back, {{ user?.displayName?.split(' ')[0] || 'Coach' }}!
            </div>
            <div style="font-size:12.5px;color:var(--text-muted);line-height:1.5;">
              You're signed in but admin editing is currently locked.<br>
              Unlock to show edit buttons and manage race data.
            </div>
          </div>

          <button type="button" class="done-modal-btn admin-save-btn" style="width:100%;justify-content:center;" @click="handleUnlockAdmin">
            🔓 Unlock Admin Editing
          </button>

          <button type="button" @click="handleSignOut" style="font-size:12px;color:var(--text-muted);background:none;border:none;cursor:pointer;padding:4px 8px;text-decoration:underline;">
            Sign Out
          </button>
        </div>
      </div>

      <!-- SCREEN 3: Signed in and UNLOCKED — full dashboard -->
      <div v-else style="display:flex;flex-direction:column;height:100%;flex:1;overflow:hidden;">
        <div class="modal-header">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:20px;">⚙️</span>
            <div>
              <h3 style="margin:0;font-size:16px;font-weight:700;color:var(--text-main);">Coach Admin Portal</h3>
              <div style="display:flex;align-items:center;gap:6px;margin-top:2px;flex-wrap:wrap;">
                <span class="admin-status-pill">🟢 Live</span>
                <span style="font-size:10.5px;color:var(--accent-red);background:rgba(239,68,68,0.1);padding:1px 6px;border-radius:4px;font-weight:600;">
                  {{ user?.displayName || user?.email }}
                </span>
              </div>
            </div>
          </div>
          <button type="button" class="modal-close-btn" aria-label="Close modal" @click="emit('close')">✕</button>
        </div>

        <!-- Race Selector Toolbar -->
        <div class="admin-top-toolbar">
          <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:200px;">
            <label style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);white-space:nowrap;">Active Race:</label>
            <select
              :value="currentRaceIndex"
              class="admin-select-field"
              style="flex:1;"
              @change="selectRace(Number(($event.target as HTMLSelectElement).value))"
            >
              <option v-for="(r, idx) in races" :key="r.id" :value="idx">{{ r.name }}</option>
            </select>
          </div>
        </div>

        <!-- Admin Tabs -->
        <div class="admin-tab-bar">
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'venue' }" @click="activeTab = 'venue'">📍 Venue Info</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'schedule' }" @click="activeTab = 'schedule'">⏱️ Schedule</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'waves' }" @click="activeTab = 'waves'">⏱️ Race Info</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'signups' }" @click="activeTab = 'signups'">🤝 Volunteers & Food</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'coach' }" @click="activeTab = 'coach'">🚵 Coach Sign-Ups</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'photos' }" @click="activeTab = 'photos'">📸 Photos Album</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'maps' }" @click="activeTab = 'maps'">🗺️ Course Maps</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'announcements' }" @click="activeTab = 'announcements'">📢 Guidelines</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'coaches' }" @click="activeTab = 'coaches'">👥 Manage Coaches</button>
        </div>

        <!-- Tab Contents -->
        <div class="modal-body admin-modal-body" style="padding:16px;overflow-y:auto;flex:1;">

          <!-- Venue Info -->
          <div v-if="activeTab === 'venue'" style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <label class="modal-label">Event Name</label>
              <input v-model="form.name" type="text" class="custom-minutes-input" style="width:100%;">
            </div>
            <div>
              <label class="modal-label">Camping Theme</label>
              <input v-model="form.theme" type="text" placeholder="Camping Theme" class="custom-minutes-input" style="width:100%;">
            </div>
            <div style="grid-template-columns:1fr 1fr;display:grid;gap:10px;">
              <div>
                <label class="modal-label">Date String</label>
                <input v-model="form.dateStr" type="text" class="custom-minutes-input" style="width:100%;">
              </div>
              <div>
                <label class="modal-label">Conference</label>
                <input v-model="form.conference" type="text" class="custom-minutes-input" style="width:100%;">
              </div>
            </div>
            <div>
              <label class="modal-label">Trailhead / Venue Name</label>
              <input v-model="form.exactTrailhead" type="text" class="custom-minutes-input" style="width:100%;">
            </div>
            <div>
              <label class="modal-label">Address</label>
              <input v-model="form.address" type="text" class="custom-minutes-input" style="width:100%;">
            </div>
            <div>
              <label class="modal-label">Navigation URL (Google Maps)</label>
              <input v-model="form.navigationUrl" type="text" class="custom-minutes-input" style="width:100%;">
            </div>
            <div>
              <label class="modal-label">Wisconsin League Guide URL</label>
              <input v-model="form.eventGuideUrl" type="text" class="custom-minutes-input" style="width:100%;">
            </div>
            <div>
              <label class="modal-label">Warning Banner (HTML supported)</label>
              <textarea v-model="form.warning" rows="2" class="custom-minutes-input" style="width:100%;height:auto;" />
            </div>
          </div>

          <!-- Schedule Highlights -->
          <div v-else-if="activeTab === 'schedule'" style="display:flex;flex-direction:column;gap:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <h4 style="margin:0;font-size:14px;font-weight:700;color:var(--text-main);">⏱️ Team Schedule Highlights</h4>
                <p style="margin:2px 0 0;font-size:11.5px;color:var(--text-muted);">Manage weekend timeline days and scheduled events.</p>
              </div>
              <button type="button" class="action-mini-btn" @click="addScheduleDay">+ Add Day</button>
            </div>

            <div v-if="!form.schedule || form.schedule.length === 0" class="no-results" style="padding:16px;">
              No schedule days added yet. Click "+ Add Day" above.
            </div>

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
                  <span style="font-weight:800;font-size:13px;color:var(--text-main);">Day {{ dayIdx + 1 }}:</span>
                  <input
                    v-model="day.day"
                    type="text"
                    placeholder="e.g. Friday / Saturday / Sunday"
                    class="custom-minutes-input"
                    style="width:130px;font-weight:700;"
                    draggable="false"
                    @dragstart.stop
                  >
                  <input
                    v-model="day.date"
                    type="text"
                    placeholder="e.g. Sept 5"
                    class="custom-minutes-input"
                    style="width:100px;"
                    draggable="false"
                    @dragstart.stop
                  >
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
                  <button type="button" class="action-mini-btn" style="font-size:10.5px;padding:2px 8px;" @click="addScheduleEvent(dayIdx)">+ Add Event</button>
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
                    <span>⭐ Highlight</span>
                  </label>
                  <button
                    type="button"
                    class="search-clear-btn"
                    style="position:static;display:block;padding:2px 6px;"
                    title="Remove event"
                    @click="removeScheduleEvent(dayIdx, evIdx)"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Race Info / Waves -->
          <div v-else-if="activeTab === 'waves'" style="display:flex;flex-direction:column;gap:12px;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input v-model="form.isPublished" type="checkbox">
              <strong style="font-size:13px;color:var(--text-main);">Publish Live Results & Start Lists</strong>
            </label>
            <div>
              <label class="modal-label">RACE RESULT Event ID</label>
              <input v-model.number="form.eventId" type="number" placeholder="e.g. 358327" class="custom-minutes-input" style="width:100%;">
              <small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">
                Enter the numeric ID from my.raceresult.com/XXXXXX to stream live start lists and finish times.
              </small>
            </div>
          </div>

          <!-- Volunteers & Food -->
          <div v-else-if="activeTab === 'signups'" style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <label class="modal-label">Team Volunteers SignUp Code or URL</label>
              <input v-model="form.signups!.volunteer" type="text" class="custom-minutes-input" style="width:100%;">
            </div>
            <div>
              <label class="modal-label">Food & Hospitality SignUp Code or URL</label>
              <input v-model="form.signups!.food" type="text" class="custom-minutes-input" style="width:100%;">
            </div>
            <div>
              <label class="modal-label">Wisconsin League Volunteer Code or URL</label>
              <input v-model="form.signups!.league" type="text" class="custom-minutes-input" style="width:100%;">
            </div>
          </div>

          <!-- Coach Sign-Ups Management -->
          <div v-else-if="activeTab === 'coach'" style="display:flex;flex-direction:column;gap:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
              <div>
                <h4 style="margin:0;font-size:14px;font-weight:700;color:var(--text-main);">🚵 Coach Sign-Ups & Shifts</h4>
                <p style="margin:2px 0 0;font-size:11.5px;color:var(--text-muted);">Manage weekend pre-rides, warm-up waves, leaders, and support coaches.</p>
              </div>
              <button
                type="button"
                class="action-mini-btn"
                @click="addCoachSlot(activeCoachAdminTab)"
              >
                + Add {{ activeCoachAdminTab === 'pr' ? 'Pre-Ride' : 'Warm-up' }} Slot
              </button>
            </div>

            <!-- Sub-tab Switcher: Pre-Rides vs Warm-ups -->
            <div class="signup-tabs-toolbar" style="margin:0;">
              <div class="signup-pills-group">
                <button
                  type="button"
                  class="signup-tab-pill"
                  :class="{ active: activeCoachAdminTab === 'pr' }"
                  @click="activeCoachAdminTab = 'pr'"
                >
                  <span>🚵</span> Pre-Rides ({{ form.coachSignups?.preRides?.length || 0 }})
                </button>
                <button
                  type="button"
                  class="signup-tab-pill pill-league"
                  :class="{ active: activeCoachAdminTab === 'wu' }"
                  @click="activeCoachAdminTab = 'wu'"
                >
                  <span>🔥</span> Warm-ups ({{ form.coachSignups?.warmups?.length || 0 }})
                </button>
              </div>
            </div>

            <!-- Policy Warning Banner Editor -->
            <div>
              <label class="modal-label">Policy / Banner Notice</label>
              <textarea
                v-if="form.coachSignups"
                v-model="form.coachSignups.policy"
                rows="2"
                placeholder="Ride Leader must hold NICA Level 2+..."
                class="custom-minutes-input"
                style="width:100%;height:auto;"
              />
            </div>

            <!-- Slot List -->
            <div
              v-if="!form.coachSignups || (activeCoachAdminTab === 'pr' ? (!form.coachSignups.preRides || form.coachSignups.preRides.length === 0) : (!form.coachSignups.warmups || form.coachSignups.warmups.length === 0))"
              class="no-results"
              style="padding:16px;"
            >
              No {{ activeCoachAdminTab === 'pr' ? 'pre-ride' : 'warm-up' }} sessions configured. Click "+ Add Slot" above to create one.
            </div>

            <div
              v-for="(slot, slotIdx) in (activeCoachAdminTab === 'pr' ? form.coachSignups?.preRides : form.coachSignups?.warmups)"
              :key="slot.id || slotIdx"
              draggable="true"
              class="drag-row"
              :style="{
                background: 'var(--bg-card)',
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
              @drop="onCoachSlotDrop(slotIdx, activeCoachAdminTab, $event)"
              @dragend="onCoachSlotDragEnd"
            >
              <!-- Slot Top Row -->
              <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:8px;gap:8px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:260px;">
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
                    placeholder="Session Name / Category (e.g. Varsity, JV3 Boys)"
                    class="custom-minutes-input"
                    style="flex:2;min-width:160px;font-weight:700;"
                    draggable="false"
                    @dragstart.stop
                  >
                  <input
                    v-model="slot.tag"
                    type="text"
                    placeholder="Tag (e.g. Coaches, Varsity)"
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
                    @click="removeCoachSlot(activeCoachAdminTab, slotIdx)"
                  >
                    ✕ Delete Slot
                  </button>
                </div>
              </div>

              <!-- Day & Time Pickers -->
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

                <!-- Meeting Time Start/End Pickers -->
                <div style="flex:1;min-width:210px;">
                  <label class="modal-label" style="font-size:10.5px;">Meeting Time</label>
                  <div style="display:flex;align-items:center;gap:4px;">
                    <select
                      :value="getSlotStart(slot.meetingTime)"
                      class="custom-minutes-input"
                      style="flex:1;font-size:11px;height:30px;padding:2px 4px;"
                      @change="onSlotStartChange(slot, ($event.target as HTMLSelectElement).value)"
                    >
                      <option v-if="getSlotStart(slot.meetingTime) && !TIME_OPTIONS.includes(getSlotStart(slot.meetingTime))" :value="getSlotStart(slot.meetingTime)">
                        {{ getSlotStart(slot.meetingTime) }}
                      </option>
                      <option v-for="t in TIME_OPTIONS" :key="t" :value="t">{{ t }}</option>
                    </select>
                    <span style="font-size:10.5px;color:var(--text-muted);">to</span>
                    <select
                      :value="getSlotEnd(slot.meetingTime)"
                      class="custom-minutes-input"
                      style="flex:1;font-size:11px;height:30px;padding:2px 4px;"
                      @change="onSlotEndChange(slot, ($event.target as HTMLSelectElement).value)"
                    >
                      <option value="">-- Single Time --</option>
                      <option v-if="getSlotEnd(slot.meetingTime) && !TIME_OPTIONS.includes(getSlotEnd(slot.meetingTime))" :value="getSlotEnd(slot.meetingTime)">
                        {{ getSlotEnd(slot.meetingTime) }}
                      </option>
                      <option v-for="t in TIME_OPTIONS" :key="t" :value="t">{{ t }}</option>
                    </select>
                  </div>
                </div>

                <!-- Staging Time Picker (Warm-ups only) -->
                <div v-if="activeCoachAdminTab === 'wu'" style="min-width:130px;">
                  <label class="modal-label" style="font-size:10.5px;color:#f87171;">Staging Time</label>
                  <select
                    v-model="slot.stagingTime"
                    class="custom-minutes-input"
                    style="width:100%;font-size:11px;height:30px;padding:2px 4px;border-color:rgba(239,68,68,0.4);"
                  >
                    <option value="">-- None --</option>
                    <option v-if="slot.stagingTime && !TIME_OPTIONS.includes(slot.stagingTime)" :value="slot.stagingTime">
                      {{ slot.stagingTime }}
                    </option>
                    <option v-for="t in TIME_OPTIONS" :key="t" :value="t">{{ t }}</option>
                  </select>
                </div>
              </div>

              <!-- Riders Allowed Description -->
              <div draggable="false" @dragstart.stop>
                <label class="modal-label" style="font-size:10.5px;">Riders Allowed / Description</label>
                <input
                  v-model="slot.ridersAllowed"
                  type="text"
                  placeholder="e.g. Course preview for credentialed coaches only."
                  class="custom-minutes-input"
                  style="width:100%;font-size:11.5px;"
                >
              </div>
            </div>
          </div>

          <!-- Photos Album -->
          <div v-else-if="activeTab === 'photos'" style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <label class="modal-label">Google Photos Shared Album URL</label>
              <input v-model="form.photosUrl" type="text" placeholder="https://photos.app.goo.gl/..." class="custom-minutes-input" style="width:100%;">
            </div>
          </div>

          <!-- Course Maps -->
          <div v-else-if="activeTab === 'maps'" style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <label class="modal-label">Google MyMaps Embed URL</label>
              <input v-model="form.embedMapUrl" type="text" placeholder="https://www.google.com/maps/d/embed?mid=..." class="custom-minutes-input" style="width:100%;">
            </div>
            <div>
              <label class="modal-label">Direct Full Map URL</label>
              <input v-model="form.fullMapUrl" type="text" placeholder="https://www.google.com/maps/d/viewer?mid=..." class="custom-minutes-input" style="width:100%;">
            </div>
          </div>

          <!-- Guidelines -->
          <div v-else-if="activeTab === 'announcements'" style="display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <label class="modal-label" style="margin:0;">Venue Guidelines & Spectator Rules</label>
              <button type="button" class="action-mini-btn" @click="addGuideline">+ Add Item</button>
            </div>
            <div
              v-for="(g, idx) in form.guidelines"
              :key="idx"
              draggable="true"
              class="drag-row"
              :style="{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                padding: '4px 6px',
                borderRadius: '6px',
                transition: 'all 0.15s ease',
                opacity: draggedGuidelineIdx === idx ? '0.4' : '1',
                border: guidelineDragOverIdx === idx ? '2px dashed #6366f1' : '1px solid transparent',
                background: guidelineDragOverIdx === idx ? 'rgba(99, 102, 241, 0.08)' : 'transparent'
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
                class="custom-minutes-input"
                style="flex:1;"
                draggable="false"
                @dragstart.stop
              >
              <button
                type="button"
                class="search-clear-btn"
                style="position:static;display:block;"
                title="Delete rule"
                @click="removeGuideline(idx)"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Manage Coaches & Admins -->
          <div v-else-if="activeTab === 'coaches'" style="display:flex;flex-direction:column;gap:14px;">
            <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:10px;padding:14px;">
              <h4 style="margin:0 0 4px;font-size:14px;font-weight:700;color:var(--text-main);">Add Team Coach / Admin</h4>
              <p style="margin:0 0 10px;font-size:11.5px;color:var(--text-muted);line-height:1.4;">
                Grant team access to coaches. <strong>Coach:</strong> Signs in to claim ride leader/support slots on race sign-ups. <strong>Coach Admin:</strong> Full race editing and settings control.
              </p>
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                <input
                  v-model="newCoachEmail"
                  type="email"
                  placeholder="coach.email@gmail.com"
                  class="custom-minutes-input"
                  style="flex:2;min-width:180px;"
                >
                <input
                  v-model="newCoachName"
                  type="text"
                  placeholder="Coach Name (Optional)"
                  class="custom-minutes-input"
                  style="flex:1.5;min-width:130px;"
                >
                <select
                  v-model="newCoachRole"
                  class="custom-minutes-input"
                  style="min-width:125px;height:34px;font-size:12px;padding:2px 6px;"
                >
                  <option value="coach">🚵 Coach</option>
                  <option value="admin">🛡️ Coach Admin</option>
                </select>
                <button
                  type="button"
                  class="done-modal-btn admin-save-btn"
                  style="padding:8px 16px;white-space:nowrap;"
                  :disabled="isAddingCoach"
                  @click="handleAddCoach"
                >
                  <span>{{ isAddingCoach ? 'Adding...' : '+ Add Coach' }}</span>
                </button>
              </div>
            </div>

            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <label class="modal-label" style="margin:0;">Active Team Coaches & Admins ({{ adminsList.length }})</label>
                <button type="button" class="action-mini-btn" @click="fetchAdmins">🔄 Refresh</button>
              </div>

              <div v-if="adminsLoading" style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">
                Loading authorized coaches...
              </div>
              <div v-else style="display:flex;flex-direction:column;gap:6px;">
                <div
                  v-for="admin in adminsList"
                  :key="admin.email"
                  style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:8px;gap:8px;flex-wrap:wrap;"
                >
                  <div style="display:flex;align-items:center;gap:10px;min-width:200px;">
                    <span style="font-size:18px;">{{ admin.role === 'coach' ? '🚵' : '🛡️' }}</span>
                    <div>
                      <div style="font-weight:700;font-size:13px;color:var(--text-main);display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span>{{ admin.name || admin.email.split('@')[0] }}</span>
                        <span
                          class="category-badge"
                          :style="admin.role === 'coach' ? 'background:rgba(59,130,246,0.12);border-color:rgba(59,130,246,0.3);color:#60a5fa;' : 'background:rgba(220,38,38,0.12);border-color:rgba(220,38,38,0.3);color:var(--accent-red);'"
                        >
                          {{ admin.role === 'coach' ? 'Coach' : (admin.role === 'owner' ? 'Owner / Head Coach' : 'Admin') }}
                        </span>
                        <span
                          v-if="admin.email.toLowerCase() === user?.email?.toLowerCase()"
                          style="font-size:10px;color:#22c55e;background:rgba(34,197,94,0.15);padding:1px 5px;border-radius:4px;font-weight:600;"
                        >You</span>
                      </div>
                      <div style="font-size:11px;color:var(--text-muted);">{{ admin.email }}</div>
                    </div>
                  </div>

                  <div style="display:flex;align-items:center;gap:6px;margin-left:auto;">
                    <!-- Role selector (if not owner/self) -->
                    <select
                      v-if="admin.role !== 'owner' && admin.email.toLowerCase() !== user?.email?.toLowerCase()"
                      :value="admin.role === 'coach' ? 'coach' : 'admin'"
                      class="custom-minutes-input"
                      style="font-size:11px;height:28px;padding:2px 4px;width:115px;"
                      @change="handleUpdateRole(admin.email, ($event.target as HTMLSelectElement).value as 'admin' | 'coach')"
                    >
                      <option value="coach">🚵 Coach</option>
                      <option value="admin">🛡️ Admin</option>
                    </select>

                    <button
                      v-if="admin.role !== 'owner' && admin.email.toLowerCase() !== user?.email?.toLowerCase()"
                      type="button"
                      class="search-clear-btn"
                      style="position:static;display:inline-flex;color:#ef4444;font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.08);cursor:pointer;"
                      title="Remove coach access"
                      @click="handleRemoveCoach(admin.email)"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer: Lock Admin Mode + Save + Close -->
        <div class="modal-footer" style="display:flex;justify-content:space-between;align-items:center;padding:12px 18px;gap:10px;">
          <button
            type="button"
            class="admin-lock-btn"
            title="Lock editing and return to viewer mode (you stay signed in)"
            @click="handleLockAdmin"
          >
            <span>🔒</span> Lock Admin Mode
          </button>
          <div style="display:flex;gap:10px;align-items:center;">
            <button type="button" class="done-modal-btn" @click="emit('close')">Close</button>
            <button type="button" class="done-modal-btn admin-save-btn" @click="handleSave">
              <span>💾</span> Save Changes
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
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
</style>
