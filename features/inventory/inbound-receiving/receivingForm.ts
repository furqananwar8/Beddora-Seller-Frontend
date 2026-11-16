import { z } from 'zod'
import type { ReceivingLine } from '@/services/api/inboundReceiving.api'

/** A whole number of units typed into a cell; blank counts as zero when the units are added up. */
const units = z
  .string()
  .trim()
  .regex(/^\d*$/, 'Whole units only')
  .max(9, 'Too large')

const lineSchema = z
  .object({ lineId: z.number(), expected: z.number(), good: units, damaged: units, shortage: units })
  .superRefine((line, ctx) => {
    const counted = toUnits(line.good) + toUnits(line.damaged) + toUnits(line.shortage)
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

export const toUnits = (value: string): number => (value === '' ? 0 : Number(value))

/** Good + damaged: what physically arrived. */
export const actualOf = (line: Pick<ReceivingFormValues['lines'][number], 'good' | 'damaged'>): number => toUnits(line.good) + toUnits(line.damaged)

/**
 * One line's starting units. With scanning done for the container they follow the scan: damaged is what was said at the
 * review step, good is every other scanned unit, and shortage is whatever of the expected units was not scanned. Without a
 * scan everything is assumed good and nothing damaged or short, so the receiver only types the exceptions. Either way the
 * three add up to the expected units.
 */
export function startingUnits(line: ReceivingLine, scanStarted: boolean): { good: number; damaged: number; shortage: number } {
  if (!scanStarted) return { good: line.expectedUnits, damaged: 0, shortage: 0 }
  const damaged = Math.min(line.expectedUnits, line.scanned.damagedUnits)
  const good = Math.min(line.expectedUnits - damaged, line.scanned.goodUnits)
  return { good, damaged, shortage: line.expectedUnits - damaged - good }
}

export const defaultsFor = (lines: ReceivingLine[], scanStarted = false): ReceivingFormValues => ({
  lines: lines.map((line) => {
    const start = startingUnits(line, scanStarted)
    return { lineId: line.lineId, expected: line.expectedUnits, good: String(start.good), damaged: String(start.damaged), shortage: String(start.shortage) }
  }),
  signature: '',
})
