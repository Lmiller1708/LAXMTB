export const useNotificationSubscriptions = () => {
  const subscribedCategories = useState<string[]>('subscribed_categories', () => [])
  const subscribedWaves = useState<string[]>('subscribed_waves', () => [])

  onMounted(() => {
    if (import.meta.client) {
      try {
        const stored = localStorage.getItem('laxmtb_notif_subs')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed.categories)) subscribedCategories.value = parsed.categories
          if (Array.isArray(parsed.waves)) subscribedWaves.value = parsed.waves
        }
      } catch (e) {}
    }
  })

  const saveSubs = () => {
    if (import.meta.client) {
      try {
        localStorage.setItem('laxmtb_notif_subs', JSON.stringify({
          categories: subscribedCategories.value,
          waves: subscribedWaves.value
        }))
      } catch (e) {}
    }
  }

  const isCategorySubscribed = (cat: string) => {
    return subscribedCategories.value.includes(cat)
  }

  const toggleCategorySubscription = (cat: string) => {
    const idx = subscribedCategories.value.indexOf(cat)
    if (idx === -1) {
      subscribedCategories.value.push(cat)
      if (import.meta.client && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
    } else {
      subscribedCategories.value.splice(idx, 1)
    }
    saveSubs()
  }

  return {
    subscribedCategories,
    subscribedWaves,
    isCategorySubscribed,
    toggleCategorySubscription
  }
}
