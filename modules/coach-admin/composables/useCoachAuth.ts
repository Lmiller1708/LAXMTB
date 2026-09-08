import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'

export const useCoachAuth = () => {
  const { $auth, $googleProvider } = useNuxtApp()
  const user = ref<User | null>(null)
  const isCoach = ref(false)
  const authLoading = ref(true)

  // Authorized coach emails list (can also be loaded from Firestore or config)
  const authorizedCoaches = [
    'lmiller1708@gmail.com'
  ]

  const checkAuthorization = (currentUser: User | null) => {
    user.value = currentUser
    if (currentUser?.email) {
      isCoach.value = authorizedCoaches.some(
        email => email.toLowerCase() === currentUser.email!.toLowerCase()
      )
    } else {
      isCoach.value = false
    }
  }

  const loginWithGoogle = async () => {
    if (!$auth || !$googleProvider) {
      console.warn('[Firebase Auth] Firebase not initialized.')
      // Dev fallback
      isCoach.value = true
      return
    }

    try {
      const result = await signInWithPopup($auth, $googleProvider)
      checkAuthorization(result.user)
    } catch (err) {
      console.error('[Google Sign-In Error]:', err)
      throw err
    }
  }

  const logout = async () => {
    if ($auth) {
      await signOut($auth)
    }
    user.value = null
    isCoach.value = false
  }

  onMounted(() => {
    if ($auth) {
      onAuthStateChanged($auth, (currentUser) => {
        checkAuthorization(currentUser)
        authLoading.value = false
      })
    } else {
      authLoading.value = false
    }
  })

  return {
    user,
    isCoach,
    authLoading,
    loginWithGoogle,
    logout
  }
}
