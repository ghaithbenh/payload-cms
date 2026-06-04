import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function getAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ORIGINS
  if (envOrigins) {
    return envOrigins.split(',').map(s => s.trim())
  }
  return ['http://localhost:3000']
}

export function proxy(request: NextRequest) {
  const allowedOrigins = getAllowedOrigins()
  const origin = request.headers.get('origin')
  const isValidOrigin = origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': isValidOrigin ? origin : (allowedOrigins[0] || ''),
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  const response = NextResponse.next()

  if (isValidOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  )

  const isDev = process.env.NODE_ENV === 'development'
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'" + (isDev ? " 'unsafe-eval'" : ''),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    "object-src 'self' blob:",
    "connect-src 'self' blob:" + (isDev ? ' ws:' : ''),
    "font-src 'self' data:",
    "object-src 'none'",
    "frame-ancestors 'self'",
  ].join('; ')
  response.headers.set('Content-Security-Policy', csp)

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    )
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
