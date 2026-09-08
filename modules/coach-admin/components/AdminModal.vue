<script setup lang="ts">
import type { Race } from '~/modules/races/types/race'

const props = defineProps<{
  isOpen: boolean
  initialTab?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', race: Race): void
}>()

const { races, currentRaceIndex, selectRace, currentRace } = useCurrentRace()

const isAuthenticated = ref(true) // Coaches can manage or toggle
const activeTab = ref(props.initialTab || 'venue')

watch(() => props.initialTab, (newTab) => {
  if (newTab) activeTab.value = newTab
})

// Local editable copy of current race
const form = ref<Race>({ ...currentRace.value })

watch(currentRace, (newRace) => {
  form.value = JSON.parse(JSON.stringify(newRace))
}, { deep: true })

const handleSave = () => {
  emit('save', JSON.parse(JSON.stringify(form.value)))
  alert('💾 Changes saved successfully!')
  emit('close')
}

const addGuideline = () => {
  if (!form.value.guidelines) form.value.guidelines = []
  form.value.guidelines.push('')
}

const removeGuideline = (idx: number) => {
  form.value.guidelines.splice(idx, 1)
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay show" id="adminModalOverlay" @click.self="emit('close')">
    <div class="modal-card admin-modal-card" role="dialog" aria-modal="true" aria-labelledby="adminModalTitle">
      <!-- Authenticated Admin Dashboard Screen -->
      <div id="adminDashboardScreen" style="display:flex;flex-direction:column;height:100%;flex:1;overflow:hidden;">
        <div class="modal-header">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:20px;">⚙️</span>
            <div>
              <h3 style="margin:0;font-size:16px;font-weight:700;color:var(--text-main);">Coach Admin Portal</h3>
              <div style="display:flex;align-items:center;gap:6px;margin-top:2px;flex-wrap:wrap;">
                <span class="admin-status-pill">🟢 Local & Cloud Ready</span>
                <span style="font-size:10.5px;color:var(--accent-red);background:rgba(239,68,68,0.1);padding:1px 6px;border-radius:4px;font-weight:600;">Coach Mode</span>
              </div>
            </div>
          </div>
          <button type="button" class="modal-close-btn" aria-label="Close modal" @click="emit('close')">✕</button>
        </div>

        <!-- Top Toolbar: Race Selector -->
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

        <!-- Admin Navigation Tabs -->
        <div class="admin-tab-bar">
          <button
            type="button"
            class="admin-tab-btn"
            :class="{ active: activeTab === 'venue' }"
            @click="activeTab = 'venue'"
          >📍 Venue Info</button>
          <button
            type="button"
            class="admin-tab-btn"
            :class="{ active: activeTab === 'waves' }"
            @click="activeTab = 'waves'"
          >⏱️ Race Info</button>
          <button
            type="button"
            class="admin-tab-btn"
            :class="{ active: activeTab === 'signups' }"
            @click="activeTab = 'signups'"
          >🤝 Volunteers & Food</button>
          <button
            type="button"
            class="admin-tab-btn"
            :class="{ active: activeTab === 'photos' }"
            @click="activeTab = 'photos'"
          >📸 Photos Album</button>
          <button
            type="button"
            class="admin-tab-btn"
            :class="{ active: activeTab === 'maps' }"
            @click="activeTab = 'maps'"
          >🗺️ Course Maps</button>
          <button
            type="button"
            class="admin-tab-btn"
            :class="{ active: activeTab === 'announcements' }"
            @click="activeTab = 'announcements'"
          >📢 Guidelines</button>
        </div>

        <!-- Tab Contents -->
        <div class="modal-body admin-modal-body" style="padding:16px;overflow-y:auto;flex:1;">
          <!-- 1. Venue Info Tab -->
          <div v-if="activeTab === 'venue'" style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <label class="modal-label">Event Name</label>
              <input v-model="form.name" type="text" class="custom-minutes-input" style="width:100%;">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
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

          <!-- 2. Race Info / Waves Tab -->
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

          <!-- 3. Volunteers & Food Tab -->
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

          <!-- 4. Photos Album Tab -->
          <div v-else-if="activeTab === 'photos'" style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <label class="modal-label">Google Photos Shared Album URL</label>
              <input v-model="form.photosUrl" type="text" placeholder="https://photos.app.goo.gl/..." class="custom-minutes-input" style="width:100%;">
            </div>
          </div>

          <!-- 5. Course Maps Tab -->
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

          <!-- 6. Guidelines Tab -->
          <div v-else-if="activeTab === 'announcements'" style="display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <label class="modal-label" style="margin:0;">Venue Guidelines & Spectator Rules</label>
              <button type="button" class="action-mini-btn" @click="addGuideline">+ Add Item</button>
            </div>
            <div v-for="(g, idx) in form.guidelines" :key="idx" style="display:flex;gap:8px;align-items:center;">
              <input v-model="form.guidelines[idx]" type="text" class="custom-minutes-input" style="flex:1;">
              <button type="button" class="search-clear-btn" style="position:static;display:block;" @click="removeGuideline(idx)">✕</button>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="display:flex;justify-content:flex-end;align-items:center;padding:12px 18px;gap:10px;">
          <button type="button" class="done-modal-btn" @click="emit('close')">Close</button>
          <button type="button" class="done-modal-btn admin-save-btn" @click="handleSave">
            <span>💾</span> Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
