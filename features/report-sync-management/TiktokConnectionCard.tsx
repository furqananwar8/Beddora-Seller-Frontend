'use client'

import React, { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  useGetTiktokConnectionQuery,
  useLazyGetTiktokConnectUrlQuery,
  type TiktokConnection,
} from '@/services/api/report-sync-management.api'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'

/**
 * TikTok Shop connection on the Report Sync Management screen. The seller approves the app once; the backend keeps the
 * tokens and renews them in the background, so this card only asks for a new approval when TikTok no longer accepts
 * the saved one. After approving, TikTok sends the browser back here with `?tiktok=connected` (or `error`).
 */

const STATUS_TEXT: Record<TiktokConnection['status'], { label: string; tone: string }> = {
  connected: { label: 'Connected', tone: 'text-green-700 bg-green-50 border-green-200' },
  reauth_required: { label: 'Needs to be authorised again', tone: 'text-red-700 bg-red-50 border-red-200' },
  not_connected: { label: 'Not connected', tone: 'text-gray-700 bg-gray-50 border-gray-200' },
}

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

export const TiktokConnectionCard: React.FC = () => {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: connection, isLoading } = useGetTiktokConnectionQuery()
  const [getConnectUrl, { isFetching: isStarting }] = useLazyGetTiktokConnectUrlQuery()

  // The result of the approval arrives as a query parameter: say it once, then clean the address
  const result = searchParams.get('tiktok')
  useEffect(() => {
    if (result !== 'connected' && result !== 'error') return
    dispatch(
      addNotification(
        result === 'connected'
          ? { message: 'TikTok Shop connected. Its syncs start on their next run.', type: 'success' }
          : { message: 'TikTok authorisation failed. Please try again.', type: 'error' },
      ),
    )
    router.replace(pathname)
  }, [result, dispatch, router, pathname])

  const connect = async () => {
    try {
      window.location.href = await getConnectUrl().unwrap()
    } catch (error: any) {
      dispatch(addNotification({ message: error?.data?.message || 'Could not start the TikTok authorisation.', type: 'error' }))
    }
  }

  if (isLoading || !connection) return null
  const status = STATUS_TEXT[connection.status]

  return (
    <div className="mb-6 rounded border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">TikTok Shop connection</h2>
          <span className={`mt-1 inline-block rounded border px-2 py-0.5 text-xs font-medium ${status.tone}`}>{status.label}</span>
        </div>
        <button
          type="button"
          onClick={connect}
          disabled={!connection.configured || isStarting}
          title={connection.configured ? undefined : 'TIKTOK_SERVICE_ID is not set on the server'}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {connection.status === 'connected' ? 'Reconnect TikTok' : 'Connect TikTok'}
        </button>
      </div>

      {connection.status === 'connected' && (
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm text-gray-600 sm:grid-cols-2">
          <div>Seller: {connection.sellerName ?? '—'}</div>
          <div>Shops: {connection.shops.length ? connection.shops.map((shop) => `${shop.name ?? shop.id} (${shop.region})`).join(', ') : '—'}</div>
          <div>Token renewed: {formatDate(connection.lastRefreshedAt)}</div>
          <div>Authorisation valid until: {formatDate(connection.refreshExpiresAt)}</div>
        </dl>
      )}
      {connection.status === 'reauth_required' && (
        <p className="mt-3 text-sm text-red-700">TikTok no longer accepts the saved authorisation{connection.lastError ? `: ${connection.lastError}` : '.'}</p>
      )}
    </div>
  )
}
