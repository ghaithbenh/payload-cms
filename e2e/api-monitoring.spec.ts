import { test, expect } from '@playwright/test'

test.describe('Monitoring API', () => {
  test('returns 401 for unauthenticated GET to queue metrics', async ({ request }) => {
    const res = await request.get('/api/monitoring/queue')
    expect(res.status()).toBe(401)
  })
})
