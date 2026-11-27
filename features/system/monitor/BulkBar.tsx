import React from 'react'
import { Button } from '@/design-system/buttons'

/** Appears over a list when rows are ticked: act on all of them, or clear the ticks. Hidden while nothing is ticked. */
export const BulkBar: React.FC<{ count: number; busy?: boolean; onRetry?: () => void; onRemove: () => void; onClear: () => void }> = ({ count, busy, onRetry, onRemove, onClear }) =>
  count === 0 ? null : (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2">
      <span className="mr-auto text-sm font-medium text-text-primary">{count} selected</span>
      {onRetry && (
        <Button type="button" onClick={onRetry} disabled={busy}>
          Retry selected
        </Button>
      )}
      <Button type="button" variant="danger" onClick={onRemove} disabled={busy}>
        Delete selected
      </Button>
      <Button type="button" variant="ghost" onClick={onClear}>
        Clear
      </Button>
    </div>
  )
