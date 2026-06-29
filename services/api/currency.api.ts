import { baseApi } from './baseApi'

export interface Currency {
  id: string
  code: string
  name: string
  symbol?: string | null
  isBaseCurrency: boolean
  createdAt: string
  updatedAt: string
}

export interface ExchangeRateResponse {
  from: string
  to: string
  rate: number
  fetchedAt: string
}

export const currencyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurrencies: builder.query<{ data: Currency[] }, void>({
      query: () => '/currencies',
      providesTags: ['Currencies'],
    }),
    getExchangeRate: builder.query<{ data: ExchangeRateResponse }, { from: string; to: string }>({
      query: ({ from, to }) => ({
        url: '/currencies/exchange-rate',
        params: { from, to },
      }),
      providesTags: ['ExchangeRates'],
    }),
    updateExchangeRates: builder.mutation<{ data: { baseCurrency: string; updatedCount: number } }, void>({
      query: () => ({
        url: '/currencies/update-rates',
        method: 'POST',
      }),
      invalidatesTags: ['ExchangeRates'],
    }),
  }),
})

export const {
  useGetCurrenciesQuery,
  useGetExchangeRateQuery,
  useUpdateExchangeRatesMutation,
} = currencyApi

