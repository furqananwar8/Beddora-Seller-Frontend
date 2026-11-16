'use client'

import { useState } from 'react'
import { useAppAbility } from '@/hooks/useAppAbility'
import { ManualReturnModal } from './manual-return/ManualReturnModal'
import { ManualReturnsList } from './manual-return/ManualReturnsList'

export function ManualReturnsScreen() {
  const canEnter = useAppAbility().can('write', 'barcode:manual-returns')
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-5 px-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Manual Returns</h1>
        <p className="text-sm text-text-muted">Returns entered by hand because the returned product matched nothing by UPC. Their units were added back to inventory when they were saved.</p>
      </div>
      <ManualReturnsList onAdd={canEnter ? () => setOpen(true) : undefined} />
      {open && <ManualReturnModal onClose={() => setOpen(false)} />}
    </div>
  )
}
