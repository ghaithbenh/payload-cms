# Payload CMS + Next.js App

A [Payload CMS](https://payloadcms.com) backend with a Next.js frontend.

## Getting Started

```bash
npm install
npm run dev
```



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
```
