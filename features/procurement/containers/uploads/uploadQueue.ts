/**
 * sending  the browser is sending the file to our server (this part dies with the tab)
 * saving   the server has the file and is storing it; it carries on without the browser
 */
export type UploadStatus = 'queued' | 'sending' | 'saving' | 'done' | 'failed'

export interface UploadItem {
  id: string
  containerId: number
  name: string
  size: number
  /** Only in the tab that picked the file; an upload found after a reload has none (so no Retry). */
  file?: File
  status: UploadStatus
  /** One bar for the whole journey, 0-100: sending fills the first half, saving the second. */
  percent: number
  /** Progress of the current phase alone, 0-100, for its label. */
  phasePercent: number
  /** Saved on the server and waiting for its turn to be stored. */
  waiting?: boolean
  error?: string
  /** Set once saved on the server, so "Clear all" can take it back. */
  documentId?: string
  /** Nobody is looking at its dialog: its outcome is toasted. */
  background: boolean
  /** The user pressed Upload (or Retry): it may be sent as soon as there is room. */
  started?: boolean
}

/** One upload as the server keeps it (GET /procurement/containers/uploads). */
export interface ServerUpload {
  uploadId: string
  containerId: number
  filename: string
  sizeBytes: number
  status: 'RECEIVING' | 'QUEUED' | 'STORING' | 'DONE' | 'FAILED'
  percent: number
  receivedPercent: number
  storedPercent: number
  error?: string
  documentId?: string
}

/** What the server streams on `procurement.container-upload`: the upload that moved, and the uploader's whole current list. */
export interface UploadEvent {
  type: 'progress' | 'done' | 'failed'
  data: ServerUpload & { uploads: ServerUpload[] }
}

export const isSettled = (item: UploadItem) => item.status === 'done' || item.status === 'failed'

/** Still going, in either phase. */
export const inFlight = (items: UploadItem[]) => items.filter((item) => item.status === 'sending' || item.status === 'saving')

const isActive = (upload: ServerUpload) => upload.status === 'RECEIVING' || upload.status === 'QUEUED' || upload.status === 'STORING'

/** One server upload folded into one item. Settled items never move again; progress never goes backwards. */
function foldUpload(item: UploadItem, upload: ServerUpload): UploadItem {
  if (isSettled(item) || item.status === 'queued') return item
  switch (upload.status) {
    case 'RECEIVING':
      return item.status === 'sending' ? { ...item, percent: Math.max(item.percent, upload.percent), phasePercent: Math.max(item.phasePercent, upload.receivedPercent) } : item
    case 'QUEUED':
    case 'STORING': {
      const waiting = upload.status === 'QUEUED'
      const percent = item.status === 'saving' ? Math.max(item.percent, upload.percent) : upload.percent
      return { ...item, status: 'saving', waiting, percent, phasePercent: waiting ? 0 : upload.storedPercent, documentId: upload.documentId ?? item.documentId, error: upload.error }
    }
    case 'DONE':
      return { ...item, status: 'done', waiting: false, percent: 100, phasePercent: 100, documentId: upload.documentId ?? item.documentId, error: undefined }
    case 'FAILED':
      return { ...item, status: 'failed', error: upload.error ?? 'The upload failed. Try again.', documentId: upload.documentId ?? item.documentId }
  }
}

const itemOf = (upload: ServerUpload, background: boolean): UploadItem =>
  foldUpload({ id: upload.uploadId, containerId: upload.containerId, name: upload.filename, size: upload.sizeBytes, status: upload.status === 'RECEIVING' ? 'sending' : 'saving', percent: 0, phasePercent: 0, background }, upload)

/**
 * Brings the list in line with the server's list of this user's uploads (from a GET, or carried by every event), so a screen that
 * missed events or just reloaded is up to date:
 * - an upload we know moves forward to what the server says (a finish we missed settles it);
 * - an upload still going that we have never seen (started before a reload, or in another tab) is added, and counts as background unless its dialog is open (`isWatched`);
 * - one we think is being saved but the server no longer lists is gone (cleared elsewhere), and so is a detached one still "sending" (its request died with the old page).
 * Finished uploads we have never seen are not added: their toast was due on the screen that watched them.
 */
export function reconcileUploads(items: UploadItem[], uploads: ServerUpload[], isWatched: (containerId: number) => boolean = () => false): UploadItem[] {
  const byId = new Map(uploads.map((upload) => [upload.uploadId, upload]))
  const known = new Set(items.map((item) => item.id))
  const folded = items.flatMap((item) => {
    const upload = byId.get(item.id)
    if (upload) return [foldUpload(item, upload)]
    return item.status === 'saving' || (item.status === 'sending' && !item.file) ? [] : [item]
  })
  const added = uploads.filter((upload) => isActive(upload) && !known.has(upload.uploadId)).map((upload) => itemOf(upload, !isWatched(upload.containerId)))
  return [...folded, ...added]
}

/** One streamed event folded in: the upload it is about, together with the uploader's whole list it carries. */
export function applyUploadEvent(items: UploadItem[], event: UploadEvent, isWatched?: (containerId: number) => boolean): UploadItem[] {
  const { uploads, ...upload } = event.data
  return reconcileUploads(items, uploads.some((candidate) => candidate.uploadId === upload.uploadId) ? uploads : [...uploads, upload], isWatched)
}

/** Average progress of the files being sent (finished ones count as 100), for a one-line summary. */
export function overallPercent(items: UploadItem[]): number {
  const active = items.filter((item) => item.status !== 'queued')
  return active.length ? Math.round(active.reduce((sum, item) => sum + (item.status === 'failed' ? 0 : item.percent), 0) / active.length) : 0
}
