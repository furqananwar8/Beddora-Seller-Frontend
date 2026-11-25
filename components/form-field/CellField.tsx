import React from 'react'
import { cn } from '@/utils/cn'

/**
 * A table-cell input with a note (error or hint) under it. A hidden copy of the note above keeps the input level with
 * the row's other vertically centred cells, so the input does not jump when a note appears.
 */
export const CellField: React.FC<{ error?: string; hint?: string; children: React.ReactNode }> = ({ error, hint, children }) => {
  const note = error ?? hint
  return (
    <>
      {note && <p aria-hidden className="invisible mb-1 text-xs">{note}</p>}
      {children}
      {note && <p className={cn('mt-1 text-xs', error ? 'text-danger-600' : 'text-text-muted')}>{note}</p>}
    </>
  )
}
