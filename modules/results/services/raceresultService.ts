import type { Rider } from '../types/results'

export const targetTeamKeywords = ['holmen', 'la crescent', 'la crosse', 'lacrosse', 'lacrescent', 'lax']

export const categoryOrder = [
  '6th Grade Boys', '6th Grade Girls',
  '7th Grade Boys', '7th Grade Girls',
  '8th Grade Boys', '8th Grade Girls',
  'Freshman Boys', 'Freshman Girls',
  'MS2 Boys', 'MS2 Girls',
  'HS Open Boys', 'HS Open Girls',
  'JV II Boys', 'JV II Girls',
  'JV III Boys', 'JV III Girls',
  'Varsity Boys', 'Varsity Girls'
]

export const defaultWaveSchedule: Record<string, Record<string, { start: string; stage?: string }>> = {
  'Varsity Boys': { '1': { start: '10:00 AM', stage: '9:45 AM' } },
  'JV III Boys': { '1': { start: '10:05 AM', stage: '9:50 AM' }, '2': { start: '10:06 AM', stage: '10:06 AM' } },
  'Varsity Girls': { '1': { start: '11:25 AM', stage: '11:10 AM' } },
  'JV III Girls': { '1': { start: '11:30 AM', stage: '11:15 AM' } },
  'MS2 Boys': { '1': { start: '1:05 PM', stage: '12:50 PM' } },
  'Freshman Boys': { '1': { start: '1:10 PM', stage: '12:55 PM' }, '2': { start: '1:11 PM', stage: '12:55 PM' }, '3': { start: '1:12 PM', stage: '12:55 PM' } },
  '8th Grade Boys': { '1': { start: '1:17 PM', stage: '1:02 PM' }, '2': { start: '1:18 PM', stage: '1:02 PM' } },
  'MS2 Girls': { '1': { start: '2:00 PM', stage: '1:45 PM' } },
  'Freshman Girls': { '1': { start: '2:05 PM', stage: '1:50 PM' } },
  'JV II Girls': { '1': { start: '2:10 PM', stage: '1:55 PM' }, '2': { start: '2:11 PM', stage: '1:55 PM' } },
  '8th Grade Girls': { '1': { start: '2:16 PM', stage: '2:01 PM' } },
  'JV II Boys': { '1': { start: '2:55 PM', stage: '2:40 PM' }, '2': { start: '2:56 PM', stage: '2:40 PM' }, '3': { start: '2:57 PM', stage: '2:40 PM' }, '4': { start: '2:58 PM', stage: '2:40 PM' } },
  '7th Grade Boys': { '1': { start: '3:03 PM', stage: '2:48 PM' }, '2': { start: '3:04 PM', stage: '2:48 PM' } },
  '6th Grade Boys': { '1': { start: '3:40 PM', stage: '3:25 PM' }, '2': { start: '3:41 PM', stage: '3:25 PM' } },
  '7th Grade Girls': { '1': { start: '3:46 PM', stage: '3:31 PM' }, '2': { start: '3:47 PM', stage: '3:31 PM' } },
  '6th Grade Girls': { '1': { start: '3:52 PM', stage: '3:36 PM' } },
  'HS Open Boys': { '1': { start: '3:53 PM', stage: '3:36 PM' } },
  'HS Open Girls': { '1': { start: '3:53 PM', stage: '3:36 PM' } }
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

export const fallbackSnapshot: Rider[] = [
  { category: 'Varsity Boys', wave: 'Wave: 1', pl: '1', no: '74', bib: '584', name: 'Leonard, Ethan', team: 'La Crosse Central High School', div: '2', wv: '1', wv_rank: '1', return_val: '+' },
  { category: 'Varsity Boys', wave: 'Wave: 1', pl: '17', no: '79', bib: '624', name: 'Thomsen, Izzy', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '17', return_val: '-' },
  { category: 'Varsity Boys', wave: 'Wave: 1', pl: '22', no: '76', bib: '615', name: 'Ashby, Ezra', team: 'La Crosse Composite', div: '2', wv: '1', wv_rank: '22', return_val: '-' },
  { category: 'Varsity Boys', wave: 'Wave: 1', pl: '30', no: '94', bib: '619', name: 'Wilde, Landon', team: 'La Crescent High School', div: '2', wv: '1', wv_rank: '30', return_val: '-' },
  { category: 'Varsity Boys', wave: 'Wave: 1', pl: '36', no: '75', bib: '612', name: 'Aslesen, Hosea', team: 'La Crosse Composite', div: '2', wv: '1', wv_rank: '36', return_val: '-' },
  { category: 'Varsity Boys', wave: 'Wave: 1', pl: '41', no: '73', bib: '600', name: 'Hamilton, Theron', team: 'La Crosse Central High School', div: '2', wv: '1', wv_rank: '41', return_val: '-' },
  { category: 'JV III Boys', wave: 'Wave: 1', pl: '7', no: '3505', bib: '519', name: 'Larson, Charlie', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '7', return_val: '+' },
  { category: 'JV III Boys', wave: 'Wave: 1', pl: '12', no: '3506', bib: '536', name: 'Wills, Maxwell', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '12', return_val: '-' },
  { category: 'JV III Boys', wave: 'Wave: 1', pl: '22', no: '3525', bib: '527', name: 'Riffe, Tommy', team: 'La Crescent High School', div: '2', wv: '1', wv_rank: '22', return_val: '-' },
  { category: 'JV III Boys', wave: 'Wave: 1', pl: '25', no: '3531', bib: '545', name: 'Gaulke, Jackson', team: 'Holmen High School MTB Team', div: '2', wv: '1', wv_rank: '25', return_val: '-' },
  { category: 'Varsity Girls', wave: 'Wave: 1', pl: '12', no: '167', bib: '652', name: 'Hale, Lydia', team: 'La Crosse Aquinas High School', div: '2', wv: '1', wv_rank: '12', return_val: '-' },
  { category: 'Varsity Girls', wave: 'Wave: 1', pl: '17', no: '164', bib: '649', name: 'Aslesen, Elizabeth', team: 'La Crosse Composite', div: '2', wv: '1', wv_rank: '17', return_val: '-' },
  { category: 'JV III Girls', wave: 'Wave: 1', pl: '17', no: '3857', bib: '580', name: 'Meyers, Gracie', team: 'La Crosse Central High School', div: '2', wv: '1', wv_rank: '17', return_val: '-' },
  { category: 'MS2 Boys', wave: 'Wave: 1', pl: '6', no: '5522', bib: '660', name: 'Riffe, Cole', team: 'La Crescent High School', div: '2', wv: '1', wv_rank: '6', return_val: '-' },
  { category: 'MS2 Boys', wave: 'Wave: 1', pl: '10', no: '5511', bib: '664', name: 'Marti, Stanley', team: 'La Crosse Central High School', div: '2', wv: '1', wv_rank: '10', return_val: '+' },
  { category: 'MS2 Boys', wave: 'Wave: 1', pl: '19', no: '5510', bib: '673', name: 'Oldenburg, Jensen', team: 'La Crosse Composite', div: '2', wv: '1', wv_rank: '19', return_val: '-' },
  { category: 'MS2 Boys', wave: 'Wave: 1', pl: '22', no: '5521', bib: '676', name: 'Larson, Benjamin', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '22', return_val: '-' },
  { category: 'MS2 Boys', wave: 'Wave: 1', pl: '23', no: '5508', bib: '677', name: 'Schloesser, Vincent', team: 'La Crosse Composite', div: '2', wv: '1', wv_rank: '23', return_val: '-' },
  { category: 'MS2 Boys', wave: 'Wave: 1', pl: '24', no: '5525', bib: '678', name: 'Davey, Gavin', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '24', return_val: '-' },
  { category: 'MS2 Boys', wave: 'Wave: 1', pl: '25', no: '5515', bib: '679', name: 'Hansen, Lane', team: 'Holmen High School MTB Team', div: '2', wv: '1', wv_rank: '25', return_val: '-' },
  { category: 'Freshman Boys', wave: 'Wave: 1', pl: '4', no: '9582', bib: '289', name: 'Hamilton, Kellen', team: 'La Crosse Central High School', div: '2', wv: '1', wv_rank: '4', return_val: '-' },
  { category: 'Freshman Boys', wave: 'Wave: 1', pl: '6', no: '9567', bib: '291', name: 'Vanberg, Isaac', team: 'La Crosse Central High School', div: '2', wv: '1', wv_rank: '6', return_val: '-' },
  { category: 'Freshman Boys', wave: 'Wave: 1', pl: '7', no: '9573', bib: '292', name: 'O\'Brien, Lennon', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '7', return_val: '-' },
  { category: 'Freshman Boys', wave: 'Wave: 1', pl: '10', no: '9579', bib: '295', name: 'Sustar, Henry', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '10', return_val: '-' },
  { category: 'Freshman Boys', wave: 'Wave: 1', pl: '23', no: '9571', bib: '308', name: 'Strassman, Oliver', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '23', return_val: '-' },
  { category: 'Freshman Boys', wave: 'Wave: 1', pl: '36', no: '9522', bib: '321', name: 'Plopper, Henry', team: 'La Crosse Composite', div: '2', wv: '1', wv_rank: '36', return_val: '-' },
  { category: 'Freshman Boys', wave: 'Wave: 2', pl: '3', no: '9504', bib: '333', name: 'Klessig, Liam', team: 'La Crosse Composite', div: '2', wv: '2', wv_rank: '3', return_val: '-' },
  { category: 'Freshman Boys', wave: 'Wave: 2', pl: '7', no: '9503', bib: '337', name: 'Andrjeski, Jace', team: 'La Crosse Composite', div: '2', wv: '2', wv_rank: '7', return_val: '-' },
  { category: 'Freshman Boys', wave: 'Wave: 2', pl: '12', no: '9515', bib: '342', name: 'Kenowski, Eli', team: 'La Crosse Composite', div: '2', wv: '2', wv_rank: '12', return_val: '-' },
  { category: 'Freshman Boys', wave: 'Wave: 2', pl: '21', no: '9569', bib: '371', name: 'Koepke, Rory', team: 'La Crosse Logan High School', div: '2', wv: '2', wv_rank: '21', return_val: '' },
  { category: 'Freshman Boys', wave: 'Wave: 2', pl: '26', no: '9517', bib: '375', name: 'Maki, Quinn', team: 'La Crosse Composite', div: '2', wv: '2', wv_rank: '26', return_val: '' },
  { category: 'Freshman Boys', wave: 'Wave: 2', pl: '27', no: '9520', bib: '368', name: 'Olson, Niels', team: 'La Crosse Logan High School', div: '2', wv: '2', wv_rank: '27', return_val: '' },
  { category: 'Freshman Boys', wave: 'Wave: 2', pl: '42', no: '9507', bib: '356', name: 'Newman, Arlo', team: 'La Crescent High School', div: '2', wv: '2', wv_rank: '42', return_val: '' },
  { category: '8th Grade Boys', wave: 'Wave: 1', pl: '2', no: '8550', bib: '206', name: 'Holzer, Kiran', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '2', return_val: '+' },
  { category: '8th Grade Boys', wave: 'Wave: 1', pl: '3', no: '8519', bib: '207', name: 'Riese, Lukas', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '3', return_val: '+' },
  { category: '8th Grade Boys', wave: 'Wave: 1', pl: '10', no: '8534', bib: '214', name: 'Cherney, Alexander', team: 'Holmen High School MTB Team', div: '2', wv: '1', wv_rank: '10', return_val: '+' },
  { category: '8th Grade Boys', wave: 'Wave: 2', pl: '23', no: '8516', bib: '250', name: 'Severson, Abrahm', team: 'La Crosse Central High School', div: '2', wv: '2', wv_rank: '23', return_val: '' },
  { category: '8th Grade Boys', wave: 'Wave: 2', pl: '26', no: '8517', bib: '253', name: 'Powell, Will', team: 'La Crosse Composite', div: '2', wv: '2', wv_rank: '26', return_val: '' },
  { category: 'MS2 Girls', wave: 'Wave: 1', pl: '11', no: '5863', bib: '691', name: 'Hynek, Quinet', team: 'La Crosse Central High School', div: '2', wv: '1', wv_rank: '11', return_val: '-' },
  { category: 'MS2 Girls', wave: 'Wave: 1', pl: '14', no: '5864', bib: '694', name: 'Wilde, Hadley', team: 'La Crescent High School', div: '2', wv: '1', wv_rank: '14', return_val: '-' },
  { category: 'Freshman Girls', wave: 'Wave: 1', pl: '1', no: '9874', bib: '376', name: 'Olson, Maeven', team: 'La Crosse Central High School', div: '2', wv: '1', wv_rank: '1', return_val: '-' },
  { category: 'Freshman Girls', wave: 'Wave: 1', pl: '2', no: '9877', bib: '377', name: 'Falkenberry, Clara', team: 'La Crosse Central High School', div: '2', wv: '1', wv_rank: '2', return_val: '-' },
  { category: 'Freshman Girls', wave: 'Wave: 1', pl: '12', no: '9875', bib: '387', name: 'Sloan, Matilda', team: 'La Crosse Central High School', div: '2', wv: '1', wv_rank: '12', return_val: '-' },
  { category: 'Freshman Girls', wave: 'Wave: 1', pl: '25', no: '9868', bib: '394', name: 'Kincaid, Stella', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '25', return_val: '' },
  { category: 'JV II Girls', wave: 'Wave: 1', pl: '1', no: '2853', bib: '485', name: 'Jespersen, Gretchen', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '1', return_val: '+' },
  { category: 'JV II Girls', wave: 'Wave: 1', pl: '21', no: '2872', bib: '499', name: 'Ashby, Noella', team: 'La Crosse Aquinas High School', div: '2', wv: '1', wv_rank: '21', return_val: '-' },
  { category: 'JV II Girls', wave: 'Wave: 1', pl: '28', no: '2871', bib: '507', name: 'Passe, Pearl', team: 'La Crosse Central High School', div: '2', wv: '1', wv_rank: '28', return_val: '' },
  { category: '8th Grade Girls', wave: 'Wave: 1', pl: '4', no: '8860', bib: '265', name: 'Miller, Bella', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '4', return_val: '+' },
  { category: '8th Grade Girls', wave: 'Wave: 1', pl: '5', no: '8868', bib: '266', name: 'Hegland-Tarr, Adelyn', team: 'La Crescent High School', div: '2', wv: '1', wv_rank: '5', return_val: '+' },
  { category: 'JV II Boys', wave: 'Wave: 1', pl: '10', no: '2535', bib: '418', name: 'Berendes, Eddie', team: 'La Crosse Aquinas High School', div: '2', wv: '1', wv_rank: '10', return_val: '+' },
  { category: 'JV II Boys', wave: 'Wave: 1', pl: '11', no: '2545', bib: '419', name: 'Rybarik, Aaron', team: 'La Crescent High School', div: '2', wv: '1', wv_rank: '11', return_val: '+' },
  { category: 'JV II Boys', wave: 'Wave: 1', pl: '17', no: '2568', bib: '436', name: 'Gaulke, Colten', team: 'Holmen High School MTB Team', div: '2', wv: '1', wv_rank: '17', return_val: '-' },
  { category: 'JV II Boys', wave: 'Wave: 1', pl: '21', no: '2552', bib: '424', name: 'Gabriel, Asher', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '21', return_val: '-' },
  { category: 'JV II Boys', wave: 'Wave: 1', pl: '27', no: '2534', bib: '454', name: 'Berendes, Benet', team: 'La Crosse Aquinas High School', div: '2', wv: '1', wv_rank: '27', return_val: '-' },
  { category: 'JV II Boys', wave: 'Wave: 1', pl: '34', no: '2533', bib: '464', name: 'Aslesen, Maxwell', team: 'La Crosse Composite', div: '2', wv: '1', wv_rank: '34', return_val: '-' },
  { category: 'JV II Boys', wave: 'Wave: 2', pl: '13', no: '2551', bib: '446', name: 'Thrush, Lane', team: 'La Crosse Aquinas High School', div: '2', wv: '2', wv_rank: '13', return_val: '-' },
  { category: 'JV II Boys', wave: 'Wave: 2', pl: '20', no: '2549', bib: '449', name: 'Moe, Casper', team: 'La Crosse Central High School', div: '2', wv: '2', wv_rank: '20', return_val: '-' },
  { category: 'JV II Boys', wave: 'Wave: 2', pl: '22', no: '2544', bib: '484', name: 'Rybarik, David', team: 'La Crescent High School', div: '2', wv: '2', wv_rank: '22', return_val: '' },
  { category: 'JV II Boys', wave: 'Wave: 2', pl: '29', no: '2532', bib: '473', name: 'Mueller, Sam', team: 'La Crosse Composite', div: '2', wv: '2', wv_rank: '29', return_val: '' },
  { category: 'JV II Boys', wave: 'Wave: 2', pl: '33', no: '2543', bib: '482', name: 'Denny-Omdahl, Billy', team: 'La Crescent High School', div: '2', wv: '2', wv_rank: '33', return_val: '' },
  { category: '7th Grade Boys', wave: 'Wave: 1', pl: '1', no: '7564', bib: '92', name: 'Aslesen, Levi', team: 'La Crosse Composite', div: '2', wv: '1', wv_rank: '1', return_val: '+' },
  { category: '7th Grade Boys', wave: 'Wave: 1', pl: '12', no: '7540', bib: '103', name: 'Elliott, Jade', team: 'Holmen High School MTB Team', div: '2', wv: '1', wv_rank: '12', return_val: '+' },
  { category: '7th Grade Boys', wave: 'Wave: 1', pl: '13', no: '7533', bib: '104', name: 'Sloan, Aj', team: 'La Crosse Central High School', div: '2', wv: '1', wv_rank: '13', return_val: '+' },
  { category: '7th Grade Boys', wave: 'Wave: 1', pl: '22', no: '7537', bib: '119', name: 'Foley, Nolan', team: 'La Crosse Aquinas High School', div: '2', wv: '1', wv_rank: '22', return_val: '+' },
  { category: '7th Grade Boys', wave: 'Wave: 1', pl: '26', no: '7539', bib: '122', name: 'Ptacek, John', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '26', return_val: '+' },
  { category: '7th Grade Boys', wave: 'Wave: 1', pl: '32', no: '7534', bib: '132', name: 'Plopper, Oliver', team: 'La Crosse Composite', div: '2', wv: '1', wv_rank: '32', return_val: '+' },
  { category: '7th Grade Boys', wave: 'Wave: 2', pl: '5', no: '7577', bib: '136', name: 'Smith, Harrison', team: 'Holmen High School MTB Team', div: '2', wv: '2', wv_rank: '5', return_val: '' },
  { category: '7th Grade Boys', wave: 'Wave: 2', pl: '12', no: '7570', bib: '150', name: 'Kim, Austin', team: 'La Crosse Aquinas High School', div: '2', wv: '2', wv_rank: '12', return_val: '' },
  { category: '7th Grade Boys', wave: 'Wave: 2', pl: '19', no: '7538', bib: '165', name: 'Ramsey, Soren', team: 'La Crosse Logan High School', div: '2', wv: '2', wv_rank: '19', return_val: '' },
  { category: '6th Grade Boys', wave: 'Wave: 1', pl: '5', no: '6543', bib: '8', name: 'Cherney, Eric', team: 'Holmen High School MTB Team', div: '2', wv: '1', wv_rank: '5', return_val: '' },
  { category: '6th Grade Boys', wave: 'Wave: 1', pl: '24', no: '6550', bib: '1', name: 'Newman, Henry', team: 'La Crescent High School', div: '2', wv: '1', wv_rank: '24', return_val: '' },
  { category: '6th Grade Boys', wave: 'Wave: 1', pl: '27', no: '6522', bib: '61', name: 'Wizner, Reece', team: 'La Crosse Composite', div: '2', wv: '1', wv_rank: '27', return_val: '' },
  { category: '6th Grade Boys', wave: 'Wave: 2', pl: '1', no: '6521', bib: '18', name: 'Hamilton, Rowan', team: 'La Crosse Central High School', div: '2', wv: '2', wv_rank: '1', return_val: '' },
  { category: '6th Grade Boys', wave: 'Wave: 2', pl: '4', no: '6524', bib: '35', name: 'Sustar, Charlie', team: 'La Crosse Logan High School', div: '2', wv: '2', wv_rank: '4', return_val: '' },
  { category: '6th Grade Boys', wave: 'Wave: 2', pl: '8', no: '6546', bib: '21', name: 'Wills, Montgomery', team: 'La Crosse Logan High School', div: '2', wv: '2', wv_rank: '8', return_val: '' },
  { category: '6th Grade Boys', wave: 'Wave: 2', pl: '15', no: '6554', bib: '36', name: 'Lein, Eli', team: 'Holmen High School MTB Team', div: '2', wv: '2', wv_rank: '15', return_val: '' },
  { category: '6th Grade Boys', wave: 'Wave: 2', pl: '21', no: '6523', bib: '2', name: 'Drazkowski, Sebastian', team: 'La Crosse Composite', div: '2', wv: '2', wv_rank: '21', return_val: '' },
  { category: '6th Grade Boys', wave: 'Wave: 2', pl: '23', no: '6525', bib: '14', name: 'Staehly, Ethan', team: 'La Crosse Logan High School', div: '2', wv: '2', wv_rank: '23', return_val: '' },
  { category: '6th Grade Boys', wave: 'Wave: 2', pl: '28', no: '6551', bib: '63', name: 'Hegland-Tarr, Macsen', team: 'La Crescent High School', div: '2', wv: '2', wv_rank: '28', return_val: '' },
  { category: '6th Grade Boys', wave: 'Wave: 2', pl: '29', no: '6558', bib: '7', name: 'Nguyen, John', team: 'La Crosse Composite', div: '2', wv: '2', wv_rank: '29', return_val: '' },
  { category: '6th Grade Boys', wave: 'Wave: 2', pl: '32', no: '6544', bib: '59', name: 'Kader, Kylan', team: 'La Crosse Central High School', div: '2', wv: '2', wv_rank: '32', return_val: '' },
  { category: '7th Grade Girls', wave: 'Wave: 1', pl: '13', no: '7864', bib: '183', name: 'Zouski, Elle', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '13', return_val: '+' },
  { category: '7th Grade Girls', wave: 'Wave: 1', pl: '18', no: '7863', bib: '203', name: 'Jostad, Nora', team: 'La Crosse Composite', div: '2', wv: '1', wv_rank: '18', return_val: '' },
  { category: '7th Grade Girls', wave: 'Wave: 1', pl: '22', no: '7881', bib: '188', name: 'Valencia, Vicenza', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '22', return_val: '' },
  { category: '7th Grade Girls', wave: 'Wave: 1', pl: '23', no: '7868', bib: '190', name: 'Woolever, Maggie', team: 'La Crosse Aquinas High School', div: '2', wv: '1', wv_rank: '23', return_val: '' },
  { category: '7th Grade Girls', wave: 'Wave: 1', pl: '26', no: '7869', bib: '184', name: 'Teska, Adelaide', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '26', return_val: '' },
  { category: '6th Grade Girls', wave: 'Wave: 1', pl: '9', no: '6852', bib: '71', name: 'Stindt, Julianne', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '9', return_val: '' },
  { category: '6th Grade Girls', wave: 'Wave: 1', pl: '12', no: '6870', bib: '78', name: 'Ronsman, Juniper', team: 'La Crosse Central High School', div: '2', wv: '1', wv_rank: '12', return_val: '' },
  { category: '6th Grade Girls', wave: 'Wave: 1', pl: '18', no: '6853', bib: '73', name: 'Valencia, Esme', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '18', return_val: '' },
  { category: '6th Grade Girls', wave: 'Wave: 1', pl: '20', no: '6851', bib: '69', name: 'Schwaller, Margot', team: 'La Crosse Logan High School', div: '2', wv: '1', wv_rank: '20', return_val: '' },
  { category: '6th Grade Girls', wave: 'Wave: 1', pl: '25', no: '6871', bib: '84', name: 'Klessig, Adah', team: 'La Crosse Composite', div: '2', wv: '1', wv_rank: '25', return_val: '' },
  { category: 'HS Open Boys', wave: 'Wave: 1', pl: '2', no: '1500', bib: '406', name: 'Wurzel, Rohan', team: 'La Crosse Central High School', div: '2', wv: '1', wv_rank: '2', return_val: '-' }
]

export function parseUniversalData(
  resultData: any,
  listId: string,
  page: 'list' | 'results'
): Rider[] {
  const rawData = resultData?.data
  if (!rawData) return []

  const extracted: Rider[] = []

  function traverse(node: any, context: Partial<Rider>) {
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      for (const [key, val] of Object.entries(node)) {
        const cleanKey = key.includes('_') ? key.split('_').slice(1).join('_') : key
        const newCtx = { ...context }

        if (cleanKey.includes('Wave')) {
          newCtx.wave = cleanKey
        } else if (
          categoryOrder.some(c => cleanKey.includes(c)) ||
          cleanKey.includes('Boys') || cleanKey.includes('Girls') ||
          cleanKey.includes('Open') || cleanKey.includes('Varsity') ||
          cleanKey.includes('JV') || cleanKey.includes('Grade') ||
          cleanKey.includes('MS')
        ) {
          newCtx.category = normalizeCategoryName(cleanKey)
        } else if (
          cleanKey.includes('School') || cleanKey.includes('Composite') ||
          cleanKey.includes('Team') || cleanKey.includes('Cycling') ||
          cleanKey.includes('Spooner')
        ) {
          newCtx.team = cleanKey.replace(/\s*\(Division\s*\d+\)/i, '').trim()
        }
        traverse(val, newCtx)
      }
    } else if (Array.isArray(node)) {
      node.forEach(row => {
        if (Array.isArray(row) && row.length >= 4) {
          const rider: Rider = {
            no: String(row[0] || ''),
            bib: String(row[1] || row[0] || ''),
            pl: String(row[2] || ''),
            name: String(page === 'list' && listId === '747B52' ? row[2] || '' : row[3] || ''),
            team: String(page === 'list' && listId === '747B52' ? context.team || '' : row[4] || context.team || ''),
            category: normalizeCategoryName(context.category || ''),
            wave: context.wave || 'Wave: 1',
            div: row[5] || '1',
            wv: row[6] || '1',
            wv_rank: row[2] || '',
            return_val: row[7] || '+'
          }

          if (listId === '747B52') {
            rider.gender = row[3] || ''
            rider.category = normalizeCategoryName(row[4] || context.category || '')
            rider.div = rider.team && rider.team.includes('Division 1') ? '1' : '2'
            rider.laps = []
            rider.lap1 = '-'
            rider.lap2 = '-'
            rider.lap3 = '-'
            rider.lap4 = '-'
            rider.totalTime = ''
            rider.avgLap = ''
          } else if (page === 'results') {
            const rawLaps = [row[7], row[8], row[9], row[10]]
              .map(l => String(l || '').trim())
              .filter(l => l && l !== '-' && l !== '*' && l !== '0' && l !== '00:00')
            rider.laps = rawLaps
            rider.lap1 = (row[7] && row[7] !== '*' && row[7] !== '0') ? String(row[7]).trim() : '-'
            rider.lap2 = (row[8] && row[8] !== '*' && row[8] !== '0') ? String(row[8]).trim() : '-'
            rider.lap3 = (row[9] && row[9] !== '*' && row[9] !== '0') ? String(row[9]).trim() : '-'
            rider.lap4 = (row[10] && row[10] !== '*' && row[10] !== '0') ? String(row[10]).trim() : '-'

            const rawPen = (row[11] && row[11] !== '*' && row[11] !== '0' && row[11] !== '00:00') ? String(row[11]).trim() : ''
            rider.penalty = rawPen ? rawPen.replace(/^0(\d:)/, '$1') : ''

            rider.totalTime = String(row[12] || rawLaps[rawLaps.length - 1] || '').trim()

            if (rawLaps.length > 0) {
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
              rawLaps.forEach(l => {
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
                rider.avgLap = `${m}:${String(s).padStart(2, '0')}`
              }
            }
          }

          if (rider.name && rider.team) {
            extracted.push(rider)
          }
        } else if (typeof row === 'object') {
          traverse(row, context)
        }
      })
    }
  }

  traverse(rawData, {})
  return extracted
}
