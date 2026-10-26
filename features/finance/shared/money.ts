/** Money math shared by finance forms. The backend stays the source of truth. */

export const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100

/** Amount converted at a rate, rounded to 2 decimals. */
export const convertedAmount = (amount: number, rate: number): number =>
  Number.isFinite(amount) && Number.isFinite(rate) ? round2(amount * rate) : 0
