import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore
} from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const fbConfig = config.public.firebase as {
    apiKey?: string
    authDomain?: string
    projectId?: string
    storageBucket?: string
    messagingSenderId?: string
    appId?: string
  }

  // Gracefully skip or use placeholder if not yet configured by user
  if (!fbConfig || !fbConfig.apiKey) {
    console.info('[Firebase] Waiting for Firebase configuration in .env')
    return {
      provide: {
        firebaseApp: null,
        firestore: null,
        auth: null,
        googleProvider: null
      }
    }
  }

  const app = getApps().length === 0 ? initializeApp(fbConfig) : getApp()

  let db
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    })
  } catch (e) {
    db = getFirestore(app)
  }

  const auth = getAuth(app)
  const googleProvider = new GoogleAuthProvider()

  return {
    provide: {
      firebaseApp: app,
      firestore: db,
      auth,
      googleProvider
    }
  }
})
