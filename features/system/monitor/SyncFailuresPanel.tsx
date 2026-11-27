import React, { useState } from 'react'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Button } from '@/design-system/buttons'
import type { JobRef, SyncFailure } from '@/services/api/systemMonitor.api'
import { ago, formatCount } from './monitorMeta'
import { Panel, ScrollArea } from './Panel'

interface Props {
  syncs: SyncFailure[]
  now: number
  busy: boolean
  onRetry: (jobs: JobRef[]) => void
  onRemove: (jobs: JobRef[]) => void
}

/** Failures seen from the sync's side: which sync fails, in which queue, and with what error. */
export const SyncFailuresPanel: React.FC<Props> = ({ syncs, now, busy, onRetry, onRemove }) => {
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <Panel title="Failures by sync" subtitle="Each sync with failed tasks, and the errors behind them. Select a sync to retry or delete a whole group of the same error at once.">
      <ScrollArea>
        {syncs.length === 0 ? (
          <p className="text-sm text-text-muted">No sync has failed tasks. Nice.</p>
        ) : (
          <ul>
            {syncs.map((sync) => {
              const isOpen = openId === sync.id
              const all = sync.errors.flatMap((error) => error.jobs)
              return (
                <li key={sync.id} className="border-t border-border first:border-t-0">
                  <div className="flex flex-wrap items-center gap-3 py-3">
                    <button type="button" aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? null : sync.id)} className="min-w-0 flex-1 text-left">
                      <div className="text-sm font-medium text-text-primary">
                        {sync.sync} <span className="font-normal text-text-muted">· {sync.area}</span>
                      </div>
                      <div className="font-mono text-[11px] text-text-muted">
                        {sync.queues.join(', ')}
                        {sync.lastAt ? ` · last failed ${ago(sync.lastAt, now)}` : ''}
                      </div>
                      <div className="truncate text-xs text-text-muted">{sync.errors[0]?.message}</div>
                    </button>
                    <StatusBadge label={`${formatCount(sync.failed)}${sync.partial ? '+' : ''} failed`} tone="danger" />
                    <Button type="button" variant="danger" disabled={busy} onClick={() => onRemove(all)}>
                      Delete all
                    </Button>
                  </div>
                  {isOpen && (
                    <ul className="mb-3 space-y-2 pl-3">
                      {sync.errors.map((error) => (
                        <li key={error.message} className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-secondary-50 p-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-text-primary">
                              {error.label} <span className="font-normal text-text-muted">· {error.count}×{error.lastAt ? ` · last ${ago(error.lastAt, now)}` : ''}</span>
                            </div>
                            <div className="break-words font-mono text-xs text-text-secondary">{error.message}</div>
                          </div>
                          {error.retryable && (
                            <Button type="button" disabled={busy} onClick={() => onRetry(error.jobs)}>
                              Retry
                            </Button>
                          )}
                          <Button type="button" variant="outline" disabled={busy} onClick={() => onRemove(error.jobs)}>
                            Delete
                          </Button>
                        </li>
                      ))}
                      {sync.partial && <p className="text-xs text-text-muted">The queue holds more failures than are listed here (newest 200 are read). Delete or retry, then reopen to see the rest.</p>}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </ScrollArea>
    </Panel>
  )
}
