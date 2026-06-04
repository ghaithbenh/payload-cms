import { test, expect } from '@playwright/test'

test.describe('Users API', () => {
  test('returns 401 for unauthenticated GET', async ({ request }) => {
    const res = await request.get('/api/users')
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
    expect(body.code).toBe('UNAUTHORIZED')
  })

  test('returns 401 for unauthenticated POST', async ({ request }) => {
    const res = await request.post('/api/users', { data: { email: 'test@test.com' } })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
    expect(body.code).toBe('UNAUTHORIZED')
  })

  test('returns 401 for unauthenticated PATCH', async ({ request }) => {
    const res = await request.patch('/api/users/123', { data: { firstName: 'test' } })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
    expect(body.code).toBe('UNAUTHORIZED')
  })

  test('returns 401 for unauthenticated DELETE', async ({ request }) => {
    const res = await request.delete('/api/users/123')
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
    expect(body.code).toBe('UNAUTHORIZED')
  })
})
