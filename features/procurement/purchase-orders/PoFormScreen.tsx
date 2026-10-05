'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { Container } from '@/components/layout'
import { useRealtime } from '@/components/realtime/RealtimeProvider'
import { Switch } from '@/components/switch/Switch'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import {
  useCreatePurchaseOrderMutation,
  useGetPurchaseOrderQuery,
  useGetPurchaseOrderRemainingQuery,
  useSetPurchaseOrderOpenMutation,
  useUpdatePurchaseOrderMutation,
} from '@/services/api/procurement.api'
import { useAppSelector } from '@/store/hooks'
import { applyServerIssues } from '@/utils/apiErrors'
import { PaymentBadge, PoStatusBadge, poPaymentRequestsHref } from '../shared/poMeta'
import { ApprovalPanel } from './ApprovalPanel'
import { emptyPoValues, fromDetail, fromRemaining, poFormSchema, toPoBody, type PoFormValues } from './poForm'
import { PoOrderDetailsSection, PoSupplierSection } from './PoDetailsSections'
import { PoProductsSection } from './PoProductsSection'
import { PoTimeline } from './PoTimeline'
import { usePoDecisions } from './usePoDecisions'

const LIST = '/dashboard/procurement/purchase-orders'

const FORM_FIELDS = new Set(['supplierId', 'contactName', 'destination', 'currency', 'productionDate', 'etd', 'cartonLength', 'cartonWidth', 'cartonHeight', 'masterCartons', 'lines'])
/** Server field names onto form paths (`supplierId` is the `supplier` picker, line products are their rows). */
const toFormField = (field: string) => (field === 'supplierId' ? 'supplier' : field.replace(/^lines\.(\d+)\.productId$/, 'lines.$1.unitsOrdered'))

const REALTIME_VERB: Record<string, string> = { approved: 'approved', rejected: 'rejected', updated: 'updated', closed: 'closed', reopened: 'reopened' }

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

  const { data: po, isLoading, isError } = useGetPurchaseOrderQuery(purchaseOrderId ?? 0, { skip: purchaseOrderId === undefined })
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

  const [createPo] = useCreatePurchaseOrderMutation()
  const [updatePo] = useUpdatePurchaseOrderMutation()
  const decisions = usePoDecisions()
  const [setOpen, { isLoading: toggling }] = useSetPurchaseOrderOpenMutation()
  const [saving, setSaving] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)

  const isNew = purchaseOrderId === undefined
  const editable = isNew ? canWrite : Boolean(po?.can.edit)
  const readOnly = !editable

  const submit = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const body = toPoBody(values, { sourcePurchaseOrderId: po?.source?.id ?? remaining?.sourcePurchaseOrderId, expectedUpdatedAt: po?.updatedAt })
      const saved = po ? await updatePo({ id: po.id, body }).unwrap() : await createPo(body).unwrap()
      success(po ? `${saved.poNo} saved${po.rejectionReason ? ' and sent for approval again' : ''}` : `${saved.poNo} created and sent for approval`)
      if (po) {
        hydrated.current = null
      } else {
        router.replace(`${LIST}/${saved.id}`)
      }
    } catch (error) {
      const placed = applyServerIssues(error, (field, issue, options) => setError(toFormField(field) as never, issue, options), (field) => FORM_FIELDS.has(field.split('.')[0]))
      if (!placed) failure(error, 'Could not save the purchase order')
    } finally {
      setSaving(false)
    }
  })

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
      <form onSubmit={submit} noValidate className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="text-sm text-text-muted">
              <Link href={LIST} className="text-primary-600 hover:underline">
                Purchase orders
              </Link>
              <span> / {po?.poNo ?? 'New'}</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-text-primary sm:text-2xl">{title}</h1>
              {po && <PoStatusBadge status={po.status} />}
              {po && <PaymentBadge payment={po.payment} withPercent />}
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
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            {po && (
              <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <Switch
                  checked={po.isOpen}
                  disabled={!po.can.toggleOpen || toggling}
                  onCheckedChange={(next) => (next ? void changeOpen(true) : setConfirmClose(true))}
                  aria-label="PO open"
                />
                PO open
              </label>
            )}
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => router.push(LIST)} disabled={saving}>
              {readOnly ? 'Back' : 'Cancel'}
            </Button>
            {editable && (
              <Button type="submit" className="flex-1 sm:flex-none" isLoading={saving} disabled={!formState.isDirty && Boolean(po) && !po?.rejectionReason}>
                {isNew ? 'Create PO' : 'Save'}
              </Button>
            )}
          </div>
        </div>

        {po && po.status === 'PENDING_APPROVAL' && <ApprovalPanel po={po} busy={decisions.busy?.decision ?? null} onApprove={() => void decisions.approve(po)} onReject={(reason) => void decisions.reject(po, reason)} />}

        <PoSupplierSection form={form} readOnly={readOnly} supplierLocked={Boolean(fromSource)} />
        <PoOrderDetailsSection form={form} readOnly={readOnly} />
        <PoProductsSection form={form} readOnly={readOnly} fixedProducts={Boolean(fromSource)} />

        {po && po.status !== 'PENDING_APPROVAL' && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary-50 px-4 py-3 text-sm">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <p className="font-semibold text-text-primary">Locked once approved</p>
              <p className="text-text-muted">
                Every field is read-only for good. For a quantity change, close this PO and use “Create PO from remaining”, or raise a new PO.
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
          </div>
        )}

        {po && <PoTimeline events={po.events} />}
      </form>

      <ConfirmDialog isOpen={confirmClose} title={`Close ${po?.poNo ?? 'PO'}`} confirmLabel="Close PO" tone="danger" busy={toggling} onConfirm={() => void changeOpen(false)} onClose={() => setConfirmClose(false)}>
        <p>A closed PO takes no new packaging lists or payments and stops ETD reminders. Units not packed yet can move to a new PO with “Create PO from remaining”.</p>
      </ConfirmDialog>
    </Container>
  )
}
