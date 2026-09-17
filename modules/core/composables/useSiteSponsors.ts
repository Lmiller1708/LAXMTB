import { ref, onMounted } from 'vue'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import { compressImage } from '../utils/imageCompressor'

export interface SiteSponsor {
  id: string
  name: string
  logoUrl: string
  websiteUrl?: string
}

export const SPONSORS_STORAGE_KEY = 'laxmtb_site_sponsors_v3'

export function useSiteSponsors() {
  const db = useFirestore()
  const sponsors = useState<SiteSponsor[]>('site_sponsors_list', () => {
    if (import.meta.client) {
      try {
        const cached = localStorage.getItem(SPONSORS_STORAGE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed)) return parsed
        }
      } catch (e) {}
    }
    return []
  })

  const isLoaded = ref(false)

  // Real-time Firestore sync
  if (import.meta.client && db) {
    onMounted(() => {
      try {
        const sponsorDoc = doc(db, 'settings', 'sponsors')
        onSnapshot(sponsorDoc, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data()
            if (Array.isArray(data?.sponsors)) {
              sponsors.value = data.sponsors
              try {
                localStorage.setItem(SPONSORS_STORAGE_KEY, JSON.stringify(data.sponsors))
              } catch (e) {}
            } else {
              sponsors.value = []
            }
          } else {
            sponsors.value = []
          }
          isLoaded.value = true
        }, (err) => {
          console.warn('[useSiteSponsors] Firestore listener warning:', err)
          isLoaded.value = true
        })
      } catch (e) {
        console.warn('[useSiteSponsors] Setup error:', e)
      }
    })
  }

  const saveSponsors = async (newSponsors: SiteSponsor[]) => {
    // Sanitize any large base64 logos so aggregate document stays well within 1MB
    const sanitizedSponsors = await Promise.all(newSponsors.map(async (s) => {
      if (s.logoUrl && typeof s.logoUrl === 'string' && s.logoUrl.startsWith('data:image') && s.logoUrl.length > 200 * 1024) {
        try {
          const comp = await compressImage(s.logoUrl, 600, 600, 0.82, false)
          return { ...s, logoUrl: comp }
        } catch {
          return s
        }
      }
      return s
    }))

    sponsors.value = [...sanitizedSponsors]
    if (import.meta.client) {
      try {
        localStorage.setItem(SPONSORS_STORAGE_KEY, JSON.stringify(sponsors.value))
      } catch (e) {}
    }

    if (db) {
      try {
        const sponsorDoc = doc(db, 'settings', 'sponsors')
        await Promise.race([
          setDoc(sponsorDoc, { sponsors: sponsors.value, updatedAt: new Date().toISOString() }, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Save sponsors timed out (10s)')), 10000))
        ])
        return true
      } catch (e) {
        console.error('[useSiteSponsors] Failed to save in Firestore:', e)
        throw e
      }
    }
    return false
  }

  const addSponsor = async (newSponsor: Omit<SiteSponsor, 'id'>) => {
    const id = 'sponsor-' + Date.now()
    const next = [...sponsors.value, { ...newSponsor, id }]
    return await saveSponsors(next)
  }

  const updateSponsor = async (id: string, updatedFields: Partial<SiteSponsor>) => {
    const next = sponsors.value.map(s => s.id === id ? { ...s, ...updatedFields } : s)
    return await saveSponsors(next)
  }

  const removeSponsor = async (id: string) => {
    const next = sponsors.value.filter(s => s.id !== id)
    return await saveSponsors(next)
  }

  return {
    sponsors,
    isLoaded,
    saveSponsors,
    addSponsor,
    updateSponsor,
    removeSponsor
  }
}
