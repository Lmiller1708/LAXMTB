import { ref, onMounted } from 'vue'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import { compressImage } from '../utils/imageCompressor'

export interface LeaderMember {
  id: string
  name: string
  role: string
  image: string
  desc: string
}

export const LEADERSHIP_STORAGE_KEY = 'laxmtb_site_leaders_v3'

export function useSiteLeadership() {
  const db = useFirestore()
  const leaders = useState<LeaderMember[]>('site_leadership_list', () => {
    if (import.meta.client) {
      try {
        const cached = localStorage.getItem(LEADERSHIP_STORAGE_KEY)
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
        const leaderDoc = doc(db, 'settings', 'leadership')
        onSnapshot(leaderDoc, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data()
            if (Array.isArray(data?.leaders)) {
              leaders.value = data.leaders
              try {
                localStorage.setItem(LEADERSHIP_STORAGE_KEY, JSON.stringify(data.leaders))
              } catch (e) {}
            } else {
              leaders.value = []
            }
          } else {
            leaders.value = []
          }
          isLoaded.value = true
        }, (err) => {
          console.warn('[useSiteLeadership] Firestore listener warning:', err)
          isLoaded.value = true
        })
      } catch (e) {
        console.warn('[useSiteLeadership] Setup error:', e)
      }
    })
  }

  const saveLeaders = async (newLeaders: LeaderMember[]) => {
    // Sanitize any large base64 portraits so total collection document stays well within 1MB
    const sanitizedLeaders = await Promise.all(newLeaders.map(async (l) => {
      if (l.image && typeof l.image === 'string' && l.image.startsWith('data:image') && l.image.length > 200 * 1024) {
        try {
          const comp = await compressImage(l.image, 600, 600, 0.82, true)
          return { ...l, image: comp }
        } catch {
          return l
        }
      }
      return l
    }))

    leaders.value = [...sanitizedLeaders]
    if (import.meta.client) {
      try {
        localStorage.setItem(LEADERSHIP_STORAGE_KEY, JSON.stringify(leaders.value))
      } catch (e) {}
    }

    if (db) {
      try {
        const leaderDoc = doc(db, 'settings', 'leadership')
        await Promise.race([
          setDoc(leaderDoc, { leaders: leaders.value, updatedAt: new Date().toISOString() }, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Save leaders timed out (10s)')), 10000))
        ])
        return true
      } catch (e) {
        console.error('[useSiteLeadership] Failed to save in Firestore:', e)
        throw e
      }
    }
    return false
  }

  const updateLeader = async (leaderOrId: string | LeaderMember, maybeFields?: Partial<LeaderMember>) => {
    let next: LeaderMember[]
    if (typeof leaderOrId === 'string') {
      next = leaders.value.map(item => item.id === leaderOrId ? { ...item, ...(maybeFields || {}) } : item)
    } else {
      next = leaders.value.map(item => item.id === leaderOrId.id ? { ...item, ...leaderOrId } : item)
    }
    return await saveLeaders(next)
  }

  const addLeader = async (newMember: Partial<LeaderMember>) => {
    const id = (newMember as any).id || `leader_${Date.now()}`
    const next = [...leaders.value, {
      id,
      name: newMember.name || '',
      role: newMember.role || '',
      photoKey: newMember.photoKey || '',
      image: newMember.image || '',
      desc: newMember.desc || ''
    }]
    return await saveLeaders(next)
  }

  const removeLeader = async (id: string) => {
    const next = leaders.value.filter(item => item.id !== id)
    return await saveLeaders(next)
  }

  return {
    leaders,
    isLoaded,
    saveLeaders,
    updateLeader,
    addLeader,
    removeLeader
  }
}
