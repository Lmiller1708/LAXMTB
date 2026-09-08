export const useNetworkStatus = () => {
  const isOnline = ref(true)

  if (process.client) {
    isOnline.value = navigator.onLine

    window.addEventListener('online', () => {
      isOnline.value = true
    })

    window.addEventListener('offline', () => {
      isOnline.value = false
    })
  }

  return {
    isOnline: readonly(isOnline)
  }
}
