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

export interface CoachSlot {
  id: string;
  name: string;
  meetingTime: string;
  stagingTime?: string;
  ridersAllowed?: string;
  duration?: string;
  day?: string;
  date?: string;
  subtitle?: string;
  tag?: string;
  tagClass?: string;
  leaders: string[];
  support: string[];
}

export interface PhotoItem {
  url: string;
  w?: number;
  h?: number;
}

export interface WarmupGroup {
  id: string;
  name: string;
  meetingTime: string;
  stagingTime?: string;
  day?: string;
  date?: string;
  subtitle?: string;
  categories: string[];
  ridersAllowed?: string;
  duration?: string;
  tag?: string;
  tagClass?: string;
  leaders: string[];
  support: string[];
}

export interface CoachSignupsData {
  policy?: string;
  preRides?: CoachSlot[];
  warmups?: CoachSlot[];
}

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
  theme?: string;
  isPublished: boolean;
  stagingOffsetMinutes?: number;
  warmupOffsetMinutes?: number;
  signups?: SignUpLinks;
  schedule?: ScheduleDay[];
  guidelines?: string[];
  waveSchedule?: WaveSchedule;
  warmupGroups?: WarmupGroup[];
  photosUrl?: string;
  photos?: PhotoItem[];
  coachSignups?: CoachSignupsData;
}
