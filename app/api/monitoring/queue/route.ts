import { getPayload } from 'payload'
import config from '@/payload.config'
import { getQueueMetrics } from '@/lib/queue'

export async function GET(request: Request) {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers: request.headers })

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const metrics = await getQueueMetrics()
  return Response.json(metrics)
}
