<script setup lang="ts">
import type { SignUpLinks } from '../types/race'

const props = defineProps<{
  signups?: SignUpLinks
  raceName: string
  isCoachAuth?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
}>()

const isHubOpen = ref(true)
const isViewerOpen = ref(false)
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

const currentTitle = computed(() => {
  switch (activeSignUpTab.value) {
    case 'volunteer':
      return { icon: '🤝', title: 'LAXMTB Team Volunteers', badgeClass: 'signup-badge-lax', badgeText: 'LAXMTB' }
    case 'food':
      return { icon: '🥪', title: 'LAXMTB Food & Hospitality', badgeClass: 'signup-badge-lax', badgeText: 'LAXMTB' }
    case 'league':
      return { icon: '🌲', title: 'Wisconsin League Volunteer Shifts', badgeClass: 'signup-badge-league', badgeText: 'WI League' }
  }
})

const selectSignUpTab = (tab: 'volunteer' | 'food' | 'league') => {
  activeSignUpTab.value = tab
  isViewerOpen.value = true
}
</script>

<template>
  <div class="signup-hub-section" id="signupHubSection">
    <div class="signup-hub-header collapsible-header" @click="isHubOpen = !isHubOpen">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="signup-hub-title"><span>🤝</span> Team Volunteers & Race Hospitality</span>
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
      <!-- 3 SignUp Action Selector Cards -->
      <div class="signup-cards-grid">
        <!-- 1. LAX Volunteer Card -->
        <div
          class="signup-action-card"
          :class="{ 'active-signup-card': activeSignUpTab === 'volunteer' && isViewerOpen }"
          data-signup-card="volunteer"
          @click="selectSignUpTab('volunteer')"
        >
          <div>
            <div class="signup-card-top">
              <span class="signup-card-title"><span>🤝</span> Team Volunteers</span>
              <span class="signup-badge-lax">LAXMTB</span>
            </div>
            <p class="signup-card-desc">Pit zone setup & teardown, staging grid helpers, feed zone support, and bike checks.</p>
          </div>
          <div class="signup-card-hint">
            <span v-if="signups?.volunteer"><span>👇</span> Click to View & Sign Up Below</span>
            <span v-else><span>⏳</span> Shifts Opening Soon</span>
          </div>
        </div>

        <!-- 2. LAX Food Card -->
        <div
          class="signup-action-card"
          :class="{ 'active-signup-card': activeSignUpTab === 'food' && isViewerOpen }"
          data-signup-card="food"
          @click="selectSignUpTab('food')"
        >
          <div>
            <div class="signup-card-top">
              <span class="signup-card-title"><span>🥪</span> Food & Hospitality</span>
              <span class="signup-badge-lax">LAXMTB</span>
            </div>
            <p class="signup-card-desc">Team tent meals, racer race-day snacks, hydration coolers, fruit station & grill team.</p>
          </div>
          <div class="signup-card-hint">
            <span v-if="signups?.food"><span>👇</span> Click to View & Sign Up Below</span>
            <span v-else><span>⏳</span> Shifts Opening Soon</span>
          </div>
        </div>

        <!-- 3. League Shifts Card -->
        <div
          class="signup-action-card card-league"
          :class="{ 'active-signup-card': activeSignUpTab === 'league' && isViewerOpen }"
          data-signup-card="league"
          @click="selectSignUpTab('league')"
        >
          <div>
            <div class="signup-card-top">
              <span class="signup-card-title"><span>🌲</span> League Shifts</span>
              <span class="signup-badge-league">WI League</span>
            </div>
            <p class="signup-card-desc">Official League course marshals, staging grid staff, finish line & sweep rider shifts.</p>
          </div>
          <div class="signup-card-hint">
            <span v-if="signups?.league"><span>👇</span> Click to View & Sign Up Below</span>
            <span v-else><span>⏳</span> Shifts Opening Soon</span>
          </div>
        </div>
      </div>

      <!-- Embedded Interactive Viewer Container -->
      <div class="signup-viewer-container" id="signupViewerContainer">
        <div class="signup-viewer-header collapsible-header" @click="isViewerOpen = !isViewerOpen">
          <div style="display:flex;align-items:center;gap:8px;">
            <span id="signupViewerTitle">
              <span>{{ currentTitle.icon }}</span> <strong>{{ currentTitle.title }}</strong>
              <span :class="currentTitle.badgeClass">{{ currentTitle.badgeText }}</span>
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <a
              id="signupViewerDirectBtn"
              :href="currentUrl"
              :target="currentCode ? '_blank' : undefined"
              rel="noopener noreferrer"
              class="btn-viewer-direct"
              :style="currentCode ? '' : 'opacity:0.6;pointer-events:none;box-shadow:none;'"
              @click.stop
            >
              <span>{{ currentCode ? '✍️' : '⏳' }}</span> {{ currentCode ? 'Sign Up Direct ↗' : 'Shifts Opening Soon' }}
            </a>
            <span class="card-toggle-icon" :class="{ collapsed: !isViewerOpen }" id="signupViewerToggleIcon" title="Toggle Embed Viewer">▼</span>
          </div>
        </div>

        <div v-show="isViewerOpen" class="collapsible-body" id="signupViewerBody">
          <div class="signup-iframe-wrapper" id="signupViewerContent">
            <iframe
              v-if="currentCode"
              id="signupViewerIframe"
              :src="currentUrl"
              width="100%"
              height="100%"
              loading="lazy"
              title="Interactive SignUp.com Sheet"
            />
            <div v-else style="padding:56px 20px;text-align:center;background:var(--bg-card);display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
              <span style="font-size:38px;margin-bottom:12px;">📋</span>
              <h3 style="font-size:16px;font-weight:700;color:var(--text-main);margin:0 0 6px 0;">{{ currentTitle.title }} • Opening Soon</h3>
              <p style="font-size:13px;color:var(--text-muted);max-width:440px;margin:0 auto;line-height:1.5;">
                SignUp.com shifts for <strong>{{ raceName }}</strong> will open 2 weeks prior to race weekend. Links will automatically appear here once released!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
