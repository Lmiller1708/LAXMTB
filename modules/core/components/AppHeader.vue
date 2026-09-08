<script setup lang="ts">
const { isOnline } = useNetworkStatus()
const { theme, toggleTheme } = useTheme()

const isMenuOpen = ref(false)

const emit = defineEmits<{
  (e: 'openWhatsNew'): void
  (e: 'openNotifications'): void
  (e: 'openAdmin'): void
  (e: 'syncData'): void
}>()

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

const handleWhatsNew = () => {
  closeMenu()
  emit('openWhatsNew')
}

const handleNotifications = () => {
  closeMenu()
  emit('openNotifications')
}

const handleAdmin = () => {
  closeMenu()
  emit('openAdmin')
}

const handleSync = () => {
  closeMenu()
  emit('syncData')
}

// Close dropdown on click outside
onMounted(() => {
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.header-controls') && !target.closest('.mobile-menu-dropdown')) {
      closeMenu()
    }
  }
  window.addEventListener('click', handleClickOutside)
  onUnmounted(() => {
    window.removeEventListener('click', handleClickOutside)
  })
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
          <span class="live-status-badge" :class="{ offline: !isOnline }" id="liveBadge">
            <span class="pulse-dot" :class="{ offline: !isOnline }" id="liveDot" />
            <span id="liveStatusText">{{ isOnline ? 'Online' : 'Offline' }}</span>
          </span>
          <button class="theme-toggle-btn" id="themeToggleBtn" aria-label="Toggle Theme" @click="toggleTheme">
            <span id="themeIcon">{{ theme === 'dark' ? '☀️' : '🌙' }}</span>
            <span id="themeLabel">{{ theme === 'dark' ? 'Light' : 'Dark' }}</span>
          </button>
          <button
            class="mobile-menu-btn"
            id="mobileMenuBtn"
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
    <div class="mobile-menu-dropdown" :class="{ show: isMenuOpen }" id="mobileMenuDropdown">
      <div class="mobile-menu-item" @click="handleWhatsNew">
        <div class="mobile-menu-item-left">
          <span>✨</span>
          <span class="mobile-menu-item-title">What's New</span>
        </div>
        <span class="mobile-menu-badge" style="background:rgba(220,38,38,0.15);border-color:rgba(220,38,38,0.3);">New</span>
      </div>
      <div class="mobile-menu-item" @click="toggleTheme">
        <div class="mobile-menu-item-left">
          <span id="menuThemeIcon">{{ theme === 'dark' ? '☀️' : '🌙' }}</span>
          <span class="mobile-menu-item-title">Appearance</span>
        </div>
        <span class="mobile-menu-badge" id="menuThemeLabel">{{ theme === 'dark' ? 'Light Mode' : 'Dark Mode' }}</span>
      </div>
      <div class="mobile-menu-item" @click="handleNotifications">
        <div class="mobile-menu-item-left">
          <span>🔔</span>
          <span class="mobile-menu-item-title">Race Notifications</span>
        </div>
        <span class="mobile-menu-badge" id="menuNotifBadge">Stage • 15m</span>
      </div>
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
      <div class="mobile-menu-item" @click="handleAdmin">
        <div class="mobile-menu-item-left">
          <span id="menuAdminIcon">⚙️</span>
          <div>
            <div class="mobile-menu-item-title">Coach Admin</div>
            <div id="menuAdminSubtext" style="font-size:11px;color:var(--text-muted);font-weight:400;margin-top:1px;">Google Sign-in Required</div>
          </div>
        </div>
        <span class="mobile-menu-badge" id="menuAdminBadge" style="background:rgba(234,179,8,0.15);border-color:rgba(234,179,8,0.3);color:var(--text-main);">Coaches</span>
      </div>
    </div>
  </div>
</template>
