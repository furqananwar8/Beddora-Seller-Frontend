'use client'

import React, { useRef, useState } from 'react'
import { FloatingMenu } from '@/features/inventory/shipments/ShipmentParts'
import { cn } from '@/utils/cn'

export interface RowActionItem {
  key: string
  label: string
  onSelect: () => void
  disabled?: boolean
  /** Shown under the label when the item is disabled, so users know what unlocks it. */
  disabledReason?: string
  tone?: 'default' | 'danger'
}

interface RowActionsMenuProps {
  /** Names the row for screen readers, e.g. "Doc#12". */
  label: string
  items: RowActionItem[]
}

/** Three-dot button that opens a floating menu of row actions. The menu escapes the table's scroll container. */
export const RowActionsMenu: React.FC<RowActionsMenuProps> = ({ label, items }) => {
  const anchor = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <button
        ref={anchor}
        type="button"
        aria-label={`Actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="rounded-md p-1.5 text-text-muted hover:bg-secondary-100 hover:text-text-primary"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>
      <FloatingMenu anchorRef={anchor} open={open} onClose={() => setOpen(false)}>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              setOpen(false)
              item.onSelect()
            }}
            className={cn(
              'block w-full px-3 py-2 text-left text-sm hover:bg-secondary-50 disabled:cursor-not-allowed disabled:text-text-subtle disabled:hover:bg-transparent',
              item.tone === 'danger' && !item.disabled && 'text-danger-600'
            )}
          >
            {item.label}
            {item.disabled && item.disabledReason && <span className="mt-0.5 block text-xs font-normal text-text-subtle">{item.disabledReason}</span>}
          </button>
        ))}
      </FloatingMenu>
    </div>
  )
}
