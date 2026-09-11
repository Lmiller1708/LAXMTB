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

export interface TeamUserItem {
  id: string
  uid?: string
  email: string
  name: string
  phone?: string
  photoURL?: string
  role: 'owner' | 'admin' | 'coach' | 'guardian' | 'member'
  createdAt?: string
  lastLoginAt?: string
  isPendingAdmin?: boolean
}

export interface UserProfile {
  uid: string
  email: string
  name: string
  phone: string
  photoURL?: string
  role?: 'admin' | 'coach' | 'guardian' | 'owner'
  createdAt?: string
  updatedAt?: string
  notificationSubscriptions?: {
    categories?: string[]
    waves?: string[]
    rideGroups?: any[]
    config?: any
    updatedAt?: string
  }
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

  // List of all registered team users and admins
  const allUsersList = useState<TeamUserItem[]>('coach_all_users_list', () => [])
  const allUsersLoading = useState<boolean>('coach_all_users_loading', () => false)

  // Primary bootstrap administrator(s)
  const DEFAULT_ADMINS = ['lmiller1708@gmail.com']

  // Helper: Verify account has proved identity via email verification or Google OAuth
  const isVerifiedAuth = (u: any): boolean => {
    if (!u) return false
    if (u.emailVerified === true) return true
    if (u.providerData?.some((p: any) => p.providerId === 'google.com')) return true
    return false
  }

  // Is the current user an admin (requires verified identity for founder/admins)
  const isAdminCoach = computed<boolean>(() => {
    if (!user.value) return false
    const email = user.value.email?.toLowerCase().trim() || ''
    if (DEFAULT_ADMINS.includes(email)) return isVerifiedAuth(user.value)
    return coachRole.value === 'admin' || coachRole.value === 'owner'
  })

  // Authenticated coaches and admins can edit coach sign-ups (requires authorized coach record in admins collection)
  const canEditCoachSignups = computed<boolean>(() => {
    if (!user.value) return false
    return isAdminCoach.value || isAuthorizedCoach.value
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
   * Accept an invite code for an already-authenticated user (e.g. upgrade from guardian to coach)
   */
  const acceptInviteForCurrentUser = async (inviteCode: string): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    if (!user.value || !db) return { success: false, error: 'Not authenticated' }
    const check = validateInviteCode(inviteCode)
    if (!check.valid || !check.role) {
      return { success: false, error: check.error || 'Invalid invite code' }
    }
    const targetRole = check.role
    const cleanEmail = user.value.email?.toLowerCase().trim() || ''

    // Do not demote admins or owners
    if (coachRole.value === 'admin' || coachRole.value === 'owner') {
      return { success: true, role: coachRole.value }
    }

    try {
      if (user.value.uid) {
        await setDoc(doc(db, 'users', user.value.uid), {
          role: targetRole,
          updatedAt: new Date().toISOString()
        }, { merge: true })
      }

      if (targetRole === 'coach' && cleanEmail) {
        await setDoc(doc(db, 'admins', cleanEmail), {
          email: cleanEmail,
          name: user.value.displayName || cleanEmail.split('@')[0],
          role: 'coach',
          addedAt: new Date().toISOString(),
          addedBy: 'invite-coach'
        }, { merge: true })
        coachRole.value = 'coach'
        isAuthorizedCoach.value = true
      }

      if (userProfile.value) {
        userProfile.value.role = targetRole
      }

      return { success: true, role: targetRole }
    } catch (err: any) {
      console.warn('[useCoachAuth] acceptInviteForCurrentUser error:', err)
      return { success: false, error: err.message || 'Failed to apply invite' }
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
        let initialRole: UserRole = 'guardian'
        if (isAdminCoach.value) {
          initialRole = 'admin'
        } else if (isAuthorizedCoach.value) {
          initialRole = 'coach'
        } else if (import.meta.client) {
          const token = sessionStorage.getItem('laxmtb_invite_token')
          if (token) {
            const chk = validateInviteCode(token)
            if (chk.valid && chk.role) {
              initialRole = chk.role
            }
          }
        }

        const initialProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'MTB Member',
          phone: '',
          photoURL: firebaseUser.photoURL || '',
          role: initialRole,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await setDoc(userRef, initialProfile)
        userProfile.value = initialProfile

        if (initialRole === 'coach' && firebaseUser.email) {
          const cleanEmail = firebaseUser.email.toLowerCase().trim()
          try {
            await setDoc(doc(db, 'admins', cleanEmail), {
              email: cleanEmail,
              name: initialProfile.name,
              role: 'coach',
              addedAt: new Date().toISOString(),
              addedBy: 'invite-coach'
            }, { merge: true })
            coachRole.value = 'coach'
            isAuthorizedCoach.value = true
          } catch (e) {}
        }
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
      allUsersList.value = []
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
        // Fallback: check if user profile in users collection has coach/admin role
        if (user.value?.uid) {
          try {
            const userRef = doc(db, 'users', user.value.uid)
            const userSnap = await getDoc(userRef)
            if (userSnap.exists()) {
              const uData = userSnap.data()
              if (uData.role === 'coach' || uData.role === 'admin') {
                coachRole.value = uData.role === 'admin' ? 'admin' : 'coach'
                isAuthorizedCoach.value = true
                return true
              }
            }
          } catch (err) {}
        }
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
   * Fetch all registered users (from users collection) merged with administrators (from admins collection)
   */
  const fetchAllUsers = async () => {
    if (!db) return
    allUsersLoading.value = true
    try {
      const [usersSnap, adminsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'admins'))
      ])

      const adminMap: Record<string, { role: string; name?: string; addedAt?: string; addedBy?: string }> = {}
      adminsSnap.forEach((d) => {
        const data = d.data()
        adminMap[d.id.toLowerCase().trim()] = {
          role: data.role || 'admin',
          name: data.name,
          addedAt: data.addedAt,
          addedBy: data.addedBy
        }
      })

      const userMap: Record<string, TeamUserItem> = {}

      usersSnap.forEach((d) => {
        const u = d.data()
        const email = (u.email || '').toLowerCase().trim()
        if (!email) return

        let role: 'owner' | 'admin' | 'coach' | 'guardian' | 'member' = 'coach'
        if (email === 'lmiller1708@gmail.com') {
          role = 'owner'
        } else if (adminMap[email]?.role === 'admin' || adminMap[email]?.role === 'owner' || u.role === 'admin' || u.role === 'owner') {
          role = 'admin'
        } else if (adminMap[email]?.role === 'coach' || u.role === 'coach') {
          role = 'coach'
          // Self-heal: ensure coach record exists in admins collection
          if (!adminMap[email] && isAdminCoach.value) {
            setDoc(doc(db, 'admins', email), {
              email,
              name: u.name || email.split('@')[0],
              role: 'coach',
              addedAt: u.createdAt || new Date().toISOString(),
              addedBy: user.value?.email || 'admin'
            }, { merge: true }).catch(() => {})
          }
        } else if (u.role === 'guardian') {
          role = 'guardian'
        } else if (u.role === 'member') {
          role = 'member'
        } else {
          role = 'coach'
        }

        userMap[email] = {
          id: d.id,
          uid: d.id,
          email: u.email || email,
          name: u.name || adminMap[email]?.name || email.split('@')[0],
          phone: u.phone || '',
          photoURL: u.photoURL || '',
          role,
          createdAt: u.createdAt || adminMap[email]?.addedAt,
          lastLoginAt: u.lastLoginAt || u.updatedAt
        }
      })

      // Add any admins who haven't registered a document in users collection yet
      Object.keys(adminMap).forEach((adminEmail) => {
        if (!userMap[adminEmail]) {
          const adm = adminMap[adminEmail]
          const isOwner = adminEmail === 'lmiller1708@gmail.com'
          userMap[adminEmail] = {
            id: adminEmail,
            email: adminEmail,
            name: adm.name || adminEmail.split('@')[0],
            role: isOwner ? 'owner' : (adm.role === 'coach' ? 'coach' : 'admin'),
            createdAt: adm.addedAt,
            isPendingAdmin: true
          }
        }
      })

      allUsersList.value = Object.values(userMap)
    } catch (e) {
      console.warn('[useCoachAuth] Could not fetch all users list:', e)
    } finally {
      allUsersLoading.value = false
    }
  }

  /**
   * Add a new administrator to Firestore
   */
  const addCoachAdmin = async (
    email: string,
    name?: string,
    role: 'admin' | 'coach' = 'admin'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address' }
    }
    const cleanEmail = email.toLowerCase().trim()
    try {
      await setDoc(doc(db, 'admins', cleanEmail), {
        email: cleanEmail,
        name: name?.trim() || cleanEmail.split('@')[0],
        role: 'admin',
        addedAt: new Date().toISOString(),
        addedBy: user.value?.email || 'admin'
      }, { merge: true })
      await fetchAdmins()
      await fetchAllUsers()
      return { success: true }
    } catch (e: any) {
      console.error('[useCoachAuth] Error adding administrator:', e)
      return { success: false, error: e.message || 'Failed to add administrator' }
    }
  }

  /**
   * Update a user's role/access in Firestore (both admins and users collections)
   */
  const updateUserRole = async (
    email: string,
    newRole: 'admin' | 'coach' | 'guardian',
    uid?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.toLowerCase().trim()
    if (cleanEmail === 'lmiller1708@gmail.com') {
      return { success: false, error: 'Founder / Head Coach account access cannot be modified' }
    }
    if (cleanEmail === user.value?.email?.toLowerCase().trim()) {
      return { success: false, error: 'You cannot change your own administrator access' }
    }

    try {
      if (newRole === 'admin') {
        await setDoc(doc(db, 'admins', cleanEmail), {
          email: cleanEmail,
          role: 'admin',
          addedAt: new Date().toISOString(),
          addedBy: user.value?.email || 'admin'
        }, { merge: true })
        if (uid) {
          await setDoc(doc(db, 'users', uid), { role: 'admin' }, { merge: true })
        }
      } else if (newRole === 'coach') {
        await setDoc(doc(db, 'admins', cleanEmail), {
          email: cleanEmail,
          role: 'coach',
          addedAt: new Date().toISOString(),
          addedBy: user.value?.email || 'admin'
        }, { merge: true })
        if (uid) {
          await setDoc(doc(db, 'users', uid), { role: 'coach' }, { merge: true })
        }
      } else {
        // Demote to guardian: delete from admins collection
        await deleteDoc(doc(db, 'admins', cleanEmail)).catch(() => {})
        if (uid) {
          await setDoc(doc(db, 'users', uid), { role: 'guardian' }, { merge: true })
        }
      }

      // Optimistically update allUsersList
      allUsersList.value = allUsersList.value.map(u => {
        if (u.email.toLowerCase().trim() === cleanEmail || (uid && (u.uid === uid || u.id === uid))) {
          return { ...u, role: newRole }
        }
        return u
      })

      await fetchAdmins()
      await fetchAllUsers()
      return { success: true }
    } catch (e: any) {
      console.error('[useCoachAuth] Error updating user role:', e)
      return { success: false, error: e.message || 'Failed to update user role' }
    }
  }

  const updateCoachRole = (email: string, role: 'admin' | 'coach') => updateUserRole(email, role)

  /**
   * Remove a coach or admin from Firestore
   */
  const removeCoachAdmin = async (email: string, uid?: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.toLowerCase().trim()
    if (cleanEmail === 'lmiller1708@gmail.com') {
      return { success: false, error: 'Cannot remove Founder / Head Coach account' }
    }
    if (cleanEmail === user.value?.email?.toLowerCase().trim()) {
      return { success: false, error: 'You cannot remove your own access' }
    }
    try {
      if (!db) return { success: false, error: 'Database unavailable' }

      let deleteError: any = null

      // 1. Delete from admins collection if present
      try {
        await deleteDoc(doc(db, 'admins', cleanEmail))
      } catch (err: any) {
        if (err.code !== 'not-found') {
          console.warn('[useCoachAuth] deleteDoc admins error:', err)
        }
      }

      // 2. Delete from users collection by UID
      if (uid) {
        try {
          await deleteDoc(doc(db, 'users', uid))
        } catch (err: any) {
          console.warn('[useCoachAuth] deleteDoc users by uid error:', err)
          deleteError = err
        }
      }

      // 3. Also sweep users collection by email in case uid was different or multiple docs exist
      try {
        const snap = await getDocs(collection(db, 'users'))
        for (const d of snap.docs) {
          if (d.data().email?.toLowerCase().trim() === cleanEmail) {
            try {
              await deleteDoc(doc(db, 'users', d.id))
            } catch (err: any) {
              console.warn('[useCoachAuth] deleteDoc sweep user doc error:', err)
              deleteError = err
            }
          }
        }
      } catch (err: any) {
        console.warn('[useCoachAuth] sweep users error:', err)
        deleteError = err
      }

      // Re-fetch from server to verify actual database state
      await fetchAdmins()
      await fetchAllUsers()

      const stillPresent = allUsersList.value.some(u => u.email.toLowerCase().trim() === cleanEmail)
      if (stillPresent) {
        const reason = deleteError?.message || 'Firestore rules prevented deleting this user. Please publish the updated firestore.rules in Firebase Console.'
        return { success: false, error: reason }
      }

      return { success: true }
    } catch (e: any) {
      console.error('[useCoachAuth] Error removing user:', e)
      return { success: false, error: e.message || 'Failed to remove user' }
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

        const assignedRole: UserRole = isPreAdmin ? 'admin' : (inviteCheck.role || 'guardian')
        if (db && result.user.uid) {
          const newProf: UserProfile = {
            uid: result.user.uid,
            email: email,
            name: result.user.displayName || email.split('@')[0] || 'Team Member',
            phone: '',
            photoURL: result.user.photoURL || '',
            role: assignedRole,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          await setDoc(doc(db, 'users', result.user.uid), newProf)
          userProfile.value = newProf

          if (assignedRole === 'coach') {
            try {
              await setDoc(doc(db, 'admins', cleanEmail), {
                email: cleanEmail,
                name: newProf.name,
                role: 'coach',
                addedAt: new Date().toISOString(),
                addedBy: 'invite-coach'
              }, { merge: true })
              coachRole.value = 'coach'
              isAuthorizedCoach.value = true
            } catch (admErr) {
              console.warn('[useCoachAuth] Could not write coach to admins collection:', admErr)
            }
          }
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

    const assignedRole: UserRole = inviteCheck.role || 'guardian'

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
          role: assignedRole,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await setDoc(userRef, profileData)
        userProfile.value = profileData

        if (assignedRole === 'coach') {
          try {
            await setDoc(doc(db, 'admins', cleanEmail), {
              email: cleanEmail,
              name: name.trim(),
              role: 'coach',
              addedAt: new Date().toISOString(),
              addedBy: 'invite-coach'
            }, { merge: true })
            coachRole.value = 'coach'
            isAuthorizedCoach.value = true
          } catch (admErr) {
            console.warn('[useCoachAuth] Could not write coach to admins collection:', admErr)
          }
        }
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
    allUsersList,
    allUsersLoading,
    fetchAdmins,
    fetchAllUsers,
    fetchInviteSettings,
    validateInviteCode,
    updateInviteCodes,
    acceptInviteForCurrentUser,
    coachAvatarMap,
    fetchCoachAvatars,
    addCoachAdmin,
    updateCoachRole,
    updateUserRole,
    removeCoachAdmin,
    removeTeamUser: removeCoachAdmin,
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
