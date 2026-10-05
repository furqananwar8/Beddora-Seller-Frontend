'use client'

import { useRealtime } from '@/components/realtime/RealtimeProvider'
import { baseApi } from '@/services/api/baseApi'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'

/** Events that mean cached data is stale: the tags to refetch when one arrives, keyed by the event's `data.kind`. */
const INVALIDATE_ON: Record<string, Parameters<typeof baseApi.util.invalidateTags>[0]> = {
  'seller-central:sync': ['SellerCentralShipments', 'SellerCentralSync'],
}

interface SyncPayload {
  type: string
  message?: string
  toastType?: 'info' | 'success' | 'warning' | 'error'
  data?: { kind?: string }
}

/**
 * Inventory sync toasts and refetches. Rides the app's one realtime stream (topic `inventory.sync`),
 * so it must be rendered inside `RealtimeProvider`.
 */
export const SyncEventListener: React.FC = () => {
  const dispatch = useAppDispatch()

  useRealtime('inventory.sync', (message) => {
    const payload = message.data as unknown as SyncPayload
    const stale = payload.data?.kind ? INVALIDATE_ON[payload.data.kind] : undefined
    if (stale) dispatch(baseApi.util.invalidateTags(stale))
    if (payload.message && payload.toastType) dispatch(addNotification({ message: payload.message, type: payload.toastType }))
  })

  return null
}
