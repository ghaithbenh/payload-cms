import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Redis
const { mockRedis, mockPipeline } = vi.hoisted(() => {
  const mockPipeline = {
    incr: vi.fn().mockReturnThis(),
    ttl: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([[null, 1], [null, -1]]),
  }
  const mockRedis = {
    pipeline: vi.fn(() => mockPipeline),
    expire: vi.fn().mockResolvedValue(1),
  }
  return { mockRedis, mockPipeline }
})

vi.mock('../redis', () => ({
  ensureRedis: vi.fn().mockResolvedValue(mockRedis),
}))

vi.mock('../logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { rateLimit } from '../rateLimit'
import { ensureRedis } from '../redis'
import { logger } from '../logger'

beforeEach(() => {
  vi.clearAllMocks()
  mockPipeline.exec.mockResolvedValue([[null, 1], [null, -1]])
})

describe('rateLimit', () => {
  it('allows request under limit', async () => {
    mockPipeline.exec.mockResolvedValueOnce([[null, 5], [null, 50]])

    const result = await rateLimit('test:ip', 100, 60)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(95)
    expect(result.limit).toBe(100)
  })

  it('blocks request at limit', async () => {
    mockPipeline.exec.mockResolvedValueOnce([[null, 101], [null, 30]])

    const result = await rateLimit('test:ip', 100, 60)

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('sets expire on first request (count === 1)', async () => {
    mockPipeline.exec.mockResolvedValueOnce([[null, 1], [null, -1]])

    await rateLimit('test:ip', 100, 60)

    expect(mockRedis.expire).toHaveBeenCalled()
  })

  it('does not set expire when count > 1', async () => {
    mockPipeline.exec.mockResolvedValueOnce([[null, 5], [null, 50]])

    await rateLimit('test:ip', 100, 60)

    expect(mockRedis.expire).not.toHaveBeenCalled()
  })

  it('returns allowed=false when Redis fails (fail-closed by default)', async () => {
    vi.mocked(ensureRedis).mockRejectedValueOnce(new Error('conn refused'))

    const result = await rateLimit('test:ip', 100, 60)

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(logger.error).toHaveBeenCalled()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns allowed=true when Redis fails and RATE_LIMIT_FAIL_OPEN=true', async () => {
    vi.stubEnv('RATE_LIMIT_FAIL_OPEN', 'true')
    vi.mocked(ensureRedis).mockRejectedValueOnce(new Error('conn refused'))

    const result = await rateLimit('test:ip', 100, 60)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(1)
    expect(logger.error).toHaveBeenCalled()
  })

  it('returns allowed=false when pipeline returns null', async () => {
    mockPipeline.exec.mockResolvedValueOnce(null)

    const result = await rateLimit('test:ip', 100, 60)

    expect(result.allowed).toBe(false)
    expect(logger.error).toHaveBeenCalled()
  })

  it('calculates reset correctly with positive ttl', async () => {
    mockPipeline.exec.mockResolvedValueOnce([[null, 1], [null, 45]])
    const now = Math.floor(Date.now() / 1000)

    const result = await rateLimit('test:ip', 100, 60)

    expect(result.reset).toBeGreaterThanOrEqual(now + 44)
    expect(result.reset).toBeLessThanOrEqual(now + 46)
  })

  it('handles null/undefined fields in pipeline results', async () => {
    mockPipeline.exec.mockResolvedValueOnce([[null, null], [null, null]])
    const result = await rateLimit('test:ip', 100, 60)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(100)
  })
})
