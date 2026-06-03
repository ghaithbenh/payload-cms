import { ensureRedis } from './redis'
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


//Enqueues a notification job into Redis list.

export async function enqueueNotification(job: Omit<NotificationJob, 'timestamp'>) {
  try {
    const redis = await ensureRedis()
    const fullJob: NotificationJob = {
      ...job,
      timestamp: Date.now(),
    }
    await redis.lpush(QUEUE_KEY, JSON.stringify(fullJob))
    console.info(`[Queue] Enqueued notification for user ${job.userId}: "${job.message}"`)
  } catch (err: any) {
    console.error('[Queue] Failed to enqueue notification:', err.message)
    throw err
  }
}


// Starts the background worker to pop and process notification jobs.

export async function startNotificationWorker(payload: Payload) {
  if (workerStarted) return
  workerStarted = true

  payload.logger.info('[Queue] Starting notification background worker...')

    ; (async () => {
      const redis = await ensureRedis()

      while (true) {
        try {
          // Atomic reliable queue pattern using brpoplpush
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

              // Remove from processing queue on success
              await redis.lrem(PROCESSING_KEY, 1, rawJob)
              payload.logger.info(`[Queue] Successfully processed notification for user ${job.userId}`)

              // Update success counter
              await redis.incr('metrics:queue:notifications:success')
            } catch (jobErr: any) {
              payload.logger.error(`[Queue] Error processing notification: ${jobErr.message}`)
              await redis.incr('metrics:queue:notifications:failure')

              // Move to failed list
              await redis.lpush(FAILED_KEY, JSON.stringify({ job, error: jobErr.message }))
              await redis.lrem(PROCESSING_KEY, 1, rawJob)
            }
          }
        } catch (loopErr: any) {
          payload.logger.error(`[Queue] Worker error loop: ${loopErr.message}`)
          await new Promise((resolve) => setTimeout(resolve, 5000))
        }
      }
    })()
}


// Gets queue statistics for monitoring.

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
  } catch (err: any) {
    return {
      error: err.message,
      workerActive: workerStarted,
    }
  }
}
