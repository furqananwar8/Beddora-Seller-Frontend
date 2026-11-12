'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useGetFinanceMarketplacesQuery, useGetLeafCostCentersQuery, type PartnerOption } from '@/services/api/finance.api'
import { FormSection as Section } from '../../shared/FormSection'
import { FormField } from '../../shared/FormField'
import { PartnerChips, PartnerSelect } from '../PartnerSelect'
import { BatchEntryCard } from './BatchEntryCard'
import { BatchExcelModal } from './BatchExcelModal'
import { BatchModeToggle } from './BatchModeToggle'
import { BatchProgressPanel } from './BatchProgressPanel'
import { batchSchema, emptyEntry, toEntryBody, type BatchFormValues } from './batchSchema'
import { MAX_BATCH_ENTRIES } from './types'
import { useBatchStream } from './useBatchStream'

const LIST_URL = '/dashboard/finance/payment-request'

interface BatchPaymentRequestFormProps {
  /** Turns the Batch switch off: back to a single request. */
  onExit: () => void
}

/**
 * Several payment requests for one partner at once. The partner is fixed; each request below is its own card in a
 * fixed-height, scrolling list (so the page itself never scrolls). They can also come from an uploaded Excel file.
 */
export const BatchPaymentRequestForm: React.FC<BatchPaymentRequestFormProps> = ({ onExit }) => {
  const router = useRouter()
  const stream = useBatchStream()
  const { data: costCenters, isFetching: loadingCostCenters } = useGetLeafCostCentersQuery()
  const { data: marketplaces } = useGetFinanceMarketplacesQuery()
  const [partner, setPartner] = useState<PartnerOption | null>(null)
  const [showExcel, setShowExcel] = useState(false)
  /** Whether the run in progress also submits, so the progress shows its Submit step. */
  const [submitting, setSubmitting] = useState(true)

  const form = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: { partnerId: '', entries: [emptyEntry('')] },
  })
  const { control, handleSubmit, setValue, getValues, formState } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'entries', keyName: 'key' })

  // A newly added request scrolls into view inside the list
  const list = useRef<HTMLDivElement>(null)
  const count = useRef(fields.length)
  useEffect(() => {
    if (fields.length > count.current) list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
    count.current = fields.length
  }, [fields.length])

  const pickPartner = (option: PartnerOption) => {
    const changed = option.id !== partner?.id
    setPartner(option)
    setValue('partnerId', String(option.id), { shouldValidate: true })
    getValues('entries').forEach((entry, index) => {
      // A PO belongs to one supplier and shipments to one carrier, so a different partner clears them; empty currencies start as the partner's
      if (changed) {
        setValue(`entries.${index}.purchaseOrder`, null)
        setValue(`entries.${index}.shipments`, [])
      }
      if (!entry.currency || changed) setValue(`entries.${index}.currency`, option.currency)
    })
  }

  const run = (submit: boolean) =>
    handleSubmit((values) => {
      setSubmitting(submit)
      return stream.startEntries({ partnerId: Number(values.partnerId), submit, entries: values.entries.map((entry) => toEntryBody(values.partnerId, entry)) })
    })

  const closeRun = () => {
    const batchId = stream.result?.batchId
    const clean = stream.status === 'done' && batchId && stream.rowErrors.length === 0
    stream.reset()
    if (clean) router.push(`${LIST_URL}?tab=ALL&batchId=${batchId}`)
  }

  const entriesError = formState.errors.entries?.message ?? formState.errors.entries?.root?.message
  const busy = stream.status === 'running'

  return (
    <Container size="full" className="py-4 sm:py-8">
      <form noValidate onSubmit={run(true)} className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Payment Request Creation</h1>
          <BatchModeToggle checked onChange={(on) => !on && onExit()} disabled={busy} />
          <Button type="button" variant="outline" size="sm" onClick={() => setShowExcel(true)} disabled={busy}>
            Upload Excel
          </Button>
        </div>

        <Section title="Partner" note="who is being paid; shared by every request below">
          <FormField label="Partner" htmlFor="partner" required error={formState.errors.partnerId?.message}>
            <PartnerSelect id="partner" selected={partner} error={formState.errors.partnerId?.message} onSelect={pickPartner} />
          </FormField>
          {partner && <PartnerChips partner={partner} />}
        </Section>

        <Section title="Requests" note={`${fields.length} of up to ${MAX_BATCH_ENTRIES}`}>
          <div ref={list} className="h-[calc(100vh-30rem)] min-h-[22rem] space-y-3 overflow-y-auto pr-1" aria-label="Payment requests in this batch">
            {fields.map((field, index) => (
              <BatchEntryCard
                key={field.key}
                form={form}
                index={index}
                partner={partner}
                costCenters={costCenters}
                loadingCostCenters={loadingCostCenters}
                marketplaces={marketplaces}
                onRemove={fields.length > 1 ? () => remove(index) : null}
              />
            ))}
          </div>
          {entriesError && <p className="mt-2 text-sm text-danger-600">{entriesError}</p>}
          <div className="mt-3">
            <Button type="button" variant="outline" size="sm" disabled={fields.length >= MAX_BATCH_ENTRIES || busy} onClick={() => append(emptyEntry(partner?.currency ?? ''))}>
              + Add request
            </Button>
          </div>
        </Section>

        <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
          <Link href={LIST_URL} className="mr-auto px-2 text-sm font-medium text-text-secondary hover:underline sm:mr-2">
            Cancel
          </Link>
          <Button type="button" variant="outline" disabled={busy} onClick={run(false)}>
            Save drafts
          </Button>
          <Button type="submit" disabled={busy}>
            Process {fields.length > 1 ? `${fields.length} ` : ''}For Approval
          </Button>
        </div>
      </form>

      <Modal isOpen={stream.status !== 'idle'} onClose={closeRun} title="Creating payment requests" size="md">
        <BatchProgressPanel run={stream} submit={submitting} onClose={closeRun} onBack={stream.reset} />
      </Modal>
      <BatchExcelModal isOpen={showExcel} onClose={() => setShowExcel(false)} partner={partner} />
    </Container>
  )
}
