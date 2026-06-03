import { ensureRedis } from './redis'

export interface RateLimitResult {
    allowed: boolean
    remaining: number
    limit: number
    reset: number
}

/**
 * Helper to extract client IP from headers.
 */
export function getClientIp(request: Request): string {
    const forwardedFor = request.headers.get('x-forwarded-for')
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim()
    }
    return request.headers.get('x-real-ip') || '127.0.0.1'
}

/**
 * Custom Redis fixed-window rate limiter.
 * @param key The unique key to identify the client (e.g. rate_limit:tasks:<ip>)
 * @param limit Maximum number of requests allowed in the window
 * @param windowSeconds Window duration in seconds
 */
export async function rateLimit(
    key: string,
    limit: number,
    windowSeconds: number
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
            throw new Error('Redis transaction failed')
        }

        const count = (results[0]?.[1] as number) || 0
        const ttl = (results[1]?.[1] as number) || -1

        if (count === 1) {
            await redis.expire(redisKey, windowSeconds)
        }

        const remaining = Math.max(0, limit - count)
        const allowed = count <= limit
        const reset = now + (ttl > 0 ? ttl : windowSeconds)

        return {
            allowed,
            remaining,
            limit,
            reset,
        }
    } catch (err: any) {
        console.error('[rateLimit] Error executing rate limiting:', err.message)
        // Fallback: allow request in case Redis/network fails
        return {
            allowed: true,
            remaining: 1,
            limit,
            reset: Math.floor(Date.now() / 1000) + windowSeconds,
        }
    }
}
