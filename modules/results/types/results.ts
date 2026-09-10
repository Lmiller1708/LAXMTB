export type ResultsSortOrder = 'GRADE' | 'TIME'
export type ResultsGroupMode = 'WAVE' | 'TEAM'
export type TeamScope = 'DEFAULT_TEAMS' | 'ALL' | string
export type FeedViewType =
  | 'category_start_list'
  | 'team_start_list'
  | 'individual_results'
  | 'individual_results_by_team'
  | 'team_standings'

export interface BaseRider {
  id?: string
  no: string
  bib: string
  name: string
  team: string
  category: string
  gender?: string
  div?: string
}

export interface StartListEntry extends BaseRider {
  waveOrField?: string
  waveOrFieldType?: 'wave' | 'field'
  waveOrFieldNum?: string
  seedingRank?: string
  seriesRank?: string
  stageTime?: string
  startTime?: string
}

export interface IndividualResult extends BaseRider {
  pl?: string
  rank?: string
  status?: 'OK' | 'DNF' | 'DNS' | 'DQ' | string
  laps?: string[]
  lap1?: string
  lap2?: string
  lap3?: string
  lap4?: string
  penalty?: string
  totalTime?: string
  avgLap?: string
  points?: string
}

export interface TeamStanding {
  rank: string
  team: string
  division: string
  points: string
  penaltyPoints?: string
}

/**
 * Unified application Rider record consumed by the UI.
 * Combines start-list, individual-result, and display properties.
 */
export interface Rider extends BaseRider {
  pl?: string
  wave?: string
  waveOrField?: string
  waveOrFieldType?: 'wave' | 'field'
  waveOrFieldNum?: string
  seedingRank?: string
  seriesRank?: string
  wv?: string
  wv_rank?: string
  return_val?: string
  laps?: string[]
  lap1?: string
  lap2?: string
  lap3?: string
  lap4?: string
  penalty?: string
  totalTime?: string
  avgLap?: string
  points?: string
  status?: string
  stageTime?: string
  startTime?: string
}

export interface ParsedFeedResult {
  viewType: FeedViewType
  riders: Rider[]
  teamStandings: TeamStanding[]
  isEmpty: boolean
  rawCount: number
  feedTitle?: string
}
