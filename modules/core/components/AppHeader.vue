<script setup lang="ts">
const { isOnline } = useNetworkStatus()
const { theme, toggleTheme } = useTheme()
const { user, isCoachAuth, isAuthorizedCoach, signInWithGoogle, signOut, authLoading } = useCoachAuth()

const isMenuOpen = ref(false)

const emit = defineEmits<{
  (e: 'openWhatsNew'): void
  (e: 'openNotifications'): void
  (e: 'openAdmin'): void
  (e: 'syncData'): void
  (e: 'toast', msg: string): void
}>()

const toggleMenu = () => { isMenuOpen.value = !isMenuOpen.value }
const closeMenu = () => { isMenuOpen.value = false }

const handleWhatsNew = () => { closeMenu(); emit('openWhatsNew') }
const handleNotifications = () => { closeMenu(); emit('openNotifications') }
const handleAdmin = () => { closeMenu(); emit('openAdmin') }
const handleSync = () => { closeMenu(); emit('syncData') }

const handleSignIn = async () => {
  closeMenu()
  const result = await signInWithGoogle()
  if (result.success) {
    emit('toast', `🔓 Welcome, ${user.value?.displayName || user.value?.email}! Coach Admin unlocked.`)
  } else if (result.error) {
    emit('toast', `⛔ ${result.error}`)
  }
}

const handleSignOut = async () => {
  closeMenu()
  await signOut()
  emit('toast', '👋 Signed out of Coach Admin')
}

// Admin badge styling
const adminBadgeLabel = computed(() => {
  if (!isOnline.value) return 'Offline'
  if (isCoachAuth.value) return '🔓 Unlocked'
  return '🔒 Locked'
})

const adminBadgeStyle = computed(() => {
  if (!isOnline.value) return 'background:rgba(245,158,11,0.15);border-color:rgba(245,158,11,0.3);color:#f59e0b;'
  if (isCoachAuth.value) return 'background:rgba(34,197,94,0.18);border-color:rgba(34,197,94,0.4);color:#22c55e;'
  return 'background:rgba(234,179,8,0.15);border-color:rgba(234,179,8,0.3);color:var(--text-main);'
})

const adminSubtext = computed(() => {
  if (!isOnline.value) return 'Editing unavailable while offline'
  if (isCoachAuth.value) return `Signed in as ${user.value?.email || ''}`
  return 'Tap to unlock editing'
})

// Close dropdown on outside click
onMounted(() => {
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.header-controls') && !target.closest('.mobile-menu-dropdown')) {
      closeMenu()
    }
  }
  window.addEventListener('click', handleClickOutside)
  onUnmounted(() => window.removeEventListener('click', handleClickOutside))
})
</script>

<template>
  <div class="site-header-fixed">
    <div class="header-top-container">
      <div class="header-top">
        <!-- Brand -->
        <div class="brand-box">
          <img src="/logo.png" alt="La Crosse Area MTB Team" class="team-logo" onerror="this.style.display='none'">
          <div class="brand-text">
            <h1>LAX MTB <span class="brand-slash">//</span> <span class="brand-sub">RACE CENTRAL</span></h1>
          </div>
        </div>

        <!-- Controls -->
        <div class="header-controls">
          <span class="live-status-badge" :class="{ offline: !isOnline }">
            <span class="pulse-dot" :class="{ offline: !isOnline }" />
            <span>{{ isOnline ? 'Online' : 'Offline' }}</span>
          </span>
          <button class="theme-toggle-btn" aria-label="Toggle Theme" @click="toggleTheme">
            <span>{{ theme === 'dark' ? '☀️' : '🌙' }}</span>
            <span>{{ theme === 'dark' ? 'Light' : 'Dark' }}</span>
          </button>
          <button
            class="mobile-menu-btn"
            aria-label="Toggle Navigation Menu"
            :aria-expanded="isMenuOpen"
            @click.stop="toggleMenu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Dropdown Menu -->
    <div class="mobile-menu-dropdown" :class="{ show: isMenuOpen }">

      <!-- What's New -->
      <div class="mobile-menu-item" @click="handleWhatsNew">
        <div class="mobile-menu-item-left">
          <span>✨</span>
          <span class="mobile-menu-item-title">What's New</span>
        </div>
        <span class="mobile-menu-badge" style="background:rgba(220,38,38,0.15);border-color:rgba(220,38,38,0.3);">New</span>
      </div>

      <!-- Theme Toggle -->
      <div class="mobile-menu-item" @click="toggleTheme">
        <div class="mobile-menu-item-left">
          <span>{{ theme === 'dark' ? '☀️' : '🌙' }}</span>
          <span class="mobile-menu-item-title">Appearance</span>
        </div>
        <span class="mobile-menu-badge">{{ theme === 'dark' ? 'Light Mode' : 'Dark Mode' }}</span>
      </div>

      <!-- Notifications -->
      <div class="mobile-menu-item" @click="handleNotifications">
        <div class="mobile-menu-item-left">
          <span>🔔</span>
          <span class="mobile-menu-item-title">Race Notifications</span>
        </div>
        <span class="mobile-menu-badge">Stage • 15m</span>
      </div>

      <!-- Sync Data -->
      <div class="mobile-menu-item" @click="handleSync">
        <div class="mobile-menu-item-left">
          <span>🔄</span>
          <div>
            <div class="mobile-menu-item-title">Sync Data</div>
            <div style="font-size:11px;color:var(--text-muted);font-weight:400;margin-top:1px;">Check for latest updates</div>
          </div>
        </div>
        <span class="mobile-menu-badge" style="background:rgba(59,130,246,0.15);border-color:rgba(59,130,246,0.3);color:var(--text-main);">Sync</span>
      </div>

      <!-- Divider -->
      <div style="height:1px;background:var(--border);margin:4px 14px;" />

      <!-- CASE 1: NOT SIGNED IN AS ADMIN -> ONLY ONE OPTION: "Coach Sign In" -->
      <div v-if="!isAuthorizedCoach" class="mobile-menu-item" @click="handleSignIn">
        <div class="mobile-menu-item-left">
          <span>🔑</span>
          <div>
            <div class="mobile-menu-item-title">Coach Sign In</div>
            <div style="font-size:11px;color:var(--text-muted);font-weight:400;margin-top:1px;">Sign in with Google to manage race</div>
          </div>
        </div>
        <span class="mobile-menu-badge" style="background:rgba(34,197,94,0.15);border-color:rgba(34,197,94,0.3);color:#22c55e;">
          {{ authLoading ? '...' : 'Sign In →' }}
        </span>
      </div>

      <!-- CASE 2: SIGNED IN AS ADMIN -> CAN SEE ADMIN OPTIONS -->
      <template v-else>
        <!-- Coach Admin Modal -->
        <div class="mobile-menu-item" @click="handleAdmin">
          <div class="mobile-menu-item-left">
            <span>{{ isCoachAuth ? '🔓' : '⚙️' }}</span>
            <div>
              <div class="mobile-menu-item-title">Coach Admin</div>
              <div style="font-size:11px;color:var(--text-muted);font-weight:400;margin-top:1px;">{{ adminSubtext }}</div>
            </div>
          </div>
          <span class="mobile-menu-badge" :style="adminBadgeStyle">{{ adminBadgeLabel }}</span>
        </div>

        <!-- Sign Out -->
        <div class="mobile-menu-item" @click="handleSignOut">
          <div class="mobile-menu-item-left">
            <span>🚪</span>
            <div>
              <div class="mobile-menu-item-title">Sign Out</div>
              <div style="font-size:11px;color:var(--text-muted);font-weight:400;margin-top:1px;">{{ user?.email }}</div>
            </div>
          </div>
          <span class="mobile-menu-badge" style="background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.3);color:#ef4444;">Sign Out</span>
        </div>
      </template>

    </div>
  </div>
</template>
