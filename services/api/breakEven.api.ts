import { baseApi } from './baseApi';

export interface BreakEvenFilters {
  accountId?: string;
  amazonAccountId?: string;
  marketplaceId?: string;
  sku?: string;
  startDate: string;   // YYYY-MM-DD (PDT — Amazon timezone)
  endDate: string;     // YYYY-MM-DD (PDT — Amazon timezone)
}

export interface BreakEvenItem {
  skuId: string;
  sku: string;
  asin: string;
  title: string;
  currentPrice: number;
  cost: number;
  productSales: number;
  unitsSold: number;
  promoRebates: number;
  sellingFee: number;
  otherAmazonAdj: number;
  totalAmazonExpense: number;
  amazonExpenses: number;
  marketingExpense: number;
  allocatedNonSku: number;
  totalExpenseInclMarketing: number;
  totalCogs: number;
  totalExpenseInclMarketingAndCogs: number;
  netAfterAmazon: number;
  netAfterAmazonAndMarketing: number;
  netAfterAmazonMarketingAndCogs: number;
  amazonMarginPct: number;
  marginAfterMarketingPct: number;
  marginAfterAllPct: number;
  targetProfit: number;
  targetGap: number;
  status: 'Below Target' | 'Meet Target';
  breakevenPrice: number;
  avgSellingPrice: number;
  adsPerUnit: number;
  allocatedOpex: number;
  trueNetProfit: number;
}

export interface BreakEvenSummary {
  totalProducts: number;
  totalSales: number;
  totalUnits: number;
  totalNetProfit: number;
  avgMarginPct: number;
}

export interface BreakEvenApiResponse {
  success: boolean;
  data: {
    items: BreakEvenItem[];
    summary: BreakEvenSummary;
    filters: { startDate: string; endDate: string };
  };
}

export interface BreakEvenData {
  items: BreakEvenItem[];
  summary: BreakEvenSummary;
  filters: { startDate: string; endDate: string };
}

export const breakEvenApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBreakEvenData: builder.query<BreakEvenData, BreakEvenFilters>({
      query: (filters) => ({
        url: '/products/break-even-analysis',
        params: filters,
      }),
      transformResponse: (response: BreakEvenApiResponse) => response.data,
      providesTags: ['Profit'],
      keepUnusedDataFor: 300,
    }),
  }),
});

export const { useGetBreakEvenDataQuery } = breakEvenApi;