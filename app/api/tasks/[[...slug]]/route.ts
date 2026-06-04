import { cacheAside, listKey, CACHE_TTL } from '@/lib/cache'
import { authenticateRequest, checkRateLimit, parseQueryParams, unauthorizedResponse, errorResponse } from '@/lib/api-helpers'
import type { Where } from 'payload'
import { REST_POST, REST_DELETE, REST_PATCH, REST_PUT, REST_OPTIONS, REST_GET } from '@payloadcms/next/routes'
import payloadConfig from '@payload-config'

const payloadGET = REST_GET(payloadConfig)
const payloadPOST = REST_POST(payloadConfig)
const payloadDELETE = REST_DELETE(payloadConfig)
const payloadPATCH = REST_PATCH(payloadConfig)
const payloadPUT = REST_PUT(payloadConfig)
const payloadOPTIONS = REST_OPTIONS(payloadConfig)

async function withAuthAndRateLimit(method: Function, request: Request, context: { params: Promise<{ slug?: string[] }> }) {
  const { user } = await authenticateRequest(request)
  if (!user) {
    return unauthorizedResponse()
  }

  const { headers: rateLimitHeaders, response: rateLimitResponse } = await checkRateLimit(request, { prefix: 'tasks', role: (user as any).role })
  if (rateLimitResponse) return rateLimitResponse

  const resolvedParams = await context.params
  const slug = resolvedParams.slug || []
  const newParams = Promise.resolve({ ...resolvedParams, slug: ['tasks', ...slug] })
  const response = await method(request, { ...context, params: newParams })

  if (response && typeof response.headers?.set === 'function') {
    for (const [key, value] of Object.entries(rateLimitHeaders)) {
      response.headers.set(key, value)
    }
  }

  return response
}

export async function GET(request: Request, context: { params: Promise<{ slug?: string[] }> }) {
  try {
    const { payload, user } = await authenticateRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const userRole = (user as any).role
    const { headers: rateLimitHeaders, response: rateLimitResponse } = await checkRateLimit(request, { prefix: 'tasks', role: userRole })
    if (rateLimitResponse) return rateLimitResponse

    const resolvedParams = await context.params
    const slug = resolvedParams.slug || []
    if (slug.length > 0) {
      const newParams = Promise.resolve({ ...resolvedParams, slug: ['tasks', ...slug] })
      const response = await payloadGET(request, { ...context, params: newParams })
      if (response && typeof response.headers?.set === 'function') {
        for (const [key, value] of Object.entries(rateLimitHeaders)) {
          response.headers.set(key, value)
        }
      }
      return response
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

    const cacheKey = listKey('tasks', {
      userId: (user as any).id,
      userRole,
      where,
      limit,
      page,
      sort,
      depth,
    })

    const data = await cacheAside(cacheKey, () => payload.find(queryOptions), CACHE_TTL.tasks)
    return Response.json(data, { headers: rateLimitHeaders })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(request: Request, context: { params: Promise<{ slug?: string[] }> }) {
  return withAuthAndRateLimit(payloadPOST, request, context)
}

export async function DELETE(request: Request, context: { params: Promise<{ slug?: string[] }> }) {
  return withAuthAndRateLimit(payloadDELETE, request, context)
}

export async function PATCH(request: Request, context: { params: Promise<{ slug?: string[] }> }) {
  return withAuthAndRateLimit(payloadPATCH, request, context)
}

export async function PUT(request: Request, context: { params: Promise<{ slug?: string[] }> }) {
  return withAuthAndRateLimit(payloadPUT, request, context)
}

export async function OPTIONS(request: Request, context: { params: Promise<{ slug?: string[] }> }) {
  return withAuthAndRateLimit(payloadOPTIONS, request, context)
}
