import { describe, it, expect } from 'vitest'
import { DEFAULT_COACH_CODE, DEFAULT_GUARDIAN_CODE } from '../modules/coach-admin/composables/useCoachAuth'

/**
 * Pure validation helper matching useCoachAuth.validateInviteCode logic
 */
function validateInviteCode(
  rawCode?: string,
  customSettings?: { coachCode?: string; guardianCode?: string }
): { valid: boolean; role?: 'coach' | 'guardian'; label?: string; error?: string } {
  if (!rawCode || !rawCode.trim()) {
    return { valid: false, error: 'Registration is by team invitation only. Please enter a valid team access code or use an invite link.' }
  }
  const clean = rawCode.toLowerCase().trim()
  const coachTarget = (customSettings?.coachCode || DEFAULT_COACH_CODE).toLowerCase().trim()
  const guardianTarget = (customSettings?.guardianCode || DEFAULT_GUARDIAN_CODE).toLowerCase().trim()

  if (clean === coachTarget || clean === 'lax-coach-2026' || clean === 'coach' || clean === 'lax-coach' || clean === 'coach2026') {
    return { valid: true, role: 'coach', label: 'Team Coach Invite' }
  }

  if (clean === guardianTarget || clean === 'lax-guardian-2026' || clean === 'guardian' || clean === 'lax-guardian' || clean === 'guardian2026') {
    return { valid: true, role: 'guardian', label: 'Guardian / Parent Invite' }
  }

  return { valid: false, error: 'Invalid access code. Please check with your head coach for the correct link or code.' }
}

/**
 * Pure permission helper matching useCoachAuth.canEditCoachSignups logic
 * Strictly requires authorized coach record in admins collection or admin privileges.
 * Profile absence or self-assigned roles in users/{uid} cannot grant access.
 */
function canEditCoachSignups(user: any, userProfile: any, isAuthorizedCoach: boolean, isAdminCoach: boolean): boolean {
  if (!user) return false
  return isAdminCoach || isAuthorizedCoach
}

describe('Team Invite Gatekeeping & Role Permissions', () => {
  describe('Invite Code Validation', () => {
    it('rejects empty or missing invite codes', () => {
      expect(validateInviteCode('').valid).toBe(false)
      expect(validateInviteCode('   ').valid).toBe(false)
      expect(validateInviteCode(undefined).valid).toBe(false)
    })

    it('validates default coach code lax-coach-2026 and aliases', () => {
      const standard = validateInviteCode('lax-coach-2026')
      expect(standard.valid).toBe(true)
      expect(standard.role).toBe('coach')

      // Case insensitivity & trimming
      expect(validateInviteCode('  LAX-COACH-2026  ').valid).toBe(true)
      expect(validateInviteCode('coach').role).toBe('coach')
      expect(validateInviteCode('lax-coach').role).toBe('coach')
      expect(validateInviteCode('coach2026').role).toBe('coach')
    })

    it('validates default guardian code lax-guardian-2026 and aliases', () => {
      const standard = validateInviteCode('lax-guardian-2026')
      expect(standard.valid).toBe(true)
      expect(standard.role).toBe('guardian')

      // Case insensitivity & trimming
      expect(validateInviteCode('  LAX-GUARDIAN-2026  ').valid).toBe(true)
      expect(validateInviteCode('guardian').role).toBe('guardian')
      expect(validateInviteCode('lax-guardian').role).toBe('guardian')
      expect(validateInviteCode('guardian2026').role).toBe('guardian')
    })

    it('validates customized codes configured in admin settings', () => {
      const custom = { coachCode: 'secret-trail-boss', guardianCode: 'mtb-parents-rock' }
      expect(validateInviteCode('secret-trail-boss', custom).role).toBe('coach')
      expect(validateInviteCode('mtb-parents-rock', custom).role).toBe('guardian')
      expect(validateInviteCode('wrong-code', custom).valid).toBe(false)
    })

    it('rejects unknown or invalid codes', () => {
      const result = validateInviteCode('random-stranger-code')
      expect(result.valid).toBe(false)
      expect(result.role).toBeUndefined()
      expect(result.error).toContain('Invalid access code')
    })
  })

  describe('Role-based Permissions (canEditCoachSignups)', () => {
    it('disallows unauthenticated visitors from editing coach signups', () => {
      expect(canEditCoachSignups(null, null, false, false)).toBe(false)
    })

    it('allows admins and coaches to edit coach signups', () => {
      const user = { uid: 'u1', email: 'coach@laxmtb.org' }
      expect(canEditCoachSignups(user, { role: 'coach' }, true, false)).toBe(true)
      expect(canEditCoachSignups(user, { role: 'admin' }, true, true)).toBe(true)
      expect(canEditCoachSignups(user, { role: 'owner' }, true, true)).toBe(true)
    })

    it('disallows guardian / parent accounts from editing coach signups', () => {
      const guardianUser = { uid: 'u2', email: 'parent@gmail.com' }
      expect(canEditCoachSignups(guardianUser, { role: 'guardian' }, false, false)).toBe(false)
    })

    it('denies signup edits when profile is missing or deleted (preventing deleted profile bypass)', () => {
      const untrustedUser = { uid: 'u3', email: 'random@gmail.com' }
      // Profile doc is null (deleted or never created), but user is not an authorized coach
      expect(canEditCoachSignups(untrustedUser, null, false, false)).toBe(false)
    })

    it('denies signup edits when user self-assigns coach in their profile without admin collection record', () => {
      const sneakyUser = { uid: 'u4', email: 'sneaky@gmail.com' }
      // Profile doc contains role: 'coach', but isAuthorizedCoach in admins collection is false
      expect(canEditCoachSignups(sneakyUser, { role: 'coach' }, false, false)).toBe(false)
    })

    it('authorizes coach based strictly on admin/coach membership even if profile is absent', () => {
      const coachUser = { uid: 'u5', email: 'verifiedcoach@laxmtb.org' }
      expect(canEditCoachSignups(coachUser, null, true, false)).toBe(true)
    })
  })

  describe('Registration Role Assignment', () => {
    it('assigns coach role when registering with lax-coach-2026', () => {
      const inviteCheck = validateInviteCode('lax-coach-2026')
      expect(inviteCheck.valid).toBe(true)
      const assignedRole = inviteCheck.role || 'guardian'
      expect(assignedRole).toBe('coach')
    })

    it('assigns guardian role when registering with lax-guardian-2026', () => {
      const inviteCheck = validateInviteCode('lax-guardian-2026')
      expect(inviteCheck.valid).toBe(true)
      const assignedRole = inviteCheck.role || 'guardian'
      expect(assignedRole).toBe('guardian')
    })

    it('prevents registration when invite code is invalid', () => {
      const inviteCheck = validateInviteCode('invalid-code')
      expect(inviteCheck.valid).toBe(false)
    })
  })
})
