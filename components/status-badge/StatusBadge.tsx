import React from 'react'
import { cn } from '@/utils/cn'

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger'

const TONES: Record<StatusTone, { pill: string; dot: string }> = {
  neutral: { pill: 'bg-secondary-100 text-secondary-700', dot: 'bg-secondary-400' },
  info: { pill: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  warning: { pill: 'bg-warning-50 text-warning-700', dot: 'bg-warning-500' },
  success: { pill: 'bg-success-50 text-success-700', dot: 'bg-success-500' },
  danger: { pill: 'bg-danger-50 text-danger-700', dot: 'bg-danger-500' },
}

/** Status pill with a leading dot. Screens map their own statuses to a tone. */
export const StatusBadge: React.FC<{ label: string; tone: StatusTone; className?: string }> = ({ label, tone, className }) => (
  <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', TONES[tone].pill, className)}>
    <span className={cn('h-1.5 w-1.5 rounded-full', TONES[tone].dot)} />
    {label}
  </span>
)
