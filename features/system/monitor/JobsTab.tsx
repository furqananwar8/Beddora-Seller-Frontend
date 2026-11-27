'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { EmptyState } from '@/components/data-display/EmptyState'
import { FilterMultiSelect } from '@/components/filter-bar/FilterMultiSelect'
import { FormField } from '@/components/form-field/FormField'
import { SelectionCheckbox } from '@/components/selection-checkbox/SelectionCheckbox'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Button } from '@/design-system/buttons'
import { KpiCard } from '@/design-system/kpi'
import { Tabs } from '@/design-system/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useRowSelection } from '@/hooks/useRowSelection'
import {
  useBulkJobsMutation,
  useCleanQueueMutation,
  useGetFailedSyncsQuery,
  useGetActiveJobsQuery,
  useGetFailedJobsQuery,
  useGetJobsOverviewQuery,
  useGetQueueJobsQuery,
  useGetSchedulesQuery,
  usePauseQueueMutation,
  usePromoteJobMutation,
  useRemoveJobMutation,
  useRetryAllJobsMutation,
  useRetryJobMutation,
  type BulkJobAction,
  type JobDetail,
  type JobRef,
  type JobStateName,
  type JobView,
  type QueueSummary,
} from '@/services/api/systemMonitor.api'
import { cn } from '@/utils/cn'
import { BulkBar } from './BulkBar'
import { Sparkline, ThroughputChart } from './charts'
import { JobInspector } from './JobInspector'
import { ActivityFeed, Panel, ScrollArea } from './Panel'
import { SyncFailuresPanel } from './SyncFailuresPanel'
import { ago, firstSentence, formatCount, HEALTH_LABEL, HEALTH_TILE, HEALTH_TONE, queueHealth, STATE_LABEL, STATE_TONE, useNow } from './monitorMeta'
import { useJobsLive } from './useJobsLive'

const FILTER_BOX = 'mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm'
const SEARCH_INPUT = 'ds-input ds-input-default w-full max-w-sm rounded-lg'
const STATES: JobStateName[] = ['active', 'waiting', 'delayed', 'failed', 'completed']
const key = (job: Pick<JobView, 'queue' | 'id'>) => `${job.queue}:${job.id}`
/** Job ids never contain ':' but queue names may, so the split is at the last one. */
const refOf = (jobKey: string): JobRef => ({ queue: jobKey.slice(0, jobKey.lastIndexOf(':')), id: jobKey.slice(jobKey.lastIndexOf(':') + 1) })

/** The two Amazon pipelines as boxes joined by moving dashes. A queue missing from Redis simply shows zero. */
const FLOWS: Array<{ title: string; steps: Array<{ queue: string; title: string; note: string }> }> = [
  {
    title: 'How an Amazon sync flows',
    steps: [
      { queue: 'data-sync', title: '1. Plan the sync', note: 'Decide what to fetch' },
      { queue: 'spapi-report-request', title: '2. Ask Amazon', note: 'Request a big report' },
      { queue: 'spapi-report-download', title: '3. Download', note: 'Get the finished file' },
      { queue: 'db-bulk-load', title: '4. Save', note: 'Load the rows into the database' },
    ],
  },
  {
    title: 'How advertising numbers flow',
    steps: [
      { queue: 'ads-report', title: 'Ad stats pieces', note: 'One per account and ad type' },
      { queue: 'ads-day', title: 'Combine the day', note: 'Add the pieces into daily totals' },
      { queue: 'alerts', title: 'Check for alerts', note: 'High ad cost, low stock' },
    ],
  },
]

export const JobsTab: React.FC = () => {
  const { success, failure, info } = useApiFeedback()
  const now = useNow(1000)
  // Polling is the safety net: the screen still catches up if a live event is missed
  const { data: overview } = useGetJobsOverviewQuery(undefined, { pollingInterval: 10_000 })
  const { data: active = [] } = useGetActiveJobsQuery(undefined, { pollingInterval: 5_000 })
  const { data: failed = [] } = useGetFailedJobsQuery(undefined, { pollingInterval: 15_000 })
  const { data: schedules = [] } = useGetSchedulesQuery()
  const { data: syncs = [] } = useGetFailedSyncsQuery(undefined, { pollingInterval: 15_000 })
  const { feed, leaving, fresh } = useJobsLive()

  const [selectedQueue, setSelectedQueue] = useState<string | null>(null)
  const [status, setStatus] = useState<JobStateName>('failed')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<{ queue: string; id: string } | null>(null)
  const [groups, setGroups] = useState<string[]>([])
  const [queueSearch, setQueueSearch] = useState('')
  const [failSearch, setFailSearch] = useState('')
  const [failReasons, setFailReasons] = useState<string[]>([])
  const [scheduleKind, setScheduleKind] = useState<'all' | 'bullmq' | 'cron'>('all')
  const [confirm, setConfirm] = useState<{ kind: 'retry-all'; queue?: string } | { kind: 'remove'; job: JobDetail } | { kind: 'bulk-remove'; jobs: JobRef[] } | null>(null)

  const [retryJob] = useRetryJobMutation()
  const [promoteJob] = usePromoteJobMutation()
  const [removeJob, { isLoading: removing }] = useRemoveJobMutation()
  const [pauseQueue] = usePauseQueueMutation()
  const [cleanQueue] = useCleanQueueMutation()
  const [retryAll, { isLoading: retryingAll }] = useRetryAllJobsMutation()
  const [bulkJobs, { isLoading: bulking }] = useBulkJobsMutation()

  const queues = useMemo(() => overview?.queues ?? [], [overview])
  const byName = useMemo(() => new Map(queues.map((queue) => [queue.name, queue])), [queues])

  useEffect(() => {
    if (!selectedQueue && queues.length > 0) setSelectedQueue((queues.find((queue) => queue.counts.failed > 0) ?? queues[0]).name)
  }, [queues, selectedQueue])

  const totals = useMemo(
    () => queues.reduce((sum, queue) => ({ active: sum.active + queue.counts.active, waiting: sum.waiting + queue.counts.waiting, delayed: sum.delayed + queue.counts.delayed, failed: sum.failed + queue.counts.failed, completed: sum.completed + queue.counts.completed }), { active: 0, waiting: 0, delayed: 0, failed: 0, completed: 0 }),
    [queues]
  )
  const failingQueues = queues.filter((queue) => queueHealth(queue) === 'failing').map((queue) => queue.name)
  const throughput = overview?.throughput ?? []

  const groupOptions = useMemo(() => [...new Set(queues.map((queue) => queue.group))].sort().map((group) => ({ value: group, label: group })), [queues])
  const shownQueues = queues.filter((queue) => (groups.length === 0 || groups.includes(queue.group)) && (!queueSearch.trim() || queue.name.includes(queueSearch.trim().toLowerCase())))

  const current = selectedQueue ? byName.get(selectedQueue) : undefined
  const { data: jobsPage, isFetching: listLoading } = useGetQueueJobsQuery({ queue: selectedQueue ?? '', status, page, limit: 10 }, { skip: !selectedQueue })

  const reasonOptions = useMemo(() => [...new Set(failed.map((job) => job.failure?.label ?? 'Unknown'))].sort().map((label) => ({ value: label, label })), [failed])
  const shownFailed = failed.filter((job) => (failReasons.length === 0 || failReasons.includes(job.failure?.label ?? 'Unknown')) && (!failSearch.trim() || `${job.queue} ${job.name} ${job.id}`.toLowerCase().includes(failSearch.trim().toLowerCase())))
  const failedSel = useRowSelection(useMemo(() => shownFailed.map(key), [shownFailed]))
  const reasonCounts = useMemo(() => {
    const counts = new Map<string, number>()
    failed.forEach((job) => counts.set(job.failure?.label ?? 'Unknown', (counts.get(job.failure?.label ?? 'Unknown') ?? 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [failed])
  const retryable = failed.filter((job) => job.failure?.retryable).length

  const queueSel = useRowSelection(useMemo(() => (jobsPage?.data ?? []).map(key), [jobsPage]))
  const shownSchedules = schedules.filter((item) => scheduleKind === 'all' || item.source === scheduleKind)

  const doRetry = async (job: Pick<JobView, 'queue' | 'id'>) => {
    try {
      await retryJob(job).unwrap()
      success('Task put back in line')
    } catch (error) {
      failure(error, 'Could not retry the task')
    }
  }
  const doBulk = async (action: BulkJobAction, jobs: JobRef[]) => {
    try {
      const result = await bulkJobs({ action, jobs }).unwrap()
      success(`${result.done} task${result.done === 1 ? '' : 's'} ${action === 'retry' ? 'put back in line' : 'deleted'}${result.skipped ? `. ${result.skipped} skipped (already gone, or running now)` : ''}`)
      failedSel.clear()
      queueSel.clear()
    } catch (error) {
      failure(error, 'That did not work')
    }
  }
  const runConfirmed = async () => {
    if (!confirm) return
    try {
      if (confirm.kind === 'retry-all') {
        const result = await retryAll({ queue: confirm.queue }).unwrap()
        success(`${result.retried} task${result.retried === 1 ? '' : 's'} put back in line${result.skipped ? `. ${result.skipped} left alone because retrying will not help` : ''}`)
      } else if (confirm.kind === 'bulk-remove') {
        await doBulk('remove', confirm.jobs)
      } else {
        await removeJob({ queue: confirm.job.queue, id: confirm.job.id }).unwrap()
        success('Task removed')
        setOpen(null)
      }
    } catch (error) {
      failure(error, 'That did not work')
    } finally {
      setConfirm(null)
    }
  }

  const summary = `${totals.active} task${totals.active === 1 ? ' is' : 's are'} being worked on and ${formatCount(totals.waiting)} ${totals.waiting === 1 ? 'is' : 'are'} waiting their turn. ${totals.failed} ${totals.failed === 1 ? 'has' : 'have'} failed${failingQueues.length ? `; ${failingQueues.join(', ')} need attention first` : ''}. Most failures are temporary (the other service asking us to slow down, or a dropped connection) and can be retried with one click.`

  return (
    <div className="space-y-4">
      <Panel title="What is happening right now" className="border-l-4 border-l-primary-600">
        <p className="text-sm text-text-primary">{queues.length ? summary : 'Loading…'}</p>
        <p className="mt-2 text-sm text-text-muted">
          Think of each queue as a to-do tray and each worker as a staff member. A job is one small task the app does in the background, such as fetching Amazon orders, so nobody has to wait on a screen. This page shows the trays, the staff and the tasks, live.
        </p>
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard title="Running now" value={formatCount(totals.active)} subtitle={`in ${queues.filter((queue) => queue.counts.active > 0).length} queues`} icon={<Sparkline label="Completed per minute" values={throughput.map((point) => point.completed)} />} />
        <KpiCard title="Waiting in line" value={formatCount(totals.waiting)} subtitle="ready for the next free worker" />
        <KpiCard title="Delayed" value={formatCount(totals.delayed)} subtitle="retrying later, or scheduled" />
        <KpiCard title="Failed" value={formatCount(totals.failed)} subtitle={`${retryable} worth a retry`} className={totals.failed ? 'border-danger-200 bg-danger-50' : undefined} icon={<Sparkline label="Failed per minute" color="var(--chart-danger)" values={throughput.map((point) => point.failed)} />} />
        <KpiCard title="Kept as done" value={formatCount(totals.completed)} subtitle="recent finished tasks" />
      </div>

      <Panel title="Work finished per minute" subtitle="Green is tasks that worked, red is tasks that failed. The chart fills in while this page is open.">
        {throughput.length < 2 ? <p className="text-sm text-text-muted">Collecting the first readings. A new point appears every minute.</p> : <ThroughputChart points={throughput} />}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {FLOWS.map((flow) => (
          <Panel key={flow.title} title={flow.title} subtitle="Moving dashes mean work is flowing. The number is tasks running or waiting in that step.">
            <div className="flex flex-wrap items-stretch gap-y-3">
              {flow.steps.map((step, index) => {
                const queue = byName.get(step.queue)
                const busy = (queue?.counts.active ?? 0) > 0
                return (
                  <React.Fragment key={step.queue}>
                    {index > 0 && <div className="monitor-arrow hidden h-0.5 w-8 self-center sm:block" aria-hidden="true" />}
                    <div className={cn('min-w-[8.5rem] flex-1 rounded-lg border p-3', busy ? 'border-sky-200 bg-sky-50' : 'border-border bg-surface')}>
                      <div className="text-sm font-semibold text-text-primary">{step.title}</div>
                      <div className="text-xs text-text-muted">{step.note}</div>
                      <div className="mt-1 text-xl font-bold text-text-primary">{formatCount((queue?.counts.active ?? 0) + (queue?.counts.waiting ?? 0))}</div>
                      <div className="text-xs text-text-muted">
                        {queue?.counts.active ?? 0} running · {queue?.counts.waiting ?? 0} waiting
                      </div>
                    </div>
                  </React.Fragment>
                )
              })}
            </div>
          </Panel>
        ))}
      </div>

      <Panel title="Queue health" subtitle="One tile per queue. Select one to see what it does and what is inside it.">
        <div className={FILTER_BOX}>
          <input type="search" value={queueSearch} onChange={(event) => setQueueSearch(event.target.value)} placeholder="Search queues" aria-label="Search queues" className={SEARCH_INPUT} />
          <div className="w-full sm:w-56">
            <FormField label="Area" htmlFor="monitor-area">
              <FilterMultiSelect id="monitor-area" options={groupOptions} value={groups} onChange={setGroups} anyLabel="All areas" />
            </FormField>
          </div>
        </div>
        {queues.length === 0 ? (
          <EmptyState title="No queues found" description="Queues appear here once the first job has been added to them." />
        ) : (
          <ScrollArea className="p-0.5">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
              {shownQueues.map((queue) => (
                <QueueTile key={queue.name} queue={queue} selected={queue.name === selectedQueue} onSelect={() => { setSelectedQueue(queue.name); setStatus(queue.counts.failed > 0 ? 'failed' : 'active'); setPage(1) }} />
              ))}
            </div>
          </ScrollArea>
        )}
      </Panel>

      {current && (
        <Panel
          title={current.name}
          subtitle={current.group}
          actions={
            <>
              <StatusBadge label={HEALTH_LABEL[queueHealth(current)]} tone={HEALTH_TONE[queueHealth(current)]} />
              <Button type="button" variant="outline" onClick={() => void pauseQueue({ queue: current.name, paused: !current.paused }).unwrap().catch((error) => failure(error, 'Could not change the queue'))}>
                {current.paused ? 'Resume queue' : 'Pause queue'}
              </Button>
              <Button type="button" onClick={() => setConfirm({ kind: 'retry-all', queue: current.name })} disabled={current.counts.failed === 0}>
                Retry its temporary failures
              </Button>
              <Button type="button" variant="outline" onClick={() => void cleanQueue({ queue: current.name }).unwrap().then((result) => info(`Cleaned ${result.removed} finished task${result.removed === 1 ? '' : 's'}`)).catch((error) => failure(error, 'Could not clean the queue'))}>
                Clean finished
              </Button>
            </>
          }
        >
          <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-text-secondary">
            <div className="font-semibold text-text-primary">In plain English</div>
            <p className="mt-1">{current.what}</p>
            <ol className="mt-2 list-decimal space-y-0.5 pl-5">
              {current.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div className="mb-3 max-w-full overflow-x-auto">
            <Tabs items={STATES.map((state) => ({ id: state, label: `${STATE_LABEL[state]} ${formatCount(current.counts[state])}` }))} activeTab={status} onChange={(id) => { setStatus(id as JobStateName); setPage(1) }} />
          </div>
          {status === 'failed' && <BulkBar count={queueSel.count} busy={bulking} onRetry={() => void doBulk('retry', queueSel.keys.map(refOf))} onRemove={() => setConfirm({ kind: 'bulk-remove', jobs: queueSel.keys.map(refOf) })} onClear={queueSel.clear} />}
          <div className={listLoading ? 'opacity-70 transition-opacity' : undefined}>
            <JobTable selection={status === 'failed' ? queueSel : undefined} jobs={jobsPage?.data ?? []} now={now} selected={open} onOpen={(job) => setOpen({ queue: job.queue, id: job.id })} empty={`No ${STATE_LABEL[status].toLowerCase()} tasks in this queue.`} />
            {jobsPage && jobsPage.totalRecords > 0 && <PaginationFooter page={jobsPage.page} pageSize={jobsPage.limit} totalItems={jobsPage.totalRecords} totalPages={jobsPage.totalPages} onPageChange={setPage} itemLabel="tasks" />}
          </div>
        </Panel>
      )}

      {open && (
        <Panel title="Job inspector" subtitle="Everything about one job, live">
          <JobInspector
            key={key(open)}
            queue={open.queue}
            id={open.id}
            info={byName.get(open.queue) as QueueSummary | undefined}
            onClose={() => setOpen(null)}
            onRetry={(job) => void doRetry(job)}
            onPromote={(job) => void promoteJob({ queue: job.queue, id: job.id }).unwrap().then(() => success('The task will run now')).catch((error) => failure(error, 'Could not run it early'))}
            onRemove={(job) => setConfirm({ kind: 'remove', job })}
          />
        </Panel>
      )}

      {/* Constant height, so jobs starting and finishing never change the page length and move the scroll position. */}
      <Panel title="Running right now" subtitle="Live progress. A finished task slides away when the server reports it done. Select one to see every step.">
        <ScrollArea className="h-72 max-h-none">
        {active.length === 0 ? (
          <p className="text-sm text-text-muted">Nothing is running right now.</p>
        ) : (
          <ul>
            {active.map((job) => (
              <li key={key(job)} className={cn('border-t border-border first:border-t-0', leaving.has(key(job)) && 'monitor-leave', fresh.has(key(job)) && 'monitor-enter')}>
                <button type="button" onClick={() => setOpen({ queue: job.queue, id: job.id })} className={cn('flex w-full flex-wrap items-center gap-3 px-1 py-2.5 text-left hover:bg-secondary-50', open && key(open) === key(job) && 'bg-sky-50')}>
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-sm font-medium text-text-primary">{job.trace ? `${job.name}: ${job.trace.steps[job.trace.step]?.name ?? ''}` : job.name}</div>
                    <div className="break-all font-mono text-xs text-text-muted">
                      {job.queue} · #{job.id}
                      {job.trace ? ` · ${job.trace.file}:${job.trace.line}` : ''}
                    </div>
                  </div>
                  <div className="flex w-48 items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary-100">
                      <div className="h-full rounded-full bg-primary-600 transition-[width] duration-1000 ease-linear" style={{ width: `${job.pct}%` }} />
                    </div>
                    <span className="w-9 text-right font-mono text-xs text-text-muted">{job.pct}%</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        </ScrollArea>
      </Panel>

      <SyncFailuresPanel syncs={syncs} now={now} busy={bulking} onRetry={(jobs) => void doBulk('retry', jobs)} onRemove={(jobs) => setConfirm({ kind: 'bulk-remove', jobs })} />

      <Panel
        title="Failed tasks"
        subtitle="Temporary problems can be retried. Press Retry and the task leaves this list and shows up under Running."
        actions={
          <Button type="button" onClick={() => setConfirm({ kind: 'retry-all' })} disabled={retryable === 0} isLoading={retryingAll}>
            Retry all temporary failures ({retryable})
          </Button>
        }
      >
        <div className={FILTER_BOX}>
          <input type="search" value={failSearch} onChange={(event) => setFailSearch(event.target.value)} placeholder="Search by queue, job or id" aria-label="Search failed tasks" className={SEARCH_INPUT} />
          <div className="w-full sm:w-64">
            <FormField label="Reason" htmlFor="monitor-reason">
              <FilterMultiSelect id="monitor-reason" options={reasonOptions} value={failReasons} onChange={setFailReasons} anyLabel="All reasons" />
            </FormField>
          </div>
        </div>
        <BulkBar count={failedSel.count} busy={bulking} onRetry={() => void doBulk('retry', failedSel.keys.map(refOf))} onRemove={() => setConfirm({ kind: 'bulk-remove', jobs: failedSel.keys.map(refOf) })} onClear={failedSel.clear} />
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <ScrollArea>
            {shownFailed.length > 0 && (
              <label className="flex items-center gap-2 pb-2 text-xs text-text-muted">
                <SelectionCheckbox label="Select all shown failed tasks" checked={failedSel.headerState === 'all'} indeterminate={failedSel.headerState === 'some'} onChange={failedSel.toggleAllVisible} />
                Select all shown
              </label>
            )}
            {shownFailed.length === 0 ? (
              <p className="text-sm text-text-muted">{failed.length === 0 ? 'No failed tasks. Nice.' : 'No failed task matches.'}</p>
            ) : (
              <ul>
                {shownFailed.map((job) => (
                  <li key={key(job)} className={cn('flex flex-wrap items-center gap-3 border-t border-border py-3 first:border-t-0', leaving.has(key(job)) && 'monitor-leave', fresh.has(key(job)) && 'monitor-enter')}>
                    <SelectionCheckbox label={`Select task ${job.id}`} checked={failedSel.isSelected(key(job))} onChange={() => failedSel.toggle(key(job))} />
                    <StatusBadge label={job.failure?.retryable ? 'Temporary' : 'Needs a fix'} tone={job.failure?.retryable ? 'warning' : 'danger'} />
                    <button type="button" onClick={() => setOpen({ queue: job.queue, id: job.id })} className="min-w-0 flex-1 text-left">
                      <div className="text-sm font-medium text-text-primary">
                        {job.failure?.label} <span className="font-normal text-text-muted">· {firstSentence(byName.get(job.queue)?.what ?? job.queue)}</span>
                      </div>
                      <div className="text-xs text-text-muted">{job.failure?.plain}</div>
                      <div className="font-mono text-[11px] text-text-muted">
                        {job.queue} · #{job.id} · tried {job.attemptsMade} of {job.maxAttempts}
                        {job.finishedAt ? ` · failed ${ago(job.finishedAt, now)}` : ''}
                      </div>
                    </button>
                    {job.failure?.retryable && (
                      <Button type="button" onClick={() => void doRetry(job)}>
                        Retry
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
          <ScrollArea className="space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Why tasks fail</h3>
            {reasonCounts.length === 0 && <p className="text-sm text-text-muted">No failures to explain.</p>}
            {reasonCounts.map(([label, count]) => (
              <div key={label}>
                <div className="flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="font-mono">{count}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary-100">
                  <div className="h-full rounded-full bg-danger-500" style={{ width: `${(count / (reasonCounts[0]?.[1] ?? 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>
      </Panel>

      <Panel title="Schedules and recurring jobs" subtitle="BullMQ schedulers are read live from Redis, with their real next run. The in-process timers (cron) are listed with their timing.">
        <div className="mb-3 max-w-full overflow-x-auto">
          <Tabs items={[{ id: 'all', label: `All ${schedules.length}` }, { id: 'bullmq', label: 'Schedulers' }, { id: 'cron', label: 'Timers (cron)' }]} activeTab={scheduleKind} onChange={(id) => setScheduleKind(id as typeof scheduleKind)} />
        </div>
        <ScrollArea>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>What it does</TableHead>
              <TableHead>Runs</TableHead>
              <TableHead>Next run</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shownSchedules.map((item) => (
              <TableRow key={`${item.source}:${item.queue ?? ''}:${item.name}`}>
                <TableCell>
                  <div className="font-mono text-sm">{item.name}</div>
                  <div className="text-xs text-text-muted">{item.queue ?? 'in-process timer'}</div>
                </TableCell>
                <TableCell className="text-sm text-text-secondary">{firstSentence(item.what)}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">{item.every}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">{item.nextRunAt ? (item.nextRunAt > now ? `in ${Math.max(1, Math.round((item.nextRunAt - now) / 60000))} min` : 'due now') : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </ScrollArea>
      </Panel>

      <Panel title="Live activity" subtitle="What this page just heard from the server, in plain words">
        <ActivityFeed items={feed} empty="Nothing yet. Changes appear here as they happen." />
      </Panel>

      <ConfirmDialog
        isOpen={confirm !== null}
        title={confirm?.kind === 'remove' ? 'Remove this task?' : confirm?.kind === 'bulk-remove' ? `Delete ${confirm.jobs.length} failed task${confirm.jobs.length === 1 ? '' : 's'}?` : 'Retry the temporary failures?'}
        confirmLabel={confirm?.kind === 'remove' ? 'Remove it' : confirm?.kind === 'bulk-remove' ? 'Delete them' : 'Retry them'}
        tone={confirm?.kind === 'retry-all' ? 'default' : 'danger'}
        busy={removing || retryingAll || bulking}
        onConfirm={() => void runConfirmed()}
        onClose={() => setConfirm(null)}
      >
        {confirm?.kind === 'remove' || confirm?.kind === 'bulk-remove' ? 'The tasks and their logs are deleted from Redis and cannot be brought back.' : `Every failed task ${confirm?.kind === 'retry-all' && confirm.queue ? `in ${confirm.queue} ` : ''}whose problem is likely to clear is put back in line (up to 200 at a time). Failures that retrying cannot fix are left alone.`}
      </ConfirmDialog>
    </div>
  )
}

const QueueTile: React.FC<{ queue: QueueSummary; selected: boolean; onSelect: () => void }> = ({ queue, selected, onSelect }) => {
  const health = queueHealth(queue)
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className={cn('relative flex flex-col gap-0.5 overflow-hidden rounded-lg border p-2.5 text-left', HEALTH_TILE[health], health === 'working' && 'monitor-working', selected && 'ring-2 ring-primary-600')}>
      <span className="truncate font-mono text-xs font-semibold text-text-primary">{queue.name}</span>
      <span className="text-xs text-text-muted">
        {HEALTH_LABEL[health]} · {queue.counts.active} running{queue.counts.failed ? ` · ${queue.counts.failed} failed` : ''}
      </span>
    </button>
  )
}

type Selection = ReturnType<typeof useRowSelection<string>>

const JobTable: React.FC<{ selection?: Selection; jobs: JobView[]; now: number; selected: { queue: string; id: string } | null; onOpen: (job: JobView) => void; empty: string }> = ({ selection, jobs, now, selected, onOpen, empty }) =>
  jobs.length === 0 ? (
    <p className="py-6 text-center text-sm text-text-muted">{empty}</p>
  ) : (
    <Table>
      <TableHeader>
        <TableRow>
          {selection && (
            <TableHead>
              <SelectionCheckbox label="Select all tasks on this page" checked={selection.headerState === 'all'} indeterminate={selection.headerState === 'some'} onChange={selection.toggleAllVisible} />
            </TableHead>
          )}
          <TableHead>Task</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>Tries</TableHead>
          <TableHead>Age</TableHead>
          <TableHead>State</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={key(job)} className={cn('cursor-pointer', selected && key(selected) === key(job) && 'bg-sky-50')} onClick={() => onOpen(job)}>
            {selection && (
              <TableCell>
                <SelectionCheckbox label={`Select task ${job.id}`} checked={selection.isSelected(key(job))} onChange={() => selection.toggle(key(job))} />
              </TableCell>
            )}
            <TableCell>
              <button type="button" className="text-left" onClick={() => onOpen(job)}>
                <div className="font-mono text-sm">{job.name}</div>
                <div className="font-mono text-xs text-text-muted">#{job.id}</div>
              </button>
            </TableCell>
            <TableCell>
              <div className="flex w-36 items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary-100">
                  <div className="h-full rounded-full bg-primary-600" style={{ width: `${job.pct}%` }} />
                </div>
                <span className="font-mono text-xs text-text-muted">{job.pct}%</span>
              </div>
            </TableCell>
            <TableCell className="font-mono text-sm">
              {job.attemptsMade}/{job.maxAttempts}
            </TableCell>
            <TableCell className="whitespace-nowrap text-sm text-text-muted">{ago(job.createdAt, now)}</TableCell>
            <TableCell>{job.state !== 'unknown' && <StatusBadge label={STATE_LABEL[job.state]} tone={STATE_TONE[job.state]} />}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
