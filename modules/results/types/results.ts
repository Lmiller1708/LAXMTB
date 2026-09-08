export interface Rider {
  name: string;
  bib: string;
  no: string;
  team: string;
  category: string;
  wave?: string;
  stageTime?: string;
  startTime?: string;
  rank?: string;
  time?: string;
  gap?: string;
  status?: string;
  laps?: string;
  speed?: string;
}

export type ResultsSortOrder = 'GRADE' | 'TIME';
export type ResultsGroupMode = 'CATEGORY' | 'TEAM';
