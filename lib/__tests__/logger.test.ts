import { describe, it, expect } from 'vitest'
import { logger, childLogger } from '../logger'

describe('logger', () => {
  it('exports a logger instance', () => {
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.debug).toBe('function')
  })

  it('childLogger returns a child logger', () => {
    const child = childLogger({ module: 'test' })
    expect(child).toBeDefined()
    expect(typeof child.info).toBe('function')
  })

  it('logger level is set', () => {
    expect(logger.level).toMatch(/^(debug|info|warn|error|fatal|trace)$/)
  })

  it('runs production level formatter', async () => {
    vi.resetModules()
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const { logger: prodLogger } = await import('../logger')
    
    prodLogger.info('test production logger')
    
    process.env.NODE_ENV = originalNodeEnv
    vi.resetModules()
  })
})
