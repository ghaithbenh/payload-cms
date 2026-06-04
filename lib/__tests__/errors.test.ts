import { describe, it, expect } from 'vitest'
import { BaseAppError, AppError, AuthError, ForbiddenError, NotFoundError, RateLimitError, ValidationError } from '../errors'

describe('BaseAppError', () => {
  it('exports both BaseAppError and AppError', () => {
    const err = new BaseAppError('test')
    expect(err instanceof BaseAppError).toBe(true)
    expect(err instanceof AppError).toBe(true)
  })

  it('creates error with default values', () => {
    const err = new AppError('test')
    expect(err.message).toBe('test')
    expect(err.statusCode).toBe(500)
    expect(err.code).toBe('INTERNAL_ERROR')
    expect(err.toJSON()).toEqual({ error: 'test', code: 'INTERNAL_ERROR' })
  })

  it('creates error with custom values', () => {
    const err = new AppError('custom', 418, 'TEAPOT')
    expect(err.statusCode).toBe(418)
    expect(err.code).toBe('TEAPOT')
  })
})

describe('AuthError', () => {
  it('returns 401 response through errorResponse', async () => {
    const { errorResponse } = await import('../api-helpers')
    const err = new AuthError()
    const res = errorResponse(err)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED' })
  })
})

describe('ForbiddenError', () => {
  it('returns 403 response through errorResponse', async () => {
    const { errorResponse } = await import('../api-helpers')
    const err = new ForbiddenError()
    const res = errorResponse(err)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toEqual({ error: 'Forbidden', code: 'FORBIDDEN' })
  })
})

describe('NotFoundError', () => {
  it('has 404 status and NOT_FOUND code', () => {
    const err = new NotFoundError('Task not found')
    expect(err.statusCode).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.message).toBe('Task not found')
  })

  it('returns 404 response through errorResponse', async () => {
    const { errorResponse } = await import('../api-helpers')
    const err = new NotFoundError('Task not found')
    const res = errorResponse(err)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: 'Task not found', code: 'NOT_FOUND' })
  })
})

describe('RateLimitError', () => {
  it('returns 429 response through errorResponse', async () => {
    const { errorResponse } = await import('../api-helpers')
    const err = new RateLimitError(30, 100, 0, 1234567890)
    expect(err.retryAfter).toBe(30)
    expect(err.limit).toBe(100)
    expect(err.remaining).toBe(0)
    expect(err.reset).toBe(1234567890)
    const res = errorResponse(err)
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body).toEqual({ error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' })
  })
})

describe('ValidationError', () => {
  it('returns 400 response through errorResponse', async () => {
    const { errorResponse } = await import('../api-helpers')
    const err = new ValidationError('invalid input')
    const res = errorResponse(err)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toEqual({ error: 'invalid input', code: 'VALIDATION_ERROR' })
  })
})

describe('errorResponse handles all error types', () => {
  it('returns 500 for unknown errors', async () => {
    const { errorResponse } = await import('../api-helpers')
    const res = errorResponse('raw string')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' })
  })

  it('returns 500 for plain Error with no statusCode', async () => {
    const { errorResponse } = await import('../api-helpers')
    const res = errorResponse(new Error('db failure'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'db failure', code: 'INTERNAL_ERROR' })
  })

  it('returns custom status from error duck-typing', async () => {
    const { errorResponse } = await import('../api-helpers')
    class TeapotError extends Error {
      statusCode = 418
      code = 'TEAPOT'
      constructor() {
        super("I'm a teapot")
      }
    }
    const res = errorResponse(new TeapotError())
    expect(res.status).toBe(418)
    const body = await res.json()
    expect(body).toEqual({ error: "I'm a teapot", code: 'TEAPOT' })
  })
})
