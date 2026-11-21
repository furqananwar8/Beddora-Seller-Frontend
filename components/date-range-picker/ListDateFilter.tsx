'use client'

import React, { useEffect, useState } from 'react'
import DateRangePicker, { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { LIST_DATE_PRESETS } from '@/utils/dateRangeFilter'

interface ListDateFilterProps {
  value: DateRangeValue
  onApply: (range: DateRangeValue) => void
}

/** Date filter for list screens: presets apply at once, a custom range waits for its Apply button. */
export const ListDateFilter: React.FC<ListDateFilterProps> = ({ value, onApply }) => {
  const [draft, setDraft] = useState<DateRangeValue>(value)
  useEffect(() => setDraft(value), [value])
  const isCustom = draft.presetId === 'custom'

  return (
    <div className="w-full min-w-0 sm:w-56">
      <div className="w-full [&>div]:block [&>div]:w-full [&>div>button]:h-10 [&>div>button]:w-full [&>div>button]:py-0 [&>div>button>span]:flex-1 [&>div>button>span]:text-left">
        <DateRangePicker
          presets={LIST_DATE_PRESETS}
          value={draft}
          placement="right"
          placeholder="All time"
          keepOpenPresetIds={['custom']}
          applyAction={
            isCustom
              ? { label: 'Apply', disabled: !draft.startDate || !draft.endDate, onApply: () => onApply({ ...draft, presetId: 'custom' }) }
              : undefined
          }
          onChange={(range) => {
            setDraft(range)
            if (range.presetId && range.presetId !== 'custom') onApply(range)
          }}
        />
      </div>
    </div>
  )
}
