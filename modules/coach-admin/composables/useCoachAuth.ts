import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs
} from 'firebase/firestore'
import { useFirebaseAuth, useCurrentUser, useFirestore } from 'vuefire'

export interface CoachAdminItem {
  email: string
  name?: string
  addedAt?: string
  addedBy?: string
}

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

  // List of all coach admins loaded from Firestore (for managing admins)
  const adminsList = useState<CoachAdminItem[]>('coach_admins_list', () => [])
  const adminsLoading = useState<boolean>('coach_admins_loading', () => false)

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
      adminsList.value = []
      return
    }
    // User is signed in — check if they're an authorized coach
    await verifyAdminEmail(newUser.email || '')
    // Restore unlocked state from localStorage if they were previously unlocked
    if (import.meta.client && isAuthorizedCoach.value) {
      const wasUnlocked = localStorage.getItem('laxmtb_admin_unlocked') === 'true'
      isAdminUnlocked.value = wasUnlocked
    }
    if (isAuthorizedCoach.value) {
      await fetchAdmins()
    }
  }, { immediate: true })

  // Primary bootstrap administrator(s)
  const DEFAULT_ADMINS = ['lmiller1708@gmail.com']

  /**
   * Verify the signed-in email exists in Firestore admins collection or bootstrap list
   */
  const verifyAdminEmail = async (email: string): Promise<boolean> => {
    if (!email) return false
    const clean = email.toLowerCase().trim()

    // 1. Primary bootstrap admin check (Head Coach / Founder)
    if (DEFAULT_ADMINS.includes(clean)) {
      isAuthorizedCoach.value = true
      // Auto-seed to Firestore if it doesn't exist yet
      if (db) {
        try {
          const adminRef = doc(db, 'admins', clean)
          getDoc(adminRef).then(snap => {
            if (!snap.exists()) {
              setDoc(adminRef, {
                email: clean,
                name: user.value?.displayName || 'Head Coach',
                role: 'owner',
                addedAt: new Date().toISOString()
              }).catch(() => {})
            }
          }).catch(() => {})
        } catch (e) {}
      }
      return true
    }

    // 2. Check Firestore admins collection for invited coaches
    try {
      const adminRef = doc(db, 'admins', clean)
      const adminSnap = await getDoc(adminRef)
      isAuthorizedCoach.value = adminSnap.exists()
      return adminSnap.exists()
    } catch (e) {
      console.warn('[useCoachAuth] Could not verify admin email from Firestore:', e)
      isAuthorizedCoach.value = false
      return false
    }
  }

  /**
   * Fetch all registered coach admins from Firestore
   */
  const fetchAdmins = async () => {
    if (!db) return
    adminsLoading.value = true
    try {
      const snap = await getDocs(collection(db, 'admins'))
      const list: CoachAdminItem[] = []
      snap.forEach((d) => {
        const data = d.data()
        list.push({
          email: d.id,
          name: data.name || d.id.split('@')[0],
          addedAt: data.addedAt,
          addedBy: data.addedBy
        })
      })
      adminsList.value = list
    } catch (e) {
      console.warn('[useCoachAuth] Could not fetch admins list:', e)
    } finally {
      adminsLoading.value = false
    }
  }

  /**
   * Add a new coach admin to Firestore
   */
  const addCoachAdmin = async (email: string, name?: string): Promise<{ success: boolean; error?: string }> => {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address' }
    }
    const cleanEmail = email.toLowerCase().trim()
    try {
      await setDoc(doc(db, 'admins', cleanEmail), {
        email: cleanEmail,
        name: name?.trim() || cleanEmail.split('@')[0],
        addedAt: new Date().toISOString(),
        addedBy: user.value?.email || 'admin'
      })
      await fetchAdmins()
      return { success: true }
    } catch (e: any) {
      console.error('[useCoachAuth] Error adding coach admin:', e)
      return { success: false, error: e.message || 'Failed to add coach admin' }
    }
  }

  /**
   * Remove a coach admin from Firestore
   */
  const removeCoachAdmin = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.toLowerCase().trim()
    if (cleanEmail === user.value?.email?.toLowerCase().trim()) {
      return { success: false, error: 'You cannot remove your own admin access' }
    }
    try {
      await deleteDoc(doc(db, 'admins', cleanEmail))
      await fetchAdmins()
      return { success: true }
    } catch (e: any) {
      console.error('[useCoachAuth] Error removing coach admin:', e)
      return { success: false, error: e.message || 'Failed to remove coach admin' }
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
      await fetchAdmins()
      authLoading.value = false
      return { success: true }
    } catch (err: any) {
      authLoading.value = false
      // User cancelled popup
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
      adminsList.value = []
      if (import.meta.client) {
        localStorage.removeItem('laxmtb_admin_unlocked')
      }
    } catch (e) {
      console.warn('[useCoachAuth] Sign-out error:', e)
    }
  }

  /**
   * Lock Admin Mode — stays signed in to Firebase, hides edit UI
   */
  const lockAdmin = () => {
    isAdminUnlocked.value = false
    if (import.meta.client) {
      localStorage.setItem('laxmtb_admin_unlocked', 'false')
    }
  }

  /**
   * Unlock Admin Mode — re-enables edit UI without re-auth
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
    adminsList,
    adminsLoading,
    fetchAdmins,
    addCoachAdmin,
    removeCoachAdmin,
    signInWithGoogle,
    signOut,
    lockAdmin,
    unlockAdmin
  }
}
