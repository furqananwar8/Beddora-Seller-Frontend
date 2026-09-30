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
import { Button } from '@/design-system/buttons'
import { Card } from '@/design-system/cards'
import { Input, Select, Textarea } from '@/design-system/inputs'
import { countryLabel } from '../shared/countryLabel'
import { SelectShell } from '../shared/SelectShell'
import { Spinner } from '@/design-system/loaders'
import {
  FinanceDocument,
  PartnerOption,
  PaymentRequestDetail,
  useAddRequestDocumentsMutation,
  useCreatePaymentRequestMutation,
  useGetExpenseTypesQuery,
  useGetFinanceMarketplacesQuery,
  useGetPartnerQuery,
  useGetPaymentRequestQuery,
  useLazyCheckDuplicateInvoiceQuery,
  type DuplicateInvoice,
  useRemoveRequestDocumentMutation,
  useSubmitPaymentRequestMutation,
  useUpdatePaymentRequestMutation,
} from '@/services/api/finance.api'
import { FormField } from '../shared/FormField'
import { formatCurrencyAmount, formatMoney, formatRequestNo, toDateInputValue } from '../shared/format'
import { REQUEST_STATUS_META } from '../shared/statusMeta'
import { useFinanceFeedback } from '../shared/useFinanceFeedback'
import { DocumentChips } from '../shared/DocumentChips'
import { PartnerChips, PartnerSelect } from './PartnerSelect'
import { clearRequestDraft, peekRequestDraft, saveRequestDraft, withQueryParam } from './requestDraftStore'
import {
  CURRENCIES,
  PaymentRequestFormValues,
  emptyFormValues,
  filesFormData,
  parseAmount,
  paymentRequestSchema,
  toCreateFormData,
  toUpdateBody,
} from './schema'

const LIST_URL = '/dashboard/finance/payment-request'
const NEW_URL = `${LIST_URL}/new`

const Section: React.FC<{ title: string; note?: string; children: React.ReactNode }> = ({ title, note, children }) => (
  <Card className="p-4 sm:p-5">
    <h2 className="mb-4 flex flex-wrap items-baseline gap-2 text-base font-semibold text-text-primary">
      {title}
      {note && <span className="text-xs font-normal text-text-muted">{note}</span>}
    </h2>
    {children}
  </Card>
)

const toFormValues = (detail: PaymentRequestDetail): PaymentRequestFormValues => ({
  partnerId: String(detail.partner.id),
  invoiceNo: detail.invoiceNo,
  invoiceDate: toDateInputValue(detail.invoiceDate),
  containerNo: detail.containerNo ?? '',
  marketplaceId: detail.marketplaceId ? String(detail.marketplaceId) : '',
  currency: detail.currency,
  amount: formatMoney(detail.amount),
  expenseTypeId: String(detail.expenseType.id),
  remarks: detail.remarks ?? '',
})

export const PaymentRequestFormScreen: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editParam = Number(searchParams.get('edit'))
  const editId = Number.isInteger(editParam) && editParam > 0 ? editParam : null
  const { success, failure } = useFinanceFeedback()
  const partnerParam = Number(searchParams.get('partnerId'))
  const newPartnerId = Number.isInteger(partnerParam) && partnerParam > 0 ? partnerParam : null
  const wantsRestore = newPartnerId !== null || searchParams.get('restore') === '1'
  // Peek (not take) so a dev double-mount cannot lose it; it is cleared once applied.
  const [draft] = useState(() => (wantsRestore ? peekRequestDraft() : null))
  const [restored, setRestored] = useState(draft === null)

  const [savedId, setSavedId] = useState<number | null>(null)
  const requestId = editId ?? savedId
  const { data: detail, isLoading: loadingDetail, isError: detailError } = useGetPaymentRequestQuery(requestId ?? 0, { skip: requestId === null })

  const { data: expenseTypes } = useGetExpenseTypesQuery()
  const { data: marketplaces } = useGetFinanceMarketplacesQuery()
  const [checkDuplicate] = useLazyCheckDuplicateInvoiceQuery()
  const [createRequest] = useCreatePaymentRequestMutation()
  const [updateRequest] = useUpdatePaymentRequestMutation()
  const [addDocuments] = useAddRequestDocumentsMutation()
  const [removeDocument] = useRemoveRequestDocumentMutation()
  const [submitRequest] = useSubmitPaymentRequestMutation()

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<PaymentRequestFormValues>({ resolver: zodResolver(paymentRequestSchema), defaultValues: emptyFormValues })

  const [partner, setPartner] = useState<PartnerOption | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | undefined>()
  const [duplicate, setDuplicate] = useState<(DuplicateInvoice & { invoiceNo: string }) | null>(null)
  const [saving, setSaving] = useState<'draft' | 'submit' | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const uploadedCount = useRef(0)
  const hydrated = useRef(false)

  const needsMethod = partner !== null && partner.paymentMethod === null
  const { data: partnerDetail } = useGetPartnerQuery(partner?.id ?? 0, { skip: !needsMethod })
  const shownPartner: PartnerOption | null = partner && needsMethod ? { ...partner, paymentMethod: partnerDetail?.paymentMethods[0]?.label ?? null } : partner

  // Load an existing draft / rejected request into the form once.
  useEffect(() => {
    if (!editId || !detail || hydrated.current) return
    hydrated.current = true
    reset(toFormValues(detail))
    setPartner({ id: detail.partner.id, name: detail.partner.name, type: detail.partner.type, country: detail.partner.country, currency: detail.partner.currency, paymentMethod: null })
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
    pickPartner({ id: newPartner.id, name: newPartner.name, type: newPartner.type, country: newPartner.country, currency: newPartner.currency, paymentMethod: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, newPartner, editId, detail])

  const addPartnerHref = `/dashboard/finance/partner-profile/new?returnTo=${encodeURIComponent(editId ? withQueryParam(NEW_URL, 'edit', String(editId)) : NEW_URL)}`
  const stashDraft = () => saveRequestDraft({ values: getValues(), files, partner })

  const currency = watch('currency')
  const currencyOptions = [...new Set([...CURRENCIES, ...(currency ? [currency] : [])])].map((code) => ({ value: code, label: code }))
  const existingDocuments: FinanceDocument[] = detail?.documents ?? []

  const runDuplicateCheck = async (partnerId: string, invoiceNo: string) => {
    if (!partnerId || !invoiceNo.trim()) {
      setDuplicate(null)
      return
    }
    try {
      const found = await checkDuplicate({ partnerId: Number(partnerId), invoiceNo: invoiceNo.trim(), excludeId: requestId ?? undefined }, false).unwrap()
      setDuplicate(found ? { invoiceNo: invoiceNo.trim(), ...found } : null)
    } catch {
      setDuplicate(null)
    }
  }

  const pickPartner = (option: PartnerOption) => {
    setPartner(option)
    setValue('partnerId', String(option.id), { shouldValidate: true })
    setValue('currency', option.currency, { shouldValidate: true })
    void runDuplicateCheck(String(option.id), getValues('invoiceNo'))
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
    if (submit && files.length + existingDocuments.length + uploadedCount.current === 0) {
      setFileError('Attach at least one document (invoice, BOL or packing list) before sending for approval')
      return
    }
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
  const editBlocked = editId !== null && detail && !detail.can.edit
  const statusMeta = REQUEST_STATUS_META[detail?.status ?? 'DRAFT']

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
          <StatusBadge label={requestId ? `${statusMeta.label} · ${formatRequestNo(requestId)}` : 'Draft'} tone={statusMeta.tone} />
        </div>

        <Section title="Partner" note="who is being paid">
          <FormField label="Partner" htmlFor="partner" required error={errors.partnerId?.message}>
            <PartnerSelect id="partner" selected={shownPartner} error={errors.partnerId?.message} onSelect={pickPartner} addPartnerHref={addPartnerHref} onAddPartner={stashDraft} />
          </FormField>
          {shownPartner && <PartnerChips partner={shownPartner} />}
        </Section>

        <Section title="Invoice & shipment">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Invoice No" htmlFor="invoiceNo" required error={errors.invoiceNo?.message}>
              <Input
                id="invoiceNo"
                className="rounded-lg"
                placeholder="INV-10442"
                {...register('invoiceNo', { onBlur: (e) => runDuplicateCheck(getValues('partnerId'), e.target.value) })}
              />
            </FormField>
            <FormField label="Invoice Date" htmlFor="invoiceDate" required error={errors.invoiceDate?.message}>
              <Controller
                control={control}
                name="invoiceDate"
                render={({ field }) => (
                  <SingleDatePicker id="invoiceDate" value={field.value} onChange={field.onChange} error={errors.invoiceDate?.message} />
                )}
              />
            </FormField>
            <FormField label="Container #" htmlFor="containerNo" error={errors.containerNo?.message}>
              <Input id="containerNo" className="rounded-lg" placeholder="MSKU 482193-0" {...register('containerNo')} />
            </FormField>
            <FormField label="Destination (Marketplace)" htmlFor="marketplaceId">
              <SelectShell>
              <Select
                id="marketplaceId"
                className="appearance-none rounded-lg pr-9"
                options={[{ value: '', label: 'Select destination' }, ...(marketplaces ?? []).map((m) => ({ value: String(m.id), label: countryLabel(m.code) || m.name }))]}
                {...register('marketplaceId')}
              />
              </SelectShell>
            </FormField>
          </div>
          {duplicate && (
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

        <Section title="Amount & category">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_2fr]">
            <FormField label="Currency" htmlFor="currency" required error={errors.currency?.message}>
              <SelectShell>
              <Select id="currency" className="appearance-none rounded-lg pr-9" options={[{ value: '', label: 'Select' }, ...currencyOptions]} {...register('currency')} />
              </SelectShell>
            </FormField>
            <FormField label="Amount" htmlFor="amount" required error={errors.amount?.message}>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <Input
                    id="amount"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="rounded-lg text-right"
                    value={field.value}
                    ref={field.ref}
                    onChange={(e) => field.onChange(e.target.value)}
                    onBlur={() => {
                      const parsed = parseAmount(field.value)
                      if (field.value.trim() && Number.isFinite(parsed)) field.onChange(formatMoney(parsed))
                      field.onBlur()
                    }}
                  />
                )}
              />
            </FormField>
            <FormField label="Expense Type" htmlFor="expenseTypeId" required error={errors.expenseTypeId?.message}>
              <SelectShell>
              <Select
                id="expenseTypeId"
                className="appearance-none rounded-lg pr-9"
                options={[{ value: '', label: 'Select expense type' }, ...(expenseTypes ?? []).map((t) => ({ value: String(t.id), label: t.name }))]}
                {...register('expenseTypeId')}
              />
              </SelectShell>
            </FormField>
          </div>
          <FormField label="Remarks" htmlFor="remarks" className="mt-4" error={errors.remarks?.message}>
            <Textarea id="remarks" rows={2} className="rounded-lg" placeholder="Ocean freight Shanghai to Vancouver, Sep batch." {...register('remarks')} />
          </FormField>
        </Section>

        <Section title="Upload documents" note="invoice, BOL, packing list">
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
          <Link href={LIST_URL} className="mr-auto px-2 text-sm font-medium text-text-secondary hover:underline sm:mr-2">
            Cancel
          </Link>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            isLoading={saving === 'draft'}
            onClick={handleSubmit((values) => persist(values, false))}
          >
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
