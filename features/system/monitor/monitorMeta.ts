import { useEffect, useState } from 'react'
import type { StatusTone } from '@/components/status-badge/StatusBadge'
import type { JobStateName, QueueSummary } from '@/services/api/systemMonitor.api'

export const MONITOR_ROUTE = '/dashboard/system/monitor'

/** Re-renders every `ms`, so countdowns and "x ago" labels keep moving. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(timer)
  }, [ms])
  return now
}

export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ${minutes % 60} min`
  return `${Math.floor(hours / 24)} d ${hours % 24} h`
}

/** "12 min ago" for a time in the past. */
export const ago = (timestamp: number, now: number): string => `${formatDuration(now - timestamp)} ago`

export const formatBytes = (bytes: number): string => (bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`)

export const formatCount = (value: number): string => value.toLocaleString('en-CA')

export type QueueHealth = 'paused' | 'failing' | 'warning' | 'working' | 'healthy'

/** One word for how a queue is doing, from its counts. */
export function queueHealth(queue: QueueSummary): QueueHealth {
  if (queue.paused) return 'paused'
  if (queue.counts.failed >= 5) return 'failing'
  if (queue.counts.failed > 0) return 'warning'
  if (queue.counts.active > 0) return 'working'
  return 'healthy'
}

export const HEALTH_LABEL: Record<QueueHealth, string> = { paused: 'Paused', failing: 'Failing', warning: 'Some failures', working: 'Working', healthy: 'Healthy' }
export const HEALTH_TONE: Record<QueueHealth, StatusTone> = { paused: 'neutral', failing: 'danger', warning: 'warning', working: 'info', healthy: 'success' }
export const HEALTH_TILE: Record<QueueHealth, string> = {
  paused: 'border-border bg-secondary-100',
  failing: 'border-danger-200 bg-danger-50',
  warning: 'border-warning-200 bg-warning-50',
  working: 'border-sky-200 bg-sky-50',
  healthy: 'border-success-200 bg-success-50',
}

export const STATE_LABEL: Record<JobStateName, string> = { active: 'Running', waiting: 'Waiting', delayed: 'Delayed', failed: 'Failed', completed: 'Done' }
export const STATE_TONE: Record<JobStateName, StatusTone> = { active: 'info', waiting: 'neutral', delayed: 'warning', failed: 'danger', completed: 'success' }

/** First sentence of a description, for compact rows. */
export const firstSentence = (text: string): string => text.split(/(?<=\.)\s/)[0] ?? text

export interface FeedItem {
  id: number
  at: number
  kind: string
  tone: StatusTone
  text: string
  topic: string
  type: string
}

/** Keeps the newest `max` entries, newest first. */
export const pushFeed = (feed: FeedItem[], item: Omit<FeedItem, 'id'>, max = 40): FeedItem[] => [{ ...item, id: (feed[0]?.id ?? 0) + 1 }, ...feed].slice(0, max)
