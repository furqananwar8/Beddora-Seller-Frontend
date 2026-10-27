import { baseApi } from './baseApi'
import { Envelope, unwrap } from './finance.api'

/** The organisation's own details: the letterhead on generated documents (the purchase order PDF). */
export interface CompanyDetails {
  name: string
  /** One line per row. */
  address: string
  email: string
  phone: string
}

export const companyDetailsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCompanyDetails: builder.query<CompanyDetails, void>({
      query: () => '/settings/company',
      transformResponse: (response: Envelope<CompanyDetails>) => unwrap(response),
      providesTags: ['CompanyDetails'],
    }),
    updateCompanyDetails: builder.mutation<CompanyDetails, CompanyDetails>({
      query: (body) => ({ url: '/settings/company', method: 'PUT', body }),
      transformResponse: (response: Envelope<CompanyDetails>) => unwrap(response),
      invalidatesTags: ['CompanyDetails'],
    }),
  }),
})

export const { useGetCompanyDetailsQuery, useUpdateCompanyDetailsMutation } = companyDetailsApi
