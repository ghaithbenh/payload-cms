import { describe, it, expect } from 'vitest'
import { parseQueryParams } from '../query-params'

describe('parseQueryParams', () => {
  it('handles URL with no search params', () => {
    expect(parseQueryParams('http://localhost:3000/api/tasks')).toEqual({})
  })

  it('handles URL with only path, no query', () => {
    expect(parseQueryParams('http://localhost:3000/')).toEqual({})
  })

  it('parses single param', () => {
    expect(parseQueryParams('http://localhost:3000/api/tasks?limit=10')).toEqual({ limit: '10' })
  })

  it('casts true string to boolean true', () => {
    expect(parseQueryParams('http://localhost:3000/api/tasks?deep=true')).toEqual({ deep: true })
  })

  it('casts false string to boolean false', () => {
    expect(parseQueryParams('http://localhost:3000/api/tasks?deep=false')).toEqual({ deep: false })
  })

  it('preserves non-boolean strings as strings', () => {
    expect(parseQueryParams('http://localhost:3000/api/tasks?sort=title')).toEqual({ sort: 'title' })
    expect(parseQueryParams('http://localhost:3000/api/tasks?status=pending')).toEqual({ status: 'pending' })
  })

  it('parses single-level bracket notation', () => {
    const result = parseQueryParams('http://localhost:3000/api/tasks?where[status]=pending')
    expect(result).toEqual({ where: { status: 'pending' } })
  })

  it('parses deeply nested bracket notation (3 levels)', () => {
    const url = 'http://localhost:3000/api/tasks?where[status][equals]=pending'
    const result = parseQueryParams(url)
    expect(result).toEqual({ where: { status: { equals: 'pending' } } })
  })

  it('parses deeply nested bracket notation (4 levels)', () => {
    const url = 'http://localhost:3000/api/tasks?filter[0][field][operator]=contains'
    const result = parseQueryParams(url)
    expect(result).toEqual({ filter: { '0': { field: { operator: 'contains' } } } })
  })

  it('handles multiple bracket-notation params at different depths', () => {
    const url = 'http://localhost:3000/api/tasks?where[status][equals]=pending&where[priority][in]=high'
    const result = parseQueryParams(url)
    expect(result).toEqual({
      where: {
        status: { equals: 'pending' },
        priority: { in: 'high' },
      },
    })
  })

  it('handles encoded characters in values', () => {
    const url = 'http://localhost:3000/api/tasks?title=hello%20world'
    expect(parseQueryParams(url)).toEqual({ title: 'hello world' })
  })

  it('handles empty values', () => {
    const url = 'http://localhost:3000/api/tasks?flag=&key=value'
    const result = parseQueryParams(url)
    expect(result).toEqual({ flag: '', key: 'value' })
  })
})
