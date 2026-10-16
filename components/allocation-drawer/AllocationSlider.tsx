import React from 'react'
import * as RadixSlider from '@radix-ui/react-slider'
import { SplitShares } from './allocationMath'

const n = (value: number) => value.toLocaleString()

// Same colours as the stock bar's FBA pool, WFS pool, FBM and unassigned segments
const COLORS = { fba: '#93c5fd', wfs: '#a5b4fc', fbm: '#34d399', unassigned: '#fde68a' }

/**
 * Splits the new units three ways with two thumbs on one track:
 * FBA left of the first thumb, WFS between the thumbs, FBM right of the second.
 * It's controlled by the item's split, so numbers typed into the fields move the
 * thumbs, and dragging a thumb rewrites the numbers.
 */
export const AllocationSlider = ({
  itemId,
  shares,
  units,
  unassigned,
  onChange,
}: {
  itemId: string
  /** Current shares of the new units, from the split. */
  shares: SplitShares
  /** Units each bucket gets from the new units, as the fields show them. */
  units: { fba: number; wfs: number; fbm: number }
  /** New units not given to any bucket yet (typed numbers can leave some). */
  unassigned: number
  onChange: (shares: SplitShares) => void
}) => {
  const fbaEnd = shares.fba
  const wfsEnd = shares.fba + shares.wfs
  // Labels and the FBM part of the track follow the real units, so units nobody took yet show as unassigned
  const total = units.fba + units.wfs + units.fbm + Math.max(0, unassigned) || 1
  const pct = (u: number) => Math.round((u / total) * 100)
  const fbmEnd = Math.min(100, Math.max(wfsEnd, unassigned > 0 ? wfsEnd + pct(units.fbm) : 100))

  const move = ([first, second]: number[]) => onChange({ fba: first, wfs: second - first, fbm: 100 - second })

  return (
    <div className="flex flex-col gap-1.5">
      <RadixSlider.Root
        className="relative flex h-5 w-full touch-none select-none items-center"
        value={[fbaEnd, wfsEnd]}
        min={0}
        max={100}
        step={1}
        minStepsBetweenThumbs={0}
        onValueChange={move}
        aria-label={`FBA, WFS and FBM split for ${itemId}`}
      >
        <RadixSlider.Track
          className="relative h-2 grow overflow-hidden !rounded-full"
          style={{
            background: `linear-gradient(to right, ${COLORS.fba} 0 ${fbaEnd}%, ${COLORS.wfs} ${fbaEnd}% ${wfsEnd}%, ${COLORS.fbm} ${wfsEnd}% ${fbmEnd}%, ${COLORS.unassigned} ${fbmEnd}% 100%)`,
          }}
        >
          <RadixSlider.Range className="absolute h-full bg-transparent" />
        </RadixSlider.Track>
        {[
          { label: 'FBA and WFS boundary', key: 'fba' },
          { label: 'WFS and FBM boundary', key: 'fbm' },
        ].map((thumb) => (
          <RadixSlider.Thumb
            key={thumb.key}
            aria-label={thumb.label}
            className="block h-5 w-5 !rounded-full border-2 border-slate-700 bg-white shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
          />
        ))}
      </RadixSlider.Root>
      <div className="flex justify-between gap-3 text-[13px] font-medium">
        <span className="text-blue-800">
          FBA {pct(units.fba)}% · {n(units.fba)} units
        </span>
        <span className="text-indigo-800">
          WFS {pct(units.wfs)}% · {n(units.wfs)} units
        </span>
        <span className="text-emerald-800">
          FBM {pct(units.fbm)}% · {n(units.fbm)} units
        </span>
        {unassigned > 0 && <span className="text-amber-800">{n(unassigned)} unassigned</span>}
      </div>
    </div>
  )
}
