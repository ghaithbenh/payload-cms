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
  type:
    | 'connected'
    | 'auth_error'
    | 'ping'
    | 'task:created'
    | 'task:updated'
    | 'task:deleted'
  userId?: string
  task?: Task
  id?: string
  message?: string
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
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const delayRef = useRef(1000)
  const toastIdRef = useRef(0)

  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'error') => {
      const id = ++toastIdRef.current
      setToast({ id, message, type })
      setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current))
      }, 4000)
    },
    [],
  )

  const fetchInitial = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      if (!res.ok) return
      const data = await res.json()
      setTasks(data.docs || [])
      setError(null)
    } catch {
      // silent — SSE will pick up changes
    }
  }, [])

  const connect = useCallback(
    function connect() {
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }

      const es = new EventSource('/api/tasks/subscribe', { withCredentials: true })
      esRef.current = es

      let authFailed = false

      es.onopen = () => {
        delayRef.current = 1000
      }

      es.onmessage = (event) => {
        try {
          const data: SSEEvent = JSON.parse(event.data)

          switch (data.type) {
            case 'connected':
              setConnected(true)
              setError(null)
              fetchInitial()
              break

            case 'auth_error':
              authFailed = true
              setConnected(false)
              setError(data.message || 'Authentication required')
              es.close()
              break

            case 'ping':
              break

            case 'task:created':
              if (data.task) {
                setTasks((prev) => {
                  const exists = prev.some((t) => t.id === data.task!.id)
                  if (exists) return prev
                  return [data.task!, ...prev]
                })
                setLastUpdate(new Date())
                showToast(`New task: "${data.task.title}"`, 'success')
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
                showToast(`Updated: "${data.task.title}"`, 'info')
              }
              break

            case 'task:deleted':
              if (data.id) {
                setTasks((prev) => {
                  const target = prev.find((t) => t.id === data.id)
                  if (target) showToast(`Deleted: "${target.title}"`, 'error')
                  return prev.filter((t) => t.id !== data.id)
                })
                setLastUpdate(new Date())
              }
              break
          }
        } catch {
          // ignore malformed events
        }
      }

      es.onerror = () => {
        setConnected(false)
        es.close()
        esRef.current = null

        if (authFailed) return

        const delay = delayRef.current
        delayRef.current = Math.min(delay * 2, 16000)
        setError(`Reconnecting in ${(delay / 1000).toFixed(0)}s...`)

        reconnectRef.current = setTimeout(connect, delay)
      }
    },
    [fetchInitial, showToast],
  )

  useEffect(() => {
    connect()
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (esRef.current) esRef.current.close()
    }
  }, [connect])

  return { tasks, connected, error, lastUpdate, toast }
}
