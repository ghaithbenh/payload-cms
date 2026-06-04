import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../monitoring/queue/route'
import { authenticateRequest, unauthorizedResponse, forbiddenResponse, errorResponse } from '@/lib/api-helpers'
import { getQueueMetrics } from '@/lib/queue'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'

vi.mock('@/lib/api-helpers', () => ({
  authenticateRequest: vi.fn(),
  unauthorizedResponse: vi.fn(() => new Response('unauthorized', { status: 401 })),
  forbiddenResponse: vi.fn(() => new Response('forbidden', { status: 403 })),
  errorResponse: vi.fn((err) => new Response('error', { status: 500 })),
}))

vi.mock('@/lib/queue', () => ({
  getQueueMetrics: vi.fn(),
}))

describe('Monitoring Queue Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 if unauthenticated', async () => {
    vi.mocked(authenticateRequest).mockResolvedValueOnce({ payload: {} as unknown as Payload, user: null })
    const req = new Request('http://localhost/api/monitoring/queue')
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(unauthorizedResponse).toHaveBeenCalled()
  })

  it('returns 403 if authenticated but not admin', async () => {
    vi.mocked(authenticateRequest).mockResolvedValueOnce({
      payload: {} as unknown as Payload,
      user: { id: 'u1', role: 'user' } as User,
    })
    const req = new Request('http://localhost/api/monitoring/queue')
    const res = await GET(req)
    expect(res.status).toBe(403)
    expect(forbiddenResponse).toHaveBeenCalled()
  })

  it('returns metrics if authenticated as admin', async () => {
    vi.mocked(authenticateRequest).mockResolvedValueOnce({
      payload: {} as unknown as Payload,
      user: { id: 'u1', role: 'admin' } as User,
    })
    const mockMetrics = { queueLength: 5, workerActive: true }
    vi.mocked(getQueueMetrics).mockResolvedValueOnce(mockMetrics as unknown as Awaited<ReturnType<typeof getQueueMetrics>>)

    const req = new Request('http://localhost/api/monitoring/queue')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual(mockMetrics)
  })

  it('returns error response on exception', async () => {
    vi.mocked(authenticateRequest).mockRejectedValueOnce(new Error('DB error'))
    const req = new Request('http://localhost/api/monitoring/queue')
    const res = await GET(req)
    expect(res.status).toBe(500)
    expect(errorResponse).toHaveBeenCalled()
  })
})
