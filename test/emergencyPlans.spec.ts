import { describe, it, expect } from 'vitest'
import { DEFAULT_EMERGENCY_PLANS } from '../modules/hub/composables/useHubData'
import type { EmergencyPlan } from '../modules/hub/types/hub'

describe('Emergency Action Plans (EAP) Management', () => {
  it('contains the 4 default trailhead emergency action plan locations', () => {
    expect(DEFAULT_EMERGENCY_PLANS).toHaveLength(4)
    const locations = DEFAULT_EMERGENCY_PLANS.map((e) => e.location)
    expect(locations).toContain('Upper Hixon Forest')
    expect(locations).toContain('Lower Hixon Forest')
    expect(locations).toContain('Community Trail Farm (CTF)')
    expect(locations).toContain('Chad Erickson Memorial Park')
  })

  it('verifies all required fields exist on default emergency plans', () => {
    DEFAULT_EMERGENCY_PLANS.forEach((eap) => {
      expect(eap.id).toBeDefined()
      expect(eap.location.length).toBeGreaterThan(0)
      expect(eap.badge.length).toBeGreaterThan(0)
      expect(eap.description.length).toBeGreaterThan(0)
      expect(eap.docUrl).toBeDefined()
    })
  })

  it('allows updating an existing EAP location details and docUrl', () => {
    const plans: EmergencyPlan[] = JSON.parse(JSON.stringify(DEFAULT_EMERGENCY_PLANS))
    const upperHixon = plans.find((p) => p.id === 'eap-upper-hixon')
    expect(upperHixon).toBeDefined()

    if (upperHixon) {
      upperHixon.docUrl = 'https://docs.google.com/document/d/12345/edit'
      upperHixon.badge = 'Rotary North Gate'
      upperHixon.description = 'Updated ambulance staging instructions.'
    }

    const updated = plans.find((p) => p.id === 'eap-upper-hixon')
    expect(updated?.docUrl).toBe('https://docs.google.com/document/d/12345/edit')
    expect(updated?.badge).toBe('Rotary North Gate')
    expect(updated?.description).toBe('Updated ambulance staging instructions.')
  })

  it('supports adding a new trailhead EAP location', () => {
    const plans: EmergencyPlan[] = JSON.parse(JSON.stringify(DEFAULT_EMERGENCY_PLANS))
    const newLocation: EmergencyPlan = {
      id: 'eap-veterans-park',
      location: 'Veterans Memorial Park',
      badge: 'West Salem',
      description: 'Main parking lot emergency access off HWY 16.',
      docUrl: 'https://docs.google.com/document/d/west-salem-eap',
      order: 5
    }

    plans.push(newLocation)
    expect(plans).toHaveLength(5)
    expect(plans[4].location).toBe('Veterans Memorial Park')
    expect(plans[4].badge).toBe('West Salem')
  })

  it('supports removing an EAP location', () => {
    const plans: EmergencyPlan[] = JSON.parse(JSON.stringify(DEFAULT_EMERGENCY_PLANS))
    const filtered = plans.filter((p) => p.id !== 'eap-chad-erickson')
    expect(filtered).toHaveLength(3)
    expect(filtered.map((p) => p.id)).not.toContain('eap-chad-erickson')
  })
})

describe('Practice Plan Cool-Down & Coach Wrap-Up', () => {
  it('includes default coolDown and coachDebrief structure', async () => {
    const { DEFAULT_PRACTICE_PLAN } = await import('../modules/hub/composables/useHubData')
    expect(DEFAULT_PRACTICE_PLAN.coolDown).toBe('High fives, hydration check, and remind riders about Monday trailwork!')
    expect(DEFAULT_PRACTICE_PLAN.coachDebrief).toBeDefined()
  })

  it('supports setting coach debrief notes alongside cool down notes', async () => {
    const { DEFAULT_PRACTICE_PLAN } = await import('../modules/hub/composables/useHubData')
    const plan = JSON.parse(JSON.stringify(DEFAULT_PRACTICE_PLAN))
    plan.coolDown = 'High fives and hydration check'
    plan.coachDebrief = 'Radios collected at coach trailer. Group B reported trail tree down on Lower Switchbacks.'

    expect(plan.coolDown).toBe('High fives and hydration check')
    expect(plan.coachDebrief).toContain('Radios collected')
    expect(plan.coachDebrief).toContain('tree down')
  })

  it('preserves coach activities and ride groups when updating debrief notes', async () => {
    const { DEFAULT_PRACTICE_PLAN } = await import('../modules/hub/composables/useHubData')
    const plan = JSON.parse(JSON.stringify(DEFAULT_PRACTICE_PLAN))
    expect(plan.coachActivities.length).toBeGreaterThan(0)
    expect(plan.rideGroups.length).toBeGreaterThan(0)

    plan.coachDebrief = 'All radios accounted for.'
    expect(plan.coachActivities).toHaveLength(4)
    expect(plan.rideGroups).toHaveLength(2)
  })
})

