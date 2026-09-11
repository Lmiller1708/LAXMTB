import { defineNuxtPlugin } from '#app'
import { usePwaUpdate } from '~/modules/core/composables/usePwaUpdate'

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client || !('serviceWorker' in navigator)) return

  const { hasUpdate, checkForUpdate } = usePwaUpdate()

  let refreshing = false

  // 1. When a new service worker activates and claims the client (skipWaiting + clientsClaim)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    console.info('[PWA] New service worker took control')
    hasUpdate.value = true
  })

  // 2. Check for updates on visibility change (e.g. user resumes app / unlocks mobile screen)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForUpdate()
    }
  })

  // 3. Check for updates on window focus
  window.addEventListener('focus', () => {
    checkForUpdate()
  })

  // 4. Initial check after app mounts & periodic check every 10 minutes
  nuxtApp.hook('app:mounted', () => {
    setTimeout(() => {
      checkForUpdate()
    }, 2500)

    setInterval(() => {
      checkForUpdate()
    }, 10 * 60 * 1000)
  })

  // 5. Catch updatefound event if registration exists
  navigator.serviceWorker.ready.then((registration) => {
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            hasUpdate.value = true
          }
        })
      }
    })
  }).catch(() => {})
})
