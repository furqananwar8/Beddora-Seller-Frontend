import { baseApi } from './baseApi'
import { Page, unwrap } from './finance.api'

export type JobStateName = 'active' | 'waiting' | 'delayed' | 'failed' | 'completed'
export type QueueCounts = Record<JobStateName, number>

export interface TraceStep {
  name: string
  state: 'wait' | 'run' | 'done' | 'fail'
  count?: number
  total?: number
  unit?: string
  tookMs?: number
}

/** What a job reports as it runs: its steps, how far it is, and the file and line of the code that reported it. */
export interface JobTrace {
  kind: 'trace'
  pct: number
  step: number
  steps: TraceStep[]
  file: string
  line: number
  updatedAt: number
}

export interface JobFailure {
  type: string
  label: string
  plain: string
  retryable: boolean
  message: string
}

export interface JobView {
  id: string
  queue: string
  name: string
  state: JobStateName | 'unknown'
  pct: number
  trace: JobTrace | null
  attemptsMade: number
  maxAttempts: number
  createdAt: number
  startedAt: number | null
  finishedAt: number | null
  failure: JobFailure | null
  data: unknown
}

export interface JobDetail extends JobView {
  logs: string[]
  redisKeys: string[]
  stacktrace: string[]
}

export interface QueueSummary {
  name: string
  group: string
  what: string
  steps: string[]
  paused: boolean
  counts: QueueCounts
}

export interface ThroughputPoint {
  t: number
  completed: number
  failed: number
}

export interface JobsOverview {
  queues: QueueSummary[]
  throughput: ThroughputPoint[]
}

export interface ScheduleView {
  name: string
  source: 'bullmq' | 'cron'
  queue?: string
  schedule: string
  every: string
  what: string
  nextRunAt: number | null
}

export interface RedisStats {
  version: string
  usedBytes: number
  maxBytes: number
  clients: number
  opsPerSec: number
  hitRate: number | null
  evicted: number
  expired: number
  uptimeSec: number
  keys: number
}

/** `expiresAt` (ms since 1970) is added here from `expiresInMs`, so a countdown can run without asking again. */
export interface SessionRow {
  id: string
  key: string
  userId: number | null
  name: string
  email: string | null
  device: string
  ip: string | null
  loggedInAt: string | null
  lastSeenAt: string | null
  expiresInMs: number
  expiresAt: number
}

export interface ScanLockRow {
  key: string
  scenario: string
  sourceId: string
  userId: number | null
  name: string
  expiresInMs: number
  expiresAt: number
}

export interface TokenRow {
  key: string
  label: string
  what: string
  expiresInMs: number | null
  renewing: boolean
  expiresAt: number | null
}

export interface TrafficSnapshot {
  visitors: number
  requests: number
  busiest: Array<{ ip: string; requests: number; resetsInMs: number }>
}

export interface RedisOverview {
  stats: RedisStats
  sessions: SessionRow[]
  locks: ScanLockRow[]
  tokens: TokenRow[]
  traffic: TrafficSnapshot
}

export interface RedisFamily {
  id: string
  pattern: string
  type: 'STRING' | 'HASH' | 'LIST' | 'ZSET' | 'SET' | 'STREAM' | 'PUB/SUB'
  usedBy: string
  lives: string
  purpose: string
  shownAs: string
  fields: Array<{ name: string; meaning: string }>
  count: number | null
  capped: boolean
  sampleTtlMs: number | null
}

export interface QueueJobsParams {
  queue: string
  status: JobStateName
  page: number
  limit: number
}

const PATH = '/system/monitor'

export const monitorTags = {
  jobsOverview: { type: 'SystemMonitor' as const, id: 'JOBS' },
  active: { type: 'SystemMonitor' as const, id: 'ACTIVE' },
  failed: { type: 'SystemMonitor' as const, id: 'FAILED' },
  list: { type: 'SystemMonitor' as const, id: 'LIST' },
  redis: { type: 'SystemMonitor' as const, id: 'REDIS' },
}

const now = () => Date.now()
export const stampRedis = (overview: RedisOverview): RedisOverview => ({
  ...overview,
  sessions: overview.sessions.map((row) => ({ ...row, expiresAt: now() + row.expiresInMs })),
  locks: overview.locks.map((row) => ({ ...row, expiresAt: now() + row.expiresInMs })),
  tokens: overview.tokens.map((row) => ({ ...row, expiresAt: row.expiresInMs === null ? null : now() + row.expiresInMs })),
})

export const systemMonitorApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getMonitorAccess: b.query<{ allowed: boolean }, void>({ query: () => `${PATH}/access`, transformResponse: unwrap, keepUnusedDataFor: 300 }),
    getJobsOverview: b.query<JobsOverview, void>({ query: () => `${PATH}/jobs/overview`, transformResponse: unwrap, providesTags: [monitorTags.jobsOverview] }),
    getActiveJobs: b.query<JobView[], void>({ query: () => `${PATH}/jobs/active`, transformResponse: unwrap, providesTags: [monitorTags.active] }),
    getFailedJobs: b.query<JobView[], void>({ query: () => `${PATH}/jobs/failed`, transformResponse: unwrap, providesTags: [monitorTags.failed] }),
    getSchedules: b.query<ScheduleView[], void>({ query: () => `${PATH}/jobs/schedules`, transformResponse: unwrap, keepUnusedDataFor: 30 }),
    getQueueJobs: b.query<Page<JobView>, QueueJobsParams>({
      query: ({ queue, ...params }) => ({ url: `${PATH}/jobs/queues/${encodeURIComponent(queue)}/jobs`, params }),
      providesTags: [monitorTags.list],
    }),
    getJobDetail: b.query<JobDetail, { queue: string; id: string }>({
      query: ({ queue, id }) => `${PATH}/jobs/queues/${encodeURIComponent(queue)}/jobs/${encodeURIComponent(id)}`,
      transformResponse: unwrap,
      keepUnusedDataFor: 5,
    }),
    retryJob: b.mutation<{ ok: true }, { queue: string; id: string }>({
      query: ({ queue, id }) => ({ url: `${PATH}/jobs/queues/${encodeURIComponent(queue)}/jobs/${encodeURIComponent(id)}/retry`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: [monitorTags.failed, monitorTags.list],
    }),
    promoteJob: b.mutation<{ ok: true }, { queue: string; id: string }>({
      query: ({ queue, id }) => ({ url: `${PATH}/jobs/queues/${encodeURIComponent(queue)}/jobs/${encodeURIComponent(id)}/promote`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: [monitorTags.list],
    }),
    removeJob: b.mutation<{ ok: true }, { queue: string; id: string }>({
      query: ({ queue, id }) => ({ url: `${PATH}/jobs/queues/${encodeURIComponent(queue)}/jobs/${encodeURIComponent(id)}`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: [monitorTags.failed, monitorTags.list],
    }),
    pauseQueue: b.mutation<{ ok: true }, { queue: string; paused: boolean }>({
      query: ({ queue, paused }) => ({ url: `${PATH}/jobs/queues/${encodeURIComponent(queue)}/${paused ? 'pause' : 'resume'}`, method: 'POST' }),
      transformResponse: unwrap,
    }),
    cleanQueue: b.mutation<{ removed: number }, { queue: string }>({
      query: ({ queue }) => ({ url: `${PATH}/jobs/queues/${encodeURIComponent(queue)}/clean`, method: 'POST' }),
      transformResponse: unwrap,
      invalidatesTags: [monitorTags.jobsOverview, monitorTags.list],
    }),
    retryAllJobs: b.mutation<{ retried: number; skipped: number }, { queue?: string }>({
      query: (body) => ({ url: `${PATH}/jobs/retry-all`, method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: [monitorTags.failed, monitorTags.list, monitorTags.jobsOverview],
    }),
    getRedisOverview: b.query<RedisOverview, void>({ query: () => `${PATH}/redis/overview`, transformResponse: (response: { data: RedisOverview }) => stampRedis(response.data), providesTags: [monitorTags.redis] }),
    getRedisFamilies: b.query<RedisFamily[], void>({ query: () => `${PATH}/redis/families`, transformResponse: unwrap, keepUnusedDataFor: 30 }),
  }),
})

export const {
  useGetMonitorAccessQuery,
  useGetJobsOverviewQuery,
  useGetActiveJobsQuery,
  useGetFailedJobsQuery,
  useGetSchedulesQuery,
  useGetQueueJobsQuery,
  useGetJobDetailQuery,
  useRetryJobMutation,
  usePromoteJobMutation,
  useRemoveJobMutation,
  usePauseQueueMutation,
  useCleanQueueMutation,
  useRetryAllJobsMutation,
  useGetRedisOverviewQuery,
  useGetRedisFamiliesQuery,
} = systemMonitorApi
