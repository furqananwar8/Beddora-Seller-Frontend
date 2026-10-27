import { useCallback } from 'react'
import { useReportExport } from '@/hooks/useReportExport'

/**
 * Downloads a purchase order's PDF. It is built on the server's export worker; a toast says it is being prepared,
 * and the file downloads by itself once the server announces it (as every export does). One at a time.
 */
export function usePoPdfDownload() {
  const { start, isExporting } = useReportExport('purchase-order-pdf', { noun: 'PDF' })
  const download = useCallback((purchaseOrderId: number) => void start('pdf', { purchaseOrderId }), [start])
  return { download, isExporting }
}
