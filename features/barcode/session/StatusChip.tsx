import { Badge } from '@/design-system/badges'
import { sessionStatus } from './scanSession'
import type { ScanSessionSummary } from '@/services/api/barcode.api'

/** "In progress" in the dark brand colour (the primary badge variant is too light to read in this theme). */
export function LiveChip({ children = '● In progress' }: { children?: string }) {
  return <span className="inline-flex items-center whitespace-nowrap rounded-full bg-text-primary px-2.5 py-0.5 text-xs font-semibold text-white">{children}</span>
}

const VARIANT = { ok: 'success', warn: 'warning', neutral: 'secondary' } as const

export function StatusChip({ session, size = 'sm' }: { session: Pick<ScanSessionSummary, 'status' | 'notMatched'>; size?: 'sm' | 'md' }) {
  const status = sessionStatus(session)
  if (status.tone === 'live') return <LiveChip />
  return (
    <Badge variant={VARIANT[status.tone]} size={size}>
      {status.label}
    </Badge>
  )
}
