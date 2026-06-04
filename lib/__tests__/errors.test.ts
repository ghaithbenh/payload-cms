import { describe, it, expect } from 'vitest'
import { AppError, AuthError, ForbiddenError, NotFoundError, RateLimitError, ValidationError } from '../errors'

describe('AppError', () => {
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
  it('has 401 status and UNAUTHORIZED code', () => {
    const err = new AuthError()
    expect(err.statusCode).toBe(401)
    expect(err.code).toBe('UNAUTHORIZED')
    expect(err.message).toBe('Unauthorized')
  })
})

describe('ForbiddenError', () => {
  it('has 403 status and FORBIDDEN code', () => {
    const err = new ForbiddenError()
    expect(err.statusCode).toBe(403)
    expect(err.code).toBe('FORBIDDEN')
  })
})

describe('NotFoundError', () => {
  it('has 404 status and NOT_FOUND code', () => {
    const err = new NotFoundError()
    expect(err.statusCode).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
  })
})

describe('RateLimitError', () => {
  it('has 429 status and RATE_LIMITED code', () => {
    const err = new RateLimitError(30, 100, 0, 1234567890)
    expect(err.statusCode).toBe(429)
    expect(err.code).toBe('RATE_LIMITED')
    expect(err.retryAfter).toBe(30)
    expect(err.limit).toBe(100)
    expect(err.remaining).toBe(0)
    expect(err.reset).toBe(1234567890)
  })
})

describe('ValidationError', () => {
  it('has 400 status and VALIDATION_ERROR code', () => {
    const err = new ValidationError('invalid input')
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.message).toBe('invalid input')
  })
})
