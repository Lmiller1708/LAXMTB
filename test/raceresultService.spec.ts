import { describe, it, expect } from 'vitest'
import bbCategoryList from './fixtures/418104_list_category.json'
import bbTeamList from './fixtures/418104_list_team.json'
import bbResultsInd from './fixtures/418104_results_individual.json'
import bbResultsTeam from './fixtures/418104_results_team.json'
import cableCategoryList from './fixtures/421732_list_category.json'
import cableTeamList from './fixtures/421732_list_team.json'
import cableResultsEmpty from './fixtures/421732_results_empty.json'

import {
  parseUniversalData,
  resolveColumnIndices,
  detectFeedViewType,
  normalizeCategoryName,
  compareCategories,
  getWaveScheduleEntry,
  getCategoryStartTime,
  getCategoryStageTime,
  getWaveWarmupTime,
  calculateDefaultGroupWarmupTime,
  formatWarmupGroupTitle,
  parseDateRange,
  formatDateRange,
  getCategoryWaves
} from '../modules/results/services/raceresultService'

describe('RACE RESULT Metadata-Aware Parsing', () => {
  describe('Bluff Bash (418104) Feeds', () => {
    it('parses category start list (A76F6B) correctly with Wave metadata', () => {
      const parsed = parseUniversalData(bbCategoryList, 'A76F6B', 'list')
      expect(parsed.viewType).toBe('category_start_list')
      expect(parsed.isEmpty).toBe(false)
      expect(parsed.riders.length).toBeGreaterThan(0)

      const firstRider = parsed.riders[0]
      expect(firstRider.name).toBeTruthy()
      expect(firstRider.bib).toBeTruthy()
      expect(firstRider.team).toBeTruthy()
      expect(firstRider.category).toBeTruthy()
      expect(firstRider.wave).toMatch(/Wave:\s*\d+/i)
      expect(firstRider.waveOrFieldType).toBe('wave')
    })

    it('parses team start list (747B52) correctly with team context', () => {
      const parsed = parseUniversalData(bbTeamList, '747B52', 'list')
      expect(parsed.viewType).toBe('team_start_list')
      expect(parsed.isEmpty).toBe(false)
      expect(parsed.riders.length).toBeGreaterThan(0)

      const sample = parsed.riders.find(r => r.team && r.name)
      expect(sample).toBeDefined()
      expect(sample?.name).toBeTruthy()
      expect(sample?.category).toBeTruthy()
    })

    it('parses individual results (4C8C1F) with laps, penalties, and finish times', () => {
      const parsed = parseUniversalData(bbResultsInd, '4C8C1F', 'results')
      expect(parsed.viewType).toBe('individual_results')
      expect(parsed.isEmpty).toBe(false)
      expect(parsed.riders.length).toBeGreaterThan(0)

      const finisher = parsed.riders.find(r => r.pl && r.totalTime && r.totalTime !== '-')
      expect(finisher).toBeDefined()
      expect(finisher?.name).toBeTruthy()
      expect(finisher?.totalTime).toBeTruthy()
    })

    it('parses team results / standings (674D5B) into discrete TeamStanding records', () => {
      const parsed = parseUniversalData(bbResultsTeam, '674D5B', 'results')
      expect(parsed.viewType).toBe('team_standings')
      expect(parsed.teamStandings.length).toBeGreaterThan(0)
      expect(parsed.riders.length).toBe(0) // Team standings should NOT pollute rider rows

      const firstTeam = parsed.teamStandings[0]
      expect(firstTeam.team).toBeTruthy()
      expect(firstTeam.rank).toBeTruthy()
      expect(firstTeam.points).toBeTruthy()
      expect(firstTeam.division).toBeTruthy()
    })
  })

  describe('Cable (421732) Feeds', () => {
    it('parses category start list (CF1EA1) and normalizes Field metadata to Wave for UI display', () => {
      const parsed = parseUniversalData(cableCategoryList, 'CF1EA1', 'list')
      expect(parsed.viewType).toBe('category_start_list')
      expect(parsed.isEmpty).toBe(false)
      expect(parsed.riders.length).toBeGreaterThan(0)

      const firstRider = parsed.riders[0]
      expect(firstRider.name).toBeTruthy()
      expect(firstRider.bib).toBeTruthy()
      expect(firstRider.team).toBeTruthy()
      expect(firstRider.category).toBeTruthy()
      expect(firstRider.wave).toMatch(/Wave:\s*\d+/i)
      expect(firstRider.waveOrFieldType).toBe('wave')
    })

    it('parses Cable team start list (146470) correctly', () => {
      const parsed = parseUniversalData(cableTeamList, '146470', 'list')
      expect(parsed.viewType).toBe('team_start_list')
      expect(parsed.isEmpty).toBe(false)
      expect(parsed.riders.length).toBeGreaterThan(0)

      const sample = parsed.riders[0]
      expect(sample.name).toBeTruthy()
      expect(sample.team).toBeTruthy()
      expect(sample.category).toBeTruthy()
    })

    it('handles empty results feed gracefully WITHOUT substitute mock riders', () => {
      const parsed = parseUniversalData(cableResultsEmpty, '4C8C1F', 'results')
      expect(parsed.viewType).toBe('individual_results')
      expect(parsed.isEmpty).toBe(true)
      expect(parsed.riders.length).toBe(0)
      expect(parsed.teamStandings.length).toBe(0)
    })
  })

  describe('Column Index Resolution & Edge Cases', () => {
    it('calculates correct column indices with 2 ID offsets', () => {
      const mockFields = [
        { Label: 'PL', Expression: 'SeriesRank_Seeding' },
        { Label: 'NO', Expression: 'BIB' },
        { Label: 'Name', Expression: 'CorrectSpelling([LFNAME])' },
        { Label: 'Team', Expression: 'CLUB' }
      ]
      // In RACE RESULT: row[0]=ID, row[1]=BIB, row[2]=PL, row[3]=Name, row[4]=Team
      const map = resolveColumnIndices(mockFields, 6)
      expect(map.seriesRank).toBe(2)
      expect(map.bib).toBe(1)
      expect(map.name).toBe(3)
      expect(map.team).toBe(4)
    })

    it('normalizes category names correctly', () => {
      expect(normalizeCategoryName('1_Boys Varsity 0')).toBe('Varsity Boys')
      expect(normalizeCategoryName('2_Girls JV III')).toBe('JV III Girls')
      expect(normalizeCategoryName('9th Grade Boys')).toBe('Freshman Boys')
      expect(normalizeCategoryName('HS Open Girls')).toBe('HS Open Girls')
    })

    it('handles null, undefined, or empty objects safely', () => {
      const emptyParsed = parseUniversalData(null, '', 'list')
      expect(emptyParsed.isEmpty).toBe(true)
      expect(emptyParsed.riders).toEqual([])
      expect(emptyParsed.teamStandings).toEqual([])
    })

    it('correctly identifies DNF, DNS, and DQ result statuses', () => {
      const mockResultData = {
        list: {
          ListName: '02 - Result Lists|Individual Results - ALL',
          Fields: [
            { Label: 'PLC', Expression: '[RANK1]' },
            { Label: 'NO', Expression: 'BIB' },
            { Label: 'NAME', Expression: 'DisplayName' },
            { Label: 'TEAM', Expression: 'CLUB' },
            { Label: 'TIME', Expression: 'TimeOrStatus' }
          ]
        },
        data: {
          '#1_Varsity Boys': [
            ['101', '10', '1', 'Rider One', 'Test Team', '22:15.0'],
            ['102', '11', 'DNF', 'Rider Two', 'Test Team', 'DNF'],
            ['103', '12', 'DNS', 'Rider Three', 'Test Team', 'DNS'],
            ['104', '13', 'DQ', 'Rider Four', 'Test Team', 'DSQ']
          ]
        }
      }

      const parsed = parseUniversalData(mockResultData, 'test_list', 'results')
      expect(parsed.riders.length).toBe(4)
      expect(parsed.riders[0].status).toBe('OK')
      expect(parsed.riders[0].totalTime).toBe('22:15.0')
      expect(parsed.riders[1].status).toBe('DNF')
      expect(parsed.riders[2].status).toBe('DNS')
      expect(parsed.riders[3].status).toBe('DQ')
    })

    it('handles feeds with extra and reordered columns cleanly', () => {
      const mockCustomFeed = {
        list: {
          ListName: '07 - Participant Lists|Custom List',
          Fields: [
            { Label: 'Bib', Expression: 'BIB' },
            { Label: 'Name', Expression: 'DisplayName' },
            { Label: 'Extra Col', Expression: 'CustomField1' },
            { Label: 'Category', Expression: 'CONTEST.NAME' },
            { Label: 'Team', Expression: 'CLUB' }
          ]
        },
        data: [
          ['201', '99', 'Jane Doe', 'ExtraValue', 'Varsity Girls', 'Custom Club']
        ]
      }

      const parsed = parseUniversalData(mockCustomFeed, 'custom_id', 'list')
      expect(parsed.riders.length).toBe(1)
      expect(parsed.riders[0].bib).toBe('99')
      expect(parsed.riders[0].name).toBe('Jane Doe')
      expect(parsed.riders[0].category).toBe('Varsity Girls')
    })
  })

  describe('Official 2026 Wave Schedule Times & Warm-up Calculation', () => {
    it('returns exact 2026 schedule for 8th Grade Girls with Field: 1 and Wave: 1', () => {
      const entryField = getWaveScheduleEntry(null, '8th Grade Girls', 'FIELD: 1')
      expect(entryField).toEqual({ start: '1:58 PM', stage: '1:43 PM' })

      const entryWave = getWaveScheduleEntry(null, '8th Grade Girls', 'Wave: 1')
      expect(entryWave).toEqual({ start: '1:58 PM', stage: '1:43 PM' })

      const startTime = getCategoryStartTime(null, '8th Grade Girls')
      expect(startTime).toBe('1:58 PM')

      const stageTime = getCategoryStageTime(null, '8th Grade Girls')
      expect(stageTime).toBe('1:43 PM')

      // Warm-up is Stage (1:43 PM) minus 45 mins = 12:58 PM
      const warmup = getWaveWarmupTime(null, '8th Grade Girls', 'FIELD: 1')
      expect(warmup).toBe('12:58 PM')
    })

    it('correctly orders all 2026 categories by wave start time', () => {
      const categories = [
        '8th Grade Girls',
        'Varsity Boys',
        'JV II Boys',
        'Freshman Girls',
        '6th Grade Girls',
        'JV III Boys'
      ]

      const sorted = [...categories].sort((a, b) => compareCategories(a, b, 'TIME', null))
      expect(sorted).toEqual([
        'Varsity Boys',   // 8:00 AM
        'JV III Boys',    // 8:05 AM
        'Freshman Girls', // 11:40 AM
        'JV II Boys',     // 12:45 PM
        '8th Grade Girls',// 1:58 PM
        '6th Grade Girls' // 2:09 PM
      ])
    })

    it('correctly orders categories by Grade / Division hierarchy when sortOrder is GRADE', () => {
      const categories = [
        '8th Grade Girls',
        'Varsity Boys',
        'JV II Boys',
        'Freshman Girls',
        '6th Grade Girls',
        'JV III Boys'
      ]

      const sorted = [...categories].sort((a, b) => compareCategories(a, b, 'GRADE', null))
      // Varsity -> JV III -> JV II -> Freshman -> 8th Grade -> 6th Grade
      expect(sorted).toEqual([
        'Varsity Boys',
        'JV III Boys',
        'JV II Boys',
        'Freshman Girls',
        '8th Grade Girls',
        '6th Grade Girls'
      ])
    })

    it('correctly orders categories with 6th, 7th, 8th at the top and Varsity last when sortOrder is GRADE_ASC', () => {
      const categories = [
        'Varsity Boys',
        '8th Grade Girls',
        'JV II Boys',
        'Freshman Girls',
        '6th Grade Girls',
        'JV III Boys',
        '7th Grade Boys'
      ]

      const sorted = [...categories].sort((a, b) => compareCategories(a, b, 'GRADE_ASC', null))
      // 6th Grade -> 7th Grade -> 8th Grade -> Freshman -> JV II -> JV III -> Varsity
      expect(sorted).toEqual([
        '6th Grade Girls',
        '7th Grade Boys',
        '8th Grade Girls',
        'Freshman Girls',
        'JV II Boys',
        'JV III Boys',
        'Varsity Boys'
      ])
    })

    it('ignores stale race.waveSchedule entries for standard categories', () => {
      const staleRace = {
        id: 'stale-race',
        waveSchedule: {
          '8th Grade Girls': { '1': { start: '11:56 AM', stage: '11:41 AM' } }
        }
      }

      const entry = getWaveScheduleEntry(staleRace, '8th Grade Girls', '1')
      expect(entry).toEqual({ start: '1:58 PM', stage: '1:43 PM' })
    })

    it('calculates staging time dynamically based on custom stagingOffsetMinutes', () => {
      const customRace = {
        id: 'custom-offset-race',
        stagingOffsetMinutes: 20
      }

      // Varsity Boys starts at 8:00 AM. Staging with 20 min offset = 7:40 AM
      const entry = getWaveScheduleEntry(customRace, 'Varsity Boys', '1')
      expect(entry).toEqual({ start: '8:00 AM', stage: '7:40 AM' })
      expect(getCategoryStageTime(customRace, 'Varsity Boys')).toBe('7:40 AM')
    })

    it('resolves warm-up group meeting times for grouped categories (e.g., Varsity & JV III Boys)', () => {
      const raceWithGroups = {
        id: 'grouped-race',
        stagingOffsetMinutes: 15,
        warmupGroups: [
          {
            id: 'wg-1',
            name: 'Varsity & JV III Boys',
            meetingTime: '7:00 AM',
            categories: ['Varsity Boys', 'JV III Boys'],
            leaders: ['Coach Dave'],
            support: ['Coach Sarah']
          }
        ]
      }

      // Both Varsity Boys and JV III Boys should receive the group's 7:00 AM warm-up time
      expect(getWaveWarmupTime(raceWithGroups, 'Varsity Boys', '1')).toBe('7:00 AM')
      expect(getWaveWarmupTime(raceWithGroups, 'JV III Boys', '1')).toBe('7:00 AM')
      expect(getWaveWarmupTime(raceWithGroups, 'JV III Boys', '2')).toBe('7:00 AM')

      // But their staging times remain distinct
      expect(getWaveScheduleEntry(raceWithGroups, 'Varsity Boys', '1')).toEqual({ start: '8:00 AM', stage: '7:45 AM' })
      expect(getWaveScheduleEntry(raceWithGroups, 'JV III Boys', '1')).toEqual({ start: '8:05 AM', stage: '7:50 AM' })
    })

    it('calculates default group warmup time from earliest category staging time', () => {
      const race = {
        id: 'test-race',
        stagingOffsetMinutes: 15,
        warmupOffsetMinutes: 45
      }

      // Varsity Boys staging is 7:45 AM, JV III Boys staging is 7:50 AM
      // 45 min before earliest stage (7:45 AM) = 7:00 AM
      const autoWarmup = calculateDefaultGroupWarmupTime(race, ['Varsity Boys', 'JV III Boys'])
      expect(autoWarmup).toBe('7:00 AM')

      // MS2 Boys (stage 10:33 AM), Freshman Boys (stage 11:15 AM) -> 45 min before 10:33 AM = 9:48 AM
      const msWarmup = calculateDefaultGroupWarmupTime(race, ['MS2 Boys', 'Freshman Boys'])
      expect(msWarmup).toBe('9:48 AM')
    })

    it('formats warm-up group title dynamically based on assigned categories', () => {
      // 2 boys categories
      expect(formatWarmupGroupTitle(['Varsity Boys', 'JV III Boys'])).toBe('Varsity, JV3 Boys')

      // Adding a girls category
      expect(formatWarmupGroupTitle(['Varsity Boys', 'JV III Boys', 'Varsity Girls'])).toBe('Varsity, JV3 Boys, Varsity Girls')

      // Middle school grade boys
      expect(formatWarmupGroupTitle(['8th Grade Boys', '7th Grade Boys', '6th Grade Boys'])).toBe('8th, 7th, 6th Grade Boys')

      // Girls group
      expect(formatWarmupGroupTitle(['MS2 Girls', 'Freshman Girls', 'JV II Girls'])).toBe('MS2, Freshman, JV2 Girls')

      // Empty categories
      expect(formatWarmupGroupTitle([])).toBe('Warm-up Group')
    })

    it('parses and formats date ranges correctly', () => {
      // Standard format: "11 - 13 Sept 2026"
      const parsed1 = parseDateRange('11 - 13 Sept 2026')
      expect(parsed1.start).toBe('2026-09-11')
      expect(parsed1.end).toBe('2026-09-13')
      expect(formatDateRange(parsed1.start, parsed1.end)).toBe('11 - 13 Sept 2026')

      // Across months: "30 Aug - 02 Sept 2026"
      const parsed2 = parseDateRange('30 Aug - 02 Sept 2026')
      expect(parsed2.start).toBe('2026-08-30')
      expect(parsed2.end).toBe('2026-09-02')
      expect(formatDateRange(parsed2.start, parsed2.end)).toBe('30 Aug - 02 Sept 2026')

      // Single day
      const parsed3 = parseDateRange('13 Sept 2026')
      expect(parsed3.start).toBe('2026-09-13')
      expect(parsed3.end).toBe('2026-09-13')
      expect(formatDateRange(parsed3.start, parsed3.end)).toBe('13 Sept 2026')
    })

    it('defaults Freshman Boys to 2 waves and supports getCategoryWaves', () => {
      const waves = getCategoryWaves(null, 'Freshman Boys')
      expect(waves.length).toBe(2)
      expect(waves[0]).toEqual({ wave: '1', start: '10:53 AM', stage: '10:38 AM' })
      expect(waves[1]).toEqual({ wave: '2', start: '10:55 AM', stage: '10:40 AM' })
    })

    it('prioritizes custom waveSchedule when hasCustomWaveSchedule is true', () => {
      const customRace = {
        id: 'custom-waves',
        hasCustomWaveSchedule: true,
        stagingOffsetMinutes: 15,
        waveSchedule: {
          'Freshman Boys': {
            '1': { start: '10:50 AM', stage: '10:35 AM' },
            '2': { start: '10:52 AM', stage: '10:37 AM' },
            '3': { start: '10:54 AM', stage: '10:39 AM' }
          }
        }
      }

      const waves = getCategoryWaves(customRace, 'Freshman Boys')
      expect(waves.length).toBe(3)
      expect(waves[0].start).toBe('10:50 AM')
      expect(waves[2].start).toBe('10:54 AM')

      const entry = getWaveScheduleEntry(customRace, 'Freshman Boys', '2')
      expect(entry?.start).toBe('10:52 AM')
    })
  })
})
