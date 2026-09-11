export const usePwaUpdate = () => {
  const hasUpdate = useState<boolean>('pwa_has_update', () => false)
  const isChecking = useState<boolean>('pwa_is_checking', () => false)
  const lastChecked = useState<string>('pwa_last_checked', () => '')

  const checkForUpdate = async (manual = false): Promise<boolean> => {
    if (!import.meta.client || !('serviceWorker' in navigator) || !navigator.onLine) return false
    isChecking.value = true
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        // Bust browser and intermediary HTTP caches by pinging sw.js with no-store
        try {
          await fetch(`/sw.js?t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
              'cache-control': 'no-cache, no-store, must-revalidate',
              'pragma': 'no-cache'
            }
          })
        } catch {
          // Offline or network error
        }

        await registration.update()

        if (registration.waiting || registration.installing) {
          hasUpdate.value = true
          return true
        }
      }
      lastChecked.value = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      return false
    } catch (err) {
      console.warn('[PWA] Error checking for updates:', err)
      return false
    } finally {
      isChecking.value = false
    }
  }

  const applyUpdate = async () => {
    if (!import.meta.client) return
    try {
      // Clear legacy SW caches except persistent Firestore data
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        for (const name of cacheNames) {
          if (!name.includes('firestore')) {
            await caches.delete(name)
          }
        }
      }
    } catch (e) {
      console.warn('[PWA] Error clearing cache:', e)
    }
    // Hard reload to activate newest precached assets
    window.location.reload()
  }

  return {
    hasUpdate,
    isChecking,
    lastChecked,
    checkForUpdate,
    applyUpdate
  }
}
