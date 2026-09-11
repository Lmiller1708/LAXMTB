<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useCoachAuth } from '../composables/useCoachAuth'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'toast', msg: string): void
}>()

const {
  user,
  userProfile,
  userPhoto,
  profileLoading,
  isAdminCoach,
  isAuthorizedCoach,
  updateUserProfile,
  deleteUserAccount,
  signOut
} = useCoachAuth()

const nameInput = ref('')
const phoneInput = ref('')
const photoInput = ref('')
const isSaving = ref(false)
const saveSuccess = ref(false)
const errorMessage = ref('')

// Image upload state
const fileInputRef = ref<HTMLInputElement | null>(null)
const isUploadingPhoto = ref(false)

// Is current user logged in via Google OAuth?
const isGoogleAccount = computed(() => {
  if (!user.value) return false
  const providers = user.value.providerData || []
  return providers.some(p => p.providerId === 'google.com') || (user.value as any).providerId === 'google.com'
})

// Danger zone confirmation state
const isConfirmingDelete = ref(false)
const isDeleting = ref(false)

// Sync input fields when modal opens or userProfile changes
watch([() => props.isOpen, userProfile, user], ([open]) => {
  if (open) {
    nameInput.value = userProfile.value?.name || user.value?.displayName || ''
    phoneInput.value = userProfile.value?.phone || ''
    photoInput.value = userProfile.value?.photoURL || user.value?.photoURL || ''
    isSaving.value = false
    saveSuccess.value = false
    errorMessage.value = ''
    isConfirmingDelete.value = false
    isDeleting.value = false
    isUploadingPhoto.value = false
  }
}, { immediate: true })

const displayAvatar = computed(() => {
  return photoInput.value?.trim() || userPhoto.value || ''
})

const avatarLoadError = ref(false)
watch(displayAvatar, () => {
  avatarLoadError.value = false
})

const initials = computed(() => {
  const n = nameInput.value || user.value?.displayName || user.value?.email || 'U'
  const parts = n.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return n.slice(0, 2).toUpperCase()
})

const roleBadgeLabel = computed(() => {
  if (isAdminCoach.value) return '🛡️ Team Admin'
  if (userProfile.value?.role === 'coach' || isAuthorizedCoach.value) return '🚵 Team Coach'
  if (userProfile.value?.role === 'guardian') return '👪 Guardian / Parent'
  return '🚴 Team Member'
})

const roleBadgeStyle = computed(() => {
  if (isAdminCoach.value) return 'background:rgba(239,68,68,0.15);border-color:rgba(239,68,68,0.35);color:#f87171;'
  if (userProfile.value?.role === 'coach' || isAuthorizedCoach.value) return 'background:rgba(59,130,246,0.15);border-color:rgba(59,130,246,0.35);color:#60a5fa;'
  if (userProfile.value?.role === 'guardian') return 'background:rgba(168,85,247,0.15);border-color:rgba(168,85,247,0.35);color:#c084fc;'
  return 'background:rgba(34,197,94,0.15);border-color:rgba(34,197,94,0.35);color:#4ade80;'
})

const handleClose = () => {
  emit('close')
}

// Trigger native file picker
const triggerPhotoUpload = () => {
  if (isGoogleAccount.value || isUploadingPhoto.value) return
  fileInputRef.value?.click()
}

// Center-crop and resize uploaded image into an avatar JPEG data URL
const resizeImageFile = (file: File, maxSize = 200): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = Math.min(img.width, img.height)
        const startX = (img.width - size) / 2
        const startY = (img.height - size) / 2

        const targetSize = Math.min(size, maxSize)
        canvas.width = targetSize
        canvas.height = targetSize

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(e.target?.result as string)
          return
        }

        ctx.drawImage(img, startX, startY, size, size, 0, 0, targetSize, targetSize)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = () => reject(new Error('Failed to load image file.'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read image file.'))
    reader.readAsDataURL(file)
  })
}

// Handle file input change
const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    errorMessage.value = 'Please select a valid image file (.jpg, .png, .webp).'
    return
  }

  isUploadingPhoto.value = true
  errorMessage.value = ''

  try {
    const dataUrl = await resizeImageFile(file, 200)
    photoInput.value = dataUrl

    const res = await updateUserProfile({
      name: nameInput.value,
      phone: phoneInput.value,
      photoURL: dataUrl
    })

    if (res.success) {
      saveSuccess.value = true
      emit('toast', '📸 Profile photo updated!')
      setTimeout(() => {
        saveSuccess.value = false
      }, 3000)
    } else if (res.error) {
      errorMessage.value = res.error
    }
  } catch (err: any) {
    console.error('[UserProfileModal] Image upload error:', err)
    errorMessage.value = err.message || 'Failed to process image.'
  } finally {
    isUploadingPhoto.value = false
    if (target) target.value = ''
  }
}

// Remove uploaded photo and revert to initials
const handleRemovePhoto = async () => {
  photoInput.value = ''
  isSaving.value = true
  const res = await updateUserProfile({
    name: nameInput.value,
    phone: phoneInput.value,
    photoURL: ''
  })
  isSaving.value = false

  if (res.success) {
    emit('toast', '🗑️ Profile photo removed')
  } else if (res.error) {
    errorMessage.value = res.error
  }
}

const handleSaveProfile = async () => {
  errorMessage.value = ''
  saveSuccess.value = false

  if (!nameInput.value.trim()) {
    errorMessage.value = 'Please enter your name.'
    return
  }

  isSaving.value = true
  const res = await updateUserProfile({
    name: nameInput.value,
    phone: phoneInput.value,
    photoURL: photoInput.value
  })
  isSaving.value = false

  if (res.success) {
    saveSuccess.value = true
    emit('toast', '✅ Profile details updated successfully!')
    setTimeout(() => {
      saveSuccess.value = false
    }, 3000)
  } else if (res.error) {
    errorMessage.value = res.error
  }
}

const handleSignOut = async () => {
  await signOut()
  emit('toast', '👋 Signed out')
  emit('close')
}

const handleDeleteAccount = async () => {
  errorMessage.value = ''
  isDeleting.value = true

  const res = await deleteUserAccount()
  isDeleting.value = false

  if (res.success) {
    emit('toast', '🗑️ Your account has been permanently deleted.')
    emit('close')
  } else if (res.error) {
    errorMessage.value = res.error
    isConfirmingDelete.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay show" @click.self="handleClose">
    <div class="modal-card profile-modal-card" role="dialog" aria-modal="true">
      <!-- Modal Header -->
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:18px;">👤</span>
          <h3 style="margin:0;font-size:16px;font-weight:700;color:var(--text-main);">My Account</h3>
        </div>
        <button type="button" class="modal-close-btn" aria-label="Close modal" @click="handleClose">✕</button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body profile-modal-body">
        <!-- User Profile Banner Card -->
        <div class="profile-header-card">
          <!-- Avatar with hover edit for non-Google users -->
          <div
            class="profile-avatar-wrapper"
            :class="{ 'can-edit': !isGoogleAccount }"
            :title="!isGoogleAccount ? (displayAvatar ? 'Click to change profile picture' : 'Click to upload profile picture') : 'Google Account Photo'"
            @click="triggerPhotoUpload"
          >
            <img
              v-if="displayAvatar && !avatarLoadError"
              :src="displayAvatar"
              alt="User avatar"
              class="profile-avatar img"
              referrerpolicy="no-referrer"
              @error="avatarLoadError = true"
            />
            <div v-else class="profile-avatar">{{ initials }}</div>

            <!-- Hover overlay for non-Google accounts -->
            <div v-if="!isGoogleAccount" class="avatar-hover-overlay">
              <span v-if="isUploadingPhoto" class="hover-icon">⏳</span>
              <template v-else>
                <span class="hover-icon">📷</span>
                <span class="hover-label">{{ displayAvatar ? 'Edit' : 'Upload' }}</span>
              </template>
            </div>

            <!-- Camera badge indicator for non-Google accounts -->
            <div v-if="!isGoogleAccount && !isUploadingPhoto" class="avatar-edit-badge">
              <span>📷</span>
            </div>

            <!-- Hidden file input -->
            <input
              v-if="!isGoogleAccount"
              ref="fileInputRef"
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              style="display: none;"
              @change="handleFileChange"
            />
          </div>

          <div class="profile-meta">
            <div class="profile-name">{{ nameInput || 'Team Member' }}</div>
            <div class="profile-email">{{ user?.email }}</div>
            <div style="margin-top:4px;display:flex;align-items:center;gap:8px;">
              <span class="role-badge" :style="roleBadgeStyle">{{ roleBadgeLabel }}</span>
              <button
                v-if="!isGoogleAccount && displayAvatar"
                type="button"
                class="remove-photo-btn"
                title="Remove uploaded photo"
                @click.stop="handleRemovePhoto"
              >
                ✕ Remove
              </button>
            </div>
          </div>
        </div>

        <!-- Feedback Alert -->
        <div v-if="errorMessage" class="profile-alert error">
          <span>⚠️</span>
          <span>{{ errorMessage }}</span>
        </div>
        <div v-if="saveSuccess" class="profile-alert success">
          <span>✅</span>
          <span>Changes saved successfully!</span>
        </div>

        <!-- Profile Edit Form -->
        <form @submit.prevent="handleSaveProfile" class="profile-form">
          <!-- Full Name Field -->
          <div class="profile-field">
            <label class="profile-label">Full Name</label>
            <input
              v-model="nameInput"
              type="text"
              placeholder="Your full name"
              required
              class="profile-input"
            >
          </div>

          <!-- Cell Phone Number Field -->
          <div class="profile-field">
            <label class="profile-label">Cell Phone Number</label>
            <input
              v-model="phoneInput"
              type="tel"
              placeholder="(608) 555-0123"
              class="profile-input"
            >
            <small class="profile-hint">Used for day-of-race coach updates and team communication.</small>
          </div>

          <!-- Email Address (Locked / Read-Only) -->
          <div class="profile-field">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <label class="profile-label">Email Address</label>
              <span class="locked-note">🔒 Cannot be changed</span>
            </div>
            <input
              :value="user?.email"
              type="email"
              disabled
              class="profile-input disabled"
              title="Email address is permanent and cannot be modified"
            >
          </div>

          <!-- Save Button -->
          <button
            type="submit"
            class="profile-save-btn"
            :disabled="isSaving"
          >
            <span v-if="isSaving">Saving...</span>
            <span v-else>Save Changes</span>
          </button>
        </form>

        <!-- Account Actions Divider -->
        <div class="profile-divider" />

        <!-- Quick Actions Row -->
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;color:var(--text-muted);font-weight:600;">Active Session</span>
          <button
            type="button"
            class="profile-signout-btn"
            @click="handleSignOut"
          >
            <span>🚪 Sign Out</span>
          </button>
        </div>

        <!-- Danger Zone: Account Deletion -->
        <div class="danger-zone">
          <div class="danger-zone-header">
            <div>
              <div class="danger-zone-title">Delete Account</div>
              <div class="danger-zone-desc">Permanently remove your account and all associated profile details.</div>
            </div>
          </div>

          <!-- Default State: Delete Button -->
          <div v-if="!isConfirmingDelete" style="margin-top:10px;">
            <button
              type="button"
              class="delete-account-btn"
              @click="isConfirmingDelete = true"
            >
              🗑️ Delete Account...
            </button>
          </div>

          <!-- Confirmation State -->
          <div v-else class="delete-confirmation-box">
            <div class="confirm-warning">
              ⚠️ Are you sure you want to permanently delete your account? This action cannot be undone.
            </div>
            <div class="confirm-actions">
              <button
                type="button"
                class="confirm-delete-btn"
                :disabled="isDeleting"
                @click="handleDeleteAccount"
              >
                <span v-if="isDeleting">Deleting...</span>
                <span v-else>Yes, Delete My Account</span>
              </button>
              <button
                type="button"
                class="cancel-delete-btn"
                :disabled="isDeleting"
                @click="isConfirmingDelete = false"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer" style="justify-content:flex-end;">
        <button type="button" class="done-modal-btn" @click="handleClose">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-modal-card {
  max-width: 440px;
  width: 95%;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}

.profile-modal-body {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-header-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.profile-avatar-wrapper {
  position: relative;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 50%;
}

.profile-avatar-wrapper.can-edit {
  cursor: pointer;
}

.profile-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--accent-red);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 1px;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.35);
  flex-shrink: 0;
  overflow: hidden;
}

.profile-avatar.img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.avatar-hover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(2px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  z-index: 2;
}

.profile-avatar-wrapper.can-edit:hover .avatar-hover-overlay {
  opacity: 1;
  pointer-events: auto;
}

.hover-icon {
  font-size: 13px;
  line-height: 1;
}

.hover-label {
  font-size: 8.5px;
  font-weight: 800;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 1px;
}

.avatar-edit-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #1e1e1e;
  border: 1.5px solid #404040;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
  pointer-events: none;
  z-index: 3;
  transition: transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
}

.profile-avatar-wrapper.can-edit:hover .avatar-edit-badge {
  transform: scale(1.15);
  background: var(--accent-red);
  border-color: #ffffff;
}

.remove-photo-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 10.5px;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  transition: color 0.15s ease;
}

.remove-photo-btn:hover {
  color: #f87171;
}

.profile-meta {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.profile-name {
  font-size: 15px;
  font-weight: 800;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-email {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.profile-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.locked-note {
  font-size: 10px;
  color: var(--text-muted);
  font-style: italic;
}

.profile-input {
  width: 100%;
  padding: 9px 12px;
  background: var(--bg-subtle, rgba(0, 0, 0, 0.3));
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-main);
  font-size: 13.5px;
  outline: none;
  transition: border-color 0.15s ease;
  box-sizing: border-box;
}

.profile-input:focus {
  border-color: var(--accent-red);
}

.profile-input.disabled {
  opacity: 0.6;
  background: rgba(255, 255, 255, 0.02);
  cursor: not-allowed;
  border-style: dashed;
}

.profile-hint {
  font-size: 10.5px;
  color: var(--text-muted);
}

.profile-save-btn {
  margin-top: 4px;
  padding: 10px 16px;
  background: var(--accent-red);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.15s ease;
}

.profile-save-btn:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.profile-save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.profile-divider {
  height: 1px;
  background: var(--border);
  margin: 2px 0;
}

.profile-signout-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-main);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.profile-signout-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.35);
  color: #f87171;
}

.danger-zone {
  margin-top: 6px;
  padding: 12px 14px;
  background: rgba(239, 68, 68, 0.04);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 8px;
}

.danger-zone-title {
  font-size: 12.5px;
  font-weight: 800;
  color: #f87171;
}

.danger-zone-desc {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
  line-height: 1.35;
}

.delete-account-btn {
  padding: 7px 12px;
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #f87171;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.delete-account-btn:hover {
  background: rgba(239, 68, 68, 0.15);
}

.delete-confirmation-box {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.confirm-warning {
  font-size: 11px;
  color: #fca5a5;
  line-height: 1.4;
}

.confirm-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.confirm-delete-btn {
  padding: 7px 12px;
  background: #dc2626;
  border: none;
  border-radius: 6px;
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.15s ease;
}

.confirm-delete-btn:hover:not(:disabled) {
  background: #b91c1c;
}

.confirm-delete-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-delete-btn {
  padding: 7px 12px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}

.cancel-delete-btn:hover {
  color: var(--text-main);
  background: var(--bg-subtle);
}

.profile-alert {
  padding: 9px 12px;
  border-radius: 6px;
  font-size: 12px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.4;
}

.profile-alert.error {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #f87171;
}

.profile-alert.success {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: #4ade80;
}
</style>
