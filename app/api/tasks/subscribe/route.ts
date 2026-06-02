import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: Request) {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const { user } = await payload.auth({ headers: request.headers })
  if (!user) {
    console.log('[SSE] Unauthorized subscription attempt blocked')
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()
  const userId = user.id
  console.log(`[SSE] Client connected. User ID: ${userId}`)

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false

      const safeEnqueue = (message: string) => {
        if (isClosed) return
        try {
          controller.enqueue(encoder.encode(message))
        } catch (err) {
          console.error('[SSE] Failed to enqueue message:', err)
          cleanup()
        }
      }

      // 1. Send initial connection status
      safeEnqueue(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`)

      let changeStream: any = null

      // 2. Setup Keep-alive/Heartbeat Ping every 15s
      const heartbeatInterval = setInterval(() => {
        console.log(`[SSE] Sending ping to client: ${userId}`)
        safeEnqueue(`data: ${JSON.stringify({ type: 'ping' })}\n\n`)
      }, 15000)

      const cleanup = () => {
        if (isClosed) return
        isClosed = true
        clearInterval(heartbeatInterval)
        console.log(`[SSE] Cleaning up connection for user: ${userId}`)
        try {
          if (changeStream) {
            changeStream.close()
          }
        } catch (err) {
          console.error('[SSE] Error closing change stream:', err)
        }
        try {
          controller.close()
        } catch {}
      }

      try {
        const connection = (payload.db as any).connection
        const collection = connection.collection('tasks')

        // Watch the whole collection to catch deletes, updates, and inserts without ObjectId casting issues
        changeStream = collection.watch([], { fullDocument: 'updateLookup' })
        console.log(`[SSE] Started watching MongoDB tasks collection for user: ${userId}`)

        changeStream.on('change', async (change: any) => {
          if (isClosed) return

          console.log(`[SSE] MongoDB Event detected: ${change.operationType} for ID: ${change.documentKey._id}`)

          try {
            const id =
              typeof change.documentKey._id === 'object'
                ? change.documentKey._id.toString()
                : change.documentKey._id

            if (change.operationType === 'delete') {
              console.log(`[SSE] Emitting task:deleted to user ${userId} for Task ID: ${id}`)
              safeEnqueue(`data: ${JSON.stringify({ type: 'task:deleted', id })}\n\n`)
              return
            }

            // Fetch the inserted/updated task
            const task = await payload.findByID({
              collection: 'tasks',
              id,
              depth: 2,
            })

            if (task) {
              const assignedId = typeof task.assignedTo === 'object' ? (task.assignedTo as any)?.id : task.assignedTo
              const isAssigned = assignedId === userId

              if (isAssigned) {
                const eventType = change.operationType === 'insert' ? 'task:created' : 'task:updated'
                console.log(`[SSE] Emitting ${eventType} to user ${userId} for Task ID: ${id}`)
                safeEnqueue(`data: ${JSON.stringify({ type: eventType, task })}\n\n`)
              } else {
                console.log(`[SSE] Task ${id} not assigned to ${userId} (assigned to: ${assignedId}). Event skipped.`)
              }
            }
          } catch (err) {
            console.error('[SSE] Event dispatch error:', err)
          }
        })

        changeStream.on('error', (err: any) => {
          console.error('[SSE] MongoDB change stream error:', err)
          cleanup()
        })

        request.signal.addEventListener('abort', () => {
          cleanup()
        })
      } catch (err) {
        console.error('[SSE] Failed to setup MongoDB change stream:', err)
        cleanup()
      }
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
