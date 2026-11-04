/** Campaign Performance: mirrors the /campaign-performance API of the backend. */

export type KeywordRankStatus = 'RANKED' | 'NOT_IN_TOP' | 'NO_DATA'

export interface CampaignPerformancePeriod {
  startDate: string
  endDate: string
  marketplace?: string
}

export interface ParentSkuSummary {
  parentSku: string
  title: string
  imageUrl: string | null
  asin: string | null
  spend: number
  budget: number
  keywordCount: number
}

export interface DayMetrics {
  budget: number | null
  spend: number | null
  actualSales: number | null
  units: number | null
  ppcSales: number | null
  ppcUnits: number | null
  price: number | null
}

export interface SkuPerformance {
  sku: string
  asin: string | null
  title: string
  imageUrl: string | null
  marketplace: string | null
  ads7d: number
  daily: Record<string, DayMetrics>
}

export interface RankCell {
  status: KeywordRankStatus
  rank: number | null
}

export interface KeywordAsinRanks {
  asin: string
  ranks: Record<string, RankCell>
}

export interface KeywordRow {
  id: number
  keyword: string
  searchFrequency: number | null
  campaignName: string | null
  adGroupName: string | null
  spend: number
  budget: number
  percentUsed: number
  asins: KeywordAsinRanks[]
}

export interface KeywordsResponse {
  days: string[]
  skus: SkuPerformance[]
  items: KeywordRow[]
  total: number
  page: number
  limit: number
}

export interface ParentsParams extends CampaignPerformancePeriod {
  search?: string
}

export interface ParentKeywordsParams extends CampaignPerformancePeriod {
  parentSku: string
  search?: string
  page: number
  limit: number
}

/** The latest keyword and rank sync, as shown in Report Sync Management. */
export interface CampaignSyncState {
  status: 'idle' | 'running' | 'success' | 'error'
  startDate: string | null
  finishedAt: string | null
  errorMessage: string | null
}
