export type UpdateStatus = 'draft' | 'published'

export type PracticeStatus = 'scheduled' | 'moved' | 'canceled'

export type AnnouncementType =
  | 'general'
  | 'practice-update'
  | 'schedule-change'
  | 'team-store'
  | 'safety'

export type AnnouncementPriority = 'normal' | 'important' | 'urgent'

export type AttachmentType = 'link' | 'pdf' | 'doc' | 'sheet' | 'form' | 'drive'

export interface Attachment {
  label: string
  url: string
  type: AttachmentType
  icon?: string
}

export interface EventItem {
  id?: string
  title: string
  details: string
  dueDate?: string
  link?: string
}

export interface TeamNote {
  id?: string
  title: string
  body: string
  link?: string
  linkLabel?: string
}

export interface WeeklyUpdate {
  id: string
  weekOf: string // ISO date of the Monday (e.g., '2026-09-14')
  title: string // e.g. "Week 4 Update — Sept 14–18"
  greeting: string // Conversational intro
  practiceDays: string // "Tues / Thurs"
  practiceTime: string // "4:30p - 6:30p"
  practiceLocation: string // "Upper Hixon Trail Head"
  practiceStatus: PracticeStatus
  practiceNote?: string // Note if moved or canceled
  weather?: string // "Upper 70's"
  upcomingEvents: EventItem[]
  teamNotes: TeamNote[]
  closingMessage?: string // "Thanks, Matt"
  attachments?: Attachment[]
  status: UpdateStatus
  emailSent?: boolean
  emailSentAt?: string
  createdAt: string
  updatedAt: string
  updatedBy?: string
  copiedFrom?: string
}

export interface PlanSection {
  id?: string
  time: string // "4:30 - 4:40"
  activity: string // "Check-In & ABC Quick Check"
  details: string // Description
}

export interface RideGroup {
  id?: string
  name: string // "Group A — Advanced Flow"
  coach: string // "Coach Dave (Lead), Coach Sarah (Sweep)"
  trail: string // "Upper Hixon — Blufftop Loop"
  focus: string // "Cornering at speed, body position"
}

export interface PracticePlan {
  id: string
  weekOf: string
  date: string // e.g. "Thursday 9/17/26"
  title: string // "9/17 Practice"
  location: string // "Upper Hixon Forest"
  time: string // "4:30 PM - 6:30 PM"
  objectives: string[]
  materials: string[]
  coachActivities: PlanSection[]
  rideGroups: RideGroup[]
  coolDown?: string
  attachments?: Attachment[]
  status: UpdateStatus
  createdAt: string
  updatedAt: string
  updatedBy?: string
  copiedFrom?: string
}

export interface Announcement {
  id: string
  title: string
  message: string
  type: AnnouncementType
  priority: AnnouncementPriority
  attachments?: Attachment[]
  pinned: boolean
  active: boolean
  sendEmail?: boolean
  emailSent?: boolean
  expiresAt?: string
  createdAt: string
  updatedAt: string
  updatedBy?: string
}

export type ResourceCategory =
  | 'practice-plan'
  | 'skill-drill'
  | 'eap'
  | 'safety'
  | 'reference'

export interface CoachResource {
  id: string
  title: string
  category: ResourceCategory
  description: string
  url: string
  fileType: 'pdf' | 'doc' | 'sheet' | 'link'
  tags: string[]
  updatedAt: string
  updatedBy?: string
}

export interface QuickLink {
  id: string
  label: string
  url: string
  icon: string
  enabled: boolean
  order: number
}

export interface HubConfig {
  googleGroupEmail?: string
  webhookUrl?: string
  updatedAt?: string
  updatedBy?: string
}
