import { useCallback, useState } from 'react'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { downloadApiFile, fetchApiBlob } from '@/utils/downloadFile'
import type { DocumentType, LabelFormat } from '../types'

/** How long a printed PDF's blob URL stays valid: long enough for the new tab to load it. */
const BLOB_TTL_MS = 60_000

const FILE_NAME: Record<DocumentType, string> = { label: 'label', commercial_invoice: 'commercial-invoice' }

/**
 * Fetches a shipment document with the user's token. PDFs open in a new tab, ready to print;
 * ZPL is raw printer language, so it downloads as a file for the Zebra driver.
 */
export function usePrintDocument() {
  const { failure } = useApiFeedback()
  const [busy, setBusy] = useState(false)

  const print = useCallback(
    async (shipment: { id: number; bookingNo: string }, type: DocumentType, format?: LabelFormat): Promise<boolean> => {
      const query = type === 'label' && format ? `?format=${format}` : ''
      const path = `/shipping/shipments/${shipment.id}/documents/${type}${query}`
      const zpl = type === 'label' && format?.startsWith('zpl')
      // Opened before the await so the browser treats it as part of the click, not a pop-up
      const tab = zpl ? null : window.open('', '_blank')
      setBusy(true)
      try {
        if (zpl) {
          await downloadApiFile(path, `${shipment.bookingNo}-${FILE_NAME[type]}.zpl`)
        } else {
          const url = URL.createObjectURL(await fetchApiBlob(path, 'application/pdf'))
          if (tab) tab.location.href = url
          else window.open(url, '_blank')
          window.setTimeout(() => URL.revokeObjectURL(url), BLOB_TTL_MS)
        }
        return true
      } catch (error) {
        tab?.close()
        failure(error, 'Could not get the document')
        return false
      } finally {
        setBusy(false)
      }
    },
    [failure]
  )

  return { print, busy }
}
