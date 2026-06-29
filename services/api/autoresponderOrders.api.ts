import { baseApi } from './baseApi'

export type OrderStatus = 'pending_data' | 'sent' | 'failed' | 'scheduled'

export interface AutoresponderOrder {
  id: string
  orderDate: string
  shippingDate?: string
  deliveryDate?: string
  orderNumber: string
  marketplace: string
  productSku: string
  productTitle: string
  productImage: string
  campaign?: string
  status: OrderStatus
  lastSentDate?: string
  blackListed: boolean
}

export interface OrderFilters {
  search?: string
  orderId?: string
  campaign?: string
  status?: OrderStatus | 'all'
}

export const autoresponderOrdersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAutoresponderOrders: builder.query<AutoresponderOrder[], OrderFilters>({
      query: (filters) => ({
        url: '/api/autoresponder/orders',
        params: filters,
      }),
      providesTags: ['AutoresponderOrders'],
    }),
    updateAutoresponderOrder: builder.mutation<AutoresponderOrder, { id: string; data: Partial<AutoresponderOrder> }>({
      query: ({ id, data }) => ({
        url: `/api/autoresponder/orders/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['AutoresponderOrders'],
    }),
  }),
})

export const {
  useGetAutoresponderOrdersQuery,
  useUpdateAutoresponderOrderMutation,
} = autoresponderOrdersApi
