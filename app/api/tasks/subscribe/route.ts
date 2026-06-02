import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: Request) {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers: request.headers })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false

      const send = (data: Record<string, unknown>) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {}
      }

      if (!user) {
        send({ type: 'auth_error', message: 'Not authenticated. Please log in to the admin panel.' })
        setTimeout(() => { if (!closed) { closed = true; controller.close() } }, 5000)
        return
      }

      send({ type: 'connected', userId: user.id })

      const heartbeat = setInterval(() => send({ type: 'ping' }), 15000)

      const cleanup = () => {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        try { controller.close() } catch {}
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
              where: { assignedTo: { equals: user.id } },
              depth: 2,
              limit: 100,
              sort: '-updatedAt',
            })

            const docs = result.docs as any[] || []
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
          } catch {} finally {
            busy = false
          }
        }

        poll()
        pollTimer = setInterval(poll, 3000)
      }

      try {
        const connection = (payload.db as any).connection
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
                ? (task.assignedTo as any)?.id
                : task.assignedTo

            if (assignedId !== user.id) return

            send({ type: 'task:updated', task })
          } catch {}
        })

        changeStream.on('error', () => {
          if (!closed) startPolling()
        })

        request.signal.addEventListener('abort', () => {
          try { changeStream.close() } catch {}
          cleanup()
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
    },
  })
}
