import bbCategoryList from '../data/fixtures/418104_list_category.json'
import bbResultsInd from '../data/fixtures/418104_results_individual.json'
import cableCategoryList from '../data/fixtures/421732_list_category.json'
import { parseUniversalData } from './raceresultService'

export interface CachedResultsEntry {
  time: string
  riders: any[]
  teamStandings: any[]
  viewType: any
  availableReports?: { ID: string; Name: string }[]
  selectedListId?: string
  listMode?: any
  isLive?: boolean
}

export const getFallbackSeedResults = (
  eventId: string,
  page: 'list' | 'results'
): CachedResultsEntry | null => {
  const strId = String(eventId).trim()

  // 1. Bluff Bash (418104)
  if (strId === '418104') {
    if (page === 'list') {
      const parsed = parseUniversalData(bbCategoryList, 'A76F6B', 'list')
      return {
        time: 'Pre-loaded Start List',
        riders: parsed.riders,
        teamStandings: parsed.teamStandings,
        viewType: parsed.viewType,
        selectedListId: 'A76F6B',
        listMode: 'WAVE',
        availableReports: [
          { ID: 'A76F6B', Name: 'Rider List - By Category & Wave' }
        ]
      }
    } else {
      const parsed = parseUniversalData(bbResultsInd, '4C8C1F', 'results')
      return {
        time: 'Pre-loaded Results',
        riders: parsed.riders,
        teamStandings: parsed.teamStandings,
        viewType: parsed.viewType,
        selectedListId: '4C8C1F',
        listMode: 'WAVE',
        availableReports: [
          { ID: '4C8C1F', Name: 'Individual Results - All' }
        ]
      }
    }
  }

  // 2. Cable Conquest (421732)
  if (strId === '421732') {
    if (page === 'list') {
      const parsed = parseUniversalData(cableCategoryList, 'cable_cat', 'list')
      return {
        time: 'Pre-loaded Start List',
        riders: parsed.riders,
        teamStandings: parsed.teamStandings,
        viewType: parsed.viewType,
        selectedListId: 'cable_cat',
        listMode: 'WAVE',
        availableReports: [
          { ID: 'cable_cat', Name: 'Rider List - By Category & Wave' }
        ]
      }
    }
  }

  return null
}
