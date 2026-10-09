import { useState } from 'react'
import { apiErrorMessage, useApiFeedback } from '@/hooks/useApiFeedback'
import { purchaseInvoicePdfPath, usePurchaseInvoiceActionMutation } from '@/services/api/procurement.api'
import { downloadApiFile, isApiFileError } from '@/utils/downloadFile'

export type InvoiceAction = 'submit' | 'withdraw' | 'approve' | 'reject' | 'hold'

interface InvoiceRef {
  id: number
  invoiceRef: string
}

const DONE: Record<InvoiceAction, (ref: string) => string> = {
  submit: (ref) => `${ref} sent for approval`,
  withdraw: (ref) => `${ref} withdrawn back to draft`,
  approve: (ref) => `${ref} approved`,
  reject: (ref) => `${ref} rejected`,
  hold: (ref) => `${ref} put on hold and moved back to draft`,
}

/**
 * Every lifecycle action on a purchase invoice with its feedback, plus the PDF download (which explains
 * kindly when the PDF is still being generated). Each action resolves true when it went through.
 */
export function usePurchaseInvoiceActions() {
  const [mutate] = usePurchaseInvoiceActionMutation()
  const { success, failure, info } = useApiFeedback()
  const [busy, setBusy] = useState<{ id: number; action: InvoiceAction } | null>(null)

  const run = async (invoice: InvoiceRef, action: InvoiceAction, extra: { reason?: string; note?: string } = {}): Promise<boolean> => {
    setBusy({ id: invoice.id, action })
    try {
      await mutate({ id: invoice.id, action, ...extra }).unwrap()
      success(DONE[action](invoice.invoiceRef))
      return true
    } catch (error) {
      failure(error, `Could not ${action} ${invoice.invoiceRef}`)
      return false
    } finally {
      setBusy(null)
    }
  }

  /** A PDF still rendering answers 409; the server queues it and notifies (bell) once it is ready. */
  const downloadPdf = async (invoice: InvoiceRef) => {
    try {
      await downloadApiFile(purchaseInvoicePdfPath(invoice.id), `${invoice.invoiceRef.replace('#', '')}.pdf`)
    } catch (error) {
      if (isApiFileError(error) && error.status === 409) info(apiErrorMessage(error, 'The PDF is still being generated. We will notify you once it is ready.'))
      else failure(error, 'Could not download the PDF')
    }
  }

  return {
    submit: (invoice: InvoiceRef) => run(invoice, 'submit'),
    withdraw: (invoice: InvoiceRef) => run(invoice, 'withdraw'),
    approve: (invoice: InvoiceRef, note?: string) => run(invoice, 'approve', { note: note?.trim() || undefined }),
    reject: (invoice: InvoiceRef, reason: string) => run(invoice, 'reject', { reason }),
    hold: (invoice: InvoiceRef) => run(invoice, 'hold'),
    downloadPdf,
    busy,
  }
}
