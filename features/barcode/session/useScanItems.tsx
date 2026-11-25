'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useGetScanLocksQuery, useLazyGetScanSourceQuery } from '@/services/api/barcode.api'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { ScanItemsDialog } from './ScanItemsDialog'
import type { ScanTarget } from './scanSession'

/** How often the Scan items buttons learn that someone started or ended a session. */
const LOCKS_REFRESH_MS = 15_000

/**
 * One way for any screen to offer "Scan items" on a record: call open(target) from the row menu, render dialog once.
 * lockedBy(target) is the name of the person who has the record open for scanning (null when it is free or the
 * session is yours), so the button can say "Locked by Ayesha Khan" and stay disabled.
 */
export function useScanItems(): { open: (target: ScanTarget) => Promise<void>; dialog: ReactNode; lockedBy: (target: ScanTarget) => string | null } {
  const [target, setTarget] = useState<ScanTarget | null>(null)
  const close = useCallback(() => setTarget(null), [])
  const feedback = useApiFeedback()
  const [loadSource] = useLazyGetScanSourceQuery()
  // Check the stock first: with nothing to take from, no dialog opens and no session starts
  const open = useCallback(
    async (t: ScanTarget) => {
      const { data } = await loadSource(t)
      if (data?.allocationShortfall) feedback.error(data.allocationShortfall)
      else setTarget(t)
    },
    [loadSource, feedback]
  )
  const { data: locks } = useGetScanLocksQuery(undefined, { pollingInterval: LOCKS_REFRESH_MS })

  const held = useMemo(() => new Map((locks ?? []).filter((l) => !l.mine && l.live).map((l) => [`${l.scenario}:${l.sourceId}`, l.by.name ?? 'another user'])), [locks])
  const lockedBy = useCallback((t: ScanTarget) => held.get(`${t.scenario}:${t.sourceId}`) ?? null, [held])

  return { open, lockedBy, dialog: target ? <ScanItemsDialog target={target} onClose={close} /> : null }
}
