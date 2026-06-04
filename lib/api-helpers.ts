import { getPayload } from 'payload'
import config from '@/payload.config'
import { rateLimit, getClientIp, getRoleLimits, calculateRetryAfter, type UserRole } from './rateLimit'
import { parseQueryParams } from './query-params'
import { logger } from './logger'
import { AppError, AuthError, ForbiddenError, ValidationError, RateLimitError } from './errors'

export interface RateLimitOptions {
  prefix: string
  role?: UserRole
}

export interface CheckRateLimitResult {
  response: Response | null
  headers: Record<string, string>
}

export { parseQueryParams }

export async function getPayloadClient() {
  const payloadConfig = await config
  return getPayload({ config: payloadConfig })
}

export async function authenticateRequest(request: Request) {
  const payload = await getPayloadClient()
  try {
    const { user } = await payload.auth({ headers: request.headers })
    return { payload, user }
  } catch {
    return { payload, user: null }
  }
}

export function buildRateLimitHeaders(result: { limit: number; remaining: number; reset: number }) {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
    'Retry-After': String(calculateRetryAfter(result.reset)),
  }
}

export async function checkRateLimit(
  request: Request,
  options: RateLimitOptions,
): Promise<CheckRateLimitResult> {
  const ip = getClientIp(request)
  const { limit, windowSeconds } = getRoleLimits(options.role)
  const result = await rateLimit(`${options.prefix}:${ip}`, limit, windowSeconds)
  const headers = buildRateLimitHeaders(result)

  if (!result.allowed) {
    logger.warn({ prefix: options.prefix, ip, role: options.role || 'unknown' }, 'Rate limit exceeded')
    const err = new RateLimitError(calculateRetryAfter(result.reset), result.limit, result.remaining, result.reset)
    return {
      response: Response.json(err.toJSON(), { status: 429, headers }),
      headers,
    }
  }

  logger.debug({ prefix: options.prefix, ip, role: options.role || 'unknown' }, 'Rate limit check passed')
  return { response: null, headers }
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return Response.json({ error: message, code: 'UNAUTHORIZED' }, { status: 401 })
}

export function forbiddenResponse(message = 'Forbidden') {
  return Response.json({ error: message, code: 'FORBIDDEN' }, { status: 403 })
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error({ err: error.message }, 'Internal server error')
    }
    return Response.json(error.toJSON(), { status: error.statusCode })
  }

  const message = error instanceof Error ? error.message : 'Internal Server Error'
  const rawStatus = error instanceof Error && 'statusCode' in error
    ? (error as { statusCode?: unknown }).statusCode
    : undefined
  const status = typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus <= 599
    ? rawStatus
    : 500
  const code = error instanceof Error && 'code' in error
    ? (error as { code?: string }).code!
    : 'INTERNAL_ERROR'

  if (status >= 500) {
    logger.error({ err: message }, 'Internal server error')
  }

  return Response.json({ error: message, code }, { status })
}
