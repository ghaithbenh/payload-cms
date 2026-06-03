import { createHash } from 'crypto'
import type { Redis } from 'ioredis'
import { ensureRedis } from './redis'

// ---------------------------------------------------------------------------
// TTLs per collection (seconds)
// ---------------------------------------------------------------------------
export const CACHE_TTL = {
  tasks: 300,
  users: 300,
  notifications: 60,
  pages: 600,
} as const

export type CollectionSlug = keyof typeof CACHE_TTL

// ---------------------------------------------------------------------------
// Key builders
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Bump the list-version counter – invalidates every list cache for the
// collection without having to scan / delete keys one by one.
// ---------------------------------------------------------------------------
export async function bumpListVersion(collection: string): Promise<void> {
  try {
    const redis = await ensureRedis()
    await redis.incr(versionKey(collection))
  } catch (err) {
    console.warn(`[Cache] Fail to bump list version for collection "${collection}":`, err)
  }
}

// ---------------------------------------------------------------------------
// Delete a single document cache.
// ---------------------------------------------------------------------------
export async function evictDoc(collection: string, id: string | number): Promise<void> {
  try {
    const redis = await ensureRedis()
    await redis.del(docKey(collection, id))
  } catch (err) {
    console.warn(`[Cache] Fail to evict doc cache for "${collection}:${id}":`, err)
  }
}

// ---------------------------------------------------------------------------
// Invalidate ALL cache entries for a collection (both doc + list).
// ---------------------------------------------------------------------------
export async function invalidateCollection(collection: string, id?: string | number): Promise<void> {
  if (id) {
    await evictDoc(collection, id)
  }
  await bumpListVersion(collection)
}

// ---------------------------------------------------------------------------
// Cache-aside helper – checks Redis first, falls back to the provided
// fetcher callback, then stores the result in Redis with the given TTL.
// ---------------------------------------------------------------------------
export async function cacheAside<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number,
): Promise<T> {
  let redis: Redis
  try {
    redis = await ensureRedis()
  } catch (err) {
    console.warn(`[Cache] Redis client unavailable:`, err)
    return fetcher()
  }

  try {
    const cached = await redis.get(key)
    if (cached !== null) {
      return JSON.parse(cached) as T
    }
  } catch (err) {
    console.warn(`[Cache] Fail to retrieve from cache for key "${key}":`, err)
  }

  const data = await fetcher()

  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttl)
  } catch (err) {
    console.warn(`[Cache] Fail to store in cache for key "${key}":`, err)
  }

  return data
}
