/**
 * Sync API endpoints
 * 
 * RTK Query hooks for sync status, history, and manual sync triggers
 */

import { baseApi } from './baseApi'
import type { SyncType } from '@/store/amazon.slice'

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface SyncJobStatus {
  jobId: string
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
  progress: number
  syncType: 'orders' | 'fees' | 'ppc' | 'inventory' | 'listings' | 'refunds' | 'all'
  amazonAccountId: string
  options?: {
    startDate?: string
    endDate?: string
    marketplaceIds?: string[]
    forceFullSync?: boolean
  }
  createdAt: string | null
  startedAt: string | null
  completedAt: string | null
  duration: number | null
  result?: any
  error?: string | null
  attemptsMade: number
}

export interface AccountSyncStatus {
  amazonAccountId: string
  jobs: SyncJobStatus[]
  total: number
}

export interface QueueStatistics {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  total: number
}

export interface TriggerSyncRequest {
  amazonAccountId: string
  syncType: 'orders' | 'fees' | 'ppc' | 'inventory' | 'listings' | 'refunds' | 'all'
  options?: {
    startDate?: string
    endDate?: string
    marketplaceIds?: string[]
    forceFullSync?: boolean
  }
}

export interface TriggerSyncResponse {
  success: boolean
  message: string
  data: {
    jobId: string
    status: string
    syncType: string
    amazonAccountId: string
    estimatedCompletion: string
  }
  queueMode: boolean
}

export interface SyncLog {
  id: string
  userId: string
  amazonAccountId: string
  syncType: SyncType
  status: 'success' | 'failed' | 'partial'
  recordsSynced: number
  recordsFailed: number
  errorMessage?: string
  metadata?: Record<string, any>
  startedAt: string
  completedAt?: string
  amazonAccount?: {
    id: string
    marketplace: string
    sellerId: string
  }
}

export interface RetryableJob {
  id: string
  name: string
  data: any
  failedReason?: string
  attemptsMade: number
  errorType?: string
  shouldRetry?: boolean
  failedAt: string | null
}

export interface RetryStatistics {
  totalFailed: number
  byErrorType: Record<string, number>
  byRetryStatus: {
    retryable: number
    permanent: number
  }
  averageAttempts: number
  requiresIntervention: number
}

// ============================================
// RTK QUERY ENDPOINTS
// ============================================

export const syncApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Trigger a manual sync
     */
    triggerSync: builder.mutation<TriggerSyncResponse, TriggerSyncRequest>({
      query: (body) => ({
        url: '/amazon/sync/trigger',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SyncStatus', 'SyncLogs'],
    }),

    /**
     * Get sync job status
     */
    getSyncJobStatus: builder.query<{ success: boolean; data: SyncJobStatus }, string>({
      query: (jobId) => ({
        url: `/amazon/sync/status/${jobId}`,
        method: 'GET',
      }),
      providesTags: (result, error, jobId) => [{ type: 'SyncStatus', id: jobId }],
    }),

    /**
     * Get account sync status (latest jobs)
     */
    getAccountSyncStatus: builder.query<
      { success: boolean; data: AccountSyncStatus },
      { amazonAccountId: string; limit?: number }
    >({
      query: ({ amazonAccountId, limit = 10 }) => ({
        url: `/amazon/sync/status?amazonAccountId=${amazonAccountId}&limit=${limit}`,
        method: 'GET',
      }),
      providesTags: (result, error, { amazonAccountId }) => [
        { type: 'SyncStatus', id: `account-${amazonAccountId}` },
      ],
      // Note: pollingInterval should be set when using the hook, not here
    }),

    /**
     * Get queue statistics
     */
    getQueueStatistics: builder.query<
      { success: boolean; data: Record<string, QueueStatistics> },
      void
    >({
      query: () => ({
        url: '/amazon/sync/queue-stats',
        method: 'GET',
      }),
      providesTags: ['QueueStats'],
    }),

    /**
     * Cancel a sync job
     */
    cancelSyncJob: builder.mutation<{ success: boolean; message: string }, string>({
      query: (jobId) => ({
        url: `/amazon/sync/cancel/${jobId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SyncStatus'],
    }),

    /**
     * Get sync logs
     */
    getSyncLogs: builder.query<
      { success: boolean; data: SyncLog[] },
      { amazonAccountId?: string; syncType?: string; limit?: number }
    >({
      query: ({ amazonAccountId, syncType, limit = 50 }) => {
        const params = new URLSearchParams()
        if (amazonAccountId) params.append('amazonAccountId', amazonAccountId)
        if (syncType) params.append('syncType', syncType)
        if (limit) params.append('limit', limit.toString())

        return {
          url: `/amazon/sync-logs?${params.toString()}`,
          method: 'GET',
        }
      },
      providesTags: ['SyncLogs'],
      transformResponse: (response: { success: boolean; data: SyncLog[] }) => response,
    }),

    /**
     * Get retryable failed jobs
     */
    getRetryableJobs: builder.query<
      { success: boolean; data: RetryableJob[]; count: number },
      { queueName?: string; limit?: number }
    >({
      query: ({ queueName = 'DATA_SYNC', limit = 100 }) => ({
        url: `/amazon/error-recovery/retryable?queueName=${queueName}&limit=${limit}`,
        method: 'GET',
      }),
      providesTags: ['FailedJobs'],
    }),

    /**
     * Get permanently failed jobs (dead letter queue)
     */
    getPermanentFailedJobs: builder.query<
      { success: boolean; data: RetryableJob[]; count: number },
      { queueName?: string; limit?: number }
    >({
      query: ({ queueName = 'DATA_SYNC', limit = 100 }) => ({
        url: `/amazon/error-recovery/permanent?queueName=${queueName}&limit=${limit}`,
        method: 'GET',
      }),
      providesTags: ['FailedJobs'],
    }),

    /**
     * Retry a failed job
     */
    retryJob: builder.mutation<
      { success: boolean; message: string; job: { id: string; name: string; queue: string } },
      { jobId: string; queueName?: string; delay?: number; priority?: number }
    >({
      query: ({ jobId, queueName = 'DATA_SYNC', delay, priority }) => ({
        url: `/amazon/error-recovery/retry/${jobId}`,
        method: 'POST',
        body: { queueName, delay, priority },
      }),
      invalidatesTags: ['FailedJobs', 'SyncStatus'],
    }),

    /**
     * Bulk retry failed jobs
     */
    bulkRetryJobs: builder.mutation<
      { success: boolean; results: { retried: number; failed: number; errors: string[] } },
      { queueName: string; jobIds?: string[] }
    >({
      query: (body) => ({
        url: '/amazon/error-recovery/bulk-retry',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FailedJobs', 'SyncStatus'],
    }),

    /**
     * Get retry statistics
     */
    getRetryStatistics: builder.query<
      { success: boolean; data: RetryStatistics },
      { queueName?: string }
    >({
      query: ({ queueName = 'DATA_SYNC' }) => ({
        url: `/amazon/error-recovery/statistics?queueName=${queueName}`,
        method: 'GET',
      }),
      providesTags: ['RetryStats'],
    }),
  }),
})

// ============================================
// EXPORTED HOOKS
// ============================================

export const {
  useTriggerSyncMutation,
  useGetSyncJobStatusQuery,
  useGetAccountSyncStatusQuery,
  useGetQueueStatisticsQuery,
  useCancelSyncJobMutation,
  useGetSyncLogsQuery,
  useGetRetryableJobsQuery,
  useGetPermanentFailedJobsQuery,
  useRetryJobMutation,
  useBulkRetryJobsMutation,
  useGetRetryStatisticsQuery,
} = syncApi
