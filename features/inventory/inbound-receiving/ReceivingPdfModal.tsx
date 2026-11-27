'use client'

import React, { useEffect, useRef, useState } from 'react'
import { SignaturePad } from '@/components/signature-pad/SignaturePad'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useReportExport } from '@/hooks/useReportExport'

interface ReceivingPdfModalProps {
  /** The container to print; the dialog is closed when null. */
  container: { id: number; containerNo: string } | null
  /** The receipt is already signed: the server prints the saved signature, so nobody signs again. */
  signed?: boolean
  onClose: () => void
}

/**
 * "Download PDF": a signed receipt downloads straight away with its saved signature; otherwise the receiver signs first.
 * Either way the server builds it in the background and the file downloads by itself when the server announces it over
 * SSE, with a toast, like every other PDF.
 */
export const ReceivingPdfModal: React.FC<ReceivingPdfModalProps> = ({ container, signed = false, onClose }) => {
  const { start, isExporting } = useReportExport('inbound-receiving-pdf', { noun: 'PDF' })
  const [signature, setSignature] = useState('')
  const [touched, setTouched] = useState(false)
  const autoStarted = useRef<number | null>(null)

  useEffect(() => {
    setSignature('')
    setTouched(false)
  }, [container?.id])

  useEffect(() => {
    if (!container) return void (autoStarted.current = null)
    if (!signed || autoStarted.current === container.id) return
    autoStarted.current = container.id
    void start('pdf', { containerId: container.id }).finally(onClose)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per opened container
  }, [container, signed])

  const submit = async () => {
    if (!container) return
    if (!signature) return setTouched(true)
    await start('pdf', { containerId: container.id, signature })
    onClose()
  }

  return (
    <Modal isOpen={container !== null && !signed} onClose={isExporting ? () => undefined : onClose} title={container ? `Download PDF · ${container.containerNo}` : undefined} size="md" closeOnEscape={!isExporting}>
      <p className="mb-3 text-sm text-text-secondary">Sign the receiving sheet before downloading.</p>
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
