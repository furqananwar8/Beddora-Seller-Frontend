import { useState } from 'react'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import {
  useApprovePurchaseOrderMutation,
  useDeleteProcurementPurchaseOrderMutation,
  useMarkPurchaseOrderReadyToShipMutation,
  useRejectPurchaseOrderMutation,
  useSetPurchaseOrderLockedMutation,
  useSubmitPurchaseOrderMutation,
} from '@/services/api/procurement.api'

export type PoAction = 'approve' | 'reject' | 'submit' | 'delete' | 'unlock' | 'lock' | 'readyToShip'

interface PoRef {
  id: number
  poNo: string
}

const DONE: Record<PoAction, (poNo: string) => string> = {
  approve: (poNo) => `${poNo} approved and locked`,
  reject: (poNo) => `${poNo} rejected and sent back to draft`,
  submit: (poNo) => `${poNo} sent for approval`,
  delete: (poNo) => `${poNo} deleted`,
  unlock: (poNo) => `${poNo} unlocked for editing`,
  lock: (poNo) => `${poNo} locked`,
  readyToShip: (poNo) => `${poNo} marked Ready to ship`,
}

/**
 * Every action on a PO's lifecycle with its feedback: submit, approve / reject, delete a draft, unlock / lock an
 * approved PO. Shared by the PO list's row menu and the PO page. Each resolves true when it went through.
 */
export function usePoActions() {
  const [approveMutation] = useApprovePurchaseOrderMutation()
  const [rejectMutation] = useRejectPurchaseOrderMutation()
  const [submitMutation] = useSubmitPurchaseOrderMutation()
  const [deleteMutation] = useDeleteProcurementPurchaseOrderMutation()
  const [lockMutation] = useSetPurchaseOrderLockedMutation()
  const [readyToShipMutation] = useMarkPurchaseOrderReadyToShipMutation()
  const { success, failure } = useApiFeedback()
  const [busy, setBusy] = useState<{ id: number; action: PoAction } | null>(null)

  const run = async (po: PoRef, action: PoAction, call: () => Promise<unknown>): Promise<boolean> => {
    setBusy({ id: po.id, action })
    try {
      await call()
      success(DONE[action](po.poNo))
      return true
    } catch (error) {
      failure(error, action === 'readyToShip' ? `Could not mark ${po.poNo} Ready to ship` : `Could not ${action} ${po.poNo}`)
      return false
    } finally {
      setBusy(null)
    }
  }

  return {
    approve: (po: PoRef) => run(po, 'approve', () => approveMutation(po.id).unwrap()),
    reject: (po: PoRef, reason: string) => run(po, 'reject', () => rejectMutation({ id: po.id, reason }).unwrap()),
    submit: (po: PoRef) => run(po, 'submit', () => submitMutation(po.id).unwrap()),
    remove: (po: PoRef) => run(po, 'delete', () => deleteMutation(po.id).unwrap()),
    unlock: (po: PoRef) => run(po, 'unlock', () => lockMutation({ id: po.id, locked: false }).unwrap()),
    lock: (po: PoRef) => run(po, 'lock', () => lockMutation({ id: po.id, locked: true }).unwrap()),
    readyToShip: (po: PoRef) => run(po, 'readyToShip', () => readyToShipMutation(po.id).unwrap()),
    busy,
  }
}
