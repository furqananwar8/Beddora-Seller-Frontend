import React from 'react'
import { Badge } from '@/design-system/badges'

type Variant = 'warning' | 'success' | 'secondary' | 'error'

/** Walmart's shipment status words vary by market, so they're read by meaning rather than listed one by one. */
const KINDS: { match: RegExp; label: string; variant: Variant }[] = [
  { match: /cancel/i, label: 'Cancelled', variant: 'secondary' },
  { match: /clos|complete/i, label: 'Closed', variant: 'success' },
  { match: /receiv/i, label: 'Receiving', variant: 'warning' },
  { match: /transit/i, label: 'In transit', variant: 'warning' },
  { match: /await|pending|creat/i, label: 'Awaiting delivery', variant: 'warning' },
]

/** "AWAITING_DELIVERY" → "Awaiting delivery", for statuses the badge has no word for. */
export const wfsStatusLabel = (status: string): string => status.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

export const WfsStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const kind = KINDS.find((k) => k.match.test(status))
  return <Badge variant={kind?.variant ?? 'secondary'}>{kind?.label ?? wfsStatusLabel(status)}</Badge>
}
