import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useFirebaseAuth, useCurrentUser, useFirestore } from 'vuefire'

/**
 * useCoachAuth — Three-layer security model:
 *  Layer 1: Firebase Auth (Identity)     — Google OAuth, who are you?
 *  Layer 2: Firestore admins collection  — Are you authorized to edit?
 *  Layer 3: isAdminUnlocked (UX)         — Are you actively in edit mode?
 */
export const useCoachAuth = () => {
  const auth = useFirebaseAuth()
  const db = useFirestore()
  const user = useCurrentUser()

  // Layer 2: Is the signed-in user on the Firestore admins list?
  const isAuthorizedCoach = useState<boolean>('coach_authorized', () => false)
  // Layer 3: Has the coach unlocked admin editing (vs just signed in)?
  const isAdminUnlocked = useState<boolean>('admin_unlocked', () => false)
  // Auth error message (shown on sign-in screen)
  const authError = useState<string>('auth_error', () => '')
  // Loading state during sign-in verification
  const authLoading = useState<boolean>('auth_loading', () => false)

  // The combined computed: user must be signed in, authorized, AND unlocked
  const isCoachAuth = computed(() =>
    !!user.value && isAuthorizedCoach.value && isAdminUnlocked.value
  )

  // Watch for Firebase auth state changes — re-verify when user changes
  watch(user, async (newUser) => {
    if (!newUser) {
      // Signed out — reset all state
      isAuthorizedCoach.value = false
      isAdminUnlocked.value = false
      authError.value = ''
      return
    }
    // User is signed in — check if they're an authorized coach
    await verifyAdminEmail(newUser.email || '')
    // Restore unlocked state from localStorage if they were previously unlocked
    if (import.meta.client && isAuthorizedCoach.value) {
      const wasUnlocked = localStorage.getItem('laxmtb_admin_unlocked') === 'true'
      isAdminUnlocked.value = wasUnlocked
    }
  }, { immediate: true })

  /**
   * Verify the signed-in email exists in Firestore admins collection
   */
  const verifyAdminEmail = async (email: string): Promise<boolean> => {
    if (!email) return false
    try {
      const adminRef = doc(db, 'admins', email.toLowerCase().trim())
      const adminSnap = await getDoc(adminRef)
      isAuthorizedCoach.value = adminSnap.exists()
      return adminSnap.exists()
    } catch (e) {
      console.warn('[useCoachAuth] Could not verify admin email:', e)
      isAuthorizedCoach.value = false
      return false
    }
  }

  /**
   * Sign in with Google OAuth popup → verify email in Firestore
   */
  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    if (!auth) return { success: false, error: 'Firebase Auth not initialized' }
    authError.value = ''
    authLoading.value = true

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const email = result.user.email?.toLowerCase().trim() || ''

      const isAdmin = await verifyAdminEmail(email)
      if (!isAdmin) {
        // Sign them out — not authorized
        await firebaseSignOut(auth)
        const errMsg = `Access denied: ${email} is not on the authorized coaches list. Contact the head coach to be added.`
        authError.value = errMsg
        authLoading.value = false
        return { success: false, error: errMsg }
      }

      // Authorized — unlock admin mode and persist
      isAdminUnlocked.value = true
      if (import.meta.client) {
        localStorage.setItem('laxmtb_admin_unlocked', 'true')
      }
      authLoading.value = false
      return { success: true }
    } catch (err: any) {
      authLoading.value = false
      // User cancelled the popup — not a real error
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return { success: false }
      }
      const errMsg = err.message || 'Sign-in failed. Please try again.'
      authError.value = errMsg
      return { success: false, error: errMsg }
    }
  }

  /**
   * Sign out fully — clears Firebase session and all state
   */
  const signOut = async () => {
    if (!auth) return
    try {
      await firebaseSignOut(auth)
      isAuthorizedCoach.value = false
      isAdminUnlocked.value = false
      authError.value = ''
      if (import.meta.client) {
        localStorage.removeItem('laxmtb_admin_unlocked')
      }
    } catch (e) {
      console.warn('[useCoachAuth] Sign-out error:', e)
    }
  }

  /**
   * Lock Admin Mode — stays signed in to Firebase, just hides edit UI
   * Fast to re-enable without re-authentication
   */
  const lockAdmin = () => {
    isAdminUnlocked.value = false
    if (import.meta.client) {
      localStorage.setItem('laxmtb_admin_unlocked', 'false')
    }
  }

  /**
   * Unlock Admin Mode — re-enables edit UI without re-auth
   * Only works if user is still Firebase-authenticated and authorized
   */
  const unlockAdmin = () => {
    if (user.value && isAuthorizedCoach.value) {
      isAdminUnlocked.value = true
      if (import.meta.client) {
        localStorage.setItem('laxmtb_admin_unlocked', 'true')
      }
    }
  }

  return {
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
  }
}
