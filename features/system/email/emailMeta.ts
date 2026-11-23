import { format } from 'date-fns'
import type { StatusTone } from '@/components/status-badge/StatusBadge'
import type { EmailListParams, EmailRow, EmailStatus } from '@/services/api/systemEmail.api'

export const STATUS_META: Record<EmailStatus, { label: string; tone: StatusTone }> = {
  QUEUED: { label: 'Queued', tone: 'warning' },
  SENT: { label: 'Sent', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
}

/** "23 Nov 10:05", in the viewer's time. */
export const stamp = (iso: string): string => format(new Date(iso), 'dd MMM HH:mm')

/** How often it was delivered, and when it last was: "2× · 23 Nov 10:05", or "0×" when it never was. */
export const sentLabel = (row: Pick<EmailRow, 'sendCount' | 'lastSentAt'>): string => (row.sendCount > 0 && row.lastSentAt ? `${row.sendCount}× · ${stamp(row.lastSentAt)}` : `${row.sendCount}×`)

/**
 * Whether an email belongs on the list as filtered right now, so a live change can add or drop a row without a refetch.
 * shortcut: the day is judged in the viewer's time, the server's may differ around midnight; the next refetch settles it.
 */
export function belongsToList(row: EmailRow, filters: Pick<EmailListParams, 'status' | 'search' | 'template' | 'from' | 'to'>): boolean {
  if (filters.status !== 'ALL' && row.status !== filters.status) return false
  if (filters.template && row.template !== filters.template) return false
  const query = filters.search?.trim().toLowerCase()
  if (query && !`${row.toAddress} ${row.subject}`.toLowerCase().includes(query)) return false
  const day = format(new Date(row.createdAt), 'yyyy-MM-dd')
  return !(filters.from && day < filters.from) && !(filters.to && day > filters.to)
}
