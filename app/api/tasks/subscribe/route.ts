import { authenticateRequest, checkRateLimit, unauthorizedResponse } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
import type { User, Task } from '@/payload-types'
import type { Connection } from 'mongoose'

export async function GET(request: Request) {
  try {
    const { payload, user } = await authenticateRequest(request)

    if (!user) {
      return unauthorizedResponse()
    }

    const { headers: rateLimitHeaders, response: rateLimitResponse } = await checkRateLimit(request, { prefix: 'tasks:subscribe', role: (user as User).role })
    if (rateLimitResponse) return rateLimitResponse

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        let closed = false

        const send = (data: Record<string, unknown>) => {
          if (closed) return
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
          } catch (err) {
            logger.error({ err }, 'Stream enqueue error')
          }
        }

        send({ type: 'connected', userId: (user as User).id })

        const heartbeat = setInterval(() => send({ type: 'ping' }), 15000)

        const cleanup = () => {
          if (closed) return
          closed = true
          clearInterval(heartbeat)
          try { controller.close() } catch { /* ignore */ }
        }

        let pollTimer: ReturnType<typeof setInterval> | null = null

        const startPolling = () => {
          const knownIds = new Set<string>()
          let busy = false

          const poll = async () => {
            if (closed || busy) return
            busy = true
            try {
              const result = await payload.find({
                collection: 'tasks',
                where: { assignedTo: { equals: (user as User).id } },
                depth: 2,
                limit: 100,
                sort: '-updatedAt',
              })

              const docs = result.docs as Task[] || []
              const incoming = new Set(docs.map((t: any) => t.id))

              if (knownIds.size > 0) {
                for (const task of docs) {
                  if (!knownIds.has(task.id)) {
                    knownIds.add(task.id)
                    send({ type: 'task:updated', task })
                  }
                }
                for (const id of knownIds) {
                  if (!incoming.has(id)) {
                    knownIds.delete(id)
                    send({ type: 'task:deleted', id })
                  }
                }
              } else {
                docs.forEach((t: any) => knownIds.add(t.id))
              }
            } catch (err) {
              logger.error({ err }, 'Poll error')
            } finally {
              busy = false
            }
          }

          poll()
          pollTimer = setInterval(poll, 3000)
        }

        try {
          const connection = (payload.db as { connection: Connection }).connection
          const collection = connection.collection('tasks')
          const changeStream = collection.watch([], { fullDocument: 'updateLookup' })

          changeStream.on('change', async (change: any) => {
            if (closed) return
            try {
              const id = change.documentKey._id.toString()

              if (change.operationType === 'delete') {
                send({ type: 'task:deleted', id })
                return
              }

              const task = await payload.findByID({
                collection: 'tasks',
                id,
                depth: 2,
                overrideAccess: true,
                user,
              })
              if (!task) return

              const assignedId =
                typeof task.assignedTo === 'object'
                  ? (task.assignedTo as User)?.id
                  : task.assignedTo

              if (assignedId !== (user as User).id) return

              send({ type: 'task:updated', task })
            } catch (err) {
              logger.error({ err }, 'Change stream error')
            }
          })

          changeStream.on('error', () => {
            if (!closed) startPolling()
          })

          request.signal.addEventListener('abort', () => {
            try { changeStream.close() } catch (err) {
              logger.error({ err }, 'Close error')
            }
          })
        } catch {
          startPolling()
        }

        request.signal.addEventListener('abort', cleanup)
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
        ...rateLimitHeaders,
      },
    })
  } catch (err) {
    return unauthorizedResponse()
  }
}
