import { z } from 'zod'

export const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'CNY', 'INR', 'AED', 'PKR', 'AUD', 'JPY']

/** "12,450.50" -> 12450.5, NaN when it is not a number. */
export const parseAmount = (value: string): number => Number(value.replace(/,/g, '').trim())

export const paymentRequestSchema = z.object({
  partnerId: z.string().min(1, 'Choose a partner'),
  invoiceNo: z.string().trim().min(1, 'Invoice number is required').max(80, 'Keep it under 80 characters'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  containerNo: z.string().trim().max(60, 'Keep it under 60 characters'),
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

export type PaymentRequestFormValues = z.infer<typeof paymentRequestSchema>

export const emptyFormValues: PaymentRequestFormValues = {
  partnerId: '',
  invoiceNo: '',
  invoiceDate: '',
  containerNo: '',
  marketplaceId: '',
  currency: '',
  amount: '',
  expenseTypeId: '',
  remarks: '',
}

/** JSON body for PATCH, shared by edit and the save-after-create retry path. */
export function toUpdateBody(values: PaymentRequestFormValues) {
  return {
    partnerId: Number(values.partnerId),
    invoiceNo: values.invoiceNo.trim(),
    invoiceDate: values.invoiceDate,
    containerNo: values.containerNo.trim() || null,
    marketplaceId: values.marketplaceId ? Number(values.marketplaceId) : null,
    expenseTypeId: Number(values.expenseTypeId),
    currency: values.currency,
    amount: parseAmount(values.amount),
    remarks: values.remarks.trim() || null,
  }
}

export function toCreateFormData(values: PaymentRequestFormValues, files: File[]): FormData {
  const body = new FormData()
  body.append('partnerId', values.partnerId)
  body.append('invoiceNo', values.invoiceNo.trim())
  body.append('invoiceDate', values.invoiceDate)
  if (values.containerNo.trim()) body.append('containerNo', values.containerNo.trim())
  if (values.marketplaceId) body.append('marketplaceId', values.marketplaceId)
  body.append('expenseTypeId', values.expenseTypeId)
  body.append('currency', values.currency)
  body.append('amount', String(parseAmount(values.amount)))
  if (values.remarks.trim()) body.append('remarks', values.remarks.trim())
  files.forEach((file) => body.append('documents', file))
  return body
}

export function filesFormData(files: File[]): FormData {
  const body = new FormData()
  files.forEach((file) => body.append('documents', file))
  return body
}
