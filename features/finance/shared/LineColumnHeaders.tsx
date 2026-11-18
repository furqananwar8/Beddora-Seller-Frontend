import React from 'react'
import { cn } from '@/utils/cn'

interface LineColumnHeadersProps {
  /** The same column grid the amount rows use, so each label sits over its column. */
  gridClassName: string
  /** Whether GST applies, which makes the GST % column required. */
  gstApplies: boolean
  /** Whether each row has its own GST amount field, which adds a column after the GST %. */
  showGstAmount?: boolean
  /** Whether each amount has a percentage box beside it (purchase-order requests), which gets its own label over it. */
  showPercent?: boolean
}

const Required = () => <span className="text-danger-600"> *</span>

/**
 * The labels of the amount rows, shown once above them instead of on every row (the rows then hold only inputs).
 * From the `sm` breakpoint up; below it the columns stack, so each row keeps its own labels there.
 */
export const LineColumnHeaders: React.FC<LineColumnHeadersProps> = ({ gridClassName, gstApplies, showGstAmount = false, showPercent = false }) => (
  <div className={cn('mb-1 hidden', gridClassName, 'sm:grid')} aria-hidden>
    {/* The percentage box is as wide as in the rows (PoPercentAmountInput), so its label sits over it */}
    <span className="flex gap-2">
      <span className="ds-input-label min-w-0 flex-1">
        Amount
        <Required />
      </span>
      {showPercent && <span className="ds-input-label w-[5.5rem] shrink-0">Percentage</span>}
    </span>
    <span className="ds-input-label">
      GST %{gstApplies && <Required />}
    </span>
    {showGstAmount && <span className="ds-input-label">GST amount</span>}
    <span className="ds-input-label">
      Expense
      <Required />
    </span>
    <span className="w-8" />
  </div>
)
