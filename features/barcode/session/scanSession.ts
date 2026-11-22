import type { BadgeProps } from '@/design-system/badges'
import type { ReturnCondition, ScanDirection, ScanLineState, ScanScenario, ScanSessionScan, ScanSessionSummary } from '@/services/api/barcode.api'

/** The record a scan is started from; the scan screen and the stock movement follow from it. */
export interface ScanTarget {
  scenario: ScanScenario
  sourceId: string
}

/** Where each kind of record is scanned from, for the listing and the detail page. */
export const SOURCE_LABEL: Record<ScanScenario, string> = { FBA_WFS: 'Shipment', FBM_ORDER: 'Order', CONTAINER: 'Receiving' }

export const CHANNEL_LABEL: Record<string, string> = {
  AMAZON_FBA: 'Amazon FBA',
  WALMART_WFS: 'Walmart WFS',
  amazon: 'Amazon FBM',
  walmart: 'Walmart',
  temu: 'Temu',
  INBOUND: 'Inbound',
}
export const channelName = (channel: string | null) => (channel ? CHANNEL_LABEL[channel] ?? channel : '-')

/** The wording on the listing: in progress, completed, or completed with UPCs that did not match. */
export function sessionStatus(session: Pick<ScanSessionSummary, 'status' | 'notMatched'>): { label: string; tone: 'live' | 'ok' | 'warn' | 'neutral' } {
  if (session.status === 'IN_PROGRESS') return { label: 'In progress', tone: 'live' }
  if (session.status === 'DISCARDED') return { label: 'Discarded', tone: 'neutral' }
  return session.notMatched > 0 ? { label: 'Completed · unmatched', tone: 'warn' } : { label: 'Completed', tone: 'ok' }
}

export const sessionCode = (id: number) => `S-${id}`

export const sessionHref = (id: number, condition?: ReturnCondition) => `/dashboard/barcode/session/${id}${condition ? `?condition=${condition}` : ''}`

export const DIRECTION_META: Record<ScanDirection, { label: string; hint: string; badge: NonNullable<BadgeProps['variant']> }> = {
  OUT: { label: 'Inventory out', hint: 'Units are leaving: shipping to a customer or to the channel.', badge: 'warning' },
  IN: { label: 'Inventory in', hint: 'Units are coming back: a return. Each unit is added back by its condition.', badge: 'success' },
}

/** A container's units come IN as received stock, not as a return: its wording and its two conditions. */
export const isReceipt = (scenario: ScanScenario) => scenario === 'CONTAINER'
export const inHint = (scenario: ScanScenario) => (isReceipt(scenario) ? 'Units are arriving: the container delivered to the warehouse. They are counted here; inventory is updated when the receipt is signed in Inbound Receiving.' : DIRECTION_META.IN.hint)
/** Going out (or a receiving) a unit is good or damaged; a return can also be a normal return. */
export const conditionsFor = (scenario: ScanScenario, direction: ScanDirection = 'IN'): ReturnCondition[] => (isReceipt(scenario) || direction === 'OUT' ? ['SELLABLE', 'DAMAGED'] : ['SELLABLE', 'NORMAL_RETURN', 'DAMAGED'])
export const conditionName = (scenario: ScanScenario, value: ReturnCondition, fallback: string) => (isReceipt(scenario) ? (value === 'SELLABLE' ? 'Good' : 'Damaged') : fallback)

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
