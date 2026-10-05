'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { baseApi, TagType } from '@/services/api/baseApi'
import { REALTIME_TOPICS, RealtimeMessage } from '@/services/realtime/topics'

type Handler = (message: RealtimeMessage) => void

interface RealtimeContextValue {
  subscribe: (topic: string, handler: Handler) => () => void
}

const RealtimeContext = createContext<RealtimeContextValue>({ subscribe: () => () => undefined })

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

/**
 * One EventSource for the whole app. Incoming events invalidate the cached
 * data their topic maps to, then fan out to any `useRealtime` subscribers.
 */
export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch()
  const token = useAppSelector((state) => state.auth?.accessToken)
  const handlers = useRef(new Map<string, Set<Handler>>())

  const subscribe = useCallback((topic: string, handler: Handler) => {
    const set = handlers.current.get(topic) ?? new Set<Handler>()
    set.add(handler)
    handlers.current.set(topic, set)
    return () => {
      set.delete(handler)
    }
  }, [])

  useEffect(() => {
    if (!token) return

    const source = new EventSource(`${API_BASE_URL}/realtime/stream?topics=${Object.keys(REALTIME_TOPICS).join(',')}&token=${encodeURIComponent(token)}`)
    const allTags = [...new Set(Object.values(REALTIME_TOPICS).flat())] as TagType[]
    let dropped = false

    source.onopen = () => {
      // Anything emitted while we were disconnected is missed; refetch to catch up.
      if (dropped) dispatch(baseApi.util.invalidateTags(allTags))
      dropped = false
    }
    source.onerror = () => {
      dropped = true
    }

    const listeners = Object.entries(REALTIME_TOPICS).map(([topic, tags]) => {
      const listener = (event: Event) => {
        let message: RealtimeMessage
        try {
          message = JSON.parse((event as MessageEvent).data)
        } catch {
          return
        }
        if (tags.length) dispatch(baseApi.util.invalidateTags(tags))
        handlers.current.get(topic)?.forEach((handler) => handler(message))
      }
      source.addEventListener(topic, listener)
      return [topic, listener] as const
    })

    return () => {
      listeners.forEach(([topic, listener]) => source.removeEventListener(topic, listener))
      source.close()
    }
  }, [token, dispatch])

  const value = useMemo(() => ({ subscribe }), [subscribe])
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

/** Run a callback for every event on a topic while the component is mounted. */
export function useRealtime(topic: string, handler: Handler): void {
  const { subscribe } = useContext(RealtimeContext)
  const latest = useRef(handler)
  latest.current = handler
  useEffect(() => subscribe(topic, (message) => latest.current(message)), [subscribe, topic])
}
