/** A quote is booked within its life: a margin before `expiresAt` leaves room for the booking call itself. */
const MARGIN_MS = 30_000

export const rateIsFresh = (expiresAt: string | null) => expiresAt === null || Date.parse(expiresAt) - MARGIN_MS > Date.now()
