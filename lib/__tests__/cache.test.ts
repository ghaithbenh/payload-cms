import { describe, it, expect } from 'vitest'
import { docKey, listKey, versionKey, CACHE_TTL } from '../cache'

describe('cache key builders', () => {
  it('docKey builds correct string', () => {
    expect(docKey('tasks', '123')).toBe('tasks:doc:123')
    expect(docKey('users', 42)).toBe('users:doc:42')
  })

  it('versionKey builds correct string', () => {
    expect(versionKey('tasks')).toBe('tasks:version')
    expect(versionKey('notifications')).toBe('notifications:version')
  })

  it('listKey includes collection, version key, and query hash', () => {
    const key = listKey('tasks', { status: 'pending' })
    expect(key).toMatch(/^tasks:list:tasks:version:[a-f0-9]{12}$/)
  })

  it('listKey produces different keys for different queries', () => {
    const k1 = listKey('tasks', { status: 'pending' })
    const k2 = listKey('tasks', { status: 'completed' })
    expect(k1).not.toBe(k2)
  })

  it('CACHE_TTL has expected values', () => {
    expect(CACHE_TTL.tasks).toBe(300)
    expect(CACHE_TTL.users).toBe(300)
    expect(CACHE_TTL.notifications).toBe(60)
    expect(CACHE_TTL.pages).toBe(600)
  })
})
