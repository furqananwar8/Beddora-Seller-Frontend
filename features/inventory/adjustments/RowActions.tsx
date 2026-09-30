import React, { useRef, useState } from 'react'
import { FloatingMenu } from '../shipments/ShipmentParts'

export type AdjustmentAction = 'dimensions' | 'quantity'

const ACTIONS: { action: AdjustmentAction; label: string }[] = [
  { action: 'dimensions', label: 'Edit box dimensions' },
  { action: 'quantity', label: 'Edit quantity' },
]

/** Three-dot menu for one adjustments row. */
export const RowActions: React.FC<{ label: string; onSelect: (action: AdjustmentAction) => void }> = ({ label, onSelect }) => {
  const anchor = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        ref={anchor}
        type="button"
        aria-label={`Actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-md p-1.5 text-text-muted hover:bg-secondary-100 hover:text-text-primary"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>
      <FloatingMenu anchorRef={anchor} open={open} onClose={() => setOpen(false)}>
        {ACTIONS.map(({ action, label: text }) => (
          <button
            key={action}
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onSelect(action)
            }}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-secondary-50"
          >
            {text}
          </button>
        ))}
      </FloatingMenu>
    </>
  )
}
