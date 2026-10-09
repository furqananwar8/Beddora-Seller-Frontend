'use client'

import React, { useMemo } from 'react'
import { Button } from '@/design-system/buttons'
import { FilePreviewDialog } from '@/components/file-preview/FilePreviewDialog'
import type { FinanceDocument } from '@/services/api/finance.api'
import { downloadFinanceDocument, fetchFinanceDocumentBlob, financeDocumentPath } from './downloadDocument'
import { useFinanceFeedback } from './useFinanceFeedback'

interface StoredDocumentPreviewProps {
  doc: FinanceDocument | null
  onClose: () => void
  /** Route serving the file; defaults to the finance documents route. */
  documentPath?: (doc: FinanceDocument) => string
}

/** Previews a document already stored on the server (fetched with the auth token) with Download and Close. */
export const StoredDocumentPreview: React.FC<StoredDocumentPreviewProps> = ({ doc, onClose, documentPath = (d) => financeDocumentPath(d.id) }) => {
  const { failure } = useFinanceFeedback()

  const target = useMemo(
    () =>
      doc
        ? {
            name: doc.originalName,
            mimeType: doc.mimeType,
            sizeBytes: doc.sizeBytes,
            load: () => fetchFinanceDocumentBlob(doc.id, doc.mimeType, documentPath(doc)),
          }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc]
  )

  return (
    <FilePreviewDialog
      target={target}
      onClose={onClose}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => doc && downloadFinanceDocument(doc.id, doc.originalName, documentPath(doc)).catch((error) => failure(error, 'Could not download the file'))}
          >
            Download
          </Button>
          <Button type="button" variant="primary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    />
  )
}
