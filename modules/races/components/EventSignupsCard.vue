<script setup lang="ts">
import type { SignUpLinks } from '../types/race'

const props = defineProps<{
  signups?: SignUpLinks
  raceName: string
  isCompleted?: boolean
  isCoachAuth?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
}>()

const isHubOpen = ref(true)
const activeSignUpTab = ref<'volunteer' | 'food' | 'league'>('volunteer')

const getSignUpUrl = (code?: string | null) => {
  if (!code) return '#'
  if (code.startsWith('http://') || code.startsWith('https://')) return code
  return `https://signup.com/client/invitation2/secure/${code}/false#/invitation`
}

const currentCode = computed(() => {
  if (!props.signups) return null
  return props.signups[activeSignUpTab.value] || null
})

const currentUrl = computed(() => {
  return currentCode.value ? getSignUpUrl(currentCode.value) : '#'
})

const currentTabInfo = computed(() => {
  switch (activeSignUpTab.value) {
    case 'volunteer':
      return {
        icon: '🤝',
        title: 'Team Volunteers',
        sheetTitle: 'LAXMTB Team Volunteers',
        badgeClass: 'signup-badge-lax',
        badgeText: 'LAXMTB',
        desc: 'Pit zone setup & teardown, staging grid helpers, feed zone support, and bike checks.'
      }
    case 'food':
      return {
        icon: '🥪',
        title: 'Food & Hospitality',
        sheetTitle: 'LAXMTB Food & Hospitality',
        badgeClass: 'signup-badge-lax',
        badgeText: 'LAXMTB',
        desc: 'Team tent meals, racer race-day snacks, hydration coolers, fruit station & barbecue grill team.'
      }
    case 'league':
      return {
        icon: '🚵',
        title: 'WI League Shifts',
        sheetTitle: 'Wisconsin League Shifts',
        badgeClass: 'signup-badge-league',
        badgeText: 'WI League',
        desc: 'Official League course marshals, staging grid staff, finish line & sweep rider shifts.'
      }
  }
})

const selectSignUpTab = (tab: 'volunteer' | 'food' | 'league') => {
  activeSignUpTab.value = tab
}
</script>

<template>
  <div class="signup-hub-section" id="signupHubSection">
    <!-- Main Card Header -->
    <div class="signup-hub-header collapsible-header" @click="isHubOpen = !isHubOpen">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="signup-hub-title">
          <span>🤝</span> Team Volunteers & Race Hospitality
          <span v-if="isCompleted" class="signup-badge-closed">Event Concluded • Closed</span>
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button
          v-if="isCoachAuth"
          type="button"
          class="card-inline-edit-btn"
          title="Edit Volunteer & Food SignUp Links"
          @click.stop="emit('edit')"
        >
          <span>✏️</span>
        </button>
        <span class="card-toggle-icon" :class="{ collapsed: !isHubOpen }" title="Toggle Volunteers & Food">▼</span>
      </div>
    </div>

    <div v-show="isHubOpen" class="collapsible-body">
      <!-- State A: Event Has Concluded / Closed -->
      <div v-if="isCompleted" class="signup-closed-container">
        <div class="signup-closed-card">
          <div class="signup-closed-icon-bubble">
            <span>🏁</span>
          </div>
          <div class="signup-closed-badge">SignUps Closed</div>
          <h3 class="signup-closed-title">{{ raceName }} Has Concluded</h3>
          <p class="signup-closed-desc">
            All volunteer, food & hospitality, and league shifts for this race weekend are officially completed. Thank you to all parents, coaches, and volunteers who supported our riders!
          </p>
          <div class="signup-closed-pills">
            <span class="signup-closed-tag"><span>🤝</span> Team Volunteers Closed</span>
            <span class="signup-closed-tag"><span>🥪</span> Hospitality Closed</span>
            <span class="signup-closed-tag"><span>🚵</span> League Shifts Closed</span>
          </div>
        </div>
      </div>

      <!-- State B: Active / Upcoming Event -->
      <template v-else>
        <!-- Unified Segmented Tabs & Action Row -->
        <div class="signup-tabs-toolbar">
          <div class="signup-pills-group">
            <button
              type="button"
              class="signup-tab-pill"
              :class="{ active: activeSignUpTab === 'volunteer' }"
              @click="selectSignUpTab('volunteer')"
            >
              <span>🤝</span> Team Volunteers
            </button>
            <button
              type="button"
              class="signup-tab-pill"
              :class="{ active: activeSignUpTab === 'food' }"
              @click="selectSignUpTab('food')"
            >
              <span>🥪</span> Food & Hospitality
            </button>
            <button
              type="button"
              class="signup-tab-pill pill-league"
              :class="{ active: activeSignUpTab === 'league' }"
              @click="selectSignUpTab('league')"
            >
              <span>🚵</span> WI League Shifts
            </button>
          </div>

          <a
            :href="currentUrl"
            :target="currentCode ? '_blank' : undefined"
            rel="noopener noreferrer"
            class="btn-viewer-direct"
            :class="{ 'btn-league-direct': activeSignUpTab === 'league' }"
            :style="currentCode ? '' : 'opacity:0.6;pointer-events:none;box-shadow:none;'"
          >
            <span>{{ currentCode ? '✍️' : '⏳' }}</span> {{ currentCode ? 'Open in SignUp.com ↗' : 'Shifts Opening Soon' }}
          </a>
        </div>

        <!-- Active Shift Context & Description -->
        <div class="signup-shift-summary">
          <span :class="currentTabInfo.badgeClass">{{ currentTabInfo.badgeText }}</span>
          <span class="signup-shift-desc">{{ currentTabInfo.desc }}</span>
        </div>

        <!-- Embedded Sheet / Fallback -->
        <div class="signup-iframe-wrapper">
          <iframe
            v-if="currentCode"
            :key="currentUrl"
            :src="currentUrl"
            width="100%"
            height="100%"
            loading="lazy"
            :title="`${currentTabInfo.sheetTitle} Sheet`"
          />
          <div v-else class="signup-empty-state">
            <span class="empty-icon">📋</span>
            <h3 class="empty-title">{{ currentTabInfo.sheetTitle }} • Opening Soon</h3>
            <p class="empty-desc">
              SignUp.com shifts for <strong>{{ raceName }}</strong> will open 2 weeks prior to race weekend. Links will automatically appear here once released!
            </p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
