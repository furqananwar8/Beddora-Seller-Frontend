'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRealtime } from '@/components/realtime/RealtimeProvider'
import { monitorTags, systemMonitorApi, type JobTrace, type JobView, type QueueCounts } from '@/services/api/systemMonitor.api'
import { useAppDispatch } from '@/store/hooks'
import { pushFeed, type FeedItem } from './monitorMeta'

/** How long a finished row stays before it slides away, and how long a new row stays highlighted. */
const LEAVE_MS = 450
/** A burst of finished jobs refreshes the lists once, after it has been quiet this long. */
const QUIET_MS = 1500

type Ids = ReadonlySet<string>
const keyOf = (queue: string, id: string) => `${queue}:${id}`
const without = (ids: Ids, key: string): Ids => {
  const next = new Set(ids)
  next.delete(key)
  return next
}

interface Events {
  queue: string
  id: string
}

/**
 * Keeps System > Jobs current while it is open, from the realtime topic `system.jobs`: counts, running jobs and their
 * progress, failures, and the log lines of the job that is open are patched into the cached API data (no refetch), and a
 * plain-words activity feed is built. Returns the ids of rows that are leaving, to animate them out.
 * Must be rendered inside `RealtimeProvider`.
 * shortcut: events missed while the connection was down are not caught up; the provider refetches on reconnect.
 */
export function useJobsLive(): { feed: FeedItem[]; leaving: Ids; fresh: Ids } {
  const dispatch = useAppDispatch()
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [leaving, setLeaving] = useState<Ids>(new Set())
  const [fresh, setFresh] = useState<Ids>(new Set())
  const quiet = useRef<ReturnType<typeof setTimeout>>()
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const pending = timers.current
    return () => {
      clearTimeout(quiet.current)
      pending.forEach(clearTimeout)
    }
  }, [])

  const later = useCallback((run: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      run()
    }, ms)
    timers.current.add(timer)
  }, [])

  const mark = useCallback(
    (key: string) => {
      setFresh((ids) => new Set(ids).add(key))
      later(() => setFresh((ids) => without(ids, key)), 2000)
    },
    [later]
  )

  const settle = useCallback(() => {
    clearTimeout(quiet.current)
    quiet.current = setTimeout(() => dispatch(systemMonitorApi.util.invalidateTags([monitorTags.list])), QUIET_MS)
  }, [dispatch])

  const say = useCallback((type: string, kind: string, tone: FeedItem['tone'], text: string) => setFeed((items) => pushFeed(items, { at: Date.now(), kind, tone, text, topic: 'system.jobs', type })), [])

  const dropActive = useCallback(
    ({ queue, id }: Events) =>
      dispatch(
        systemMonitorApi.util.updateQueryData('getActiveJobs', undefined, (draft) => {
          const at = draft.findIndex((job) => job.queue === queue && job.id === id)
          if (at >= 0) draft.splice(at, 1)
        })
      ),
    [dispatch]
  )

  const dropFailed = useCallback(
    ({ queue, id }: Events) =>
      dispatch(
        systemMonitorApi.util.updateQueryData('getFailedJobs', undefined, (draft) => {
          const at = draft.findIndex((job) => job.queue === queue && job.id === id)
          if (at >= 0) draft.splice(at, 1)
        })
      ),
    [dispatch]
  )

  useRealtime('system.jobs', (message) => {
    const data = message.data as Record<string, unknown>

    if (message.type === 'queue.counts') {
      const changed = data.queues as Array<{ name: string; counts: QueueCounts }>
      let unknown = false
      dispatch(
        systemMonitorApi.util.updateQueryData('getJobsOverview', undefined, (draft) => {
          for (const item of changed) {
            const queue = draft.queues.find((entry) => entry.name === item.name)
            if (queue) queue.counts = item.counts
            else unknown = true
          }
        })
      )
      if (unknown) dispatch(systemMonitorApi.util.invalidateTags([monitorTags.jobsOverview]))
      return
    }

    if (message.type === 'queue.paused' || message.type === 'queue.resumed') {
      const queueName = data.queue as string
      dispatch(
        systemMonitorApi.util.updateQueryData('getJobsOverview', undefined, (draft) => {
          const queue = draft.queues.find((entry) => entry.name === queueName)
          if (queue) queue.paused = message.type === 'queue.paused'
        })
      )
      say(message.type, message.type === 'queue.paused' ? 'Paused' : 'Resumed', 'neutral', `Queue ${queueName} was ${message.type === 'queue.paused' ? 'paused: nothing new will start' : 'resumed'}.`)
      return
    }

    if (message.type === 'job.active') {
      const job = data.job as JobView
      dispatch(
        systemMonitorApi.util.updateQueryData('getActiveJobs', undefined, (draft) => {
          if (!draft.some((item) => item.queue === job.queue && item.id === job.id)) draft.unshift(job)
        })
      )
      mark(keyOf(job.queue, job.id))
      say(message.type, 'Started', 'info', `${job.name} started in ${job.queue}.`)
      return
    }

    if (message.type === 'job.progress') {
      const { queue, id, pct, trace } = data as unknown as Events & { pct: number; trace: JobTrace | null }
      dispatch(
        systemMonitorApi.util.updateQueryData('getActiveJobs', undefined, (draft) => {
          const job = draft.find((item) => item.queue === queue && item.id === id)
          if (job) {
            job.pct = pct
            job.trace = trace
          }
        })
      )
      dispatch(
        systemMonitorApi.util.updateQueryData('getJobDetail', { queue, id }, (draft) => {
          draft.pct = pct
          draft.trace = trace
        })
      )
      return
    }

    if (message.type === 'job.log') {
      const { queue, id, from, lines } = data as unknown as Events & { from: number; lines: string[] }
      dispatch(
        systemMonitorApi.util.updateQueryData('getJobDetail', { queue, id }, (draft) => {
          if (from <= draft.logs.length) draft.logs.splice(from, draft.logs.length - from, ...lines)
        })
      )
      return
    }

    if (message.type === 'job.completed') {
      const { queue, id } = data as unknown as Events
      setLeaving((ids) => new Set(ids).add(keyOf(queue, id)))
      later(() => {
        dropActive({ queue, id })
        setLeaving((ids) => without(ids, keyOf(queue, id)))
      }, LEAVE_MS)
      dispatch(
        systemMonitorApi.util.updateQueryData('getJobDetail', { queue, id }, (draft) => {
          draft.state = 'completed'
          draft.pct = 100
        })
      )
      say(message.type, 'Done', 'success', `A task in ${queue} finished.`)
      settle()
      return
    }

    if (message.type === 'job.failed') {
      const job = data.job as JobView
      dropActive({ queue: job.queue, id: job.id })
      if (!data.willRetry) {
        dispatch(
          systemMonitorApi.util.updateQueryData('getFailedJobs', undefined, (draft) => {
            if (!draft.some((item) => item.queue === job.queue && item.id === job.id)) draft.unshift(job)
          })
        )
        mark(keyOf(job.queue, job.id))
      }
      dispatch(
        systemMonitorApi.util.updateQueryData('getJobDetail', { queue: job.queue, id: job.id }, (draft) => {
          Object.assign(draft, job, { logs: draft.logs, redisKeys: draft.redisKeys, stacktrace: draft.stacktrace })
        })
      )
      say(message.type, data.willRetry ? 'Retrying' : 'Failed', data.willRetry ? 'warning' : 'danger', `A task in ${job.queue} ${data.willRetry ? 'hit a problem and will be tried again' : 'failed'}: ${job.failure?.label.toLowerCase() ?? 'error'}.`)
      settle()
      return
    }

    if (message.type === 'job.retried' || message.type === 'job.removed') {
      const { queue, id } = data as unknown as Events
      setLeaving((ids) => new Set(ids).add(keyOf(queue, id)))
      later(() => {
        dropFailed({ queue, id })
        setLeaving((ids) => without(ids, keyOf(queue, id)))
      }, LEAVE_MS)
      say(message.type, message.type === 'job.retried' ? 'Retry' : 'Removed', message.type === 'job.retried' ? 'info' : 'neutral', `Task #${id} in ${queue} was ${message.type === 'job.retried' ? 'put back in line' : 'removed'}.`)
      settle()
    }
  })

  return { feed, leaving, fresh }
}
