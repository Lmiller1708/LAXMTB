export interface ScheduleEvent {
  time: string;
  desc: string;
  tag?: string | null;
  isSpecial?: boolean;
  isRace?: boolean;
}

export interface ScheduleDay {
  day: string;
  date: string;
  subtitle?: string;
  isoDate?: string;
  isRaceDay?: boolean;
  events: ScheduleEvent[];
}

export interface SignUpLinks {
  volunteer?: string | null;
  food?: string | null;
  league?: string | null;
  photos?: string | null;
}

export interface WaveTime {
  start?: string;
  stage?: string;
}

export type WaveSchedule = Record<string, Record<string, WaveTime>>;

export interface Race {
  id: string;
  name: string;
  dateStr: string;
  venue: string;
  exactTrailhead: string;
  address: string;
  city: string;
  warning?: string;
  googleMapsUrl?: string;
  appleMapsUrl?: string;
  navigationUrl?: string;
  eventGuideUrl?: string;
  embedMapUrl?: string | null;
  fullMapUrl?: string;
  conference?: string;
  logo: string;
  eventId?: number | string | null;
  isPublished: boolean;
  signups?: SignUpLinks;
  schedule?: ScheduleDay[];
  guidelines?: string[];
  waveSchedule?: WaveSchedule;
  photosUrl?: string;
}
