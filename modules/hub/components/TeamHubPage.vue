<script setup lang="ts">
import { ref } from 'vue'
import { useCoachAuth } from '~/modules/coach-admin/composables/useCoachAuth'
import { useHubData } from '../composables/useHubData'
import type {
  WeeklyUpdate,
  PracticePlan,
  Announcement,
  CoachResource,
  QuickLink,
  HubConfig,
  EmergencyPlan
} from '../types/hub'
import WeeklyUpdateCard from './WeeklyUpdateCard.vue'
import PracticePlanCard from './PracticePlanCard.vue'
import HubEditorModal from './HubEditorModal.vue'

const emit = defineEmits<{
  (e: 'openAuth', mode?: 'login' | 'signup'): void
  (e: 'toast', msg: string): void
  (e: 'navigate', route: string): void
}>()

const { isGuardianOrAbove, isAuthorizedCoach, isAdminCoach } = useCoachAuth()

const {
  weeklyUpdates,
  currentWeekUpdate,
  pastUpdates,
  practicePlans,
  currentPracticePlan,
  pastPracticePlans,
  announcements,
  activeAnnouncements,
  practiceUpdateAnnouncements,
  coachResources,
  emergencyPlans,
  quickLinks,
  activeQuickLinks,
  hubConfig,
  duplicateWeeklyUpdate,
  duplicatePracticePlan,
  saveWeeklyUpdate,
  savePracticePlan,
  saveAnnouncement,
  saveCoachResource,
  saveEmergencyPlans,
  saveQuickLinks,
  saveHubConfig,
  deleteHubItem
} = useHubData()

// Past updates accordion toggle
const isPastUpdatesOpen = ref(false)

// Editor Modal state
const isEditorOpen = ref(false)
const editorInitialTab = ref<'weekly' | 'plan' | 'announcement' | 'links' | 'eap' | 'resource' | 'settings'>('weekly')
const editingUpdateItem = ref<WeeklyUpdate | null>(null)
const editingPlanItem = ref<PracticePlan | null>(null)
const editingAnnouncementItem = ref<Announcement | null>(null)
const editingResourceItem = ref<CoachResource | null>(null)

// --- Open Editor Handlers ---

const openNewUpdate = () => {
  editingUpdateItem.value = null
  editorInitialTab.value = 'weekly'
  isEditorOpen.value = true
}

const openEditUpdate = (u: WeeklyUpdate) => {
  editingUpdateItem.value = u
  editorInitialTab.value = 'weekly'
  isEditorOpen.value = true
}

const handleDuplicateUpdate = (sourceId?: string) => {
  const cloned = duplicateWeeklyUpdate(sourceId)
  editingUpdateItem.value = cloned
  editorInitialTab.value = 'weekly'
  isEditorOpen.value = true
  emit('toast', '📋 Cloned update from previous week as new draft!')
}

const openNewPlan = () => {
  editingPlanItem.value = null
  editorInitialTab.value = 'plan'
  isEditorOpen.value = true
}

const openEditPlan = (p: PracticePlan) => {
  editingPlanItem.value = p
  editorInitialTab.value = 'plan'
  isEditorOpen.value = true
}

const handleDuplicatePlan = (sourceId?: string) => {
  const cloned = duplicatePracticePlan(sourceId)
  editingPlanItem.value = cloned
  editorInitialTab.value = 'plan'
  isEditorOpen.value = true
  emit('toast', '📋 Cloned practice plan from previous week as new draft!')
}

const openNewAnnouncement = () => {
  editingAnnouncementItem.value = null
  editorInitialTab.value = 'announcement'
  isEditorOpen.value = true
}

const openEditAnnouncement = (a: Announcement) => {
  editingAnnouncementItem.value = a
  editorInitialTab.value = 'announcement'
  isEditorOpen.value = true
}

const openNewResource = () => {
  editingResourceItem.value = null
  editorInitialTab.value = 'resource'
  isEditorOpen.value = true
}

const openEditResource = (r: CoachResource) => {
  editingResourceItem.value = r
  editorInitialTab.value = 'resource'
  isEditorOpen.value = true
}

const openQuickLinksEditor = () => {
  editorInitialTab.value = 'links'
  isEditorOpen.value = true
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

const openHubSettings = () => {
  editorInitialTab.value = 'settings'
  isEditorOpen.value = true
}

// --- Save Handlers from Modal ---

const handleSaveUpdate = async (payload: { update: WeeklyUpdate; publishAndEmail: boolean }) => {
  const res = await saveWeeklyUpdate(payload.update, payload.publishAndEmail)
  if (res.success) {
    if (res.emailSent) {
      emit('toast', '🚀 Weekly update published and emailed to Google Group!')
    } else if (payload.update.status === 'published' || payload.publishAndEmail) {
      emit('toast', '✅ Weekly update saved & live on Hub!')
    } else {
      emit('toast', '💾 Draft update saved.')
    }
  } else {
    emit('toast', `❌ Error saving update: ${res.error}`)
  }
}

const handleSavePlan = async (plan: PracticePlan) => {
  const res = await savePracticePlan(plan)
  if (res.success) {
    emit('toast', '✅ Practice plan saved!')
  } else {
    emit('toast', `❌ Error: ${res.error}`)
  }
}

const handleSaveAnnouncement = async (payload: { announcement: Announcement; sendEmail: boolean }) => {
  const res = await saveAnnouncement(payload.announcement, payload.sendEmail)
  if (res.success) {
    if (res.emailSent) {
      emit('toast', '📢 Announcement posted and dispatched to Google Group!')
    } else {
      emit('toast', '📢 Announcement posted!')
    }
  } else {
    emit('toast', `❌ Error: ${res.error}`)
  }
}

const handleDeleteAnnouncement = async (id: string) => {
  const res = await deleteHubItem('announcements', id)
  if (res.success) {
    emit('toast', '🗑️ Announcement deleted.')
  }
}

const handleSaveResource = async (resItem: CoachResource) => {
  const res = await saveCoachResource(resItem)
  if (res.success) {
    emit('toast', '✅ Document saved to library!')
  } else {
    emit('toast', `❌ Error: ${res.error}`)
  }
}

const handleDeleteResource = async (id: string) => {
  const res = await deleteHubItem('coachResources', id)
  if (res.success) {
    emit('toast', '🗑️ Document removed.')
  }
}

const handleSaveQuickLinks = async (links: QuickLink[]) => {
  const res = await saveQuickLinks(links)
  if (res.success) {
    emit('toast', '✅ Quick links saved!')
  } else {
    emit('toast', `❌ Error: ${res.error}`)
  }
}

const handleSaveEmergencyPlans = async (plans: EmergencyPlan[]) => {
  const res = await saveEmergencyPlans(plans)
  if (res.success) {
    emit('toast', '✅ Emergency Action Plans saved!')
  } else {
    emit('toast', `❌ Error: ${res.error}`)
  }
}

const handleSaveConfig = async (cfg: HubConfig) => {
  const res = await saveHubConfig(cfg)
  if (res.success) {
    emit('toast', '✅ Hub settings updated!')
  } else {
    emit('toast', `❌ Error: ${res.error}`)
  }
}
</script>

<template>
  <main class="hub-main-container">
    <!-- 1. GATED ACCESS CHECK: Must be admin -->
    <div v-if="!isAdminCoach" class="gated-access-card">
      <div class="gated-lock-icon">🔒</div>
      <span class="gated-kicker">ADMINISTRATOR PREVIEW</span>
      <h2 class="gated-title">LAX MTB Team Hub</h2>
      <p class="gated-desc">
        The Team Hub contains private weekly updates, team store discounts, practice locations, and coach resources. Access is currently reserved for team administrators.
      </p>

      <div class="gated-actions">
        <button
          type="button"
          class="hub-btn hub-btn-primary hub-btn-lg"
          @click="emit('openAuth', 'login')"
        >
          🔑 Sign In to Your Team Account
        </button>
        <button
          type="button"
          class="hub-btn hub-btn-secondary"
          @click="emit('openAuth', 'signup')"
        >
          Have a Team Invite Code? Register
        </button>
      </div>
    </div>

    <!-- 2. AUTHENTICATED TEAM HUB CONTENT -->
    <div v-else class="hub-content-root">
      <!-- TEAM HUB CONTENT -->
      <div class="team-zone-view">
        <!-- Announcements Feed -->
        <AnnouncementsFeed
          :announcements="activeAnnouncements"
          :is-admin="isAdminCoach"
          @new="openNewAnnouncement"
          @edit="openEditAnnouncement"
          @delete="handleDeleteAnnouncement"
        />

        <!-- This Week's Weekly Update Hero Card -->
        <WeeklyUpdateCard
          :update="currentWeekUpdate"
          :is-admin="isAdminCoach"
          @new="openNewUpdate"
          @edit="openEditUpdate"
          @duplicate="handleDuplicateUpdate"
        />

        <!-- Past Weekly Updates Archive Accordion -->
        <div v-if="pastUpdates && pastUpdates.length" class="past-updates-accordion">
          <button
            type="button"
            class="accordion-header-btn"
            @click="isPastUpdatesOpen = !isPastUpdatesOpen"
          >
            <span class="accordion-label">
              <span>📋</span>
              <span>Previous Weekly Updates Archive ({{ pastUpdates.length }})</span>
            </span>
            <span class="accordion-toggle-indicator">
              {{ isPastUpdatesOpen ? '▲ Hide Archive' : '▼ View Past Updates' }}
            </span>
          </button>

          <div v-if="isPastUpdatesOpen" class="accordion-body">
            <div class="archive-list">
              <div
                v-for="pu in pastUpdates"
                :key="pu.id"
                class="archive-item"
              >
                <div class="archive-item-main">
                  <h4 class="archive-title">{{ pu.title }}</h4>
                  <p class="archive-meta">Week of {{ pu.weekOf }} • Practice at {{ pu.practiceLocation }}</p>
                  <p class="archive-snippet">{{ pu.greeting?.slice(0, 160) }}...</p>
                </div>
                <div class="archive-item-side">
                  <button
                    v-if="isAdminCoach"
                    type="button"
                    class="hub-btn hub-btn-sm hub-btn-secondary"
                    title="Clone this update"
                    @click="handleDuplicateUpdate(pu.id)"
                  >
                    Copy
                  </button>
                  <button
                    v-if="isAdminCoach"
                    type="button"
                    class="hub-btn hub-btn-sm hub-btn-primary"
                    @click="openEditUpdate(pu)"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Links Cards Grid (Team Store, League, Photos) -->
        <div class="quick-links-section">
          <div class="section-title-row">
            <div class="title-with-badge">
              <span class="kicker-tag">RESOURCES</span>
              <h3 class="section-heading">Quick Links & Portals</h3>
            </div>
            <div v-if="isAdminCoach" class="admin-links-btns">
              <button
                type="button"
                class="edit-tiles-btn"
                title="Hub Settings & Webhook"
                @click="openHubSettings"
              >
                ⚙️ Hub Settings
              </button>
              <button
                type="button"
                class="edit-tiles-btn"
                @click="openQuickLinksEditor"
              >
                ✏️ Manage Links
              </button>
            </div>
          </div>

          <div class="links-tiles-grid">
            <a
              v-for="link in activeQuickLinks"
              :key="link.id"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="link-tile-card"
            >
              <div class="tile-icon-bubble">
                <img
                  v-if="isImageIcon(link.icon)"
                  :src="link.icon"
                  :alt="link.label"
                  class="tile-icon-img"
                />
                <span v-else>{{ link.icon || '🔗' }}</span>
              </div>
              <div class="tile-content">
                <h4 class="tile-title">{{ link.label }}</h4>
                <span class="tile-arrow">Open Portal &rarr;</span>
              </div>
            </a>
          </div>
        </div>
      </div>

      <!-- 3. ADMIN EDITOR MODAL -->
      <HubEditorModal
        :is-open="isEditorOpen"
        :initial-tab="editorInitialTab"
        :editing-update="editingUpdateItem"
        :editing-plan="editingPlanItem"
        :editing-announcement="editingAnnouncementItem"
        :editing-resource="editingResourceItem"
        :quick-links="quickLinks"
        :emergency-plans="emergencyPlans"
        :hub-config="hubConfig"
        @close="isEditorOpen = false"
        @save-update="handleSaveUpdate"
        @save-plan="handleSavePlan"
        @save-announcement="handleSaveAnnouncement"
        @save-resource="handleSaveResource"
        @save-quick-links="handleSaveQuickLinks"
        @save-emergency-plans="handleSaveEmergencyPlans"
        @save-config="handleSaveConfig"
        @duplicate-update="handleDuplicateUpdate"
        @duplicate-plan="handleDuplicatePlan"
        @toast="emit('toast', $event)"
      />
    </div>
  </main>
</template>

<style scoped>
.hub-main-container {
  max-width: 1140px;
  margin: 0 auto;
  padding-top: calc(var(--site-header-height, 70px) + 20px);
  padding-bottom: 64px;
  padding-left: 16px;
  padding-right: 16px;
}

/* Gated Access Card */
.gated-access-card {
  max-width: 520px;
  margin: 60px auto;
  background: var(--bg-card, #171717);
  border: 1px solid var(--border-strong, #3f3f3f);
  border-radius: 16px;
  padding: 40px 28px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.gated-lock-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.gated-kicker {
  font-family: 'Teko', sans-serif;
  font-size: 14px;
  letter-spacing: 1.5px;
  color: #dc2626;
  font-weight: 700;
  text-transform: uppercase;
}

.gated-title {
  margin: 4px 0 12px 0;
  font-size: 26px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
}

.gated-desc {
  margin: 0 0 28px 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-muted, #9ca3af);
}

.gated-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Hub Header Bar */
.hub-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.hub-subtag {
  font-family: 'Teko', sans-serif;
  font-size: 14px;
  letter-spacing: 1.5px;
  color: #dc2626;
  font-weight: 700;
  text-transform: uppercase;
}

.hub-page-title {
  margin: 0;
  font-size: 32px;
  font-weight: 900;
  color: var(--text-main, #f3f4f6);
  letter-spacing: -0.5px;
  line-height: 1.1;
}

.segmented-control-container {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.segmented-toggle {
  display: flex;
  align-items: center;
  background: var(--bg-subtle, #202020);
  border: 1px solid var(--border, #2c2c2c);
  padding: 4px;
  border-radius: 9999px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.segment-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  padding: 7px 16px;
  border-radius: 9999px;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-muted, #9ca3af);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.segment-btn:hover {
  color: var(--text-main, #f3f4f6);
}

.segment-btn.active {
  background: #dc2626;
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(220, 38, 38, 0.4);
}

.segment-btn.coaches.active {
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(37, 99, 235, 0.4);
}

.admin-quick-menu {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Past Updates Accordion */
.past-updates-accordion {
  background: var(--bg-card, #171717);
  border: 1px solid var(--border, #262626);
  border-radius: 12px;
  margin-bottom: 28px;
  overflow: hidden;
}

.accordion-header-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  border: none;
  padding: 16px 20px;
  color: var(--text-main, #f3f4f6);
  font-size: 14.5px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
}

.accordion-header-btn:hover {
  background: rgba(255, 255, 255, 0.02);
}

.accordion-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.accordion-toggle-indicator {
  font-size: 12px;
  color: #dc2626;
  font-weight: 700;
}

.accordion-body {
  padding: 0 20px 20px 20px;
  border-top: 1px solid var(--border, #262626);
}

.archive-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.archive-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  background: var(--bg-subtle, #202020);
  border: 1px solid var(--border, #2c2c2c);
  padding: 12px 16px;
  border-radius: 8px;
  flex-wrap: wrap;
}

.archive-item-main {
  flex: 1;
  min-width: 240px;
}

.archive-title {
  margin: 0 0 4px 0;
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text-main, #f3f4f6);
}

.archive-meta {
  margin: 0 0 4px 0;
  font-size: 12.5px;
  color: #f87171;
  font-weight: 600;
}

.archive-snippet {
  margin: 0;
  font-size: 12px;
  color: var(--text-dim, #707070);
  line-height: 1.4;
}

.archive-item-side {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Quick Links Section */
.quick-links-section {
  margin-top: 28px;
}

.section-title-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}

.kicker-tag {
  font-family: 'Teko', sans-serif;
  font-size: 13.5px;
  letter-spacing: 1px;
  color: #dc2626;
  font-weight: 700;
  text-transform: uppercase;
}

.section-heading {
  margin: 2px 0 0 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
}

.admin-links-btns {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-tiles-btn {
  background: transparent;
  border: 1px solid var(--border, #2c2c2c);
  color: var(--text-muted, #9ca3af);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.edit-tiles-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-main, #f3f4f6);
}

.links-tiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.link-tile-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--bg-card, #171717);
  border: 1px solid var(--border, #262626);
  border-radius: 10px;
  padding: 16px 18px;
  text-decoration: none;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s, border-color 0.15s;
}

.link-tile-card:hover {
  border-color: #dc2626;
  transform: translateY(-2px);
}

.tile-icon-bubble {
  font-size: 24px;
  line-height: 1;
  background: var(--bg-subtle, #202020);
  border: 1px solid var(--border, #2c2c2c);
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.tile-icon-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  border-radius: 4px;
}

.tile-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tile-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
}

.tile-arrow {
  font-size: 12px;
  font-weight: 700;
  color: #dc2626;
}

/* Common Buttons */
.hub-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
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

.hub-btn-lg {
  padding: 12px 20px;
  font-size: 15px;
}

.hub-btn-primary {
  background: #dc2626;
  color: #ffffff;
}

.hub-btn-primary:hover {
  background: #b91c1c;
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
