'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Container } from '@/components/layout'
import { FileDropzone } from '@/components/file-dropzone/FileDropzone'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Button } from '@/design-system/buttons'
import { Input, Select, Textarea } from '@/design-system/inputs'
import { Spinner } from '@/design-system/loaders'
import { DocumentChips } from '@/features/finance/shared/DocumentChips'
import { FormField } from '@/features/finance/shared/FormField'
import { FormSection as Section } from '@/features/finance/shared/FormSection'
import { SelectShell } from '@/features/finance/shared/SelectShell'
import { formatMoney, toDateInputValue } from '@/features/finance/shared/format'
import { PartnerChips, PartnerSelect, toPartnerOption } from '@/features/finance/payment-requests/PartnerSelect'
import { CURRENCIES, filesFormData } from '@/features/finance/payment-requests/schema'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { FinanceDocument, PartnerOption, useGetPartnerQuery } from '@/services/api/finance.api'
import { CostCenterSelect } from '@/features/finance/shared/CostCenterSelect'
import { withQueryParam } from '@/features/finance/payment-requests/requestDraftStore'
import { invoiceDraft } from './invoiceDraftStore'
import {
  PurchaseInvoiceDetail,
  purchaseInvoiceDocumentPath,
  useAddPurchaseInvoiceDocumentsMutation,
  useCreatePurchaseInvoiceMutation,
  useGetProcurementPurchaseOrderQuery,
  useGetPurchaseInvoiceQuery,
  useGetPurchaseOrderInvoiceDocumentsQuery,
  useGetPurchaseInvoiceDestinationsQuery,
  useGetPurchaseInvoiceCostCentersQuery,
  usePurchaseInvoiceActionMutation,
  useRemovePurchaseInvoiceDocumentMutation,
  useUpdatePurchaseInvoiceMutation,
} from '@/services/api/procurement.api'
import { financeDocumentPath } from '@/features/finance/shared/downloadDocument'
import { PURCHASE_INVOICES_URL, PURCHASE_INVOICE_STATUS_META, formatPoNo } from '../shared/poMeta'
import { InvoiceExpensesSection } from './InvoiceExpensesSection'
import { InvoiceItemsSection } from './InvoiceItemsSection'
import {
  PurchaseInvoiceFormValues,
  emptyFormValues,
  expensesFromInvoice,
  invoiceTotals,
  linesFromInvoice,
  linesFromPurchaseOrder,
  purchaseInvoiceSchema,
  toCreateFormData,
  toUpdateBody,
} from './schema'

const positiveParam = (value: string | null): number | null => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const toFormValues = (detail: PurchaseInvoiceDetail): PurchaseInvoiceFormValues => ({
  partnerId: String(detail.partner.id),
  invoiceNo: detail.invoiceNo,
  invoiceDate: toDateInputValue(detail.invoiceDate),
  marketplaceId: detail.marketplaceId ? String(detail.marketplaceId) : '',
  currency: detail.currency,
  lines: linesFromInvoice(detail),
  expenses: expensesFromInvoice(detail),
  costCenterId: detail.costCenter ? String(detail.costCenter.id) : '',
  remarks: detail.remarks ?? '',
})

/**
 * Raise a purchase invoice from a purchase order (`?purchaseOrderId=`), or edit a draft / rejected one (`?edit=`).
 * A new invoice starts from the PO: its supplier, destination, currency and total, and the documents of its
 * payment requests. Every save renders the invoice PDF in the background; its creator is notified once it is ready.
 */
export const PurchaseInvoiceFormScreen: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = positiveParam(searchParams.get('edit'))
  const { success, failure } = useApiFeedback()

  const [savedId, setSavedId] = useState<number | null>(null)
  const invoiceId = editId ?? savedId
  const { data: detail, isLoading: loadingDetail, isError: detailError } = useGetPurchaseInvoiceQuery(invoiceId ?? 0, { skip: invoiceId === null })
  const purchaseOrderId = detail?.purchaseOrder.id ?? positiveParam(searchParams.get('purchaseOrderId'))
  const isNew = editId === null

  const { data: po, isError: poError } = useGetProcurementPurchaseOrderQuery(purchaseOrderId ?? 0, { skip: !isNew || purchaseOrderId === null })
  const { data: poDocuments } = useGetPurchaseOrderInvoiceDocumentsQuery(purchaseOrderId ?? 0, { skip: !isNew || purchaseOrderId === null })
  const { data: supplierProfile, isError: supplierError } = useGetPartnerQuery(po?.supplier.id ?? 0, { skip: !po })
  // Without access to partner profiles the PO's own supplier record still names the partner
  const supplier = supplierProfile ?? (po && supplierError ? { ...po.supplier, type: 'SUPPLIER' as const } : undefined)
  const { data: costCenters, isFetching: loadingCostCenters } = useGetPurchaseInvoiceCostCentersQuery()
  const { data: marketplaces } = useGetPurchaseInvoiceDestinationsQuery()

  const [createInvoice] = useCreatePurchaseInvoiceMutation()
  const [updateInvoice] = useUpdatePurchaseInvoiceMutation()
  const [addDocuments] = useAddPurchaseInvoiceDocumentsMutation()
  const [removeDocument] = useRemovePurchaseInvoiceDocumentMutation()
  const [runAction] = usePurchaseInvoiceActionMutation()

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<PurchaseInvoiceFormValues>({ resolver: zodResolver(purchaseInvoiceSchema), defaultValues: emptyFormValues })

  const [partner, setPartner] = useState<PartnerOption | null>(null)
  const [carried, setCarried] = useState<FinanceDocument[] | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState<'draft' | 'submit' | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const hydrated = useRef(false)
  // Back from creating a cost center: what was typed before leaving, applied in place of the saved/PO values
  const [draft] = useState(() => (searchParams.get('restore') === '1' ? invoiceDraft.peek() : null))
  const applyDraft = () => {
    if (!draft) return false
    reset(draft.values)
    setPartner(draft.partner)
    setFiles(draft.files)
    if (draft.carried) setCarried(draft.carried)
    invoiceDraft.clear()
    return true
  }

  // Editing: load the saved invoice into the form once.
  useEffect(() => {
    if (isNew || !detail || hydrated.current) return
    hydrated.current = true
    if (applyDraft()) return
    reset(toFormValues(detail))
    setPartner(toPartnerOption(detail.partner))
  }, [isNew, detail, reset])

  // New: start from the purchase order once its supplier is known
  useEffect(() => {
    if (!isNew || !po || !supplier || hydrated.current) return
    hydrated.current = true
    if (applyDraft()) return
    reset({ ...emptyFormValues, partnerId: String(supplier.id), currency: po.currency, lines: linesFromPurchaseOrder(po) })
    setPartner(toPartnerOption(supplier))
  }, [isNew, po, supplier, reset])

  // New: the PO's destination, as soon as the destination options have loaded (never overrides a choice)
  useEffect(() => {
    if (!isNew || !po || !marketplaces || !hydrated.current || getValues('marketplaceId')) return
    const destination = marketplaces.find((marketplace) => marketplace.code === po.destination)
    if (destination) setValue('marketplaceId', String(destination.id))
    // `partner` is set by the hydration above, so this re-runs once the form holds the PO
  }, [isNew, po, marketplaces, getValues, setValue, partner])

  // Back from creating a cost center: pick the L4 that was just created, once the form holds its values
  const costCenterParam = Number(searchParams.get('costCenterId'))
  const appliedCostCenter = useRef(false)
  useEffect(() => {
    if (!hydrated.current || appliedCostCenter.current || !Number.isInteger(costCenterParam) || costCenterParam <= 0) return
    appliedCostCenter.current = true
    setValue('costCenterId', String(costCenterParam), { shouldValidate: true, shouldDirty: true })
    // `partner` is set by the hydration above, so this runs right after it
  }, [costCenterParam, partner, setValue])

  // New: every document of the PO's payment requests is carried over until removed.
  useEffect(() => {
    if (isNew && poDocuments && carried === null) setCarried(poDocuments)
  }, [isNew, poDocuments, carried])

  const currency = watch('currency')
  const lines = useWatch({ control, name: 'lines' }) ?? []
  const expenses = useWatch({ control, name: 'expenses' }) ?? []
  const totals = invoiceTotals({ lines, expenses })
  const currencyOptions = [...new Set([...CURRENCIES, ...(currency ? [currency] : [])])].map((code) => ({ value: code, label: code }))
  const savedDocuments: FinanceDocument[] = detail?.documents ?? []
  const shownDocuments = isNew && !savedId ? (carried ?? []) : savedDocuments

  const pickPartner = (option: PartnerOption) => {
    setPartner(option)
    setValue('partnerId', String(option.id), { shouldValidate: true, shouldDirty: true })
  }

  /** Before the first save a carried document is just dropped; afterwards the server unlinks (carried) or deletes (uploaded) it. */
  const removeShown = async (doc: FinanceDocument) => {
    if (!invoiceId) return setCarried((current) => (current ?? []).filter((item) => item.id !== doc.id))
    setRemovingId(doc.id)
    try {
      await removeDocument({ id: invoiceId, documentId: doc.id }).unwrap()
    } catch (error) {
      failure(error, 'Could not remove the document')
    } finally {
      setRemovingId(null)
    }
  }

  const documentPath = (doc: FinanceDocument) => (invoiceId ? purchaseInvoiceDocumentPath(invoiceId, doc.id) : financeDocumentPath(doc.id))

  const persist = async (values: PurchaseInvoiceFormValues, submit: boolean) => {
    if (!purchaseOrderId) return
    setSaving(submit ? 'submit' : 'draft')
    try {
      let id = invoiceId
      if (id) {
        await updateInvoice({ id, body: toUpdateBody(values) }).unwrap()
        if (files.length) await addDocuments({ id, body: filesFormData(files) }).unwrap()
      } else {
        const created = await createInvoice(toCreateFormData(values, purchaseOrderId, (carried ?? []).map((doc) => doc.id), files)).unwrap()
        id = created.id
        setSavedId(id)
      }
      setFiles([])
      if (submit) await runAction({ id, action: 'submit' }).unwrap()
      success(`${submit ? 'Sent for approval' : 'Draft saved'}. The PDF is being generated; we'll notify you when it is ready.`)
      router.push(`${PURCHASE_INVOICES_URL}?open=${id}`)
    } catch (error) {
      failure(error, submit ? 'Could not send the invoice for approval' : 'Could not save the draft')
    } finally {
      setSaving(null)
    }
  }

  const busy = saving !== null
  /** This form's own address, to come back to from the cost center screen. */
  const returnHere = editId ? withQueryParam(`${PURCHASE_INVOICES_URL}/new`, 'edit', String(editId)) : withQueryParam(`${PURCHASE_INVOICES_URL}/new`, 'purchaseOrderId', String(purchaseOrderId ?? ''))
  const statusMeta = PURCHASE_INVOICE_STATUS_META[detail?.status ?? 'DRAFT']
  const loadFailed = isNew ? purchaseOrderId === null || poError : detailError || (detail && !detail.can.edit)

  if (loadFailed) {
    return (
      <Container size="full" className="py-4 sm:py-8">
        <div className="py-16 text-center">
          <p className="font-medium text-danger-600">
            {isNew ? 'Open this form from a purchase order (Actions › Create purchase invoice).' : detail ? 'This invoice can no longer be edited.' : 'Could not load this purchase invoice.'}
          </p>
          <Link href={PURCHASE_INVOICES_URL} className="mt-3 inline-block text-sm text-primary-600 hover:underline">
            Back to purchase invoices
          </Link>
        </div>
      </Container>
    )
  }

  if ((!isNew && loadingDetail) || (isNew && !hydrated.current && !(po && supplier))) {
    return (
      <Container size="full" className="py-4 sm:py-8">
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      </Container>
    )
  }

  return (
    <Container size="full" className="py-4 sm:py-8">
      <form noValidate onSubmit={handleSubmit((values) => persist(values, true))} className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Invoice</h1>
          <StatusBadge label={detail ? `${statusMeta.label} · ${detail.invoiceRef}` : 'DRAFT · INV# ASSIGNED ON SAVE'} tone={statusMeta.tone} />
          {purchaseOrderId && (
            <Link href={`/dashboard/procurement/purchase-orders/${purchaseOrderId}`} className="text-sm font-medium text-primary-600 underline-offset-2 hover:underline">
              {formatPoNo(purchaseOrderId)}
            </Link>
          )}
        </div>

        <Section title="Partner" note="prefilled from the purchase order">
          <FormField label="Partner" htmlFor="partner" required error={errors.partnerId?.message}>
            <PartnerSelect id="partner" selected={partner} error={errors.partnerId?.message} onSelect={pickPartner} />
          </FormField>
          {partner && <PartnerChips partner={partner} />}
        </Section>

        <Section title="Invoice & shipment">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Invoice No" htmlFor="invoiceNo" required error={errors.invoiceNo?.message}>
              <Input id="invoiceNo" autoComplete="off" className="rounded-lg" placeholder="INV-10442" {...register('invoiceNo')} />
            </FormField>
            <FormField label="Invoice Date" htmlFor="invoiceDate" required error={errors.invoiceDate?.message}>
              <Controller
                control={control}
                name="invoiceDate"
                render={({ field }) => <SingleDatePicker id="invoiceDate" value={field.value} onChange={field.onChange} error={errors.invoiceDate?.message} />}
              />
            </FormField>
            <FormField label="Destination (Marketplace)" htmlFor="marketplaceId">
              <SelectShell>
                <Select
                  id="marketplaceId"
                  className="appearance-none rounded-lg pr-9"
                  options={[{ value: '', label: 'Select destination' }, ...(marketplaces ?? []).map((m) => ({ value: String(m.id), label: m.name }))]}
                  {...register('marketplaceId')}
                />
              </SelectShell>
            </FormField>
          </div>
        </Section>

        <InvoiceItemsSection control={control} register={register} errors={errors} currency={currency} poNo={purchaseOrderId ? formatPoNo(purchaseOrderId) : ''} invoiceNo={watch('invoiceNo')} />

        <InvoiceExpensesSection control={control} register={register} errors={errors} currency={currency} />

        <Section title="Amount & category" note="prefilled from the purchase order">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_2fr]">
            <FormField label="Currency" htmlFor="currency" required error={errors.currency?.message}>
              <SelectShell>
                <Select id="currency" className="appearance-none rounded-lg pr-9" options={[{ value: '', label: 'Select' }, ...currencyOptions]} {...register('currency')} />
              </SelectShell>
            </FormField>
            <FormField label="Amount" htmlFor="amount" hint="Invoiced items + additional expenses">
              <Input id="amount" readOnly tabIndex={-1} className="rounded-lg bg-secondary-50 text-right font-semibold" value={formatMoney(totals.amount)} />
            </FormField>
            <FormField label="Expense" htmlFor="costCenterId" required error={errors.costCenterId?.message}>
              <CostCenterSelect
                id="costCenterId"
                options={costCenters}
                loading={loadingCostCenters}
                value={watch('costCenterId') ? Number(watch('costCenterId')) : null}
                onChange={(option) => setValue('costCenterId', String(option.id), { shouldValidate: true, shouldDirty: true })}
                error={errors.costCenterId?.message}
                addHref={`/dashboard/finance/cost-center/new?returnTo=${encodeURIComponent(returnHere)}`}
                onAdd={() => invoiceDraft.save({ values: getValues(), files, partner, carried })}
              />
            </FormField>
          </div>
          <FormField label="Remarks" htmlFor="remarks" className="mt-4" error={errors.remarks?.message}>
            <Textarea id="remarks" rows={2} className="rounded-lg" placeholder="Goods invoice for the September batch." {...register('remarks')} />
          </FormField>
        </Section>

        <Section title="Upload documents" note="documents of the purchase order's payment requests are carried over">
          {shownDocuments.length > 0 && (
            <div className="mb-3">
              <DocumentChips documents={shownDocuments} onRemove={removeShown} removingId={removingId} documentPath={documentPath} />
            </div>
          )}
          <FileDropzone multiple files={files} onChange={setFiles} disabled={busy} />
        </Section>

        <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
          <Link href={PURCHASE_INVOICES_URL} className="mr-auto px-2 text-sm font-medium text-text-secondary hover:underline sm:mr-2">
            Cancel
          </Link>
          <Button type="button" variant="outline" disabled={busy} isLoading={saving === 'draft'} onClick={handleSubmit((values) => persist(values, false))}>
            Save draft
          </Button>
          <Button type="submit" disabled={busy} isLoading={saving === 'submit'}>
            Process For Approval
          </Button>
        </div>
      </form>
    </Container>
  )
}
