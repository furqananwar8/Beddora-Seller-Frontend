/** What the batch endpoints stream back, by event name. Keep in step with the backend's batch.types.ts. */
export type BatchStep = 'validate' | 'create' | 'submit'

export interface BatchError {
  row: number
  message: string
}

export interface BatchResult {
  batchId: number | null
  total: number
  created: Array<{ row: number; id: number }>
  failed: BatchError[]
}

export interface BatchStreamEvents {
  started: { total: number; submit: boolean }
  step: { step: BatchStep; label: string; done: number; total: number; percent: number }
  'row-error': BatchError & { step: BatchStep }
  done: BatchResult
  failure: { message: string }
}

/** The most requests one batch may hold; same cap as the server. */
export const MAX_BATCH_ENTRIES = 50

export const BATCH_URL = '/finance/payment-requests/batch'
export const BATCH_EXCEL_URL = `${BATCH_URL}/excel`
export const BATCH_TEMPLATE_URL = `${BATCH_URL}/template`
