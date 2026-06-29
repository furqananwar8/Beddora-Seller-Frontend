export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables?: Record<string, string | number | boolean | null> | null
  marketplaceId?: string | null
  productId?: string | null
  sku?: string | null
  purchaseType?: string | null
  createdAt: string
  updatedAt: string
}

export interface EmailQueueItem {
  id: string
  templateId: string
  templateName: string
  recipientEmail: string
  scheduledAt: string
  sentAt?: string | null
  status: 'pending' | 'sent' | 'failed'
  openedCount: number
  clickedCount: number
  responseCount: number
  errorMessage?: string | null
}

export interface EmailStatsResponse {
  totalSent: number
  totalPending: number
  totalFailed: number
  openRate: number
  clickRate: number
  responseRate: number
}

