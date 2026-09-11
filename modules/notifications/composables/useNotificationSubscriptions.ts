import {
  getWaveScheduleEntry,
  getWaveWarmupTime,
  parseTimeStrToMinutes
} from '~/modules/results/services/raceresultService'
import type { Race } from '~/modules/races/types/race'
import { useCurrentUser, useFirestore } from 'vuefire'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export interface NotifConfig {
  offset: number
  sound: boolean
  target: 'warmup' | 'stage' | 'start'
  warmupOffset: number
}

export interface SubscribedRideGroup {
  id: string
  name: string
  sessionType: 'wu' | 'pr'
  meetingTime: string
  stagingTime?: string
  startTime?: string
  day?: string
  date?: string
  categories?: string[]
  raceId?: string
}

export const useNotificationSubscriptions = () => {
  const user = useCurrentUser()
  const db = useFirestore()
  const isSyncing = useState<boolean>('notif_is_syncing', () => false)
  const lastSyncedUid = useState<string | null>('notif_last_synced_uid', () => null)

  const notifConfig = useState<NotifConfig>('laxmtb_notif_config', () => ({
    offset: 15,
    sound: true,
    target: 'stage',
    warmupOffset: 45
  }))

  const subscribedCategories = useState<string[]>('subscribed_categories', () => [])
  const subscribedWaves = useState<string[]>('subscribed_waves', () => [])
  const subscribedRideGroups = useState<SubscribedRideGroup[]>('subscribed_ride_groups', () => [])
  const permissionStatus = useState<string>('notif_permission_status', () => 'default')

  let schedulerTimer: ReturnType<typeof setInterval> | null = null

  const loadUserSubscriptions = async (uid: string) => {
    if (!import.meta.client) return
    isSyncing.value = true
    try {
      // 1. Immediately hydrate from user-scoped local storage cache for fast rendering
      const userCachedSubs = localStorage.getItem(`laxmtb_notif_subs_${uid}`)
      if (userCachedSubs) {
        try {
          const parsed = JSON.parse(userCachedSubs)
          if (Array.isArray(parsed.categories)) subscribedCategories.value = parsed.categories
          if (Array.isArray(parsed.waves)) subscribedWaves.value = parsed.waves
          if (Array.isArray(parsed.rideGroups)) subscribedRideGroups.value = parsed.rideGroups
        } catch (e) {}
      }
      const userCachedConfig = localStorage.getItem(`laxmtb_notif_config_${uid}`)
      if (userCachedConfig) {
        try {
          const parsedConfig = JSON.parse(userCachedConfig)
          if (parsedConfig && typeof parsedConfig === 'object') {
            if (typeof parsedConfig.offset === 'number') notifConfig.value.offset = parsedConfig.offset
            if (typeof parsedConfig.sound === 'boolean') notifConfig.value.sound = parsedConfig.sound
            if (['warmup', 'stage', 'start'].includes(parsedConfig.target)) notifConfig.value.target = parsedConfig.target
            if (typeof parsedConfig.warmupOffset === 'number') notifConfig.value.warmupOffset = parsedConfig.warmupOffset
          }
        } catch (e) {}
      }

      // 2. Fetch fresh cloud source of truth from Firestore users/{uid}
      if (db) {
        const userRef = doc(db, 'users', uid)
        const snap = await getDoc(userRef)
        if (snap.exists()) {
          const data = snap.data()
          if (data?.notificationSubscriptions) {
            const subs = data.notificationSubscriptions
            if (Array.isArray(subs.categories)) subscribedCategories.value = subs.categories
            if (Array.isArray(subs.waves)) subscribedWaves.value = subs.waves
            if (Array.isArray(subs.rideGroups)) subscribedRideGroups.value = subs.rideGroups
            if (subs.config && typeof subs.config === 'object') {
              if (typeof subs.config.offset === 'number') notifConfig.value.offset = subs.config.offset
              if (typeof subs.config.sound === 'boolean') notifConfig.value.sound = subs.config.sound
              if (['warmup', 'stage', 'start'].includes(subs.config.target)) notifConfig.value.target = subs.config.target
              if (typeof subs.config.warmupOffset === 'number') notifConfig.value.warmupOffset = subs.config.warmupOffset
            }

            const payload = {
              categories: subscribedCategories.value,
              waves: subscribedWaves.value,
              rideGroups: subscribedRideGroups.value
            }
            localStorage.setItem(`laxmtb_notif_subs_${uid}`, JSON.stringify(payload))
            localStorage.setItem('laxmtb_notif_subs', JSON.stringify(payload))
            localStorage.setItem(`laxmtb_notif_config_${uid}`, JSON.stringify(notifConfig.value))
            localStorage.setItem('laxmtb_notif_config', JSON.stringify(notifConfig.value))
          } else if (subscribedCategories.value.length > 0 || subscribedWaves.value.length > 0 || subscribedRideGroups.value.length > 0) {
            // First time this account signs in with local alerts — save them into Firestore
            await saveSubs()
          }
        }
      }
      lastSyncedUid.value = uid
    } catch (err) {
      console.warn('[useNotificationSubscriptions] Error loading subscriptions from Firestore:', err)
    } finally {
      isSyncing.value = false
    }
  }

  const loadFromStorage = () => {
    if (!import.meta.client) return
    try {
      const currentUid = user.value?.uid
      const subsKey = currentUid ? `laxmtb_notif_subs_${currentUid}` : 'laxmtb_notif_subs'
      const configKey = currentUid ? `laxmtb_notif_config_${currentUid}` : 'laxmtb_notif_config'

      const storedConfig = localStorage.getItem(configKey) || localStorage.getItem('laxmtb_notif_config')
      if (storedConfig) {
        const parsed = JSON.parse(storedConfig)
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.offset === 'number') notifConfig.value.offset = parsed.offset
          if (typeof parsed.sound === 'boolean') notifConfig.value.sound = parsed.sound
          if (['warmup', 'stage', 'start'].includes(parsed.target)) notifConfig.value.target = parsed.target
          if (typeof parsed.warmupOffset === 'number') notifConfig.value.warmupOffset = parsed.warmupOffset
        }
      }

      const storedSubs = localStorage.getItem(subsKey) || localStorage.getItem('laxmtb_notif_subs')
      if (storedSubs) {
        const parsed = JSON.parse(storedSubs)
        if (Array.isArray(parsed.categories)) subscribedCategories.value = parsed.categories
        if (Array.isArray(parsed.waves)) subscribedWaves.value = parsed.waves
        if (Array.isArray(parsed.rideGroups)) subscribedRideGroups.value = parsed.rideGroups
      }

      if ('Notification' in window) {
        permissionStatus.value = Notification.permission
      }

      if (currentUid && currentUid !== lastSyncedUid.value) {
        loadUserSubscriptions(currentUid)
      }
    } catch (e) {}
  }

  const saveConfig = async () => {
    if (!import.meta.client) return
    const currentUid = user.value?.uid
    try {
      if (currentUid) {
        localStorage.setItem(`laxmtb_notif_config_${currentUid}`, JSON.stringify(notifConfig.value))
      }
      localStorage.setItem('laxmtb_notif_config', JSON.stringify(notifConfig.value))
    } catch (e) {}

    if (db && currentUid) {
      try {
        const userRef = doc(db, 'users', currentUid)
        await setDoc(userRef, {
          notificationSubscriptions: {
            categories: subscribedCategories.value,
            waves: subscribedWaves.value,
            rideGroups: subscribedRideGroups.value,
            config: notifConfig.value,
            updatedAt: new Date().toISOString()
          }
        }, { merge: true })
      } catch (err) {
        console.warn('[useNotificationSubscriptions] Could not save config to user account:', err)
      }
    }
  }

  const saveSubs = async () => {
    if (!import.meta.client) return
    const currentUid = user.value?.uid
    const payload = {
      categories: subscribedCategories.value,
      waves: subscribedWaves.value,
      rideGroups: subscribedRideGroups.value
    }

    try {
      if (currentUid) {
        localStorage.setItem(`laxmtb_notif_subs_${currentUid}`, JSON.stringify(payload))
      } else {
        localStorage.setItem('laxmtb_notif_subs_guest', JSON.stringify(payload))
      }
      localStorage.setItem('laxmtb_notif_subs', JSON.stringify(payload))
    } catch (e) {}

    if (db && currentUid) {
      try {
        isSyncing.value = true
        const userRef = doc(db, 'users', currentUid)
        await setDoc(userRef, {
          notificationSubscriptions: {
            categories: subscribedCategories.value,
            waves: subscribedWaves.value,
            rideGroups: subscribedRideGroups.value,
            config: notifConfig.value,
            updatedAt: new Date().toISOString()
          }
        }, { merge: true })
      } catch (err) {
        console.warn('[useNotificationSubscriptions] Could not save subscriptions to user account in Firestore:', err)
      } finally {
        isSyncing.value = false
      }
    }
  }

  const playNotificationChime = () => {
    if (!notifConfig.value.sound || !import.meta.client) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const now = ctx.currentTime

      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(587.33, now) // D5
      gain1.gain.setValueAtTime(0.18, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.35)

      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(880.00, now + 0.12) // A5
      gain2.gain.setValueAtTime(0.22, now + 0.12)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.12)
      osc2.stop(now + 0.55)
    } catch (e) {}
  }

  const showToastNotification = (title: string, body?: string) => {
    if (!import.meta.client) return
    playNotificationChime()
    const container = document.getElementById('notifToastContainer')
    if (!container) return

    const toast = document.createElement('div')
    toast.className = 'notif-toast'

    const content = document.createElement('div')
    content.className = 'notif-toast-content'

    const titleEl = document.createElement('div')
    titleEl.className = 'notif-toast-title'
    titleEl.textContent = title
    content.appendChild(titleEl)

    if (body) {
      const msgEl = document.createElement('div')
      msgEl.className = 'notif-toast-msg'
      msgEl.textContent = body
      content.appendChild(msgEl)
    }

    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'notif-toast-close'
    closeBtn.setAttribute('aria-label', 'Dismiss')
    closeBtn.textContent = '✕'
    closeBtn.addEventListener('click', () => toast.remove())

    toast.appendChild(content)
    toast.appendChild(closeBtn)
    container.appendChild(toast)

    setTimeout(() => {
      toast.remove()
    }, body ? 6500 : 3500)
  }

  const dispatchSystemNotification = (title: string, body: string) => {
    if (!import.meta.client || !('Notification' in window) || Notification.permission !== 'granted') return
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          if (reg && reg.showNotification) {
            reg.showNotification(title, {
              body,
              icon: '/logo.png',
              badge: '/notification-badge.png',
              vibrate: [200, 100, 200]
            } as any)
          } else {
            new Notification(title, { body, icon: '/logo.png', badge: '/notification-badge.png' } as any)
          }
        }).catch(() => {
          new Notification(title, { body, icon: '/logo.png', badge: '/notification-badge.png' } as any)
        })
        return
      }
      new Notification(title, { body, icon: '/logo.png', badge: '/notification-badge.png' } as any)
    } catch (e) {
      console.warn('dispatchSystemNotification failed:', e)
    }
  }

  const requestBrowserPermission = async () => {
    if (!import.meta.client) return 'default'
    if (!('Notification' in window)) {
      showToastNotification('⚠️ Push Alerts Not Supported', 'Your browser does not support system push. In-app banners and audio chimes will alert you!')
      return 'unsupported'
    }

    if (Notification.permission === 'denied') {
      showToastNotification('🔒 Notifications Blocked', 'Notifications are blocked in browser settings. Click the lock/settings icon in your browser address bar to allow.')
      return 'denied'
    }

    try {
      const res = await Notification.requestPermission()
      permissionStatus.value = res
      if (res === 'granted') {
        showToastNotification('🔔 Push Notifications Enabled', 'You will receive staging and race start alerts on your device!')
        dispatchSystemNotification('🔔 LAX MTB Race Central', 'Push notifications enabled! Staging & race start reminders will appear here.')
      } else if (res === 'denied') {
        showToastNotification('🔒 Notifications Blocked', 'Push notifications were declined. In-app alerts and audio chimes will continue to work!')
      }
      return res
    } catch (err) {
      return Notification.permission || 'denied'
    }
  }

  const isCategorySubscribed = (cat: string) => {
    return subscribedCategories.value.includes(cat)
  }

  const isWaveSubscribed = (cat: string, wKey: string) => {
    return subscribedWaves.value.includes(`${cat}::${wKey}`) || subscribedCategories.value.includes(cat)
  }

  const toggleCategorySubscription = (cat: string) => {
    const idx = subscribedCategories.value.indexOf(cat)
    if (idx === -1) {
      subscribedCategories.value.push(cat)
      if (import.meta.client && 'Notification' in window && Notification.permission === 'default') {
        requestBrowserPermission()
      }
      showToastNotification('🔔 Subscribed to Category', `Alerts set for ${cat} (${notifConfig.value.target === 'warmup' ? 'Warm-up' : (notifConfig.value.target === 'stage' ? 'Staging' : 'Start')} - ${notifConfig.value.offset}m)`)
    } else {
      subscribedCategories.value.splice(idx, 1)
      showToastNotification('🔕 Unsubscribed', `Removed alerts for ${cat}`)
    }
    saveSubs()
  }

  const toggleWaveSubscription = (cat: string, wKey: string) => {
    const waveKey = `${cat}::${wKey}`
    const idx = subscribedWaves.value.indexOf(waveKey)
    if (idx === -1) {
      subscribedWaves.value.push(waveKey)
      if (import.meta.client && 'Notification' in window && Notification.permission === 'default') {
        requestBrowserPermission()
      }
      showToastNotification('🔔 Subscribed to Wave', `Alerts set for ${cat} - ${wKey}`)
    } else {
      subscribedWaves.value.splice(idx, 1)
      showToastNotification('🔕 Unsubscribed', `Removed alerts for ${cat} - ${wKey}`)
    }
    saveSubs()
  }

  const isRideGroupSubscribed = (groupId: string) => {
    return subscribedRideGroups.value.some(g => g.id === groupId)
  }

  const subscribeRideGroup = (group: SubscribedRideGroup) => {
    const existingIdx = subscribedRideGroups.value.findIndex(g => g.id === group.id)
    if (existingIdx !== -1) {
      subscribedRideGroups.value[existingIdx] = { ...subscribedRideGroups.value[existingIdx], ...group }
    } else {
      subscribedRideGroups.value.push(group)
    }

    // Also auto-subscribe to any associated member categories for staging & race alerts
    if (Array.isArray(group.categories) && group.categories.length > 0) {
      group.categories.forEach(cat => {
        if (!subscribedCategories.value.includes(cat)) {
          subscribedCategories.value.push(cat)
        }
      })
    }

    if (import.meta.client && 'Notification' in window && Notification.permission === 'default') {
      requestBrowserPermission()
    }

    const typeLabel = group.sessionType === 'wu' ? 'Warm-up Group' : 'Pre-Ride Wave'
    showToastNotification('🔔 Subscribed to Ride Group Alerts', `Notifications active for ${group.name} (${group.meetingTime})`)
    saveSubs()
  }

  const unsubscribeRideGroup = (groupId: string) => {
    const idx = subscribedRideGroups.value.findIndex(g => g.id === groupId)
    if (idx !== -1) {
      const removed = subscribedRideGroups.value.splice(idx, 1)[0]
      showToastNotification('🔕 Unsubscribed', `Removed alerts for ${removed.name}`)
      saveSubs()
    }
  }

  const toggleRideGroupSubscription = (group: SubscribedRideGroup) => {
    if (isRideGroupSubscribed(group.id)) {
      unsubscribeRideGroup(group.id)
    } else {
      subscribeRideGroup(group)
    }
  }

  const removeRideGroupByIndex = (idx: number) => {
    if (idx >= 0 && idx < subscribedRideGroups.value.length) {
      const removed = subscribedRideGroups.value.splice(idx, 1)[0]
      showToastNotification('🔕 Unsubscribed', `Removed alerts for ${removed.name}`)
      saveSubs()
    }
  }

  const removeSubByIndex = (idx: number, isWave = false) => {
    if (isWave) {
      if (idx >= 0 && idx < subscribedWaves.value.length) {
        subscribedWaves.value.splice(idx, 1)
      }
    } else {
      if (idx >= 0 && idx < subscribedCategories.value.length) {
        subscribedCategories.value.splice(idx, 1)
      }
    }
    saveSubs()
  }

  const clearAllSubscriptions = () => {
    subscribedCategories.value = []
    subscribedWaves.value = []
    subscribedRideGroups.value = []
    saveSubs()
    showToastNotification('🔕 Subscriptions Cleared', 'All notification alerts have been removed.')
  }

  const triggerTestNotification = () => {
    let targetLabel = 'Race Start'
    if (notifConfig.value.target === 'warmup') targetLabel = 'Warm-up'
    else if (notifConfig.value.target === 'stage') targetLabel = 'Staging Grid'
    const title = `🔔 Test Alert: Bluff Bash (${targetLabel})`
    const body = `Sample notification! ${targetLabel} in ${notifConfig.value.offset} minutes (Warm-up: 2:40 PM, Stage: 3:25 PM, Start: 3:40 PM).`

    showToastNotification(title, body)
    dispatchSystemNotification(title, body)
  }

  const menuBadgeText = computed(() => {
    const totalSubs = subscribedCategories.value.length + subscribedWaves.value.length + subscribedRideGroups.value.length
    const targetStr = notifConfig.value.target === 'warmup' ? 'Warm-up' : (notifConfig.value.target === 'stage' ? 'Stage' : 'Start')
    if (totalSubs > 0) {
      return `${totalSubs} Alert${totalSubs > 1 ? 's' : ''} (${targetStr} • ${notifConfig.value.offset}m)`
    }
    return `${targetStr} • ${notifConfig.value.offset}m`
  })

  // Date/Time evaluation for scheduled alerts
  const isTodayRaceDay = (race: Race, now: Date): boolean => {
    if (!race) return false
    const yr = now.getFullYear()
    const mo = String(now.getMonth() + 1).padStart(2, '0')
    const da = String(now.getDate()).padStart(2, '0')
    const todayIso = `${yr}-${mo}-${da}`

    if (Array.isArray(race.schedule) && race.schedule.length > 0) {
      for (const item of race.schedule) {
        if (item.isoDate === todayIso) return true
      }
    }

    if (race.startDate && race.endDate) {
      return todayIso >= race.startDate && todayIso <= race.endDate
    }

    return false
  }

  const checkScheduledAlerts = (allRaces: Race[]) => {
    if (!import.meta.client || !allRaces || allRaces.length === 0) return
    const now = new Date()
    const yr = now.getFullYear()
    const mo = String(now.getMonth() + 1).padStart(2, '0')
    const da = String(now.getDate()).padStart(2, '0')
    const todayIso = `${yr}-${mo}-${da}`

    const activeRaces = allRaces.filter(r => isTodayRaceDay(r, now))
    if (activeRaces.length === 0) return

    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    let firedAlerts = new Set<string>()
    try {
      const stored = localStorage.getItem('laxmtb_fired_alerts')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.date === todayIso && Array.isArray(parsed.alerts)) {
          firedAlerts = new Set(parsed.alerts)
        }
      }
    } catch (e) {}

    activeRaces.forEach(race => {
      const raceId = race.id || 'race'

      // Check category subscriptions
      subscribedCategories.value.forEach(cat => {
        const entry = getWaveScheduleEntry(race, cat, '1')
        if (!entry) return

        let targetTimeStr = entry.start
        let label = 'Race Start'
        const warmupStr = getWaveWarmupTime(race, cat, '1', notifConfig.value.warmupOffset)
        if (notifConfig.value.target === 'warmup') {
          targetTimeStr = warmupStr || entry.start
          label = 'Warm-up'
        } else if (notifConfig.value.target === 'stage' && entry.stage) {
          targetTimeStr = entry.stage
          label = 'Staging Call-up'
        }

        const targetMinutes = parseTimeStrToMinutes(targetTimeStr)
        if (targetMinutes === null) return
        const alertMinutes = targetMinutes - notifConfig.value.offset
        const alertKey = `cat_${cat}_${raceId}_${todayIso}_${notifConfig.value.target}`

        const minutesDiff = nowMinutes - alertMinutes
        if (minutesDiff > 1 || nowMinutes >= targetMinutes) {
          if (!firedAlerts.has(alertKey)) {
            firedAlerts.add(alertKey)
            localStorage.setItem('laxmtb_fired_alerts', JSON.stringify({ date: todayIso, alerts: Array.from(firedAlerts) }))
          }
          return
        }

        const isDue = (minutesDiff === 0 || (minutesDiff === 1 && now.getSeconds() <= 15)) && (nowMinutes < targetMinutes)
        if (isDue && !firedAlerts.has(alertKey)) {
          firedAlerts.add(alertKey)
          localStorage.setItem('laxmtb_fired_alerts', JSON.stringify({ date: todayIso, alerts: Array.from(firedAlerts) }))
          const title = `🔔 ${cat} ${label} in ${notifConfig.value.offset}m`
          let body = ''
          if (notifConfig.value.target === 'warmup') {
            body = `${cat} Warm-up starts at ${targetTimeStr} (Stage: ${entry.stage || '-'}, Start: ${entry.start}). Begin warm-up routines!`
          } else if (notifConfig.value.target === 'stage') {
            body = `${cat} Staging is at ${targetTimeStr} (Start: ${entry.start}${warmupStr ? `, Warm-up: ${warmupStr}` : ''}). Head to staging grids!`
          } else {
            body = `${cat} Race Start is at ${targetTimeStr} (Stage: ${entry.stage || '-'}${warmupStr ? `, Warm-up: ${warmupStr}` : ''}).`
          }
          showToastNotification(title, body)
          dispatchSystemNotification(title, body)
        }
      })

      // Check wave subscriptions
      subscribedWaves.value.forEach(waveKey => {
        const [cat, wKey] = waveKey.split('::')
        const entry = getWaveScheduleEntry(race, cat, wKey)
        if (!entry) return

        let targetTimeStr = entry.start
        let label = 'Race Start'
        const warmupStr = getWaveWarmupTime(race, cat, wKey, notifConfig.value.warmupOffset)
        if (notifConfig.value.target === 'warmup') {
          targetTimeStr = warmupStr || entry.start
          label = 'Warm-up'
        } else if (notifConfig.value.target === 'stage' && entry.stage) {
          targetTimeStr = entry.stage
          label = 'Staging Call-up'
        }

        const targetMinutes = parseTimeStrToMinutes(targetTimeStr)
        if (targetMinutes === null) return
        const alertMinutes = targetMinutes - notifConfig.value.offset
        const alertKey = `wave_${cat}_${wKey}_${raceId}_${todayIso}_${notifConfig.value.target}`

        const minutesDiff = nowMinutes - alertMinutes
        if (minutesDiff > 1 || nowMinutes >= targetMinutes) {
          if (!firedAlerts.has(alertKey)) {
            firedAlerts.add(alertKey)
            localStorage.setItem('laxmtb_fired_alerts', JSON.stringify({ date: todayIso, alerts: Array.from(firedAlerts) }))
          }
          return
        }

        const isDue = (minutesDiff === 0 || (minutesDiff === 1 && now.getSeconds() <= 15)) && (nowMinutes < targetMinutes)
        if (isDue && !firedAlerts.has(alertKey)) {
          firedAlerts.add(alertKey)
          localStorage.setItem('laxmtb_fired_alerts', JSON.stringify({ date: todayIso, alerts: Array.from(firedAlerts) }))
          const title = `🔔 ${cat} (${wKey}) ${label} in ${notifConfig.value.offset}m`
          let body = ''
          if (notifConfig.value.target === 'warmup') {
            body = `${cat} ${wKey} Warm-up starts at ${targetTimeStr} (Stage: ${entry.stage || '-'}, Start: ${entry.start}).`
          } else if (notifConfig.value.target === 'stage') {
            body = `${cat} ${wKey} Staging is at ${targetTimeStr} (Start: ${entry.start}${warmupStr ? `, Warm-up: ${warmupStr}` : ''}). Head to staging grids!`
          } else {
            body = `${cat} ${wKey} Race Start is at ${targetTimeStr} (Stage: ${entry.stage || '-'}${warmupStr ? `, Warm-up: ${warmupStr}` : ''}).`
          }
          showToastNotification(title, body)
          dispatchSystemNotification(title, body)
        }
      })

      // Check ride group subscriptions (Warm-ups & Pre-Rides)
      subscribedRideGroups.value.forEach(group => {
        if (group.raceId && group.raceId !== raceId) return

        let targetTimeStr = group.meetingTime
        if (targetTimeStr && targetTimeStr.includes('-')) {
          targetTimeStr = targetTimeStr.split('-')[0].trim()
        }

        const targetMinutes = parseTimeStrToMinutes(targetTimeStr)
        if (targetMinutes === null) return
        const alertMinutes = targetMinutes - notifConfig.value.offset
        const alertKey = `group_${group.id}_${raceId}_${todayIso}_${group.sessionType}`

        const minutesDiff = nowMinutes - alertMinutes
        if (minutesDiff > 1 || nowMinutes >= targetMinutes) {
          if (!firedAlerts.has(alertKey)) {
            firedAlerts.add(alertKey)
            localStorage.setItem('laxmtb_fired_alerts', JSON.stringify({ date: todayIso, alerts: Array.from(firedAlerts) }))
          }
          return
        }

        const isDue = (minutesDiff === 0 || (minutesDiff === 1 && now.getSeconds() <= 15)) && (nowMinutes < targetMinutes)
        if (isDue && !firedAlerts.has(alertKey)) {
          firedAlerts.add(alertKey)
          localStorage.setItem('laxmtb_fired_alerts', JSON.stringify({ date: todayIso, alerts: Array.from(firedAlerts) }))
          const sessionLabel = group.sessionType === 'wu' ? 'Warm-up Group' : 'Pre-Ride Wave'
          const title = `🔔 ${sessionLabel} in ${notifConfig.value.offset}m`
          const body = `${group.name} meets at ${group.meetingTime}. Get ready to assemble your riders!`
          showToastNotification(title, body)
          dispatchSystemNotification(title, body)
        }
      })
    })
  }

  const startAlertScheduler = (getRaces: () => Race[]) => {
    if (!import.meta.client || schedulerTimer) return
    loadFromStorage()
    schedulerTimer = setInterval(() => {
      checkScheduledAlerts(getRaces())
    }, 15000)
  }

  if (import.meta.client) {
    watch(user, async (newUser, oldUser) => {
      if (newUser) {
        if (newUser.uid !== lastSyncedUid.value) {
          await loadUserSubscriptions(newUser.uid)
        }
      } else if (oldUser && !newUser) {
        // User logged out — reset in-memory alerts
        lastSyncedUid.value = null
        subscribedCategories.value = []
        subscribedWaves.value = []
        subscribedRideGroups.value = []
        try {
          const guestSubs = localStorage.getItem('laxmtb_notif_subs_guest')
          if (guestSubs) {
            const parsed = JSON.parse(guestSubs)
            if (Array.isArray(parsed.categories)) subscribedCategories.value = parsed.categories
            if (Array.isArray(parsed.waves)) subscribedWaves.value = parsed.waves
            if (Array.isArray(parsed.rideGroups)) subscribedRideGroups.value = parsed.rideGroups
          }
        } catch (e) {}
      }
    }, { immediate: true })
  }

  onMounted(() => {
    loadFromStorage()
  })

  return {
    notifConfig,
    subscribedCategories,
    subscribedWaves,
    subscribedRideGroups,
    permissionStatus,
    menuBadgeText,
    user,
    isSyncing,
    loadUserSubscriptions,
    saveConfig,
    saveSubs,
    isCategorySubscribed,
    isWaveSubscribed,
    isRideGroupSubscribed,
    subscribeRideGroup,
    unsubscribeRideGroup,
    toggleRideGroupSubscription,
    removeRideGroupByIndex,
    toggleCategorySubscription,
    toggleWaveSubscription,
    removeSubByIndex,
    clearAllSubscriptions,
    requestBrowserPermission,
    triggerTestNotification,
    showToastNotification,
    startAlertScheduler
  }
}
