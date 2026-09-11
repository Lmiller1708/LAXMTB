import { describe, it, expect } from 'vitest'
import { getFallbackSeedResults } from '../modules/results/services/fallbackResultsService'

describe('Offline Fallback Results Service', () => {
  it('returns valid offline start list for Bluff Bash (418104)', () => {
    const res = getFallbackSeedResults('418104', 'list')
    expect(res).not.toBeNull()
    expect(res?.riders.length).toBeGreaterThan(0)
    expect(res?.viewType).toBe('category_start_list')
    expect(res?.selectedListId).toBe('A76F6B')
  })

  it('returns valid offline results for Bluff Bash (418104)', () => {
    const res = getFallbackSeedResults('418104', 'results')
    expect(res).not.toBeNull()
    expect(res?.riders.length).toBeGreaterThan(0)
    expect(res?.viewType).toBe('individual_results')
    expect(res?.selectedListId).toBe('4C8C1F')
  })

  it('returns valid offline start list for Cable Conquest (421732)', () => {
    const res = getFallbackSeedResults('421732', 'list')
    expect(res).not.toBeNull()
    expect(res?.riders.length).toBeGreaterThan(0)
    expect(res?.viewType).toBe('category_start_list')
  })
})
