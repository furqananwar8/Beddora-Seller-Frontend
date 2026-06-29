export interface FeedbackAlertFilters {
  marketplaceId?: string
  asin?: string
  sku?: string
  rating?: number
  status?: 'unread' | 'read' | 'resolved'
}

export interface FeedbackAlertItem {
  id: string
  marketplaceId: string
  asin?: string | null
  productId?: string | null
  sku?: string | null
  previousRating?: number | null
  newRating?: number | null
  reviewText?: string | null
  reviewer?: string | null
  status: 'unread' | 'read' | 'resolved'
  timestamp: string
}

export interface FeedbackAlertsResponse {
  data: FeedbackAlertItem[]
  total: number
}

