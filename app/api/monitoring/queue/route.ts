import { authenticateRequest, unauthorizedResponse, forbiddenResponse, errorResponse } from '@/lib/api-helpers'
import { getQueueMetrics } from '@/lib/queue'
import type { User } from '@/payload-types'

export async function GET(request: Request) {
  try {
    const { payload, user } = await authenticateRequest(request)

    if (!user) {
      return unauthorizedResponse()
    }

    if ((user as User).role !== 'admin') {
      return forbiddenResponse()
    }

    const metrics = await getQueueMetrics()
    return Response.json(metrics)
  } catch (err) {
    return errorResponse(err)
  }
}
