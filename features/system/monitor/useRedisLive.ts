'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRealtime } from '@/components/realtime/RealtimeProvider'
import { systemMonitorApi, type RedisStats, type ScanLockRow, type SessionRow, type TokenRow, type TrafficSnapshot } from '@/services/api/systemMonitor.api'
import { useAppDispatch } from '@/store/hooks'
import { pushFeed, type FeedItem } from './monitorMeta'

/** A row that ended stays this long, highlighted, before it leaves the table. */
const LEAVE_MS = 1400
const HISTORY = 40

type Ids = ReadonlySet<string>
const without = (ids: Ids, key: string): Ids => {
  const next = new Set(ids)
  next.delete(key)
  return next
}
const keep = (values: number[], value: number) => [...values, value].slice(-HISTORY)

export interface RedisLive {
  feed: FeedItem[]
  /** Rows that just ended: shown red, then removed. */
  ended: Ids
  /** Rows that just appeared. */
  fresh: Ids
  /** Recent readings, newest last, for the small charts. */
  history: { ops: number[]; requests: number[]; memory: number[] }
}

/**
 * Keeps System > Redis current while it is open, from the realtime topic `system.redis`: health numbers, who logs in and
 * out, who starts and stops scanning, token renewals and traffic. A person who logs out turns red in the table and
 * leaves it a moment later. Must be rendered inside `RealtimeProvider`.
 */
export function useRedisLive(): RedisLive {
  const dispatch = useAppDispatch()
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [ended, setEnded] = useState<Ids>(new Set())
  const [fresh, setFresh] = useState<Ids>(new Set())
  const [history, setHistory] = useState<RedisLive['history']>({ ops: [], requests: [], memory: [] })
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  const later = useCallback((run: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      run()
    }, ms)
    timers.current.add(timer)
  }, [])

  const say = useCallback((type: string, kind: string, tone: FeedItem['tone'], text: string) => setFeed((items) => pushFeed(items, { at: Date.now(), kind, tone, text, topic: 'system.redis', type })), [])

  const flashNew = useCallback(
    (key: string) => {
      setFresh((ids) => new Set(ids).add(key))
      later(() => setFresh((ids) => without(ids, key)), 2000)
    },
    [later]
  )

  useRealtime('system.redis', (message) => {
    const data = message.data as Record<string, unknown>

    if (message.type === 'stats.updated') {
      const stats = data.stats as RedisStats
      const traffic = data.traffic as TrafficSnapshot
      dispatch(
        systemMonitorApi.util.updateQueryData('getRedisOverview', undefined, (draft) => {
          draft.stats = stats
          draft.traffic = traffic
        })
      )
      setHistory((h) => ({ ops: keep(h.ops, stats.opsPerSec), requests: keep(h.requests, traffic.requests), memory: keep(h.memory, stats.usedBytes) }))
      return
    }

    if (message.type === 'session.created') {
      const session = { ...(data.session as SessionRow), expiresAt: Date.now() + (data.session as SessionRow).expiresInMs }
      dispatch(
        systemMonitorApi.util.updateQueryData('getRedisOverview', undefined, (draft) => {
          if (!draft.sessions.some((row) => row.key === session.key)) draft.sessions.unshift(session)
        })
      )
      flashNew(session.key)
      say(message.type, 'Login', 'success', `${session.name} logged in from ${session.device}.`)
      return
    }

    if (message.type === 'session.ended') {
      const { key, name, reason } = data as { key: string; name: string; reason: 'logout' | 'expired' }
      setEnded((ids) => new Set(ids).add(key))
      later(() => {
        dispatch(
          systemMonitorApi.util.updateQueryData('getRedisOverview', undefined, (draft) => {
            draft.sessions = draft.sessions.filter((row) => row.key !== key)
          })
        )
        setEnded((ids) => without(ids, key))
      }, LEAVE_MS)
      say(message.type, reason === 'expired' ? 'Timed out' : 'Logout', 'danger', `${name} ${reason === 'expired' ? 'was logged out because the session timed out' : 'logged out'}. The session was deleted from Redis.`)
      return
    }

    if (message.type === 'scan.started') {
      const lock = { ...(data.lock as ScanLockRow), expiresAt: Date.now() + (data.lock as ScanLockRow).expiresInMs }
      dispatch(
        systemMonitorApi.util.updateQueryData('getRedisOverview', undefined, (draft) => {
          if (!draft.locks.some((row) => row.key === lock.key)) draft.locks.unshift(lock)
        })
      )
      flashNew(lock.key)
      say(message.type, 'Scanning', 'info', `${lock.name} started scanning ${lock.scenario} ${lock.sourceId}. Others are locked out of it.`)
      return
    }

    if (message.type === 'scan.ended') {
      const { key, name } = data as { key: string; name: string }
      setEnded((ids) => new Set(ids).add(key))
      later(() => {
        dispatch(
          systemMonitorApi.util.updateQueryData('getRedisOverview', undefined, (draft) => {
            draft.locks = draft.locks.filter((row) => row.key !== key)
          })
        )
        setEnded((ids) => without(ids, key))
      }, 600)
      say(message.type, 'Scan done', 'neutral', `${name} finished scanning. The lock was released.`)
      return
    }

    if (message.type === 'key.deleted') {
      const { family, key } = data as { family: string; key: string }
      // Every open screen drops the entry at once, and the key counts catch up
      dispatch(
        systemMonitorApi.util.updateQueryData('getKeySamples', family, (draft) => {
          const at = draft.findIndex((sample) => sample.key === key)
          if (at >= 0) draft.splice(at, 1)
        })
      )
      dispatch(systemMonitorApi.util.invalidateTags([{ type: 'SystemMonitor', id: 'FAMILIES' }]))
      say(message.type, 'Key deleted', 'danger', `${key} was deleted from Redis.`)
      return
    }

    if (message.type === 'token.renewed') {
      const token = { ...(data.token as TokenRow), expiresAt: (data.token as TokenRow).expiresInMs === null ? null : Date.now() + ((data.token as TokenRow).expiresInMs ?? 0) }
      dispatch(
        systemMonitorApi.util.updateQueryData('getRedisOverview', undefined, (draft) => {
          const at = draft.tokens.findIndex((row) => row.key === token.key)
          if (at >= 0) draft.tokens[at] = token
          else draft.tokens.push(token)
        })
      )
      flashNew(token.key)
      say(message.type, 'Renewed', 'info', `The access pass for ${token.label} was renewed automatically.`)
    }
  })

  return { feed, ended, fresh, history }
}
