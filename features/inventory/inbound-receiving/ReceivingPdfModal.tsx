'use client'

import React, { useEffect, useState } from 'react'
import { SignaturePad } from '@/components/signature-pad/SignaturePad'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useReportExport } from '@/hooks/useReportExport'

interface ReceivingPdfModalProps {
  /** The container to print; the dialog is closed when null. */
  container: { id: number; containerNo: string } | null
  /** A signature already saved with the receipt: the pad starts with it, and it can be redrawn. */
  savedSignature?: string
  onClose: () => void
}

/**
 * "Download PDF": the receiver signs (or redraws) the sheet, then the server builds it in the background and the
 * file downloads by itself when the server announces it over SSE, with a toast, like every other PDF.
 */
export const ReceivingPdfModal: React.FC<ReceivingPdfModalProps> = ({ container, savedSignature = '', onClose }) => {
  const { start, isExporting } = useReportExport('inbound-receiving-pdf', { noun: 'PDF' })
  const [signature, setSignature] = useState(savedSignature)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    setSignature(savedSignature)
    setTouched(false)
  }, [container?.id, savedSignature])

  const submit = async () => {
    if (!container) return
    if (!signature) return setTouched(true)
    await start('pdf', { containerId: container.id, signature })
    onClose()
  }

  return (
    <Modal isOpen={container !== null} onClose={isExporting ? () => undefined : onClose} title={container ? `Download PDF · ${container.containerNo}` : undefined} size="md" closeOnEscape={!isExporting}>
      {/* Remounted per container so the pad redraws its saved signature */}
      <p className="mb-3 text-sm text-text-secondary">Sign the receiving sheet. Reset to sign again before downloading.</p>
      {container && (
        <SignaturePad
          key={container.id}
          value={signature}
          onChange={(value) => {
            setSignature(value)
            setTouched(true)
          }}
          error={touched && !signature ? 'A signature is required' : undefined}
          disabled={isExporting}
        />
      )}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose} disabled={isExporting}>
          Cancel
        </Button>
        <Button type="button" onClick={() => void submit()} isLoading={isExporting}>
          Confirm and download
        </Button>
      </div>
    </Modal>
  )
}
