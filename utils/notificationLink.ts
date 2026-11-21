import type { AppNotification } from '@/services/api/notifications.api'

/** Data keys that name the record a notification is about, in the order they are tried. */
const ENTITY_KEYS = ['requestId', 'paymentDocumentId', 'purchaseInvoiceId', 'purchaseOrderId', 'containerId'] as const

/**
 * Where a notification leads: its stored link plus `highlight=<record id>`, so the destination list marks the row.
 * `open=<id>` links (which carry the record id themselves) win over the data keys.
 */
export function notificationHref(notification: Pick<AppNotification, 'link' | 'data'>): string | null {
  if (!notification.link) return null
  const url = new URL(notification.link, 'http://local')
  if (url.searchParams.has('highlight')) return notification.link

  const fromLink = Number(url.searchParams.get('open'))
  const fromData = ENTITY_KEYS.map((key) => Number(notification.data?.[key])).find((value) => Number.isInteger(value) && value > 0)
  const id = Number.isInteger(fromLink) && fromLink > 0 ? fromLink : fromData
  if (id) url.searchParams.set('highlight', String(id))
  return `${url.pathname}${url.search}${url.hash}`
}
