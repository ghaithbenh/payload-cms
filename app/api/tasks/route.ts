import { getPayload } from 'payload'
import config from '@/payload.config'
import { cacheAside, listKey, CACHE_TTL } from '@/lib/cache'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import type { User } from '@/payload-types'
import type { Where } from 'payload'

function parseQueryParams(url: string) {
  const { searchParams } = new URL(url)
  const result: Record<string, any> = {}

  searchParams.forEach((value, key) => {
    const parts = key.split(/[\[\]]+/).filter(Boolean)
    let current = result
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (i === parts.length - 1) {
        current[part] = value === 'true' ? true : value === 'false' ? false : value
      } else {
        if (!current[part]) {
          current[part] = {}
        }
        current = current[part]
      }
    }
  })

  return result
}

export async function GET(request: Request) {
  const ip = getClientIp(request)
  //rate limit 100
  const rateLimitResult = await rateLimit(`tasks:${ip}`, 100, 60)

  if (!rateLimitResult.allowed) {
    return Response.json(
      { error: 'Too Many Requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(rateLimitResult.reset),
          'Retry-After': String(rateLimitResult.reset - Math.floor(Date.now() / 1000)),
        },
      }
    )
  }

  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers: request.headers })

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = parseQueryParams(request.url)

  const where = parsed.where as Where || undefined
  const limit = parsed.limit ? Number(parsed.limit) : undefined
  const page = parsed.page ? Number(parsed.page) : undefined
  const sort = parsed.sort as string || undefined
  const depth = parsed.depth !== undefined ? Number(parsed.depth) : 2

  const queryOptions = {
    collection: 'tasks' as const,
    user,
    overrideAccess: false,
    where,
    limit,
    page,
    sort,
    depth,
  }

  // Include user ID/role and query parameters to avoid cache collisions
  const cacheKey = listKey('tasks', {
    userId: user.id,
    userRole: user.role,
    where,
    limit,
    page,
    sort,
    depth,
  })

  const data = await cacheAside(
    cacheKey,
    () => payload.find(queryOptions),
    CACHE_TTL.tasks,
  )

  return Response.json(data)
}
