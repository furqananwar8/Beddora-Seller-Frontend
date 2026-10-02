import { useState } from 'react'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useApprovePurchaseOrderMutation, useRejectPurchaseOrderMutation } from '@/services/api/procurement.api'

type Decision = 'approve' | 'reject'

interface PoRef {
  id: number
  poNo: string
}

/** Approve / reject a PO with feedback. Shared by the PO list's row menu and the PO page's approval panel. */
export function usePoDecisions() {
  const [approveMutation] = useApprovePurchaseOrderMutation()
  const [rejectMutation] = useRejectPurchaseOrderMutation()
  const { success, failure } = useApiFeedback()
  const [busy, setBusy] = useState<{ id: number; decision: Decision } | null>(null)

  /** Resolves true when the decision went through. */
  const decide = async (po: PoRef, decision: Decision, reason?: string): Promise<boolean> => {
    setBusy({ id: po.id, decision })
    try {
      if (decision === 'approve') await approveMutation(po.id).unwrap()
      else await rejectMutation({ id: po.id, reason: reason ?? '' }).unwrap()
      success(decision === 'approve' ? `${po.poNo} approved and locked` : `${po.poNo} rejected`)
      return true
    } catch (error) {
      failure(error, `Could not ${decision} ${po.poNo}`)
      return false
    } finally {
      setBusy(null)
    }
  }

  return {
    approve: (po: PoRef) => decide(po, 'approve'),
    reject: (po: PoRef, reason: string) => decide(po, 'reject', reason),
    busy,
  }
}
