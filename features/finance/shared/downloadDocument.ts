import { downloadApiFile, fetchApiBlob } from '@/utils/downloadFile'

/** Where a stored finance file is served. Screens outside Finance pass their own route (see DocumentChips). */
export const financeDocumentPath = (id: string): string => `/finance/documents/${id}/download`

/** Fetches a stored finance file with the user's token. The blob carries the stored mime type so it can be previewed inline. */
export function fetchFinanceDocumentBlob(id: string, mimeType?: string, path = financeDocumentPath(id)): Promise<Blob> {
  return fetchApiBlob(path, mimeType)
}

/** Fetches a stored finance file with the user's token and hands it to the browser as a download. */
export function downloadFinanceDocument(id: string, fileName: string, path = financeDocumentPath(id)): Promise<void> {
  return downloadApiFile(path, fileName)
}
