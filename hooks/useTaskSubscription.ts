'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed'
  assignedTo?: string | { id: string } | null
  dueDate?: string | null
  subscribed?: string | null
  taskPic?: { url: string } | null
  taskDoc?: { url: string } | null
  taskVideo?: { url: string } | null
  updatedAt: string
  createdAt: string
}

interface SSEEvent {
  type: 'connected' | 'task:created' | 'task:updated' | 'task:deleted' | 'ping'
  userId?: string
  task?: Task
  id?: string
}

export interface ToastMessage {
  id: number
  message: string
  type: 'success' | 'info' | 'error'
}

export function useTaskSubscription() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const esRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectDelayRef = useRef<number>(1000) // Initial delay of 1s
  const toastIdRef = useRef<number>(0)

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error') => {
    const id = ++toastIdRef.current
    setToast({ id, message, type })
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current))
    }, 4000)
  }, [])

  const fetchInitial = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      if (!res.ok) throw new Error('Network response not ok')
      const data = await res.json()

      // Deduplicate tasks on initial fetch
      setTasks((prev) => {
        const fetchedTasks: Task[] = data.docs || []
        const taskMap = new Map<string, Task>()
        fetchedTasks.forEach((t) => taskMap.set(t.id, t))
        prev.forEach((t) => {
          if (!taskMap.has(t.id)) {
            taskMap.set(t.id, t)
          }
        })
        return Array.from(taskMap.values())
      })
      setError(null)
    } catch (err) {
      console.error('[SSE] Failed to load initial tasks:', err)
      setError('Failed to load tasks')
    }
  }, [])

  const connectSSE = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
    }

    const es = new EventSource('/api/tasks/subscribe')
    esRef.current = es

    es.onopen = () => {
      console.log('[SSE Client] Connection opened')
      setConnected(true)
      setError(null)
      reconnectDelayRef.current = 1000
      setLastUpdate(new Date())
      fetchInitial()
    }

    es.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data)
        console.log('[SSE Client] Event received:', data.type, data)

        switch (data.type) {
          case 'connected':
            setConnected(true)
            setError(null)
            break

          case 'ping':
            // Heartbeat ping received, keep alive
            break

          case 'task:created':
            if (data.task) {
              setTasks((prev) => {
                const alreadyExists = prev.some((t) => t.id === data.task!.id)
                if (alreadyExists) return prev
                return [data.task!, ...prev]
              })
              setLastUpdate(new Date())
              showToast(`New task created: "${data.task.title}"`, 'success')
            }
            break

          case 'task:updated':
            if (data.task) {
              setTasks((prev) => {
                const idx = prev.findIndex((t) => t.id === data.task!.id)
                if (idx !== -1) {
                  const next = [...prev]
                  next[idx] = data.task!
                  return next
                }
                return [data.task!, ...prev]
              })
              setLastUpdate(new Date())
              showToast(`Task updated: "${data.task.title}"`, 'info')
            }
            break

          case 'task:deleted':
            if (data.id) {
              setTasks((prev) => {
                const targetTask = prev.find((t) => t.id === data.id)
                if (targetTask) {
                  showToast(`Task deleted: "${targetTask.title}"`, 'error')
                }
                return prev.filter((t) => t.id !== data.id)
              })
              setLastUpdate(new Date())
            }
            break
        }
      } catch (err) {
        console.error('[SSE Client] Failed to parse event data:', err)
      }
    }

    es.onerror = (err) => {
      console.error('[SSE Client] EventSource error:', err)
      setConnected(false)
      es.close()

      const nextDelay = Math.min(reconnectDelayRef.current * 2, 16000)
      reconnectDelayRef.current = nextDelay
      setError(`Reconnecting in ${(nextDelay / 1000).toFixed(0)}s...`)

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(`[SSE Client] Attempting reconnect after ${nextDelay}ms`)
        connectSSE()
      }, nextDelay)
    }
  }, [fetchInitial, showToast])

  useEffect(() => {
    connectSSE()

    return () => {
      if (esRef.current) {
        esRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connectSSE])

  return { tasks, connected, error, lastUpdate, toast }
}


