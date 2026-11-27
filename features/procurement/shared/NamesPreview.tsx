'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Modal } from '@/design-system/modals'
import { cn } from '@/utils/cn'

export interface PreviewItem {
  label: string
  /** When set, the entry opens this page in a new tab. */
  href?: string
}

interface NamesPreviewProps {
  items: ReadonlyArray<PreviewItem>
  /** What the items are, for the modal's title ("Suppliers"). */
  title: string
  /** How many show in the cell before the rest go behind the button. */
  max?: number
  itemClassName?: string
}

const Entry: React.FC<{ item: PreviewItem }> = ({ item }) =>
  item.href ? (
    <Link href={item.href} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline-offset-2 hover:underline">
      {item.label}
    </Link>
  ) : (
    <>{item.label}</>
  )

/** A short list in a table cell: the first few one per line, the rest behind a "Show N more" button that opens them all, so the column never grows. */
export const NamesPreview: React.FC<NamesPreviewProps> = ({ items, title, max = 3, itemClassName }) => {
  const [open, setOpen] = useState(false)
  if (items.length === 0) return <span>—</span>
  const extra = items.length - max
  return (
    <>
      <div className="flex flex-col items-center gap-0.5">
        {items.slice(0, max).map((item, index) => (
          <span key={`${item.label}-${index}`} className={cn('max-w-full break-words', itemClassName)}>
            <Entry item={item} />
          </span>
        ))}
        {extra > 0 && (
          <button type="button" className="w-fit text-xs font-medium text-primary-600 underline underline-offset-2 hover:text-primary-700" onClick={() => setOpen(true)}>
            Show {extra} more
          </button>
        )}
      </div>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={`${title} (${items.length})`} size="sm" closeOnBackdropClick closeOnEscape>
        <ul className={cn('flex max-h-[60vh] flex-col gap-1 overflow-y-auto text-sm', itemClassName)}>
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`}>
              <Entry item={item} />
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}
