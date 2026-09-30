'use client'

import React, { useId, useRef, useState } from 'react'
import { Button } from '@/design-system/buttons'
import { FilePreviewDialog, PreviewTarget } from '@/components/file-preview/FilePreviewDialog'
import { cn } from '@/utils/cn'

const DEFAULT_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const EXTENSION: Record<string, string> = { 'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG' }

interface FileDropzoneProps {
  files: File[]
  onChange: (files: File[]) => void
  title?: string
  hint?: string
  multiple?: boolean
  maxSizeMB?: number
  accept?: string[]
  error?: string
  disabled?: boolean
  className?: string
}

const kindOf = (file: File) => EXTENSION[file.type] ?? file.name.split('.').pop()?.toUpperCase().slice(0, 4) ?? 'FILE'

/** Drag and drop or browse. Validates type and size before anything reaches the form state. */
export const FileDropzone: React.FC<FileDropzoneProps> = ({
  files,
  onChange,
  title = 'Drag files here or browse',
  hint,
  multiple = false,
  maxSizeMB = 10,
  accept = DEFAULT_TYPES,
  error,
  disabled,
  className,
}) => {
  const inputId = useId()
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [rejected, setRejected] = useState<string | null>(null)
  const [queue, setQueue] = useState<File[]>([])
  const [viewing, setViewing] = useState<number | null>(null)
  const acceptLabel = accept.map((type) => EXTENSION[type] ?? type).join(', ')

  const take = (incoming: FileList | File[]) => {
    const problems: string[] = []
    const valid = [...incoming].filter((file) => {
      if (!accept.includes(file.type)) {
        problems.push(`${file.name}: only ${acceptLabel} files are allowed`)
        return false
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        problems.push(`${file.name}: larger than ${maxSizeMB} MB`)
        return false
      }
      return true
    })
    setRejected(problems[0] ?? null)
    // Nothing is attached until the user confirms each file in the preview.
    if (valid.length) setQueue(multiple ? valid : valid.slice(0, 1))
  }

  const current = queue[0] ?? null
  const confirmCurrent = () => {
    if (!current) return
    onChange(multiple ? [...files, current] : [current])
    setQueue((pending) => pending.slice(1))
  }
  const chooseAnother = () => {
    setQueue([])
    inputRef.current?.click()
  }
  const viewed = viewing === null ? null : (files[viewing] ?? null)

  const previewTarget = (file: File | null): PreviewTarget | null =>
    file ? { name: file.name, mimeType: file.type, sizeBytes: file.size, file } : null

  const shownError = error ?? rejected

  return (
    <div className={className}>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (!disabled) take(event.dataTransfer.files)
        }}
        className={cn(
          'flex flex-col gap-3 rounded-xl border-2 border-dashed p-4 sm:flex-row sm:items-center sm:justify-between',
          dragging ? 'border-secondary-500 bg-secondary-50' : 'border-secondary-300 bg-secondary-50/40',
          shownError && 'border-danger-400',
          disabled && 'opacity-60'
        )}
      >
        <label htmlFor={inputId} className={cn('flex min-w-0 items-center gap-3', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-100 text-text-secondary">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-text-primary">{title}</span>
            <span className="block text-xs text-text-muted">{hint ?? `${acceptLabel} · up to ${maxSizeMB} MB each${multiple ? ' · multiple files allowed' : ''}`}</span>
          </span>
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="sr-only"
          multiple={multiple}
          accept={accept.join(',')}
          disabled={disabled}
          onChange={(event) => {
            if (event.target.files) take(event.target.files)
            event.target.value = ''
          }}
        />
        {files.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex max-w-full items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-sm">
                <span className="rounded bg-danger-600 px-1.5 py-0.5 text-[10px] font-bold text-text-inverse">{kindOf(file)}</span>
                <button
                  type="button"
                  title={`Preview ${file.name}`}
                  onClick={() => setViewing(index)}
                  className="max-w-[160px] truncate text-text-primary hover:underline"
                >
                  {file.name}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  disabled={disabled}
                  onClick={() => onChange(files.filter((_, position) => position !== index))}
                  className="text-text-subtle hover:text-text-primary"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {shownError && <p className="mt-1 text-xs text-danger-600">{shownError}</p>}

      <FilePreviewDialog
        target={previewTarget(current)}
        onClose={() => setQueue([])}
        caption={queue.length > 1 ? `${queue.length} files left to review` : undefined}
        footer={
          <>
            <Button type="button" variant="outline" onClick={chooseAnother}>
              Choose a different file
            </Button>
            <Button type="button" variant="primary" onClick={confirmCurrent}>
              Use this file
            </Button>
          </>
        }
      />
      <FilePreviewDialog
        target={current ? null : previewTarget(viewed)}
        onClose={() => setViewing(null)}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => {
                if (viewing !== null) onChange(files.filter((_, position) => position !== viewing))
                setViewing(null)
              }}
            >
              Remove
            </Button>
            <Button type="button" variant="primary" onClick={() => setViewing(null)}>
              Close
            </Button>
          </>
        }
      />
    </div>
  )
}
