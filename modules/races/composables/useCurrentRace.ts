import { collection, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import type { Race } from '../types/race'
import fallbackEvents from '~/events.json'

/**
 * Slugify a race name for URL routing
 * "Bluff Bash Festival" → "bluffbash"
 * Uses the race's existing `id` field which is already slug-friendly
 */
export const slugifyRaceId = (id: string): string =>
  id.replace(/-/g, '').toLowerCase()

/**
 * Resolve logo URL to always be absolute from root
 * Works on root /, /race/:slug, and nested routes
 */
export const resolveLogoUrl = (logo?: string): string => {
  if (!logo) return ''
  if (logo.startsWith('http://') || logo.startsWith('https://') || logo.startsWith('data:')) return logo
  const clean = logo.replace(/^\/+/, '')
  return `/${clean}`
}

/**
 * Check if a race has already ended
 * Checks race.isEventOver or compares the race date with today
 */
export const isRaceCompleted = (race?: Race | null): boolean => {
  if (!race) return false
  if ((race as any).isEventOver === true) return true
  if (!race.dateStr) return false

  try {
    const parts = race.dateStr.split('-')
    const endPart = (parts.length > 1 ? parts[1] : parts[0]).trim()
    const parsed = new Date(`${endPart} 23:59:59`)
    if (!isNaN(parsed.getTime())) {
      return Date.now() > parsed.getTime()
    }
  } catch (e) {}

  return false
}

export const useCurrentRace = () => {
  const db = useFirestore()
  const races = useState<Race[]>('all_races', () => (fallbackEvents as Race[]))
  const currentRaceIndex = useState<number>('current_race_index', () => 0)
  const isSyncingFirestore = useState<boolean>('races_firestore_syncing', () => false)

  const currentRace = computed(() => races.value[currentRaceIndex.value] || races.value[0])

  /**
   * SEED GUARD: Only writes a race document if it does NOT already exist in Firestore.
   * This prevents events.json from ever overwriting live admin-edited data.
   * Called only when the entire 'races' collection is empty (first-time setup).
   */
  const seedRacesToFirestore = async () => {
    if (!db) return
    try {
      for (const r of fallbackEvents as Race[]) {
        const docRef = doc(db, 'races', r.id)
        const existing = await getDoc(docRef)
        if (!existing.exists()) {
          await setDoc(docRef, r)
          console.info('[Firestore] Seeded new race document:', r.id)
        }
      }
      console.info('[Firestore] Seed complete — existing documents were NOT overwritten')
    } catch (e) {
      console.warn('[Firestore] Could not seed races to Firestore:', e)
    }
  }

  // Subscribe to real-time updates from Firestore
  if (import.meta.client && db) {
    onMounted(() => {
      if (isSyncingFirestore.value) return
      isSyncingFirestore.value = true

      try {
        const racesRef = collection(db, 'races')
        onSnapshot(
          racesRef,
          (snapshot) => {
            if (snapshot.empty) {
              console.info('[Firestore] No races found in Firestore, seeding from events.json...')
              seedRacesToFirestore()
              return
            }

            const list: Race[] = []
            snapshot.forEach((d) => {
              const rData = d.data() as Race
              const fallback = (fallbackEvents as Race[]).find(f => f.id === rData.id)
              if (fallback && fallback.waveSchedule) {
                // Merge fallback waveSchedule to ensure standard categories always reflect official 2026 schedule
                rData.waveSchedule = { ...(rData.waveSchedule || {}), ...fallback.waveSchedule }

                // If Firestore record had stale or missing waveSchedule, sync in background
                if (JSON.stringify(d.data().waveSchedule) !== JSON.stringify(fallback.waveSchedule)) {
                  const docRef = doc(db, 'races', rData.id)
                  setDoc(docRef, { waveSchedule: fallback.waveSchedule }, { merge: true }).catch((err) => {
                    console.warn('[Firestore] Failed to sync updated wave schedule:', err)
                  })
                }
              }
              if (fallback && fallback.coachSignups && !rData.coachSignups) {
                rData.coachSignups = fallback.coachSignups
                const docRef = doc(db, 'races', rData.id)
                setDoc(docRef, { coachSignups: fallback.coachSignups }, { merge: true }).catch((err) => {
                  console.warn('[Firestore] Failed to sync initial coach signups:', err)
                })
              }
              list.push(rData)
            })

            // Sort by order matching fallbackEvents or date
            const idOrder = (fallbackEvents as Race[]).map(r => r.id)
            list.sort((a, b) => {
              const ia = idOrder.indexOf(a.id)
              const ib = idOrder.indexOf(b.id)
              if (ia !== -1 && ib !== -1) return ia - ib
              return (a.id || '').localeCompare(b.id || '')
            })

            races.value = list
          },
          (err) => {
            console.warn('[Firestore] Real-time races subscription error (using fallback events):', err)
          }
        )
      } catch (e) {
        console.warn('[Firestore] Could not attach listener to races:', e)
      }
    })
  }

  const selectRace = (index: number) => {
    if (index >= 0 && index < races.value.length) {
      currentRaceIndex.value = index
    }
  }

  /**
   * Select race by URL slug — matches race id with hyphens removed, numeric index, or name
   * e.g. slug "bluffbash" or "bluff-bash" matches race.id "bluff-bash"
   */
  const selectRaceBySlug = (slug: string): boolean => {
    if (!slug) return false
    const num = parseInt(slug, 10)
    if (!isNaN(num) && num >= 1 && num <= races.value.length) {
      currentRaceIndex.value = num - 1
      return true
    }
    const normalized = slug.toLowerCase().replace(/-/g, '')
    const idx = races.value.findIndex(r =>
      r.id.replace(/-/g, '').toLowerCase() === normalized ||
      r.id.toLowerCase() === slug.toLowerCase() ||
      r.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalized)
    )
    if (idx >= 0) {
      currentRaceIndex.value = idx
      return true
    }
    return false
  }

  /**
   * Get the URL slug for the current race
   * race.id "bluff-bash" → slug "bluffbash"
   */
  const currentRaceSlug = computed(() =>
    slugifyRaceId(currentRace.value?.id || 'race')
  )

  const setRaces = (newRaces: Race[]) => {
    races.value = newRaces
  }

  /**
   * Save race edits to local state AND Firestore
   */
  const updateRace = async (updated: Race) => {
    const idx = races.value.findIndex(r => r.id === updated.id)
    if (idx >= 0) {
      races.value[idx] = updated
    }

    // Persist directly to Firestore
    if (db) {
      try {
        const docRef = doc(db, 'races', updated.id)
        await setDoc(docRef, updated, { merge: true })
        console.info('[Firestore] Saved race to Firestore:', updated.id)
      } catch (e) {
        console.warn('[Firestore] Could not save race to Firestore:', e)
      }
    }
  }

  return {
    races: readonly(races),
    currentRace,
    currentRaceIndex: readonly(currentRaceIndex),
    currentRaceSlug,
    selectRace,
    selectRaceBySlug,
    setRaces,
    updateRace,
    seedRacesToFirestore
  }
}
