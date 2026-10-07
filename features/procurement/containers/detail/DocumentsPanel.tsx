'use client'

import React, { useMemo, useState } from 'react'
import { FileDropzone } from '@/components/file-dropzone/FileDropzone'
import { FilePreviewDialog } from '@/components/file-preview/FilePreviewDialog'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { formatBytes, formatDay } from '@/features/finance/shared/format'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useUploadContainerDocumentsMutation, type ContainerDetail, type ContainerDocument } from '@/services/api/procurement.api'
import { downloadApiFile, fetchApiBlob } from '@/utils/downloadFile'
import { Panel, PanelEmpty } from './Panel'

interface DocumentsPanelProps {
  container: ContainerDetail
  canWrite: boolean
}

/** The container's documents: open one to preview it, or upload more, several at a time. */
export const DocumentsPanel: React.FC<DocumentsPanelProps> = ({ container, canWrite }) => {
  const { success, failure } = useApiFeedback()
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [viewing, setViewing] = useState<ContainerDocument | null>(null)
  const [upload, { isLoading }] = useUploadContainerDocumentsMutation()
  const canUpload = canWrite && container.permissions.canUpload
  const fileUrl = (document: ContainerDocument) => `/procurement/containers/${container.id}/documents/${document.id}`

  const target = useMemo(
    () => (viewing ? { name: viewing.originalName, mimeType: viewing.mimeType, sizeBytes: viewing.sizeBytes, load: () => fetchApiBlob(fileUrl(viewing)) } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewing]
  )

  const close = () => {
    setUploading(false)
    setFiles([])
  }

  const save = async () => {
    try {
      await upload({ id: container.id, files }).unwrap()
      success(`${files.length} document${files.length === 1 ? '' : 's'} added`)
      close()
    } catch (error) {
      failure(error, 'Could not upload the documents')
    }
  }

  return (
    <Panel
      title="Documents"
      count={container.documents.length}
      action={
        canUpload ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setUploading(true)}>
            Upload
          </Button>
        ) : null
      }
    >
      {container.documents.length === 0 ? (
        <PanelEmpty>{canUpload ? 'No documents yet. Upload the bill of lading, invoices or photos.' : 'No documents.'}</PanelEmpty>
      ) : (
        // Many documents scroll inside the panel (mouse wheel; the vertical bar stays hidden like everywhere else)
        <ul className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto overscroll-contain pr-1">
          {container.documents.map((document) => (
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
          ))}
        </ul>
      )}
      {!container.permissions.canUpload && <p className="text-xs text-text-muted">This container takes no more documents.</p>}

      <Modal isOpen={uploading} onClose={close} title="Upload documents" size="md" closeOnEscape={!isLoading}>
        <div className="flex flex-col gap-4">
          <FileDropzone files={files} onChange={setFiles} multiple hint="PDF, JPG or PNG, up to 10 MB each" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} isLoading={isLoading} disabled={files.length === 0}>
              Upload {files.length > 0 ? files.length : ''}
            </Button>
          </div>
        </div>
      </Modal>
      <FilePreviewDialog
        target={target}
        onClose={() => setViewing(null)}
        footer={
          <Button type="button" onClick={() => setViewing(null)}>
            Close
          </Button>
        }
      />
    </Panel>
  )
}
