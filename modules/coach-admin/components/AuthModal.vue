<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useCoachAuth } from '../composables/useCoachAuth'

const props = defineProps<{
  isOpen: boolean
  initialMode?: 'login' | 'signup'
  initialInviteCode?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'toast', msg: string): void
}>()

const {
  user,
  authLoading,
  authError,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  sendResetEmail,
  validateInviteCode,
  fetchInviteSettings
} = useCoachAuth()

const mode = ref<'login' | 'signup' | 'forgot'>('login')

// Form Fields
const nameInput = ref('')
const phoneInput = ref('')
const emailInput = ref('')
const passwordInput = ref('')
const confirmPasswordInput = ref('')
const inviteCodeInput = ref('')
const localError = ref('')
const resetSent = ref(false)

const activeInviteCheck = computed(() => {
  return validateInviteCode(inviteCodeInput.value)
})

const loadStoredInviteToken = () => {
  if (props.initialInviteCode) {
    inviteCodeInput.value = props.initialInviteCode
    return
  }
  if (import.meta.client) {
    const stored = localStorage.getItem('laxmtb_invite_token')
    if (stored) {
      inviteCodeInput.value = stored
    }
  }
}

watch(() => props.isOpen, (open) => {
  if (open) {
    mode.value = props.initialMode || 'login'
    localError.value = ''
    resetSent.value = false
    passwordInput.value = ''
    confirmPasswordInput.value = ''
    authError.value = ''
    loadStoredInviteToken()
    fetchInviteSettings()
  }
})

watch(user, (newUser) => {
  if (newUser && props.isOpen) {
    emit('close')
  }
})

onMounted(() => {
  loadStoredInviteToken()
})

const handleClose = () => {
  emit('close')
}

const handleLogin = async () => {
  localError.value = ''
  if (!emailInput.value.trim() || !passwordInput.value) {
    localError.value = 'Please enter both email and password.'
    return
  }

  const res = await signInWithEmail(emailInput.value, passwordInput.value)
  if (res.success) {
    emit('toast', `👋 Welcome back!`)
    emit('close')
  } else if (res.error) {
    localError.value = res.error
  }
}

const handleSignUp = async () => {
  localError.value = ''
  if (!nameInput.value.trim()) {
    localError.value = 'Please enter your full name.'
    return
  }
  if (!emailInput.value.trim() || !emailInput.value.includes('@')) {
    localError.value = 'Please enter a valid email address.'
    return
  }
  if (!passwordInput.value || passwordInput.value.length < 6) {
    localError.value = 'Password must be at least 6 characters.'
    return
  }
  if (passwordInput.value !== confirmPasswordInput.value) {
    localError.value = 'Passwords do not match.'
    return
  }
  if (!activeInviteCheck.value.valid) {
    localError.value = activeInviteCheck.value.error || 'Please enter a valid team access code.'
    return
  }

  const res = await signUpWithEmail(
    emailInput.value,
    passwordInput.value,
    nameInput.value,
    phoneInput.value,
    inviteCodeInput.value
  )

  if (res.success) {
    emit('toast', `🎉 Account created! Welcome, ${nameInput.value}!`)
    emit('close')
  } else if (res.error) {
    localError.value = res.error
  }
}

const handleGoogleAuth = async () => {
  localError.value = ''
  const res = await signInWithGoogle(inviteCodeInput.value)
  if (res.success) {
    emit('toast', '👋 Signed in with Google successfully!')
    emit('close')
  } else if (res.error) {
    localError.value = res.error
  }
}

const handleResetPassword = async () => {
  localError.value = ''
  resetSent.value = false
  if (!emailInput.value.trim() || !emailInput.value.includes('@')) {
    localError.value = 'Please enter your account email address.'
    return
  }

  const res = await sendResetEmail(emailInput.value)
  if (res.success) {
    resetSent.value = true
    emit('toast', '📧 Password reset email sent! Check your inbox.')
  } else if (res.error) {
    localError.value = res.error
  }
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay show" @click.self="handleClose">
    <div class="modal-card auth-modal-card" role="dialog" aria-modal="true">
      <!-- Modal Header -->
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:18px;">{{ mode === 'signup' ? '📝' : (mode === 'forgot' ? '🔑' : '🔐') }}</span>
          <h3 style="margin:0;font-size:16px;font-weight:700;color:var(--text-main);">
            {{ mode === 'signup' ? 'Create Account' : (mode === 'forgot' ? 'Reset Password' : 'Sign In') }}
          </h3>
        </div>
        <button type="button" class="modal-close-btn" aria-label="Close modal" @click="handleClose">✕</button>
      </div>

      <!-- Mode Switcher Tabs (Login vs Sign Up) -->
      <div v-if="mode !== 'forgot'" class="auth-tabs">
        <button
          type="button"
          class="auth-tab-btn"
          :class="{ active: mode === 'login' }"
          @click="mode = 'login'; localError = ''"
        >
          Sign In
        </button>
        <button
          type="button"
          class="auth-tab-btn"
          :class="{ active: mode === 'signup' }"
          @click="mode = 'signup'; localError = ''"
        >
          Create Account
        </button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body auth-modal-body">
        <!-- Error Alert -->
        <div v-if="localError || authError" class="auth-alert error">
          <span>⚠️</span>
          <span>{{ localError || authError }}</span>
        </div>

        <!-- Success Alert for Reset -->
        <div v-if="resetSent" class="auth-alert success">
          <span>✅</span>
          <span>Password reset email sent! Please check your inbox and spam folder.</span>
        </div>

        <!-- 1. SIGN IN FORM -->
        <form v-if="mode === 'login'" @submit.prevent="handleLogin" class="auth-form">
          <div class="auth-field">
            <label class="auth-label">Email Address</label>
            <input
              v-model="emailInput"
              type="email"
              placeholder="coach@example.com"
              required
              class="auth-input"
              autocomplete="email"
            >
          </div>

          <div class="auth-field">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <label class="auth-label">Password</label>
              <button
                type="button"
                class="auth-link-btn"
                @click="mode = 'forgot'; localError = ''"
              >
                Forgot password?
              </button>
            </div>
            <input
              v-model="passwordInput"
              type="password"
              placeholder="••••••••"
              required
              class="auth-input"
              autocomplete="current-password"
            >
          </div>

          <button
            type="submit"
            class="auth-primary-btn"
            :disabled="authLoading"
          >
            <span v-if="authLoading">Signing in...</span>
            <span v-else>Sign In</span>
          </button>
        </form>

        <!-- 2. CREATE ACCOUNT FORM (INVITE ONLY) -->
        <form v-else-if="mode === 'signup'" @submit.prevent="handleSignUp" class="auth-form">
          <!-- Invite Verification Banner (If verified from link) -->
          <div v-if="activeInviteCheck.valid" class="invite-status-card valid">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:16px;">🎟️</span>
              <div>
                <div style="font-size:12px;font-weight:800;color:#4ade80;">{{ activeInviteCheck.label }} Verified</div>
                <div style="font-size:10.5px;color:var(--text-muted);">Access Token: <code>{{ inviteCodeInput }}</code></div>
              </div>
            </div>
            <button
              type="button"
              class="invite-change-link"
              @click="inviteCodeInput = ''"
              title="Change invite code"
            >
              Change
            </button>
          </div>

          <!-- Team Access Code Input (Required if not pre-verified) -->
          <div v-else class="auth-field invite-required-box">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <label class="auth-label">Team Access Code <span style="color:var(--accent-red);">*</span></label>
              <span class="invite-badge">Invite Required</span>
            </div>
            <input
              v-model="inviteCodeInput"
              type="text"
              placeholder="e.g. lax-coach-2026"
              required
              class="auth-input"
              autocomplete="off"
            >
            <small class="auth-hint">Enter the invite code from your head coach or open your team's invite link.</small>
          </div>

          <div class="auth-field">
            <label class="auth-label">Full Name <span style="color:var(--accent-red);">*</span></label>
            <input
              v-model="nameInput"
              type="text"
              placeholder="e.g. Chris Johnson"
              required
              class="auth-input"
              autocomplete="name"
            >
          </div>

          <div class="auth-field">
            <label class="auth-label">Cell Phone Number</label>
            <input
              v-model="phoneInput"
              type="tel"
              placeholder="(608) 555-0199"
              class="auth-input"
              autocomplete="tel"
            >
            <small class="auth-hint">Used for coach coordination during race days.</small>
          </div>

          <div class="auth-field">
            <label class="auth-label">Email Address <span style="color:var(--accent-red);">*</span></label>
            <input
              v-model="emailInput"
              type="email"
              placeholder="coach@example.com"
              required
              class="auth-input"
              autocomplete="email"
            >
          </div>

          <div class="auth-field">
            <label class="auth-label">Password <span style="color:var(--accent-red);">*</span></label>
            <input
              v-model="passwordInput"
              type="password"
              placeholder="At least 6 characters"
              required
              minlength="6"
              class="auth-input"
              autocomplete="new-password"
            >
          </div>

          <div class="auth-field">
            <label class="auth-label">Confirm Password <span style="color:var(--accent-red);">*</span></label>
            <input
              v-model="confirmPasswordInput"
              type="password"
              placeholder="Re-enter password"
              required
              class="auth-input"
              autocomplete="new-password"
            >
          </div>

          <button
            type="submit"
            class="auth-primary-btn"
            :disabled="authLoading"
          >
            <span v-if="authLoading">Creating account...</span>
            <span v-else>Create Account</span>
          </button>
        </form>

        <!-- 3. FORGOT PASSWORD FORM -->
        <form v-else-if="mode === 'forgot'" @submit.prevent="handleResetPassword" class="auth-form">
          <p class="auth-description">
            Enter your account email address and we'll send you a link to reset your password.
          </p>

          <div class="auth-field">
            <label class="auth-label">Email Address</label>
            <input
              v-model="emailInput"
              type="email"
              placeholder="coach@example.com"
              required
              class="auth-input"
              autocomplete="email"
            >
          </div>

          <button
            type="submit"
            class="auth-primary-btn"
            :disabled="authLoading"
          >
            <span v-if="authLoading">Sending reset link...</span>
            <span v-else>Send Reset Link</span>
          </button>

          <button
            type="button"
            class="auth-secondary-btn"
            style="margin-top:8px;"
            @click="mode = 'login'; localError = ''"
          >
            ← Back to Sign In
          </button>
        </form>

        <!-- Google OAuth Provider Option -->
        <template v-if="mode !== 'forgot'">
          <div class="auth-divider">
            <span>OR</span>
          </div>

          <button
            type="button"
            class="auth-google-btn"
            :disabled="authLoading"
            @click="handleGoogleAuth"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>
        </template>
      </div>

      <!-- Footer Note -->
      <div class="modal-footer" style="justify-content:center;font-size:11px;color:var(--text-muted);border-top:1px solid var(--border);">
        <span>Registration is invite-only for LAX MTB coaches and parents</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-modal-card {
  max-width: 420px;
  width: 95%;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}

.auth-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid var(--border);
}

.auth-tab-btn {
  flex: 1;
  padding: 10px 14px;
  background: transparent;
  border: none;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
  border-bottom: 2px solid transparent;
}

.auth-tab-btn:hover {
  color: var(--text-main);
}

.auth-tab-btn.active {
  color: var(--accent-red);
  border-bottom-color: var(--accent-red);
  background: rgba(239, 68, 68, 0.05);
}

.auth-modal-body {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.invite-status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.35);
}

.invite-change-link {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 10.5px;
  text-decoration: underline;
  cursor: pointer;
}

.invite-change-link:hover {
  color: var(--text-main);
}

.invite-required-box {
  background: rgba(245, 158, 11, 0.06);
  border: 1px dashed rgba(245, 158, 11, 0.35);
  padding: 10px 12px;
  border-radius: 8px;
}

.invite-badge {
  font-size: 9.5px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.auth-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.auth-input {
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

.auth-input:focus {
  border-color: var(--accent-red);
}

.auth-hint {
  font-size: 10.5px;
  color: var(--text-muted);
}

.auth-link-btn {
  background: transparent;
  border: none;
  color: #60a5fa;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.auth-link-btn:hover {
  text-decoration: underline;
}

.auth-primary-btn {
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
  display: flex;
  justify-content: center;
  align-items: center;
}

.auth-primary-btn:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.auth-primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-secondary-btn {
  padding: 8px 12px;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.auth-secondary-btn:hover {
  background: var(--bg-subtle);
  color: var(--text-main);
}

.auth-divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 4px 0;
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 700;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--border);
}

.auth-divider span {
  padding: 0 10px;
}

.auth-google-btn {
  width: 100%;
  padding: 9px 14px;
  background: #ffffff;
  color: #1f2937;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: background 0.15s ease;
}

.auth-google-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.auth-google-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-alert {
  padding: 9px 12px;
  border-radius: 6px;
  font-size: 12px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.4;
}

.auth-alert.error {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #f87171;
}

.auth-alert.success {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: #4ade80;
}

.auth-description {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-muted);
  line-height: 1.5;
}
</style>
