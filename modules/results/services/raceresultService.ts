import type { Rider } from '../types/results'

export const targetTeamKeywords = ['holmen', 'la crescent', 'la crosse']

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

export function normalizeCategoryName(name: string): string {
  if (!name) return ''
  let clean = name.replace(/^(\d+_)+/, '').replace(/^Category:\s*/i, '').trim()
  clean = clean.replace(/^9th grade/i, 'Freshman')
  clean = clean.replace(/\bjviii\b/i, 'JV III')
  clean = clean.replace(/\bjvii\b/i, 'JV II')
  clean = clean.replace(/\bhso\b/i, 'HS Open')
  return clean
}

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
