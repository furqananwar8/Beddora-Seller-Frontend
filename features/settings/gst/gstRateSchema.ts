import { z } from 'zod'

/** Same rules as the server: a percentage above 0 and at most 100, with up to 2 decimals. */
export const gstRateSchema = z.object({
  rate: z
    .string()
    .trim()
    .min(1, 'Enter a percentage')
    .refine((value) => Number.isFinite(Number(value)), 'Enter a number')
    .refine((value) => Number(value) > 0, 'Must be greater than 0')
    .refine((value) => Number(value) <= 100, 'Cannot be more than 100')
    .refine((value) => Math.abs(Number(value) * 100 - Math.round(Number(value) * 100)) < 1e-6, 'Use at most 2 decimals'),
})

export type GstRateValues = z.infer<typeof gstRateSchema>
