import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRedis } = vi.hoisted(() => {
  const mockRedis = {
    lpush: vi.fn().mockResolvedValue(1),
    brpoplpush: vi.fn().mockResolvedValue(null),
    lrem: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    llen: vi.fn().mockResolvedValue(0),
    get: vi.fn().mockResolvedValue(null),
  }
  return { mockRedis }
})

vi.mock('../redis', () => ({
  ensureRedis: vi.fn().mockResolvedValue(mockRedis),
}))

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { enqueueNotification, startNotificationWorker, getQueueMetrics } from '../queue'
import { ensureRedis } from '../redis'
import { logger } from '../logger'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('queue', () => {
  describe('enqueueNotification', () => {
    it('pushes job to redis queue', async () => {
      const job = { userId: 'user-1', message: 'Hello', type: 'info' as const }
      await enqueueNotification(job)

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'queue:notifications',
        expect.stringContaining('"userId":"user-1"')
      )
      expect(logger.info).toHaveBeenCalled()
    })

    it('logs and throws error when Redis lpush fails', async () => {
      mockRedis.lpush.mockRejectedValueOnce(new Error('Redis down'))
      const job = { userId: 'user-1', message: 'Hello', type: 'info' as const }

      await expect(enqueueNotification(job)).rejects.toThrow('Redis down')
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('startNotificationWorker', () => {
    it('registers worker and processes jobs (success & failure & loop error)', async () => {
      vi.useFakeTimers()
      const mockPayload = {
        logger: { info: vi.fn(), error: vi.fn() },
        create: vi.fn()
          .mockResolvedValueOnce({ id: 'notif-1' }) // first job succeeds
          .mockRejectedValueOnce(new Error('DB error')), // second job fails
      } as any

      const successJob = { userId: 'user-2', message: 'Success', type: 'success' as const }
      const failJob = { userId: 'user-3', message: 'Failed', type: 'error' as const }

      mockRedis.brpoplpush
        .mockResolvedValueOnce(JSON.stringify(successJob))
        .mockResolvedValueOnce(JSON.stringify(failJob))
        .mockResolvedValueOnce(null) // rawJob is null path
        .mockRejectedValueOnce(new Error('Loop error')) // trigger error path on fourth iteration
        .mockReturnValueOnce(new Promise(() => {})) // suspend loop on fifth iteration

      // Start the worker
      await startNotificationWorker(mockPayload)
      // Call it a second time to cover the "already started" early return branch
      await startNotificationWorker(mockPayload)

      // Yield control to let the background worker process both jobs
      await vi.advanceTimersByTimeAsync(50)

      // Verify success job processing
      expect(mockPayload.create).toHaveBeenNthCalledWith(1, {
        collection: 'notifications',
        data: {
          userId: 'user-2',
          message: 'Success',
          type: 'success',
        },
      })
      expect(mockRedis.incr).toHaveBeenCalledWith('metrics:queue:notifications:success')

      // Verify failed job processing
      expect(mockPayload.create).toHaveBeenNthCalledWith(2, {
        collection: 'notifications',
        data: {
          userId: 'user-3',
          message: 'Failed',
          type: 'error',
        },
      })
      expect(mockRedis.incr).toHaveBeenCalledWith('metrics:queue:notifications:failure')
      expect(mockRedis.lpush).toHaveBeenCalledWith('queue:notifications:failed', expect.any(String))

      // Both jobs should be removed from processing queue
      expect(mockRedis.lrem).toHaveBeenCalledTimes(2)

      // Fast-forward to run the error loop recovery (5000ms delay)
      await vi.advanceTimersByTimeAsync(5000)
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: 'Loop error' }),
        'Queue worker error loop'
      )

      vi.useRealTimers()
    })
  })

  describe('getQueueMetrics', () => {
    it('returns metrics from redis keys', async () => {
      mockRedis.llen
        .mockResolvedValueOnce(10) // queue
        .mockResolvedValueOnce(2)  // processing
        .mockResolvedValueOnce(1)  // failed
      mockRedis.get
        .mockResolvedValueOnce('50') // successCount
        .mockResolvedValueOnce('3')  // failureCount

      const metrics = await getQueueMetrics()

      expect(metrics).toEqual({
        queueLength: 10,
        processingLength: 2,
        failedLength: 1,
        successCount: 50,
        failureCount: 3,
        workerActive: true,
      })
    })

    it('returns error when redis calls fail', async () => {
      vi.mocked(ensureRedis).mockRejectedValueOnce(new Error('Redis connection failed'))

      const metrics = await getQueueMetrics()

      expect(metrics).toEqual({
        error: 'Redis connection failed',
        workerActive: true,
      })
    })

    it('defaults to zero for null success and failure counts', async () => {
      mockRedis.llen
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)

      const metrics = await getQueueMetrics()

      expect(metrics).toEqual({
        queueLength: 5,
        processingLength: 0,
        failedLength: 0,
        successCount: 0,
        failureCount: 0,
        workerActive: true,
      })
    })
  })
})
