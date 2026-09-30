'use client'

import React, { useMemo } from 'react'
import { Button } from '@/design-system/buttons'
import { FilePreviewDialog } from '@/components/file-preview/FilePreviewDialog'
import type { FinanceDocument } from '@/services/api/finance.api'
import { downloadFinanceDocument, fetchFinanceDocumentBlob } from './downloadDocument'
import { useFinanceFeedback } from './useFinanceFeedback'

/** Previews a document already stored on the server (fetched with the auth token) with Download and Close. */
export const StoredDocumentPreview: React.FC<{ doc: FinanceDocument | null; onClose: () => void }> = ({ doc, onClose }) => {
  const { failure } = useFinanceFeedback()

  const target = useMemo(
    () =>
      doc
        ? {
            name: doc.originalName,
            mimeType: doc.mimeType,
            sizeBytes: doc.sizeBytes,
            load: () => fetchFinanceDocumentBlob(doc.id, doc.mimeType),
          }
        : null,
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
            onClick={() => doc && downloadFinanceDocument(doc.id, doc.originalName).catch((error) => failure(error, 'Could not download the file'))}
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
