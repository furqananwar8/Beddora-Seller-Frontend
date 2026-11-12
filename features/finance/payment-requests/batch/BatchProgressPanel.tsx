'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/design-system/buttons'
import { cn } from '@/utils/cn'
import { formatBatchNo } from '../../shared/format'
import type { BatchRunState } from './useBatchStream'
import type { BatchStep } from './types'

const STEPS: Array<{ id: BatchStep; label: string }> = [
  { id: 'validate', label: 'Check' },
  { id: 'create', label: 'Create' },
  { id: 'submit', label: 'Submit' },
]

const LIST_URL = '/dashboard/finance/payment-request'

interface BatchProgressPanelProps {
  run: BatchRunState
  /** Whether requests are also sent for approval (adds the Submit step). */
  submit: boolean
  onClose: () => void
  /** Go back to what was being edited (shown when something went wrong). */
  onBack: () => void
}

/** Progress bar, the step being done, row problems and the outcome of one batch run. */
export const BatchProgressPanel: React.FC<BatchProgressPanelProps> = ({ run, submit, onClose, onBack }) => {
  const steps = submit ? STEPS : STEPS.filter((step) => step.id !== 'submit')
  const activeIndex = run.status === 'done' ? steps.length : Math.max(0, steps.findIndex((step) => step.id === run.step))
  const created = run.result?.created.length ?? 0
  const nothingCreated = run.status === 'done' && created === 0
  const problems = run.rowErrors.length > 0
  const tone = run.status === 'error' || nothingCreated ? 'bg-danger-500' : problems && run.status === 'done' ? 'bg-warning-500' : 'bg-primary-600'

  return (
    <div className="space-y-4">
      <ol className="flex items-center gap-2 text-sm">
        {steps.map((step, index) => (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                index < activeIndex ? 'bg-success-600 text-white' : index === activeIndex && run.status === 'running' ? 'bg-primary-600 text-white' : 'bg-secondary-200 text-text-muted'
              )}
              aria-hidden
            >
              {index < activeIndex ? '✓' : index + 1}
            </span>
            <span className={cn(index === activeIndex && run.status === 'running' ? 'font-semibold text-text-primary' : 'text-text-secondary')}>{step.label}</span>
            {index < steps.length - 1 && <span className="mx-1 h-px w-6 bg-border" aria-hidden />}
          </li>
        ))}
      </ol>

      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-text-secondary" aria-live="polite">
            {run.status === 'error' ? 'Stopped' : run.status === 'done' ? 'Finished' : run.label || 'Starting'}
          </span>
          <span className="font-semibold text-text-primary">{run.percent}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-secondary-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={run.percent}>
          <div className={cn('h-full rounded-full transition-all duration-300', tone)} style={{ width: `${run.percent}%` }} />
        </div>
      </div>

      {run.error && (
        <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {run.error}
        </p>
      )}

      {run.status === 'done' && (
        <p className={cn('rounded-lg border px-3 py-2 text-sm', nothingCreated ? 'border-danger-200 bg-danger-50 text-danger-700' : 'border-success-200 bg-success-50 text-success-700')}>
          {nothingCreated
            ? 'Nothing was created. Fix the rows below and try again.'
            : `${created} of ${run.result?.total ?? created} payment request${created === 1 ? '' : 's'} created${run.result?.batchId ? ` in batch ${formatBatchNo(run.result.batchId)}` : ''}${submit ? ' and sent for approval' : ' as drafts'}.`}
        </p>
      )}

      {problems && (
        <div>
          <p className="mb-1 text-sm font-medium text-text-primary">{run.rowErrors.length} problem{run.rowErrors.length === 1 ? '' : 's'}</p>
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2 text-sm">
            {run.rowErrors.map((error, index) => (
              <li key={`${error.row}-${index}`} className="flex gap-2 text-danger-700">
                <span className="w-16 shrink-0 font-medium">Row {error.row}</span>
                <span className="min-w-0 break-words">{error.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {run.status === 'running' && <span className="mr-auto text-xs text-text-muted">Keep this window open until it finishes.</span>}
        {run.status !== 'running' && (run.status === 'error' || nothingCreated || (problems && created > 0)) && (
          <Button type="button" variant="outline" onClick={onBack}>
            Back to edit
          </Button>
        )}
        {run.status === 'done' && created > 0 && run.result?.batchId && (
          <Link href={`${LIST_URL}?tab=ALL&batchId=${run.result.batchId}`} className="ds-button ds-button-primary">
            View batch
          </Link>
        )}
        {run.status !== 'running' && (
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  )
}
