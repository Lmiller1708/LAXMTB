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
        } else {
          hasUpdate.value = false
        }
      } else {
        hasUpdate.value = false
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
    isChecking.value = true
    hasUpdate.value = false
    try {
      // 1. Tell waiting service worker to skip waiting and activate immediately
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      }

      // 2. Unregister active workers so browser loads fresh build from network
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const r of registrations) {
        await r.unregister()
      }

      // 3. Purge cached assets (preserving offline Firestore database)
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        for (const name of cacheNames) {
          if (!name.includes('firestore')) {
            await caches.delete(name)
          }
        }
      }
    } catch (e) {
      console.warn('[PWA] Error during applyUpdate:', e)
    }

    // 4. Force hard reload bypassing browser disk cache
    const cleanUrl = window.location.origin + window.location.pathname
    window.location.replace(`${cleanUrl}?v=${Date.now()}`)
  }

  return {
    hasUpdate,
    isChecking,
    lastChecked,
    checkForUpdate,
    applyUpdate
  }
}
