import React, { useState } from 'react'
import { Slider } from '@/design-system/inputs/Slider'
import { DEFAULT_FBA_PERCENT } from './allocationMath'

const n = (value: number) => value.toLocaleString()

/**
 * Splits the new units by percentage: left gives FBM more, right gives FBA more.
 * The slider only drives the split; the FBA/FBM number fields stay editable.
 */
export const AllocationSlider = ({
  itemId,
  newUnits,
  onChange,
}: {
  itemId: string
  newUnits: number
  onChange: (fbaPercent: number) => void
}) => {
  const [fbaPercent, setFbaPercent] = useState(DEFAULT_FBA_PERCENT)
  const fbaUnits = Math.round((newUnits * fbaPercent) / 100)

  const move = (value: number) => {
    setFbaPercent(value)
    onChange(value)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Slider aria-label={`FBM to FBA split for ${itemId}`} value={fbaPercent} onValueChange={move} />
      <div className="flex justify-between text-[13px] font-medium">
        <span className="text-emerald-800">
          FBM {100 - fbaPercent}% · {n(newUnits - fbaUnits)} units
        </span>
        <span className="text-blue-800">
          FBA {fbaPercent}% · {n(fbaUnits)} units
        </span>
      </div>
    </div>
  )
}
