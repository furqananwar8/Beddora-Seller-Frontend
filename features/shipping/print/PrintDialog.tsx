'use client'

import React, { useEffect, useState } from 'react'
import { FormField } from '@/components/form-field/FormField'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Modal } from '@/design-system/modals'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useGetShipmentQuery } from '@/services/api/shipping.api'
import { useLabelFormats } from '../shared/useLabelFormats'
import { RadioCards } from '../shared/RadioCards'
import type { DocumentType, LabelFormat } from '../types'
import { usePrintDocument } from './usePrintDocument'

interface PrintDialogProps {
  /** The shipment to print for; null keeps the dialog closed. */
  shipmentId: number | null
  /** The document picked when the dialog opens. */
  initialDocument?: DocumentType
  onClose: () => void
}

const DOCUMENT_LABEL: Record<DocumentType, string> = { label: 'Shipping label', commercial_invoice: 'Commercial invoice' }

/** The label format this device prints with, when "Remember my choice" is ticked. */
const REMEMBERED_KEY = 'shipping.print.labelFormat'

/**
 * Print a shipment's label (in the size and format picked here) or its commercial invoice. Formats are the
 * provider's own (from /shipping/config); "Remember my choice" keeps the format on this device.
 */
export const PrintDialog: React.FC<PrintDialogProps> = ({ shipmentId, initialDocument = 'label', onClose }) => {
  const { data: shipment, isFetching } = useGetShipmentQuery(shipmentId ?? 0, { skip: shipmentId === null })
  const [remembered, setRemembered] = useLocalStorage<LabelFormat | null>(REMEMBERED_KEY, null)
  const [remember, setRemember] = useState(remembered !== null)
  const [document, setDocument] = useState<DocumentType>(initialDocument)
  const [format, setFormat] = useState<LabelFormat | null>(null)
  const { print, busy } = usePrintDocument()

  const formats = useLabelFormats(shipment?.provider)
  const documents = shipment?.documents ?? []

  // Each opening starts from the requested document and the best format: remembered, then the one booked with
  useEffect(() => {
    if (shipmentId === null) return
    setDocument(initialDocument)
    setFormat(null)
  }, [shipmentId, initialDocument])
  useEffect(() => {
    if (format || formats.length === 0) return
    const offered = (id: LabelFormat | null | undefined) => formats.find((option) => option.id === id)?.id
    setFormat(offered(remembered) ?? offered(shipment?.labelFormat) ?? formats[0].id)
  }, [format, formats, remembered, shipment?.labelFormat])

  const submit = async () => {
    if (!shipment) return
    if (document === 'label' && format) setRemembered(remember ? format : null)
    if (await print(shipment, document, document === 'label' ? format ?? undefined : undefined)) onClose()
  }

  return (
    <Modal isOpen={shipmentId !== null} onClose={busy ? () => undefined : onClose} title={`Print${shipment ? ` · ${shipment.bookingNo}` : ''}`} size="md">
      {!shipment ? (
        <div className="flex justify-center p-8">{isFetching ? <Spinner size="sm" /> : <p className="text-sm text-danger-600">Could not load the shipment.</p>}</div>
      ) : (
        <div className="space-y-4">
          {documents.length > 1 && (
            <FormField label="Document">
              <SegmentedToggle<DocumentType> ariaLabel="Document" value={document} onChange={setDocument} options={documents.map((value) => ({ value, label: DOCUMENT_LABEL[value] }))} />
            </FormField>
          )}
          {document === 'label' && (
            <>
              <FormField label="Label size & format">
                <RadioCards name="print-format" ariaLabel="Label size and format" columns={1} options={formats.map((option) => ({ value: option.id, title: option.label, description: option.description }))} value={format} onChange={setFormat} />
              </FormField>
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 accent-primary-600" />
                Remember my choice on this device
              </label>
            </>
          )}
          {!documents.includes(document) && <p className="text-sm text-text-muted">The provider has no {DOCUMENT_LABEL[document].toLowerCase()} for this shipment.</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} isLoading={busy} disabled={!documents.includes(document) || (document === 'label' && !format)}>
              Print
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
