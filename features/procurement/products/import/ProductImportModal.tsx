'use client'

import React, { useState } from 'react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { PRODUCT_IMPORT_TEMPLATE_URL, useGetProductImportCurrentQuery, useUploadProductImportMutation } from '@/services/api/procurement.api'
import { downloadApiFile } from '@/utils/downloadFile'
import { ImportProgressPanel } from './ImportProgressPanel'
import { ImportResultsTable } from './ImportResultsTable'
import { importOutcome } from './ProductImportEventListener'

const TONE = {
  success: 'border-success-200 bg-success-50 text-success-700',
  warning: 'border-warning-200 bg-warning-50 text-warning-700',
  error: 'border-danger-200 bg-danger-50 text-danger-700',
} as const

interface ProductImportModalProps {
  isOpen: boolean
  onClose: () => void
}

/** Download the template, fill it in, upload it back. The products are created in the background, so the window can be closed and reopened. */
export const ProductImportModal: React.FC<ProductImportModalProps> = ({ isOpen, onClose }) => {
  const { failure } = useApiFeedback()
  // Realtime patches this while the window is open; a reopened window always reads the server first
  const { data: current, refetch } = useGetProductImportCurrentQuery(undefined, { skip: !isOpen, refetchOnMountOrArgChange: true })
  const [upload, { isLoading: uploading }] = useUploadProductImportMutation()
  const [file, setFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const running = current?.active === true

  const download = async () => {
    setDownloading(true)
    try {
      await downloadApiFile(PRODUCT_IMPORT_TEMPLATE_URL, 'products-template.xlsx')
    } catch (error) {
      failure(error, 'Could not download the template')
    } finally {
      setDownloading(false)
    }
  }

  /** Only .xlsx is read by the server; anything else is refused here with the reason. */
  const pick = (picked: File | undefined) => {
    setFileKey((key) => key + 1)
    if (picked && !/\.xlsx$/i.test(picked.name)) return failure(null, 'Only Excel files (.xlsx) can be uploaded. Download the template and fill it in.')
    if (picked && picked.size > 5 * 1024 * 1024) return failure(null, 'The file is larger than 5 MB. Split it into smaller files.')
    setFile(picked ?? null)
  }

  const start = async () => {
    if (!file) return
    try {
      await upload(file).unwrap()
      setFile(null)
      setFileKey((key) => key + 1)
    } catch (error) {
      failure(error, 'Could not start the import')
      // Another import may have started meanwhile: show it instead of the form
      void refetch()
    }
  }

  const outcome = current && !current.active ? importOutcome(current) : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import products from Excel" size="xl">
      <div className="space-y-5">
        {running && current ? (
          <ImportProgressPanel item={current} />
        ) : (
          <>
            <section className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-text-primary">1. Download the template</h3>
              <p className="mt-1 text-sm text-text-secondary">
                One row is one variation. Rows with the same <strong>Product name</strong> become one master product with those variations; a product with a single row and no <strong>Color</strong> is a master on its own. The master&apos;s category, HS code, weight and units are read from its first row. Up to 2000 rows per file.
              </p>
              <Button type="button" variant="outline" size="sm" className="mt-3" isLoading={downloading} onClick={download}>
                Download template (.xlsx)
              </Button>
            </section>

            <section className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-text-primary">2. Upload it back</h3>
              {/* Same look as the document dropzones; that component previews PDFs and images, which a spreadsheet is not */}
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  pick(event.dataTransfer.files[0])
                }}
                className="mt-3 flex flex-col gap-3 rounded-xl border-2 border-dashed border-secondary-300 bg-secondary-50/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <label htmlFor="product-import-file" className="flex min-w-0 cursor-pointer items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-100 text-text-secondary">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-text-primary">Drag the file here or browse</span>
                    <span className="block text-xs text-text-muted">Excel (.xlsx) · up to 5 MB</span>
                  </span>
                </label>
                <input key={fileKey} id="product-import-file" type="file" className="sr-only" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => pick(event.target.files?.[0])} />
                {file && (
                  <span className="flex max-w-full items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-sm">
                    <span className="rounded bg-success-600 px-1.5 py-0.5 text-[10px] font-bold text-text-inverse">XLSX</span>
                    <span className="max-w-[200px] truncate text-text-primary">{file.name}</span>
                    <button type="button" aria-label={`Remove ${file.name}`} onClick={() => pick(undefined)} className="text-text-subtle hover:text-text-primary">
                      ×
                    </button>
                  </span>
                )}
              </div>
              <div className="mt-3 flex justify-end">
                <Button type="button" disabled={!file} isLoading={uploading} onClick={start}>
                  Upload and import
                </Button>
              </div>
            </section>
          </>
        )}

        {current && !current.active && outcome && (
          <>
            <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${TONE[outcome.type]}`}>
              <strong>Last import ({current.fileName}):</strong> {outcome.message}
            </p>
            {current.status !== 'FAILED' && <ImportResultsTable key={current.id} item={current} />}
          </>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
