import Redis, { type RedisOptions } from 'ioredis'
import { logger } from './logger'

const REDIS_URL = process.env.REDIS_URL || ''
const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || ''
const REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX || ''
const REDIS_TLS_ENABLED = process.env.REDIS_TLS_ENABLED === 'true'
const REDIS_SENTINEL_HOSTS = (process.env.REDIS_SENTINEL_HOSTS || '').split(',').filter(Boolean)
const REDIS_SENTINEL_NAME = process.env.REDIS_SENTINEL_NAME || ''
const REDIS_DB = Number(process.env.REDIS_DB) || 0
const REDIS_ENABLE_READY_CHECK = process.env.REDIS_ENABLE_READY_CHECK !== 'false'

let client: Redis | null = null

function buildOptions(): { url?: string; opts: RedisOptions } {
  if (REDIS_URL) {
    return {
      url: REDIS_URL,
      opts: {
        lazyConnect: true,
        maxRetriesPerRequest: null,
        retryStrategy(times) {
          if (times > 10) return null
          return Math.min(times * 200, 5000)
        },
        enableReadyCheck: REDIS_ENABLE_READY_CHECK,
      },
    }
  }

  if (REDIS_SENTINEL_HOSTS.length > 0 && REDIS_SENTINEL_NAME) {
    return {
      opts: {
        name: REDIS_SENTINEL_NAME,
        sentinels: REDIS_SENTINEL_HOSTS.map((h) => {
          const [host, port = '26379'] = h.split(':')
          return { host, port: Number(port) }
        }),
        password: REDIS_PASSWORD || undefined,
        keyPrefix: REDIS_KEY_PREFIX || undefined,
        db: REDIS_DB,
        lazyConnect: true,
        maxRetriesPerRequest: null,
        retryStrategy(times) {
          if (times > 10) return null
          return Math.min(times * 200, 5000)
        },
        enableReadyCheck: REDIS_ENABLE_READY_CHECK,
      },
    }
  }

  return {
    opts: {
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD || undefined,
      keyPrefix: REDIS_KEY_PREFIX || undefined,
      db: REDIS_DB,
      lazyConnect: true,
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        if (times > 10) return null
        return Math.min(times * 200, 5000)
      },
      tls: REDIS_TLS_ENABLED ? {} : undefined,
      enableReadyCheck: REDIS_ENABLE_READY_CHECK,
    },
  }
}

export function getRedis(): Redis {
  if (!client) {
    const { url, opts } = buildOptions()
    client = url ? new Redis(url, opts) : new Redis(opts)

    client.on('error', (err) => {
      logger.error({ err: err.message }, 'Redis client error')
    })

    client.on('connect', () => {
      logger.info('Redis connected')
    })

    client.on('ready', () => {
      logger.info('Redis ready')
    })

    client.on('close', () => {
      logger.warn('Redis connection closed')
    })

    client.on('reconnecting', (delay: number) => {
      logger.info({ delay }, 'Redis reconnecting')
    })

    client.on('end', () => {
      logger.warn('Redis connection ended')
    })
  }

  return client
}

export async function ensureRedis(): Promise<Redis> {
  const r = getRedis()
  if (r.status !== 'ready' && r.status !== 'connecting' && r.status !== 'connect') {
    try {
      await r.connect()
    } catch {
      // already connecting or connected — ignore
    }
  }
  return r
}

export async function pingRedis(): Promise<boolean> {
  try {
    const r = await ensureRedis()
    const result = await r.ping()
    return result === 'PONG'
  } catch {
    return false
  }
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit()
    client = null
  }
}
