import { z } from 'zod'
import type { StockCountRow } from '@/services/api/stockCount.api'

/**
 * A count says what the warehouse held on the day; what shipped or arrived since carries forward, so
 * on hand now after the count = on hand now + (counted - system). Mirrors the backend's stock-count planner,
 * which stays the source of truth when saving.
 */
export const varianceOf = (row: StockCountRow, counted: number): number => counted - row.systemOnHand

export const onHandAfter = (row: StockCountRow, counted: number): number => row.currentOnHand + varianceOf(row, counted)

/** Lowest count that still leaves the units held by FBA shipments on hand today. */
export const minimumCount = (row: StockCountRow): number => Math.max(0, row.systemOnHand + row.minimum - row.currentOnHand)

const n = (value: number) => value.toLocaleString()

/** Why the count can't go lower, for the error under the field. */
const floorMessage = (row: StockCountRow): string => {
  const reasons = [
    row.movedSince.out > 0 ? `${n(row.movedSince.out)} units shipped or sold since ${row.asOf}` : null,
    row.minimum > 0 ? `${n(row.minimum)} held by FBA shipments` : null,
  ].filter(Boolean)
  return `At least ${n(minimumCount(row))}${reasons.length ? ` (${reasons.join(', ')})` : ''}`
}

export const makeCountSchema = (row: StockCountRow) =>
  z.object({
    counted: z
      .number({ error: 'Enter the counted units' })
      .int('Enter a whole number')
      .min(minimumCount(row), { message: floorMessage(row) }),
    note: z.string().trim().max(500, 'Keep the note under 500 characters').optional(),
  })

export type CountFormValues = z.infer<ReturnType<typeof makeCountSchema>>
