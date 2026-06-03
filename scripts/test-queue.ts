/**
 * Test script to verify the notification queue works end-to-end.
 * Run with: npx tsx scripts/test-queue.ts
 */
import { ensureRedis, closeRedis } from '../lib/redis'
import { enqueueNotification, getQueueMetrics } from '../lib/queue'

async function main() {
  console.log('=== Notification Queue Test ===\n')

  // 1. Check Redis connection
  console.log('[1] Testing Redis connection...')
  const redis = await ensureRedis()
  const pong = await redis.ping()
  console.log(`    Redis PING: ${pong}\n`)

  // 2. Get initial queue metrics
  console.log('[2] Initial queue metrics:')
  const before = await getQueueMetrics()
  console.log(`    ${JSON.stringify(before, null, 2)}\n`)

  // 3. Enqueue a test notification
  console.log('[3] Enqueuing test notification...')
  await enqueueNotification({
    userId: 'test-user-123',
    message: 'Test notification from queue test script',
    type: 'info',
  })
  console.log('    Enqueued successfully!\n')

  // 4. Verify the job is in Redis
  console.log('[4] Checking queue length after enqueue...')
  const after = await getQueueMetrics()
  console.log(`    ${JSON.stringify(after, null, 2)}\n`)

  // 5. Peek at the job in the queue
  console.log('[5] Peeking at queued job...')
  const rawJob = await redis.lindex('queue:notifications', 0)
  if (rawJob) {
    const job = JSON.parse(rawJob)
    console.log(`    Job: ${JSON.stringify(job, null, 2)}\n`)
  } else {
    console.log('    No job found (worker may have already consumed it)\n')
  }

  // 6. Check rate limit keys exist
  console.log('[6] Checking all Redis keys...')
  const allKeys = await redis.keys('*')
  console.log(`    Found ${allKeys.length} keys: ${allKeys.join(', ')}\n`)

  console.log('=== Test Complete ===')
  await closeRedis()
  process.exit(0)
}

main().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
