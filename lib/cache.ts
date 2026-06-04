import { createHash } from 'crypto'
import type { Redis } from 'ioredis'
import { ensureRedis } from './redis'
import { logger } from './logger'

export const CACHE_TTL = {
  tasks: 300,
  users: 300,
  notifications: 60,
  pages: 600,
} as const

export type CollectionSlug = keyof typeof CACHE_TTL

export function docKey(collection: string, id: string | number): string {
  return `${collection}:doc:${id}`
}

export function listKey(collection: string, query: Record<string, unknown>): string {
  const hash = createHash('md5').update(JSON.stringify(query)).digest('hex').slice(0, 12)
  const ver = versionKey(collection)
  return `${collection}:list:${ver}:${hash}`
}

export function versionKey(collection: string): string {
  return `${collection}:version`
}

export async function bumpListVersion(collection: string): Promise<void> {
  try {
    const redis = await ensureRedis()
    await redis.incr(versionKey(collection))
  } catch (err) {
    logger.warn({ err, collection }, 'Fail to bump list version for collection')
  }
}

export async function evictDoc(collection: string, id: string | number): Promise<void> {
  try {
    const redis = await ensureRedis()
    await redis.del(docKey(collection, id))
  } catch (err) {
    logger.warn({ err, collection, id }, 'Fail to evict doc cache')
  }
}

export async function invalidateCollection(collection: string, id?: string | number): Promise<void> {
  if (id) {
    await evictDoc(collection, id)
  }
  await bumpListVersion(collection)
}

export async function cacheAside<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number,
): Promise<T> {
  let redis: Redis
  try {
    redis = await ensureRedis()
  } catch (err) {
    logger.warn({ err }, 'Redis client unavailable — skipping cache')
    return fetcher()
  }

  try {
    const cached = await redis.get(key)
    if (cached !== null) {
      return JSON.parse(cached) as T
    }
  } catch (err) {
    logger.warn({ err, key }, 'Fail to retrieve from cache')
  }

  const data = await fetcher()

  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttl)
  } catch (err) {
    logger.warn({ err, key }, 'Fail to store in cache')
  }

  return data
}
