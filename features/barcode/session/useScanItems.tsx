'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { ScanItemsDialog } from './ScanItemsDialog'
import type { ScanTarget } from './scanSession'

/** One way for any screen to offer "Scan items" on a record: call open(target) from the row menu, render dialog once. */
export function useScanItems(): { open: (target: ScanTarget) => void; dialog: ReactNode } {
  const [target, setTarget] = useState<ScanTarget | null>(null)
  const close = useCallback(() => setTarget(null), [])
  return { open: setTarget, dialog: target ? <ScanItemsDialog target={target} onClose={close} /> : null }
}
