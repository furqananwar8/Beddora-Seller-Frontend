import { baseApi } from './baseApi';
import type { ProductProfitBreakdown } from './profit.api';

export interface BreakEvenFilters {
  accountId?: string;
  amazonAccountId?: string;
  currency?: string;
  /** Target net margin, percent of sales (1 to 99). */
  targetMargin?: number;
  /** Comma-separated marketplaces, e.g. `Amazon.ca,Amazon.com`. */
  marketplaces?: string;
  search?: string;
  startDate: string; // YYYY-MM-DD (PDT — Amazon timezone)
  endDate: string; // YYYY-MM-DD (PDT — Amazon timezone)
}

export type BreakEvenStatus = 'Above target' | 'Meets target' | 'Below target' | 'No sales';

/** A row's break-even figures, at the period's costs per unit. */
export interface BreakEvenMetrics {
  avgSellingPrice: number;
  costPerUnit: number;
  /** Price per unit at which net profit is zero. */
  breakevenPrice: number;
  breakevenPriceExclAds: number;
  /** Price per unit that earns the target margin. */
  targetPrice: number;
  targetProfit: number;
  /** Positive: short of the target; negative: surplus. */
  targetGap: number;
  status: BreakEvenStatus;
}

/** One SKU's products-table row (same numbers as the profit dashboard) with its break-even figures. */
export type BreakEvenItem = ProductProfitBreakdown & {
  marketplace?: string;
  breakEven: BreakEvenMetrics;
};

export interface BreakEvenSummary {
  totalProducts: number;
  totalSales: number;
  totalUnits: number;
  totalNetProfit: number;
  avgMarginPct: number;
  belowTarget: number;
  meetsTarget: number;
  aboveTarget: number;
  /** Points over the target from which a SKU counts as above it. */
  aboveTargetPoints: number;
  targetMargin: number;
}

export interface BreakEvenData {
  items: BreakEvenItem[];
  summary: BreakEvenSummary;
  filters: { startDate: string; endDate: string; targetMargin: number };
}

export const breakEvenApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBreakEvenData: builder.query<BreakEvenData, BreakEvenFilters>({
      query: (filters) => ({
        url: '/products/break-even-analysis',
        params: filters,
      }),
      transformResponse: (response: { success: boolean; data: BreakEvenData }) => response.data,
      providesTags: ['Profit'],
      keepUnusedDataFor: 300,
    }),
  }),
});

export const { useGetBreakEvenDataQuery } = breakEvenApi;
