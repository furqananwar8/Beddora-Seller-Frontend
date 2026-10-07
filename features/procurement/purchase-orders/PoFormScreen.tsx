'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { Container } from '@/components/layout'
import { FormActions } from '@/components/form-actions/FormActions'
import { useRealtime } from '@/components/realtime/RealtimeProvider'
import { Switch } from '@/components/switch/Switch'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import {
  useCreateProcurementPurchaseOrderMutation,
  useGetProcurementPurchaseOrderQuery,
  useGetPurchaseOrderRemainingQuery,
  useSetPurchaseOrderOpenMutation,
  useUpdateProcurementPurchaseOrderMutation,
} from '@/services/api/procurement.api'
import { useAppSelector } from '@/store/hooks'
import { applyServerIssues } from '@/utils/apiErrors'
import { formatCalendarDay } from '@/utils/format'
import { isApprovedPo, isPackable, newPackagingListHref, PaymentBadge, PoStatusBadge, poPackagingListsHref, poPaymentRequestsHref } from '../shared/poMeta'
import { ApprovalPanel } from './ApprovalPanel'
import { emptyPoValues, fromDetail, fromRemaining, poFormSchema, toPoBody, type PoFormValues } from './poForm'
import { PoOrderDetailsSection, PoSupplierSection } from './PoDetailsSections'
import { PoProductsSection } from './PoProductsSection'
import { PoTimeline } from './PoTimeline'
import { usePoActions } from './usePoActions'

const LIST = '/dashboard/procurement/purchase-orders'

const FORM_FIELDS = new Set(['supplierId', 'contactName', 'destination', 'currency', 'productionDate', 'etd', 'lines'])
/** Server field names onto form paths (`supplierId` is the `supplier` picker, line products are their rows). */
const toFormField = (field: string) => (field === 'supplierId' ? 'supplier' : field.replace(/^lines\.(\d+)\.productId$/, 'lines.$1.unitsOrdered'))

const REALTIME_VERB: Record<string, string> = {
  approved: 'approved',
  rejected: 'rejected',
  updated: 'updated',
  submitted: 'submitted',
  unlocked: 'unlocked',
  locked: 'locked',
  closed: 'closed',
  reopened: 'reopened',
}

interface PoFormScreenProps {
  purchaseOrderId?: number
}

export const PoFormScreen: React.FC<PoFormScreenProps> = ({ purchaseOrderId }) => {
  const router = useRouter()
  const params = useSearchParams()
  const remainingOf = Number(params.get('fromRemaining')) || undefined
  const ability = useAppAbility()
  const canWrite = ability.can('write', 'procurement:purchase-orders')
  const me = Number(useAppSelector((state) => state.auth.user?.id))
  const { success, failure, info } = useApiFeedback()

  const { data: po, isLoading, isError } = useGetProcurementPurchaseOrderQuery(purchaseOrderId ?? 0, { skip: purchaseOrderId === undefined })
  const { data: remaining, isLoading: loadingRemaining, error: remainingError } = useGetPurchaseOrderRemainingQuery(remainingOf ?? 0, { skip: remainingOf === undefined || purchaseOrderId !== undefined })

  const form = useForm<PoFormValues>({ resolver: zodResolver(poFormSchema), defaultValues: emptyPoValues, mode: 'onTouched' })
  const { handleSubmit, reset, setError, formState } = form

  // Load the PO (or the remaining-units draft) into the form once per record
  const hydrated = useRef<string | null>(null)
  useEffect(() => {
    const key = po ? `po:${po.id}` : remaining ? `rem:${remaining.sourcePurchaseOrderId}` : null
    if (!key || hydrated.current === key) return
    hydrated.current = key
    reset(po ? fromDetail(po) : fromRemaining(remaining!))
  }, [po, remaining, reset])

  // Someone else acting on this PO: the page refetches on its own (SSE), this says who did what
  useRealtime('procurement.purchase-order', (message) => {
    const data = message.data as { id?: number; actorId?: number }
    if (!po || data.id !== po.id || data.actorId === me || !REALTIME_VERB[message.type]) return
    info(`${po.poNo} was just ${REALTIME_VERB[message.type]} by someone else.${message.type === 'approved' ? ' It is now locked.' : ''}`)
    if (message.type === 'updated') hydrated.current = null
  })

  const [createPo] = useCreateProcurementPurchaseOrderMutation()
  const [updatePo] = useUpdateProcurementPurchaseOrderMutation()
  const decisions = usePoActions()
  const [setOpen, { isLoading: toggling }] = useSetPurchaseOrderOpenMutation()
  const [saving, setSaving] = useState<'save' | 'submit' | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isNew = purchaseOrderId === undefined
  const editable = isNew ? canWrite : Boolean(po?.can.edit)
  const readOnly = !editable

  /** Saves the form; `submit` also sends a draft for approval. A saved draft without changes is just submitted. */
  const save = (submitForApproval: boolean) =>
    handleSubmit(async (values) => {
      if (po && submitForApproval && !formState.isDirty) {
        await decisions.submit(po)
        return
      }
      setSaving(submitForApproval ? 'submit' : 'save')
      try {
        const body = toPoBody(values, { sourcePurchaseOrderId: po?.source?.id ?? remaining?.sourcePurchaseOrderId, expectedUpdatedAt: po?.updatedAt, submit: submitForApproval })
        const saved = po ? await updatePo({ id: po.id, body }).unwrap() : await createPo(body).unwrap()
        const what = submitForApproval ? 'sent for approval' : po?.unlockedAt ? 'saved and locked again' : po ? 'saved' : 'saved as a draft'
        success(`${saved.poNo} ${what}`)
        if (po) {
          hydrated.current = null
        } else {
          router.replace(`${LIST}/${saved.id}`)
        }
      } catch (error) {
        const placed = applyServerIssues(error, (field, issue, options) => setError(toFormField(field) as never, issue, options), (field) => FORM_FIELDS.has(field.split('.')[0]))
        if (!placed) failure(error, 'Could not save the purchase order')
      } finally {
        setSaving(null)
      }
    })()

  const deleteDraft = async () => {
    if (po && (await decisions.remove(po))) router.push(LIST)
  }

  const changeOpen = async (isOpen: boolean) => {
    if (!po) return
    try {
      await setOpen({ id: po.id, isOpen }).unwrap()
      success(`${po.poNo} ${isOpen ? 'reopened' : 'closed'}`)
      setConfirmClose(false)
    } catch (error) {
      failure(error, `Could not ${isOpen ? 'reopen' : 'close'} the PO`)
    }
  }

  if ((purchaseOrderId && isLoading) || (isNew && remainingOf && loadingRemaining)) {
    return (
      <Container size="full" className="flex justify-center py-16">
        <Spinner />
      </Container>
    )
  }

  if ((purchaseOrderId && (isError || !po)) || (isNew && remainingOf && remainingError)) {
    return (
      <Container size="full" className="py-16 text-center">
        <p className="font-medium text-text-primary">{isNew ? 'There are no remaining units to move from that PO.' : 'This purchase order could not be found.'}</p>
        <Link href={LIST} className="mt-2 inline-block text-sm text-primary-600 hover:underline">
          Back to purchase orders
        </Link>
      </Container>
    )
  }

  const title = po?.poNo ?? (remaining ? `New PO from ${remaining.sourcePoNo}` : 'New purchase order')
  const fromSource = po?.source ?? (remaining ? { id: remaining.sourcePurchaseOrderId, poNo: remaining.sourcePoNo } : null)

  return (
    <Container size="full" className="py-4 sm:py-8">
      <form onSubmit={(event) => (event.preventDefault(), void save(false))} noValidate className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-text-primary sm:text-2xl">{title}</h1>
              {po && <PoStatusBadge status={po.status} />}
              {po && <PaymentBadge payment={po.payment} withPercent />}
              {po && isApprovedPo(po) && (
                <Link href={poPackagingListsHref(po.id)} className="text-sm font-medium text-primary-600 underline-offset-2 hover:underline">
                  View packaging lists
                </Link>
              )}
              {po && isPackable(po) && ability.can('write', 'procurement:packaging-lists') && (
                <Link href={newPackagingListHref(po.id)} className="text-sm font-medium text-primary-600 underline-offset-2 hover:underline">
                  + Create packaging list
                </Link>
              )}
              {po && ability.can('read', 'finance:payment-request') && (
                <Link href={poPaymentRequestsHref(po.id)} className="text-sm font-medium text-primary-600 underline-offset-2 hover:underline">
                  View payment requests ({po.payment.requestCount})
                </Link>
              )}
            </div>
            {fromSource && (
              <p className="text-xs text-text-muted">
                Takes over units left on{' '}
                <Link href={`${LIST}/${fromSource.id}`} className="text-primary-600 hover:underline">
                  {fromSource.poNo}
                </Link>
              </p>
            )}
          </div>
          {po && (
            <div className="flex items-center">
              <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <Switch
                  checked={po.isOpen}
                  disabled={!po.can.toggleOpen || toggling}
                  onCheckedChange={(next) => (next ? void changeOpen(true) : setConfirmClose(true))}
                  aria-label="PO open"
                />
                PO open
              </label>
            </div>
          )}
        </div>

        {po && po.status === 'PENDING_APPROVAL' && (
          <ApprovalPanel
            po={po}
            busy={decisions.busy?.action === 'approve' || decisions.busy?.action === 'reject' ? decisions.busy.action : null}
            onApprove={() => void decisions.approve(po)}
            onReject={(reason) => void decisions.reject(po, reason)}
          />
        )}
        {po && po.status === 'DRAFT' && po.rejectionReason && (
          <p role="status" className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
            <strong>Rejected by {po.decidedBy?.name ?? 'an approver'}:</strong> “{po.rejectionReason}”. It is back in draft: update it and submit it for approval again.
          </p>
        )}

        <PoSupplierSection form={form} readOnly={readOnly} supplierLocked={Boolean(fromSource)} />
        <PoOrderDetailsSection form={form} readOnly={readOnly} />
        <PoProductsSection form={form} readOnly={readOnly} fixedProducts={Boolean(fromSource)} />

        {po && isApprovedPo(po) && po.unlockedAt && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning-500 bg-warning-50 px-4 py-3 text-sm text-warning-700">
            <p>
              <strong>Unlocked for editing</strong> by {po.unlockedBy?.name ?? 'an approver'} on {formatCalendarDay(po.unlockedAt)}. Saving your changes locks it again; it stays approved.
            </p>
            {po.can.lock && (
              <Button type="button" size="sm" variant="outline" isLoading={decisions.busy?.action === 'lock'} onClick={() => void decisions.lock(po)}>
                Lock without changes
              </Button>
            )}
          </div>
        )}

        {po && isApprovedPo(po) && !po.unlockedAt && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary-50 px-4 py-3 text-sm">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <p className="font-semibold text-text-primary">Locked once approved</p>
              <p className="text-text-muted">
                Every field is read-only until an approver unlocks it. For leftover units, close this PO and use “Create PO from remaining”.
                {po.can.createFromRemaining && (
                  <>
                    {' '}
                    <Link href={`${LIST}/new?fromRemaining=${po.id}`} className="font-medium text-primary-600 hover:underline">
                      Create PO from remaining ({po.remainingForNewPo.toLocaleString('en-CA')} units)
                    </Link>
                  </>
                )}
              </p>
            </div>
            {po.can.unlock && (
              <Button type="button" size="sm" variant="outline" className="ml-auto shrink-0" isLoading={decisions.busy?.action === 'unlock'} onClick={() => void decisions.unlock(po)}>
                Unlock for editing
              </Button>
            )}
          </div>
        )}

        {po && <PoTimeline events={po.events} />}

        <FormActions>
          {po?.can.delete && (
            <Button type="button" variant="danger" className="sm:mr-auto" onClick={() => setConfirmDelete(true)} disabled={Boolean(saving)}>
              Delete draft
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => router.push(LIST)} disabled={Boolean(saving)}>
            {readOnly ? 'Back' : 'Cancel'}
          </Button>
          {editable && (isNew || po?.status === 'DRAFT') && (
            <>
              <Button type="button" variant="outline" isLoading={saving === 'save'} disabled={Boolean(saving) || (!isNew && !formState.isDirty)} onClick={() => void save(false)}>
                Save draft
              </Button>
              <Button type="button" isLoading={saving === 'submit' || decisions.busy?.action === 'submit'} disabled={Boolean(saving)} onClick={() => void save(true)}>
                {po?.rejectionReason ? 'Resubmit for approval' : 'Submit for approval'}
              </Button>
            </>
          )}
          {editable && !isNew && po?.status !== 'DRAFT' && (
            <Button type="submit" isLoading={saving === 'save'} disabled={Boolean(saving) || !formState.isDirty}>
              {po?.unlockedAt ? 'Save & lock' : 'Save'}
            </Button>
          )}
        </FormActions>
      </form>

      <ConfirmDialog
        isOpen={confirmDelete}
        title={`Delete ${po?.poNo ?? 'draft'}`}
        confirmLabel="Delete draft"
        tone="danger"
        busy={decisions.busy?.action === 'delete'}
        onConfirm={() => void deleteDraft()}
        onClose={() => setConfirmDelete(false)}
      >
        <p>This draft is deleted for good, with its lines and timeline.</p>
      </ConfirmDialog>

      <ConfirmDialog isOpen={confirmClose} title={`Close ${po?.poNo ?? 'PO'}`} confirmLabel="Close PO" tone="danger" busy={toggling} onConfirm={() => void changeOpen(false)} onClose={() => setConfirmClose(false)}>
        <p>A closed PO takes no new packaging lists or payments and stops ETD reminders. Units not packed yet can move to a new PO with “Create PO from remaining”.</p>
      </ConfirmDialog>
    </Container>
  )
}
