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
  const races = useState<Race[]>('all_races', () => (fallbackEvents as Race[]))
  const currentRaceIndex = useState<number>('current_race_index', () => 0)

  const currentRace = computed(() => races.value[currentRaceIndex.value] || races.value[0])

  const selectRace = (index: number) => {
    if (index >= 0 && index < races.value.length) {
      currentRaceIndex.value = index
    }
  }

  /**
   * Select race by URL slug — matches race id with hyphens removed
   * e.g. slug "bluffbash" matches race.id "bluff-bash"
   */
  const selectRaceBySlug = (slug: string): boolean => {
    const normalized = slug.toLowerCase().replace(/-/g, '')
    const idx = races.value.findIndex(r =>
      r.id.replace(/-/g, '').toLowerCase() === normalized
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

  const updateRace = (updated: Race) => {
    const idx = races.value.findIndex(r => r.id === updated.id)
    if (idx >= 0) {
      races.value[idx] = updated
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
    updateRace
  }
}
