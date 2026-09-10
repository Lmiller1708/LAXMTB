import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  type Firestore
} from 'firebase/firestore'
import type { Race } from '../types/race'
import defaultRaces from '../../../events.json'

export function subscribeToRaces(
  db: Firestore,
  onUpdate: (races: Race[]) => void,
  onError?: (err: Error) => void
) {
  const racesRef = collection(db, 'races')
  return onSnapshot(
    racesRef,
    (snapshot) => {
      if (snapshot.empty) {
        console.info('[Firestore] No races found, seeding default data...')
        seedDefaultRaces(db)
        onUpdate(defaultRaces as Race[])
        return
      }

      const racesList: Race[] = []
      snapshot.forEach((docSnap) => {
        const rData = docSnap.data() as Race
        const fallback = (defaultRaces as Race[]).find(f => f.id === rData.id)
        if (fallback && fallback.waveSchedule) {
          rData.waveSchedule = { ...(rData.waveSchedule || {}), ...fallback.waveSchedule }
        }
        racesList.push(rData)
      })

      // Sort by startDate if available
      racesList.sort((a, b) => {
        const da = a.startDate ? new Date(a.startDate).getTime() : 0
        const db = b.startDate ? new Date(b.startDate).getTime() : 0
        return da - db
      })

      onUpdate(racesList)
    },
    (err) => {
      console.error('[Firestore subscribe error]:', err)
      if (onError) onError(err)
    }
  )
}

export async function saveRace(db: Firestore, race: Race): Promise<void> {
  const docRef = doc(db, 'races', race.id)
  await setDoc(docRef, race, { merge: true })
}

/**
 * SEED GUARD: Only writes a race document if it does NOT already exist.
 * This prevents stale events.json data from overwriting live admin-edited records.
 */
export async function seedDefaultRaces(db: Firestore): Promise<void> {
  for (const r of defaultRaces as Race[]) {
    const docRef = doc(db, 'races', r.id)
    const existing = await getDoc(docRef)
    if (!existing.exists()) {
      await setDoc(docRef, r)
      console.info('[Firestore] Seeded new race document:', r.id)
    }
  }
}
