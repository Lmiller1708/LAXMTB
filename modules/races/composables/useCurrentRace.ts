import type { Race } from '../types/race'
import fallbackEvents from '~/events.json'

export const useCurrentRace = () => {
  const races = useState<Race[]>('all_races', () => (fallbackEvents as Race[]))
  const currentRaceIndex = useState<number>('current_race_index', () => 0)

  const currentRace = computed(() => races.value[currentRaceIndex.value] || races.value[0])

  const selectRace = (index: number) => {
    if (index >= 0 && index < races.value.length) {
      currentRaceIndex.value = index
    }
  }

  const setRaces = (newRaces: Race[]) => {
    races.value = newRaces
  }

  return {
    races: readonly(races),
    currentRace,
    currentRaceIndex: readonly(currentRaceIndex),
    selectRace,
    setRaces
  }
}
