import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getClientIp, getRoleLimits, ROLE_LIMITS } from '../rateLimit'

describe('getClientIp', () => {
  function mockRequest(headers: Record<string, string>): Request {
    return { headers: { get: (name: string) => headers[name.toLowerCase()] ?? null } } as any
  }

  it('extracts IP from x-forwarded-for', () => {
    const req = mockRequest({ 'x-forwarded-for': '192.168.1.1, 10.0.0.1' })
    expect(getClientIp(req)).toBe('192.168.1.1')
  })

  it('falls back to x-real-ip', () => {
    const req = mockRequest({ 'x-real-ip': '10.0.0.5' })
    expect(getClientIp(req)).toBe('10.0.0.5')
  })

  it('returns 127.0.0.1 when no headers present', () => {
    const req = mockRequest({})
    expect(getClientIp(req)).toBe('127.0.0.1')
  })
})

describe('getRoleLimits', () => {
  it('returns admin limits for admin role', () => {
    const limits = getRoleLimits('admin')
    expect(limits.limit).toBe(500)
    expect(limits.windowSeconds).toBe(60)
  })

  it('returns manager limits for manager role', () => {
    const limits = getRoleLimits('manager')
    expect(limits.limit).toBe(200)
  })

  it('returns user limits for user role', () => {
    const limits = getRoleLimits('user')
    expect(limits.limit).toBe(100)
  })

  it('defaults to user limits for unknown role', () => {
    const limits = getRoleLimits(undefined)
    expect(limits.limit).toBe(100)
  })
})

describe('ROLE_LIMITS constants', () => {
  it('defines limits for all roles', () => {
    expect(ROLE_LIMITS.admin).toBeDefined()
    expect(ROLE_LIMITS.manager).toBeDefined()
    expect(ROLE_LIMITS.user).toBeDefined()
  })
})
