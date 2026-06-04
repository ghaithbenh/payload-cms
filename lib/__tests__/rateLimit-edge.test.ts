import { describe, it, expect } from 'vitest'
import { getClientIp, getRoleLimits, ROLE_LIMITS, calculateRetryAfter, type UserRole } from '../rateLimit'

describe('getClientIp', () => {
  function mockRequest(headers: Record<string, string>): Request {
    return {
      headers: {
        get: (name: string) => {
          const lower = name.toLowerCase()
          return headers[lower] ?? null
        },
      },
    } as unknown as Request
  }

  it('extracts first IP from multi-value x-forwarded-for', () => {
    const req = mockRequest({ 'x-forwarded-for': '203.0.113.1, 198.51.100.2, 192.0.2.3' })
    expect(getClientIp(req)).toBe('203.0.113.1')
  })

  it('trims whitespace from x-forwarded-for entries', () => {
    const req = mockRequest({ 'x-forwarded-for': '  10.0.0.1  ,  10.0.0.2  ' })
    expect(getClientIp(req)).toBe('10.0.0.1')
  })

  it('falls back to x-real-ip when x-forwarded-for is missing', () => {
    const req = mockRequest({ 'x-real-ip': '10.0.0.5' })
    expect(getClientIp(req)).toBe('10.0.0.5')
  })

  it('returns 127.0.0.1 when no IP headers present', () => {
    const req = mockRequest({})
    expect(getClientIp(req)).toBe('127.0.0.1')
  })

  it('handles empty x-forwarded-for gracefully', () => {
    const req = mockRequest({ 'x-forwarded-for': '' })
    expect(getClientIp(req)).toBe('127.0.0.1')
  })

  it('handles single IP in x-forwarded-for', () => {
    const req = mockRequest({ 'x-forwarded-for': '192.168.1.1' })
    expect(getClientIp(req)).toBe('192.168.1.1')
  })
})

describe('getRoleLimits', () => {
  it('returns admin tier for admin role', () => {
    expect(getRoleLimits('admin')).toEqual({ limit: 500, windowSeconds: 60 })
  })

  it('returns manager tier for manager role', () => {
    expect(getRoleLimits('manager')).toEqual({ limit: 200, windowSeconds: 60 })
  })

  it('returns user tier for user role', () => {
    expect(getRoleLimits('user')).toEqual({ limit: 100, windowSeconds: 60 })
  })

  it('defaults to user tier for undefined role', () => {
    expect(getRoleLimits(undefined)).toEqual({ limit: 100, windowSeconds: 60 })
  })

  it('defaults to user tier for unknown role string', () => {
    expect(getRoleLimits('superadmin' as UserRole)).toEqual({ limit: 100, windowSeconds: 60 })
  })
})

describe('ROLE_LIMITS', () => {
  it('admin has highest limit', () => {
    expect(ROLE_LIMITS.admin.limit).toBeGreaterThan(ROLE_LIMITS.manager.limit)
    expect(ROLE_LIMITS.admin.limit).toBeGreaterThan(ROLE_LIMITS.user.limit)
  })

  it('manager has middle limit', () => {
    expect(ROLE_LIMITS.manager.limit).toBeGreaterThan(ROLE_LIMITS.user.limit)
    expect(ROLE_LIMITS.manager.limit).toBeLessThan(ROLE_LIMITS.admin.limit)
  })

  it('all tiers use the same window', () => {
    const windows = Object.values(ROLE_LIMITS).map(t => t.windowSeconds)
    expect(new Set(windows).size).toBe(1)
    expect(windows[0]).toBe(60)
  })
})

describe('calculateRetryAfter', () => {
  it('returns positive seconds when reset is in the future', () => {
    const reset = Math.floor(Date.now() / 1000) + 30
    const retryAfter = calculateRetryAfter(reset)
    expect(retryAfter).toBeGreaterThanOrEqual(29)
    expect(retryAfter).toBeLessThanOrEqual(31)
  })

  it('returns zero or negative when reset is in the past', () => {
    const reset = Math.floor(Date.now() / 1000) - 10
    expect(calculateRetryAfter(reset)).toBeLessThanOrEqual(0)
  })
})
