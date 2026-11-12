import React from 'react'
import { cn } from '@/utils/cn'

interface LineColumnHeadersProps {
  /** The same column grid the amount rows use, so each label sits over its column. */
  gridClassName: string
  /** Whether GST applies, which makes the GST % column required. */
  gstApplies: boolean
}

const Required = () => <span className="text-danger-600"> *</span>

/**
 * The labels of the amount rows, shown once above them instead of on every row (the rows then hold only inputs).
 * From the `sm` breakpoint up; below it the columns stack, so each row keeps its own labels there.
 */
export const LineColumnHeaders: React.FC<LineColumnHeadersProps> = ({ gridClassName, gstApplies }) => (
  <div className={cn('mb-1 hidden', gridClassName, 'sm:grid')} aria-hidden>
    <span className="ds-input-label">
      Amount
      <Required />
    </span>
    <span className="ds-input-label">
      GST %{gstApplies && <Required />}
    </span>
    <span className="ds-input-label">
      Expense
      <Required />
    </span>
    <span className="w-8" />
  </div>
)
