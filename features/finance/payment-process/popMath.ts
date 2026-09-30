/** Pure money math for the proof-of-payment form. The backend stays the source of truth. */

export const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100

/** Parses a typed amount; returns NaN when it is not a finite number. */
export const parseNumber = (value: string): number => {
  const trimmed = value.trim()
  if (trimmed === '') return NaN
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : NaN
}

/** What is left to pay after a payment of `amount` (never below zero). */
export const remainingAfter = (balance: number, amount: number): number =>
  Number.isFinite(amount) ? Math.max(0, round2(balance - amount)) : round2(balance)

/** Amount converted to the base currency, rounded to 2 decimals. */
export const convertedAmount = (amount: number, rate: number): number =>
  Number.isFinite(amount) && Number.isFinite(rate) ? round2(amount * rate) : 0

/** True when the amount fits inside the balance (cent tolerance). */
export const withinBalance = (amount: number, balance: number): boolean => amount <= round2(balance) + 0.001
