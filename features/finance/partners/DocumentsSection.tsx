'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import { FileDropzone } from '@/components/file-dropzone/FileDropzone'
import type { FinanceDocument } from '@/services/api/finance.api'
import { DocumentChips } from '../shared/DocumentChips'

interface DocumentsSectionProps {
  /** Create mode only: files are uploaded together with the new partner. */
  files?: File[]
  onFilesChange?: (files: File[]) => void
  /** Edit mode: already uploaded documents, read-only. */
  existing?: FinanceDocument[]
}

export const DocumentsSection: React.FC<DocumentsSectionProps> = ({ files = [], onFilesChange, existing }) => (
  <Card>
    <CardHeader>
      <CardTitle>Documents</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-3">
      {existing ? (
        existing.length > 0 ? (
          <DocumentChips documents={existing} emptyText={null} />
        ) : (
          <p className="text-sm text-text-muted">No documents uploaded.</p>
        )
      ) : (
        <FileDropzone multiple files={files} onChange={(next) => onFilesChange?.(next)} title="Upload documents" hint="Optional · tax forms, contracts" />
      )}
    </CardContent>
  </Card>
)
