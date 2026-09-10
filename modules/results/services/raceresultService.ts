import type { Rider } from '../types/results'

export const targetTeamKeywords = ['holmen', 'la crescent', 'la crosse', 'lacrosse', 'lacrescent', 'lax']

export const categoryOrder = [
  'Varsity Boys',
  'JV III Boys',
  'Varsity Girls',
  'JV III Girls',
  'MS2 Boys',
  'Freshman Boys',
  'MS2 Girls',
  'Freshman Girls',
  'JV II Girls',
  'JV II Boys',
  '8th Grade Boys',
  '7th Grade Boys',
  '6th Grade Boys',
  '8th Grade Girls',
  '7th Grade Girls',
  '6th Grade Girls',
  'HS Open Boys',
  'HS Open Girls'
]

export const defaultWaveSchedule: Record<string, Record<string, { start: string; stage?: string }>> = {
  'Varsity Boys': { '1': { start: '8:00 AM', stage: '7:45 AM' } },
  'JV III Boys': { '1': { start: '8:05 AM', stage: '7:50 AM' }, '2': { start: '8:06 AM', stage: '7:50 AM' } },
  'Varsity Girls': { '1': { start: '9:20 AM', stage: '9:05 AM' } },
  'JV III Girls': { '1': { start: '9:25 AM', stage: '9:10 AM' } },
  'MS2 Boys': { '1': { start: '10:48 AM', stage: '10:33 AM' } },
  'Freshman Boys': {
    '1': { start: '10:53 AM', stage: '10:38 AM' },
    '2': { start: '10:54 AM', stage: '10:38 AM' },
    '3': { start: '10:55 AM', stage: '10:38 AM' }
  },
  'MS2 Girls': { '1': { start: '11:35 AM', stage: '11:20 AM' } },
  'Freshman Girls': { '1': { start: '11:40 AM', stage: '11:25 AM' } },
  'JV II Girls': {
    '1': { start: '11:45 AM', stage: '11:30 AM' },
    '2': { start: '11:46 AM', stage: '11:30 AM' }
  },
  'JV II Boys': {
    '1': { start: '12:45 PM', stage: '12:30 PM' },
    '2': { start: '12:46 PM', stage: '12:30 PM' },
    '3': { start: '12:47 PM', stage: '12:30 PM' },
    '4': { start: '12:48 PM', stage: '12:30 PM' }
  },
  '8th Grade Boys': {
    '1': { start: '1:30 PM', stage: '1:15 PM' },
    '2': { start: '1:31 PM', stage: '1:15 PM' }
  },
  '7th Grade Boys': {
    '1': { start: '1:36 PM', stage: '1:21 PM' },
    '2': { start: '1:37 PM', stage: '1:21 PM' }
  },
  '6th Grade Boys': {
    '1': { start: '1:42 PM', stage: '1:27 PM' },
    '2': { start: '1:43 PM', stage: '1:27 PM' }
  },
  '8th Grade Girls': { '1': { start: '1:58 PM', stage: '1:43 PM' } },
  '7th Grade Girls': {
    '1': { start: '2:03 PM', stage: '1:48 PM' },
    '2': { start: '2:04 PM', stage: '1:48 PM' }
  },
  '6th Grade Girls': { '1': { start: '2:09 PM', stage: '1:54 PM' } },
  'HS Open Boys': { '1': { start: '2:11 PM', stage: '1:56 PM' } },
  'HS Open Girls': { '1': { start: '2:11 PM', stage: '1:56 PM' } }
}

export function parseTimeStrToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return null
  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const meridiem = match[3].toUpperCase()
  if (meridiem === 'PM' && hours < 12) hours += 12
  if (meridiem === 'AM' && hours === 12) hours = 0
  return hours * 60 + minutes
}

export function formatMinutesToTimeStr(totalMinutes?: number | null): string {
  if (totalMinutes === null || totalMinutes === undefined || isNaN(totalMinutes)) return ''
  let mins = Math.round(totalMinutes) % 1440
  if (mins < 0) mins += 1440
  let hours = Math.floor(mins / 60)
  const m = mins % 60
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  if (hours > 12) hours -= 12
  if (hours === 0) hours = 12
  return `${hours}:${m < 10 ? '0' : ''}${m} ${meridiem}`
}

export function getWaveScheduleEntry(race: any, category: string, waveStr: string): { start?: string; stage?: string } | null {
  if (!category) return null
  const sched = (race && race.waveSchedule) || defaultWaveSchedule
  const normCat = category.trim().toLowerCase()
    .replace(/^9th grade/, 'freshman')
    .replace(/\bjviii\b/i, 'jv iii')
    .replace(/\bjvii\b/i, 'jv ii')
    .replace(/\bhso\b/i, 'hs open')

  const cKey = Object.keys(sched).find(k => {
    const kNorm = k.trim().toLowerCase()
      .replace(/^9th grade/, 'freshman')
      .replace(/\bjviii\b/i, 'jv iii')
      .replace(/\bjvii\b/i, 'jv ii')
      .replace(/\bhso\b/i, 'hs open')
    return kNorm === normCat
  }) || Object.keys(sched).find(k => k.toLowerCase() === category.toLowerCase()) || category

  const catObj = sched[cKey]
  if (!catObj) return null
  const match = String(waveStr || '').match(/\d+/)
  const waveNum = match ? match[0] : '1'
  const val = catObj[waveNum] || catObj['Wave: ' + waveNum] || catObj['1'] || (catObj as any).default || null
  if (!val) return null
  if (typeof val === 'object') {
    return val
  }
  return { start: val, stage: undefined }
}

export function getCategoryStartTime(race: any, category: string): string | null {
  const entry = getWaveScheduleEntry(race, category, '1')
  return entry ? (entry.start || null) : null
}

export function getCategoryStageTime(race: any, category: string): string | null {
  const entry = getWaveScheduleEntry(race, category, '1')
  return entry ? (entry.stage || null) : null
}

export function getCategoryStartTimeMinutes(race: any, category: string): number {
  const startStr = getCategoryStartTime(race, category)
  if (!startStr) return 9999
  const mins = parseTimeStrToMinutes(startStr)
  return mins !== null ? mins : 9999
}

export function getWaveWarmupTime(race: any, category: string, waveStr: string, customWarmupOffset = 45): string | null {
  const entry = getWaveScheduleEntry(race, category, waveStr)
  if (!entry) return null
  let stageMins = parseTimeStrToMinutes(entry.stage)
  if (stageMins === null) {
    const startMins = parseTimeStrToMinutes(entry.start)
    if (startMins !== null) stageMins = startMins - 15
  }
  if (stageMins === null) return null
  const warmupMins = stageMins - customWarmupOffset
  return formatMinutesToTimeStr(warmupMins)
}

export function compareCategories(a: string, b: string, sortOrder: string, race: any): number {
  if (sortOrder === 'TIME') {
    const timeA = getCategoryStartTimeMinutes(race, a)
    const timeB = getCategoryStartTimeMinutes(race, b)
    if (timeA !== timeB) return timeA - timeB
  }
  let ia = categoryOrder.indexOf(a)
  let ib = categoryOrder.indexOf(b)
  if (ia === -1) ia = 99
  if (ib === -1) ib = 99
  return ia - ib
}

export function normalizeCategoryName(name: string): string {
  if (!name) return ''
  let clean = String(name).replace(/^(\d+_)+/, '').replace(/^Category:\s*/i, '').replace(/\s+\d+$/, '').trim()
  const m = clean.match(/^(Boys|Girls)\s+(.*)$/i)
  if (m) {
    clean = `${m[2].trim()} ${m[1].trim()}`
  }
  clean = clean.replace(/^9th grade/i, 'Freshman')
  clean = clean.replace(/\bjviii\b/i, 'JV III')
  clean = clean.replace(/\bjvii\b/i, 'JV II')
  clean = clean.replace(/\bhso\b/i, 'HS Open')
  return clean
}

/**
 * Metadata-driven field index resolver.
 * Handles RACE RESULT column ordering where row[0]=ID, row[1]=Bib/Key, and fields follow.
 */
export interface ColumnIndexMap {
  bib?: number
  no?: number
  name?: number
  team?: number
  category?: number
  gender?: number
  division?: number
  waveOrField?: number
  seedingRank?: number
  seriesRank?: number
  rank?: number
  points?: number
  laps?: number[]
  lap1?: number
  lap2?: number
  lap3?: number
  lap4?: number
  penalty?: number
  totalTime?: number
  teamPlc?: number
  teamPoints?: number
  teamPenalty?: number
}

export function resolveColumnIndices(fields: any[], rowLength: number): ColumnIndexMap {
  const map: ColumnIndexMap = {}
  if (!Array.isArray(fields) || fields.length === 0) return map

  // row[1] is always the Bib/Plate number or entity ID in RACE RESULT export
  if (rowLength >= 2) {
    map.bib = 1
    map.no = 1
  }

  const lapIndices: number[] = []

  // Check if Fields[0] is Bib (e.g. Team start lists) vs PL/PLC (e.g. Category lists / Results)
  const firstFieldExpr = String(fields[0]?.Expression || '').toUpperCase()
  const firstFieldLabel = String(fields[0]?.Label || '').toUpperCase()
  const firstIsBib = firstFieldExpr === 'BIB' || firstFieldLabel === 'BIB' || firstFieldLabel === 'NO'

  const secondFieldExpr = String(fields[1]?.Expression || '').toUpperCase()
  const secondFieldLabel = String(fields[1]?.Label || '').toUpperCase()
  const secondIsBib = secondFieldExpr === 'BIB' || secondFieldLabel === 'NO' || secondFieldLabel === 'BIB'

  fields.forEach((f, idx) => {
    let colIdx: number

    if (firstIsBib) {
      // e.g. Fields = [Bib, Name, Gender, Category, FLD]
      // row = [ID, Bib, Name, Gender, Category, FLD]
      colIdx = 1 + idx
    } else if (secondIsBib) {
      // e.g. Fields = [PL/PLC, NO, NAME, TEAM, FLD, ...]
      // row = [ID, Bib, PL/PLC, NAME, TEAM, FLD, ...]
      if (idx === 0) colIdx = 2 // PL / PLC
      else if (idx === 1) colIdx = 1 // NO / BIB
      else colIdx = 1 + idx // NAME at 3, TEAM at 4, etc.
    } else {
      // e.g. Fields = [PLC, TEAM, PENALTY PTS, PTS]
      // row = [ID, Key, PLC, TEAM, PENALTY PTS, PTS]
      colIdx = 2 + idx
    }

    const expr = String(f.Expression || '').trim()
    const label = String(f.Label || '').trim().toUpperCase()

    // BIB / NO
    if (expr === 'BIB' || expr === 'DisplayBib' || expr === 'PLATE' || label === 'NO' || label === 'BIB' || label === 'PLATE') {
      map.bib = colIdx
      map.no = colIdx
    }

    // Name
    if (
      expr.includes('DisplayName') ||
      expr.includes('LFNAME') ||
      expr.includes('FIRSTNAME') ||
      label === 'NAME'
    ) {
      if (map.name === undefined) map.name = colIdx
    }

    // Team / Club
    if (expr === 'CLUB' || label === 'TEAM' || label === 'CLUB') {
      if (map.team === undefined) map.team = colIdx
    }

    // Category
    if (expr.includes('CONTEST.NAME') || expr.includes('CONTEST.Category') || label === 'CAT' || label === 'CATEGORY') {
      if (map.category === undefined) map.category = colIdx
    }

    // Gender
    if (expr.includes('SexMF') || expr.includes('SexBG') || expr === 'SEX' || label === 'GENDER' || label === 'SEX') {
      if (map.gender === undefined) map.gender = colIdx
    }

    // Division / Grade
    if (expr === 'Division' || expr === 'Grade' || label === 'DIVISION' || label === 'DIV' || label === 'GRD') {
      if (map.division === undefined) map.division = colIdx
    }

    // Wave or Field
    if (expr === 'SplitWave' || expr === 'SplitField' || label === 'WAV' || label === 'FLD' || label === 'WAVE' || label === 'FIELD') {
      if (map.waveOrField === undefined) map.waveOrField = colIdx
    }

    // Seeding Rank
    if (expr.includes('WaveRank_Seeding') || expr.includes('FieldRank_Seeding') || label === 'FLD RANK' || label === 'WAVE RANK') {
      if (map.seedingRank === undefined) map.seedingRank = colIdx
    }

    // Series Rank / PL
    if (expr.includes('SeriesRank_Seeding') || expr === 'SeriesRank' || (label === 'PL' && !expr.includes('RANK1'))) {
      if (map.seriesRank === undefined) map.seriesRank = colIdx
    }

    // Finishing Rank / PLC
    if (expr.includes('RANK1') || label === 'PLC' || label === 'PLACE' || label === 'RANK') {
      if (map.rank === undefined) map.rank = colIdx
    }

    // Points
    if (expr.includes('DisplayPoints') || expr.includes('Points_Series') || label === 'PTS' || label === 'IND PTS') {
      if (map.points === undefined) map.points = colIdx
    }

    // Lap times
    if (expr.includes('DisplayLapTime(1)') || label === 'LAP1') {
      map.lap1 = colIdx
      lapIndices[0] = colIdx
    } else if (expr.includes('DisplayLapTime(2)') || label === 'LAP2') {
      map.lap2 = colIdx
      lapIndices[1] = colIdx
    } else if (expr.includes('DisplayLapTime(3)') || label === 'LAP3') {
      map.lap3 = colIdx
      lapIndices[2] = colIdx
    } else if (expr.includes('DisplayLapTime(4)') || label === 'LAP4') {
      map.lap4 = colIdx
      lapIndices[3] = colIdx
    }

    // Penalty
    if (expr.includes('TIME20') || label === 'PEN' || label === 'PENALTY') {
      map.penalty = colIdx
    }

    // Total Time / Status
    if (expr === 'TimeOrStatus' || expr === 'TIME' || label === 'TIME' || label === 'TOTAL TIME') {
      if (map.totalTime === undefined) map.totalTime = colIdx
    }

    // Team Standings
    if (expr.includes('TS199.TIME1') || expr.includes('TS299.TIME1') || expr.includes('TS4.TIME1') || (label === 'PTS' && expr.includes('choose([Division]'))) {
      map.teamPoints = colIdx
    }
    if (label === 'PENALTY PTS' || expr.includes('TS1.DECIMALTIME2')) {
      map.teamPenalty = colIdx
    }
  })

  if (lapIndices.length > 0) {
    map.laps = lapIndices
  }

  return map
}

interface GroupContext {
  category?: string
  waveOrField?: string
  waveOrFieldType?: 'wave' | 'field'
  waveOrFieldNum?: string
  team?: string
  division?: string
}

function extractGroupContext(key: string, currentCtx: GroupContext): GroupContext {
  const cleanKey = key.includes('_') ? key.split('_').slice(1).join('_') : key
  const ctx: GroupContext = { ...currentCtx }

  // Wave or Field header
  if (cleanKey.match(/\bfield:\s*(\d+)/i) || cleanKey.match(/\bfield\s*(\d+)/i)) {
    const m = cleanKey.match(/\bfield:?\s*(\d+)/i)
    ctx.waveOrField = `Field: ${m ? m[1] : cleanKey}`
    ctx.waveOrFieldType = 'field'
    ctx.waveOrFieldNum = m ? m[1] : '1'
  } else if (cleanKey.match(/\bwave:\s*(\d+)/i) || cleanKey.match(/\bwave\s*(\d+)/i)) {
    const m = cleanKey.match(/\bwave:?\s*(\d+)/i)
    ctx.waveOrField = `Wave: ${m ? m[1] : cleanKey}`
    ctx.waveOrFieldType = 'wave'
    ctx.waveOrFieldNum = m ? m[1] : '1'
  }

  // Category header
  if (
    categoryOrder.some(c => cleanKey.toLowerCase().includes(c.toLowerCase())) ||
    cleanKey.includes('Boys') || cleanKey.includes('Girls') ||
    cleanKey.includes('Open') || cleanKey.includes('Varsity') ||
    cleanKey.includes('JV') || cleanKey.includes('Grade') ||
    cleanKey.includes('MS')
  ) {
    ctx.category = normalizeCategoryName(cleanKey)
  }

  // Division header
  const divMatch = cleanKey.match(/division\s*(\d+)/i)
  if (divMatch) {
    ctx.division = divMatch[1]
  }

  // Team header
  if (
    cleanKey.includes('School') || cleanKey.includes('Composite') ||
    cleanKey.includes('Team') || cleanKey.includes('Cycling') ||
    cleanKey.includes('Club') || cleanKey.includes('Spooner')
  ) {
    ctx.team = cleanKey.replace(/\s*\(Division\s*\d+\)/i, '').replace(/\s*-?\s*D\d+/i, '').trim()
  }

  return ctx
}

function calculateAverageLapTime(laps: string[]): string {
  if (!laps || laps.length === 0) return ''
  const toSec = (str: string) => {
    if (!str) return 0
    const clean = str.replace(/\*$/, '').trim()
    const parts = clean.split(':').map(parseFloat)
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    return parts[0] || 0
  }
  let validCount = 0
  let totalSec = 0
  laps.forEach(l => {
    const s = toSec(l)
    if (s > 0) {
      totalSec += s
      validCount++
    }
  })
  if (validCount > 0) {
    const avg = totalSec / validCount
    const m = Math.floor(avg / 60)
    const s = Math.round(avg % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }
  return ''
}

/**
 * Determine View Type from Report Metadata
 */
export function detectFeedViewType(
  listObj?: { ID?: string; Name?: string; ListName?: string; Fields?: any[] },
  page?: 'list' | 'results'
): FeedViewType {
  const name = String(listObj?.ListName || listObj?.Name || '').toLowerCase()
  const fields = listObj?.Fields || []

  if (name.includes('team results') && !name.includes('individual')) {
    return 'team_standings'
  }
  if (page === 'results') {
    if (name.includes('by team')) return 'individual_results_by_team'
    return 'individual_results'
  }
  // page === 'list'
  if (name.includes('by team') || name.includes('start by team')) {
    return 'team_start_list'
  }
  return 'category_start_list'
}

/**
 * Main Universal Data Parser.
 * Processes any RACE RESULT JSON payload using list schema and grouping metadata.
 */
export function parseUniversalData(
  resultData: any,
  listId: string,
  page: 'list' | 'results'
): ParsedFeedResult {
  const rawData = resultData?.data
  const fields = resultData?.list?.Fields || []
  const listName = resultData?.list?.ListName || resultData?.list?.Name || ''
  const viewType = detectFeedViewType({ ID: listId, Name: listName, ListName: listName, Fields: fields }, page)

  if (!rawData || (Array.isArray(rawData) && rawData.length === 0)) {
    return {
      viewType,
      riders: [],
      teamStandings: [],
      isEmpty: true,
      rawCount: 0,
      feedTitle: listName
    }
  }

  const riders: Rider[] = []
  const teamStandings: TeamStanding[] = []
  let rawCount = 0

  function processRow(row: any[], ctx: GroupContext) {
    if (!Array.isArray(row) || row.length === 0) return
    rawCount++

    const map = resolveColumnIndices(fields, row.length)

    if (viewType === 'team_standings') {
      const team = String((map.team !== undefined ? row[map.team] : '') || ctx.team || '').trim()
      const rank = String((map.rank !== undefined ? row[map.rank] : '') || (map.teamPlc !== undefined ? row[map.teamPlc] : '') || '').trim()
      const points = String((map.teamPoints !== undefined ? row[map.teamPoints] : '') || (map.points !== undefined ? row[map.points] : '') || '0').trim()
      const penaltyPoints = String((map.teamPenalty !== undefined ? row[map.teamPenalty] : '') || '').trim()
      const division = String((map.division !== undefined ? row[map.division] : '') || ctx.division || '1').trim()

      if (team) {
        teamStandings.push({
          rank: rank.replace(/[*#]/g, ''),
          team,
          division: division.replace(/^division\s*/i, ''),
          points,
          penaltyPoints
        })
      }
      return
    }

    // Rider fields
    const bib = String((map.bib !== undefined ? row[map.bib] : '') || '').trim()
    const no = String((map.no !== undefined ? row[map.no] : '') || bib).trim()
    const name = String((map.name !== undefined ? row[map.name] : '') || '').trim()
    const team = String((map.team !== undefined ? row[map.team] : '') || ctx.team || '').trim()
    const category = normalizeCategoryName(
      String((map.category !== undefined ? row[map.category] : '') || ctx.category || '').trim()
    )
    const gender = String((map.gender !== undefined ? row[map.gender] : '') || '').trim()
    const div = String((map.division !== undefined ? row[map.division] : '') || ctx.division || '1').trim()

    // Wave / Field
    const rawWaveOrField = String((map.waveOrField !== undefined ? row[map.waveOrField] : '') || ctx.waveOrFieldNum || '').trim()
    const waveOrFieldType: 'wave' | 'field' = ctx.waveOrFieldType || (fields.some(f => String(f.Expression).includes('SplitField')) ? 'field' : 'wave')
    const waveOrFieldNum = rawWaveOrField || ctx.waveOrFieldNum || '1'
    const waveOrField = ctx.waveOrField || `${waveOrFieldType === 'field' ? 'Field' : 'Wave'}: ${waveOrFieldNum}`

    // Seeding & Series Ranks
    const seedingRank = String((map.seedingRank !== undefined ? row[map.seedingRank] : '') || '').trim()
    const seriesRank = String((map.seriesRank !== undefined ? row[map.seriesRank] : '') || '').trim()

    // Results-specific fields
    const rawRank = String((map.rank !== undefined ? row[map.rank] : '') || (map.seriesRank !== undefined ? row[map.seriesRank] : '') || '').trim()
    const rawTime = String((map.totalTime !== undefined ? row[map.totalTime] : '') || '').trim()
    const rawPen = String((map.penalty !== undefined ? row[map.penalty] : '') || '').trim().replace(/^0(\d:)/, '$1')
    const points = String((map.points !== undefined ? row[map.points] : '') || '').trim()

    // Lap times
    const lap1 = map.lap1 !== undefined && row[map.lap1] ? String(row[map.lap1]).trim() : '-'
    const lap2 = map.lap2 !== undefined && row[map.lap2] ? String(row[map.lap2]).trim() : '-'
    const lap3 = map.lap3 !== undefined && row[map.lap3] ? String(row[map.lap3]).trim() : '-'
    const lap4 = map.lap4 !== undefined && row[map.lap4] ? String(row[map.lap4]).trim() : '-'
    const laps = [lap1, lap2, lap3, lap4].filter(l => l && l !== '-' && l !== '*' && l !== '0' && l !== '00:00')

    // Determine DNF / DNS / DQ status
    let status = 'OK'
    const statusCandidate = (rawTime + ' ' + rawRank).toUpperCase()
    if (statusCandidate.includes('DNF')) status = 'DNF'
    else if (statusCandidate.includes('DNS')) status = 'DNS'
    else if (statusCandidate.includes('DSQ') || statusCandidate.includes('DQ')) status = 'DQ'

    const rider: Rider = {
      bib,
      no,
      name,
      team,
      category,
      gender,
      div: div.replace(/^division\s*/i, ''),
      wave: waveOrField,
      waveOrField,
      waveOrFieldType,
      waveOrFieldNum,
      seedingRank,
      seriesRank,
      wv: waveOrFieldNum,
      wv_rank: seedingRank || rawRank,
      pl: rawRank.replace(/[*]/g, ''),
      totalTime: status !== 'OK' ? status : rawTime,
      status,
      points,
      penalty: rawPen,
      laps,
      lap1: lap1 !== '*' && lap1 !== '0' ? lap1 : '-',
      lap2: lap2 !== '*' && lap2 !== '0' ? lap2 : '-',
      lap3: lap3 !== '*' && lap3 !== '0' ? lap3 : '-',
      lap4: lap4 !== '*' && lap4 !== '0' ? lap4 : '-',
      avgLap: calculateAverageLapTime(laps)
    }

    if (rider.name && (rider.team || rider.bib)) {
      riders.push(rider)
    }
  }

  function traverse(node: any, currentCtx: GroupContext) {
    if (!node) return
    if (Array.isArray(node)) {
      node.forEach(item => {
        if (Array.isArray(item)) {
          processRow(item, currentCtx)
        } else if (typeof item === 'object') {
          traverse(item, currentCtx)
        }
      })
    } else if (typeof node === 'object') {
      for (const [key, val] of Object.entries(node)) {
        const nextCtx = extractGroupContext(key, currentCtx)
        traverse(val, nextCtx)
      }
    }
  }

  traverse(rawData, {})

  return {
    viewType,
    riders,
    teamStandings,
    isEmpty: riders.length === 0 && teamStandings.length === 0,
    rawCount,
    feedTitle: listName
  }
}
