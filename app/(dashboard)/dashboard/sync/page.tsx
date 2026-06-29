'use client'

import React, { useState, useEffect } from 'react'
import { useGetAmazonAccountsQuery } from '@/services/api/accounts.api'
import {
  useGetAccountSyncStatusQuery,
  useGetQueueStatisticsQuery,
  useTriggerSyncMutation,
  useGetSyncLogsQuery,
  useGetRetryableJobsQuery,
  useGetRetryStatisticsQuery,
  useRetryJobMutation,
  useBulkRetryJobsMutation,
} from '@/services/api/sync.api'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/design-system/cards'
import { Tabs } from '@/design-system/tabs'
import { Button } from '@/design-system/buttons'
import { Badge } from '@/design-system/badges'
import { Spinner } from '@/design-system/loaders'
import { Select } from '@/design-system/inputs'
import { Alert } from '@/design-system/alerts'

/**
 * Sync Dashboard Page
 * 
 * Comprehensive dashboard for managing Amazon data syncs:
 * - Real-time sync status and progress
 * - Sync history and logs
 * - Manual sync triggers
 * - Queue statistics
 * - Failed jobs and retry management
 */

const SYNC_TYPES = [
  { value: 'orders', label: 'Orders', description: 'Sync sales and orders' },
  { value: 'fees', label: 'Fees', description: 'Sync referral, FBA, and storage fees' },
  { value: 'ppc', label: 'PPC', description: 'Sync PPC campaign metrics' },
  { value: 'inventory', label: 'Inventory', description: 'Sync inventory levels' },
  { value: 'listings', label: 'Listings', description: 'Sync listing changes' },
  { value: 'refunds', label: 'Refunds', description: 'Sync refunds and returns' },
  { value: 'all', label: 'All', description: 'Sync all data types' },
] as const

export default function SyncDashboardPage() {
  const [activeTab, setActiveTab] = useState('status')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [selectedSyncType, setSelectedSyncType] = useState<string>('all')

  const { data: accounts, isLoading: isLoadingAccounts } = useGetAmazonAccountsQuery()
  const { data: syncStatus, isLoading: isLoadingStatus } = useGetAccountSyncStatusQuery(
    { amazonAccountId: selectedAccountId, limit: 20 },
    { skip: !selectedAccountId }
  )
  const { data: queueStats } = useGetQueueStatisticsQuery()
  const { data: syncLogsResponse, isLoading: isLoadingLogs } = useGetSyncLogsQuery({
    amazonAccountId: selectedAccountId || undefined,
    limit: 50,
  })
  const syncLogs = syncLogsResponse?.data || []
  const { data: retryableJobs } = useGetRetryableJobsQuery({ limit: 20 })
  const { data: retryStats } = useGetRetryStatisticsQuery({})

  const [triggerSync, { isLoading: isTriggering }] = useTriggerSyncMutation()
  const [retryJob] = useRetryJobMutation()
  const [bulkRetry] = useBulkRetryJobsMutation()

  // Set first account as default
  useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [accounts, selectedAccountId])

  const handleTriggerSync = async () => {
    if (!selectedAccountId) {
      alert('Please select an Amazon account')
      return
    }

    try {
      const result = await triggerSync({
        amazonAccountId: selectedAccountId,
        syncType: selectedSyncType as any,
      }).unwrap()

      if (result.success) {
        alert(`Sync job queued! Job ID: ${result.data.jobId}`)
      }
    } catch (error: any) {
      alert(`Failed to trigger sync: ${error?.data?.error || error?.message || 'Unknown error'}`)
    }
  }

  const handleRetryJob = async (jobId: string) => {
    try {
      await retryJob({ jobId }).unwrap()
      alert('Job queued for retry')
    } catch (error: any) {
      alert(`Failed to retry job: ${error?.data?.error || error?.message || 'Unknown error'}`)
    }
  }

  const handleBulkRetry = async () => {
    if (!retryableJobs?.data || retryableJobs.data.length === 0) {
      alert('No retryable jobs found')
      return
    }

    try {
      const result = await bulkRetry({
        queueName: 'DATA_SYNC',
        jobIds: retryableJobs.data.map((j) => j.id),
      }).unwrap()

      alert(
        `Bulk retry completed: ${result.results.retried} retried, ${result.results.failed} failed`
      )
    } catch (error: any) {
      alert(`Failed to bulk retry: ${error?.data?.error || error?.message || 'Unknown error'}`)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>
      case 'failed':
        return <Badge variant="error">Failed</Badge>
      case 'active':
        return <Badge variant="primary">Active</Badge>
      case 'waiting':
        return <Badge variant="warning">Waiting</Badge>
      case 'delayed':
        return <Badge variant="warning">Delayed</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A'
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  if (isLoadingAccounts) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    )
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500 text-lg mb-4">No Amazon accounts linked.</p>
            <p className="text-gray-400 text-sm">
              Link your Amazon Seller Central account to start syncing data.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Sync Dashboard</h1>
        <p className="text-gray-600">Monitor and manage Amazon data synchronization</p>
      </div>

      {/* Account Selector */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amazon Account
              </label>
              <Select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                options={accounts.map((acc) => ({
                  label: `${acc.marketplace} - ${acc.sellerId}`,
                  value: acc.id,
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Statistics Cards */}
      {queueStats?.data && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500 mb-1">Waiting</div>
              <div className="text-2xl font-bold text-yellow-600">
                {queueStats.data['data-sync']?.waiting || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500 mb-1">Active</div>
              <div className="text-2xl font-bold text-blue-600">
                {queueStats.data['data-sync']?.active || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500 mb-1">Completed</div>
              <div className="text-2xl font-bold text-green-600">
                {queueStats.data['data-sync']?.completed || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500 mb-1">Failed</div>
              <div className="text-2xl font-bold text-red-600">
                {queueStats.data['data-sync']?.failed || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500 mb-1">Delayed</div>
              <div className="text-2xl font-bold text-orange-600">
                {queueStats.data['data-sync']?.delayed || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        items={[
          { id: 'status', label: 'Sync Status' },
          { id: 'history', label: 'History' },
          { id: 'trigger', label: 'Manual Sync' },
          { id: 'failed', label: 'Failed Jobs' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Content */}
      <div className="mt-6">
        {/* Sync Status Tab */}
        {activeTab === 'status' && (
          <Card>
            <CardHeader>
              <CardTitle>Active Sync Jobs</CardTitle>
              <CardDescription>
                Real-time status of sync jobs for selected account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStatus ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : !syncStatus?.data?.jobs || syncStatus.data.jobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No active sync jobs found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Progress
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Started
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {syncStatus.data.jobs.map((job) => (
                        <tr key={job.jobId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium capitalize">{job.syncType}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(job.status)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${job.progress}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">{job.progress}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {job.startedAt
                              ? new Date(job.startedAt).toLocaleString()
                              : job.createdAt
                                ? new Date(job.createdAt).toLocaleString()
                                : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDuration(job.duration)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {job.status === 'active' || job.status === 'waiting' ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  // Cancel job logic here
                                  alert('Cancel functionality coming soon')
                                }}
                              >
                                Cancel
                              </Button>
                            ) : job.status === 'failed' ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleRetryJob(job.jobId)}
                              >
                                Retry
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <Card>
            <CardHeader>
              <CardTitle>Sync History</CardTitle>
              <CardDescription>Historical sync logs and results</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : !syncLogs || syncLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No sync logs found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Records
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Started
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Completed
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Error
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {syncLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium capitalize">{log.syncType}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {log.status === 'success' ? (
                              <Badge variant="success">Success</Badge>
                            ) : log.status === 'failed' ? (
                              <Badge variant="error">Failed</Badge>
                            ) : (
                              <Badge variant="warning">Partial</Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <span className="text-green-600">{log.recordsSynced} synced</span>
                              {log.recordsFailed > 0 && (
                                <span className="text-red-600 ml-2">{log.recordsFailed} failed</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(log.startedAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.completedAt
                              ? new Date(log.completedAt).toLocaleString()
                              : 'In progress'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 max-w-xs truncate">
                            {log.errorMessage || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Manual Sync Tab */}
        {activeTab === 'trigger' && (
          <Card>
            <CardHeader>
              <CardTitle>Manual Sync</CardTitle>
              <CardDescription>Trigger a manual data sync for selected account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sync Type
                  </label>
                  <Select
                    value={selectedSyncType}
                    onChange={(e) => setSelectedSyncType(e.target.value)}
                    options={SYNC_TYPES.map((type) => ({
                      label: `${type.label} - ${type.description}`,
                      value: type.value,
                    }))}
                  />
                </div>

                <Button
                  variant="primary"
                  onClick={handleTriggerSync}
                  disabled={!selectedAccountId || isTriggering}
                  isLoading={isTriggering}
                  className="w-full"
                >
                  {isTriggering ? 'Triggering Sync...' : 'Trigger Sync'}
                </Button>

                {!selectedAccountId && (
                  <Alert variant="warning">
                    Please select an Amazon account to trigger a sync.
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Failed Jobs Tab */}
        {activeTab === 'failed' && (
          <div className="space-y-6">
            {/* Retry Statistics */}
            {retryStats?.data && (
              <Card>
                <CardHeader>
                  <CardTitle>Retry Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Total Failed</div>
                      <div className="text-2xl font-bold">{retryStats.data.totalFailed}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Retryable</div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {retryStats.data.byRetryStatus.retryable}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Permanent</div>
                      <div className="text-2xl font-bold text-red-600">
                        {retryStats.data.byRetryStatus.permanent}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Needs Intervention</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {retryStats.data.requiresIntervention}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Retryable Jobs */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Retryable Failed Jobs</CardTitle>
                    <CardDescription>Jobs that can be automatically retried</CardDescription>
                  </div>
                  {retryableJobs?.data && retryableJobs.data.length > 0 && (
                    <Button variant="primary" size="sm" onClick={handleBulkRetry}>
                      Bulk Retry All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!retryableJobs?.data || retryableJobs.data.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No retryable failed jobs found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Job ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Error Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Attempts
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Failed At
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Error
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {retryableJobs.data.map((job) => (
                          <tr key={job.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                              {job.id?.substring(0, 20)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant="warning">{job.errorType || 'Unknown'}</Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {job.attemptsMade}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {job.failedAt ? new Date(job.failedAt).toLocaleString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-red-600 max-w-xs truncate">
                              {job.failedReason || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleRetryJob(job.id!)}
                              >
                                Retry
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
