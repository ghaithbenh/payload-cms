import { test, expect } from '@playwright/test'

test.describe('Notifications API', () => {
  test('returns 401 for unauthenticated GET', async ({ request }) => {
    const res = await request.get('/api/notifications')
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
    expect(body.code).toBe('UNAUTHORIZED')
  })

  test('returns 401 for unauthenticated POST', async ({ request }) => {
    const res = await request.post('/api/notifications', {
      data: { userId: '123', message: 'test', type: 'info' },
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
    expect(body.code).toBe('UNAUTHORIZED')
  })

  test('returns 401 for unauthenticated PATCH', async ({ request }) => {
    const res = await request.patch('/api/notifications/123', { data: { read: true } })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
    expect(body.code).toBe('UNAUTHORIZED')
  })

  test('returns 401 for unauthenticated DELETE', async ({ request }) => {
    const res = await request.delete('/api/notifications/123')
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
    expect(body.code).toBe('UNAUTHORIZED')
  })
})
