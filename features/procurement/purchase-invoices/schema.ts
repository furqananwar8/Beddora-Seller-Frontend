import { z } from 'zod'
import { parseAmount } from '@/features/finance/payment-requests/schema'
import type { PurchaseInvoiceBody, PurchaseInvoiceDetail, PurchaseOrderDetail } from '@/services/api/procurement.api'

/** Same cap as the server. */
export const MAX_EXPENSES = 20

const isMoney = (value: string) => value.trim() !== '' && Number.isFinite(parseAmount(value)) && parseAmount(value) >= 0

/** One PO SKU: the PO's quantity and rate are shown for reference, the invoiced ones are typed. */
const lineSchema = z.object({
  productId: z.number(),
  ref: z.string(),
  label: z.string(),
  poUnits: z.number(),
  poUnitPrice: z.number(),
  units: z.string().refine((value) => /^\d+$/.test(value.trim()), 'Whole number'),
  unitPrice: z.string().refine(isMoney, 'Enter a rate'),
})

const expenseSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Keep it under 120 characters'),
  remarks: z.string().trim().max(500, 'Keep it under 500 characters'),
  amount: z
    .string()
    .refine(isMoney, 'Enter a price')
    .refine((value) => parseAmount(value) > 0, 'Must be greater than zero'),
})

export type InvoiceLineValues = z.infer<typeof lineSchema>
export type InvoiceExpenseValues = z.infer<typeof expenseSchema>

export const purchaseInvoiceSchema = z
  .object({
    partnerId: z.string().min(1, 'Choose a partner'),
    invoiceNo: z.string().trim().min(1, 'Invoice number is required').max(80, 'Keep it under 80 characters'),
    invoiceDate: z.string().min(1, 'Invoice date is required'),
    marketplaceId: z.string(),
    currency: z.string().min(1, 'Choose a currency'),
    expenseTypeId: z.string().min(1, 'Choose an expense type'),
    remarks: z.string().trim().max(1000, 'Keep it under 1000 characters'),
    lines: z.array(lineSchema).min(1, 'The purchase order has no items'),
    expenses: z.array(expenseSchema).max(MAX_EXPENSES, `Up to ${MAX_EXPENSES} additional expenses`),
  })
  .refine((values) => invoiceTotals(values).amount > 0, { path: ['lines'], message: 'The invoice total must be greater than zero' })

export type PurchaseInvoiceFormValues = z.infer<typeof purchaseInvoiceSchema>

export const emptyExpense: InvoiceExpenseValues = { name: '', remarks: '', amount: '' }

export const emptyFormValues: PurchaseInvoiceFormValues = {
  partnerId: '',
  invoiceNo: '',
  invoiceDate: '',
  marketplaceId: '',
  currency: '',
  expenseTypeId: '',
  remarks: '',
  lines: [],
  expenses: [],
}

const round = (value: number) => Math.round(value * 100) / 100
/** Unparsable while typing counts as 0, so totals stay live. */
const number = (value: string) => (Number.isFinite(parseAmount(value)) ? parseAmount(value) : 0)

export const lineAmount = (line: Pick<InvoiceLineValues, 'units' | 'unitPrice'>) => round(number(line.units) * number(line.unitPrice))
export const poLineAmount = (line: Pick<InvoiceLineValues, 'poUnits' | 'poUnitPrice'>) => round(line.poUnits * line.poUnitPrice)

/** PO total, invoiced goods, expenses and the invoice amount (goods + expenses), as the server works it out. */
export function invoiceTotals(values: { lines: InvoiceLineValues[]; expenses: InvoiceExpenseValues[] }) {
  const po = round(values.lines.reduce((sum, line) => sum + poLineAmount(line), 0))
  const invoice = round(values.lines.reduce((sum, line) => sum + lineAmount(line), 0))
  const expenses = round(values.expenses.reduce((sum, expense) => sum + number(expense.amount), 0))
  return { po, invoice, expenses, amount: round(invoice + expenses) }
}

/** A new invoice starts as the PO: every SKU at the ordered quantity and rate. */
export const linesFromPurchaseOrder = (po: PurchaseOrderDetail): InvoiceLineValues[] =>
  po.lines.map((line) => ({
    productId: line.product.id,
    ref: line.product.pid,
    label: line.product.variantName ?? line.product.name,
    poUnits: line.unitsOrdered,
    poUnitPrice: line.unitPrice ?? 0,
    units: String(line.unitsOrdered),
    unitPrice: line.unitPrice !== null ? String(line.unitPrice) : '',
  }))

export const linesFromInvoice = (detail: PurchaseInvoiceDetail): InvoiceLineValues[] =>
  detail.lines.map((line) => ({
    productId: line.product.id,
    ref: line.product.pid,
    label: line.product.label,
    poUnits: line.po.units,
    poUnitPrice: line.po.unitPrice,
    units: String(line.units),
    unitPrice: String(line.unitPrice),
  }))

export const expensesFromInvoice = (detail: PurchaseInvoiceDetail): InvoiceExpenseValues[] =>
  detail.expenses.map((expense) => ({ name: expense.name, remarks: expense.remarks ?? '', amount: String(expense.amount) }))

/** JSON body for PATCH (and, as form fields, for POST). */
export function toUpdateBody(values: PurchaseInvoiceFormValues): Omit<PurchaseInvoiceBody, 'carriedDocumentIds'> {
  return {
    partnerId: Number(values.partnerId),
    invoiceNo: values.invoiceNo.trim(),
    invoiceDate: values.invoiceDate,
    marketplaceId: values.marketplaceId ? Number(values.marketplaceId) : null,
    expenseTypeId: Number(values.expenseTypeId),
    currency: values.currency,
    remarks: values.remarks.trim() || null,
    lines: values.lines.map((line) => ({ productId: line.productId, units: Number(line.units), unitPrice: parseAmount(line.unitPrice) })),
    expenses: values.expenses.map((expense) => ({ name: expense.name.trim(), remarks: expense.remarks.trim() || null, amount: parseAmount(expense.amount) })),
  }
}

/** Multipart body for POST: the fields (lines and expenses as JSON), the PO, the documents carried from it and new uploads. */
export function toCreateFormData(values: PurchaseInvoiceFormValues, purchaseOrderId: number, carriedDocumentIds: string[], files: File[]): FormData {
  const body = new FormData()
  body.append('purchaseOrderId', String(purchaseOrderId))
  Object.entries(toUpdateBody(values)).forEach(([key, value]) => {
    if (value === null) return
    body.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
  })
  body.append('carriedDocumentIds', carriedDocumentIds.join(','))
  files.forEach((file) => body.append('documents', file))
  return body
}
