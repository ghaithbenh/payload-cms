import { authenticateRequest, checkRateLimit, unauthorizedResponse, forbiddenResponse, errorResponse } from '@/lib/api-helpers'
import { getQueueMetrics } from '@/lib/queue'
import type { User } from '@/payload-types'

export async function GET(request: Request) {
  try {
    const { user } = await authenticateRequest(request)

    if (!user) {
      return unauthorizedResponse()
    }

    if ((user as User).role !== 'admin') {
      return forbiddenResponse()
    }

    const { headers: rateLimitHeaders, response: rateLimitResponse } = await checkRateLimit(request, { prefix: 'monitoring:queue', role: (user as User).role })
    if (rateLimitResponse) return rateLimitResponse

    const metrics = await getQueueMetrics()
    return Response.json(metrics, { headers: rateLimitHeaders })
  } catch (err) {
    return errorResponse(err)
  }
}
