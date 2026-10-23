'use client'

import React from 'react'
import { Button } from '@/design-system/buttons'

interface SaveBarProps {
  changes: number
  skus: number
  saving: boolean
  onDiscard: () => void
  onSave: () => void
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** Sticks to the bottom of the screen so Save is always in reach while scrolling a long graph. */
export const SaveBar: React.FC<SaveBarProps> = ({ changes, skus, saving, onDiscard, onSave }) => (
  <div className="sticky bottom-0 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-sm">
    <span role="status" className={changes > 0 ? 'text-sm font-medium text-warning-700' : 'text-sm text-text-muted'}>
      {changes > 0 ? `${plural(changes, 'unsaved change')} on ${plural(skus, 'SKU')}` : 'All changes saved'}
    </span>
    <div className="flex gap-2">
      <Button type="button" variant="outline" size="sm" className="h-10" onClick={onDiscard} disabled={changes === 0 || saving}>
        Discard
      </Button>
      <Button type="button" size="sm" className="h-10" onClick={onSave} disabled={changes === 0 || saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
  </div>
)
