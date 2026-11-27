'use client'

import React, { useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { FileDropzone } from '@/components/file-dropzone/FileDropzone'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { formatBytes } from '@/features/finance/shared/format'
import { cn } from '@/utils/cn'
import { inFlight, overallPercent, type UploadItem } from './uploadQueue'
import { uploadStore, useContainerUploads } from './uploadStore'

const kindOf = (name: string) => name.split('.').pop()?.toUpperCase().slice(0, 4) ?? 'FILE'

/** Says which leg of the journey the file is on, so the bar's percentage is never mistaken for just the network transfer. */
const phaseLabel = (item: UploadItem): string | null => {
  if (item.status === 'sending') return `Uploading to server ${item.phasePercent}%`
  if (item.status === 'saving') return item.waiting ? 'Received. Waiting to save to storage' : `Saving to storage ${item.phasePercent}%`
  return null
}

const UploadRow: React.FC<{ item: UploadItem }> = ({ item }) => {
  const { name, size, status, percent } = item
  const phase = phaseLabel(item)
  const active = status === 'sending' || status === 'saving'
  return (
    <li className="flex flex-col gap-1.5 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="shrink-0 rounded bg-danger-600 px-1.5 py-0.5 text-[10px] font-bold text-text-inverse">{kindOf(name)}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-text-primary" title={name}>
          {name}
        </span>
        <span className="shrink-0 text-xs text-text-muted">{formatBytes(size)}</span>
        {active && <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-text-primary">{percent}%</span>}
        {status === 'done' && <span className="shrink-0 text-xs font-medium text-success-600">Uploaded</span>}
        {status === 'failed' && item.file && (
          <button type="button" onClick={() => uploadStore.retry(item.id)} className="shrink-0 text-xs font-medium text-secondary-700 hover:underline">
            Retry
          </button>
        )}
        {!active && (
          <button type="button" aria-label={`Remove ${name}`} onClick={() => uploadStore.dismiss(item.id)} className="shrink-0 px-1 text-text-subtle hover:text-text-primary">
            ×
          </button>
        )}
      </div>
      {(active || status === 'done') && (
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 overflow-hidden rounded-full bg-secondary-100">
          <div className={cn('h-full rounded-full transition-[width] duration-300 ease-out', status === 'done' ? 'bg-success-600' : 'animate-pulse bg-secondary-600')} style={{ width: `${percent}%` }} />
        </div>
      )}
      {phase && <p className="text-xs text-text-muted">{phase}</p>}
      {status === 'saving' && item.error && <p className="text-xs text-warning-600">{item.error}</p>}
      {status === 'failed' && <p className="text-xs text-danger-600">{item.error}</p>}
    </li>
  )
}

interface UploadDocumentsModalProps {
  containerId: number
  isOpen: boolean
  onClose: () => void
}

/** Choose files, watch each one upload with its own percentage, and decide what happens to uploads still running when the dialog is closed. */
export const UploadDocumentsModal: React.FC<UploadDocumentsModalProps> = ({ containerId, isOpen, onClose }) => {
  const items = useContainerUploads(containerId)
  // Uploads that carried on in the background (or from before a reload) show up here, live
  useEffect(() => {
    if (isOpen) uploadStore.open(containerId)
  }, [isOpen, containerId])
  const [asking, setAsking] = useState(false)
  const sending = inFlight(items).length
  const queued = items.filter((item) => item.status === 'queued' && !item.started).length

  const finish = (settle: () => void) => {
    settle()
    setAsking(false)
    onClose()
  }

  const requestClose = () => {
    if (sending > 0) setAsking(true)
    else finish(() => uploadStore.reset(containerId))
  }

  return (
    <>
      <Modal isOpen={isOpen && !asking} onClose={requestClose} title="Upload documents" size="md">
        <div className="flex flex-col gap-4">
          {/* The list below shows the files, so the dropzone only takes them in */}
          <FileDropzone files={[]} onChange={(chosen) => uploadStore.add(containerId, chosen)} multiple />
          {items.length > 0 && (
            <div className="flex flex-col gap-1">
              {sending > 0 && (
                <p className="text-xs text-text-muted">
                  {sending} file{sending === 1 ? '' : 's'} in progress · {overallPercent(items)}% overall
                </p>
              )}
              <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {items.map((item) => (
                  <UploadRow key={item.id} item={item} />
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={requestClose}>
              {sending > 0 ? 'Close' : 'Done'}
            </Button>
            <Button type="button" onClick={() => uploadStore.start(containerId)} disabled={queued === 0}>
              Upload {queued > 0 ? queued : ''}
            </Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={isOpen && asking}
        title="Uploads are still running"
        confirmLabel="Keep uploading in background"
        secondaryLabel="Clear all"
        onSecondary={() => finish(() => uploadStore.clearAll(containerId))}
        onConfirm={() => finish(() => uploadStore.keepInBackground(containerId))}
        onClose={() => setAsking(false)}
      >
        {sending} file{sending === 1 ? ' is' : 's are'} still uploading or being saved. Keep them going and you will get a message as each one finishes: once a file has reached the server it is saved even if you close or reload this page. Or clear all to stop them and remove everything already uploaded in this dialog.
      </ConfirmDialog>
    </>
  )
}
