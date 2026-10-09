import type { FinanceDocument, PartnerOption } from '@/services/api/finance.api'
import { createFormDraft } from '@/features/finance/shared/formDraft'
import type { PurchaseInvoiceFormValues } from './schema'

/** What the invoice form holds while the user detours to create a cost center. */
export interface InvoiceDraft {
  values: PurchaseInvoiceFormValues
  files: File[]
  partner: PartnerOption | null
  /** Documents carried from the PO's payment requests (new invoices only). */
  carried: FinanceDocument[] | null
}

export const invoiceDraft = createFormDraft<InvoiceDraft>()
