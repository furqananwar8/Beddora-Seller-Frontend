/** Money math shared by finance forms. The backend stays the source of truth. */

export const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100

/** What may be typed into a money field: digits and one decimal point, at most 2 decimals. No sign, letters or commas. */
export const sanitizeAmount = (raw: string): string => {
  const [whole, ...rest] = raw.replace(/[^\d.]/g, '').split('.')
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole
}

/** Amount converted at a rate, rounded to 2 decimals. */
export const convertedAmount = (amount: number, rate: number): number =>
  Number.isFinite(amount) && Number.isFinite(rate) ? round2(amount * rate) : 0
