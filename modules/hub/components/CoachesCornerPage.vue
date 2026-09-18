<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCoachAuth } from '~/modules/coach-admin/composables/useCoachAuth'
import { useHubData } from '../composables/useHubData'
import type { PracticePlan, CoachResource, Announcement, HubConfig, EmergencyPlan } from '../types/hub'
import PracticePlanCard from './PracticePlanCard.vue'
import HubEditorModal from './HubEditorModal.vue'

const emit = defineEmits<{
  (e: 'openAuth', mode?: 'login' | 'signup'): void
  (e: 'toast', msg: string): void
  (e: 'navigate', route: string): void
}>()

const { isAuthorizedCoach, isAdminCoach } = useCoachAuth()

const {
  practicePlans,
  currentPracticePlan,
  pastPracticePlans,
  practiceUpdateAnnouncements,
  coachResources,
  emergencyPlans,
  quickLinks,
  hubConfig,
  duplicatePracticePlan,
  savePracticePlan,
  saveCoachResource,
  saveEmergencyPlans,
  saveHubConfig,
  deleteHubItem
} = useHubData()

const selectedCategory = ref<'all' | 'eap' | 'skill-drill' | 'safety' | 'reference'>('all')
const isArchiveOpen = ref(false)

// Editor Modal State
const isEditorOpen = ref(false)
const editorInitialTab = ref<'weekly' | 'plan' | 'announcement' | 'links' | 'eap' | 'resource' | 'settings'>('plan')
const editingPlanItem = ref<PracticePlan | null>(null)
const editingResourceItem = ref<CoachResource | null>(null)

const openEapsEditor = () => {
  editorInitialTab.value = 'eap'
  isEditorOpen.value = true
}

const handleSaveEmergencyPlans = async (plans: EmergencyPlan[]) => {
  const res = await saveEmergencyPlans(plans)
  if (res.success) {
    emit('toast', '✅ Emergency Action Plans saved!')
  } else {
    emit('toast', `❌ Error: ${res.error}`)
  }
}

const filteredResources = computed(() => {
  if (selectedCategory.value === 'all') return coachResources.value
  return coachResources.value.filter((r) => r.category === selectedCategory.value)
})

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

const handleSavePlan = async (plan: PracticePlan) => {
  const res = await savePracticePlan(plan)
  if (res.success) {
    emit('toast', '✅ Practice plan saved!')
  } else {
    emit('toast', `❌ Error: ${res.error}`)
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
</script>

<template>
  <main class="coaches-main-container">
    <!-- 1. GATED ACCESS CHECK: Must be admin -->
    <div v-if="!isAdminCoach" class="coach-gate-card">
      <div class="coach-gate-icon">🚵</div>
      <span class="coach-gate-kicker">ADMINISTRATOR PREVIEW</span>
      <h2 class="coach-gate-title">Coaches Corner</h2>
      <p class="coach-gate-desc">
        This portal contains weekly lesson plans, on-trail skills clinic guides, emergency action plans, and coaching documents. Access is currently reserved for team administrators.
      </p>

      <div class="coach-gate-actions">
        <button
          type="button"
          class="hub-btn hub-btn-primary hub-btn-lg"
          @click="emit('openAuth', 'login')"
        >
          🔑 Sign In with Coach Account
        </button>
        <button
          type="button"
          class="hub-btn hub-btn-secondary"
          @click="emit('openAuth', 'signup')"
        >
          Have a Coach Invite Code? Register
        </button>
      </div>
    </div>

    <!-- 2. AUTHENTICATED COACHES CORNER CONTENT -->
    <div v-else class="coaches-content-root">
      <!-- Active Practice Updates (Shared data with Team Hub) -->
      <div
        v-if="practiceUpdateAnnouncements && practiceUpdateAnnouncements.length"
        class="practice-alerts-section"
      >
        <div class="section-label-row">
          <span class="alert-icon">⚠️</span>
          <h3>Practice Status Bulletins</h3>
        </div>

        <div class="alerts-stack">
          <div
            v-for="ann in practiceUpdateAnnouncements"
            :key="ann.id"
            class="coach-alert-card"
          >
            <div class="alert-top">
              <span class="badge-alert-type">{{ ann.title }}</span>
              <span v-if="ann.priority === 'urgent'" class="badge-urgent-pill">URGENT</span>
            </div>
            <p class="alert-msg">{{ ann.message }}</p>
          </div>
        </div>
      </div>

      <!-- This Week's Practice Plan -->
      <PracticePlanCard
        :plan="currentPracticePlan"
        :is-admin="isAdminCoach"
        @new="openNewPlan"
        @edit="openEditPlan"
        @duplicate="handleDuplicatePlan"
      />

      <!-- Past Practice Plans Archive Accordion -->
      <div v-if="pastPracticePlans && pastPracticePlans.length" class="past-plans-accordion">
        <button
          type="button"
          class="accordion-toggle-btn"
          @click="isArchiveOpen = !isArchiveOpen"
        >
          <span class="accordion-title">
            <span>📚</span>
            <span>Previous Practice Plans Archive ({{ pastPracticePlans.length }})</span>
          </span>
          <span class="accordion-arrow">{{ isArchiveOpen ? '▲ Hide' : '▼ View Archive' }}</span>
        </button>

        <div v-if="isArchiveOpen" class="accordion-content">
          <div class="archive-cards-list">
            <div
              v-for="p in pastPracticePlans"
              :key="p.id"
              class="archive-plan-item"
            >
              <div class="plan-item-info">
                <h4>{{ p.title }}</h4>
                <p class="meta">📅 {{ p.date }} • 📍 {{ p.location }}</p>
                <p v-if="p.objectives && p.objectives.length" class="obj-snippet">
                  <strong>Objectives:</strong> {{ p.objectives.join(' • ') }}
                </p>
              </div>
              <div class="plan-item-actions">
                <button
                  v-if="isAdminCoach"
                  type="button"
                  class="hub-btn hub-btn-sm hub-btn-secondary"
                  @click="handleDuplicatePlan(p.id)"
                >
                  Copy
                </button>
                <button
                  v-if="isAdminCoach"
                  type="button"
                  class="hub-btn hub-btn-sm hub-btn-primary"
                  @click="openEditPlan(p)"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Emergency Action Plans (EAP) Quick Access Grid -->
      <div class="eap-section">
        <div class="section-title-bar">
          <div class="section-title-left">
            <span class="eap-icon">🚨</span>
            <h3>Emergency Action Plans (EAP) by Location</h3>
          </div>
          <button
            v-if="isAuthorizedCoach || isAdminCoach"
            type="button"
            class="hub-btn hub-btn-sm hub-btn-secondary"
            title="Edit emergency action plan documents and access coordinates"
            @click="openEapsEditor"
          >
            ✏️ Edit EAPs
          </button>
        </div>
        <p class="section-subtext">
          Location-specific emergency coordinates, 911 dispatch ingress, and trailhead evacuation routes:
        </p>

        <div class="eap-cards-grid">
          <div
            v-for="eap in emergencyPlans"
            :key="eap.id"
            class="eap-card"
          >
            <div class="eap-header">
              <h4>{{ eap.location }}</h4>
              <div class="eap-header-right">
                <span v-if="eap.badge" class="eap-badge">{{ eap.badge }}</span>
                <button
                  v-if="isAuthorizedCoach || isAdminCoach"
                  type="button"
                  class="eap-card-edit-btn"
                  title="Edit this EAP location"
                  @click="openEapsEditor"
                >
                  ✏️
                </button>
              </div>
            </div>
            <p class="eap-desc">{{ eap.description }}</p>
            <a
              :href="eap.docUrl || '#'"
              target="_blank"
              rel="noopener noreferrer"
              class="eap-download-btn"
            >
              <span>Open EAP Doc</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Coach Documents & Skills Library -->
      <div class="library-section">
        <div class="library-header">
          <div class="library-header-text">
            <span class="lib-tag">RESOURCES</span>
            <h3>On-Trail Skills & Coach Document Library</h3>
          </div>

          <div class="library-controls">
            <!-- Category Filters -->
            <div class="cat-pill-filters">
              <button
                type="button"
                class="filter-pill"
                :class="{ active: selectedCategory === 'all' }"
                @click="selectedCategory = 'all'"
              >
                All ({{ coachResources.length }})
              </button>
              <button
                type="button"
                class="filter-pill"
                :class="{ active: selectedCategory === 'skill-drill' }"
                @click="selectedCategory = 'skill-drill'"
              >
                Skills & Drills
              </button>
              <button
                type="button"
                class="filter-pill"
                :class="{ active: selectedCategory === 'safety' }"
                @click="selectedCategory = 'safety'"
              >
                Safety Protocols
              </button>
              <button
                type="button"
                class="filter-pill"
                :class="{ active: selectedCategory === 'eap' }"
                @click="selectedCategory = 'eap'"
              >
                EAPs
              </button>
            </div>

            <button
              v-if="isAdminCoach"
              type="button"
              class="hub-btn hub-btn-sm hub-btn-primary"
              @click="openNewResource"
            >
              ＋ Add Coach Document
            </button>
          </div>
        </div>

        <div v-if="filteredResources && filteredResources.length" class="docs-grid">
          <div
            v-for="res in filteredResources"
            :key="res.id"
            class="resource-doc-card"
          >
            <div class="doc-card-top">
              <span class="doc-category-badge">{{ res.category }}</span>
              <div v-if="isAdminCoach" class="doc-admin-actions">
                <button
                  type="button"
                  class="icon-btn"
                  title="Edit"
                  @click="openEditResource(res)"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  class="icon-btn"
                  title="Delete"
                  @click="handleDeleteResource(res.id)"
                >
                  🗑️
                </button>
              </div>
            </div>

            <h4 class="doc-title">{{ res.title }}</h4>
            <p class="doc-desc">{{ res.description }}</p>

            <div v-if="res.tags && res.tags.length" class="doc-tags">
              <span v-for="tag in res.tags" :key="tag" class="doc-tag">#{{ tag }}</span>
            </div>

            <a
              :href="res.url"
              target="_blank"
              rel="noopener noreferrer"
              class="doc-open-link"
            >
              <span>Open in Google Drive</span>
              <span>↗</span>
            </a>
          </div>
        </div>

        <div v-else class="empty-docs-state">
          <p>No documents found in this category.</p>
        </div>
      </div>

      <!-- Editor Modal -->
      <HubEditorModal
        :is-open="isEditorOpen"
        :initial-tab="editorInitialTab"
        :editing-plan="editingPlanItem"
        :editing-resource="editingResourceItem"
        :quick-links="quickLinks"
        :emergency-plans="emergencyPlans"
        :hub-config="hubConfig"
        @close="isEditorOpen = false"
        @save-plan="handleSavePlan"
        @save-resource="handleSaveResource"
        @save-emergency-plans="handleSaveEmergencyPlans"
        @duplicate-plan="handleDuplicatePlan"
        @toast="emit('toast', $event)"
      />
    </div>
  </main>
</template>

<style scoped>
.coaches-main-container {
  max-width: 1140px;
  margin: 0 auto;
  padding-top: calc(var(--site-header-height, 70px) + 20px);
  padding-bottom: 64px;
  padding-left: 16px;
  padding-right: 16px;
}

/* Gate Card */
.coach-gate-card {
  max-width: 520px;
  margin: 60px auto;
  background: var(--bg-card, #171717);
  border: 1px solid var(--border-strong, #3f3f3f);
  border-radius: 16px;
  padding: 40px 28px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.coach-gate-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.coach-gate-kicker {
  font-family: 'Teko', sans-serif;
  font-size: 14px;
  letter-spacing: 1.5px;
  color: #38bdf8;
  font-weight: 700;
  text-transform: uppercase;
}

.coach-gate-title {
  margin: 4px 0 12px 0;
  font-size: 26px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
}

.coach-gate-desc {
  margin: 0 0 28px 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-muted, #9ca3af);
}

.coach-gate-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Content Root */
.coaches-content-root {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Practice Alerts */
.practice-alerts-section {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  padding: 16px;
}

.section-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.section-label-row h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #fbbf24;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.alerts-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.coach-alert-card {
  background: var(--bg-card, #171717);
  border: 1px solid var(--border, #262626);
  border-left: 4px solid #f59e0b;
  border-radius: 8px;
  padding: 12px 14px;
}

.alert-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.badge-alert-type {
  font-size: 13.5px;
  font-weight: 700;
  color: #f3f4f6;
}

.badge-urgent-pill {
  font-size: 10px;
  font-weight: 800;
  background: #dc2626;
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 4px;
}

.alert-msg {
  margin: 0;
  font-size: 13px;
  color: #d1d5db;
  line-height: 1.45;
}

/* Archive Accordion */
.past-plans-accordion {
  background: var(--bg-card, #171717);
  border: 1px solid var(--border, #262626);
  border-radius: 10px;
  overflow: hidden;
}

.accordion-toggle-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  border: none;
  padding: 16px 20px;
  cursor: pointer;
  color: var(--text-main, #f3f4f6);
  font-size: 15px;
  font-weight: 700;
  text-align: left;
}

.accordion-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.03);
}

.accordion-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.accordion-arrow {
  font-size: 12.5px;
  color: #3b82f6;
  font-weight: 700;
}

.accordion-content {
  padding: 0 20px 20px 20px;
  border-top: 1px solid var(--border, #262626);
}

.archive-cards-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.archive-plan-item {
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

.plan-item-info h4 {
  margin: 0 0 4px 0;
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text-main, #f3f4f6);
}

.plan-item-info .meta {
  margin: 0 0 4px 0;
  font-size: 12.5px;
  color: var(--text-muted, #9ca3af);
}

.plan-item-info .obj-snippet {
  margin: 0;
  font-size: 12px;
  color: var(--text-dim, #707070);
}

.plan-item-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* EAP Section */
.eap-section {
  background: var(--bg-card, #171717);
  border: 1px solid var(--border, #262626);
  border-radius: 12px;
  padding: 22px;
}

.section-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 4px;
}

.section-title-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title-bar h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
}

.section-subtext {
  margin: 0 0 18px 0;
  font-size: 13.5px;
  color: var(--text-muted, #9ca3af);
}

.eap-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.eap-card {
  background: var(--bg-subtle, #202020);
  border: 1px solid var(--border, #2c2c2c);
  border-top: 3px solid #ef4444;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.eap-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.eap-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
}

.eap-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.eap-card-edit-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 13px;
  opacity: 0.7;
  transition: opacity 0.2s, background 0.2s;
}

.eap-card-edit-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.12);
}

.eap-badge {
  font-size: 10.5px;
  font-weight: 700;
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  padding: 2px 6px;
  border-radius: 4px;
}

.eap-desc {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-muted, #9ca3af);
  line-height: 1.4;
  flex: 1;
}

.eap-download-btn {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #f87171;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.15s;
}

.eap-download-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ffffff;
}

/* Document Library */
.library-section {
  background: var(--bg-card, #171717);
  border: 1px solid var(--border, #262626);
  border-radius: 12px;
  padding: 22px;
}

.library-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 18px;
  gap: 16px;
  flex-wrap: wrap;
}

.lib-tag {
  font-family: 'Teko', sans-serif;
  font-size: 13.5px;
  letter-spacing: 1px;
  color: #3b82f6;
  font-weight: 700;
  text-transform: uppercase;
}

.library-header-text h3 {
  margin: 2px 0 0 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--text-main, #f3f4f6);
}

.library-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.cat-pill-filters {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-pill {
  background: var(--bg-subtle, #202020);
  border: 1px solid var(--border, #2c2c2c);
  color: var(--text-muted, #9ca3af);
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-pill.active {
  background: #3b82f6;
  color: #ffffff;
  border-color: #3b82f6;
}

.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.resource-doc-card {
  background: var(--bg-subtle, #202020);
  border: 1px solid var(--border, #2c2c2c);
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.doc-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.doc-category-badge {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.12);
  padding: 2px 6px;
  border-radius: 4px;
}

.doc-admin-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 2px;
  opacity: 0.7;
}

.icon-btn:hover {
  opacity: 1;
}

.doc-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main, #f3f4f6);
}

.doc-desc {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-muted, #9ca3af);
  line-height: 1.45;
  flex: 1;
}

.doc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.doc-tag {
  font-size: 11px;
  color: var(--text-dim, #707070);
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 6px;
  border-radius: 4px;
}

.doc-open-link {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  color: #60a5fa;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.doc-open-link:hover {
  color: #93c5fd;
}

.empty-docs-state {
  text-align: center;
  padding: 32px 16px;
  color: var(--text-muted, #9ca3af);
  font-size: 13.5px;
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
  background: #3b82f6;
  color: #ffffff;
}

.hub-btn-primary:hover {
  background: #2563eb;
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
