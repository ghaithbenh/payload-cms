import { describe, it, expect, vi } from 'vitest'

// PAYLOAD_SECRET and DATABASE_URL are set in vitest.config.ts env.
// These mocks prevent heavy side effects (DB connections, sharp, etc.)
// when payload.config.ts loads via api-helpers.ts.
vi.mock('payload', () => ({ getPayload: vi.fn(), buildConfig: vi.fn(() => ({})) }))
vi.mock('@payloadcms/db-mongodb', () => ({ mongooseAdapter: vi.fn() }))
vi.mock('@payloadcms/richtext-lexical', () => ({ lexicalEditor: vi.fn() }))
vi.mock('sharp', () => ({ default: vi.fn() }))
vi.mock('@/lib/queue', () => ({ startNotificationWorker: vi.fn() }))
vi.mock('../rateLimit', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
  getRoleLimits: vi.fn(() => ({ limit: 10, windowSeconds: 60 })),
  rateLimit: vi.fn(),
}))

import {
  buildRateLimitHeaders,
  unauthorizedResponse,
  forbiddenResponse,
  errorResponse,
  getPayloadClient,
  authenticateRequest,
  checkRateLimit,
} from '../api-helpers'
import { getPayload } from 'payload'
import { rateLimit } from '../rateLimit'
import type { Payload } from 'payload'

describe('buildRateLimitHeaders', () => {
  it('returns all required rate limit headers', () => {
    const futureReset = Math.floor(Date.now() / 1000) + 30
    const headers = buildRateLimitHeaders({ limit: 100, remaining: 42, reset: futureReset })
    expect(headers['X-RateLimit-Limit']).toBe('100')
    expect(headers['X-RateLimit-Remaining']).toBe('42')
    expect(headers['X-RateLimit-Reset']).toBe(String(futureReset))
    expect(Number(headers['Retry-After'])).toBeGreaterThan(0)
    expect(Number(headers['Retry-After'])).toBeLessThanOrEqual(60)
  })

  it('Retry-After is a non-negative number', () => {
    const now = Math.floor(Date.now() / 1000)
    const headers = buildRateLimitHeaders({ limit: 50, remaining: 0, reset: now + 30 })
    expect(Number(headers['Retry-After'])).toBeGreaterThanOrEqual(0)
    expect(Number(headers['Retry-After'])).toBeLessThanOrEqual(60)
  })

  it('handles zero remaining', () => {
    const futureReset = Math.floor(Date.now() / 1000) + 60
    const headers = buildRateLimitHeaders({ limit: 100, remaining: 0, reset: futureReset })
    expect(headers['X-RateLimit-Remaining']).toBe('0')
    expect(Number(headers['Retry-After'])).toBeGreaterThan(0)
  })
})

describe('unauthorizedResponse', () => {
  it('returns 401 with standard body', async () => {
    const res = unauthorizedResponse()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED' })
  })

  it('accepts custom message', async () => {
    const res = unauthorizedResponse('Custom auth message')
    const body = await res.json()
    expect(body).toEqual({ error: 'Custom auth message', code: 'UNAUTHORIZED' })
  })
})

describe('forbiddenResponse', () => {
  it('returns 403 with standard body', async () => {
    const res = forbiddenResponse()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toEqual({ error: 'Forbidden', code: 'FORBIDDEN' })
  })

  it('accepts custom message', async () => {
    const res = forbiddenResponse('Not enough permissions')
    const body = await res.json()
    expect(body).toEqual({ error: 'Not enough permissions', code: 'FORBIDDEN' })
  })
})

describe('errorResponse', () => {
  it('returns 500 for unknown errors', async () => {
    const res = errorResponse('raw string')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' })
  })

  it('returns 500 for Error with no statusCode', async () => {
    const res = errorResponse(new Error('db failure'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'db failure', code: 'INTERNAL_ERROR' })
  })

  it('uses statusCode and code from Error subclass', async () => {
    class TeapotError extends Error {
      statusCode = 418
      code = 'TEAPOT'
      constructor() {
        super("I'm a teapot")
      }
    }
    const res = errorResponse(new TeapotError())
    expect(res.status).toBe(418)
    const body = await res.json()
    expect(body).toEqual({ error: "I'm a teapot", code: 'TEAPOT' })
  })
})

describe('getPayloadClient', () => {
  it('calls getPayload with configuration', async () => {
    const mockPayload = {}
    vi.mocked(getPayload).mockResolvedValueOnce(mockPayload as unknown as Payload)
    const client = await getPayloadClient()
    expect(client).toBe(mockPayload)
    expect(getPayload).toHaveBeenCalled()
  })
})

describe('authenticateRequest', () => {
  it('returns payload and user on successful authentication', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    const mockPayload = {
      auth: vi.fn().mockResolvedValueOnce({ user: mockUser }),
    }
    vi.mocked(getPayload).mockResolvedValueOnce(mockPayload as unknown as Payload)

    const req = new Request('http://localhost/api/tasks', {
      headers: { Authorization: 'Bearer token' },
    })
    const res = await authenticateRequest(req)
    expect(res.payload).toBe(mockPayload)
    expect(res.user).toBe(mockUser)
    expect(mockPayload.auth).toHaveBeenCalledWith({ headers: req.headers })
  })

  it('returns user null if auth throws error', async () => {
    const mockPayload = {
      auth: vi.fn().mockRejectedValueOnce(new Error('Auth failed')),
    }
    vi.mocked(getPayload).mockResolvedValueOnce(mockPayload as unknown as Payload)

    const req = new Request('http://localhost/api/tasks')
    const res = await authenticateRequest(req)
    expect(res.payload).toBe(mockPayload)
    expect(res.user).toBeNull()
  })
})

describe('checkRateLimit', () => {
  it('returns response and headers when not allowed', async () => {
    vi.mocked(rateLimit).mockResolvedValueOnce({
      allowed: false,
      limit: 10,
      remaining: 0,
      reset: Math.floor(Date.now() / 1000) + 60,
    })

    const req = new Request('http://localhost/api/tasks')
    const res = await checkRateLimit(req, { prefix: 'tasks' })
    expect(res.response).not.toBeNull()
    expect(res.response?.status).toBe(429)
    expect(res.headers['X-RateLimit-Limit']).toBe('10')
  })

  it('returns null response and headers when allowed', async () => {
    vi.mocked(rateLimit).mockResolvedValueOnce({
      allowed: true,
      limit: 10,
      remaining: 9,
      reset: Math.floor(Date.now() / 1000) + 60,
    })

    const req = new Request('http://localhost/api/tasks')
    const res = await checkRateLimit(req, { prefix: 'tasks' })
    expect(res.response).toBeNull()
    expect(res.headers['X-RateLimit-Limit']).toBe('10')
    expect(res.headers['X-RateLimit-Remaining']).toBe('9')
  })
})

