'use client'

import React, { useId, useRef, useState } from 'react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { Tabs } from '@/design-system/tabs/Tabs'
import { FilePreviewDialog, PreviewTarget } from '@/components/file-preview/FilePreviewDialog'
import { cn } from '@/utils/cn'

const DEFAULT_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const EXTENSION: Record<string, string> = { 'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG' }
const TAB_NAME_LENGTH = 22

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

const shortName = (name: string) => (name.length > TAB_NAME_LENGTH ? `${name.slice(0, TAB_NAME_LENGTH - 1)}…` : name)

/**
 * Drag and drop or browse. Validates type and size before anything reaches the form state.
 * Chosen files are reviewed together first: one tab per file, then "Use these files" attaches them all.
 */
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
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [rejected, setRejected] = useState<string | null>(null)
  /** Files chosen but not attached yet, reviewed together in one dialog. */
  const [queue, setQueue] = useState<File[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  /** The queued file a different file will replace once it has been picked. */
  const [replaceIndex, setReplaceIndex] = useState(0)
  const [askingWhich, setAskingWhich] = useState(false)
  const [viewing, setViewing] = useState<number | null>(null)
  const acceptLabel = accept.map((type) => EXTENSION[type] ?? type).join(', ')

  /** Splits incoming files into usable ones and the first complaint about the rest. */
  const validate = (incoming: FileList | File[]) => {
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
    return valid
  }

  const take = (incoming: FileList | File[]) => {
    const valid = validate(incoming)
    // Nothing is attached until the user confirms the files in the review dialog.
    if (valid.length) {
      setQueue(multiple ? valid : valid.slice(0, 1))
      setActiveIndex(0)
    }
  }

  const reviewing = queue.length > 0
  const several = queue.length > 1
  const current = queue[activeIndex] ?? null

  const confirmQueue = () => {
    onChange(multiple ? [...files, ...queue] : [queue[0]])
    setQueue([])
  }

  /** With one file there is nothing to ask; with several, ask which one the user means. */
  const chooseDifferent = () => {
    if (several) {
      setAskingWhich(true)
      return
    }
    startReplace(0)
  }

  // Opening the file chooser must happen inside the click that asked for it
  const startReplace = (index: number) => {
    setAskingWhich(false)
    setReplaceIndex(index)
    setActiveIndex(index)
    replaceInputRef.current?.click()
  }

  const replaceWith = (incoming: FileList | null) => {
    if (!incoming) return
    const [replacement] = validate(incoming)
    if (replacement) setQueue((pending) => pending.map((file, position) => (position === replaceIndex ? replacement : file)))
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
        {/* Picks the one file that replaces a reviewed file */}
        <input
          ref={replaceInputRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          accept={accept.join(',')}
          onChange={(event) => {
            replaceWith(event.target.files)
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

      {/* Review: one tab per chosen file */}
      <FilePreviewDialog
        target={previewTarget(current)}
        onClose={() => setQueue([])}
        header={
          several ? (
            <div className="overflow-x-auto">
              <Tabs
                size="md"
                activeTab={String(activeIndex)}
                onChange={(id) => setActiveIndex(Number(id))}
                items={queue.map((file, index) => ({ id: String(index), label: `${index + 1}. ${shortName(file.name)}` }))}
                className="min-w-max"
              />
            </div>
          ) : undefined
        }
        caption={several ? `${queue.length} files chosen. Check each tab, then use them together.` : undefined}
        footer={
          <>
            <Button type="button" variant="outline" onClick={chooseDifferent}>
              Choose a different file
            </Button>
            <Button type="button" variant="primary" onClick={confirmQueue}>
              {several ? 'Use these files' : 'Use this file'}
            </Button>
          </>
        }
      />

      {/* With several files, ask which tab "Choose a different file" is about */}
      <Modal isOpen={reviewing && askingWhich} onClose={() => setAskingWhich(false)} title="Which file do you want to replace?" size="sm">
        <ul className="space-y-2">
          {queue.map((file, index) => (
            <li key={`${file.name}-${index}`}>
              <button
                type="button"
                onClick={() => startReplace(index)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm hover:bg-secondary-50',
                  index === activeIndex ? 'border-secondary-800 bg-secondary-50' : 'border-border'
                )}
              >
                <span className="rounded bg-danger-600 px-1.5 py-0.5 text-[10px] font-bold text-text-inverse">{kindOf(file)}</span>
                <span className="min-w-0 flex-1 truncate">
                  {index + 1}. {file.name}
                </span>
                {index === activeIndex && <span className="text-xs text-text-muted">open now</span>}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="outline" onClick={() => setAskingWhich(false)}>
            Cancel
          </Button>
        </div>
      </Modal>

      {/* Preview of a file that is already attached */}
      <FilePreviewDialog
        target={reviewing ? null : previewTarget(viewed)}
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
