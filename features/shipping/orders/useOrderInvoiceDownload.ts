import { useCallback } from 'react'
import { useReportExport } from '@/hooks/useReportExport'
import type { ChannelOrderRef } from '../types'

/**
 * Downloads a channel order's tax invoice. It is built on the server's export worker; a toast says it is being
 * prepared, and the file downloads by itself once the server announces it (as every export does). One at a time.
 */
export function useOrderInvoiceDownload() {
  const { start, isExporting } = useReportExport('order-invoice-pdf', { noun: 'invoice' })
  const download = useCallback(({ channel, market, orderId }: ChannelOrderRef) => void start('pdf', { channel, market, orderId }), [start])
  return { download, isExporting }
}
