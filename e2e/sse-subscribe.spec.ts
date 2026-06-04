import { test, expect } from '@playwright/test'

test.describe('SSE Subscription', () => {
  test('SSE endpoint returns 401 when not authenticated', async ({ request }) => {
    const res = await request.get('/api/tasks/subscribe')
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('UNAUTHORIZED')
  })
})
