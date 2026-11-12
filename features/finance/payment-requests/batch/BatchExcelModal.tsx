'use client'

import React, { useState } from 'react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import type { PartnerOption } from '@/services/api/finance.api'
import { downloadApiFile } from '@/utils/downloadFile'
import { useFinanceFeedback } from '../../shared/useFinanceFeedback'
import { BatchProgressPanel } from './BatchProgressPanel'
import { BATCH_TEMPLATE_URL, MAX_BATCH_ENTRIES } from './types'
import { useBatchStream } from './useBatchStream'

interface BatchExcelModalProps {
  isOpen: boolean
  onClose: () => void
  /** The batch's partner: chosen on the form, not in the file. */
  partner: PartnerOption | null
}

/** Download the template, fill it in, upload it back; progress and any problems stream in here. */
export const BatchExcelModal: React.FC<BatchExcelModalProps> = ({ isOpen, onClose, partner }) => {
  const { failure } = useFinanceFeedback()
  const stream = useBatchStream()
  const [file, setFile] = useState<File | null>(null)
  const [submit, setSubmit] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const started = stream.status !== 'idle'

  const close = () => {
    if (stream.status === 'running') return
    stream.reset()
    setFile(null)
    onClose()
  }

  const download = async () => {
    setDownloading(true)
    try {
      // With the partner known, the template also lists that carrier's shipments
      await downloadApiFile(partner ? `${BATCH_TEMPLATE_URL}?partnerId=${partner.id}` : BATCH_TEMPLATE_URL, 'payment-requests-template.xlsx')
    } catch (error) {
      failure(error, 'Could not download the template')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title="Upload payment requests from Excel" size="lg">
      {started ? (
        <BatchProgressPanel run={stream} submit={submit} onClose={close} onBack={stream.reset} />
      ) : (
        <div className="space-y-5">
          <section className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-text-primary">1. Download the template</h3>
            <p className="mt-1 text-sm text-text-secondary">
              One row is one amount. Repeat the same <strong>Entry</strong> number on several rows to split one request across cost centers. Use the codes on the <em>Cost centers</em>, <em>Destinations</em> and <em>Shipments</em> sheets (the last appears once a partner is chosen). Reference type is Invoice, Purchase order or Shipment, and GST is Inclusive, Exclusive or Not applicable (with a percentage from the <em>GST rates</em> sheet). Up to {MAX_BATCH_ENTRIES} requests per file.
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-3" isLoading={downloading} onClick={download}>
              Download template (.xlsx)
            </Button>
          </section>

          <section className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-text-primary">2. Upload it back</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Partner: {partner ? <strong>{partner.name}</strong> : <span className="text-danger-600">choose a partner on the form first</span>}
            </p>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              aria-label="Excel file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mt-3 block w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-secondary-50"
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" checked={submit} onChange={(event) => setSubmit(event.target.checked)} />
              Send each request for approval (otherwise they are saved as drafts)
            </label>
          </section>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="button" disabled={!file || !partner} onClick={() => file && partner && void stream.startFile(file, partner.id, submit)}>
              Upload and create
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
