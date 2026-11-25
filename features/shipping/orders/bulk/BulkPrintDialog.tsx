'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { FormField } from '@/components/form-field/FormField'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Alert } from '@/design-system/alerts'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useGetShippingConfigQuery, useLazyGetShipmentQuery } from '@/services/api/shipping.api'
import { downloadBlob, fetchApiBlob } from '@/utils/downloadFile'
import { RadioCards } from '../../shared/RadioCards'
import type { DocumentType, LabelFormat, ParcelShipmentDto } from '../../types'
import { mergePdfs } from './mergePdfs'
import { runPool } from './pool'

interface BulkPrintDialogProps {
  /** The shipments to print for; null keeps the dialog closed. */
  shipmentIds: number[] | null
  onClose: () => void
}

const DOCUMENT_LABEL: Record<DocumentType, string> = { label: 'Shipping labels', commercial_invoice: 'Commercial invoices' }
/** The label format this device prints with: shared with the single-order Print dialog. */
const REMEMBERED_KEY = 'shipping.print.labelFormat'
const FETCH_AT_ONCE = 3

/**
 * Print many parcels' labels (or commercial invoices) as one file: the PDFs are merged in order and opened in a new
 * tab; ZPL labels download as one .zpl. Only formats every selected carrier offers are listed, and parcels with no
 * such document are shown as skipped before anything is printed.
 */
export const BulkPrintDialog: React.FC<BulkPrintDialogProps> = ({ shipmentIds, onClose }) => {
  const { failure, info } = useApiFeedback()
  const { data: config } = useGetShippingConfigQuery()
  const [loadShipment] = useLazyGetShipmentQuery()
  const [shipments, setShipments] = useState<ParcelShipmentDto[] | null>(null)
  const [remembered, setRemembered] = useLocalStorage<LabelFormat | null>(REMEMBERED_KEY, null)
  const [remember, setRemember] = useState(remembered !== null)
  const [document, setDocument] = useState<DocumentType>('label')
  const [format, setFormat] = useState<LabelFormat | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!shipmentIds) return setShipments(null)
    let current = true
    const loaded: ParcelShipmentDto[] = []
    void runPool(shipmentIds, FETCH_AT_ONCE, async (id) => {
      const shipment = await loadShipment(id, true).unwrap().catch(() => null)
      if (shipment) loaded.push(shipment)
    }).then(() => current && setShipments(shipmentIds.map((id) => loaded.find((shipment) => shipment.id === id)).filter((shipment): shipment is ParcelShipmentDto => Boolean(shipment))))
    return () => {
      current = false
    }
  }, [shipmentIds, loadShipment])

  const printable = useMemo(() => (shipments ?? []).filter((shipment) => shipment.documents.includes(document)), [shipments, document])
  const hasInvoices = (shipments ?? []).some((shipment) => shipment.documents.includes('commercial_invoice'))

  // Formats every selected carrier offers
  const formats = useMemo(() => {
    const lists = [...new Set(printable.map((shipment) => shipment.provider))].map((provider) => config?.providers.find((item) => item.id === provider)?.labelFormats ?? [])
    return (lists[0] ?? []).filter((option) => lists.every((list) => list.some((other) => other.id === option.id)))
  }, [printable, config])
  const chosen = formats.find((option) => option.id === (format ?? remembered))?.id ?? formats[0]?.id ?? null
  const zpl = document === 'label' && Boolean(chosen?.startsWith('zpl'))

  const print = async () => {
    if (printable.length === 0) return
    // Opened before the awaits so the browser treats it as part of the click, not a pop-up
    const tab = zpl ? null : window.open('', '_blank')
    setBusy(true)
    try {
      const parts = new Map<number, Blob>()
      await runPool(printable, FETCH_AT_ONCE, async (shipment) => {
        const query = document === 'label' && chosen ? `?format=${chosen}` : ''
        parts.set(shipment.id, await fetchApiBlob(`/shipping/shipments/${shipment.id}/documents/${document}${query}`, zpl ? undefined : 'application/pdf'))
      })
      const ordered = printable.map((shipment) => parts.get(shipment.id)).filter((part): part is Blob => Boolean(part))
      if (document === 'label') setRemembered(remember ? chosen : null)
      if (zpl) downloadBlob(new Blob(ordered, { type: 'text/plain' }), `labels-${ordered.length}.zpl`)
      else {
        const url = URL.createObjectURL(await mergePdfs(ordered))
        if (tab) tab.location.href = url
        else window.open(url, '_blank')
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }
      info(`${ordered.length} ${DOCUMENT_LABEL[document].toLowerCase()} ready`)
      onClose()
    } catch (error) {
      tab?.close()
      failure(error, 'Could not get the documents')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal isOpen={shipmentIds !== null} onClose={busy ? () => undefined : onClose} title={`Print · ${shipmentIds?.length ?? 0} parcels`} size="lg">
      {!shipments ? (
        <div className="flex justify-center p-8">
          <Spinner size="sm" />
        </div>
      ) : (
        <div className="space-y-4">
          {hasInvoices && (
            <FormField label="Document">
              <SegmentedToggle<DocumentType> ariaLabel="Document" value={document} onChange={setDocument} options={(Object.keys(DOCUMENT_LABEL) as DocumentType[]).map((value) => ({ value, label: DOCUMENT_LABEL[value] }))} />
            </FormField>
          )}
          {document === 'label' && (
            <>
              <FormField label="Label size & format">
                <RadioCards name="bulk-print-format" ariaLabel="Label size and format" columns={1} options={formats.map((option) => ({ value: option.id, title: option.label, description: option.description }))} value={chosen} onChange={setFormat} />
              </FormField>
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 accent-primary-600" />
                Remember my choice on this device
              </label>
            </>
          )}
          <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm">
            {shipments.map((shipment) => (
              <li key={shipment.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="font-medium">{shipment.bookingNo}</span>
                <span className="text-text-muted">{shipment.carrier}</span>
                {shipment.documents.includes(document) ? <StatusBadge label="Included" tone="success" /> : <StatusBadge label="No such document" tone="neutral" />}
              </li>
            ))}
          </ul>
          {printable.length > 0 && formats.length === 0 && document === 'label' && <Alert variant="warning">The selected carriers have no label format in common. Print them in separate groups.</Alert>}
          <Alert variant="info">{zpl ? 'All labels download as one .zpl file.' : 'All documents are joined into one PDF that opens in a new tab, in the order listed.'}</Alert>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void print()} isLoading={busy} disabled={printable.length === 0 || (document === 'label' && !chosen)}>
              Print {printable.length}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
