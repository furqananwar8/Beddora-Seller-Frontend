import { z } from 'zod'
import type { ReceivingLine } from '@/services/api/inboundReceiving.api'

/** A whole number of cartons typed into a cell; blank counts as zero when the cartons are added up. */
const cartons = z
  .string()
  .trim()
  .regex(/^\d*$/, 'Whole cartons only')
  .max(9, 'Too large')

const lineSchema = z
  .object({ lineId: z.number(), expected: z.number(), good: cartons, damaged: cartons, shortage: cartons })
  .superRefine((line, ctx) => {
    const counted = toCartons(line.good) + toCartons(line.damaged) + toCartons(line.shortage)
    if (counted !== line.expected) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['shortage'], message: `Good, damaged and short must add up to ${line.expected} (now ${counted})` })
    }
  })

export const receivingSchema = z.object({
  lines: z.array(lineSchema).min(1),
  /** PNG data URL; the form cannot be submitted without it. */
  signature: z.string().min(1, 'Sign to confirm the receipt'),
})

export type ReceivingFormValues = z.infer<typeof receivingSchema>

export const toCartons = (value: string): number => (value === '' ? 0 : Number(value))

/** Good + damaged: what physically arrived. */
export const actualOf = (line: Pick<ReceivingFormValues['lines'][number], 'good' | 'damaged'>): number => toCartons(line.good) + toCartons(line.damaged)

/**
 * Starting figures: everything is assumed good and nothing damaged or short, so the receiver only types the
 * exceptions (the cartons still have to add up to what the list expected).
 */
export const defaultsFor = (lines: ReceivingLine[]): ReceivingFormValues => ({
  lines: lines.map((line) => ({ lineId: line.lineId, expected: line.expectedCartons, good: String(line.expectedCartons), damaged: '0', shortage: '0' })),
  signature: '',
})
