import { z } from 'zod'
import { addReferenceIssues, baseSchema, emptyLine, toUpdateBody, type PaymentRequestFormValues } from '../schema'
import { MAX_BATCH_ENTRIES } from './types'

/** One request of a batch: the same fields as the one-off form, minus the partner (shared by the whole batch). */
const entrySchema = baseSchema.omit({ partnerId: true })

export const batchSchema = z
  .object({
    partnerId: z.string().min(1, 'Choose a partner'),
    entries: z.array(entrySchema).min(1, 'Add a request').max(MAX_BATCH_ENTRIES, `Up to ${MAX_BATCH_ENTRIES} requests per batch`),
  })
  .superRefine((values, ctx) => values.entries.forEach((entry, index) => addReferenceIssues(entry, ctx, ['entries', index])))

export type BatchFormValues = z.infer<typeof batchSchema>
export type BatchEntryValues = BatchFormValues['entries'][number]

export const emptyEntry = (currency: string): BatchEntryValues => ({
  referenceType: 'INVOICE',
  invoiceNo: '',
  purchaseOrder: null,
  shipments: [],
  invoiceDate: '',
  dueDate: '',
  containerNo: '',
  marketplaceId: '',
  currency,
  gstType: 'NOT_APPLICABLE',
  lines: [emptyLine],
  remarks: '',
})

/** The server's body for one entry: the one-off request body, which the batch endpoint reads the same way. */
export const toEntryBody = (partnerId: string, entry: BatchEntryValues) => toUpdateBody({ ...entry, partnerId } satisfies PaymentRequestFormValues)
