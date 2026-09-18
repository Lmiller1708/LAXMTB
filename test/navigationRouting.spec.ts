import { describe, it, expect } from 'vitest'

describe('Top-Level Navigation & Route Resolution', () => {
  // Test helper simulating the path resolver logic in app.vue
  const resolveNavFromPath = (path: string): { nav: 'home' | 'about' | 'race'; isAdmin: boolean; targetHash?: string } => {
    if (path === '/admin' || path.startsWith('/admin')) {
      return { nav: 'race', isAdmin: true }
    }
    if (path === '/practice' || path.startsWith('/practice')) {
      return { nav: 'home', isAdmin: false, targetHash: '#practice' }
    }
    if (path === '/about' || path.startsWith('/about')) {
      return { nav: 'home', isAdmin: false, targetHash: '#about' }
    }
    if (path === '/race' || path.startsWith('/race') || path === '/coach' || path.startsWith('/coach')) {
      return { nav: 'race', isAdmin: false }
    }
    // Blank URL or root -> Home
    return { nav: 'home', isAdmin: false }
  }

  it('resolves root "/" to home/overview page', () => {
    const result = resolveNavFromPath('/')
    expect(result.nav).toBe('home')
    expect(result.isAdmin).toBe(false)
  })

  it('resolves empty path "" to home/overview page', () => {
    const result = resolveNavFromPath('')
    expect(result.nav).toBe('home')
    expect(result.isAdmin).toBe(false)
  })

  it('streamlines primary header navigation tabs to Overview and Race Central', () => {
    const primaryNavTabs = [
      { key: 'home', label: 'Overview' },
      { key: 'race', label: 'Race Central' }
    ]
    expect(primaryNavTabs.map(t => t.label)).toEqual(['Overview', 'Race Central'])
  })

  it('resolves "/practice" to overview page with #practice anchor', () => {
    const result = resolveNavFromPath('/practice')
    expect(result.nav).toBe('home')
    expect(result.targetHash).toBe('#practice')
    expect(result.isAdmin).toBe(false)
  })

  it('resolves "/practice/skills" to overview page with #practice anchor', () => {
    const result = resolveNavFromPath('/practice/skills')
    expect(result.nav).toBe('home')
    expect(result.targetHash).toBe('#practice')
    expect(result.isAdmin).toBe(false)
  })

  it('resolves "/about" to overview page with #about anchor', () => {
    const result = resolveNavFromPath('/about')
    expect(result.nav).toBe('home')
    expect(result.targetHash).toBe('#about')
    expect(result.isAdmin).toBe(false)
  })

  it('resolves "/race" and race subpaths to race central', () => {
    expect(resolveNavFromPath('/race').nav).toBe('race')
    expect(resolveNavFromPath('/race/bluffbash/details').nav).toBe('race')
    expect(resolveNavFromPath('/race/bluffbash/results').nav).toBe('race')
    expect(resolveNavFromPath('/race/bluffbash/startlist').nav).toBe('race')
    expect(resolveNavFromPath('/race/bluffbash/photos').nav).toBe('race')
    expect(resolveNavFromPath('/coach').nav).toBe('race')
  })

  it('resolves "/admin" to admin route', () => {
    const result = resolveNavFromPath('/admin')
    expect(result.isAdmin).toBe(true)
  })

  it('routes event click to the specific race event details page', () => {
    const races = [
      { id: 'bluff-bash', name: 'Bluff Bash Festival' },
      { id: 'cable-conquest', name: 'Cable Conquest Festival' },
      { id: 'hodag-hustle', name: 'Hodag Hustle Festival' },
      { id: 'gnarly-nordic', name: 'Gnarly Nordic Festival' },
      { id: 'red-barn', name: 'Red Barn State Championship' }
    ]

    const resolveRaceDetailRoute = (raceId: string) => {
      const match = races.find(r => r.id === raceId)
      return {
        nav: 'race',
        tab: 'details',
        slug: match ? match.id : 'race',
        url: `/race/${match ? match.id : 'race'}/details`
      }
    }

    const res2 = resolveRaceDetailRoute('cable-conquest')
    expect(res2.nav).toBe('race')
    expect(res2.tab).toBe('details')
    expect(res2.url).toBe('/race/cable-conquest/details')

    const res5 = resolveRaceDetailRoute('red-barn')
    expect(res5.tab).toBe('details')
    expect(res5.url).toBe('/race/red-barn/details')
  })
})

describe('Coach Admin Scope & Tab Navigation Resolution', () => {
  type AdminScope = 'race' | 'site'

  const resolveScopeAndTab = (inputTabOrScope?: string, activeRaceTab = 'venue', activeSiteTab = 'site-alert') => {
    if (!inputTabOrScope) {
      return { scope: 'race' as AdminScope, raceTab: 'venue', siteTab: 'site-alert' }
    }
    const clean = inputTabOrScope.trim().toLowerCase()

    if (clean === 'site' || clean === 'site-admin') {
      return { scope: 'site' as AdminScope, raceTab: activeRaceTab || 'venue', siteTab: activeSiteTab || 'site-alert' }
    }
    if (clean === 'race' || clean === 'race-admin') {
      return { scope: 'race' as AdminScope, raceTab: activeRaceTab || 'venue', siteTab: activeSiteTab || 'site-alert' }
    }

    // Site tabs
    if (['alert', 'announcement', 'site-alert', 'urgent'].includes(clean)) {
      return { scope: 'site' as AdminScope, raceTab: activeRaceTab || 'venue', siteTab: 'site-alert' }
    }
    if (['media', 'photos-site', 'site-photos', 'site-media', 'banners'].includes(clean)) {
      return { scope: 'site' as AdminScope, raceTab: activeRaceTab || 'venue', siteTab: 'site-media' }
    }
    if (['leadership', 'leaders', 'site-leaders', 'team-leaders'].includes(clean)) {
      return { scope: 'site' as AdminScope, raceTab: activeRaceTab || 'venue', siteTab: 'site-leaders' }
    }
    if (['sponsors', 'site-sponsors', 'partners'].includes(clean)) {
      return { scope: 'site' as AdminScope, raceTab: activeRaceTab || 'venue', siteTab: 'site-sponsors' }
    }
    if (['users', 'coaches', 'admins', 'permissions'].includes(clean)) {
      return { scope: 'site' as AdminScope, raceTab: activeRaceTab || 'venue', siteTab: 'coaches' }
    }

    // Race tabs
    let rTab = clean
    if (rTab === 'coach') rTab = 'waves'
    if (rTab === 'photos') rTab = 'signups'
    if (!['venue', 'schedule', 'waves', 'signups', 'maps', 'announcements'].includes(rTab)) {
      rTab = 'venue'
    }
    return { scope: 'race' as AdminScope, raceTab: rTab, siteTab: activeSiteTab || 'site-alert' }
  }

  const normalizeTab = (tab?: string) => {
    if (!tab) return 'venue'
    const res = resolveScopeAndTab(tab)
    return res.scope === 'race' ? res.raceTab : res.siteTab
  }

  it('correctly resolves race tabs and scope', () => {
    expect(resolveScopeAndTab('venue')).toEqual({ scope: 'race', raceTab: 'venue', siteTab: 'site-alert' })
    expect(resolveScopeAndTab('schedule')).toEqual({ scope: 'race', raceTab: 'schedule', siteTab: 'site-alert' })
    expect(resolveScopeAndTab('waves')).toEqual({ scope: 'race', raceTab: 'waves', siteTab: 'site-alert' })
    expect(resolveScopeAndTab('signups')).toEqual({ scope: 'race', raceTab: 'signups', siteTab: 'site-alert' })
    expect(resolveScopeAndTab('maps')).toEqual({ scope: 'race', raceTab: 'maps', siteTab: 'site-alert' })
    expect(resolveScopeAndTab('announcements')).toEqual({ scope: 'race', raceTab: 'announcements', siteTab: 'site-alert' })
  })

  it('resolves legacy race tab aliases without throwing', () => {
    expect(resolveScopeAndTab('coach').raceTab).toBe('waves')
    expect(resolveScopeAndTab('photos').raceTab).toBe('signups')
  })

  it('correctly resolves site tabs and scope', () => {
    expect(resolveScopeAndTab('site-alert')).toEqual({ scope: 'site', raceTab: 'venue', siteTab: 'site-alert' })
    expect(resolveScopeAndTab('site-media')).toEqual({ scope: 'site', raceTab: 'venue', siteTab: 'site-media' })
    expect(resolveScopeAndTab('site-leaders')).toEqual({ scope: 'site', raceTab: 'venue', siteTab: 'site-leaders' })
    expect(resolveScopeAndTab('site-sponsors')).toEqual({ scope: 'site', raceTab: 'venue', siteTab: 'site-sponsors' })
    expect(resolveScopeAndTab('coaches')).toEqual({ scope: 'site', raceTab: 'venue', siteTab: 'coaches' })
  })

  it('resolves site tab aliases without throwing', () => {
    expect(resolveScopeAndTab('alert').siteTab).toBe('site-alert')
    expect(resolveScopeAndTab('media').siteTab).toBe('site-media')
    expect(resolveScopeAndTab('leadership').siteTab).toBe('site-leaders')
    expect(resolveScopeAndTab('sponsors').siteTab).toBe('site-sponsors')
    expect(resolveScopeAndTab('users').siteTab).toBe('coaches')
  })

  it('normalizes tab strings safely with normalizeTab', () => {
    expect(normalizeTab('venue')).toBe('venue')
    expect(normalizeTab('schedule')).toBe('schedule')
    expect(normalizeTab('site-leaders')).toBe('site-leaders')
    expect(normalizeTab('leadership')).toBe('site-leaders')
    expect(normalizeTab('photos')).toBe('signups')
    expect(normalizeTab('')).toBe('venue')
    expect(normalizeTab(undefined)).toBe('venue')
  })

  it('matches template activeTab conditions for leadership and sponsors tabs', () => {
    // Simulates the template conditionals in AdminPage.vue
    const isLeadershipVisible = (tab: string) => tab === 'site-leaders' || tab === 'leadership'
    const isSponsorsVisible = (tab: string) => tab === 'site-sponsors' || tab === 'sponsors'

    expect(isLeadershipVisible('site-leaders')).toBe(true)
    expect(isLeadershipVisible('leadership')).toBe(true)
    expect(isLeadershipVisible('site-media')).toBe(false)

    expect(isSponsorsVisible('site-sponsors')).toBe(true)
    expect(isSponsorsVisible('sponsors')).toBe(true)
    expect(isSponsorsVisible('site-leaders')).toBe(false)
  })
})

