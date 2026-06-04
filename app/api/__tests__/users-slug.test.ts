import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPayloadMethod } = vi.hoisted(() => {
  return {
    mockPayloadMethod: vi.fn().mockResolvedValue(new Response('payload-response', {
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
    }))
  }
})

vi.mock('@payloadcms/next/routes', () => ({
  REST_GET: vi.fn(() => mockPayloadMethod),
  REST_POST: vi.fn(() => mockPayloadMethod),
  REST_DELETE: vi.fn(() => mockPayloadMethod),
  REST_PATCH: vi.fn(() => mockPayloadMethod),
  REST_PUT: vi.fn(() => mockPayloadMethod),
  REST_OPTIONS: vi.fn(() => mockPayloadMethod),
}))

vi.mock('@payload-config', () => ({
  default: {},
}))

vi.mock('@/lib/api-helpers', () => ({
  authenticateRequest: vi.fn(),
  checkRateLimit: vi.fn(),
  parseQueryParams: vi.fn(() => ({})),
  unauthorizedResponse: vi.fn(() => new Response('unauthorized', { status: 401 })),
  errorResponse: vi.fn(() => new Response('error', { status: 500 })),
}))

vi.mock('@/lib/cache', () => ({
  cacheAside: vi.fn((key, cb) => cb()),
  listKey: vi.fn(() => 'cache-key'),
  CACHE_TTL: { users: 60 },
}))

import { GET, POST, PATCH, PUT, DELETE, OPTIONS } from '../users/[[...slug]]/route'
import { authenticateRequest, checkRateLimit, parseQueryParams } from '@/lib/api-helpers'
import { cacheAside } from '@/lib/cache'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'

describe('Users Slug Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET Handler', () => {
    it('returns 401 if unauthenticated', async () => {
      vi.mocked(authenticateRequest).mockResolvedValueOnce({ payload: {} as unknown as Payload, user: null })
      const req = new Request('http://localhost/api/users')
      const res = await GET(req, { params: Promise.resolve({ slug: [] }) })
      expect(res.status).toBe(401)
    })

    it('returns rate limit response if checkRateLimit returns response', async () => {
      vi.mocked(authenticateRequest).mockResolvedValueOnce({
        payload: {} as unknown as Payload,
        user: { id: 'u1', role: 'user' } as User,
      })
      vi.mocked(checkRateLimit).mockResolvedValueOnce({
        response: new Response('rate-limited', { status: 429 }),
        headers: {},
      })
      const req = new Request('http://localhost/api/users')
      const res = await GET(req, { params: Promise.resolve({ slug: [] }) })
      expect(res.status).toBe(429)
    })

    it('delegates to REST_GET if slug is present', async () => {
      vi.mocked(authenticateRequest).mockResolvedValueOnce({
        payload: {} as unknown as Payload,
        user: { id: 'u1', role: 'user' } as User,
      })
      vi.mocked(checkRateLimit).mockResolvedValueOnce({
        response: null,
        headers: { 'X-Test': 'val' },
      })
      const req = new Request('http://localhost/api/users/123')
      const res = await GET(req, { params: Promise.resolve({ slug: ['123'] }) })
      expect(res.status).toBe(200)
      expect(mockPayloadMethod).toHaveBeenCalled()
    })

    it('delegates to REST_GET and handles response without headers.set function', async () => {
      vi.mocked(authenticateRequest).mockResolvedValueOnce({
        payload: {} as unknown as Payload,
        user: { id: 'u1', role: 'user' } as User,
      })
      vi.mocked(checkRateLimit).mockResolvedValueOnce({
        response: null,
        headers: { 'X-Test': 'val' },
      })
      mockPayloadMethod.mockResolvedValueOnce({} as unknown as Response)
      const req = new Request('http://localhost/api/users/123')
      const res = await GET(req, { params: Promise.resolve({ slug: ['123'] }) })
      expect(res).toEqual({})
    })

    it('handles undefined slug parameter in GET', async () => {
      vi.mocked(authenticateRequest).mockResolvedValueOnce({
        payload: { find: vi.fn().mockResolvedValue({ docs: [] }) } as unknown as Payload,
        user: { id: 'u1', role: 'user' } as User,
      })
      vi.mocked(checkRateLimit).mockResolvedValueOnce({
        response: null,
        headers: {},
      })
      const req = new Request('http://localhost/api/users')
      const res = await GET(req, { params: Promise.resolve({ slug: undefined }) })
      expect(res.status).toBe(200)
    })

    it('calls payload.find and returns JSON if slug is empty', async () => {
      const mockFind = vi.fn().mockResolvedValue({ docs: [] })
      vi.mocked(authenticateRequest).mockResolvedValueOnce({
        payload: { find: mockFind } as unknown as Payload,
        user: { id: 'u1', role: 'user' } as User,
      })
      vi.mocked(checkRateLimit).mockResolvedValueOnce({
        response: null,
        headers: { 'X-Test': 'val' },
      })
      vi.mocked(parseQueryParams).mockReturnValueOnce({
        where: { id: { equals: '1' } },
        limit: '10',
        page: '1',
        sort: 'name',
        depth: '0',
      })

      const req = new Request('http://localhost/api/users')
      const res = await GET(req, { params: Promise.resolve({ slug: [] }) })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual({ docs: [] })
      expect(cacheAside).toHaveBeenCalled()
      expect(mockFind).toHaveBeenCalled()
    })

    it('returns 500 error response on failure', async () => {
      vi.mocked(authenticateRequest).mockRejectedValueOnce(new Error('Fatal error'))
      const req = new Request('http://localhost/api/users')
      const res = await GET(req, { params: Promise.resolve({ slug: [] }) })
      expect(res.status).toBe(500)
    })
  })

  describe('Other REST Methods (POST, PATCH, PUT, DELETE, OPTIONS)', () => {
    const methods = [
      { name: 'POST', handler: POST },
      { name: 'PATCH', handler: PATCH },
      { name: 'PUT', handler: PUT },
      { name: 'DELETE', handler: DELETE },
      { name: 'OPTIONS', handler: OPTIONS },
    ]

    methods.forEach(({ name, handler }) => {
      it(`${name} - returns 401 if unauthenticated and not public route`, async () => {
        vi.mocked(authenticateRequest).mockResolvedValueOnce({ payload: {} as unknown as Payload, user: null })
        const req = new Request('http://localhost/api/users/profile')
        const res = await handler(req, { params: Promise.resolve({ slug: ['profile'] }) })
        expect(res.status).toBe(401)
      })

      it(`${name} - passes and delegates if unauthenticated but public route`, async () => {
        vi.mocked(authenticateRequest).mockResolvedValueOnce({ payload: {} as unknown as Payload, user: null })
        vi.mocked(checkRateLimit).mockResolvedValueOnce({ response: null, headers: {} })
        const req = new Request('http://localhost/api/users/login')
        const res = await handler(req, { params: Promise.resolve({ slug: ['login'] }) })
        expect(res.status).toBe(200)
        expect(mockPayloadMethod).toHaveBeenCalled()
      })

      it(`${name} - returns rate limit response if rate-limited`, async () => {
        vi.mocked(authenticateRequest).mockResolvedValueOnce({
          payload: {} as unknown as Payload,
          user: { id: 'u1', role: 'user' } as User,
        })
        vi.mocked(checkRateLimit).mockResolvedValueOnce({
          response: new Response('rate-limited', { status: 429 }),
          headers: {},
        })
        const req = new Request('http://localhost/api/users')
        const res = await handler(req, { params: Promise.resolve({ slug: ['123'] }) })
        expect(res.status).toBe(429)
      })

      it(`${name} - delegates to payload method with rate limit headers`, async () => {
        vi.mocked(authenticateRequest).mockResolvedValueOnce({
          payload: {} as unknown as Payload,
          user: { id: 'u1', role: 'user' } as User,
        })
        vi.mocked(checkRateLimit).mockResolvedValueOnce({
          response: null,
          headers: { 'X-RateLimit-Limit': '10' },
        })
        const req = new Request('http://localhost/api/users')
        const res = await handler(req, { params: Promise.resolve({ slug: ['123'] }) })
        expect(res.status).toBe(200)
        expect(res.headers.get('X-RateLimit-Limit')).toBe('10')
      })

      it(`${name} - applies rate limit headers to response with working headers`, async () => {
        vi.mocked(authenticateRequest).mockResolvedValueOnce({
          payload: {} as unknown as Payload,
          user: { id: 'u1', role: 'user' } as User,
        })
        vi.mocked(checkRateLimit).mockResolvedValueOnce({
          response: null,
          headers: { 'X-RateLimit-Limit': '100', 'X-RateLimit-Remaining': '99' },
        })
        const headers = new Headers({ 'Content-Type': 'application/json' })
        mockPayloadMethod.mockResolvedValueOnce(new Response('ok', { status: 200, headers }))
        const req = new Request('http://localhost/api/users/login')
        const res = await handler(req, { params: Promise.resolve({ slug: ['login'] }) })
        expect(res.status).toBe(200)
        expect(res.headers.get('X-RateLimit-Limit')).toBe('100')
        expect(res.headers.get('X-RateLimit-Remaining')).toBe('99')
      })

      it(`${name} - handles null response from payload method`, async () => {
        vi.mocked(authenticateRequest).mockResolvedValueOnce({
          payload: {} as unknown as Payload,
          user: { id: 'u1', role: 'user' } as User,
        })
        vi.mocked(checkRateLimit).mockResolvedValueOnce({
          response: null,
          headers: { 'X-RateLimit-Limit': '10' },
        })
        mockPayloadMethod.mockResolvedValueOnce(null)
        const req = new Request('http://localhost/api/users')
        const res = await handler(req, { params: Promise.resolve({ slug: ['123'] }) })
        expect(res).toBeNull()
      })

      it(`${name} - handles response without headers.set function`, async () => {
        vi.mocked(authenticateRequest).mockResolvedValueOnce({
          payload: {} as unknown as Payload,
          user: { id: 'u1', role: 'user' } as User,
        })
        vi.mocked(checkRateLimit).mockResolvedValueOnce({
          response: null,
          headers: { 'X-RateLimit-Limit': '10' },
        })
        mockPayloadMethod.mockResolvedValueOnce({} as unknown as Response)
        const req = new Request('http://localhost/api/users')
        const res = await handler(req, { params: Promise.resolve({ slug: ['123'] }) })
        expect(res).toEqual({})
      })

      it(`${name} - handles undefined slug parameter`, async () => {
        vi.mocked(authenticateRequest).mockResolvedValueOnce({
          payload: {} as unknown as Payload,
          user: { id: 'u1', role: 'user' } as User,
        })
        vi.mocked(checkRateLimit).mockResolvedValueOnce({
          response: null,
          headers: {},
        })
        const req = new Request('http://localhost/api/users')
        const res = await handler(req, { params: Promise.resolve({ slug: undefined }) })
        expect(res.status).toBe(200)
      })
    })
  })
})