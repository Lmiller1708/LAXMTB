<script setup lang="ts">
import { ref, watch } from 'vue'
import type {
  WeeklyUpdate,
  PracticePlan,
  Announcement,
  CoachResource,
  QuickLink,
  HubConfig,
  EmergencyPlan,
  EventItem,
  TeamNote,
  Attachment,
  PlanSection,
  RideGroup
} from '../types/hub'

const props = defineProps<{
  isOpen: boolean
  initialTab?: 'weekly' | 'plan' | 'announcement' | 'links' | 'eap' | 'resource' | 'settings'
  editingUpdate?: WeeklyUpdate | null
  editingPlan?: PracticePlan | null
  editingAnnouncement?: Announcement | null
  editingResource?: CoachResource | null
  quickLinks: QuickLink[]
  emergencyPlans?: EmergencyPlan[]
  hubConfig: HubConfig
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saveUpdate', payload: { update: WeeklyUpdate; publishAndEmail: boolean }): void
  (e: 'savePlan', plan: PracticePlan): void
  (e: 'saveAnnouncement', payload: { announcement: Announcement; sendEmail: boolean }): void
  (e: 'saveResource', res: CoachResource): void
  (e: 'saveQuickLinks', links: QuickLink[]): void
  (e: 'saveEmergencyPlans', plans: EmergencyPlan[]): void
  (e: 'saveConfig', config: HubConfig): void
  (e: 'duplicateUpdate', sourceId?: string): void
  (e: 'duplicatePlan', sourceId?: string): void
  (e: 'toast', msg: string): void
}>()

const activeTab = ref<'weekly' | 'plan' | 'announcement' | 'links' | 'eap' | 'resource' | 'settings'>(
  props.initialTab || 'weekly'
)

watch(
  () => props.initialTab,
  (val) => {
    if (val) activeTab.value = val
  }
)

// --- Form States ---

// 1. Weekly Update Form
const updateForm = ref<WeeklyUpdate>({
  id: '',
  weekOf: new Date().toISOString().split('T')[0],
  title: '',
  greeting: '',
  practiceDays: 'Tues / Thurs',
  practiceTime: '4:30p - 6:30p',
  practiceLocation: 'Upper Hixon Trail Head',
  practiceStatus: 'scheduled',
  practiceNote: '',
  weather: "Upper 70's",
  upcomingEvents: [],
  teamNotes: [],
  closingMessage: 'Thanks,\nMatt\n--',
  attachments: [],
  status: 'draft'
})

// 2. Practice Plan Form
const planForm = ref<PracticePlan>({
  id: '',
  weekOf: new Date().toISOString().split('T')[0],
  date: '',
  title: '',
  location: 'Upper Hixon Forest',
  time: '4:30 PM - 6:30 PM',
  objectives: [''],
  materials: ['Radios', 'First Aid Kits'],
  coachActivities: [
    { time: '4:30 - 4:45 PM', activity: 'Check-In & ABC Quick Check', details: '' }
  ],
  rideGroups: [
    { name: 'Group A', coach: '', trail: '', focus: '' }
  ],
  coolDown: '',
  coachDebrief: '',
  attachments: [],
  status: 'published'
})

// 3. Announcement Form
const annForm = ref<Announcement>({
  id: '',
  title: '',
  message: '',
  type: 'general',
  priority: 'normal',
  pinned: false,
  active: true,
  sendEmail: false,
  attachments: []
})

// 4. Coach Resource Form
const resForm = ref<CoachResource>({
  id: '',
  title: '',
  category: 'skill-drill',
  description: '',
  url: '',
  fileType: 'doc',
  tags: []
})
const tagsInput = ref('')

// 5. Quick Links Form
const linksList = ref<QuickLink[]>([])

// 6. Emergency Action Plans Form
const eapList = ref<EmergencyPlan[]>([])

// 7. Hub Config Form
const configForm = ref<HubConfig>({
  googleGroupEmail: 'lax-mtb-team@googlegroups.com',
  webhookUrl: ''
})

// Sync props to form models when modal opens or editing items change
watch(
  () => props.isOpen,
  (open) => {
    if (!open) return

    if (props.editingUpdate) {
      updateForm.value = JSON.parse(JSON.stringify(props.editingUpdate))
    }

    if (props.editingPlan) {
      planForm.value = JSON.parse(JSON.stringify(props.editingPlan))
    }

    if (props.editingAnnouncement) {
      annForm.value = JSON.parse(JSON.stringify(props.editingAnnouncement))
    } else {
      annForm.value = {
        id: '',
        title: '',
        message: '',
        type: 'general',
        priority: 'normal',
        pinned: false,
        active: true,
        sendEmail: false,
        attachments: []
      }
    }

    if (props.editingResource) {
      resForm.value = JSON.parse(JSON.stringify(props.editingResource))
      tagsInput.value = resForm.value.tags ? resForm.value.tags.join(', ') : ''
    }

    linksList.value = JSON.parse(JSON.stringify(props.quickLinks || []))
    eapList.value = JSON.parse(JSON.stringify(props.emergencyPlans || []))
    configForm.value = JSON.parse(JSON.stringify(props.hubConfig || {}))
  },
  { immediate: true }
)

watch(
  () => props.emergencyPlans,
  (plans) => {
    if (plans) eapList.value = JSON.parse(JSON.stringify(plans))
  }
)

watch(
  () => props.editingUpdate,
  (u) => {
    if (u) updateForm.value = JSON.parse(JSON.stringify(u))
  }
)

watch(
  () => props.editingPlan,
  (p) => {
    if (p) planForm.value = JSON.parse(JSON.stringify(p))
  }
)

// --- Helper Append/Remove Handlers ---

// Events
const addEvent = () => {
  updateForm.value.upcomingEvents.push({ title: '', details: '', dueDate: '', link: '' })
}
const removeEvent = (index: number) => {
  updateForm.value.upcomingEvents.splice(index, 1)
}

// Team Notes
const addTeamNote = () => {
  updateForm.value.teamNotes.push({ title: '', body: '', link: '', linkLabel: '' })
}
const removeTeamNote = (index: number) => {
  updateForm.value.teamNotes.splice(index, 1)
}

// Attachments (Weekly Update)
const addUpdateAttachment = () => {
  if (!updateForm.value.attachments) updateForm.value.attachments = []
  updateForm.value.attachments.push({ label: '', url: '', type: 'drive' })
}
const removeUpdateAttachment = (index: number) => {
  updateForm.value.attachments?.splice(index, 1)
}

// Objectives (Plan)
const addObjective = () => {
  planForm.value.objectives.push('')
}
const removeObjective = (i: number) => {
  planForm.value.objectives.splice(i, 1)
}

// Materials (Plan)
const addMaterial = () => {
  planForm.value.materials.push('')
}
const removeMaterial = (i: number) => {
  planForm.value.materials.splice(i, 1)
}

// Plan Activities
const addActivity = () => {
  planForm.value.coachActivities.push({ time: '', activity: '', details: '' })
}
const removeActivity = (i: number) => {
  planForm.value.coachActivities.splice(i, 1)
}

// Ride Groups
const addRideGroup = () => {
  planForm.value.rideGroups.push({ name: '', coach: '', trail: '', focus: '' })
}
const removeRideGroup = (i: number) => {
  planForm.value.rideGroups.splice(i, 1)
}

// Quick Links
const addQuickLink = () => {
  linksList.value.push({
    id: `link-${Date.now()}`,
    label: '',
    url: '',
    icon: '🔗',
    enabled: true,
    order: linksList.value.length + 1
  })
}
const removeQuickLink = (i: number) => {
  linksList.value.splice(i, 1)
}

// Emergency Action Plans
const addEapLocation = () => {
  eapList.value.push({
    id: `eap-${Date.now()}`,
    location: '',
    badge: '',
    description: '',
    docUrl: '',
    order: eapList.value.length + 1
  })
}
const removeEapLocation = (i: number) => {
  eapList.value.splice(i, 1)
}

const isImageIcon = (icon?: string) => {
  if (!icon) return false
  return (
    icon.startsWith('/') ||
    icon.startsWith('http') ||
    icon.includes('.png') ||
    icon.includes('.svg') ||
    icon.includes('.jpg') ||
    icon.includes('.webp')
  )
}

// --- Submit Handlers ---

const handleSaveWeeklyDraft = () => {
  if (!updateForm.value.title) {
    emit('toast', 'Please enter a title for the update.')
    return
  }
  updateForm.value.status = 'draft'
  emit('saveUpdate', { update: updateForm.value, publishAndEmail: false })
  emit('close')
}

const handleSaveWeekly = () => {
  if (!updateForm.value.title) {
    emit('toast', 'Please enter a title for the update.')
    return
  }
  updateForm.value.status = 'published'
  emit('saveUpdate', { update: updateForm.value, publishAndEmail: false })
  emit('close')
}

const handlePublishWeeklyWithEmail = () => {
  if (!updateForm.value.title) {
    emit('toast', 'Please enter a title for the update.')
    return
  }
  updateForm.value.status = 'published'
  emit('saveUpdate', { update: updateForm.value, publishAndEmail: true })
  emit('close')
}

const handleSavePlan = () => {
  if (!planForm.value.title) {
    emit('toast', 'Please enter a practice plan title.')
    return
  }
  emit('savePlan', planForm.value)
  emit('close')
}

const handleSaveAnnouncement = () => {
  if (!annForm.value.title || !annForm.value.message) {
    emit('toast', 'Please provide a title and message.')
    return
  }
  emit('saveAnnouncement', {
    announcement: annForm.value,
    sendEmail: Boolean(annForm.value.sendEmail)
  })
  emit('close')
}

const handleSaveResource = () => {
  if (!resForm.value.title || !resForm.value.url) {
    emit('toast', 'Please provide a title and Google Drive URL.')
    return
  }
  resForm.value.tags = tagsInput.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  emit('saveResource', resForm.value)
  emit('close')
}

const handleSaveQuickLinks = () => {
  emit('saveQuickLinks', linksList.value)
  emit('close')
}

const handleSaveEmergencyPlans = () => {
  emit('saveEmergencyPlans', eapList.value)
  emit('close')
}

const handleSaveConfig = () => {
  emit('saveConfig', configForm.value)
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
    <div class="hub-modal-card">
      <!-- Modal Top Bar -->
      <div class="modal-header">
        <div class="header-titles">
          <span class="hub-kicker">TEAM HUB ADMIN EDITOR</span>
          <h2 class="modal-title">Manage Team Communications</h2>
        </div>
        <button type="button" class="close-btn" aria-label="Close" @click="emit('close')">✕</button>
      </div>

      <!-- Tab Switcher -->
      <div class="tabs-nav-bar">
        <button
          type="button"
          class="tab-nav-btn"
          :class="{ active: activeTab === 'weekly' }"
          @click="activeTab = 'weekly'"
        >
          📰 Weekly Update
        </button>
        <button
          type="button"
          class="tab-nav-btn"
          :class="{ active: activeTab === 'plan' }"
          @click="activeTab = 'plan'"
        >
          🚵 Practice Plan
        </button>
        <button
          type="button"
          class="tab-nav-btn"
          :class="{ active: activeTab === 'announcement' }"
          @click="activeTab = 'announcement'"
        >
          📢 Announcements
        </button>
        <button
          type="button"
          class="tab-nav-btn"
          :class="{ active: activeTab === 'links' }"
          @click="activeTab = 'links'"
        >
          🔗 Quick Links
        </button>
        <button
          type="button"
          class="tab-nav-btn"
          :class="{ active: activeTab === 'eap' }"
          @click="activeTab = 'eap'"
        >
          🚨 EAP Locations
        </button>
        <button
          type="button"
          class="tab-nav-btn"
          :class="{ active: activeTab === 'resource' }"
          @click="activeTab = 'resource'"
        >
          📚 Documents
        </button>
        <button
          type="button"
          class="tab-nav-btn"
          :class="{ active: activeTab === 'settings' }"
          @click="activeTab = 'settings'"
        >
          ⚙️ Settings
        </button>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div class="modal-body-scroll">
        <!-- ================= TAB 1: WEEKLY UPDATE ================= -->
        <div v-if="activeTab === 'weekly'" class="form-section">
          <div class="section-notice-bar">
            <span>💡 <strong>Quick Copy:</strong> Use the button to clone previous week content with dates auto-advanced.</span>
            <button
              type="button"
              class="hub-btn hub-btn-sm hub-btn-secondary"
              @click="emit('duplicateUpdate', updateForm.id)"
            >
              ＋ New from Last Week
            </button>
          </div>

          <div class="form-row">
            <div class="form-group flex-2">
              <label class="form-label">Update Title *</label>
              <input
                v-model="updateForm.title"
                type="text"
                class="form-input"
                placeholder="e.g. Week 4 Update — Sept 14–18"
              />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Week Starting (Monday)</label>
              <input v-model="updateForm.weekOf" type="date" class="form-input" />
            </div>
          </div>

          <!-- Practice Details Spotlight Fields -->
          <div class="sub-form-card">
            <h4 class="sub-card-title">Practice Spotlight Block</h4>
            <div class="form-grid-3">
              <div class="form-group">
                <label class="form-label">Practice Status</label>
                <select v-model="updateForm.practiceStatus" class="form-select">
                  <option value="scheduled">✅ Scheduled (Normal)</option>
                  <option value="moved">📍 Moved Location</option>
                  <option value="canceled">🚨 Canceled</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Practice Days</label>
                <input
                  v-model="updateForm.practiceDays"
                  type="text"
                  class="form-input"
                  placeholder="Tues / Thurs"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Practice Time</label>
                <input
                  v-model="updateForm.practiceTime"
                  type="text"
                  class="form-input"
                  placeholder="4:30p - 6:30p"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-2">
                <label class="form-label">Practice Location</label>
                <input
                  v-model="updateForm.practiceLocation"
                  type="text"
                  class="form-input"
                  placeholder="Upper Hixon Trail Head"
                />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Forecast / Weather</label>
                <input
                  v-model="updateForm.weather"
                  type="text"
                  class="form-input"
                  placeholder="Upper 70's, dry"
                />
              </div>
            </div>

            <div v-if="updateForm.practiceStatus !== 'scheduled'" class="form-group">
              <label class="form-label text-amber">Special Note / Reason for Move or Cancel</label>
              <input
                v-model="updateForm.practiceNote"
                type="text"
                class="form-input border-amber"
                placeholder="e.g. Moved to Lower Hixon due to wet trail conditions at upper forest."
              />
            </div>
          </div>

          <!-- Greeting Body -->
          <div class="form-group">
            <label class="form-label">Greeting / Introduction Message</label>
            <textarea
              v-model="updateForm.greeting"
              class="form-textarea"
              rows="5"
              placeholder="Good evening LaX MTB Team! Hope everyone had a great weekend..."
            />
          </div>

          <!-- Upcoming Events Builder -->
          <div class="sub-form-card">
            <div class="sub-card-header">
              <h4 class="sub-card-title">Upcoming Events & Deadlines</h4>
              <button type="button" class="hub-btn hub-btn-sm hub-btn-secondary" @click="addEvent">
                ＋ Add Event
              </button>
            </div>

            <div v-for="(ev, idx) in updateForm.upcomingEvents" :key="idx" class="repeater-row">
              <div class="form-grid-3">
                <input
                  v-model="ev.title"
                  type="text"
                  class="form-input"
                  placeholder="Event Title (e.g. Trailwork Monday's)"
                />
                <input
                  v-model="ev.details"
                  type="text"
                  class="form-input"
                  placeholder="Date / Location / Details"
                />
                <div class="flex-row-action">
                  <input
                    v-model="ev.dueDate"
                    type="text"
                    class="form-input"
                    placeholder="Due Date / Deadline (optional)"
                  />
                  <button
                    type="button"
                    class="remove-row-btn"
                    title="Remove"
                    @click="removeEvent(idx)"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Team Notes Builder (Store, Raffle, etc.) -->
          <div class="sub-form-card">
            <div class="sub-card-header">
              <h4 class="sub-card-title">Team Notes (Store, Raffles, Fundraisers)</h4>
              <button type="button" class="hub-btn hub-btn-sm hub-btn-secondary" @click="addTeamNote">
                ＋ Add Note
              </button>
            </div>

            <div v-for="(note, idx) in updateForm.teamNotes" :key="idx" class="repeater-card">
              <div class="form-row">
                <input
                  v-model="note.title"
                  type="text"
                  class="form-input flex-2"
                  placeholder="Note Title (e.g. Jakroo Store, Raffle Tickets)"
                />
                <button
                  type="button"
                  class="remove-row-btn"
                  title="Remove"
                  @click="removeTeamNote(idx)"
                >
                  ✕
                </button>
              </div>
              <textarea
                v-model="note.body"
                class="form-textarea"
                rows="3"
                placeholder="Note body text..."
              />
              <div class="form-row">
                <input
                  v-model="note.link"
                  type="text"
                  class="form-input flex-2"
                  placeholder="Link URL (e.g. https://jakroo.com/...)"
                />
                <input
                  v-model="note.linkLabel"
                  type="text"
                  class="form-input flex-1"
                  placeholder="Button Label (e.g. Shop Store)"
                />
              </div>
            </div>
          </div>

          <!-- Attachments (Google Drive Links) -->
          <div class="sub-form-card">
            <div class="sub-card-header">
              <h4 class="sub-card-title">Google Drive Links & Attachments</h4>
              <button
                type="button"
                class="hub-btn hub-btn-sm hub-btn-secondary"
                @click="addUpdateAttachment"
              >
                ＋ Add Link
              </button>
            </div>

            <div
              v-for="(att, idx) in updateForm.attachments"
              :key="idx"
              class="repeater-row flex-row-action"
            >
              <input
                v-model="att.label"
                type="text"
                class="form-input flex-1"
                placeholder="Label (e.g. Camping Map PDF)"
              />
              <input
                v-model="att.url"
                type="text"
                class="form-input flex-2"
                placeholder="Google Drive share URL"
              />
              <button
                type="button"
                class="remove-row-btn"
                title="Remove"
                @click="removeUpdateAttachment(idx)"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Closing Signature -->
          <div class="form-group">
            <label class="form-label">Closing Signature</label>
            <input v-model="updateForm.closingMessage" type="text" class="form-input" />
          </div>

          <!-- Action Buttons -->
          <div class="form-actions-bar">
            <button
              type="button"
              class="hub-btn hub-btn-secondary"
              title="Save as an unlisted draft"
              @click="handleSaveWeeklyDraft"
            >
              💾 Save as Draft
            </button>
            <button
              type="button"
              class="hub-btn hub-btn-save"
              title="Save changes and make live on Team Hub without sending an email"
              @click="handleSaveWeekly"
            >
              💾 Save
            </button>
            <button
              type="button"
              class="hub-btn hub-btn-primary"
              title="Publish update and send email to team Google Group"
              @click="handlePublishWeeklyWithEmail"
            >
              🚀 Publish & Email Team Group
            </button>
          </div>
        </div>

        <!-- ================= TAB 2: PRACTICE PLAN ================= -->
        <div v-if="activeTab === 'plan'" class="form-section">
          <div class="section-notice-bar">
            <span>💡 <strong>Practice Plan:</strong> Enter weekly objectives, drills, and group assignments for coaches.</span>
            <button
              type="button"
              class="hub-btn hub-btn-sm hub-btn-secondary"
              @click="emit('duplicatePlan', planForm.id)"
            >
              ＋ New from Last Week
            </button>
          </div>

          <div class="form-row">
            <div class="form-group flex-2">
              <label class="form-label">Plan Title *</label>
              <input
                v-model="planForm.title"
                type="text"
                class="form-input"
                placeholder="e.g. 9/17 Practice — Bike Control & Breathing"
              />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Date String</label>
              <input
                v-model="planForm.date"
                type="text"
                class="form-input"
                placeholder="Thursday 9/17/26"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-2">
              <label class="form-label">Location</label>
              <input
                v-model="planForm.location"
                type="text"
                class="form-input"
                placeholder="Upper Hixon Forest"
              />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Time</label>
              <input
                v-model="planForm.time"
                type="text"
                class="form-input"
                placeholder="4:30 PM - 6:30 PM"
              />
            </div>
          </div>

          <!-- Objectives -->
          <div class="sub-form-card">
            <div class="sub-card-header">
              <h4 class="sub-card-title">Session Objectives</h4>
              <button type="button" class="hub-btn hub-btn-sm hub-btn-secondary" @click="addObjective">
                ＋ Add Objective
              </button>
            </div>
            <div v-for="(obj, i) in planForm.objectives" :key="i" class="repeater-row flex-row-action">
              <input
                v-model="planForm.objectives[i]"
                type="text"
                class="form-input flex-1"
                placeholder="e.g. Athletes will focus on bike control"
              />
              <button type="button" class="remove-row-btn" @click="removeObjective(i)">✕</button>
            </div>
          </div>

          <!-- Materials -->
          <div class="sub-form-card">
            <div class="sub-card-header">
              <h4 class="sub-card-title">Materials & Gear</h4>
              <button type="button" class="hub-btn hub-btn-sm hub-btn-secondary" @click="addMaterial">
                ＋ Add Item
              </button>
            </div>
            <div v-for="(mat, i) in planForm.materials" :key="i" class="repeater-row flex-row-action">
              <input
                v-model="planForm.materials[i]"
                type="text"
                class="form-input flex-1"
                placeholder="e.g. Radios (Ch. 3), Cones"
              />
              <button type="button" class="remove-row-btn" @click="removeMaterial(i)">✕</button>
            </div>
          </div>

          <!-- Timeline Activities -->
          <div class="sub-form-card">
            <div class="sub-card-header">
              <h4 class="sub-card-title">Session Activities Timeline</h4>
              <button type="button" class="hub-btn hub-btn-sm hub-btn-secondary" @click="addActivity">
                ＋ Add Block
              </button>
            </div>
            <div
              v-for="(act, idx) in planForm.coachActivities"
              :key="idx"
              class="repeater-card"
            >
              <div class="form-row">
                <input
                  v-model="act.time"
                  type="text"
                  class="form-input flex-1"
                  placeholder="Time (e.g. 4:30 - 4:45)"
                />
                <input
                  v-model="act.activity"
                  type="text"
                  class="form-input flex-2"
                  placeholder="Activity Name"
                />
                <button type="button" class="remove-row-btn" @click="removeActivity(idx)">✕</button>
              </div>
              <input
                v-model="act.details"
                type="text"
                class="form-input"
                placeholder="Coaching instructions / details..."
              />
            </div>
          </div>

          <!-- Ride Groups -->
          <div class="sub-form-card">
            <div class="sub-card-header">
              <h4 class="sub-card-title">Trail Group Assignments</h4>
              <button type="button" class="hub-btn hub-btn-sm hub-btn-secondary" @click="addRideGroup">
                ＋ Add Group
              </button>
            </div>
            <div
              v-for="(rg, idx) in planForm.rideGroups"
              :key="idx"
              class="repeater-card"
            >
              <div class="form-row">
                <input
                  v-model="rg.name"
                  type="text"
                  class="form-input flex-1"
                  placeholder="Group Name (e.g. Advanced Group)"
                />
                <input
                  v-model="rg.coach"
                  type="text"
                  class="form-input flex-2"
                  placeholder="Assigned Coaches"
                />
                <button type="button" class="remove-row-btn" @click="removeRideGroup(idx)">✕</button>
              </div>
              <div class="form-row">
                <input
                  v-model="rg.trail"
                  type="text"
                  class="form-input flex-1"
                  placeholder="Trails to ride"
                />
                <input
                  v-model="rg.focus"
                  type="text"
                  class="form-input flex-1"
                  placeholder="Specific focus / skill"
                />
              </div>
            </div>
          </div>

          <!-- Cool-Down & Coach Wrap-Up -->
          <div class="form-group">
            <label class="form-label">Cool-Down & Coach Wrap-Up</label>
            <div style="margin-bottom: 10px;">
              <span style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px; font-weight: 700;">Rider Cool-Down & Wrap-Up Notes</span>
              <input
                v-model="planForm.coolDown"
                type="text"
                class="form-input"
                placeholder="High fives, hydration check, and remind riders about Monday trailwork!"
              />
            </div>

            <!-- Coach Debrief & Radio Return -->
            <div class="coach-debrief-editor-box">
              <div class="debrief-box-header">
                <span style="font-size: 15px;">📻</span>
                <span class="debrief-box-title">Coach Debrief & Radio Return</span>
              </div>
              <div class="debrief-questions-box">
                <div class="debrief-q"><span class="q-num">1.</span> Anything to report?</div>
                <div class="debrief-q"><span class="q-num">2.</span> What went well, do again?</div>
                <div class="debrief-q"><span class="q-num">3.</span> What could be better?</div>
              </div>
              <textarea
                v-model="planForm.coachDebrief"
                rows="2"
                class="form-textarea"
                placeholder="Additional coach debrief notes, radio return drop-off instructions, or debrief takeaways..."
                style="margin-top: 8px;"
              />
            </div>
          </div>

          <!-- Save Button -->
          <div class="form-actions-bar">
            <button type="button" class="hub-btn hub-btn-primary" @click="handleSavePlan">
              💾 Save Practice Plan
            </button>
          </div>
        </div>

        <!-- ================= TAB 3: ANNOUNCEMENTS ================= -->
        <div v-if="activeTab === 'announcement'" class="form-section">
          <div class="form-group">
            <label class="form-label">Announcement Title *</label>
            <input
              v-model="annForm.title"
              type="text"
              class="form-input"
              placeholder="e.g. Practice Moved to Forest Hills"
            />
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Announcement Type</label>
              <select v-model="annForm.type" class="form-select">
                <option value="general">ℹ️ General Information</option>
                <option value="practice-update">🚴 Practice Update (Shows in Coaches Corner too)</option>
                <option value="schedule-change">🗓️ Schedule Change</option>
                <option value="team-store">🛒 Team Store / Merch</option>
                <option value="safety">⚠️ Safety Advisory</option>
              </select>
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Priority Level</label>
              <select v-model="annForm.priority" class="form-select">
                <option value="normal">Normal</option>
                <option value="important">Important (Highlighted)</option>
                <option value="urgent">Urgent (Red Alert)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Message Content *</label>
            <textarea
              v-model="annForm.message"
              class="form-textarea"
              rows="5"
              placeholder="Enter bulletin details..."
            />
          </div>

          <div class="checkbox-row">
            <label class="checkbox-label">
              <input v-model="annForm.pinned" type="checkbox" />
              <span>📌 Pin to top of announcements</span>
            </label>
            <label class="checkbox-label">
              <input v-model="annForm.sendEmail" type="checkbox" />
              <span>✉️ Also dispatch email to Google Group</span>
            </label>
          </div>

          <div class="form-actions-bar">
            <button type="button" class="hub-btn hub-btn-primary" @click="handleSaveAnnouncement">
              📢 Post Announcement
            </button>
          </div>
        </div>

        <!-- ================= TAB 4: QUICK LINKS ================= -->
        <div v-if="activeTab === 'links'" class="form-section">
          <div class="section-notice-bar">
            <span>Manage tiles shown on the Hub page (Team Store, League links, etc.).</span>
            <button type="button" class="hub-btn hub-btn-sm hub-btn-secondary" @click="addQuickLink">
              ＋ Add Tile
            </button>
          </div>

          <div class="links-edit-list">
            <div
              v-for="(link, idx) in linksList"
              :key="idx"
              class="repeater-card"
            >
              <div class="form-row">
                <img
                  v-if="isImageIcon(link.icon)"
                  :src="link.icon"
                  alt="icon"
                  style="width: 28px; height: 28px; object-fit: contain; border-radius: 4px; flex-shrink: 0; background: #222;"
                />
                <input
                  v-model="link.icon"
                  type="text"
                  class="form-input icon-input"
                  placeholder="🛒 or /logos/nica-logo.png"
                  title="Emoji or image path (e.g. /logos/nica-logo.png)"
                />
                <input
                  v-model="link.label"
                  type="text"
                  class="form-input flex-2"
                  placeholder="Link Title (e.g. Team Store)"
                />
                <label class="checkbox-label flex-shrink-0">
                  <input v-model="link.enabled" type="checkbox" />
                  <span>Visible</span>
                </label>
                <button type="button" class="remove-row-btn" @click="removeQuickLink(idx)">✕</button>
              </div>
              <input
                v-model="link.url"
                type="text"
                class="form-input"
                placeholder="Destination URL (e.g. https://jakroo.com/...)"
              />
            </div>
          </div>

          <div class="form-actions-bar">
            <button type="button" class="hub-btn hub-btn-primary" @click="handleSaveQuickLinks">
              💾 Save Quick Links
            </button>
          </div>
        </div>

        <!-- ================= TAB: EMERGENCY ACTION PLANS (EAP) ================= -->
        <div v-if="activeTab === 'eap'" class="form-section">
          <div class="section-notice-bar">
            <span>🚨 <strong>Emergency Action Plans (EAP):</strong> Manage location-specific emergency coordinates, 911 dispatch ingress, and trailhead evacuation documents.</span>
            <button
              type="button"
              class="hub-btn hub-btn-sm hub-btn-secondary"
              @click="addEapLocation"
            >
              ＋ Add Location
            </button>
          </div>

          <div class="repeater-list">
            <div
              v-for="(eap, idx) in eapList"
              :key="eap.id || idx"
              class="repeater-card"
            >
              <div class="form-row">
                <div class="form-group flex-2">
                  <label class="form-label">Location / Trailhead Name *</label>
                  <input
                    v-model="eap.location"
                    type="text"
                    class="form-input"
                    placeholder="e.g. Upper Hixon Forest"
                  />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">Badge / Sub-Location</label>
                  <input
                    v-model="eap.badge"
                    type="text"
                    class="form-input"
                    placeholder="e.g. Rotary Reserve"
                  />
                </div>
                <button
                  type="button"
                  class="remove-row-btn"
                  title="Remove Location"
                  @click="removeEapLocation(idx)"
                >
                  ✕
                </button>
              </div>

              <div class="form-group">
                <label class="form-label">Address &amp; Emergency Access Notes</label>
                <input
                  v-model="eap.description"
                  type="text"
                  class="form-input"
                  placeholder="e.g. 2500 Coulee Dr • Primary Blufftop access & emergency ambulance pad."
                />
              </div>

              <div class="form-group">
                <label class="form-label">Emergency Action Plan (EAP) Document URL</label>
                <input
                  v-model="eap.docUrl"
                  type="text"
                  class="form-input"
                  placeholder="https://docs.google.com/... or https://drive.google.com/..."
                />
              </div>
            </div>
          </div>

          <div v-if="!eapList.length" class="empty-state-notice">
            <p style="color: var(--text-muted); font-size: 14px; text-align: center; padding: 20px;">
              No emergency action plans configured. Click "＋ Add Location" above to add one.
            </p>
          </div>

          <div class="form-actions-bar">
            <button type="button" class="hub-btn hub-btn-primary" @click="handleSaveEmergencyPlans">
              💾 Save EAP Locations
            </button>
          </div>
        </div>

        <!-- ================= TAB 5: COACH RESOURCES ================= -->
        <div v-if="activeTab === 'resource'" class="form-section">
          <div class="form-group">
            <label class="form-label">Document Title *</label>
            <input
              v-model="resForm.title"
              type="text"
              class="form-input"
              placeholder="e.g. Upper Hixon Emergency Action Plan (EAP)"
            />
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Category</label>
              <select v-model="resForm.category" class="form-select">
                <option value="eap">🚨 EAP (Emergency Action Plan)</option>
                <option value="skill-drill">🚵 Skill Drill / Clinic Guide</option>
                <option value="safety">⚠️ Safety / First Aid Protocol</option>
                <option value="reference">📄 Team Reference Document</option>
              </select>
            </div>
            <div class="form-group flex-2">
              <label class="form-label">Google Drive Share URL *</label>
              <input
                v-model="resForm.url"
                type="text"
                class="form-input"
                placeholder="https://drive.google.com/..."
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Short Description</label>
            <textarea
              v-model="resForm.description"
              class="form-textarea"
              rows="3"
              placeholder="What coaches should know about this document..."
            />
          </div>

          <div class="form-group">
            <label class="form-label">Tags (comma-separated)</label>
            <input
              v-model="tagsInput"
              type="text"
              class="form-input"
              placeholder="Upper Hixon, Emergency, Clinic"
            />
          </div>

          <div class="form-actions-bar">
            <button type="button" class="hub-btn hub-btn-primary" @click="handleSaveResource">
              💾 Save Document
            </button>
          </div>
        </div>

        <!-- ================= TAB 6: SETTINGS ================= -->
        <div v-if="activeTab === 'settings'" class="form-section">
          <div class="sub-form-card">
            <h4 class="sub-card-title">Google Group Email Dispatch</h4>
            <p class="sub-card-subtext">
              Configure your Google Apps Script webhook to relay published updates and alerts directly to your team's Google Group email.
            </p>

            <div class="form-group">
              <label class="form-label">Google Group Email Address</label>
              <input
                v-model="configForm.googleGroupEmail"
                type="email"
                class="form-input"
                placeholder="lax-mtb-team@googlegroups.com"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Google Apps Script Webhook URL</label>
              <input
                v-model="configForm.webhookUrl"
                type="url"
                class="form-input"
                placeholder="https://script.google.com/macros/s/..."
              />
              <span class="field-hint">Deploy a simple Apps Script web app that receives JSON and calls <code>GmailApp.sendEmail()</code>.</span>
            </div>
          </div>

          <div class="form-actions-bar">
            <button type="button" class="hub-btn hub-btn-primary" @click="handleSaveConfig">
              💾 Save Hub Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overscroll-behavior: none !important;
  touch-action: none;
}

.hub-modal-card {
  background: var(--bg-card, #171717);
  border: 1px solid var(--border-strong, #3f3f3f);
  border-radius: 14px;
  width: 100%;
  max-width: 860px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  overscroll-behavior: contain !important;
  touch-action: pan-y;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 22px;
  border-bottom: 1px solid var(--border, #262626);
  background: var(--bg-header, #141414);
  flex-shrink: 0;
}

.hub-kicker {
  font-family: 'Teko', sans-serif;
  font-size: 13px;
  letter-spacing: 1px;
  color: #dc2626;
  font-weight: 700;
  text-transform: uppercase;
  line-height: 1;
  display: block;
}

.modal-title {
  margin: 3px 0 0 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
  line-height: 1.2;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 18px;
  color: var(--text-muted, #9ca3af);
  cursor: pointer;
  padding: 4px;
  transition: color 0.15s;
}

.close-btn:hover {
  color: #ffffff;
}

/* Tabs Nav Bar */
.tabs-nav-bar {
  display: flex;
  align-items: center;
  background: var(--bg-subtle, #202020);
  border-bottom: 1px solid var(--border, #262626);
  padding: 6px 14px;
  gap: 6px;
  overflow-x: auto;
  flex-shrink: 0;
  min-height: 48px;
  box-sizing: border-box;
  scrollbar-width: thin;
}

.tab-nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted, #9ca3af);
  padding: 7px 13px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  box-sizing: border-box;
  transition: all 0.15s;
}

.tab-nav-btn:hover {
  color: var(--text-main, #f3f4f6);
}

.tab-nav-btn:focus {
  outline: none;
}

.tab-nav-btn:focus-visible {
  outline: 2px solid #dc2626;
  outline-offset: 1px;
}

.tab-nav-btn.active {
  background: var(--bg-card, #171717);
  color: #dc2626;
  border-color: var(--border, #262626);
}

/* Modal Body */
.modal-body-scroll {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  overscroll-behavior: contain !important;
  overscroll-behavior-y: contain !important;
  -webkit-overflow-scrolling: touch;
}

/* Coach Debrief & Radio Return Box */
.coach-debrief-editor-box {
  margin-top: 8px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.28);
  border-radius: 8px;
  padding: 12px 14px;
}

.debrief-box-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.debrief-box-title {
  font-size: 12px;
  font-weight: 800;
  color: #93c5fd;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.debrief-questions-box {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12.5px;
  color: var(--text-main, #f3f4f6);
  padding-left: 2px;
  line-height: 1.4;
}

.debrief-q {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.q-num {
  font-weight: 800;
  color: #60a5fa;
  font-size: 13px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.section-notice-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #93c5fd;
  flex-wrap: wrap;
  gap: 10px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row {
  display: flex;
  gap: 14px;
}

.flex-1 {
  flex: 1;
}

.flex-2 {
  flex: 2;
}

.form-grid-3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.form-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.form-input,
.form-select,
.form-textarea {
  background: var(--bg-subtle, #202020);
  border: 1px solid var(--border, #2c2c2c);
  border-radius: 6px;
  padding: 8px 12px;
  color: var(--text-main, #f3f4f6);
  font-size: 14px;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #dc2626;
}

.sub-form-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border, #2c2c2c);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sub-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sub-card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.sub-card-subtext {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted, #9ca3af);
  line-height: 1.4;
}

.repeater-row {
  margin-bottom: 8px;
}

.repeater-card {
  background: var(--bg-card, #171717);
  border: 1px solid var(--border, #262626);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.flex-row-action {
  display: flex;
  align-items: center;
  gap: 8px;
}

.remove-row-btn {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  font-weight: 800;
  font-size: 12px;
}

.remove-row-btn:hover {
  background: rgba(239, 68, 68, 0.25);
}

.icon-input {
  width: 48px;
  text-align: center;
  flex-shrink: 0;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: var(--text-main, #f3f4f6);
  cursor: pointer;
}

.field-hint {
  font-size: 11.5px;
  color: var(--text-dim, #707070);
  margin-top: 3px;
}

.form-actions-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border, #262626);
}

/* Buttons */
.hub-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
}

.hub-btn-sm {
  padding: 5px 10px;
  font-size: 12px;
}

.hub-btn-primary {
  background: #dc2626;
  color: #ffffff;
}

.hub-btn-primary:hover {
  background: #b91c1c;
}

.hub-btn-save {
  background: #2563eb;
  color: #ffffff;
}

.hub-btn-save:hover {
  background: #1d4ed8;
}

.hub-btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main, #f3f4f6);
  border-color: var(--border, #2c2c2c);
}

.hub-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.14);
}
</style>
