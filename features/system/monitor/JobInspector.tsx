'use client'

import React, { useEffect, useRef } from 'react'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { useGetJobDetailQuery, type JobDetail, type QueueSummary, type TraceStep } from '@/services/api/systemMonitor.api'
import { cn } from '@/utils/cn'
import { firstSentence, formatDuration, STATE_LABEL, STATE_TONE, useNow } from './monitorMeta'

const KEEP_WATCHING_MS = 20_000

const stepMark: Record<TraceStep['state'], { glyph: string; className: string }> = {
  done: { glyph: '✓', className: 'bg-success-50 text-success-700' },
  run: { glyph: '●', className: 'bg-sky-50 text-sky-700' },
  fail: { glyph: '✕', className: 'bg-danger-50 text-danger-700' },
  wait: { glyph: '○', className: 'bg-secondary-100 text-secondary-500' },
}

const progressText = (step: TraceStep): string | null => {
  if (step.total && step.total > 1 && step.state !== 'wait') return `${(step.count ?? 0).toLocaleString('en-CA')} of ${step.total.toLocaleString('en-CA')}${step.unit ? ` ${step.unit}` : ''}`
  return null
}

interface Props {
  queue: string
  id: string
  info?: QueueSummary
  onClose: () => void
  onRetry: (job: JobDetail) => void
  onRemove: (job: JobDetail) => void
  onPromote: (job: JobDetail) => void
}

/**
 * One job, in detail: how far it is, which step it is on, the file and line of the code reporting it, every step with
 * its timing, the log as it is written, and why it failed. Live: the page patches this from `system.jobs`.
 * The server streams a job's log lines only while someone has it open, so the open job is re-asked every 20 s.
 */
export const JobInspector: React.FC<Props> = ({ queue, id, info, onClose, onRetry, onRemove, onPromote }) => {
  const { data: job, isLoading, isError } = useGetJobDetailQuery({ queue, id }, { pollingInterval: KEEP_WATCHING_MS })
  const now = useNow(1000)
  const logRef = useRef<HTMLDivElement>(null)
  const logCount = job?.logs.length ?? 0

  useEffect(() => {
    const box = logRef.current
    if (box) box.scrollTop = box.scrollHeight
  }, [logCount])

  if (isLoading) return <div className="flex items-center gap-2 text-sm text-text-muted"><Spinner size="sm" /> Loading the job…</div>
  if (isError || !job) return <p className="text-sm text-text-muted">That job is gone. It may have finished and been cleaned up.</p>

  const trace = job.trace
  const running = job.state === 'active'
  const failed = job.state === 'failed'
  const elapsed = job.startedAt ? formatDuration((job.finishedAt ?? now) - job.startedAt) : '—'
  const current = trace ? trace.steps[trace.step] : undefined
  const steps: TraceStep[] = trace ? trace.steps.map((step) => (failed && step.state === 'run' ? { ...step, state: 'fail' as const } : step)) : []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-mono text-base font-semibold text-text-primary">{job.name}</h3>
            <span className="text-sm text-text-muted">#{job.id}</span>
            <StatusBadge label={job.state === 'unknown' ? 'Unknown' : STATE_LABEL[job.state]} tone={job.state === 'unknown' ? 'neutral' : STATE_TONE[job.state]} />
          </div>
          <p className="mt-1 font-mono text-xs text-text-muted">{queue}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {failed && job.failure?.retryable !== false && (
            <Button type="button" onClick={() => onRetry(job)}>
              Retry now
            </Button>
          )}
          {job.state === 'delayed' && (
            <Button type="button" variant="outline" onClick={() => onPromote(job)}>
              Run it now
            </Button>
          )}
          {!running && (
            <Button type="button" variant="outline" onClick={() => onRemove(job)}>
              Remove
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {info && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">What this job is doing: </span>
          {firstSentence(info.what)}
          {failed && job.failure && (
            <p className="mt-1">
              <span className="font-semibold text-text-primary">Why it failed: </span>
              {job.failure.plain}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact label="Progress" value={`${job.pct}%`} />
        <Fact label="Attempt" value={`${Math.min(job.attemptsMade + (running ? 1 : 0), job.maxAttempts)} of ${job.maxAttempts}`} />
        <Fact label={running ? 'Running for' : 'Took'} value={elapsed} />
        <Fact label="Started" value={job.startedAt ? new Date(job.startedAt).toLocaleTimeString('en-CA') : 'not yet'} />
      </div>

      <div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary-100" role="progressbar" aria-valuenow={job.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Job progress">
          <div className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', failed ? 'bg-danger-500' : job.state === 'completed' ? 'bg-success-500' : 'bg-primary-600')} style={{ width: `${job.pct}%` }} />
        </div>
      </div>

      {trace ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className={cn('rounded-lg p-3 font-mono text-xs leading-relaxed text-white', failed ? 'bg-danger-700' : 'bg-secondary-900')}>
              <div className="text-[11px] uppercase tracking-wide text-white/60">{failed ? 'Stopped at' : running ? 'Now executing' : 'Last reported'}</div>
              <div className="mt-1 break-all">
                {trace.file}:{trace.line}
              </div>
              {current && (
                <div className="mt-1 text-white/90">
                  {current.name}
                  {progressText(current) ? ` · ${progressText(current)}` : ''}
                  {running && <span className="ml-1 animate-pulse">▌</span>}
                </div>
              )}
            </div>
            <ol className="space-y-1.5">
              {steps.map((step, index) => (
                <li key={step.name} className={cn('flex items-start gap-3 rounded-lg border border-border p-2.5 text-sm', step.state === 'run' && 'border-sky-200 bg-sky-50/60')}>
                  <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold', stepMark[step.state].className)} aria-hidden="true">
                    {stepMark[step.state].glyph}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-text-primary">
                        {index + 1}. {step.name}
                      </span>
                      <span className="text-xs text-text-muted">{step.tookMs !== undefined ? formatDuration(step.tookMs) : step.state === 'run' ? 'running' : step.state === 'wait' ? 'waiting' : ''}</span>
                    </div>
                    {step.total && step.total > 1 && step.state !== 'wait' && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary-100">
                          <div className="h-full rounded-full bg-primary-600 transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min(100, ((step.count ?? 0) / step.total) * 100)}%` }} />
                        </div>
                        <span className="font-mono text-[11px] text-text-muted">{progressText(step)}</span>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <LogWindow logs={job.logs} boxRef={logRef} />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border p-3 text-sm text-text-secondary">
            This job does not report its steps yet, so only its percentage, status and log lines can be shown. A processor reports steps with the <span className="font-mono text-xs">JobTracer</span> helper, which also records the file and line it is on.
          </div>
          <LogWindow logs={job.logs} boxRef={logRef} />
        </div>
      )}

      {failed && job.failure && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={job.failure.retryable ? 'Temporary: safe to retry' : 'Needs a fix: retrying will not help'} tone={job.failure.retryable ? 'warning' : 'danger'} />
            <span className="text-xs text-text-muted">{job.failure.label}</span>
          </div>
          <p className="mt-2 break-words font-mono text-xs text-danger-700">{job.failure.message}</p>
          {job.stacktrace[0] && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-text-muted">{job.stacktrace[0]}</pre>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-semibold text-text-muted">Job details (secrets hidden)</div>
          <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-secondary-900 p-3 font-mono text-xs leading-relaxed text-white">{typeof job.data === 'string' ? job.data : JSON.stringify(job.data, null, 2)}</pre>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-text-muted">Where this job lives in Redis</div>
          <ul className="space-y-1 rounded-lg border border-border p-3 font-mono text-xs text-text-secondary">
            {job.redisKeys.map((key) => (
              <li key={key} className="break-all">
                {key}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

const Fact: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border border-border bg-surface px-3 py-2">
    <div className="text-xs text-text-muted">{label}</div>
    <div className="font-mono text-sm font-medium text-text-primary">{value}</div>
  </div>
)

const LogWindow: React.FC<{ logs: string[]; boxRef: React.RefObject<HTMLDivElement> }> = ({ logs, boxRef }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-xs font-semibold text-text-muted">
      <span>Log</span>
      <span className="font-normal">{logs.length} lines, live</span>
    </div>
    <div ref={boxRef} className="h-72 overflow-auto rounded-lg bg-secondary-900 p-3 font-mono text-xs leading-relaxed text-white" role="log" aria-live="off">
      {logs.length === 0 ? (
        <span className="text-white/50">No log lines yet.</span>
      ) : (
        logs.map((line, index) => (
          <div key={index} className={cn('whitespace-pre-wrap break-words', line.startsWith('✕') && 'text-danger-200', line.startsWith('▶') && 'text-sky-200')}>
            {line}
          </div>
        ))
      )}
    </div>
  </div>
)
