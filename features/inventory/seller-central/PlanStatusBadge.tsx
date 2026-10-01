import React from 'react'
import { Badge } from '@/design-system/badges'

// Not 'primary': in this theme that variant renders as a dark block with unreadable text
const VARIANT: Record<string, 'warning' | 'success' | 'secondary' | 'error'> = {
  ACTIVE: 'warning',
  SHIPPED: 'success',
  VOIDED: 'secondary',
  ERRORED: 'error',
}

const LABEL: Record<string, string> = {
  ACTIVE: 'In progress',
  SHIPPED: 'Shipped',
  VOIDED: 'Voided',
  ERRORED: 'Error',
}

/** Amazon's plan status in the app's words. */
export const PlanStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <Badge variant={VARIANT[status] ?? 'secondary'}>{LABEL[status] ?? status}</Badge>
)
