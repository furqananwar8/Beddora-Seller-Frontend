import type { StatusTone } from '@/components/status-badge/StatusBadge'
import type { SampleStatus, SampleType } from '@/services/api/samples.api'

/** How each sample state reads on screen. UNPAID and REQUESTED are the ones still waiting on money. */
export const SAMPLE_STATUS_META: Record<SampleStatus, { label: string; tone: StatusTone }> = {
  FREE: { label: 'Free', tone: 'neutral' },
  UNPAID: { label: 'Unpaid', tone: 'warning' },
  REQUESTED: { label: 'Payment requested', tone: 'info' },
  PAID: { label: 'Paid', tone: 'success' },
}

export const SAMPLE_STATUS_OPTIONS: Array<{ value: SampleStatus | ''; label: string }> = [
  { value: '', label: 'Any status' },
  ...(Object.entries(SAMPLE_STATUS_META) as Array<[SampleStatus, { label: string }]>).map(([value, { label }]) => ({ value, label })),
]

export const SAMPLE_TYPE_OPTIONS: Array<{ value: SampleType | ''; label: string }> = [
  { value: '', label: 'Free and chargeable' },
  { value: 'FREE', label: 'Free' },
  { value: 'CHARGEABLE', label: 'Chargeable' },
]

/** A timestamp as a calendar day, or a dash when there is none. */
export const sampleDay = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString('en-CA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

export const sampleAmount = (currency: string, amount: number, isFree: boolean): string =>
  isFree ? 'Free' : `${currency} ${amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
