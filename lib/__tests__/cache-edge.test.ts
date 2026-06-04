import { describe, it, expect, vi, beforeEach } from 'vitest'
import { docKey, listKey, versionKey, CACHE_TTL } from '../cache'

describe('docKey', () => {
  it('handles numeric IDs', () => {
    expect(docKey('tasks', 42)).toBe('tasks:doc:42')
  })

  it('handles string IDs', () => {
    expect(docKey('users', 'abc-123')).toBe('users:doc:abc-123')
  })

  it('handles object IDs (MongoDB)', () => {
    expect(docKey('media', '507f1f77bcf86cd799439011')).toBe('media:doc:507f1f77bcf86cd799439011')
  })
})

describe('listKey', () => {
  it('produces consistent output for same input', () => {
    const query = { status: 'pending', assignedTo: 'user1' }
    const k1 = listKey('tasks', query)
    const k2 = listKey('tasks', query)
    expect(k1).toBe(k2)
  })

  it('produces different keys for different collections', () => {
    const query = { limit: 10 }
    const tasksKey = listKey('tasks', query)
    const usersKey = listKey('users', query)
    expect(tasksKey).not.toBe(usersKey)
  })

  it('produces different keys for different query shapes', () => {
    const k1 = listKey('tasks', { a: 1 })
    const k2 = listKey('tasks', { b: 2 })
    expect(k1).not.toBe(k2)
  })

  it('handles empty query', () => {
    const key = listKey('tasks', {})
    expect(key).toMatch(/^tasks:list:tasks:version:[a-f0-9]{12}$/)
  })

  it('handles deeply nested query objects', () => {
    const query = { where: { status: { equals: 'completed' }, assignedTo: { in: ['a', 'b'] } } }
    const key = listKey('tasks', query)
    expect(key).toMatch(/^tasks:list:tasks:version:[a-f0-9]{12}$/)
  })
})

describe('versionKey', () => {
  it('returns correct format for all collection slugs', () => {
    const slugs = Object.keys(CACHE_TTL)
    for (const slug of slugs) {
      expect(versionKey(slug)).toBe(`${slug}:version`)
    }
  })
})

describe('CACHE_TTL', () => {
  it('all TTLs are positive numbers', () => {
    for (const [slug, ttl] of Object.entries(CACHE_TTL)) {
      expect(typeof ttl).toBe('number')
      expect(ttl).toBeGreaterThan(0)
    }
  })

  it('has all expected collection slugs', () => {
    expect(CACHE_TTL).toHaveProperty('tasks')
    expect(CACHE_TTL).toHaveProperty('users')
    expect(CACHE_TTL).toHaveProperty('notifications')
    expect(CACHE_TTL).toHaveProperty('pages')
  })
})
