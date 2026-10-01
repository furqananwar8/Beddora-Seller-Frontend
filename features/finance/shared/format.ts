import { format } from 'date-fns'

export const formatMoney = (value: number): string =>
  value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatCurrencyAmount = (currency: string, value: number): string => `${currency} ${formatMoney(value)}`

/** Dates arrive as ISO strings; invoice and payment dates are calendar days, so read them as UTC. */
export function formatDay(value: string | Date, pattern = 'dd MMM yyyy'): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return format(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()), pattern)
}

export const toDateInputValue = (value: string | Date): string => new Date(value).toISOString().slice(0, 10)

export const todayInputValue = (): string => new Date().toISOString().slice(0, 10)

/** Reference numbers start at 10001 so they always read as five digits. Keep in step with the backend's finance reference formatter. */
const REFERENCE_OFFSET = 10000
export const formatRequestNo = (id: number): string => `PPC#${REFERENCE_OFFSET + id}`
export const formatDocNo = (id: number): string => `PP#${REFERENCE_OFFSET + id}`
export const formatPartnerNo = (id: number): string => `#${id}`

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
