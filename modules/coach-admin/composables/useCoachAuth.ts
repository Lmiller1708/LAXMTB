import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser,
  sendPasswordResetEmail,
  signOut as firebaseSignOut
} from 'firebase/auth'
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
  role?: 'admin' | 'coach' | 'owner'
  addedAt?: string
  addedBy?: string
}

export type CoachItem = CoachAdminItem

export interface UserProfile {
  uid: string
  email: string
  name: string
  phone: string
  createdAt?: string
  updatedAt?: string
}

/**
 * useCoachAuth — Multi-tier security and user management model:
 *  - Identity: Firebase Auth (Email/Password or Google OAuth)
 *  - User Profile: Firestore `users/{uid}` (name, cell phone number, locked email)
 *  - Coach & Admin Authorization: Firestore `admins/{email}`
 *  - Permissions:
 *      * Authenticated users can edit Coach Sign-Ups and manage their profile
 *      * Only registered Admins / Owners can open the Admin Modal & manage race configs
 */
export const useCoachAuth = () => {
  const auth = useFirebaseAuth()
  const db = useFirestore()
  const user = useCurrentUser()

  // Authenticated user profile loaded from Firestore `users/{uid}`
  const userProfile = useState<UserProfile | null>('user_profile', () => null)
  const profileLoading = useState<boolean>('user_profile_loading', () => false)

  // Is the signed-in user registered as coach/admin in Firestore?
  const isAuthorizedCoach = useState<boolean>('coach_authorized', () => false)
  // Signed-in coach role: 'owner' | 'admin' | 'coach' | null
  const coachRole = useState<'admin' | 'coach' | 'owner' | null>('coach_role', () => null)
  // Has the admin unlocked editing mode?
  const isAdminUnlocked = useState<boolean>('admin_unlocked', () => false)
  // Auth error message (shown on sign-in / sign-up screen)
  const authError = useState<string>('auth_error', () => '')
  // Loading state during auth operations
  const authLoading = useState<boolean>('auth_loading', () => false)

  // List of all coaches and admins loaded from Firestore
  const adminsList = useState<CoachAdminItem[]>('coach_admins_list', () => [])
  const adminsLoading = useState<boolean>('coach_admins_loading', () => false)

  // Primary bootstrap administrator(s)
  const DEFAULT_ADMINS = ['lmiller1708@gmail.com']

  // Is the current user an admin (owner or admin role)
  const isAdminCoach = computed<boolean>(() => {
    if (!user.value) return false
    const email = user.value.email?.toLowerCase().trim() || ''
    if (DEFAULT_ADMINS.includes(email)) return true
    return coachRole.value === 'admin' || coachRole.value === 'owner'
  })

  // Authenticated users can edit coach sign-ups
  const canEditCoachSignups = computed<boolean>(() => {
    return !!user.value
  })

  // Full admin editing active
  const isCoachAuth = computed(() =>
    !!user.value && isAuthorizedCoach.value && isAdminCoach.value && isAdminUnlocked.value
  )

  /**
   * Load or initialize the user's Firestore profile doc in `users/{uid}`
   */
  const syncUserProfile = async (firebaseUser: any) => {
    if (!db || !firebaseUser?.uid) {
      userProfile.value = null
      return
    }
    profileLoading.value = true
    try {
      const userRef = doc(db, 'users', firebaseUser.uid)
      const userSnap = await getDoc(userRef)
      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile
        userProfile.value = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: data.name || firebaseUser.displayName || '',
          phone: data.phone || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        }
      } else {
        const initialProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'MTB Member',
          phone: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await setDoc(userRef, initialProfile)
        userProfile.value = initialProfile
      }
    } catch (err) {
      console.warn('[useCoachAuth] Error syncing user profile from Firestore:', err)
      userProfile.value = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'MTB Member',
        phone: ''
      }
    } finally {
      profileLoading.value = false
    }
  }

  // Watch for Firebase auth state changes — re-verify when user changes
  watch(user, async (newUser) => {
    if (!newUser) {
      // Signed out — reset all state
      userProfile.value = null
      isAuthorizedCoach.value = false
      coachRole.value = null
      isAdminUnlocked.value = false
      authError.value = ''
      adminsList.value = []
      return
    }

    // Sync profile
    await syncUserProfile(newUser)

    // Check if they are an authorized coach or admin
    await verifyCoachEmail(newUser.email || '')

    // Restore unlocked state from localStorage if they were previously unlocked and are an admin
    if (import.meta.client && isAuthorizedCoach.value && isAdminCoach.value) {
      const wasUnlocked = localStorage.getItem('laxmtb_admin_unlocked') === 'true'
      isAdminUnlocked.value = wasUnlocked
    } else {
      isAdminUnlocked.value = false
    }

    if (isAuthorizedCoach.value) {
      await fetchAdmins()
    }
  }, { immediate: true })

  /**
   * Verify the signed-in email exists in Firestore admins collection or bootstrap list
   */
  const verifyCoachEmail = async (email: string): Promise<boolean> => {
    if (!email) return false
    const clean = email.toLowerCase().trim()

    // 1. Primary bootstrap admin check (Head Coach / Founder)
    if (DEFAULT_ADMINS.includes(clean)) {
      isAuthorizedCoach.value = true
      coachRole.value = 'owner'
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

    // 2. Check Firestore admins collection for invited coaches/admins
    try {
      const adminRef = doc(db, 'admins', clean)
      const adminSnap = await getDoc(adminRef)
      if (adminSnap.exists()) {
        const data = adminSnap.data()
        coachRole.value = data.role === 'coach' ? 'coach' : 'admin'
        isAuthorizedCoach.value = true
        return true
      } else {
        coachRole.value = null
        isAuthorizedCoach.value = false
        return false
      }
    } catch (e) {
      console.warn('[useCoachAuth] Could not verify coach email from Firestore:', e)
      coachRole.value = null
      isAuthorizedCoach.value = false
      return false
    }
  }

  /**
   * Fetch all registered coaches and admins from Firestore
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
          role: data.role === 'coach' ? 'coach' : (data.role === 'owner' ? 'owner' : 'admin'),
          addedAt: data.addedAt,
          addedBy: data.addedBy
        })
      })
      adminsList.value = list
    } catch (e) {
      console.warn('[useCoachAuth] Could not fetch coaches list:', e)
    } finally {
      adminsLoading.value = false
    }
  }

  /**
   * Add a new coach or admin to Firestore
   */
  const addCoachAdmin = async (
    email: string,
    name?: string,
    role: 'admin' | 'coach' = 'coach'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address' }
    }
    const cleanEmail = email.toLowerCase().trim()
    try {
      await setDoc(doc(db, 'admins', cleanEmail), {
        email: cleanEmail,
        name: name?.trim() || cleanEmail.split('@')[0],
        role: role,
        addedAt: new Date().toISOString(),
        addedBy: user.value?.email || 'admin'
      }, { merge: true })
      await fetchAdmins()
      return { success: true }
    } catch (e: any) {
      console.error('[useCoachAuth] Error adding coach:', e)
      return { success: false, error: e.message || 'Failed to add coach' }
    }
  }

  /**
   * Update a coach's role in Firestore
   */
  const updateCoachRole = async (
    email: string,
    role: 'admin' | 'coach'
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.toLowerCase().trim()
    try {
      await setDoc(doc(db, 'admins', cleanEmail), { role }, { merge: true })
      await fetchAdmins()
      return { success: true }
    } catch (e: any) {
      console.error('[useCoachAuth] Error updating coach role:', e)
      return { success: false, error: e.message || 'Failed to update coach role' }
    }
  }

  /**
   * Remove a coach or admin from Firestore
   */
  const removeCoachAdmin = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.toLowerCase().trim()
    if (cleanEmail === user.value?.email?.toLowerCase().trim()) {
      return { success: false, error: 'You cannot remove your own access' }
    }
    try {
      await deleteDoc(doc(db, 'admins', cleanEmail))
      await fetchAdmins()
      return { success: true }
    } catch (e: any) {
      console.error('[useCoachAuth] Error removing coach:', e)
      return { success: false, error: e.message || 'Failed to remove coach' }
    }
  }

  /**
   * Sign in with Google OAuth popup — any user can sign in
   */
  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string; isAdmin?: boolean }> => {
    if (!auth) return { success: false, error: 'Firebase Auth not initialized' }
    authError.value = ''
    authLoading.value = true

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const email = result.user.email?.toLowerCase().trim() || ''

      await verifyCoachEmail(email)
      await syncUserProfile(result.user)

      if (isAdminCoach.value) {
        isAdminUnlocked.value = true
        if (import.meta.client) {
          localStorage.setItem('laxmtb_admin_unlocked', 'true')
        }
        await fetchAdmins()
      } else {
        isAdminUnlocked.value = false
      }

      authLoading.value = false
      return { success: true, isAdmin: isAdminCoach.value }
    } catch (err: any) {
      authLoading.value = false
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return { success: false }
      }
      const errMsg = err.message || 'Sign-in failed. Please try again.'
      authError.value = errMsg
      return { success: false, error: errMsg }
    }
  }

  /**
   * Sign in with Email & Password
   */
  const signInWithEmail = async (email: string, pass: string): Promise<{ success: boolean; error?: string; isAdmin?: boolean }> => {
    if (!auth) return { success: false, error: 'Firebase Auth not initialized' }
    authError.value = ''
    authLoading.value = true

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass)
      const userEmail = cred.user.email?.toLowerCase().trim() || ''
      await verifyCoachEmail(userEmail)
      await syncUserProfile(cred.user)

      if (isAdminCoach.value) {
        isAdminUnlocked.value = true
        if (import.meta.client) {
          localStorage.setItem('laxmtb_admin_unlocked', 'true')
        }
        await fetchAdmins()
      } else {
        isAdminUnlocked.value = false
      }

      authLoading.value = false
      return { success: true, isAdmin: isAdminCoach.value }
    } catch (err: any) {
      authLoading.value = false
      let errMsg = 'Sign-in failed. Please check your credentials.'
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errMsg = 'Invalid email or password.'
      } else if (err.code === 'auth/too-many-requests') {
        errMsg = 'Too many failed login attempts. Please try again later or reset your password.'
      } else if (err.message) {
        errMsg = err.message
      }
      authError.value = errMsg
      return { success: false, error: errMsg }
    }
  }

  /**
   * Create an Account with Email, Password, Name, and Cell Number
   */
  const signUpWithEmail = async (
    email: string,
    pass: string,
    name: string,
    phone: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!auth) return { success: false, error: 'Firebase Auth not initialized' }
    if (!email || !email.includes('@')) return { success: false, error: 'Please enter a valid email address.' }
    if (!pass || pass.length < 6) return { success: false, error: 'Password must be at least 6 characters.' }
    if (!name || !name.trim()) return { success: false, error: 'Please enter your full name.' }

    authError.value = ''
    authLoading.value = true

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass)
      
      // Update Firebase Auth profile displayName
      await updateProfile(cred.user, {
        displayName: name.trim()
      })

      // Create profile doc in Firestore `users/{uid}`
      if (db) {
        const userRef = doc(db, 'users', cred.user.uid)
        const profileData: UserProfile = {
          uid: cred.user.uid,
          email: cred.user.email?.toLowerCase().trim() || email.trim().toLowerCase(),
          name: name.trim(),
          phone: phone.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await setDoc(userRef, profileData)
        userProfile.value = profileData
      }

      await verifyCoachEmail(cred.user.email || '')
      authLoading.value = false
      return { success: true }
    } catch (err: any) {
      authLoading.value = false
      let errMsg = 'Account creation failed.'
      if (err.code === 'auth/email-already-in-use') {
        errMsg = 'An account with this email address already exists. Please sign in instead.'
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Invalid email address.'
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Password is too weak. Please use at least 6 characters.'
      } else if (err.message) {
        errMsg = err.message
      }
      authError.value = errMsg
      return { success: false, error: errMsg }
    }
  }

  /**
   * Update User Profile Details (Name & Phone only — Email cannot be changed)
   */
  const updateUserProfile = async (details: { name: string; phone: string }): Promise<{ success: boolean; error?: string }> => {
    if (!user.value || !user.value.uid) {
      return { success: false, error: 'User not signed in.' }
    }
    const cleanName = details.name.trim()
    const cleanPhone = details.phone.trim()

    try {
      // 1. Update Firebase Auth displayName
      await updateProfile(user.value, {
        displayName: cleanName
      })

      // 2. Update Firestore `users/{uid}`
      if (db) {
        const userRef = doc(db, 'users', user.value.uid)
        await setDoc(userRef, {
          name: cleanName,
          phone: cleanPhone,
          updatedAt: new Date().toISOString()
        }, { merge: true })
      }

      // Update in-memory profile
      if (userProfile.value) {
        userProfile.value.name = cleanName
        userProfile.value.phone = cleanPhone
        userProfile.value.updatedAt = new Date().toISOString()
      }

      return { success: true }
    } catch (err: any) {
      console.error('[useCoachAuth] Error updating profile:', err)
      return { success: false, error: err.message || 'Failed to update profile.' }
    }
  }

  /**
   * Permanently Delete User Account
   */
  const deleteUserAccount = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user.value || !auth) {
      return { success: false, error: 'No active session.' }
    }
    const currentUid = user.value.uid

    try {
      // 1. Delete profile doc from Firestore
      if (db && currentUid) {
        try {
          await deleteDoc(doc(db, 'users', currentUid))
        } catch (e) {
          console.warn('[useCoachAuth] Error deleting user doc from Firestore:', e)
        }
      }

      // 2. Delete user in Firebase Auth
      await deleteUser(user.value)

      // 3. Clear local states
      userProfile.value = null
      isAuthorizedCoach.value = false
      coachRole.value = null
      isAdminUnlocked.value = false
      adminsList.value = []
      if (import.meta.client) {
        localStorage.removeItem('laxmtb_admin_unlocked')
      }

      return { success: true }
    } catch (err: any) {
      console.error('[useCoachAuth] Error deleting user account:', err)
      if (err.code === 'auth/requires-recent-login') {
        return {
          success: false,
          error: 'For security reasons, deleting your account requires recent authentication. Please sign out, log back in, and try again.'
        }
      }
      return { success: false, error: err.message || 'Failed to delete account.' }
    }
  }

  /**
   * Send Password Reset Email
   */
  const sendResetEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!auth) return { success: false, error: 'Firebase Auth not initialized' }
    if (!email || !email.includes('@')) return { success: false, error: 'Please enter a valid email address.' }
    try {
      await sendPasswordResetEmail(auth, email.trim())
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send reset email.' }
    }
  }

  /**
   * Sign out fully — clears Firebase session and all state
   */
  const signOut = async () => {
    if (!auth) return
    try {
      await firebaseSignOut(auth)
      userProfile.value = null
      isAuthorizedCoach.value = false
      coachRole.value = null
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
    if (user.value && isAuthorizedCoach.value && isAdminCoach.value) {
      isAdminUnlocked.value = true
      if (import.meta.client) {
        localStorage.setItem('laxmtb_admin_unlocked', 'true')
      }
    }
  }

  return {
    user,
    userProfile,
    profileLoading,
    canEditCoachSignups,
    isCoachAuth,
    isAuthorizedCoach,
    isAdminCoach,
    coachRole,
    isAdminUnlocked,
    authError,
    authLoading,
    adminsList,
    adminsLoading,
    fetchAdmins,
    addCoachAdmin,
    updateCoachRole,
    removeCoachAdmin,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    updateUserProfile,
    deleteUserAccount,
    sendResetEmail,
    signOut,
    lockAdmin,
    unlockAdmin
  }
}
