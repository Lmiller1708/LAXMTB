<script setup lang="ts">
import type {
  Rider,
  ResultsSortOrder,
  ResultsGroupMode,
  TeamStanding,
  FeedViewType
} from '../types/results'
import type { Race } from '~/modules/races/types/race'
import {
  targetTeamKeywords,
  categoryOrder,
  getWaveScheduleEntry,
  getWaveWarmupTime,
  getWarmupGroupForCategory,
  getCategoryStartTime,
  getCategoryStageTime,
  compareCategories
} from '../services/raceresultService'
import { useNotificationSubscriptions } from '~/modules/notifications/composables/useNotificationSubscriptions'

const props = defineProps<{
  race: Race
  riders: Rider[]
  teamStandings?: TeamStanding[]
  feedViewType?: FeedViewType
  currentTab: 'list' | 'results'
  listMode: ResultsGroupMode
  sortOrder: ResultsSortOrder
  searchQuery: string
  allCardsCollapsed: boolean
  isCoachAuth?: boolean
}>()

const emit = defineEmits<{
  (e: 'switchTab', tab: 'details'): void
  (e: 'editWaves'): void
}>()

const {
  notifConfig,
  isCategorySubscribed,
  toggleCategorySubscription
} = useNotificationSubscriptions()

const selectedRiderKeys = ref<Set<string>>(new Set())
const cardStateOverrides = ref<Record<string, boolean>>({})

const toggleRiderSelection = (riderKey: string) => {
  if (props.currentTab !== 'results') return
  const next = new Set(selectedRiderKeys.value)
  if (next.has(riderKey)) {
    next.delete(riderKey)
  } else {
    next.add(riderKey)
  }
  selectedRiderKeys.value = next
}

const toggleRiderKeySet = (keys: string[]) => {
  const next = new Set(selectedRiderKeys.value)
  const allPresent = keys.every(k => next.has(k))
  if (allPresent) {
    keys.forEach(k => next.delete(k))
  } else {
    keys.forEach(k => next.add(k))
  }
  selectedRiderKeys.value = next
}

const isCardCollapsed = (cardKey: string) => {
  if (props.searchQuery.trim()) return false
  if (cardStateOverrides.value[cardKey] !== undefined) {
    return cardStateOverrides.value[cardKey]
  }
  return props.allCardsCollapsed
}

const toggleCard = (cardKey: string) => {
  cardStateOverrides.value[cardKey] = !isCardCollapsed(cardKey)
}

const getNavigationUrl = (race: Race) => {
  if (race.navigationUrl?.trim()) return race.navigationUrl.trim()
  if (race.googleMapsUrl?.trim()) return race.googleMapsUrl.trim()
  const dest = [race.exactTrailhead, race.venue, race.address].filter(Boolean).join(' ')
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest || race.address || race.name)}`
}

const isTargetTeam = (teamName?: string) => {
  if (!teamName) return false
  const lower = teamName.toLowerCase()
  return targetTeamKeywords.some(kw => lower.includes(kw))
}

const getRiderKey = (r: Rider) => {
  return 'r_' + String(r.bib || r.no) + '_' + String(r.name || '').trim().replace(/\s+/g, '_')
}

// Grouped Team Standings
const groupedTeamStandings = computed(() => {
  const standings = props.teamStandings || []
  const grouped: Record<string, TeamStanding[]> = {}
  standings.forEach(s => {
    const div = s.division ? `Division ${s.division}` : 'All Divisions'
    if (!grouped[div]) grouped[div] = []
    grouped[div].push(s)
  })

  return Object.keys(grouped).sort().map(div => ({
    division: div,
    standings: [...grouped[div]].sort((a, b) => {
      const ra = parseInt(a.rank) || 999
      const rb = parseInt(b.rank) || 999
      return ra - rb
    })
  }))
})

// Grouped by Category & Wave / Field
const groupedByCategory = computed(() => {
  const grouped: Record<string, Record<string, Rider[]>> = {}
  props.riders.forEach(r => {
    const cat = r.category || 'General'
    let wave = r.wave || 'Wave: 1'
    if (/^field/i.test(wave)) {
      const match = wave.match(/\d+/)
      wave = `Wave: ${match ? match[0] : '1'}`
    }
    if (!grouped[cat]) grouped[cat] = {}
    if (!grouped[cat][wave]) grouped[cat][wave] = []
    grouped[cat][wave].push(r)
  })

  // Sort categories using compareCategories
  const sortedCats = Object.keys(grouped).sort((a, b) => {
    return compareCategories(a, b, props.sortOrder, props.race)
  })

  return sortedCats.map(cat => {
    const waves = grouped[cat]
    const sortedWaveKeys = Object.keys(waves).sort()
    const totalInCat = Object.values(waves).reduce((acc, list) => acc + list.length, 0)
    const catStartTime = getCategoryStartTime(props.race, cat)
    const catStageTime = getCategoryStageTime(props.race, cat)
    const warmupGroup = getWarmupGroupForCategory(props.race, cat)

    return {
      category: cat,
      totalInCat,
      catStartTime,
      catStageTime,
      warmupGroup,
      waves: sortedWaveKeys.map(wKey => {
        const ridersInWave = [...waves[wKey]].sort((a, b) => {
          const pa = parseInt(a.seedingRank || a.pl || '') || parseInt(a.bib) || 0
          const pb = parseInt(b.seedingRank || b.pl || '') || parseInt(b.bib) || 0
          return pa - pb
        })
        const waveRiderKeys = ridersInWave
          .filter(r => Array.isArray(r.laps) && r.laps.length > 0)
          .map(r => getRiderKey(r))
        const waveEntry = getWaveScheduleEntry(props.race, cat, wKey)
        const waveTime = waveEntry ? waveEntry.start : null
        const stageTime = waveEntry ? waveEntry.stage : null
        const waveWarmupTime = getWaveWarmupTime(props.race, cat, wKey)

        return {
          waveKey: wKey,
          riders: ridersInWave,
          waveRiderKeys,
          waveTime,
          stageTime,
          waveWarmupTime
        }
      })
    }
  })
})

// Grouped by Team
const groupedByTeam = computed(() => {
  const grouped: Record<string, Rider[]> = {}
  props.riders.forEach(r => {
    const t = r.team || 'Unattached'
    if (!grouped[t]) grouped[t] = []
    grouped[t].push(r)
  })

  const sortedTeams = Object.keys(grouped).sort((a, b) => {
    const isTargetA = isTargetTeam(a)
    const isTargetB = isTargetTeam(b)
    if (isTargetA && !isTargetB) return -1
    if (!isTargetA && isTargetB) return 1
    return a.localeCompare(b)
  })

  return sortedTeams.map(t => ({
    team: t,
    isTarget: isTargetTeam(t),
    riders: [...grouped[t]].sort((a, b) => {
      const catComp = compareCategories(a.category, b.category, props.sortOrder, props.race)
      if (catComp !== 0) return catComp
      return (parseInt(a.seedingRank || a.pl || '') || parseInt(a.bib) || 0) - (parseInt(b.seedingRank || b.pl || '') || parseInt(b.bib) || 0)
    })
  }))
})

function formatWaveLabel(wKey?: string): string {
  if (!wKey) return 'Wave: 1'
  const match = String(wKey).match(/\d+/)
  return match ? `Wave: ${match[0]}` : String(wKey).replace(/^field:?/i, 'Wave:')
}
</script>

<template>
  <div id="tablesContainer">
    <!-- 1. Upcoming / Unpublished Race State -->
    <div v-if="!race.isPublished || !race.eventId" class="upcoming-race-card">
      <img :src="race.logo" :alt="race.name" class="upcoming-logo-hero" onerror="this.style.display='none'">
      <h2 style="font-size:20px;font-weight:800;color:var(--text-main);">{{ race.name }}</h2>
      <p style="margin-top:4px;font-size:13px;color:var(--accent-red);font-weight:700;">
        📅 {{ race.dateStr }}<span v-if="race.conference"> • 🏆 {{ race.conference }}</span>
      </p>
      <p style="margin-top:4px;font-size:12px;color:var(--text-muted);">
        📍 <strong>{{ race.exactTrailhead || race.venue }}</strong> • {{ race.address }}
      </p>

      <div style="margin-top:14px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap;">
        <a :href="getNavigationUrl(race)" target="_blank" rel="noopener noreferrer" class="btn-maps btn-navigation" style="font-size:11px;padding:5px 12px;min-height:30px;">
          <span>🧭</span> Navigation Directions
        </a>
        <button class="btn-icon" style="font-size:11px;padding:5px 10px;min-height:30px;" @click="emit('switchTab', 'details')">
          <span>📍</span> View Full Schedule & Details
        </button>
      </div>

      <div style="margin-top:18px;padding:12px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:6px;max-width:460px;margin-left:auto;margin-right:auto;text-align:left;">
        <p style="font-size:12px;color:var(--text-main);line-height:1.4;">
          🏁 <strong>Start lists & wave assignments</strong> will stream automatically here once published by the timing team on race week.
        </p>
      </div>
    </div>

    <!-- 2. No Results Matching Filter -->
    <div v-else-if="riders.length === 0 && (!teamStandings || teamStandings.length === 0)" class="no-results">
      {{ currentTab === 'results' ? 'No results published yet. Timing data will stream live on race day.' : 'No riders matched your current search / filter.' }}
    </div>

    <!-- 3. Team Standings View -->
    <div v-else-if="feedViewType === 'team_standings' || (teamStandings && teamStandings.length > 0 && riders.length === 0)">
      <div
        v-for="divGroup in groupedTeamStandings"
        :key="divGroup.division"
        class="table-card"
        :data-card-key="`div:${divGroup.division}`"
      >
        <div class="category-header collapsible-header" @click="toggleCard(`div:${divGroup.division}`)">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:1;min-width:0;">
            <span>🏆 {{ divGroup.division }}</span>
            <span class="category-badge">{{ divGroup.standings.length }} TEAMS</span>
          </div>
          <span class="card-toggle-icon" :class="{ collapsed: isCardCollapsed(`div:${divGroup.division}`) }">▼</span>
        </div>

        <div v-show="!isCardCollapsed(`div:${divGroup.division}`)" class="collapsible-body">
          <div class="table-responsive-wrapper">
            <table class="results-table">
              <thead>
                <tr>
                  <th style="width:50px;text-align:center;">Rank</th>
                  <th>Team / Club</th>
                  <th style="width:100px;text-align:right;">Penalty Pts</th>
                  <th style="width:100px;text-align:right;">Total Score</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="s in divGroup.standings"
                  :key="s.team"
                >
                  <td style="text-align:center;font-weight:700;color:var(--text-muted);">{{ s.rank || '-' }}</td>
                  <td>
                    <span :class="isTargetTeam(s.team) ? 'team-name-lax' : 'team-name'">{{ s.team }}</span>
                  </td>
                  <td style="text-align:right;">
                    <span v-if="s.penaltyPoints && s.penaltyPoints !== '0'" class="col-pen-val">+{{ s.penaltyPoints }}</span>
                    <span v-else class="lap-empty">-</span>
                  </td>
                  <td style="text-align:right;font-weight:700;color:var(--accent-red);">
                    {{ s.points }} pts
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. Grouped By Category & Wave / Field -->
    <div v-else-if="listMode === 'WAVE'">
      <div
        v-for="catGroup in groupedByCategory"
        :key="catGroup.category"
        class="table-card"
        :data-card-key="`cat:${catGroup.category}`"
      >
        <div class="category-header collapsible-header" @click="toggleCard(`cat:${catGroup.category}`)">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:1;min-width:0;">
            <span>{{ catGroup.category }}</span>
            <span class="category-badge">{{ catGroup.totalInCat }} RIDERS</span>
            <span
              v-if="catGroup.catStartTime"
              class="category-time-badge"
              :title="`Category Start: ${catGroup.catStartTime}${catGroup.catStageTime ? ` | Stage: ${catGroup.catStageTime}` : ''}`"
            >
              Race Starts: {{ catGroup.catStartTime }}
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
            <button
              type="button"
              class="notif-sub-btn cat-notif-btn"
              :class="{ active: isCategorySubscribed(catGroup.category) }"
              :title="isCategorySubscribed(catGroup.category) ? `Notifications enabled for ${catGroup.category}` : `Enable notifications for ${catGroup.category}`"
              @click.stop="toggleCategorySubscription(catGroup.category)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" :fill="isCategorySubscribed(catGroup.category) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <button
              v-if="isCoachAuth"
              type="button"
              class="card-inline-edit-btn"
              title="Edit Wave Times & Staging"
              @click.stop="emit('editWaves')"
            >
              <span>✏️</span>
            </button>
            <span class="card-toggle-icon" :class="{ collapsed: isCardCollapsed(`cat:${catGroup.category}`) }">▼</span>
          </div>
        </div>

        <div v-show="!isCardCollapsed(`cat:${catGroup.category}`)" class="collapsible-body">
          <div v-for="w in catGroup.waves" :key="w.waveKey">
            <!-- Wave Header -->
            <div class="wave-divider">
              <div style="display:flex;align-items:center;gap:6px;white-space:nowrap;flex-shrink:0;">
                <span>🚩 {{ formatWaveLabel(w.waveKey) }}</span>
              </div>
              <div class="wave-schedule-wrap" style="display:inline-flex;align-items:center;gap:4px;margin-left:auto;flex-shrink:0;">
                <div v-if="w.waveWarmupTime || w.stageTime || w.waveTime" class="wave-schedule-strip">
                  <span v-if="w.waveWarmupTime" class="wave-schedule-step step-warmup" :title="catGroup.warmupGroup ? `Warm-up Group: ${catGroup.warmupGroup.name}` : `Warm-up starts before staging`">
                    <span class="step-lbl"><span class="lbl-full">Warm-up:</span><span class="lbl-short">Warm:</span></span>
                    <span class="step-time">{{ w.waveWarmupTime }}</span>
                  </span>
                  <span v-if="w.waveWarmupTime && (w.stageTime || w.waveTime)" class="wave-schedule-sep">›</span>
                  <span v-if="w.stageTime" class="wave-schedule-step step-stage" title="Staging grid call-up">
                    <span class="step-lbl">Stage:</span>
                    <span class="step-time">{{ w.stageTime }}</span>
                  </span>
                  <span v-if="w.stageTime && w.waveTime" class="wave-schedule-sep">›</span>
                  <span v-if="w.waveTime" class="wave-schedule-step step-start" title="Official start">
                    <span class="step-lbl">Start:</span>
                    <span class="step-time">{{ w.waveTime }}</span>
                  </span>
                </div>
                <button
                  v-if="currentTab === 'results' && w.waveRiderKeys.length > 0"
                  type="button"
                  class="wave-laps-toggle-btn"
                  :title="w.waveRiderKeys.every(k => selectedRiderKeys.has(k)) ? 'Collapse all lap splits in this wave' : 'Expand all lap splits in this wave'"
                  @click.stop="toggleRiderKeySet(w.waveRiderKeys)"
                >
                  {{ w.waveRiderKeys.every(k => selectedRiderKeys.has(k)) ? '▲' : '▼' }}
                </button>
              </div>
            </div>

            <!-- Table -->
            <div class="table-responsive-wrapper">
              <table class="results-table">
                <thead>
                  <tr>
                    <th style="width:40px;text-align:center;">{{ currentTab === 'results' ? 'Pos' : 'Seed' }}</th>
                    <th style="width:55px;text-align:center;">Plate #</th>
                    <th>Rider Name</th>
                    <template v-if="currentTab === 'results'">
                      <th class="col-desktop-only">Team / School</th>
                      <th class="col-desktop-only" style="text-align:center;width:44px;">Div</th>
                      <th class="col-lap col-desktop-only" style="width:68px;text-align:right;">Lap 1</th>
                      <th class="col-lap col-desktop-only" style="width:68px;text-align:right;">Lap 2</th>
                      <th class="col-lap col-desktop-only" style="width:68px;text-align:right;">Lap 3</th>
                      <th class="col-lap col-desktop-only" style="width:68px;text-align:right;">Lap 4</th>
                      <th class="col-avg col-desktop-only" style="width:75px;text-align:right;">Avg Pace</th>
                      <th class="col-pen col-desktop-only" style="width:58px;text-align:right;">Pen</th>
                      <th class="col-time" style="width:85px;text-align:right;">Time</th>
                    </template>
                    <template v-else>
                      <th>Team / School</th>
                      <th style="text-align:center;width:44px;">Div</th>
                    </template>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="r in w.riders" :key="getRiderKey(r)">
                    <tr
                      :class="[
                        currentTab === 'results' ? 'selectable-rider-row' : '',
                        selectedRiderKeys.has(getRiderKey(r)) ? 'selected' : ''
                      ]"
                      :title="currentTab === 'results' ? 'Tap to toggle lap splits' : undefined"
                      @click="toggleRiderSelection(getRiderKey(r))"
                    >
                      <td style="text-align:center;font-weight:700;color:var(--text-muted);">
                        {{ currentTab === 'results' ? (r.pl || '-') : (r.seedingRank || r.pl || '-') }}
                      </td>
                      <td style="text-align:center;"><span class="plate-number">#{{ r.no || r.bib }}</span></td>
                      <td><span class="rider-name">{{ r.name }}</span></td>

                      <!-- Results Mode Columns -->
                      <template v-if="currentTab === 'results'">
                        <td class="col-desktop-only">
                          <span :class="isTargetTeam(r.team) ? 'team-name-lax' : 'team-name'">{{ r.team }}</span>
                        </td>
                        <td class="col-desktop-only" style="text-align:center;white-space:nowrap;">
                          <span class="div-tag">D{{ r.div || '1' }}</span>
                        </td>
                        <td class="col-lap col-desktop-only" :class="{ 'lap-empty': !r.lap1 || r.lap1 === '-' }">{{ r.lap1 || '-' }}</td>
                        <td class="col-lap col-desktop-only" :class="{ 'lap-empty': !r.lap2 || r.lap2 === '-' }">{{ r.lap2 || '-' }}</td>
                        <td class="col-lap col-desktop-only" :class="{ 'lap-empty': !r.lap3 || r.lap3 === '-' }">{{ r.lap3 || '-' }}</td>
                        <td class="col-lap col-desktop-only" :class="{ 'lap-empty': !r.lap4 || r.lap4 === '-' }">{{ r.lap4 || '-' }}</td>
                        <td class="col-avg col-desktop-only" style="text-align:right;">
                          <span v-if="r.avgLap" class="racer-avg-lap">{{ r.avgLap }}</span>
                          <span v-else class="lap-empty">-</span>
                        </td>
                        <td class="col-pen col-desktop-only" style="text-align:right;">
                          <span v-if="r.penalty" class="col-pen-val">+{{ r.penalty }}</span>
                          <span v-else class="lap-empty">-</span>
                        </td>
                        <td class="col-time" style="text-align:right;white-space:nowrap;">
                          <span v-if="r.status && r.status !== 'OK'" class="status-badge" :class="r.status.toLowerCase()">{{ r.status }}</span>
                          <span v-else>{{ r.totalTime || r.return_val || '-' }}</span>
                          <span v-if="r.laps && r.laps.length > 0" class="rider-expand-icon">▼</span>
                        </td>
                      </template>

                      <!-- Start List Mode Columns -->
                      <template v-else>
                        <td>
                          <span :class="isTargetTeam(r.team) ? 'team-name-lax' : 'team-name'">{{ r.team }}</span>
                        </td>
                        <td style="text-align:center;white-space:nowrap;">
                          <span class="div-tag">D{{ r.div || '1' }}</span>
                        </td>
                      </template>
                    </tr>

                    <!-- Expanded Lap Splits Row -->
                    <tr
                      v-if="currentTab === 'results' && selectedRiderKeys.has(getRiderKey(r))"
                      class="rider-laps-detail-row"
                    >
                      <td colspan="12">
                        <div class="laps-detail-wrapper">
                          <template v-if="r.laps && r.laps.length > 0">
                            <span v-for="(lapVal, idx) in r.laps" :key="idx" class="lap-badge">
                              <span class="lap-num">Lap {{ idx + 1 }}:</span>
                              <span class="lap-val">{{ lapVal }}</span>
                            </span>
                            <span v-if="r.avgLap" class="lap-badge lap-avg">
                              <span class="lap-num">Avg Pace:</span>
                              <span class="lap-val">{{ r.avgLap }} / lap</span>
                            </span>
                            <span v-if="r.penalty" class="lap-badge lap-penalty">
                              <span class="lap-num">Penalty:</span>
                              <span class="lap-val">+{{ r.penalty }}</span>
                            </span>
                            <span v-if="r.totalTime" class="lap-badge lap-total">
                              <span class="lap-num">Total:</span>
                              <span class="lap-val">{{ r.totalTime }}</span>
                            </span>
                          </template>
                          <span v-else style="color:var(--text-muted);font-style:italic;">
                            No individual lap splits recorded for this rider.
                          </span>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. Grouped By Team -->
    <div v-else-if="listMode === 'TEAM'">
      <div
        v-for="teamGroup in groupedByTeam"
        :key="teamGroup.team"
        class="table-card"
        :data-card-key="`team:${teamGroup.team}`"
      >
        <div class="category-header collapsible-header" @click="toggleCard(`team:${teamGroup.team}`)">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:1;min-width:0;">
            <span :class="teamGroup.isTarget ? 'team-name-lax' : ''">{{ teamGroup.team }}</span>
            <span class="category-badge">{{ teamGroup.riders.length }} RIDERS</span>
          </div>
          <span class="card-toggle-icon" :class="{ collapsed: isCardCollapsed(`team:${teamGroup.team}`) }">▼</span>
        </div>

        <div v-show="!isCardCollapsed(`team:${teamGroup.team}`)" class="collapsible-body">
          <div class="table-responsive-wrapper">
            <table class="results-table">
              <thead>
                <tr>
                  <th style="width:40px;text-align:center;">{{ currentTab === 'results' ? 'Pos' : 'Seed' }}</th>
                  <th style="width:55px;text-align:center;">Plate #</th>
                  <th>Rider Name</th>
                  <th>Category</th>
                  <th style="text-align:center;width:44px;">Div</th>
                  <th v-if="currentTab === 'results'" class="col-time" style="width:85px;text-align:right;">Time</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="r in teamGroup.riders" :key="getRiderKey(r)">
                  <tr
                    :class="[
                      currentTab === 'results' ? 'selectable-rider-row' : '',
                      selectedRiderKeys.has(getRiderKey(r)) ? 'selected' : ''
                    ]"
                    :title="currentTab === 'results' ? 'Tap to toggle lap splits' : undefined"
                    @click="currentTab === 'results' && toggleRiderSelection(getRiderKey(r))"
                  >
                    <td style="text-align:center;font-weight:700;color:var(--text-muted);">
                      {{ currentTab === 'results' ? (r.pl || '-') : (r.seedingRank || r.pl || '-') }}
                    </td>
                    <td style="text-align:center;"><span class="plate-number">#{{ r.no || r.bib }}</span></td>
                    <td><span class="rider-name">{{ r.name }}</span></td>
                    <td><span class="category-pill">{{ r.category }}</span></td>
                    <td style="text-align:center;"><span class="div-tag">D{{ r.div || '1' }}</span></td>
                    <td v-if="currentTab === 'results'" class="col-time" style="text-align:right;white-space:nowrap;">
                      <span v-if="r.status && r.status !== 'OK'" class="status-badge" :class="r.status.toLowerCase()">{{ r.status }}</span>
                      <span v-else>{{ r.totalTime || r.return_val || '-' }}</span>
                      <span v-if="r.laps && r.laps.length > 0" class="rider-expand-icon">▼</span>
                    </td>
                  </tr>
                  <tr
                    v-if="currentTab === 'results' && selectedRiderKeys.has(getRiderKey(r))"
                    class="rider-laps-detail-row"
                  >
                    <td colspan="6">
                      <div class="laps-detail-wrapper">
                        <template v-if="r.laps && r.laps.length > 0">
                          <span v-for="(lapVal, idx) in r.laps" :key="idx" class="lap-badge">
                            <span class="lap-num">Lap {{ idx + 1 }}:</span>
                            <span class="lap-val">{{ lapVal }}</span>
                          </span>
                          <span v-if="r.avgLap" class="lap-badge lap-avg">
                            <span class="lap-num">Avg Pace:</span>
                            <span class="lap-val">{{ r.avgLap }} / lap</span>
                          </span>
                          <span v-if="r.penalty" class="lap-badge lap-penalty">
                            <span class="lap-num">Penalty:</span>
                            <span class="lap-val">+{{ r.penalty }}</span>
                          </span>
                          <span v-if="r.totalTime" class="lap-badge lap-total">
                            <span class="lap-num">Total:</span>
                            <span class="lap-val">{{ r.totalTime }}</span>
                          </span>
                        </template>
                        <span v-else style="color:var(--text-muted);font-style:italic;">
                          No individual lap splits recorded for this rider.
                        </span>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
