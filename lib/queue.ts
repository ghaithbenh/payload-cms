import { ensureRedis } from './redis'
import { logger } from './logger'
import type { Payload } from 'payload'

export interface NotificationJob {
  userId: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: number
}

const QUEUE_KEY = 'queue:notifications'
const PROCESSING_KEY = 'queue:notifications:processing'
const FAILED_KEY = 'queue:notifications:failed'

let workerStarted = false

export async function enqueueNotification(job: Omit<NotificationJob, 'timestamp'>) {
  try {
    const redis = await ensureRedis()
    const fullJob: NotificationJob = {
      ...job,
      timestamp: Date.now(),
    }
    await redis.lpush(QUEUE_KEY, JSON.stringify(fullJob))
    logger.info({ userId: job.userId, message: job.message }, 'Enqueued notification')
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err.message : String(err), userId: job.userId }, 'Failed to enqueue notification')
    throw err
  }
}

export async function startNotificationWorker(payload: Payload) {
  if (workerStarted) return
  workerStarted = true

  payload.logger.info('[Queue] Starting notification background worker...')

  ;(async () => {
    const redis = await ensureRedis()

    while (true) {
      try {
        const rawJob = await redis.brpoplpush(QUEUE_KEY, PROCESSING_KEY, 5)

        if (rawJob) {
          const job: NotificationJob = JSON.parse(rawJob)
          payload.logger.info(`[Queue] Processing notification for user ${job.userId}`)

          try {
            await payload.create({
              collection: 'notifications',
              data: {
                userId: job.userId,
                message: job.message,
                type: job.type,
              },
            })

            await redis.lrem(PROCESSING_KEY, 1, rawJob)
            payload.logger.info(`[Queue] Successfully processed notification for user ${job.userId}`)
            await redis.incr('metrics:queue:notifications:success')
          } catch (jobErr: unknown) {
            const jobErrMsg = jobErr instanceof Error ? jobErr.message : String(jobErr)
            payload.logger.error(`[Queue] Error processing notification: ${jobErrMsg}`)
            await redis.incr('metrics:queue:notifications:failure')
            await redis.lpush(FAILED_KEY, JSON.stringify({ job, error: jobErrMsg }))
            await redis.lrem(PROCESSING_KEY, 1, rawJob)
          }
        }
      } catch (loopErr: unknown) {
        logger.error({ err: loopErr instanceof Error ? loopErr.message : String(loopErr) }, 'Queue worker error loop')
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
    }
  })()
}

export async function getQueueMetrics() {
  try {
    const redis = await ensureRedis()
    const queueLength = await redis.llen(QUEUE_KEY)
    const processingLength = await redis.llen(PROCESSING_KEY)
    const failedLength = await redis.llen(FAILED_KEY)
    const successCount = Number((await redis.get('metrics:queue:notifications:success')) || 0)
    const failureCount = Number((await redis.get('metrics:queue:notifications:failure')) || 0)

    return {
      queueLength,
      processingLength,
      failedLength,
      successCount,
      failureCount,
      workerActive: workerStarted,
    }
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : String(err),
      workerActive: workerStarted,
    }
  }
}
