import { baseApi } from './baseApi'

export interface ReimbursementAmount {
  amount: number
  currency: string
  lastUpdate: string
}

export type FileFormat = 'excel' | 'csv'

export const moneyBackApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLostDamagedReimbursement: builder.query<ReimbursementAmount, void>({
      query: () => '/api/money-back/lost-damaged/amount',
      providesTags: ['MoneyBack'],
    }),
    downloadLostDamagedReport: builder.mutation<Blob, FileFormat>({
      query: (format) => ({
        url: '/api/money-back/lost-damaged/download',
        method: 'POST',
        params: { format },
        responseHandler: (response) => response.blob(),
      }),
    }),
    getReturnsReimbursement: builder.query<ReimbursementAmount, void>({
      query: () => '/api/money-back/returns/amount',
      providesTags: ['MoneyBack'],
    }),
    getFbaFeeChangesReimbursement: builder.query<ReimbursementAmount, void>({
      query: () => '/api/money-back/fba-fee-changes/amount',
      providesTags: ['MoneyBack'],
    }),
    getReimbursementGapAmount: builder.query<ReimbursementAmount, void>({
      query: () => '/api/money-back/reimbursement-gap/amount',
      providesTags: ['MoneyBack'],
    }),
  }),
})

export const {
  useGetLostDamagedReimbursementQuery,
  useDownloadLostDamagedReportMutation,
  useGetReturnsReimbursementQuery,
  useGetFbaFeeChangesReimbursementQuery,
  useGetReimbursementGapAmountQuery,
} = moneyBackApi
