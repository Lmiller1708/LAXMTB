import { ref, computed, onMounted } from 'vue'
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import type {
  WeeklyUpdate,
  PracticePlan,
  Announcement,
  CoachResource,
  QuickLink,
  HubConfig,
  EmergencyPlan
} from '../types/hub'
import { useHubEmail } from './useHubEmail'
import { useCoachAuth } from '../../coach-admin/composables/useCoachAuth'

export const DEFAULT_QUICK_LINKS: QuickLink[] = [
  {
    id: 'team-store',
    label: 'Team Store',
    url: 'https://jakroo.com/store-front?storeId=rJtdl49Wxe&titleProp=La%20Crosse%20MTB%20-%20Optional%20Items&bannerProp=https://jakroo.storage.googleapis.com/team_stores_banner/SJOOlN9bxx-09fe9f9a0ae41-blob',
    icon: '🛒',
    enabled: true,
    order: 1
  },
  {
    id: 'league-info',
    label: 'League Info (WI NICA)',
    url: 'https://wisconsinmtb.org/',
    icon: '/logos/nica-logo.png',
    enabled: true,
    order: 2
  },
  {
    id: 'team-photos',
    label: 'Team Photos',
    url: '/race',
    icon: '📸',
    enabled: true,
    order: 3
  },
  {
    id: 'team-docs',
    label: 'Team Handbook & Rules',
    url: 'https://docs.google.com',
    icon: '📄',
    enabled: true,
    order: 4
  }
]

export const DEFAULT_WEEKLY_UPDATE: WeeklyUpdate = {
  id: 'update-sample-week-4',
  weekOf: '2026-09-14',
  title: 'Week 4 Update — Sept 14–18',
  greeting:
    'Good evening LaX MTB Team! Hope everyone had a great weekend! The Cable Conquest was a blast! Now we get a couple weeks off to relax and unwind before heading north to Rhinelander for the Hodag Hustle.\n\nA huge Thank You to all of you who volunteered over the weekend. There are a lot of hands that go into making our festivals so much fun! We cannot do it without all of you who lend a hand.\n\nHead on over to laxmtb.com to check out some great pictures from over the weekend and upload any pictures you would like to share!',
  practiceDays: 'Tues / Thurs',
  practiceTime: '4:30p - 6:30p',
  practiceLocation: 'Upper Hixon Trail Head',
  practiceStatus: 'scheduled',
  weather: "Upper 70's",
  upcomingEvents: [
    {
      id: 'e1',
      title: "Trailwork Monday's",
      details: 'Monday 9/14 5:30 - 7:30pm will be at the Community Trail Farm.'
    },
    {
      id: 'e2',
      title: 'Hodag Hustle (Rhinelander) Festival Camping',
      details: 'Festival camping registration deadline',
      dueDate: 'Thursday 9/24 @ 9:00pm'
    }
  ],
  teamNotes: [
    {
      id: 'n1',
      title: 'Raffle Tickets',
      body: 'Raffle Tickets are still available. Please help out by signing up to sell a stack of 12 tickets. This is an important fundraiser with 50% of ticket sales coming back directly to the La Crosse MTB Team! Prizes are raffled live at the Red Barn State Championship at the end of the season. I will have raffle tickets with me this week after practices. Please grab a stack and help get the rest of these sold!'
    },
    {
      id: 'n2',
      title: 'Jakroo Store',
      body: 'This store is now open for 365 purchases. Any items purchased through the store will receive a 25% discount with code LACMTB26 (ALL CAPS). These items will ship directly to your house.',
      link: 'https://jakroo.com/store-front?storeId=rJtdl49Wxe&titleProp=La%20Crosse%20MTB%20-%20Optional%20Items&bannerProp=https://jakroo.storage.googleapis.com/team_stores_banner/SJOOlN9bxx-09fe9f9a0ae41-blob',
      linkLabel: 'Shop Jakroo Team Store (Code: LACMTB26)'
    }
  ],
  closingMessage: 'Thanks,\nMatt\n--',
  attachments: [
    {
      label: 'Hodag Hustle Camping Guide (Google Drive)',
      url: 'https://drive.google.com',
      type: 'doc'
    }
  ],
  status: 'published',
  createdAt: '2026-09-14T18:00:00.000Z',
  updatedAt: '2026-09-14T18:00:00.000Z',
  updatedBy: 'Matt'
}

export const DEFAULT_PRACTICE_PLAN: PracticePlan = {
  id: 'plan-sample-sept-17',
  weekOf: '2026-09-14',
  date: 'Thursday 9/17/26',
  title: '9/17 Practice — Bike Control & Breathing',
  location: 'Upper Hixon Forest (Rotary Reserve)',
  time: '4:30 PM - 6:30 PM',
  objectives: [
    'Athletes will focus on having fun',
    'Athletes will work on bike control',
    'All will work on breathing control'
  ],
  materials: ['Radios (all coaches tuned to Ch. 3)', 'Cones for start/finish & drills', 'First Aid Kits'],
  coachActivities: [
    {
      id: 'act1',
      time: '4:30 - 4:45 PM',
      activity: 'Check-In & ABC Quick Check',
      details: 'Greet athletes and remind them to check Air, Brakes, and Chain. Distribute attendance clips.'
    },
    {
      id: 'act2',
      time: '4:45 - 5:10 PM',
      activity: 'Dynamic Warm-Up & Skill Clinic',
      details: 'Cornering body position & breathing synchronization drill in the grass field.'
    },
    {
      id: 'act3',
      time: '5:10 - 6:15 PM',
      activity: 'Trail Riding Groups',
      details: 'Trail groups depart with Lead & Sweep coaches. Emphasize breathing and line choice.'
    },
    {
      id: 'act4',
      time: '6:15 - 6:30 PM',
      activity: 'Wrap-Up & Check-Out',
      details: 'All groups regroup at trailhead for high-fives and parent pickup.'
    }
  ],
  rideGroups: [
    {
      id: 'rg1',
      name: 'Advanced Group (Varsity / JV2)',
      coach: 'Coach Matt (Lead) & Coach Dave (Sweep)',
      trail: 'Blufftop Singletrack to Lower Switchbacks',
      focus: 'High speed cornering and recovery breathing'
    },
    {
      id: 'rg2',
      name: 'Progression Group (Middle School / Freshmen)',
      coach: 'Coach Sarah (Lead) & Coach Mike (Sweep)',
      trail: 'Upper Flow Loops & Vista Rollers',
      focus: 'Neutral position & pedal ratcheting'
    }
  ],
  coolDown: 'High fives, hydration check, and remind riders about Monday trailwork!',
  coachDebrief: '',
  attachments: [],
  status: 'published',
  createdAt: '2026-09-16T12:00:00.000Z',
  updatedAt: '2026-09-16T12:00:00.000Z',
  updatedBy: 'Matt'
}

export const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Raffle Ticket Sales are Live!',
    message:
      'Please remember to pick up a stack of 12 raffle tickets after practice this week. 50% of all ticket sales return directly to fund our team equipment, coaching licenses, and trail tools.',
    type: 'general',
    priority: 'important',
    pinned: true,
    active: true,
    createdAt: '2026-09-15T10:00:00.000Z',
    updatedAt: '2026-09-15T10:00:00.000Z'
  },
  {
    id: 'ann-2',
    title: 'Trailwork Session at CTF this Monday',
    message:
      'Community Trail Farm trail maintenance session this Monday from 5:30 to 7:30 PM. Bring sturdy shoes, work gloves, and water. Open to all athletes and parents!',
    type: 'general',
    priority: 'normal',
    pinned: false,
    active: true,
    createdAt: '2026-09-14T08:00:00.000Z',
    updatedAt: '2026-09-14T08:00:00.000Z'
  }
]

export const DEFAULT_COACH_RESOURCES: CoachResource[] = [
  {
    id: 'res-1',
    title: 'Upper Hixon Emergency Action Plan (EAP)',
    category: 'eap',
    description: 'Emergency access points, Rotary Reserve staging coordinates, trail intersections, and 911 dispatch directions.',
    url: 'https://drive.google.com',
    fileType: 'pdf',
    tags: ['EAP', 'Upper Hixon', 'Emergency', 'Safety'],
    updatedAt: '2026-08-01T00:00:00.000Z',
    updatedBy: 'Safety Coordinator'
  },
  {
    id: 'res-2',
    title: 'Lower Hixon Emergency Action Plan (EAP)',
    category: 'eap',
    description: 'Milson Park bluff pass emergency evacuation route and ambulance staging location.',
    url: 'https://drive.google.com',
    fileType: 'pdf',
    tags: ['EAP', 'Lower Hixon', 'Emergency'],
    updatedAt: '2026-08-01T00:00:00.000Z',
    updatedBy: 'Safety Coordinator'
  },
  {
    id: 'res-3',
    title: 'Community Trail Farm (CTF) EAP & Gate Access',
    category: 'eap',
    description: 'Pammel Creek bike-in access, locked gate combinations, and HWY 33 emergency vehicle entry.',
    url: 'https://drive.google.com',
    fileType: 'pdf',
    tags: ['EAP', 'CTF', 'Shelby', 'Emergency'],
    updatedAt: '2026-08-01T00:00:00.000Z',
    updatedBy: 'Safety Coordinator'
  },
  {
    id: 'res-4',
    title: 'NICA On-Trail Cornering & Body Position Drills',
    category: 'skill-drill',
    description: 'Step-by-step coaching clinic on dynamic cornering, brake modulation, and looking through the turn.',
    url: 'https://drive.google.com',
    fileType: 'doc',
    tags: ['Skills', 'Cornering', 'Drills'],
    updatedAt: '2026-08-15T00:00:00.000Z',
    updatedBy: 'Head Coach'
  },
  {
    id: 'res-5',
    title: 'Coach Radio Protocol & Incident Reporting',
    category: 'safety',
    description: 'Standard operating procedures for walkie-talkie channel assignments and incident forms.',
    url: 'https://drive.google.com',
    fileType: 'pdf',
    tags: ['Safety', 'Radios', 'Protocols'],
    updatedAt: '2026-08-10T00:00:00.000Z',
    updatedBy: 'Head Coach'
  }
]

export const DEFAULT_EMERGENCY_PLANS: EmergencyPlan[] = [
  {
    id: 'eap-upper-hixon',
    location: 'Upper Hixon Forest',
    badge: 'Rotary Reserve',
    description: '2500 Coulee Dr • Primary Blufftop access & emergency ambulance pad.',
    docUrl: 'https://drive.google.com',
    order: 1
  },
  {
    id: 'eap-lower-hixon',
    location: 'Lower Hixon Forest',
    badge: 'Milson Park',
    description: '2799 Bluff Pass • Tech ascents & lower forest evacuation point.',
    docUrl: 'https://drive.google.com',
    order: 2
  },
  {
    id: 'eap-ctf',
    location: 'Community Trail Farm (CTF)',
    badge: 'Shelby',
    description: 'W5723 HWY 33 • Pammel Creek access & private farm emergency gate.',
    docUrl: 'https://drive.google.com',
    order: 3
  },
  {
    id: 'eap-chad-erickson',
    location: 'Chad Erickson Memorial Park',
    badge: 'Skills Field',
    description: '3601 S 28th St • Open field & beginner cornering loops access.',
    docUrl: 'https://drive.google.com',
    order: 4
  }
]

export const useHubData = () => {
  const db = useFirestore()
  const { user, isAdminCoach, isGuardianOrAbove, isAuthorizedCoach } = useCoachAuth()
  const { sendEmailToGroup, formatWeeklyUpdateEmailHtml, formatAnnouncementEmailHtml } = useHubEmail()

  const getCached = <T>(key: string, fallback: T): T => {
    if (import.meta.client) {
      try {
        const raw = localStorage.getItem(key)
        if (raw) return JSON.parse(raw)
      } catch (e) {}
    }
    return fallback
  }

  const setCached = (key: string, data: any) => {
    if (import.meta.client) {
      try {
        localStorage.setItem(key, JSON.stringify(data))
      } catch (e) {}
    }
  }

  const weeklyUpdates = useState<WeeklyUpdate[]>('hub_weekly_updates', () =>
    getCached('cached_hub_weekly_updates', [DEFAULT_WEEKLY_UPDATE])
  )
  const practicePlans = useState<PracticePlan[]>('hub_practice_plans', () =>
    getCached('cached_hub_practice_plans', [DEFAULT_PRACTICE_PLAN])
  )
  const announcements = useState<Announcement[]>('hub_announcements', () =>
    getCached('cached_hub_announcements', DEFAULT_ANNOUNCEMENTS)
  )
  const coachResources = useState<CoachResource[]>('hub_coach_resources', () =>
    getCached('cached_hub_coach_resources', DEFAULT_COACH_RESOURCES)
  )
  const emergencyPlans = useState<EmergencyPlan[]>('hub_emergency_plans', () =>
    getCached('cached_hub_emergency_plans', DEFAULT_EMERGENCY_PLANS)
  )
  const quickLinks = useState<QuickLink[]>('hub_quick_links', () => DEFAULT_QUICK_LINKS)
  const hubConfig = useState<HubConfig>('hub_config', () => ({
    googleGroupEmail: 'lax-mtb-team@googlegroups.com',
    webhookUrl: ''
  }))

  const isLoading = useState<boolean>('hub_data_loading', () => false)

  // Current Week Update (latest published)
  const currentWeekUpdate = computed<WeeklyUpdate | null>(() => {
    const list = weeklyUpdates.value.filter((u) => u.status === 'published' || isAdminCoach.value)
    if (!list.length) return weeklyUpdates.value[0] || null
    return list[0]
  })

  // Past Updates archive (published updates excluding the top one)
  const pastUpdates = computed<WeeklyUpdate[]>(() => {
    const list = weeklyUpdates.value.filter((u) => u.status === 'published')
    if (list.length <= 1) return []
    return list.slice(1)
  })

  // Current Practice Plan (latest)
  const currentPracticePlan = computed<PracticePlan | null>(() => {
    const list = practicePlans.value.filter((p) => p.status === 'published' || isAdminCoach.value)
    if (!list.length) return practicePlans.value[0] || null
    return list[0]
  })

  // Past Practice Plans archive
  const pastPracticePlans = computed<PracticePlan[]>(() => {
    const list = practicePlans.value.filter((p) => p.status === 'published')
    if (list.length <= 1) return []
    return list.slice(1)
  })

  // Active announcements sorted by pinned first, then date desc
  const activeAnnouncements = computed<Announcement[]>(() => {
    const now = Date.now()
    return announcements.value
      .filter((a) => {
        if (!a.active) return false
        if (a.expiresAt) {
          const exp = new Date(a.expiresAt).getTime()
          if (!isNaN(exp) && exp > 0 && now >= exp) return false
        }
        return true
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  })

  // Practice update announcements (surfaced in both Team Zone and Coaches Corner)
  const practiceUpdateAnnouncements = computed<Announcement[]>(() => {
    return activeAnnouncements.value.filter(
      (a) => a.type === 'practice-update' || a.type === 'schedule-change'
    )
  })

  // Active quick links sorted by order
  const activeQuickLinks = computed<QuickLink[]>(() => {
    return [...quickLinks.value]
      .filter((l) => l.enabled)
      .map((l) => {
        if (l.id === 'league-info' && (!l.icon || l.icon === '🏔️')) {
          return { ...l, icon: '/logos/nica-logo.png' }
        }
        return l
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  })

  // --- Real-time Firestore Sync ---
  const initFirestoreSync = () => {
    if (!import.meta.client || !db) return

    try {
      // 1. Weekly Updates
      const wuQuery = query(collection(db, 'weeklyUpdates'), orderBy('weekOf', 'desc'))
      onSnapshot(
        wuQuery,
        (snap) => {
          if (!snap.empty) {
            const list: WeeklyUpdate[] = []
            snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }))
            weeklyUpdates.value = list
          }
        },
        (err) => console.warn('[useHubData] weeklyUpdates listener err:', err)
      )

      // 2. Practice Plans
      const ppQuery = query(collection(db, 'practicePlans'), orderBy('weekOf', 'desc'))
      onSnapshot(
        ppQuery,
        (snap) => {
          if (!snap.empty) {
            const list: PracticePlan[] = []
            snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }))
            practicePlans.value = list
          }
        },
        (err) => console.warn('[useHubData] practicePlans listener err:', err)
      )

      // 3. Announcements
      const annQuery = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'))
      onSnapshot(
        annQuery,
        (snap) => {
          if (!snap.empty) {
            const list: Announcement[] = []
            snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }))
            announcements.value = list
          }
        },
        (err) => console.warn('[useHubData] announcements listener err:', err)
      )

      // 4. Coach Resources
      onSnapshot(
        collection(db, 'coachResources'),
        (snap) => {
          if (!snap.empty) {
            const list: CoachResource[] = []
            snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }))
            coachResources.value = list
          }
        },
        (err) => console.warn('[useHubData] coachResources listener err:', err)
      )

      // 5. Quick Links in settings/hubQuickLinks
      onSnapshot(
        doc(db, 'settings', 'hubQuickLinks'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data()
            if (Array.isArray(data?.links)) {
              quickLinks.value = data.links
            }
          }
        },
        (err) => console.warn('[useHubData] hubQuickLinks listener err:', err)
      )

      // 6. Hub Config in settings/hubConfig
      onSnapshot(
        doc(db, 'settings', 'hubConfig'),
        (snap) => {
          if (snap.exists()) {
            hubConfig.value = { ...hubConfig.value, ...(snap.data() as HubConfig) }
          }
        },
        (err) => console.warn('[useHubData] hubConfig listener err:', err)
      )

      // 7. Emergency Action Plans in settings/hubEmergencyPlans
      onSnapshot(
        doc(db, 'settings', 'hubEmergencyPlans'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data()
            if (Array.isArray(data?.plans) && data.plans.length) {
              emergencyPlans.value = data.plans
              setCached('cached_hub_emergency_plans', data.plans)
            }
          }
        },
        (err) => console.warn('[useHubData] hubEmergencyPlans listener err:', err)
      )
    } catch (e) {
      console.warn('[useHubData] Error initializing Firestore listeners:', e)
    }
  }

  // --- Duplicate Helpers (Week-to-Week Cloning) ---

  // --- Helpers ---
  const cleanForFirestore = <T extends Record<string, any>>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj))
  }

  // --- Duplicate Helpers (Week-to-Week Cloning) ---

  const addDaysToIso = (isoStr: string, days: number): string => {
    try {
      const d = new Date(isoStr)
      if (isNaN(d.getTime())) return isoStr
      d.setDate(d.getDate() + days)
      return d.toISOString().split('T')[0]
    } catch {
      return isoStr
    }
  }

  /**
   * Clone previous week update as a new draft, advancing date by 7 days
   */
  const duplicateWeeklyUpdate = (sourceId?: string): WeeklyUpdate => {
    const source = sourceId
      ? weeklyUpdates.value.find((u) => u.id === sourceId) || weeklyUpdates.value[0]
      : weeklyUpdates.value[0] || DEFAULT_WEEKLY_UPDATE

    const nextWeekOf = addDaysToIso(source.weekOf, 7)
    const newId = `update-${Date.now()}`

    return {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      weekOf: nextWeekOf,
      title: `Next Week Update — Week of ${nextWeekOf}`,
      status: 'draft',
      emailSent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: user.value?.displayName || user.value?.email || 'Admin',
      copiedFrom: source.id
    }
  }

  const duplicatePracticePlan = (sourceId?: string): PracticePlan => {
    const source = sourceId
      ? practicePlans.value.find((p) => p.id === sourceId) || practicePlans.value[0]
      : practicePlans.value[0] || DEFAULT_PRACTICE_PLAN

    const nextWeekOf = addDaysToIso(source.weekOf, 7)
    const newId = `plan-${Date.now()}`

    return {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      weekOf: nextWeekOf,
      title: `Practice Plan — Week of ${nextWeekOf}`,
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: user.value?.displayName || user.value?.email || 'Coach',
      copiedFrom: source.id
    }
  }

  // --- CRUD Operations ---

  const saveWeeklyUpdate = async (
    item: WeeklyUpdate,
    publishAndEmail = false
  ): Promise<{ success: boolean; emailSent?: boolean; error?: string }> => {
    const toSave: WeeklyUpdate = cleanForFirestore({
      ...item,
      id: item.id || `update-${Date.now()}`,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: user.value?.displayName || user.value?.email || 'Coach'
    })

    if (publishAndEmail) {
      toSave.status = 'published'
    }

    // Update local state and cache immediately so coach edits are never lost
    const idx = weeklyUpdates.value.findIndex((u) => u.id === toSave.id)
    if (idx >= 0) {
      weeklyUpdates.value[idx] = toSave
    } else {
      weeklyUpdates.value.unshift(toSave)
    }
    setCached('cached_hub_weekly_updates', weeklyUpdates.value)

    let emailSentResult = false

    if (publishAndEmail && !toSave.emailSent) {
      try {
        const emailHtml = formatWeeklyUpdateEmailHtml(toSave)
        const emailRes = await sendEmailToGroup({
          subject: `LAX MTB Team // ${toSave.title}`,
          htmlBody: emailHtml,
          textBody: `${toSave.title}\n\n${toSave.greeting}\n\nPractice: ${toSave.practiceDays} ${toSave.practiceTime} at ${toSave.practiceLocation}\n\nRead more at https://laxmtb.com/hub`
        })
        if (emailRes.success) {
          toSave.emailSent = true
          toSave.emailSentAt = new Date().toISOString()
          emailSentResult = true
        }
      } catch (err) {
        console.warn('[useHubData] Email send failed during weekly update publish:', err)
      }
    }

    if (!db) {
      return { success: true, emailSent: emailSentResult }
    }

    try {
      await setDoc(doc(db, 'weeklyUpdates', toSave.id), toSave, { merge: true })
      return { success: true, emailSent: emailSentResult }
    } catch (e: any) {
      console.error('[useHubData] saveWeeklyUpdate error:', e)
      return { success: false, error: e.message || 'Failed to save weekly update' }
    }
  }

  const savePracticePlan = async (
    item: PracticePlan
  ): Promise<{ success: boolean; error?: string }> => {
    const toSave: PracticePlan = cleanForFirestore({
      ...item,
      id: item.id || `plan-${Date.now()}`,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: user.value?.displayName || user.value?.email || 'Coach'
    })

    // Update local state and cache immediately so coach edits are never lost
    const idx = practicePlans.value.findIndex((p) => p.id === toSave.id)
    if (idx >= 0) {
      practicePlans.value[idx] = toSave
    } else {
      practicePlans.value.unshift(toSave)
    }
    setCached('cached_hub_practice_plans', practicePlans.value)

    if (!db) {
      return { success: true }
    }

    try {
      await setDoc(doc(db, 'practicePlans', toSave.id), toSave, { merge: true })
      return { success: true }
    } catch (e: any) {
      console.error('[useHubData] savePracticePlan error:', e)
      return { success: false, error: e.message || 'Failed to save practice plan' }
    }
  }

  const saveAnnouncement = async (
    item: Announcement,
    dispatchEmail = false
  ): Promise<{ success: boolean; emailSent?: boolean; error?: string }> => {
    const toSave: Announcement = cleanForFirestore({
      ...item,
      id: item.id || `ann-${Date.now()}`,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: user.value?.displayName || user.value?.email || 'Coach'
    })

    // Update local state and cache immediately
    const idx = announcements.value.findIndex((a) => a.id === toSave.id)
    if (idx >= 0) {
      announcements.value[idx] = toSave
    } else {
      announcements.value.unshift(toSave)
    }
    setCached('cached_hub_announcements', announcements.value)

    let emailSentResult = false

    if (dispatchEmail || (toSave.sendEmail && !toSave.emailSent)) {
      try {
        const emailHtml = formatAnnouncementEmailHtml(toSave)
        const emailRes = await sendEmailToGroup({
          subject: `LAX MTB Announcement // ${toSave.title}`,
          htmlBody: emailHtml,
          textBody: `${toSave.title}\n\n${toSave.message}\n\nhttps://laxmtb.com/hub`
        })
        if (emailRes.success) {
          toSave.emailSent = true
          emailSentResult = true
        }
      } catch (err) {
        console.warn('[useHubData] Email send failed during announcement publish:', err)
      }
    }

    if (!db) {
      return { success: true, emailSent: emailSentResult }
    }

    try {
      await setDoc(doc(db, 'announcements', toSave.id), toSave, { merge: true })
      return { success: true, emailSent: emailSentResult }
    } catch (e: any) {
      console.error('[useHubData] saveAnnouncement error:', e)
      return { success: false, error: e.message || 'Failed to save announcement' }
    }
  }

  const saveCoachResource = async (
    item: CoachResource
  ): Promise<{ success: boolean; error?: string }> => {
    const toSave: CoachResource = cleanForFirestore({
      ...item,
      id: item.id || `res-${Date.now()}`,
      updatedAt: new Date().toISOString(),
      updatedBy: user.value?.displayName || user.value?.email || 'Coach'
    })

    const idx = coachResources.value.findIndex((r) => r.id === toSave.id)
    if (idx >= 0) {
      coachResources.value[idx] = toSave
    } else {
      coachResources.value.unshift(toSave)
    }
    setCached('cached_hub_coach_resources', coachResources.value)

    if (!db) {
      return { success: true }
    }

    try {
      await setDoc(doc(db, 'coachResources', toSave.id), toSave, { merge: true })

      const idx = coachResources.value.findIndex((r) => r.id === toSave.id)
      if (idx >= 0) {
        coachResources.value[idx] = toSave
      } else {
        coachResources.value.unshift(toSave)
      }

      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to save coach resource' }
    }
  }

  const saveQuickLinks = async (
    links: QuickLink[]
  ): Promise<{ success: boolean; error?: string }> => {
    if (!db) return { success: false, error: 'Database unavailable' }

    try {
      await setDoc(doc(db, 'settings', 'hubQuickLinks'), {
        links,
        updatedAt: new Date().toISOString(),
        updatedBy: user.value?.email || 'Admin'
      })
      quickLinks.value = links
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to save quick links' }
    }
  }

  const saveHubConfig = async (
    config: HubConfig
  ): Promise<{ success: boolean; error?: string }> => {
    if (!db) return { success: false, error: 'Database unavailable' }

    try {
      await setDoc(
        doc(db, 'settings', 'hubConfig'),
        {
          ...config,
          updatedAt: new Date().toISOString(),
          updatedBy: user.value?.email || 'Admin'
        },
        { merge: true }
      )
      hubConfig.value = { ...hubConfig.value, ...config }
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to save hub configuration' }
    }
  }

  const saveEmergencyPlans = async (
    plans: EmergencyPlan[]
  ): Promise<{ success: boolean; error?: string }> => {
    const cleaned = cleanForFirestore(plans)
    emergencyPlans.value = cleaned
    setCached('cached_hub_emergency_plans', cleaned)

    if (!db) return { success: true }

    try {
      await setDoc(
        doc(db, 'settings', 'hubEmergencyPlans'),
        {
          plans: cleaned,
          updatedAt: new Date().toISOString(),
          updatedBy: user.value?.email || 'Coach'
        },
        { merge: true }
      )
      return { success: true }
    } catch (e: any) {
      console.error('[useHubData] saveEmergencyPlans error:', e)
      return { success: false, error: e.message || 'Failed to save emergency action plans' }
    }
  }

  const deleteHubItem = async (
    collectionName: 'weeklyUpdates' | 'practicePlans' | 'announcements' | 'coachResources',
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!db) return { success: false, error: 'Database unavailable' }

    try {
      await deleteDoc(doc(db, collectionName, id))

      if (collectionName === 'weeklyUpdates') {
        weeklyUpdates.value = weeklyUpdates.value.filter((i) => i.id !== id)
      } else if (collectionName === 'practicePlans') {
        practicePlans.value = practicePlans.value.filter((i) => i.id !== id)
      } else if (collectionName === 'announcements') {
        announcements.value = announcements.value.filter((i) => i.id !== id)
      } else if (collectionName === 'coachResources') {
        coachResources.value = coachResources.value.filter((i) => i.id !== id)
      }

      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to delete item' }
    }
  }

  // Auto-init on mount
  if (import.meta.client) {
    onMounted(() => {
      initFirestoreSync()
    })
  }

  return {
    weeklyUpdates,
    currentWeekUpdate,
    pastUpdates,
    practicePlans,
    currentPracticePlan,
    pastPracticePlans,
    announcements,
    activeAnnouncements,
    practiceUpdateAnnouncements,
    coachResources,
    emergencyPlans,
    quickLinks,
    activeQuickLinks,
    hubConfig,
    isLoading,
    duplicateWeeklyUpdate,
    duplicatePracticePlan,
    saveWeeklyUpdate,
    savePracticePlan,
    saveAnnouncement,
    saveCoachResource,
    saveEmergencyPlans,
    saveQuickLinks,
    saveHubConfig,
    deleteHubItem
  }
}
