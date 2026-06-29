import { baseApi } from './baseApi'

export type CampaignStatus = 'active' | 'inactive'

export interface AutoresponderCampaign {
  id: string
  priority: number
  name: string
  products: string
  status: CampaignStatus
  lastStatusChange: string
  sentToday: number
  sentLast30Days: number
}

export interface CampaignFilters {
  search?: string
  status?: CampaignStatus | 'all'
}

export const autoresponderCampaignsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAutoresponderCampaigns: builder.query<AutoresponderCampaign[], CampaignFilters>({
      query: (filters) => ({
        url: '/api/autoresponder/campaigns',
        params: filters,
      }),
      providesTags: ['AutoresponderCampaigns'],
    }),
    createAutoresponderCampaign: builder.mutation<AutoresponderCampaign, Partial<AutoresponderCampaign>>({
      query: (campaign) => ({
        url: '/api/autoresponder/campaigns',
        method: 'POST',
        body: campaign,
      }),
      invalidatesTags: ['AutoresponderCampaigns'],
    }),
    updateAutoresponderCampaign: builder.mutation<AutoresponderCampaign, { id: string; data: Partial<AutoresponderCampaign> }>({
      query: ({ id, data }) => ({
        url: `/api/autoresponder/campaigns/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['AutoresponderCampaigns'],
    }),
    deleteAutoresponderCampaign: builder.mutation<void, string>({
      query: (id) => ({
        url: `/api/autoresponder/campaigns/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AutoresponderCampaigns'],
    }),
  }),
})

export const {
  useGetAutoresponderCampaignsQuery,
  useCreateAutoresponderCampaignMutation,
  useUpdateAutoresponderCampaignMutation,
  useDeleteAutoresponderCampaignMutation,
} = autoresponderCampaignsApi
