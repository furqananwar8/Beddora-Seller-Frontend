import { z } from 'zod'
import { parseNumber, withinBalance } from './popMath'

export interface PopFormValues {
  type: 'FULL' | 'SPLIT'
  amount: string
  paymentDate: string
  fxRate: string
  reference: string
  files: File[]
}

/** Schema depends on the row: the balance caps the amount and CAD requests need no rate. */
export const makePopSchema = (balance: number, needsFx: boolean) =>
  z
    .object({
      type: z.enum(['FULL', 'SPLIT']),
      amount: z.string(),
      paymentDate: z.string().min(1, 'Payment date is required'),
      fxRate: z.string(),
      reference: z.string().max(100, 'Keep the reference under 100 characters'),
      files: z.array(z.custom<File>((value) => value instanceof File)).min(1, 'Upload the proof of payment'),
    })
    .superRefine((values, ctx) => {
      const amount = parseNumber(values.amount)
      if (!(amount > 0)) {
        ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Enter an amount greater than 0' })
      } else if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) {
        ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Use at most 2 decimals' })
      } else if (!withinBalance(amount, balance)) {
        ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Amount cannot exceed the balance' })
      }
      if (needsFx && !(parseNumber(values.fxRate) > 0)) {
        ctx.addIssue({ code: 'custom', path: ['fxRate'], message: 'Enter an exchange rate greater than 0' })
      }
    })
