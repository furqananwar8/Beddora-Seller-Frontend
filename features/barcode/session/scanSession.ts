import type { BadgeProps } from '@/design-system/badges'
import type { ReturnCondition, ScanDirection, ScanLineState, ScanScenario, ScanSessionScan } from '@/services/api/barcode.api'

/** The record a scan is started from; the scan screen and the stock movement follow from it. */
export interface ScanTarget {
  scenario: ScanScenario
  sourceId: string
}

export const sessionHref = (id: number, condition?: ReturnCondition) => `/dashboard/barcode/session/${id}${condition ? `?condition=${condition}` : ''}`

export const DIRECTION_META: Record<ScanDirection, { label: string; hint: string; badge: NonNullable<BadgeProps['variant']> }> = {
  OUT: { label: 'Inventory out', hint: 'Units are leaving: shipping to a customer or to the channel.', badge: 'warning' },
  IN: { label: 'Inventory in', hint: 'Units are coming back: a return. Each unit is added back by its condition.', badge: 'success' },
}

export const LINE_STATE_META: Record<ScanLineState, { label: string; badge: NonNullable<BadgeProps['variant']> }> = {
  NOT_STARTED: { label: 'Not started', badge: 'secondary' },
  IN_PROGRESS: { label: 'In progress', badge: 'primary' },
  MATCHED: { label: 'Matched', badge: 'success' },
  OVER: { label: 'Over', badge: 'error' },
}

export const SCAN_STATE_META: Record<ScanSessionScan['state'], { label: string; badge: NonNullable<BadgeProps['variant']> }> = {
  COUNTED: { label: 'Counted', badge: 'success' },
  NOT_ON_RECORD: { label: 'Not on this record', badge: 'warning' },
  NOT_IN_INVENTORY: { label: 'Not in inventory', badge: 'error' },
}
