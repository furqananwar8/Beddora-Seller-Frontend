'use client'

import React, { useState } from 'react'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { FileDropzone } from '@/components/file-dropzone/FileDropzone'
import {
  FinanceDocument,
  PaymentDocumentListItem,
  Pop,
  useAddPopDocumentsMutation,
  useGetPaymentDocumentQuery,
  useRemovePopDocumentMutation,
  useUpdatePopReferenceMutation,
} from '@/services/api/finance.api'
import { filesFormData } from '../payment-requests/schema'
import { DocumentChips } from '../shared/DocumentChips'
import { FormField, fieldClass } from '../shared/FormField'
import { formatCurrencyAmount, formatDay, formatDocNo } from '../shared/format'
import { useFinanceFeedback } from '../shared/useFinanceFeedback'
import { RequestInfo } from './RequestInfo'

/** A recorded value shown as the payment form shows it, but locked. */
const Locked: React.FC<{ id: string; label: string; value: string }> = ({ id, label, value }) => (
  <FormField label={label} htmlFor={id}>
    <input id={id} readOnly disabled value={value} className={fieldClass()} />
  </FormField>
)

/** The payment's reference, editable after the fact; saved on its own. */
const PopReference: React.FC<{ docId: number; pop: Pop; id: string }> = ({ docId, pop, id }) => {
  const feedback = useFinanceFeedback()
  const [value, setValue] = useState(pop.reference ?? '')
  const [updateReference, { isLoading: saving }] = useUpdatePopReferenceMutation()
  const changed = value.trim() !== (pop.reference ?? '')

  const save = async () => {
    try {
      const saved = await updateReference({ id: docId, popId: pop.id, reference: value.trim() || null }).unwrap()
      setValue(saved.reference ?? '')
      feedback.success('Reference saved')
    } catch (error) {
      feedback.failure(error, 'Could not save the reference')
    }
  }

  return (
    <FormField label="Reference / UTR" htmlFor={id}>
      <div className="flex gap-2">
        <input id={id} placeholder="Optional" maxLength={100} value={value} onChange={(event) => setValue(event.target.value)} className={fieldClass()} />
        {changed && (
          <Button type="button" size="sm" isLoading={saving} onClick={() => void save()}>
            Save
          </Button>
        )}
      </div>
    </FormField>
  )
}

/**
 * One recorded payment: its amounts and dates locked, its reference editable, its proof documents removable
 * (except the initial one) and new ones uploadable (several at once).
 */
const PopProofs: React.FC<{ docId: number; pop: Pop; index: number }> = ({ docId, pop, index }) => {
  const feedback = useFinanceFeedback()
  const [files, setFiles] = useState<File[]>([])
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [addDocuments, { isLoading: uploading }] = useAddPopDocumentsMutation()
  const [removeDocument] = useRemovePopDocumentMutation()
  const prefix = `pop-${pop.id}`

  const upload = async () => {
    try {
      await addDocuments({ id: docId, popId: pop.id, body: filesFormData(files) }).unwrap()
      feedback.success(`${files.length === 1 ? 'Proof' : `${files.length} proofs`} of payment added`)
      setFiles([])
    } catch (error) {
      feedback.failure(error, 'Could not upload the proof of payment')
    }
  }

  const remove = async (doc: FinanceDocument) => {
    setRemovingId(doc.id)
    try {
      await removeDocument({ id: docId, popId: pop.id, documentId: doc.id }).unwrap()
      feedback.success('Proof of payment removed')
    } catch (error) {
      feedback.failure(error, 'Could not remove the proof of payment')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-border p-3">
      <h3 className="text-sm font-semibold text-text-primary">Payment {index + 1}</h3>

      <FormField label="Proof of payment">
        <DocumentChips
          documents={pop.documents}
          onRemove={remove}
          canRemove={(doc) => doc.id !== pop.initialDocumentId}
          lockedLabel="Initial"
          removingId={removingId}
          emptyText="No proof file attached yet"
          className="mb-2"
        />
        <FileDropzone multiple files={files} onChange={setFiles} disabled={uploading} title="Upload proof of payment" hint="Bank confirmation / wire receipt · PDF or image" />
        {files.length > 0 && (
          <div className="mt-2 flex justify-end">
            <Button type="button" size="sm" isLoading={uploading} onClick={() => void upload()}>
              Upload {files.length === 1 ? 'file' : `${files.length} files`}
            </Button>
          </div>
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <Locked id={`${prefix}-bank`} label="Paid from bank" value={pop.bankProfile ? `${pop.bankProfile.name} · ${pop.bankProfile.currency}` : '-'} />
        <Locked id={`${prefix}-type`} label="Payment type" value={pop.type === 'FULL' ? 'Full' : 'Split'} />
        <Locked id={`${prefix}-amount`} label="Amount" value={formatCurrencyAmount(pop.currency, pop.amount)} />
        <Locked id={`${prefix}-date`} label="Payment Date" value={formatDay(pop.paymentDate)} />
        <PopReference docId={docId} pop={pop} id={`${prefix}-reference`} />
        {pop.baseCurrency !== pop.currency && <Locked id={`${prefix}-rate`} label={`Exchange rate (${pop.currency} to ${pop.baseCurrency})`} value={String(pop.fxRateApplied)} />}
      </div>
    </section>
  )
}

/**
 * The payment form after the fact: what was recorded stays locked, only the reference and proof documents change. Lets a payment
 * marked paid by mistake without (or with the wrong) proof be corrected.
 */
export const PopProofsForm: React.FC<{ row: PaymentDocumentListItem; onClose: () => void }> = ({ row, onClose }) => {
  const { data, isLoading, isError } = useGetPaymentDocumentQuery(row.id)

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        {formatDocNo(row.id)} · {row.partner.name} · {formatCurrencyAmount(row.currency, row.amount)} · paid {formatCurrencyAmount(row.currency, row.paidAmount)}
      </p>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size="sm" />
        </div>
      ) : isError || !data ? (
        <p className="text-sm text-danger-600">Could not load this payment.</p>
      ) : (
        <>
          <section className="rounded-lg border border-border p-3">
            <h3 className="mb-2 text-sm font-semibold text-text-primary">Request</h3>
            <RequestInfo request={data.request} />
          </section>
          {data.pops.length === 0 ? (
            <p className="text-sm text-text-muted">No payment recorded yet.</p>
          ) : (
            data.pops.map((pop, index) => <PopProofs key={pop.id} docId={row.id} pop={pop} index={index} />)
          )}
        </>
      )}

      <div className="flex justify-end pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  )
}
