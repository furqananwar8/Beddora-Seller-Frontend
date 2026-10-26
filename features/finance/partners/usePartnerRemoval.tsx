'use client'

import React, { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { useDeletePartnerMutation, useDeletePartnersMutation, type PartnerListItem } from '@/services/api/finance.api'
import { useFinanceFeedback } from '../shared/useFinanceFeedback'

type Pending = { kind: 'one'; partner: Pick<PartnerListItem, 'id' | 'name'> } | { kind: 'many'; ids: number[] }

/**
 * Deleting one partner (row action) or several (checkboxes), each behind a confirm. Partners with history
 * (requests, orders, invoices, quotes) are kept by the server; the result says which and why.
 */
export function usePartnerRemoval(onRemoved?: (ids: number[]) => void) {
  const { success, failure, info } = useFinanceFeedback()
  const [deleteOne, one] = useDeletePartnerMutation()
  const [deleteMany, many] = useDeletePartnersMutation()
  const [pending, setPending] = useState<Pending | null>(null)
  const busy = one.isLoading || many.isLoading

  const confirm = async () => {
    if (!pending) return
    try {
      if (pending.kind === 'one') {
        await deleteOne(pending.partner.id).unwrap()
        success(`${pending.partner.name} deleted`)
        onRemoved?.([pending.partner.id])
      } else {
        const { removed, skipped } = await deleteMany(pending.ids).unwrap()
        if (removed.length) success(`${removed.length} partner${removed.length === 1 ? '' : 's'} deleted`)
        skipped.forEach((partner) => info(partner.reason))
        onRemoved?.(removed)
      }
    } catch (error) {
      failure(error, 'Could not delete')
    } finally {
      setPending(null)
    }
  }

  const dialog = (
    <ConfirmDialog
      isOpen={pending !== null}
      title={pending?.kind === 'many' ? `Delete ${pending.ids.length} partners` : 'Delete partner'}
      confirmLabel="Delete"
      tone="danger"
      busy={busy}
      onConfirm={confirm}
      onClose={() => setPending(null)}
    >
      {pending?.kind === 'one' ? (
        <>
          Delete <strong>{pending.partner.name}</strong>?
        </>
      ) : (
        `Delete the ${pending?.ids.length ?? 0} selected partners?`
      )}{' '}
      Partners with payment requests, purchase orders, invoices or price quotes are kept.
    </ConfirmDialog>
  )

  return {
    askOne: (partner: Pick<PartnerListItem, 'id' | 'name'>) => setPending({ kind: 'one', partner }),
    askMany: (ids: number[]) => ids.length && setPending({ kind: 'many', ids }),
    dialog,
  }
}
