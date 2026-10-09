import { z } from 'zod'
import { parseAmount } from '@/features/finance/payment-requests/schema'
import type { PurchaseInvoiceBody } from '@/services/api/procurement.api'

export const purchaseInvoiceSchema = z.object({
  partnerId: z.string().min(1, 'Choose a partner'),
  invoiceNo: z.string().trim().min(1, 'Invoice number is required').max(80, 'Keep it under 80 characters'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  marketplaceId: z.string(),
  currency: z.string().min(1, 'Choose a currency'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((value) => Number.isFinite(parseAmount(value)), 'Enter a valid amount')
    .refine((value) => parseAmount(value) > 0, 'Amount must be greater than zero'),
  expenseTypeId: z.string().min(1, 'Choose an expense type'),
  remarks: z.string().trim().max(1000, 'Keep it under 1000 characters'),
})

export type PurchaseInvoiceFormValues = z.infer<typeof purchaseInvoiceSchema>

export const emptyFormValues: PurchaseInvoiceFormValues = {
  partnerId: '',
  invoiceNo: '',
  invoiceDate: '',
  marketplaceId: '',
  currency: '',
  amount: '',
  expenseTypeId: '',
  remarks: '',
}

/** JSON body for PATCH. */
export function toUpdateBody(values: PurchaseInvoiceFormValues): Omit<PurchaseInvoiceBody, 'carriedDocumentIds'> {
  return {
    partnerId: Number(values.partnerId),
    invoiceNo: values.invoiceNo.trim(),
    invoiceDate: values.invoiceDate,
    marketplaceId: values.marketplaceId ? Number(values.marketplaceId) : null,
    expenseTypeId: Number(values.expenseTypeId),
    currency: values.currency,
    amount: parseAmount(values.amount),
    remarks: values.remarks.trim() || null,
  }
}

/** Multipart body for POST: the fields, the PO, the documents carried from it and new uploads. */
export function toCreateFormData(values: PurchaseInvoiceFormValues, purchaseOrderId: number, carriedDocumentIds: string[], files: File[]): FormData {
  const body = new FormData()
  body.append('purchaseOrderId', String(purchaseOrderId))
  Object.entries(toUpdateBody(values)).forEach(([key, value]) => {
    if (value !== null) body.append(key, String(value))
  })
  body.append('carriedDocumentIds', carriedDocumentIds.join(','))
  files.forEach((file) => body.append('documents', file))
  return body
}
