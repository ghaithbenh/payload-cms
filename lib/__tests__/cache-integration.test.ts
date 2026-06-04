import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Redis before importing modules that use it
const { mockRedis } = vi.hoisted(() => {
  const mockRedis = {
    incr: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  }
  return { mockRedis }
})

vi.mock('../redis', () => ({
  ensureRedis: vi.fn().mockResolvedValue(mockRedis),
}))

vi.mock('../logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { bumpListVersion, evictDoc, invalidateCollection, cacheAside } from '../cache'
import { ensureRedis } from '../redis'
import { logger } from '../logger'

beforeEach(() => {
  vi.clearAllMocks()
  mockRedis.get.mockResolvedValue(null)
})

describe('bumpListVersion', () => {
  it('increments the version key for a collection', async () => {
    await bumpListVersion('tasks')
    expect(mockRedis.incr).toHaveBeenCalledWith('tasks:version')
  })

  it('logs warning when Redis fails', async () => {
    vi.mocked(ensureRedis).mockRejectedValueOnce(new Error('conn refused'))
    await bumpListVersion('tasks')
    expect(logger.warn).toHaveBeenCalled()
  })
})

describe('evictDoc', () => {
  it('deletes the doc cache key', async () => {
    await evictDoc('tasks', '123')
    expect(mockRedis.del).toHaveBeenCalledWith('tasks:doc:123')
  })

  it('logs warning when Redis fails', async () => {
    vi.mocked(ensureRedis).mockRejectedValueOnce(new Error('conn refused'))
    await evictDoc('tasks', '123')
    expect(logger.warn).toHaveBeenCalled()
  })
})

describe('invalidateCollection', () => {
  it('evicts doc and bumps version when id is provided', async () => {
    await invalidateCollection('tasks', '123')
    expect(mockRedis.del).toHaveBeenCalledWith('tasks:doc:123')
    expect(mockRedis.incr).toHaveBeenCalledWith('tasks:version')
  })

  it('only bumps version when no id is provided', async () => {
    await invalidateCollection('tasks')
    expect(mockRedis.del).not.toHaveBeenCalled()
    expect(mockRedis.incr).toHaveBeenCalledWith('tasks:version')
  })
})

describe('cacheAside', () => {
  it('returns cached data on cache hit', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ docs: [] }))
    const fetcher = vi.fn()

    const result = await cacheAside('test-key', fetcher, 300)

    expect(result).toEqual({ docs: [] })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('calls fetcher and stores in cache on cache miss', async () => {
    mockRedis.get.mockResolvedValueOnce(null)
    const fetcher = vi.fn().mockResolvedValue({ docs: [{ id: '1' }] })

    const result = await cacheAside('test-key', fetcher, 300)

    expect(result).toEqual({ docs: [{ id: '1' }] })
    expect(fetcher).toHaveBeenCalledOnce()
    expect(mockRedis.set).toHaveBeenCalledWith(
      'test-key',
      JSON.stringify({ docs: [{ id: '1' }] }),
      'EX',
      300,
    )
  })

  it('falls back to fetcher when Redis is unavailable', async () => {
    vi.mocked(ensureRedis).mockRejectedValueOnce(new Error('no redis'))
    const fetcher = vi.fn().mockResolvedValue({ fallback: true })

    const result = await cacheAside('test-key', fetcher, 300)

    expect(result).toEqual({ fallback: true })
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('still returns data when cache get fails', async () => {
    mockRedis.get.mockRejectedValueOnce(new Error('parse error'))
    const fetcher = vi.fn().mockResolvedValue({ fresh: true })

    const result = await cacheAside('test-key', fetcher, 300)

    expect(result).toEqual({ fresh: true })
    expect(logger.warn).toHaveBeenCalled()
  })

  it('still returns data when cache set fails', async () => {
    mockRedis.get.mockResolvedValueOnce(null)
    mockRedis.set.mockRejectedValueOnce(new Error('write error'))
    const fetcher = vi.fn().mockResolvedValue({ data: true })

    const result = await cacheAside('test-key', fetcher, 300)

    expect(result).toEqual({ data: true })
    expect(logger.warn).toHaveBeenCalled()
  })
})
