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
  photoURL?: string
  role?: 'admin' | 'coach' | 'guardian' | 'owner'
  createdAt?: string
  updatedAt?: string
}

export interface InviteSettings {
  coachCode: string
  guardianCode: string
  updatedAt?: string
  updatedBy?: string
}

export const DEFAULT_COACH_CODE = 'lax-coach-2026'
export const DEFAULT_GUARDIAN_CODE = 'lax-guardian-2026'

/**
 * useCoachAuth — Multi-tier security and user management model:
 *  - Identity: Firebase Auth (Email/Password or Google OAuth)
 *  - User Profile: Firestore `users/{uid}` (name, cell phone number, locked email, role)
 *  - Team Registration: Invite-only gatekeeping via Coach & Guardian links / codes
 *  - Coach & Admin Authorization: Firestore `admins/{email}`
 *  - Permissions:
 *      * Coaches can edit Coach Sign-Ups and manage their profile
 *      * Guardians have parent access (staged)
 *      * Only registered Admins / Owners can open the Admin Modal & manage race configs
 */
export const useCoachAuth = () => {
  const auth = useFirebaseAuth()
  const db = useFirestore()
  const user = useCurrentUser()

  // Authenticated user profile loaded from Firestore `users/{uid}`
  const userProfile = useState<UserProfile | null>('user_profile', () => null)
  const profileLoading = useState<boolean>('user_profile_loading', () => false)

  // Team Invite Settings (Coach & Guardian codes)
  const inviteSettings = useState<InviteSettings>('team_invite_settings', () => ({
    coachCode: DEFAULT_COACH_CODE,
    guardianCode: DEFAULT_GUARDIAN_CODE
  }))

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

  // Helper: Verify account has proved identity via email verification or Google OAuth
  const isVerifiedAuth = (u: any): boolean => {
    if (!u) return false
    if (u.emailVerified === true) return true
    if (u.providerData?.some((p: any) => p.providerId === 'google.com')) return true
    return false
  }

  // Is the current user an admin (requires verified identity)
  const isAdminCoach = computed<boolean>(() => {
    if (!user.value || !isVerifiedAuth(user.value)) return false
    const email = user.value.email?.toLowerCase().trim() || ''
    if (DEFAULT_ADMINS.includes(email)) return true
    return coachRole.value === 'admin' || coachRole.value === 'owner' || userProfile.value?.role === 'admin' || userProfile.value?.role === 'owner'
  })

  // Authenticated coaches and admins can edit coach sign-ups (guardians are read-only)
  const canEditCoachSignups = computed<boolean>(() => {
    if (!user.value) return false
    if (isAdminCoach.value || isAuthorizedCoach.value) return true
    if (userProfile.value?.role === 'guardian') return false
    return true
  })

  // Full admin editing active
  const isCoachAuth = computed(() =>
    !!user.value && isAuthorizedCoach.value && isAdminCoach.value && isAdminUnlocked.value
  )

  // User profile photo (e.g. from Google account)
  const userPhoto = computed<string>(() => {
    return user.value?.photoURL || userProfile.value?.photoURL || ''
  })

  // Global map of coach name / email -> photoURL for displaying avatars in sign-up slots
  // Initialized with localStorage cache so avatars remain visible when signed out
  const coachAvatarMap = useState<Record<string, string>>('coach_avatar_map', () => {
    if (import.meta.client) {
      try {
        const cached = localStorage.getItem('laxmtb_coach_avatars')
        if (cached) return JSON.parse(cached)
      } catch (e) {}
    }
    return {}
  })

  const fetchCoachAvatars = async () => {
    if (!db) return
    try {
      const snap = await getDocs(collection(db, 'users'))
      const map: Record<string, string> = { ...coachAvatarMap.value }
      snap.forEach((d) => {
        const data = d.data()
        if (data.photoURL) {
          if (data.name) map[data.name.toLowerCase().trim()] = data.photoURL
          if (data.email) map[data.email.toLowerCase().trim()] = data.photoURL
        }
      })
      if (userProfile.value?.photoURL) {
        if (userProfile.value.name) map[userProfile.value.name.toLowerCase().trim()] = userProfile.value.photoURL
        if (userProfile.value.email) map[userProfile.value.email.toLowerCase().trim()] = userProfile.value.photoURL
      } else if (user.value?.photoURL) {
        if (user.value.displayName) map[user.value.displayName.toLowerCase().trim()] = user.value.photoURL
        if (user.value.email) map[user.value.email.toLowerCase().trim()] = user.value.photoURL
      }
      coachAvatarMap.value = map
      if (import.meta.client) {
        try {
          localStorage.setItem('laxmtb_coach_avatars', JSON.stringify(map))
        } catch (e) {}
      }
    } catch (err) {
      console.warn('[useCoachAuth] Could not fetch coach avatars:', err)
    }
  }

  /**
   * Fetch invite settings from Firestore `settings/invites`
   */
  const fetchInviteSettings = async () => {
    if (!db) return
    try {
      const snap = await getDoc(doc(db, 'settings', 'invites'))
      if (snap.exists()) {
        const d = snap.data()
        inviteSettings.value = {
          coachCode: d.coachCode || DEFAULT_COACH_CODE,
          guardianCode: d.guardianCode || DEFAULT_GUARDIAN_CODE,
          updatedAt: d.updatedAt,
          updatedBy: d.updatedBy
        }
      }
    } catch (err) {
      console.warn('[useCoachAuth] Could not fetch invite settings:', err)
    }
  }

  /**
   * Validate an invite code or link token
   */
  const validateInviteCode = (rawCode?: string): { valid: boolean; role?: 'coach' | 'guardian'; label?: string; error?: string } => {
    if (!rawCode || !rawCode.trim()) {
      return { valid: false, error: 'Registration is by team invitation only. Please enter a valid team access code or use an invite link.' }
    }
    const clean = rawCode.toLowerCase().trim()
    const coachTarget = (inviteSettings.value.coachCode || DEFAULT_COACH_CODE).toLowerCase().trim()
    const guardianTarget = (inviteSettings.value.guardianCode || DEFAULT_GUARDIAN_CODE).toLowerCase().trim()

    // Match coach code or aliases
    if (clean === coachTarget || clean === 'lax-coach-2026' || clean === 'coach' || clean === 'lax-coach' || clean === 'coach2026') {
      return { valid: true, role: 'coach', label: 'Team Coach Invite' }
    }

    // Match guardian code or aliases
    if (clean === guardianTarget || clean === 'lax-guardian-2026' || clean === 'guardian' || clean === 'lax-guardian' || clean === 'guardian2026') {
      return { valid: true, role: 'guardian', label: 'Guardian / Parent Invite' }
    }

    return { valid: false, error: 'Invalid access code. Please check with your head coach for the correct link or code.' }
  }

  /**
   * Update invite codes in Firestore (Admin only)
   */
  const updateInviteCodes = async (newSettings: { coachCode: string; guardianCode: string }): Promise<{ success: boolean; error?: string }> => {
    if (!db) return { success: false, error: 'Database unavailable' }
    try {
      const cleanCoach = newSettings.coachCode.trim().toLowerCase() || DEFAULT_COACH_CODE
      const cleanGuardian = newSettings.guardianCode.trim().toLowerCase() || DEFAULT_GUARDIAN_CODE
      await setDoc(doc(db, 'settings', 'invites'), {
        coachCode: cleanCoach,
        guardianCode: cleanGuardian,
        updatedAt: new Date().toISOString(),
        updatedBy: user.value?.email || 'admin'
      }, { merge: true })
      inviteSettings.value = {
        coachCode: cleanCoach,
        guardianCode: cleanGuardian,
        updatedAt: new Date().toISOString(),
        updatedBy: user.value?.email || 'admin'
      }
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update invite codes' }
    }
  }

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
        const photo = firebaseUser.photoURL || data.photoURL || ''
        userProfile.value = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: data.name || firebaseUser.displayName || '',
          phone: data.phone || '',
          photoURL: photo,
          role: data.role || (isAdminCoach.value ? 'admin' : (isAuthorizedCoach.value ? 'coach' : undefined)),
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        }
        if (firebaseUser.photoURL && data.photoURL !== firebaseUser.photoURL) {
          setDoc(userRef, { photoURL: firebaseUser.photoURL }, { merge: true }).catch(() => {})
        }
      } else {
        const initialProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'MTB Member',
          phone: '',
          photoURL: firebaseUser.photoURL || '',
          role: isAdminCoach.value ? 'admin' : 'coach',
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
        phone: '',
        photoURL: firebaseUser.photoURL || ''
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

    // Sync profile & invite settings
    await syncUserProfile(newUser)
    await fetchInviteSettings()

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
      if (!isVerifiedAuth(user.value)) {
        console.warn('[useCoachAuth] Unverified email attempted bootstrap owner access')
        coachRole.value = null
        isAuthorizedCoach.value = false
        return false
      }
      isAuthorizedCoach.value = true
      coachRole.value = 'owner'
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
   * Sign in with Google OAuth popup
   *  - Existing users sign in directly.
   *  - New users require a valid invite code or pre-approved admin email.
   */
  const signInWithGoogle = async (inviteCode?: string): Promise<{ success: boolean; error?: string; isAdmin?: boolean }> => {
    if (!auth) return { success: false, error: 'Firebase Auth not initialized' }
    authError.value = ''
    authLoading.value = true

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const email = result.user.email?.toLowerCase().trim() || ''

      // Check if user profile already exists
      let existingProfile: UserProfile | null = null
      if (db && result.user.uid) {
        const snap = await getDoc(doc(db, 'users', result.user.uid))
        if (snap.exists()) {
          existingProfile = snap.data() as UserProfile
        }
      }

      // If user is NEW, verify invite code or pre-approved admin
      if (!existingProfile) {
        const cleanEmail = email.toLowerCase().trim()
        const isPreAdmin = DEFAULT_ADMINS.includes(cleanEmail)
        const inviteCheck = validateInviteCode(inviteCode)

        if (!inviteCheck.valid && !isPreAdmin) {
          // Reject new registration
          await firebaseSignOut(auth)
          authLoading.value = false
          const errMsg = 'Registration is by team invitation only. Please use the invite link provided by your head coach.'
          authError.value = errMsg
          return { success: false, error: errMsg }
        }

        if (db && result.user.uid) {
          const newProf: UserProfile = {
            uid: result.user.uid,
            email: email,
            name: result.user.displayName || email.split('@')[0] || 'Team Member',
            phone: '',
            photoURL: result.user.photoURL || '',
            role: isPreAdmin ? 'admin' : (inviteCheck.role || 'coach'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          await setDoc(doc(db, 'users', result.user.uid), newProf)
          userProfile.value = newProf
        }
      } else {
        await syncUserProfile(result.user)
      }

      await verifyCoachEmail(email)

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
      } else if (err.code === 'auth/operation-not-allowed') {
        errMsg = 'Email/Password sign-in is not enabled yet in your Firebase Console. Please enable it under Authentication > Sign-in method.'
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
   * Create an Account with Email, Password, Name, Cell Number, and required Invite Code
   */
  const signUpWithEmail = async (
    email: string,
    pass: string,
    name: string,
    phone: string,
    inviteCode: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!auth) return { success: false, error: 'Firebase Auth not initialized' }
    if (!email || !email.includes('@')) return { success: false, error: 'Please enter a valid email address.' }
    const cleanEmail = email.toLowerCase().trim()
    if (DEFAULT_ADMINS.includes(cleanEmail)) {
      return { success: false, error: 'Administrator accounts must sign in using verified Google Sign-In.' }
    }
    if (!pass || pass.length < 6) return { success: false, error: 'Password must be at least 6 characters.' }
    if (!name || !name.trim()) return { success: false, error: 'Please enter your full name.' }

    // Validate invite code
    const inviteCheck = validateInviteCode(inviteCode)
    if (!inviteCheck.valid) {
      return { success: false, error: inviteCheck.error || 'Registration is by invitation only.' }
    }

    authError.value = ''
    authLoading.value = true

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass)
      
      // Update Firebase Auth profile displayName
      await updateProfile(cred.user, {
        displayName: name.trim()
      })

      // Create profile doc in Firestore `users/{uid}` with assigned role
      if (db) {
        const userRef = doc(db, 'users', cred.user.uid)
        const profileData: UserProfile = {
          uid: cred.user.uid,
          email: cred.user.email?.toLowerCase().trim() || email.trim().toLowerCase(),
          name: name.trim(),
          phone: phone.trim(),
          role: inviteCheck.role || 'coach',
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
      } else if (err.code === 'auth/operation-not-allowed') {
        errMsg = 'Email/Password sign-in is not enabled yet in your Firebase Console. Please enable it under Authentication > Sign-in method.'
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
  const updateUserProfile = async (details: { name: string; phone: string; photoURL?: string }): Promise<{ success: boolean; error?: string }> => {
    if (!user.value || !user.value.uid) {
      return { success: false, error: 'User not signed in.' }
    }
    const cleanName = details.name.trim()
    const cleanPhone = details.phone.trim()
    const cleanPhoto = details.photoURL !== undefined ? details.photoURL.trim() : undefined

    try {
      const authUpdates: any = { displayName: cleanName }
      if (cleanPhoto !== undefined) {
        // Firebase Auth updateProfile rejects photoURL longer than 2048 chars
        if (!cleanPhoto || cleanPhoto.length <= 2048) {
          authUpdates.photoURL = cleanPhoto
        }
      }
      await updateProfile(user.value, authUpdates)

      if (db) {
        const userRef = doc(db, 'users', user.value.uid)
        const docUpdates: any = {
          name: cleanName,
          phone: cleanPhone,
          updatedAt: new Date().toISOString()
        }
        if (cleanPhoto !== undefined) {
          docUpdates.photoURL = cleanPhoto
        }
        await setDoc(userRef, docUpdates, { merge: true })
      }

      if (userProfile.value) {
        userProfile.value.name = cleanName
        userProfile.value.phone = cleanPhone
        if (cleanPhoto !== undefined) {
          userProfile.value.photoURL = cleanPhoto
        }
        userProfile.value.updatedAt = new Date().toISOString()
      }

      if (cleanPhoto) {
        const nextMap = {
          ...coachAvatarMap.value,
          [cleanName.toLowerCase()]: cleanPhoto,
          [(user.value.email || '').toLowerCase()]: cleanPhoto
        }
        coachAvatarMap.value = nextMap
        if (import.meta.client) {
          try {
            localStorage.setItem('laxmtb_coach_avatars', JSON.stringify(nextMap))
          } catch (e) {}
        }
      } else if (cleanPhoto === '') {
        const nextMap = { ...coachAvatarMap.value }
        delete nextMap[cleanName.toLowerCase()]
        if (user.value.email) delete nextMap[user.value.email.toLowerCase()]
        coachAvatarMap.value = nextMap
        if (import.meta.client) {
          try {
            localStorage.setItem('laxmtb_coach_avatars', JSON.stringify(nextMap))
          } catch (e) {}
        }
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
      if (db && currentUid) {
        try {
          await deleteDoc(doc(db, 'users', currentUid))
        } catch (e) {
          console.warn('[useCoachAuth] Error deleting user doc from Firestore:', e)
        }
      }

      await deleteUser(user.value)

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
   * Sign out fully
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
   * Lock Admin Mode
   */
  const lockAdmin = () => {
    isAdminUnlocked.value = false
    if (import.meta.client) {
      localStorage.setItem('laxmtb_admin_unlocked', 'false')
    }
  }

  /**
   * Unlock Admin Mode
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
    userPhoto,
    profileLoading,
    inviteSettings,
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
    fetchInviteSettings,
    validateInviteCode,
    updateInviteCodes,
    coachAvatarMap,
    fetchCoachAvatars,
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
