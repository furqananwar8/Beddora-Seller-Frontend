'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Container } from '@/components/layout'
import { FileDropzone } from '@/components/file-dropzone/FileDropzone'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { Button } from '@/design-system/buttons'
import { Select } from '@/design-system/inputs'
import { SelectShell } from '../shared/SelectShell'
import { Spinner } from '@/design-system/loaders'
import {
  FinanceDocument,
  PartnerOption,
  PaymentRequestDetail,
  useAddRequestDocumentsMutation,
  useCreatePaymentRequestMutation,
  useGetLeafCostCentersQuery,
  useGetFinanceMarketplacesQuery,
  useGetPartnerQuery,
  useGetPayablePurchaseOrdersQuery,
  useGetPaymentRequestQuery,
  useLazyCheckDuplicateInvoiceQuery,
  useLazyCheckPurchaseInvoiceQuery,
  type PayablePurchaseOrder,
  type PurchaseInvoiceForPayment,
  type DuplicateInvoice,
  type ReferenceType,
  useRemoveRequestDocumentMutation,
  useSubmitPaymentRequestMutation,
  useUpdatePaymentRequestMutation,
} from '@/services/api/finance.api'
import { useGetProcurementPurchaseOrderQuery, type ContainerItem } from '@/services/api/procurement.api'
import { FormField } from '../shared/FormField'
import { FormSection as Section } from '../shared/FormSection'
import { currencyOptions } from '../shared/currency'
import { formatCurrencyAmount, formatRequestNo, toDateInputValue } from '../shared/format'
import { REQUEST_STATUS_META } from '../shared/statusMeta'
import { useFinanceFeedback } from '../shared/useFinanceFeedback'
import { DocumentChips } from '../shared/DocumentChips'
import { PartnerChips, PartnerSelect, toPartnerOption, withPartnerDetail } from './PartnerSelect'
import { PartnerPaymentInfo } from './PartnerPaymentInfo'
import { PayablePoSelect } from './PayablePoSelect'
import { PayableInvoiceSelect } from './PayableInvoiceSelect'
import { FxConversionNote } from '../shared/FxConversionNote'
import { ContainerSelect, containerRefOf } from './ContainerSelect'
import { RequestLinesSection } from './RequestLinesSection'
import { clearRequestDraft, peekRequestDraft, saveRequestDraft, withQueryParam } from './requestDraftStore'
import {
  PaymentRequestFormValues,
  PoLimit,
  REFERENCE_OPTIONS,
  emptyFormValues,
  filesFormData,
  linesFromDetail,
  makePaymentRequestSchema,
  requestTotal,
  toCreateFormData,
  toUpdateBody,
} from './schema'

const LIST_URL = '/dashboard/finance/payment-request'
const NEW_URL = `${LIST_URL}/new`
const PO_URL = '/dashboard/procurement/purchase-orders'

const positiveParam = (value: string | null): number | null => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const toFormValues = (detail: PaymentRequestDetail): PaymentRequestFormValues => ({
  partnerId: String(detail.partner.id),
  referenceType: detail.referenceType,
  invoiceNo: detail.invoiceNo ?? '',
  purchaseOrder: detail.purchaseOrder,
  invoiceDate: toDateInputValue(detail.invoiceDate),
  dueDate: detail.dueDate ? toDateInputValue(detail.dueDate) : '',
  containerNo: detail.containerNo ?? '',
  marketplaceId: detail.marketplaceId ? String(detail.marketplaceId) : '',
  currency: detail.currency,
  lines: linesFromDetail(detail),
  remarks: detail.remarks ?? '',
})

const limitOf = (po: PayablePurchaseOrder): PoLimit => ({ currency: po.currency, amount: po.amount, leftToRequest: po.leftToRequest })

/**
 * Raise or edit a payment request (`?edit=`). Opened from a purchase order (`?purchaseOrderId=`), it starts as a
 * request against that PO: its supplier, currency and destination, which then cannot change. Paying one of our
 * purchase invoices locks them the same way, to the invoice's.
 */
export const PaymentRequestFormScreen: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = positiveParam(searchParams.get('edit'))
  const { success, failure } = useFinanceFeedback()
  const newPartnerId = positiveParam(searchParams.get('partnerId'))
  /** Opened from a purchase order: prefill it, and "Back" returns there. */
  const fromPoId = editId === null ? positiveParam(searchParams.get('purchaseOrderId')) : null
  const wantsRestore = newPartnerId !== null || searchParams.get('restore') === '1'
  // Peek (not take) so a dev double-mount cannot lose it; it is cleared once applied.
  const [draft] = useState(() => (wantsRestore ? peekRequestDraft() : null))
  const [restored, setRestored] = useState(draft === null)

  const [savedId, setSavedId] = useState<number | null>(null)
  const requestId = editId ?? savedId
  const { data: detail, isLoading: loadingDetail, isError: detailError } = useGetPaymentRequestQuery(requestId ?? 0, { skip: requestId === null })

  const { data: costCenters, isFetching: loadingCostCenters } = useGetLeafCostCentersQuery()
  const { data: marketplaces } = useGetFinanceMarketplacesQuery()
  const [checkDuplicate] = useLazyCheckDuplicateInvoiceQuery()
  const [checkPurchaseInvoice] = useLazyCheckPurchaseInvoiceQuery()
  const [createRequest] = useCreatePaymentRequestMutation()
  const [updateRequest] = useUpdatePaymentRequestMutation()
  const [addDocuments] = useAddRequestDocumentsMutation()
  const [removeDocument] = useRemoveRequestDocumentMutation()
  const [submitRequest] = useSubmitPaymentRequestMutation()

  /** The picked purchase order with its open balance, which caps the request (resolved per submit). */
  const [pickedPo, setPickedPo] = useState<PayablePurchaseOrder | null>(null)
  const poLimit = pickedPo ? limitOf(pickedPo) : null

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<PaymentRequestFormValues>({
    resolver: (values, context, options) => zodResolver(makePaymentRequestSchema(poLimit))(values, context, options),
    defaultValues: emptyFormValues,
  })

  const [partner, setPartner] = useState<PartnerOption | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | undefined>()
  const [duplicate, setDuplicate] = useState<(DuplicateInvoice & { invoiceNo: string }) | null>(null)
  /** The invoice number is one of our purchase invoices: shown, and blocking when it cannot be paid yet. */
  const [purchaseInvoice, setPurchaseInvoice] = useState<PurchaseInvoiceForPayment | null>(null)
  const [saving, setSaving] = useState<'draft' | 'submit' | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const uploadedCount = useRef(0)
  const hydrated = useRef(false)

  // A partner set from another record (a PO, a saved request) lacks its payment details until its full record loads
  const needsDetail = partner !== null && !partner.paymentDetails
  const { data: partnerDetail } = useGetPartnerQuery(partner?.id ?? 0, { skip: !needsDetail })
  const shownPartner: PartnerOption | null = partner && needsDetail ? withPartnerDetail(partner, partnerDetail) : partner

  const currency = watch('currency')
  const referenceType = watch('referenceType')
  const purchaseOrder = watch('purchaseOrder')
  const containerNo = watch('containerNo')
  const byPurchaseOrder = referenceType === 'PURCHASE_ORDER'
  /** A picked PO sets the currency and destination; they then follow it. */
  const poLocked = byPurchaseOrder && purchaseOrder !== null
  /** So does one of our purchase invoices that can be paid (the server applies its terms too). */
  const invoiceLocked = !byPurchaseOrder && purchaseInvoice !== null && !purchaseInvoice.blockedReason
  const termsLockedBy = poLocked ? 'Set by the purchase order' : invoiceLocked ? 'Set by the invoice' : null
  const invoiceNo = watch('invoiceNo')
  const lines = watch('lines')
  const total = requestTotal(lines)
  const existingDocuments: FinanceDocument[] = detail?.documents ?? []

  // Load an existing draft / rejected request into the form once.
  useEffect(() => {
    if (!editId || !detail || hydrated.current) return
    hydrated.current = true
    reset(toFormValues(detail))
    setPartner(toPartnerOption(detail.partner))
    // A saved request paying one of our invoices opens locked to it, as when the invoice was picked
    void runDuplicateCheck(String(detail.partner.id), detail.invoiceNo ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, detail, reset])

  // Bring back what was typed before the detour to create a partner (after any edit hydration).
  useEffect(() => {
    if (restored || !draft) return
    if (editId && !hydrated.current) return
    reset(draft.values)
    setFiles(draft.files)
    setPartner(draft.partner)
    clearRequestDraft()
    setRestored(true)
  }, [restored, draft, editId, detail, reset])

  // Preselect the partner that was just created.
  const { data: newPartner } = useGetPartnerQuery(newPartnerId ?? 0, { skip: newPartnerId === null })
  const appliedNewPartner = useRef(false)
  useEffect(() => {
    if (!restored || !newPartner || appliedNewPartner.current) return
    if (editId && !hydrated.current) return
    appliedNewPartner.current = true
    pickPartner(toPartnerOption(newPartner))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, newPartner, editId, detail])

  // Opened from a purchase order: its supplier, then the PO itself with its open balance
  const { data: fromPo } = useGetProcurementPurchaseOrderQuery(fromPoId ?? 0, { skip: fromPoId === null || draft !== null })
  const { data: fromSupplier } = useGetPartnerQuery(fromPo?.supplier.id ?? 0, { skip: !fromPo })
  // The PO being paid with its open balance: the one opened from, or a saved request's
  const balancePoNo = fromPo?.poNo ?? (byPurchaseOrder && purchaseOrder && !pickedPo ? purchaseOrder.poNo : null)
  const balancePartnerId = fromPo?.supplier.id ?? partner?.id ?? null
  const { data: poMatches } = useGetPayablePurchaseOrdersQuery({ partnerId: balancePartnerId ?? 0, search: balancePoNo ?? '' }, { skip: !balancePoNo || !balancePartnerId })
  /** Opened from a PO that takes no more requests (closed, fully paid or fully requested). */
  const fromPoUnpayable = Boolean(fromPo && poMatches && !poMatches.some((po) => po.poNo === fromPo.poNo))
  const appliedFromPo = useRef(false)
  useEffect(() => {
    if (!balancePoNo || !poMatches) return
    const match = poMatches.find((po) => po.poNo === balancePoNo)
    if (fromPo && fromSupplier && !appliedFromPo.current) {
      appliedFromPo.current = true
      pickPartner(toPartnerOption(fromSupplier))
      switchReference('PURCHASE_ORDER')
      if (match) pickPurchaseOrder(match)
    } else if (match && !fromPo) {
      setPickedPo(match)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balancePoNo, poMatches, fromPo, fromSupplier])

  const returnHere = encodeURIComponent(editId ? withQueryParam(NEW_URL, 'edit', String(editId)) : NEW_URL)
  const addPartnerHref = `/dashboard/finance/partner-profile/new?returnTo=${returnHere}`
  const addCostCenterHref = `/dashboard/finance/cost-center/new?returnTo=${returnHere}`
  const stashDraft = () => saveRequestDraft({ values: getValues(), files, partner })

  // Back from creating a cost center: book the first line still without one (or the last) to the L4 just created
  const costCenterParam = positiveParam(searchParams.get('costCenterId'))
  const appliedCostCenter = useRef(false)
  useEffect(() => {
    if (!restored || appliedCostCenter.current || costCenterParam === null) return
    if (editId && !hydrated.current) return
    appliedCostCenter.current = true
    const lines = getValues('lines')
    const open = lines.findIndex((line) => !line.costCenterId)
    setValue(`lines.${open === -1 ? lines.length - 1 : open}.costCenterId`, String(costCenterParam), { shouldValidate: true, shouldDirty: true })
  }, [restored, costCenterParam, editId, detail, getValues, setValue])

  const runDuplicateCheck = async (partnerId: string, invoiceNo: string) => {
    // Only invoices can be raised twice; a PO request has no invoice number
    if (!partnerId || !invoiceNo.trim() || getValues('referenceType') !== 'INVOICE') {
      setDuplicate(null)
      setPurchaseInvoice(null)
      return
    }
    void checkPurchaseInvoice({ partnerId: Number(partnerId), invoiceNo: invoiceNo.trim() }, false)
      .unwrap()
      .then(setPurchaseInvoice, () => setPurchaseInvoice(null))
    try {
      const found = await checkDuplicate({ partnerId: Number(partnerId), invoiceNo: invoiceNo.trim(), excludeId: requestId ?? undefined }, false).unwrap()
      setDuplicate(found ? { invoiceNo: invoiceNo.trim(), ...found } : null)
    } catch {
      setDuplicate(null)
    }
  }

  const pickPartner = (option: PartnerOption) => {
    // A PO belongs to one supplier, so a different partner clears it
    if (option.id !== partner?.id) {
      setValue('purchaseOrder', null)
      setPickedPo(null)
    }
    setPartner(option)
    setValue('partnerId', String(option.id), { shouldValidate: true })
    setValue('currency', option.currency, { shouldValidate: true })
    void runDuplicateCheck(String(option.id), getValues('invoiceNo'))
  }

  const switchReference = (next: ReferenceType) => {
    setValue('referenceType', next, { shouldDirty: true })
    if (next === 'PURCHASE_ORDER') {
      setDuplicate(null)
      setPurchaseInvoice(null)
    } else void runDuplicateCheck(getValues('partnerId'), getValues('invoiceNo'))
  }

  const applyDestination = (code: 'US' | 'CA') => {
    const destination = marketplaces?.find((m) => m.code === code)
    if (destination) setValue('marketplaceId', String(destination.id), { shouldDirty: true })
  }

  /** A picked PO brings its currency and destination, which then stay locked to it. */
  const pickPurchaseOrder = (po: PayablePurchaseOrder) => {
    setPickedPo(po)
    setValue('purchaseOrder', { id: po.id, poNo: po.poNo }, { shouldValidate: true, shouldDirty: true })
    setValue('currency', po.currency, { shouldValidate: true })
    applyDestination(po.destination)
  }

  // The invoice's currency and destination, once it is known to be one of ours that can be paid
  useEffect(() => {
    if (!invoiceLocked || !purchaseInvoice) return
    setValue('currency', purchaseInvoice.currency, { shouldValidate: true })
    setValue('marketplaceId', purchaseInvoice.marketplaceId ? String(purchaseInvoice.marketplaceId) : '', { shouldDirty: true })
  }, [invoiceLocked, purchaseInvoice, setValue])

  const pickInvoiceNo = (next: string) => {
    setValue('invoiceNo', next, { shouldValidate: true, shouldDirty: true })
    void runDuplicateCheck(getValues('partnerId'), next)
  }

  // The PO's destination once the destination options have loaded (a prefilled PO may arrive first)
  useEffect(() => {
    if (poLocked && pickedPo && marketplaces) applyDestination(pickedPo.destination)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poLocked, pickedPo, marketplaces])

  /** Without a purchase order or invoice the destination follows the container; otherwise theirs stays. */
  const pickContainer = (container: ContainerItem | null) => {
    setValue('containerNo', container ? containerRefOf(container) : '', { shouldValidate: true, shouldDirty: true })
    if (container && termsLockedBy === null) applyDestination(container.destination)
  }

  const removeExisting = async (doc: FinanceDocument) => {
    if (!requestId) return
    setRemovingId(doc.id)
    try {
      await removeDocument({ id: requestId, documentId: doc.id }).unwrap()
      uploadedCount.current = Math.max(0, uploadedCount.current - 1)
    } catch (error) {
      failure(error, 'Could not remove the document')
    } finally {
      setRemovingId(null)
    }
  }

  const persist = async (values: PaymentRequestFormValues, submit: boolean) => {
    setFileError(undefined)
    setSaving(submit ? 'submit' : 'draft')
    try {
      let id = requestId
      if (id) {
        await updateRequest({ id, body: toUpdateBody(values) }).unwrap()
        if (files.length) await addDocuments({ id, body: filesFormData(files) }).unwrap()
      } else {
        const created = await createRequest(toCreateFormData(values, files)).unwrap()
        id = created.id
        setSavedId(id)
        uploadedCount.current += files.length
      }
      if (id === requestId && files.length) uploadedCount.current += files.length
      setFiles([])

      if (submit) {
        const sent = await submitRequest(id).unwrap()
        const names = [...new Set((sent.events ?? []).filter((e) => e.type === 'NOTIFIED').map((e) => (typeof e.payload?.name === 'string' ? e.payload.name : null)).filter(Boolean))]
        success(`Sent for approval. ${names.length ? names.join(' and ') : 'Approvers'} ${names.length > 1 ? 'have' : 'has'} been notified.`)
      } else {
        success('Draft saved')
      }
      router.push(`${LIST_URL}?open=${id}`)
    } catch (error) {
      failure(error, submit ? 'Could not send the request for approval' : 'Could not save the draft')
    } finally {
      setSaving(null)
    }
  }

  const invalidFiles = () => setFileError(undefined)
  const busy = saving !== null
  /** Paying one of our purchase invoices that is not approved yet, or already fully paid: the server refuses it too. */
  const invoiceBlocked = (referenceType === 'INVOICE' && Boolean(purchaseInvoice?.blockedReason)) || fromPoUnpayable
  const editBlocked = editId !== null && detail && !detail.can.edit
  const statusMeta = REQUEST_STATUS_META[detail?.status ?? 'DRAFT']
  const backHref = fromPoId ? `${PO_URL}/${fromPoId}` : LIST_URL

  if (editId !== null && loadingDetail) {
    return (
      <Container size="full" className="py-4 sm:py-8">
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      </Container>
    )
  }

  if (editId !== null && (detailError || editBlocked)) {
    return (
      <Container size="full" className="py-4 sm:py-8">
        <div className="py-16 text-center">
          <p className="font-medium text-danger-600">{editBlocked ? 'This request can no longer be edited.' : 'Could not load this payment request.'}</p>
          <Link href={LIST_URL} className="mt-3 inline-block text-sm text-primary-600 hover:underline">
            Back to payment requests
          </Link>
        </div>
      </Container>
    )
  }

  return (
    <Container size="full" className="py-4 sm:py-8">

      <form
        noValidate
        onSubmit={handleSubmit((values) => persist(values, true), invalidFiles)}
        className="mx-auto max-w-4xl space-y-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Payment Request Creation</h1>
          <StatusBadge label={requestId ? `${statusMeta.label} · ${formatRequestNo(requestId)}` : 'DRAFT'} tone={statusMeta.tone} />
          {fromPo && (
            <Link href={backHref} className="text-sm font-medium text-primary-600 underline-offset-2 hover:underline">
              {fromPo.poNo}
            </Link>
          )}
        </div>

        <Section title="Partner" note="who is being paid">
          <FormField label="Partner" htmlFor="partner" required error={errors.partnerId?.message} hint={poLocked ? 'The purchase order’s supplier' : undefined}>
            <PartnerSelect
              id="partner"
              selected={shownPartner}
              error={errors.partnerId?.message}
              onSelect={pickPartner}
              addPartnerHref={addPartnerHref}
              onAddPartner={stashDraft}
              disabled={fromPoId !== null}
            />
          </FormField>
          {shownPartner && (
            <>
              <PartnerChips partner={shownPartner} />
              <PartnerPaymentInfo partner={shownPartner} />
            </>
          )}
        </Section>

        <Section title={byPurchaseOrder ? 'Purchase order & shipment' : 'Invoice & shipment'}>
          <FormField label="Paying against" className="mb-4" hint={byPurchaseOrder ? 'Only approved, open purchase orders of this supplier with an amount left to pay are offered' : undefined}>
            <SegmentedToggle<ReferenceType> ariaLabel="Paying against" value={referenceType} onChange={switchReference} options={REFERENCE_OPTIONS} disabled={fromPoId !== null} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {byPurchaseOrder ? (
              <FormField label="Purchase order" htmlFor="purchaseOrder" required error={errors.purchaseOrder?.message as string | undefined} className="lg:col-span-2">
                <PayablePoSelect
                  id="purchaseOrder"
                  partnerId={partner?.id ?? null}
                  value={purchaseOrder}
                  onChange={pickPurchaseOrder}
                  error={errors.purchaseOrder?.message as string | undefined}
                  disabled={fromPoId !== null}
                />
              </FormField>
            ) : (
              <FormField label="Invoice No" htmlFor="invoiceNo" required error={errors.invoiceNo?.message}>
                <PayableInvoiceSelect
                  id="invoiceNo"
                  partnerId={partner?.id ?? null}
                  value={invoiceNo}
                  onPick={(invoice) => pickInvoiceNo(invoice.invoiceNo)}
                  onOther={pickInvoiceNo}
                  error={errors.invoiceNo?.message}
                />
              </FormField>
            )}
            <FormField label={byPurchaseOrder ? 'Date' : 'Invoice Date'} htmlFor="invoiceDate" required error={errors.invoiceDate?.message}>
              <Controller
                control={control}
                name="invoiceDate"
                render={({ field }) => (
                  <SingleDatePicker id="invoiceDate" value={field.value} onChange={field.onChange} error={errors.invoiceDate?.message} />
                )}
              />
            </FormField>
            <FormField label="Container #" htmlFor="containerNo" error={errors.containerNo?.message}>
              <ContainerSelect id="containerNo" value={containerNo} onChange={pickContainer} error={errors.containerNo?.message} />
            </FormField>
            <FormField
              label="Destination (Marketplace)"
              htmlFor="marketplaceId"
              hint={termsLockedBy ?? (containerNo ? 'Set by the container' : undefined)}
            >
              <SelectShell>
              <Select
                id="marketplaceId"
                className="appearance-none rounded-lg pr-9"
                disabled={termsLockedBy !== null || Boolean(containerNo)}
                options={[{ value: '', label: 'Select destination' }, ...(marketplaces ?? []).map((m) => ({ value: String(m.id), label: m.name }))]}
                {...register('marketplaceId')}
              />
              </SelectShell>
            </FormField>
          </div>
          {fromPoUnpayable && fromPo && (
            <p role="alert" className="mt-3 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {fromPo.poNo} takes no more payment requests: it is closed, not approved yet, or already fully requested or paid.
            </p>
          )}
          {purchaseInvoice && !byPurchaseOrder && (
            <p
              role={purchaseInvoice.blockedReason ? 'alert' : undefined}
              className={
                purchaseInvoice.blockedReason
                  ? 'mt-3 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700'
                  : 'mt-3 rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700'
              }
            >
              {purchaseInvoice.blockedReason
                ? `${purchaseInvoice.blockedReason}. A payment request cannot be raised for it.`
                : `Pays purchase invoice ${purchaseInvoice.invoiceRef} (${formatCurrencyAmount(purchaseInvoice.currency, purchaseInvoice.amount)}, approved): ${formatCurrencyAmount(purchaseInvoice.currency, purchaseInvoice.leftToRequest)} left to request. Its status updates as payments are recorded.`}
            </p>
          )}
          {duplicate && !byPurchaseOrder && (
            <p role="alert" className="mt-3 rounded-lg border border-warning-300 bg-warning-50 px-3 py-2 text-sm text-warning-700">
              Invoice {duplicate.invoiceNo} already has request {formatRequestNo(duplicate.id)} for this partner.
              {duplicate.paidAmount > 0 && (
                <span className="mt-1 block">
                  {formatCurrencyAmount(duplicate.currency, duplicate.paidAmount)} of {formatCurrencyAmount(duplicate.currency, duplicate.amount)} already paid
                  {duplicate.remaining > 0 ? `, ${formatCurrencyAmount(duplicate.currency, duplicate.remaining)} still outstanding.` : ' (paid in full).'}
                </span>
              )}
            </p>
          )}
        </Section>

        <RequestLinesSection
          control={control}
          register={register}
          errors={errors}
          currencyOptions={currencyOptions(currency)}
          currencyLockedBy={termsLockedBy}
          poLimit={byPurchaseOrder ? poLimit : null}
          termDays={shownPartner?.paymentTermDays ?? null}
          costCenters={costCenters}
          loadingCostCenters={loadingCostCenters}
          addCostCenterHref={addCostCenterHref}
          onAddCostCenter={stashDraft}
        />
        <FxConversionNote currency={currency} amount={total} stored={detail && detail.currency === currency ? detail : null} />

        <Section title="Upload documents">
          {existingDocuments.length > 0 && (
            <div className="mb-3">
              <DocumentChips documents={existingDocuments} onRemove={removeExisting} removingId={removingId} />
            </div>
          )}
          <FileDropzone
            multiple
            files={files}
            onChange={(next) => {
              setFiles(next)
              setFileError(undefined)
            }}
            error={fileError}
            disabled={busy}
          />
        </Section>

        <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
          <Link href={backHref} className="mr-auto px-2 text-sm font-medium text-text-secondary hover:underline sm:mr-2">
            {fromPoId ? 'Back' : 'Cancel'}
          </Link>
          <Button
            type="button"
            variant="outline"
            disabled={busy || invoiceBlocked}
            isLoading={saving === 'draft'}
            onClick={handleSubmit((values) => persist(values, false))}
          >
            Save draft
          </Button>
          <Button type="submit" disabled={busy || invoiceBlocked} isLoading={saving === 'submit'}>
            Process For Approval
          </Button>
        </div>
      </form>
    </Container>
  )
}
