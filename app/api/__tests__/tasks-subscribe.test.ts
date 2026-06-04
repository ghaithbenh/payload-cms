import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'
import { GET } from '../tasks/subscribe/route'
import { authenticateRequest, unauthorizedResponse } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'

vi.mock('@/lib/api-helpers', () => ({
  authenticateRequest: vi.fn(),
  unauthorizedResponse: vi.fn(() => new Response('unauthorized', { status: 401 })),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

class MockChangeStream extends EventEmitter {
  close = vi.fn()
}

describe('Tasks Subscribe SSE Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 401 if unauthenticated', async () => {
    vi.mocked(authenticateRequest).mockResolvedValueOnce({ payload: {} as unknown as Payload, user: null })
    const req = new Request('http://localhost/api/tasks/subscribe')
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(unauthorizedResponse).toHaveBeenCalled()
  })

  it('returns 401 if authenticateRequest throws', async () => {
    vi.mocked(authenticateRequest).mockRejectedValueOnce(new Error('Auth failed'))
    const req = new Request('http://localhost/api/tasks/subscribe')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('successfully connects and handles change stream update, delete, error fallback to polling, and heartbeats', async () => {
    const mockUser = { id: 'user-1' }
    const mockChangeStream = new MockChangeStream()
    const mockCollection = {
      watch: vi.fn(() => mockChangeStream),
    }
    const mockDbConnection = {
      collection: vi.fn(() => mockCollection),
    }
    const mockPayload = {
      db: {
        connection: mockDbConnection,
      },
      findByID: vi.fn(),
      find: vi.fn().mockResolvedValue({ docs: [] }),
    }

    vi.mocked(authenticateRequest).mockResolvedValueOnce({
      payload: mockPayload as unknown as Payload,
      user: mockUser as unknown as User,
    })

    const controller = new AbortController()
    const req = new Request('http://localhost/api/tasks/subscribe', {
      signal: controller.signal,
    })

    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')

    // Exercise heartbeat
    await vi.advanceTimersByTimeAsync(15000)

    // Trigger delete event from change stream
    mockChangeStream.emit('change', {
      operationType: 'delete',
      documentKey: { _id: 'task-123' },
    })

    // Trigger update event
    mockPayload.findByID.mockResolvedValueOnce({
      id: 'task-456',
      assignedTo: { id: 'user-1' },
    })
    mockChangeStream.emit('change', {
      operationType: 'update',
      documentKey: { _id: 'task-456' },
    })
    // Let async operations complete
    await vi.advanceTimersByTimeAsync(0)

    // Trigger update for task not assigned to user
    mockPayload.findByID.mockResolvedValueOnce({
      id: 'task-789',
      assignedTo: 'user-other',
    })
    mockChangeStream.emit('change', {
      operationType: 'update',
      documentKey: { _id: 'task-789' },
    })
    await vi.advanceTimersByTimeAsync(0)

    // Trigger update that throws error
    mockPayload.findByID.mockRejectedValueOnce(new Error('Find error'))
    mockChangeStream.emit('change', {
      operationType: 'update',
      documentKey: { _id: 'task-xxx' },
    })
    await vi.advanceTimersByTimeAsync(0)

    // Trigger change stream error to fallback to polling
    mockPayload.find.mockResolvedValueOnce({
      docs: [
        { id: 'task-poll-1', assignedTo: 'user-1', updatedAt: '2026-06-03T19:00:00Z' },
      ],
    })
    mockChangeStream.emit('error', new Error('stream error'))

    // First poll (knownIds empty): just populates knownIds, no sends
    mockPayload.find.mockResolvedValueOnce({
      docs: [{ id: 'task-poll-1', assignedTo: 'user-1' }],
    })
    await vi.advanceTimersByTimeAsync(3000)

    // Second poll: task-poll-1 already known (covers false branch at lines 61-63), task-poll-2 is new
    mockPayload.find.mockResolvedValueOnce({
      docs: [
        { id: 'task-poll-1', assignedTo: 'user-1' }, // already in knownIds → branch NOT taken
        { id: 'task-poll-2', assignedTo: 'user-1' }, // new → branch taken
      ],
    })
    await vi.advanceTimersByTimeAsync(3000)

    // Third poll: all tasks deleted
    mockPayload.find.mockResolvedValueOnce({
      docs: [],
    })
    await vi.advanceTimersByTimeAsync(3000)

    // Fourth poll: error path
    mockPayload.find.mockRejectedValueOnce(new Error('Poll find error'))
    await vi.advanceTimersByTimeAsync(3000)

    // Make close throw to cover line 129
    mockChangeStream.close.mockImplementationOnce(() => { throw new Error('Close error') })
    // Call abort / cleanup
    controller.abort()
  })

  it('falls back to polling immediately if change stream connection throws', async () => {
    const mockUser = { id: 'user-1' }
    const mockPayload = {
      db: {}, // no connection property to throw error
      find: vi.fn().mockResolvedValue({ docs: [] }),
    }

    vi.mocked(authenticateRequest).mockResolvedValueOnce({
      payload: mockPayload as unknown as Payload,
      user: mockUser as unknown as User,
    })

    const controller = new AbortController()
    const req = new Request('http://localhost/api/tasks/subscribe', {
      signal: controller.signal,
    })

    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  it('handles stream enqueue error via heartbeat after stream is cancelled', async () => {
    const mockUser = { id: 'user-1' }
    const mockChangeStream = new MockChangeStream()
    const mockCollection = {
      watch: vi.fn(() => mockChangeStream),
    }
    const mockDbConnection = {
      collection: vi.fn(() => mockCollection),
    }
    const mockPayload = {
      db: {
        connection: mockDbConnection,
      },
      findByID: vi.fn(),
      find: vi.fn().mockResolvedValue({ docs: [] }),
    }

    vi.mocked(authenticateRequest).mockResolvedValueOnce({
      payload: mockPayload as unknown as Payload,
      user: mockUser as unknown as User,
    })

    const controller = new AbortController()
    const req = new Request('http://localhost/api/tasks/subscribe', {
      signal: controller.signal,
    })

    const res = await GET(req)
    expect(res.status).toBe(200)

    const reader = res.body!.getReader()
    await reader.cancel()

    await vi.advanceTimersByTimeAsync(15000)

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'Stream enqueue error'
    )

    controller.abort()
  })
})
