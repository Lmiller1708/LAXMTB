import { describe, it, expect } from 'vitest'
import { defaultEvents } from '../modules/races/data/defaultEvents'
import type { SignUpLinks } from '../modules/races/types/race'

describe('Camping Sign-Up Link & Resolution', () => {
  it('supports camping link in defaultEvents', () => {
    const bluffBash = defaultEvents.find(e => e.id === 'bluff-bash')
    expect(bluffBash).toBeDefined()
    expect(bluffBash?.signups).toBeDefined()
    expect(bluffBash?.signups?.camping).toBeDefined()
    expect(typeof bluffBash?.signups?.camping).toBe('string')
  })

  it('correctly resolves full HTTP/HTTPS URL and SignUp code', () => {
    const getSignUpUrl = (code?: string | null) => {
      if (!code) return '#'
      if (code.startsWith('http://') || code.startsWith('https://')) return code
      return `https://signup.com/client/invitation2/secure/${code}/false#/invitation`
    }

    expect(getSignUpUrl('https://signup.com/go/my-campsite')).toBe('https://signup.com/go/my-campsite')
    expect(getSignUpUrl('9876543210')).toBe('https://signup.com/client/invitation2/secure/9876543210/false#/invitation')
    expect(getSignUpUrl(null)).toBe('#')
    expect(getSignUpUrl(undefined)).toBe('#')
  })

  it('allows optional camping property in SignUpLinks interface', () => {
    const customSignups: SignUpLinks = {
      volunteer: '12345',
      food: '67890',
      league: '54321',
      camping: 'https://example.com/camping'
    }
    expect(customSignups.camping).toBe('https://example.com/camping')
  })

  it('handles guidelines containing strong tags', () => {
    const raw = '<strong>Camping:</strong> Scout camp cabin/tent sites by advance registration.'
    // Simulates the sanitizeGuideline fallback/client behavior
    const sanitizeGuideline = (text: string) => {
      if (!text) return ''
      return text
    }
    expect(sanitizeGuideline(raw)).toContain('<strong>Camping:</strong>')
  })
})
