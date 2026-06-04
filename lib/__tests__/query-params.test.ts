import { describe, it, expect } from 'vitest'
import { parseQueryParams } from '../query-params'

describe('parseQueryParams', () => {
  it('parses simple query params', () => {
    const result = parseQueryParams('http://localhost:3000/api/tasks?limit=10&page=1')
    expect(result).toEqual({ limit: '10', page: '1' })
  })

  it('parses string values', () => {
    const result = parseQueryParams('http://localhost:3000/api/tasks?sort=title')
    expect(result).toEqual({ sort: 'title' })
  })

  it('parses boolean values', () => {
    const result = parseQueryParams('http://localhost:3000/api/tasks?overrideAccess=true&draft=false')
    expect(result).toEqual({ overrideAccess: true, draft: false })
  })

  it('parses nested bracket notation', () => {
    const url = 'http://localhost:3000/api/tasks?where[status][equals]=pending'
    const result = parseQueryParams(url)
    expect(result).toEqual({ where: { status: { equals: 'pending' } } })
  })

  it('returns empty object for URL with no params', () => {
    const result = parseQueryParams('http://localhost:3000/api/tasks')
    expect(result).toEqual({})
  })

  it('handles mixed params', () => {
    const url = 'http://localhost:3000/api/tasks?limit=5&where[assignedTo][equals]=abc&sort=-createdAt'
    const result = parseQueryParams(url)
    expect(result).toEqual({
      limit: '5',
      where: { assignedTo: { equals: 'abc' } },
      sort: '-createdAt',
    })
  })
})
