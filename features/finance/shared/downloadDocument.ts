import { store } from '@/store/store'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

/** Fetches a stored finance file with the user's token and hands it to the browser as a download. */
export async function downloadFinanceDocument(id: string, fileName: string): Promise<void> {
  const token = store.getState().auth?.accessToken
  const response = await fetch(`${API_BASE_URL}/finance/documents/${id}/download`, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Could not download the file')

  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
