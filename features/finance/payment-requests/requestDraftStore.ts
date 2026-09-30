import type { PartnerOption } from '@/services/api/finance.api'
import type { PaymentRequestFormValues } from './schema'

export interface RequestDraft {
  values: PaymentRequestFormValues
  files: File[]
  partner: PartnerOption | null
}

/**
 * In-memory hand-off for the request form while the user detours to create a partner.
 * Module state survives client-side navigation; a full reload clears it on purpose.
 */
let draft: RequestDraft | null = null

export const saveRequestDraft = (next: RequestDraft): void => {
  draft = { values: { ...next.values }, files: [...next.files], partner: next.partner }
}

export const peekRequestDraft = (): RequestDraft | null => draft

export const clearRequestDraft = (): void => {
  draft = null
}

/** Only same-app finance paths are valid return targets (prevents open redirects). */
export const safeFinanceReturnTo = (value: string | null | undefined): string | null => {
  if (!value || !value.startsWith('/dashboard/finance/') || value.startsWith('//') || value.includes('\\')) return null
  return value
}

/** Appends a query param to a path that may already carry a query string. */
export const withQueryParam = (path: string, key: string, value: string): string => {
  const joiner = path.includes('?') ? '&' : '?'
  return `${path}${joiner}${key}=${encodeURIComponent(value)}`
}
