export interface Rider {
  no: string
  bib: string
  pl?: string
  name: string
  team: string
  category: string
  gender?: string
  wave?: string
  div?: string
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
  stageTime?: string
  startTime?: string
}

export type ResultsSortOrder = 'GRADE' | 'TIME'
export type ResultsGroupMode = 'WAVE' | 'TEAM'
export type TeamScope = 'DEFAULT_TEAMS' | 'ALL' | string
