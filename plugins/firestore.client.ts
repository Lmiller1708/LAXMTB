import { defineNuxtPlugin } from '#app'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { useFirebaseApp } from 'vuefire'

export default defineNuxtPlugin(() => {
  try {
    const firebaseApp = useFirebaseApp()
    if (firebaseApp) {
      initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      })
      console.info('[Firestore] Initialized Firestore with persistent offline cache (IndexedDB)')
    }
  } catch (e: any) {
    // If already initialized with default options or IndexedDB is restricted (e.g. private mode)
    console.warn('[Firestore] Persistent cache note:', e?.message || e)
  }
})
