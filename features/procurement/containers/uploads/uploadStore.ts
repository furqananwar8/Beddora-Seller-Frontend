import { useSyncExternalStore } from 'react'
import { API_BASE_URL } from '@/services/api/baseApi'
import { streamFailure } from '@/utils/sseStream'
import { applyUploadEvent, inFlight, isSettled, reconcileUploads, type ServerUpload, type UploadEvent, type UploadItem } from './uploadQueue'

/** Files sent at once; the rest wait their turn. */
const CONCURRENCY = 3

const containersUrl = `${API_BASE_URL}/procurement/containers`

let items: UploadItem[] = []
const listeners = new Set<() => void>()
const controllers = new Map<string, AbortController>()
/** Cleared while in flight: if the server finishes anyway, it is told again to take the file back. */
const cleared = new Set<string>()
/** Containers whose upload dialog is open: their uploads are not toasted. */
const watched = new Set<number>()
let onSettled: (item: UploadItem) => void = () => undefined

/** Every change goes through here, so a file that settles is announced exactly once and the next queued one starts. */
function update(change: (current: UploadItem[]) => UploadItem[]) {
  const before = items
  items = change(items)
  listeners.forEach((listener) => listener())
  const was = new Map(before.map((item) => [item.id, item]))
  const settled = items.filter((item) => isSettled(item) && was.has(item.id) && !isSettled(was.get(item.id)!))
  settled.forEach(onSettled)
  if (settled.length) pump()
}

const patch = (id: string, change: Partial<UploadItem>) => update((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)))

const request = (path: string, init: RequestInit = {}) => fetch(`${containersUrl}${path}`, { credentials: 'include', ...init })

/** Asks the server to forget an upload and take back its file, wherever it has got to. */
const discard = (id: string) => void request(`/uploads/${id}`, { method: 'DELETE' }).catch(() => undefined)

/** Folds the server's current list of this user's uploads in (a reload, a reconnect, or the end of a request). Failing to reach it is harmless: events keep coming. */
async function sync(): Promise<void> {
  try {
    const response = await request('/uploads')
    if (!response.ok) return
    const json = (await response.json()) as { data?: ServerUpload[] }
    const uploads = (json.data ?? []).filter((upload) => !cleared.has(upload.uploadId))
    update((current) => reconcileUploads(current, uploads, (containerId) => watched.has(containerId)))
  } catch {
    // offline: the next event or focus brings us up to date
  }
}

/** One streamed event: the upload that moved plus the uploader's whole list. A cleared upload that still finishes is taken back down. */
export function applyEvent(event: UploadEvent): void {
  if (cleared.has(event.data.uploadId)) {
    if (event.type === 'done') discard(event.data.uploadId)
    return
  }
  update((current) => applyUploadEvent(current, { ...event, data: { ...event.data, uploads: event.data.uploads.filter((upload) => !cleared.has(upload.uploadId)) } }, (containerId) => watched.has(containerId)))
}

async function send(item: UploadItem) {
  if (!item.file) return
  const controller = new AbortController()
  controllers.set(item.id, controller)
  const body = new FormData()
  body.append('documents', item.file)
  const headers = { 'X-Upload-Id': item.id, 'X-Upload-Name': encodeURIComponent(item.name), 'X-Upload-Size': String(item.size) }
  try {
    const response = await request(`/${item.containerId}/documents`, { method: 'POST', body, headers, signal: controller.signal })
    if (!response.ok) {
      const { message } = await streamFailure(response, 'The upload failed')
      // The server also announces the failure (with a general message); the response carries the specific one
      update((current) => current.map((candidate) => (candidate.id === item.id && !cleared.has(item.id) && candidate.status !== 'done' ? { ...candidate, status: 'failed', error: message } : candidate)))
      return
    }
    // Saved on the server. From here it no longer needs this page: the server's own progress takes over
    const json = (await response.json().catch(() => null)) as { data?: Array<{ id: string }> } | null
    patch(item.id, { documentId: json?.data?.[0]?.id })
    await sync()
  } catch (error) {
    if ((error as Error).name !== 'AbortError') update((current) => current.map((candidate) => (candidate.id === item.id && candidate.status === 'sending' ? { ...candidate, status: 'failed', error: 'The upload could not be sent. Check your connection and retry.' } : candidate)))
  } finally {
    controllers.delete(item.id)
  }
}

/** Starts queued files until `CONCURRENCY` are being sent. */
function pump() {
  for (const item of items) {
    if (items.filter((candidate) => candidate.status === 'sending' && controllers.has(candidate.id)).length >= CONCURRENCY) return
    if (item.status !== 'queued' || !item.started) continue
    patch(item.id, { status: 'sending', percent: 0, phasePercent: 0, error: undefined })
    void send(item)
  }
}

export const uploadStore = {
  /** Registers who hears about each background file that ends (toasts). */
  onSettled(handler: (item: UploadItem) => void) {
    onSettled = (item) => item.background && handler(item)
    return () => {
      onSettled = () => undefined
    }
  },
  /** Catches the list up with the server: on load, and whenever the page comes back. */
  sync,
  /** The dialog opened: uploads of this container that carried on in the background show here, and are not toasted while it is open. */
  open(containerId: number) {
    watched.add(containerId)
    update((current) => current.map((item) => (item.containerId === containerId ? { ...item, background: false } : item)))
    void sync()
  },
  add(containerId: number, files: File[]) {
    update((current) => [...current, ...files.map((file) => ({ id: crypto.randomUUID(), containerId, file, name: file.name, size: file.size, status: 'queued' as const, percent: 0, phasePercent: 0, background: false }))])
  },
  /** Drops a file that is not being uploaded (waiting, failed or done). */
  dismiss(id: string) {
    update((current) => current.filter((item) => item.id !== id || item.status === 'sending' || item.status === 'saving'))
  },
  start(containerId: number) {
    update((current) => current.map((item) => (item.containerId === containerId && item.status === 'queued' ? { ...item, started: true } : item)))
    pump()
  },
  retry(id: string) {
    update((current) => current.map((item) => (item.id === id && item.status === 'failed' && item.file ? { ...item, status: 'queued' as const, started: true, error: undefined, percent: 0, phasePercent: 0, documentId: undefined } : item)))
    pump()
  },
  /** The dialog closed with files still going: they carry on (the server does not need this page for the saving part) and each one is toasted when it ends. Everything else is dropped. */
  keepInBackground(containerId: number) {
    watched.delete(containerId)
    update((current) => current.filter((item) => item.containerId !== containerId || inFlight([item]).length).map((item) => (item.containerId === containerId ? { ...item, background: true } : item)))
  },
  /** Stops what is being sent and takes back everything the server already has, from storage and the container, right away. */
  clearAll(containerId: number) {
    watched.delete(containerId)
    for (const item of items.filter((candidate) => candidate.containerId === containerId && candidate.status !== 'queued')) {
      cleared.add(item.id)
      controllers.get(item.id)?.abort()
      discard(item.id)
      // Its record on the server may have expired; the document itself is still taken back
      if (item.status === 'done' && item.documentId) void request(`/${containerId}/documents/${item.documentId}`, { method: 'DELETE' }).catch(() => undefined)
    }
    update((current) => current.filter((item) => item.containerId !== containerId))
  },
  /** Closing with nothing in flight: forget the list. */
  reset(containerId: number) {
    watched.delete(containerId)
    update((current) => current.filter((item) => item.containerId !== containerId || inFlight([item]).length))
  },
  /** Files whose bytes are still travelling to the server from this page: the only work a reload would lose. */
  hasFilesBeingSent: () => items.some((item) => item.status === 'sending' && controllers.has(item.id)),
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

/** Everything queued, uploading or finished for one container (stays put while the dialog is closed). */
export function useContainerUploads(containerId: number): UploadItem[] {
  const all = useSyncExternalStore(subscribe, () => items, () => items)
  return all.filter((item) => item.containerId === containerId)
}
