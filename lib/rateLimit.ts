import { ensureRedis } from './redis'
import { logger } from './logger'

export function calculateRetryAfter(reset: number): number {
  return reset - Math.floor(Date.now() / 1000)
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  reset: number
}

export type UserRole = 'admin' | 'manager' | 'user'

export const ROLE_LIMITS: Record<UserRole, { limit: number; windowSeconds: number }> = {
  admin:   { limit: 500, windowSeconds: 60 },
  manager: { limit: 200, windowSeconds: 60 },
  user:    { limit: 100, windowSeconds: 60 },
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || '127.0.0.1'
}

export function getRoleLimits(role?: UserRole): { limit: number; windowSeconds: number } {
  if (role && role in ROLE_LIMITS) {
    return ROLE_LIMITS[role]
  }
  return ROLE_LIMITS.user
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const redis = await ensureRedis()
    const now = Math.floor(Date.now() / 1000)
    const windowIndex = Math.floor(now / windowSeconds)
    const redisKey = `ratelimit:${key}:${windowIndex}`

    const pipeline = redis.pipeline()
    pipeline.incr(redisKey)
    pipeline.ttl(redisKey)

    const results = await pipeline.exec()
    if (!results) {
      logger.error({}, 'Redis pipeline returned null')
      return {
        allowed: false,
        remaining: 0,
        limit,
        reset: Math.floor(Date.now() / 1000) + windowSeconds,
      }
    }

    const count = (results[0]?.[1] as number) || 0
    const ttl = (results[1]?.[1] as number) || -1

    if (count === 1) {
      await redis.expire(redisKey, windowSeconds)
    }

    const remaining = Math.max(0, limit - count)
    const allowed = count <= limit
    const reset = now + (ttl > 0 ? ttl : windowSeconds)

    return { allowed, remaining, limit, reset }
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Rate limit execution failed')
    if (process.env.RATE_LIMIT_FAIL_OPEN === 'true') {
      return {
        allowed: true,
        remaining: 1,
        limit,
        reset: Math.floor(Date.now() / 1000) + windowSeconds,
      }
    }
    return {
      allowed: false,
      remaining: 0,
      limit,
      reset: Math.floor(Date.now() / 1000) + windowSeconds,
    }
  }
}
