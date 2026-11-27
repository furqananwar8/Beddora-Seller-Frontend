'use client'

import React, { useMemo, useState } from 'react'
import { FilePreviewDialog } from '@/components/file-preview/FilePreviewDialog'
import { Button } from '@/design-system/buttons'
import { formatBytes, formatDay } from '@/features/finance/shared/format'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import type { ContainerDetail, ContainerDocument } from '@/services/api/procurement.api'
import { downloadApiFile, fetchApiBlob } from '@/utils/downloadFile'
import { UploadDocumentsModal } from '../uploads/UploadDocumentsModal'
import { ExpandablePanel, PanelEmpty } from './Panel'

/** How many documents the summary lists before the rest go behind "More". */
const SUMMARY_ROWS = 4

interface DocumentsPanelProps {
  container: ContainerDetail
  canWrite: boolean
}

/** The container's documents: the latest few by default, all of them behind "More"; open one to preview it, or upload more, several at a time. */
export const DocumentsPanel: React.FC<DocumentsPanelProps> = ({ container, canWrite }) => {
  const { failure } = useApiFeedback()
  const [uploading, setUploading] = useState(false)
  const [viewing, setViewing] = useState<ContainerDocument | null>(null)
  const canUpload = canWrite && container.permissions.canUpload
  const fileUrl = (document: ContainerDocument) => `/procurement/containers/${container.id}/documents/${document.id}`

  const target = useMemo(
    () => (viewing ? { name: viewing.originalName, mimeType: viewing.mimeType, sizeBytes: viewing.sizeBytes, load: () => fetchApiBlob(fileUrl(viewing)) } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewing]
  )

  /** One document: open it to preview, or download it. */
  const row = (document: ContainerDocument) => (
    <li key={document.id} className="flex items-center justify-between gap-2 py-2">
      <button type="button" onClick={() => setViewing(document)} className="min-w-0 text-left">
        <span className="block truncate text-sm font-medium text-text-primary underline-offset-2 hover:underline">{document.originalName}</span>
        <span className="block text-xs text-text-muted">
          {formatBytes(document.sizeBytes)} · {formatDay(document.createdAt)}
          {document.uploadedBy.name ? ` · ${document.uploadedBy.name}` : ''}
        </span>
      </button>
      <button
        type="button"
        aria-label={`Download ${document.originalName}`}
        onClick={() => void downloadApiFile(fileUrl(document), document.originalName).catch((error) => failure(error, 'Could not download the file'))}
        className="shrink-0 rounded p-1.5 text-text-muted hover:bg-secondary-100 hover:text-text-primary"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
        </svg>
      </button>
    </li>
  )

  const documents = container.documents
  const shown = documents.slice(0, SUMMARY_ROWS)

  return (
    <>
      <ExpandablePanel
        title="Documents"
        count={documents.length}
        modalTitle="Documents"
        hasMore={documents.length > 0}
        action={
          canUpload ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setUploading(true)}>
              Upload
            </Button>
          ) : null
        }
        summary={
          documents.length === 0 ? (
            <PanelEmpty>{canUpload ? 'No documents yet. Upload the bill of lading, invoices or photos.' : 'No documents.'}</PanelEmpty>
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-border">{shown.map(row)}</ul>
              {documents.length > shown.length && <p className="text-xs text-text-muted">+ {documents.length - shown.length} more</p>}
              {!container.permissions.canUpload && <p className="text-xs text-text-muted">This container takes no more documents.</p>}
            </>
          )
        }
      >
        <ul className="flex flex-col divide-y divide-border">{documents.map(row)}</ul>
      </ExpandablePanel>

      <UploadDocumentsModal containerId={container.id} isOpen={uploading} onClose={() => setUploading(false)} />
      <FilePreviewDialog
        target={target}
        onClose={() => setViewing(null)}
        footer={
          <Button type="button" onClick={() => setViewing(null)}>
            Close
          </Button>
        }
      />
    </>
  )
}
