import { authenticateRequest, unauthorizedResponse, forbiddenResponse, errorResponse } from '@/lib/api-helpers'
import { getQueueMetrics } from '@/lib/queue'

export async function GET(request: Request) {
  try {
    const { payload, user } = await authenticateRequest(request)

    if (!user) {
      return unauthorizedResponse()
    }

    if ((user as any).role !== 'admin') {
      return forbiddenResponse()
    }

    const metrics = await getQueueMetrics()
    return Response.json(metrics)
  } catch (err) {
    return errorResponse(err)
  }
}
