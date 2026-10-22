/** The currencies money is requested, invoiced and paid in. Keep in step with the backend's finance/common/currency.ts. */
export const CURRENCIES = ['CAD', 'USD', 'MXN'] as const

export type Currency = (typeof CURRENCIES)[number]

/**
 * Select options for the supported currencies. A record saved in a currency that is no longer offered keeps
 * showing it, so the form does not silently change it; the server asks for a supported one on save.
 */
export const currencyOptions = (current?: string | null): Array<{ value: string; label: string }> =>
  [...new Set<string>([...CURRENCIES, ...(current ? [current] : [])])].map((code) => ({ value: code, label: code }))
