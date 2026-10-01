'use client'

import React, { useEffect, useState } from 'react'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'

export interface PreviewTarget {
  name: string
  mimeType: string
  sizeBytes?: number
  /** A local file, previewed straight from memory. */
  file?: File
  /** Loads the bytes (for files already stored on the server). */
  load?: () => Promise<Blob>
}

interface FilePreviewDialogProps {
  target: PreviewTarget | null
  onClose: () => void
  /** Buttons rendered in the dialog footer. */
  footer?: React.ReactNode
  /** Shown above the preview, e.g. "File 2 of 3". */
  caption?: string
  /** Rendered above the caption, e.g. tabs to switch between several files. */
  header?: React.ReactNode
}

const formatSize = (bytes?: number) => {
  if (bytes === undefined) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Loads the target into an object URL and revokes it when the target changes or the dialog closes. */
function useTargetUrl(target: PreviewTarget | null) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setUrl(null)
    setFailed(false)
    if (!target) return
    let created: string | null = null
    let cancelled = false

    if (target.file) {
      created = URL.createObjectURL(target.file)
      setUrl(created)
    } else if (target.load) {
      setLoading(true)
      target
        .load()
        .then((blob) => {
          if (cancelled) return
          created = URL.createObjectURL(blob)
          setUrl(created)
        })
        .catch(() => !cancelled && setFailed(true))
        .finally(() => !cancelled && setLoading(false))
    }

    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.file, target?.name, target?.mimeType])

  return { url, loading, failed }
}

/** Preview of an image or PDF (other types show their details) with caller supplied actions. */
export const FilePreviewDialog: React.FC<FilePreviewDialogProps> = ({ target, onClose, footer, caption, header }) => {
  const { url, loading, failed } = useTargetUrl(target)
  const isImage = target?.mimeType.startsWith('image/')
  const isPdf = target?.mimeType === 'application/pdf'

  return (
    <Modal isOpen={!!target} onClose={onClose} title={target?.name} size="xl">
      {target && (
        <div className="space-y-4">
          {header}
          {caption && <p className="text-xs text-text-muted">{caption}</p>}
          <div className="flex h-[55vh] min-h-[240px] items-center justify-center overflow-auto rounded-lg border border-border bg-secondary-50">
            {loading && <Spinner size="lg" />}
            {failed && <p className="px-4 text-center text-sm text-danger-600">Could not load the file.</p>}
            {url && isImage && <img src={url} alt={target.name} className="max-h-full max-w-full object-contain" />}
            {url && isPdf && <iframe src={url} title={target.name} className="h-full w-full" />}
            {url && !isImage && !isPdf && (
              <div className="px-4 text-center">
                <p className="break-all text-sm font-semibold text-text-primary">{target.name}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {[target.mimeType, formatSize(target.sizeBytes)].filter(Boolean).join(' · ')}
                </p>
                <p className="mt-2 text-xs text-text-muted">No preview available for this file type.</p>
              </div>
            )}
          </div>
          {footer && <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
        </div>
      )}
    </Modal>
  )
}
