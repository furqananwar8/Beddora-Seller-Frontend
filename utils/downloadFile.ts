const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

/**
 * A failed file request, shaped like an RTK Query error (`{ status, data: { error } }`), so
 * `apiErrorMessage` / `useApiFeedback().failure` show the server's own message.
 */
export interface ApiFileError {
  status: number
  data: { error?: string; message?: string; code?: string } | null
}

export const isApiFileError = (error: unknown): error is ApiFileError => typeof (error as ApiFileError | undefined)?.status === 'number'

/** Fetches an API file with the session cookie (for previews and downloads). `mimeType` re-types the blob for inline previews. */
export async function fetchApiBlob(path: string, mimeType?: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include' })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw { status: response.status, data } satisfies ApiFileError
  }
  const blob = await response.blob()
  return mimeType ? new Blob([blob], { type: mimeType }) : blob
}

/** Hands a blob to the browser as a download. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

/** Fetches an API file with the session cookie and hands it to the browser as a download (PDFs, exports). */
export const downloadApiFile = async (path: string, fileName: string): Promise<void> => downloadBlob(await fetchApiBlob(path), fileName)
