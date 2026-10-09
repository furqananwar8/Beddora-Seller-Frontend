import type { PartnerOption } from '@/services/api/finance.api'
import type { PaymentRequestFormValues } from './schema'
import { createFormDraft } from '../shared/formDraft'

export interface RequestDraft {
  values: PaymentRequestFormValues
  files: File[]
  partner: PartnerOption | null
}

const store = createFormDraft<RequestDraft>()

/** Kept while the user detours to create a partner or a cost center. */
export const saveRequestDraft = (next: RequestDraft): void => store.save({ values: { ...next.values }, files: [...next.files], partner: next.partner })

export const peekRequestDraft = (): RequestDraft | null => store.peek()

export const clearRequestDraft = (): void => store.clear()

/** Screens a create form may send the user back to (same-app paths only, which prevents open redirects). */
const RETURN_ROOTS = ['/dashboard/finance/', '/dashboard/procurement/']

export const safeFinanceReturnTo = (value: string | null | undefined): string | null => {
  if (!value || !RETURN_ROOTS.some((root) => value.startsWith(root)) || value.startsWith('//') || value.includes('\\')) return null
  return value
}

/** Appends a query param to a path that may already carry a query string. */
export const withQueryParam = (path: string, key: string, value: string): string => {
  const joiner = path.includes('?') ? '&' : '?'
  return `${path}${joiner}${key}=${encodeURIComponent(value)}`
}
