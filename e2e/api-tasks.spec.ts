import { test, expect } from '@playwright/test'

test.describe('Tasks API', () => {
  test('returns 401 for unauthenticated GET', async ({ request }) => {
    const res = await request.get('/api/tasks')
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
    expect(body.code).toBe('UNAUTHORIZED')
  })

  test('returns 401 for unauthenticated POST', async ({ request }) => {
    const res = await request.post('/api/tasks', { data: { title: 'test', description: 'test' } })
    expect(res.status()).toBe(401)
  })

  test('returns 401 for unauthenticated PATCH', async ({ request }) => {
    const res = await request.patch('/api/tasks/123', { data: { title: 'updated' } })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
    expect(body.code).toBe('UNAUTHORIZED')
  })

  test('returns 401 for unauthenticated DELETE', async ({ request }) => {
    const res = await request.delete('/api/tasks/123')
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
    expect(body.code).toBe('UNAUTHORIZED')
  })

  test('returns no rate limit headers on 401 (auth before rate limit)', async ({ request }) => {
    const res = await request.get('/api/tasks')
    expect(res.status()).toBe(401)
    expect(res.headers()['x-ratelimit-limit']).toBeUndefined()
    expect(res.headers()['x-ratelimit-remaining']).toBeUndefined()
  })
})
