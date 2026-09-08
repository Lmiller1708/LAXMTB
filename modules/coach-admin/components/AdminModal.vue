<script setup lang="ts">
import type { Race } from '~/modules/races/types/race'

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
              <!-- Google G logo -->
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
            Access is restricted to authorized team coaches listed in the team's admin sheet.
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
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'waves' }" @click="activeTab = 'waves'">⏱️ Race Info</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'signups' }" @click="activeTab = 'signups'">🤝 Volunteers & Food</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'photos' }" @click="activeTab = 'photos'">📸 Photos Album</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'maps' }" @click="activeTab = 'maps'">🗺️ Course Maps</button>
          <button type="button" class="admin-tab-btn" :class="{ active: activeTab === 'announcements' }" @click="activeTab = 'announcements'">📢 Guidelines</button>
        </div>

        <!-- Tab Contents -->
        <div class="modal-body admin-modal-body" style="padding:16px;overflow-y:auto;flex:1;">

          <!-- Venue Info -->
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
            <div v-for="(g, idx) in form.guidelines" :key="idx" style="display:flex;gap:8px;align-items:center;">
              <input v-model="form.guidelines[idx]" type="text" class="custom-minutes-input" style="flex:1;">
              <button type="button" class="search-clear-btn" style="position:static;display:block;" @click="removeGuideline(idx)">✕</button>
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
