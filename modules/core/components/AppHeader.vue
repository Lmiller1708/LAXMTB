<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useNetworkStatus } from '../composables/useNetworkStatus'
import { useTheme } from '../composables/useTheme'
import { useCoachAuth } from '~/modules/coach-admin/composables/useCoachAuth'
import { useNotificationSubscriptions } from '~/modules/notifications/composables/useNotificationSubscriptions'
import { usePwaUpdate } from '../composables/usePwaUpdate'

const { isOnline } = useNetworkStatus()
const { theme, toggleTheme } = useTheme()
const { user, userProfile, userPhoto, isCoachAuth, isAdminCoach, isAuthorizedCoach, signOut } = useCoachAuth()
const { menuBadgeText } = useNotificationSubscriptions()
const { hasUpdate, isChecking, lastChecked, checkForUpdate, applyUpdate } = usePwaUpdate()
const config = useRuntimeConfig()

const isMenuOpen = ref(false)

const emit = defineEmits<{
  (e: 'openWhatsNew'): void
  (e: 'openNotifications'): void
  (e: 'openAdmin'): void
  (e: 'openAuth'): void
  (e: 'openProfile'): void
  (e: 'syncData'): void
  (e: 'toast', msg: string): void
}>()

const toggleMenu = () => { isMenuOpen.value = !isMenuOpen.value }
const closeMenu = () => { isMenuOpen.value = false }

const handleWhatsNew = () => { closeMenu(); emit('openWhatsNew') }
const handleNotifications = () => { closeMenu(); emit('openNotifications') }
const handleAdmin = () => { closeMenu(); emit('openAdmin') }
const handleSync = () => { closeMenu(); emit('syncData') }

const handleCheckUpdate = async () => {
  if (hasUpdate.value) {
    closeMenu()
    await applyUpdate()
    return
  }
  emit('toast', '⚡ Checking for app updates...')
  const found = await checkForUpdate(true)
  if (found) {
    emit('toast', '🚀 New version downloaded! Tap Update Now to refresh.')
  } else {
    emit('toast', '✅ You are on the latest version of LAX MTB.')
  }
}

const handleAuth = () => {
  closeMenu()
  emit('openAuth')
}

const handleProfile = () => {
  closeMenu()
  emit('openProfile')
}

const handleSignOut = async () => {
  closeMenu()
  await signOut()
  emit('toast', '👋 Signed out')
}

// User display name & initials
const userDisplayName = computed(() => {
  return userProfile.value?.name || user.value?.displayName || user.value?.email?.split('@')[0] || 'My Account'
})

const userInitials = computed(() => {
  const n = userDisplayName.value
  const parts = n.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return n.slice(0, 2).toUpperCase()
})

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
  return 'Tap to manage team & race'
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
          <span class="live-status-badge" :class="{ offline: !isOnline }" :title="isOnline ? 'Network: Online' : 'Network: Offline'">
            <span class="pulse-dot" :class="{ offline: !isOnline }" />
            <span class="live-status-text">{{ isOnline ? 'Online' : 'Offline' }}</span>
          </span>

          <button class="theme-toggle-btn" aria-label="Toggle Theme" @click="toggleTheme">
            <span>{{ theme === 'dark' ? '☀️' : '🌙' }}</span>
            <span>{{ theme === 'dark' ? 'Light' : 'Dark' }}</span>
          </button>

          <!-- Quick User Avatar / Sign-In Button -->
          <button
            v-if="user"
            class="header-user-btn"
            title="Manage My Account"
            @click="emit('openProfile')"
          >
            <img
              v-if="userPhoto"
              :src="userPhoto"
              alt="Profile"
              class="header-user-avatar img"
              referrerpolicy="no-referrer"
            />
            <span v-else class="header-user-avatar">{{ userInitials }}</span>
          </button>
          <button
            v-else
            class="header-signin-btn"
            @click="emit('openAuth')"
          >
            <span>Sign In</span>
          </button>

          <button
            class="mobile-menu-btn"
            aria-label="Toggle Navigation Menu"
            :aria-expanded="isMenuOpen"
            @click.stop="toggleMenu"
          >
            <span v-if="hasUpdate" class="update-badge-dot" />
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

      <!-- Race Notifications -->
      <div class="mobile-menu-item" @click="handleNotifications">
        <div class="mobile-menu-item-left">
          <span>🔔</span>
          <span class="mobile-menu-item-title">Race Notifications</span>
        </div>
        <span class="mobile-menu-badge">{{ menuBadgeText }}</span>
      </div>

      <!-- Sync Data -->
      <div class="mobile-menu-item" @click="handleSync">
        <div class="mobile-menu-item-left">
          <span>🔄</span>
          <div>
            <div class="mobile-menu-item-title">Sync Data</div>
            <div style="font-size:11px;color:var(--text-muted);font-weight:400;margin-top:1px;">Sync with Firestore & live timing</div>
          </div>
        </div>
        <span class="mobile-menu-badge" style="background:rgba(59,130,246,0.15);border-color:rgba(59,130,246,0.3);color:var(--text-main);">Sync</span>
      </div>

      <!-- Check for Updates -->
      <div class="mobile-menu-item" @click="handleCheckUpdate">
        <div class="mobile-menu-item-left">
          <span>⚡</span>
          <div>
            <div class="mobile-menu-item-title">Check for Updates</div>
            <div style="font-size:11px;color:var(--text-muted);font-weight:400;margin-top:1px;">
              {{ hasUpdate ? 'New version ready to load!' : (lastChecked ? `Checked ${lastChecked}` : 'Get latest app features') }}
            </div>
          </div>
        </div>
        <span
          class="mobile-menu-badge"
          :style="hasUpdate ? 'background:rgba(220,38,38,0.2);border-color:rgba(220,38,38,0.5);color:#ef4444;font-weight:700;' : 'background:rgba(255,255,255,0.06);border-color:var(--border);color:var(--text-main);'"
        >
          {{ isChecking ? 'Checking...' : (hasUpdate ? 'Update Now' : 'Check') }}
        </span>
      </div>

      <!-- Divider -->
      <div style="height:1px;background:var(--border);margin:4px 14px;" />

      <!-- USER AUTHENTICATION SECTION -->
      <!-- Case 1: NOT SIGNED IN -> Sign In / Create Account -->
      <div v-if="!user" class="mobile-menu-item" @click="handleAuth">
        <div class="mobile-menu-item-left">
          <span>🔑</span>
          <div>
            <div class="mobile-menu-item-title">Sign In</div>
            <div style="font-size:11px;color:var(--text-muted);font-weight:400;margin-top:1px;">Sign in to coach account</div>
          </div>
        </div>
        <span class="mobile-menu-badge" style="background:rgba(34,197,94,0.15);border-color:rgba(34,197,94,0.3);color:#22c55e;">
          Sign In →
        </span>
      </div>

      <!-- Case 2: SIGNED IN -->
      <template v-else>
        <!-- My Account / Profile -->
        <div class="mobile-menu-item" @click="handleProfile">
          <div class="mobile-menu-item-left">
            <img
              v-if="userPhoto"
              :src="userPhoto"
              alt="Profile"
              class="header-user-avatar mini img"
              referrerpolicy="no-referrer"
            />
            <div v-else class="header-user-avatar mini">{{ userInitials }}</div>
            <div>
              <div class="mobile-menu-item-title">{{ userDisplayName }}</div>
              <div style="font-size:11px;color:var(--text-muted);font-weight:400;margin-top:1px;">Edit details & cell number</div>
            </div>
          </div>
          <span class="mobile-menu-badge" style="background:rgba(59,130,246,0.15);border-color:rgba(59,130,246,0.3);color:#60a5fa;">Profile</span>
        </div>

        <!-- Coach Admin (ONLY visible for users designated as Admin in Admin page) -->
        <div v-if="isAdminCoach" class="mobile-menu-item" @click="handleAdmin">
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

      <!-- App Version Footer -->
      <div style="padding:10px 14px 8px;font-size:10px;color:var(--text-muted);text-align:center;border-top:1px solid var(--border);margin-top:4px;">
        LAX MTB Race Central v{{ config.public?.appVersion || '1.2.5' }}
      </div>

    </div>
  </div>
</template>

<style scoped>
.header-user-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0 2px;
}

.header-user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-red);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}

.header-user-avatar.img {
  object-fit: cover;
  border: 1.5px solid rgba(255, 255, 255, 0.25);
}

.header-user-avatar.mini {
  width: 24px;
  height: 24px;
  font-size: 9.5px;
}

.header-signin-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #f87171;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.header-signin-btn:hover {
  background: var(--accent-red);
  color: #ffffff;
}

@media (max-width: 640px) {
  :deep(.live-status-text),
  .live-status-text {
    display: none !important;
  }
  :deep(.live-status-badge),
  .live-status-badge {
    padding: 0 !important;
    width: 24px !important;
    min-width: 24px !important;
    height: 24px !important;
    min-height: 24px !important;
    border-radius: 50% !important;
    justify-content: center !important;
    gap: 0 !important;
  }
  :deep(.pulse-dot),
  .pulse-dot {
    margin: 0 !important;
  }
  :deep(.header-controls),
  .header-controls {
    gap: 6px !important;
  }
}

.mobile-menu-btn {
  position: relative;
}

.update-badge-dot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ef4444;
  border: 1.5px solid #0d0d0d;
  box-shadow: 0 0 6px #ef4444;
  animation: pulse-dot-anim 1.5s infinite;
}

@keyframes pulse-dot-anim {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.8; }
}
</style>
