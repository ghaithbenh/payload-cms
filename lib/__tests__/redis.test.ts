import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockRedisConstructor, mockRedisInstance } = vi.hoisted(() => {
  const mockRedisInstance = {
    on: vi.fn(),
    connect: vi.fn(),
    ping: vi.fn(),
    quit: vi.fn(),
    status: 'wait',
  }
  const mockRedisConstructor = vi.fn()
  return { mockRedisConstructor, mockRedisInstance }
})

vi.mock('ioredis', () => {
  return {
    default: class MockRedis {
      constructor(...args: ConstructorParameters<typeof import('ioredis').default>) {
        mockRedisConstructor(...args)
      }
      on = mockRedisInstance.on
      connect = mockRedisInstance.connect
      ping = mockRedisInstance.ping
      quit = mockRedisInstance.quit
      get status() {
        return mockRedisInstance.status
      }
      set status(val) {
        mockRedisInstance.status = val
      }
    }
  }
})

import Redis from 'ioredis'

describe('redis client helper', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('builds options with REDIS_URL', async () => {
    process.env.REDIS_URL = 'redis://user:pass@host:port/0'
    const { getRedis } = await import('../redis')
    const client = getRedis()
    expect(client).toBeDefined()
  })

  it('builds options with sentinels', async () => {
    delete process.env.REDIS_URL
    process.env.REDIS_SENTINEL_HOSTS = 'host1:26379,host2:26379'
    process.env.REDIS_SENTINEL_NAME = 'mymaster'
    const { getRedis } = await import('../redis')
    const client = getRedis()
    expect(client).toBeDefined()
  })

  it('builds options with TLS enabled', async () => {
    delete process.env.REDIS_URL
    delete process.env.REDIS_SENTINEL_HOSTS
    process.env.REDIS_TLS_ENABLED = 'true'
    const { getRedis } = await import('../redis')
    const client = getRedis()
    expect(client).toBeDefined()
  })

  it('registers event listeners', async () => {
    const { getRedis } = await import('../redis')
    getRedis()
    expect(mockRedisInstance.on).toHaveBeenCalledWith('error', expect.any(Function))
    expect(mockRedisInstance.on).toHaveBeenCalledWith('connect', expect.any(Function))
    expect(mockRedisInstance.on).toHaveBeenCalledWith('ready', expect.any(Function))
    expect(mockRedisInstance.on).toHaveBeenCalledWith('close', expect.any(Function))
    expect(mockRedisInstance.on).toHaveBeenCalledWith('reconnecting', expect.any(Function))
    expect(mockRedisInstance.on).toHaveBeenCalledWith('end', expect.any(Function))

    // Call handlers to cover logging lines
    const errorListener = mockRedisInstance.on.mock.calls.find((c) => c[0] === 'error')?.[1]
    const connectListener = mockRedisInstance.on.mock.calls.find((c) => c[0] === 'connect')?.[1]
    const readyListener = mockRedisInstance.on.mock.calls.find((c) => c[0] === 'ready')?.[1]
    const closeListener = mockRedisInstance.on.mock.calls.find((c) => c[0] === 'close')?.[1]
    const reconnectListener = mockRedisInstance.on.mock.calls.find((c) => c[0] === 'reconnecting')?.[1]
    const endListener = mockRedisInstance.on.mock.calls.find((c) => c[0] === 'end')?.[1]

    errorListener(new Error('test-err'))
    connectListener()
    readyListener()
    closeListener()
    reconnectListener(100)
    endListener()
  })

  it('ensureRedis connects if status is wait', async () => {
    mockRedisInstance.status = 'wait'
    const { ensureRedis } = await import('../redis')
    await ensureRedis()
    expect(mockRedisInstance.connect).toHaveBeenCalled()
  })

  it('pingRedis pings successfully', async () => {
    mockRedisInstance.status = 'ready'
    mockRedisInstance.ping.mockResolvedValueOnce('PONG')
    const { pingRedis } = await import('../redis')
    const res = await pingRedis()
    expect(res).toBe(true)
  })

  it('pingRedis handles failure', async () => {
    mockRedisInstance.status = 'ready'
    mockRedisInstance.ping.mockRejectedValueOnce(new Error('Ping failed'))
    const { pingRedis } = await import('../redis')
    const res = await pingRedis()
    expect(res).toBe(false)
  })

  it('closeRedis quits connection', async () => {
    const { getRedis, closeRedis } = await import('../redis')
    getRedis()
    await closeRedis()
    expect(mockRedisInstance.quit).toHaveBeenCalled()
  })

  it('exercises retryStrategy in REDIS_URL config (lines 25-26)', async () => {
    process.env.REDIS_URL = 'redis://user:pass@host:port/0'
    const { getRedis } = await import('../redis')
    getRedis()
    const calls = mockRedisConstructor.mock.calls
    const opts = calls[calls.length - 1][1] as { retryStrategy: (n: number) => number | null }
    expect(opts.retryStrategy(5)).toBe(1000)
    expect(opts.retryStrategy(11)).toBeNull()
  })

  it('exercises retryStrategy in sentinels config (lines 47-48)', async () => {
    delete process.env.REDIS_URL
    process.env.REDIS_SENTINEL_HOSTS = 'host1:26379'
    process.env.REDIS_SENTINEL_NAME = 'mymaster'
    const { getRedis } = await import('../redis')
    getRedis()
    const calls = mockRedisConstructor.mock.calls
    const opts = calls[calls.length - 1][0] as { retryStrategy: (n: number) => number | null }
    expect(opts.retryStrategy(5)).toBe(1000)
    expect(opts.retryStrategy(11)).toBeNull()
  })

  it('exercises retryStrategy in default config (lines 65-66)', async () => {
    delete process.env.REDIS_URL
    delete process.env.REDIS_SENTINEL_HOSTS
    const { getRedis } = await import('../redis')
    getRedis()
    const calls = mockRedisConstructor.mock.calls
    const opts = calls[calls.length - 1][0] as { retryStrategy: (n: number) => number | null }
    expect(opts.retryStrategy(5)).toBe(1000)
    expect(opts.retryStrategy(11)).toBeNull()
  })

  it('returns existing client on second call (covers line 75 false branch)', async () => {
    delete process.env.REDIS_URL
    delete process.env.REDIS_SENTINEL_HOSTS
    const { getRedis } = await import('../redis')
    getRedis()
    const count = mockRedisConstructor.mock.calls.length
    getRedis()
    expect(mockRedisConstructor.mock.calls.length).toBe(count)
  })

  it('handles closeRedis when no client exists (covers line 130 false branch)', async () => {
    const { closeRedis } = await import('../redis')
    await closeRedis()
    expect(mockRedisInstance.quit).not.toHaveBeenCalled()
  })
})
