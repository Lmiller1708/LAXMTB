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
  compareCategories
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
    it('parses category start list (CF1EA1) with Field metadata (not Wave)', () => {
      const parsed = parseUniversalData(cableCategoryList, 'CF1EA1', 'list')
      expect(parsed.viewType).toBe('category_start_list')
      expect(parsed.isEmpty).toBe(false)
      expect(parsed.riders.length).toBeGreaterThan(0)

      const firstRider = parsed.riders[0]
      expect(firstRider.name).toBeTruthy()
      expect(firstRider.bib).toBeTruthy()
      expect(firstRider.team).toBeTruthy()
      expect(firstRider.category).toBeTruthy()
      expect(firstRider.wave).toMatch(/Field:\s*\d+/i)
      expect(firstRider.waveOrFieldType).toBe('field')
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
})
