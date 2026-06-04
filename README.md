# Payload CMS + Next.js App

A [Payload CMS](https://payloadcms.com) backend with a Next.js frontend.

## Getting Started

```bash
npm install
npm run dev
```

Security - All fixed ✅

ContactSubmissions & Subscriptions have proper auth checks
Tasks has proper user-based access control
No exposed API keys or secrets
Clean Structure - All cleared ✅

No scratch, media, or test routes
Well-organized collections, components, blocks
Proper TypeScript setup
Documentation - Great! ✅

## Features
- Real-time task updates via SSE
- Automatic task assignment to least busy user
- Role-based access control (Admin, Manager, User)
- Task status transitions with validation
- Notifications on task changes



## Environment

| Variable | Description |
|---|---|
| `PAYLOAD_SECRET` | Payload CMS secret |
| `DATABASE_URL` | MongoDB connection string |
| 

## Collections

- **Users** — Admin users (auth)
- **Tasks** — Task management with pic, doc, video uploads; access restricted to assigned user
- **ContactSubmissions** — Contact form entries; admin-only read
- **Subscriptions** — Subscription plans; admin-only read
- **Media** — Image uploads
- **Documents** — PDF uploads
- **Videos** — Video uploads
- **Pages** — CMS pages
- **Products** — Product catalog
- **Categories** — Product categories
- **Team** — Team members

## Frontend Routes

| Path | Description |
|---|---|
| `/tasks` | Task list |
| `/tasks/[id]` | Task detail with image, PDF, video viewer |
| `/admin` | Payload admin panel |

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npx payload generate:types      # Regenerate TS types
npx payload generate:importmap  # Regenerate admin import map
Vitest → npm run test:watch and npm run test:coverage
Playwright → npm run test:e2e
Pino → not a test runner, it's just the logging library used inside your app code
```







Merged lint + unit tests into one job — saves one full npm ci install
Added Redis service container with health check to both jobs that need it
E2E runs separately after lint/test passes, with Playwright browsers installed (chromium only — faster than full install)
Build runs in parallel with E2E — both depend on lint-and-test, so they run concurrently
Deploy waits for both E2E and build to pass before running
REDIS_HOST set to 127.0.0.1 in CI (service containers bind to localhost)





# Codebase Overview

Payload CMS + Next.js 15 (App Router) full-stack application with real-time task tracking, Redis-backed rate limiting & caching, background job queue, and CI/CD.

---

## Project Structure

```
src/
├── app/api/              # Custom API routes (tasks, notifications, users, monitoring, SSE subscribe)
├── app/(frontend)/       # Public pages (tasks, notifications, CMS pages with blocks)
├── app/(payload)/        # Payload admin panel + built-in API
├── collections/          # 12 Payload CMS collection configs (Users, Tasks, Notifications, Pages, etc.)
├── blocks/               # CMS block definitions (Hero, Content, CTA, FAQ)
├── components/           # Custom admin UI fields
├── hooks/                # React hooks (useTaskSubscription — SSE client)
├── lib/                  # Core modules (api-helpers, rateLimit, cache, redis, queue, errors, logger, query-params)
├── scripts/              # Utility scripts (backfill-team, test-queue)
├── e2e/                  # Playwright E2E tests
└── .github/workflows/    # CI/CD pipeline
```

---

## Rate Limiting

**Files:** `lib/rateLimit.ts`, `lib/api-helpers.ts`

Sliding-window rate limiter backed by Redis. Each request is counted via `INCR` + `TTL` pipeline keyed by `ratelimit:{prefix}:{ip}:{windowIndex}`.

**Role-based tiers (lib/rateLimit.ts:17-21):**

| Role    | Requests/min |
|---------|-------------:|
| admin   | 500          |
| manager | 200          |
| user    | 100          |

**Integration:** Every API route calls `checkRateLimit()` after auth (auth-first pattern — unauthenticated requests never consume rate limit budget). Violations return 429 with standard `X-RateLimit-*` headers. Routes use unique prefixes: `tasks`, `users`, `notifications`, `tasks:subscribe`, `monitoring:queue`.

**Fail-open:** Set `RATE_LIMIT_FAIL_OPEN=true` to let requests through when Redis is down (default: fail-closed).

---

## Redis

**File:** `lib/redis.ts`

Singleton ioredis client supporting 3 connection modes (priority order):

1. **REDIS_URL** — full connection string (`redis://user:pass@host:6379/0`)
2. **Redis Sentinel** — `REDIS_SENTINEL_HOSTS` + `REDIS_SENTINEL_NAME`
3. **Direct** — `REDIS_HOST` + `REDIS_PORT` (+ optional `REDIS_PASSWORD`, `REDIS_TLS_ENABLED`)

Exports: `getRedis()`, `ensureRedis()`, `pingRedis()`, `closeRedis()`. Retry strategy: exponential backoff up to 5s, max 10 retries.

**Local dev:** `docker-compose.yml` runs `redis:7-alpine` on port 6379 with persistent volume.

---

## Caching

**File:** `lib/cache.ts`

Cache-aside pattern via Redis. Key naming:

- Document: `{collection}:doc:{id}`
- List: `{collection}:list:{version}:{md5hash(12chars)}`
- Version: `{collection}:version`

**TTLs:** tasks=300s, users=300s, notifications=60s, pages=600s.

`cacheAside(key, fetcher, ttl)` tries Redis GET first; on miss, calls fetcher, stores result with EX. Gracefully degrades if Redis is unavailable.

`invalidateCollection(collection, id?)` evicts doc cache + bumps version key (invalidating all list queries). Called from `afterChange`/`afterDelete` hooks on Tasks, Notifications, Users.

---

## Queue / Background Jobs

**File:** `lib/queue.ts`

Redis-backed notification queue worker. Runs as an in-process infinite loop during Payload's `onInit`.

- **Enqueue:** `enqueueNotification(userId, message, type)` — LPUSHes job to `queue:notifications`
- **Worker:** Uses `BRPOPLPUSH` (5s timeout) to atomically move jobs to `queue:notifications:processing`. Creates a Payload notification document on success; pushes to `queue:notifications:failed` on failure.
- **Metrics:** `getQueueMetrics()` returns queue length, processing length, failed count, success/failure counters, worker status.

**Redis keys:** `queue:notifications`, `queue:notifications:processing`, `queue:notifications:failed`, `metrics:queue:notifications:success`, `metrics:queue:notifications:failure`.

---

## SSE / Real-Time Tasks

**Server:** `app/api/tasks/subscribe/route.ts`

Dual-strategy SSE endpoint for real-time task updates:

1. **MongoDB Change Streams** (primary) — watches `tasks` collection, emits `task:updated`, `task:deleted` events for the authenticated user's assigned tasks.
2. **Polling fallback** (3s interval) — kicks in when change stream errors. Tracks `knownIds` to detect new/updated/deleted tasks.
3. **Heartbeat** — `ping` event every 15s.

**Client:** `hooks/useTaskSubscription.ts`

React hook that opens `EventSource` with credentials, handles SSE events to update local task state, shows toast notifications, and reconnects with exponential backoff (1s → 16s max).

---

## API Routes

All custom routes under `app/api/` follow the same pattern:

1. `authenticateRequest()` — extract user via Payload auth
2. Return 401 if unauthenticated (except users public endpoints: login, register, forgot-password, reset-password)
3. `checkRateLimit()` — apply rate limits
4. Return 429 if rate-limited
5. Execute operation (delegate to Payload REST, or custom logic)
6. Attach `X-RateLimit-*` headers to response
7. `errorResponse()` catch-all

| Route | Methods | Features |
|---|---|---|
| `/api/tasks` | GET, POST, PATCH, DELETE, PUT, OPTIONS | Cache-aside GET, rate-limited |
| `/api/tasks/subscribe` | GET | SSE stream, rate-limited |
| `/api/notifications` | GET, POST, PATCH, DELETE, PUT, OPTIONS | Same pattern |
| `/api/users` | GET, POST, PATCH, DELETE, PUT, OPTIONS | Public route exceptions |
| `/api/monitoring/queue` | GET | Admin-only, returns queue metrics |

---

## Authentication

Built on Payload CMS auth (`collections/Users.ts` with `auth: true`).

- `authenticateRequest(request)` — calls `payload.auth()`, returns `{ payload, user }`
- 401 → `unauthorizedResponse()`, 403 → `forbiddenResponse()`
- Three roles: `admin`, `manager`, `user` — enforced at collection-level and route-level

---

## Error Handling

**File:** `lib/errors.ts`

| Class | Status | Code |
|---|---|---|
| `AppError` | 500 | `INTERNAL_ERROR` |
| `AuthError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `RateLimitError` | 429 | `RATE_LIMIT_EXCEEDED` |
| `ValidationError` | 400 | `VALIDATION_ERROR` |

All have `toJSON()` for consistent API responses. `errorResponse()` in api-helpers handles AppError instances, duck-typed errors, and plain errors — logs 500+ errors.

---

## Logging

**File:** `lib/logger.ts`

Pino logger. Pretty-printed in dev, JSON with level labels in production. Redacts sensitive fields (auth headers, cookies, passwords, secrets). Configurable via `LOG_LEVEL` env var. `childLogger(bindings)` for scoped context.

---

## Collections (12 total)

| Collection | Auth | Key features |
|---|---|---|
| Users | Yes | Roles (admin/manager/user), self-relation manager, `fullName` computed field |
| Tasks | No | Status workflow (pending→in-progress→review→completed), status history, team mapping, auto-assign, SSE integration |
| Notifications | No | Read tracking, queue-backed creation |
| Pages | No | Block-based layout (Hero, Content, CTA, FAQ) |
| Media | No | Image upload |
| Documents | No | PDF upload |
| Videos | No | Video upload |
| Products | No | Admin-only CRUD |
| Categories | No | Admin-only CRUD |
| ContactSubmissions | No | Public create |
| Subscriptions | No | Plan tracking |
| Team | No | Team member profiles |

---

## Frontend

- **Tasks page** — sidebar list + detail view with SSE live updates, image/PDF/video display, toast notifications
- **Notifications page** — list with mark-as-read, type-based styling (info/success/warning/error)
- **CMS pages** — dynamic page rendering with block components (Hero, Content, CTA, FAQ accordion)
- **Error boundary** — global `error.tsx` + `not-found.tsx`

---

## CI/CD (GitHub Actions)

**File:** `.github/workflows/ci-cd.yml`

4 jobs on push/PR to `main`:

1. **lint-and-test** — `npm ci`, `npm run lint`, `npm run test:coverage` (90% threshold) with Redis service container
2. **e2e** — Playwright tests with Redis
3. **build** — Next.js build + optional Docker
4. **deploy** — placeholder (main only, needs lint-and-test + e2e + build)

**Dependabot:** Weekly Monday updates for npm + GitHub Actions, grouped by dependency type, max 5 open PRs.

---

## Testing

**Unit (Vitest):** 18 test files, 261 tests across library modules and API routes. Coverage threshold: 90%.

**E2E (Playwright):** 6 spec files — tests all API routes return 401 when unauthenticated, rate limit header absence on unauth requests.

**Scripts:** `npm run test:coverage`, `npm run test:e2e`
