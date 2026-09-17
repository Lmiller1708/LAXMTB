import { ref, computed, onMounted } from 'vue'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useFirestore } from 'vuefire'

export type AnnouncementType = 'danger' | 'warning' | 'info'

export interface SiteAnnouncement {
  id: string
  title: string
  message: string
  type: AnnouncementType
  active: boolean
  location?: string
  expiresAt?: string
  updatedAt: string
  updatedBy?: string
}

export const defaultAnnouncement: SiteAnnouncement = {
  id: 'init-announcement',
  title: 'PRACTICE UPDATE',
  message: '',
  type: 'danger',
  active: false,
  location: '',
  expiresAt: '',
  updatedAt: new Date().toISOString()
}

const STORAGE_KEY = 'laxmtb_announcement_data'
const DISMISSED_KEY_PREFIX = 'laxmtb_dismissed_announcement_'

export function useSiteAnnouncement() {
  const db = useFirestore()
  const announcement = useState<SiteAnnouncement>('site_active_announcement', () => {
    if (import.meta.client) {
      try {
        const cached = localStorage.getItem(STORAGE_KEY)
        if (cached) return { ...defaultAnnouncement, ...JSON.parse(cached) }
      } catch (e) {}
    }
    return { ...defaultAnnouncement }
  })

  const dismissedId = ref<string>('')
  const nowTime = ref(Date.now())

  // Keep nowTime updated to trigger reactive auto-expiration without page reload
  if (import.meta.client) {
    onMounted(() => {
      nowTime.value = Date.now()
      const timer = setInterval(() => {
        nowTime.value = Date.now()
      }, 10000)
      onUnmounted?.(() => clearInterval(timer))
    })
  }

  const isExpired = computed(() => {
    if (!announcement.value?.expiresAt) return false
    const expireTs = new Date(announcement.value.expiresAt).getTime()
    if (isNaN(expireTs) || expireTs <= 0) return false
    return nowTime.value >= expireTs
  })

  const isDismissed = computed(() => {
    if (!import.meta.client) return false
    if (!announcement.value?.id) return false
    return dismissedId.value === announcement.value.id ||
      Boolean(localStorage.getItem(`${DISMISSED_KEY_PREFIX}${announcement.value.id}`))
  })

  const isBannerVisible = computed(() => {
    return Boolean(
      announcement.value?.active &&
      announcement.value?.message &&
      !isDismissed.value &&
      !isExpired.value
    )
  })

  const formatExpiresAt = (iso?: string): string => {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''

    const today = new Date()
    const isToday = d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()

    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    if (isToday) {
      return timeStr
    }
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`
  }

  const dismissAnnouncement = () => {
    if (!import.meta.client) return
    if (!announcement.value?.id) return
    dismissedId.value = announcement.value.id
    try {
      localStorage.setItem(`${DISMISSED_KEY_PREFIX}${announcement.value.id}`, 'true')
    } catch (e) {}
  }

  // Real-time Firestore sync
  if (import.meta.client && db) {
    onMounted(() => {
      try {
        const docRef = doc(db, 'settings', 'announcement')
        onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as SiteAnnouncement
            const isNewOrUpdated = data.id !== announcement.value.id || data.updatedAt !== announcement.value.updatedAt

            announcement.value = { ...defaultAnnouncement, ...data }

            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(announcement.value))
            } catch (e) {}

            // If an active announcement is newly published/updated, reset local dismissal so everyone sees it!
            if (isNewOrUpdated && data.active) {
              dismissedId.value = ''
              try {
                localStorage.removeItem(`${DISMISSED_KEY_PREFIX}${data.id}`)
              } catch (e) {}
            }
          }
        }, (err) => {
          console.warn('[Announcement] Listener error:', err)
        })
      } catch (e) {
        console.warn('[Announcement] Setup error:', e)
      }
    })
  }

  const saveAnnouncement = async (data: Partial<SiteAnnouncement>, authorEmail?: string) => {
    const updated: SiteAnnouncement = {
      ...announcement.value,
      ...data,
      id: data.id || `ann-${Date.now()}`,
      updatedAt: new Date().toISOString(),
      updatedBy: authorEmail || 'Coach Admin'
    }

    announcement.value = updated

    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        localStorage.removeItem(`${DISMISSED_KEY_PREFIX}${updated.id}`)
        dismissedId.value = ''
      } catch (e) {}
    }

    if (db) {
      try {
        const docRef = doc(db, 'settings', 'announcement')
        await setDoc(docRef, updated, { merge: true })
        return true
      } catch (e) {
        console.error('[Announcement] Failed to save in Firestore:', e)
        throw e
      }
    }
    return false
  }

  return {
    announcement,
    isBannerVisible,
    isDismissed,
    isExpired,
    formatExpiresAt,
    dismissAnnouncement,
    saveAnnouncement
  }
}
