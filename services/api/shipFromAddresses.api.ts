import { baseApi } from './baseApi'
import type { SavedShipFromAddress, ShipFromAddress } from '@/features/inventory/shipments/types'

export type ShipFromAddressInput = ShipFromAddress & { label?: string }

/** Ship-from address book: managed in Settings, picked when creating a shipment. */
export const shipFromAddressesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getShipFromAddresses: builder.query<SavedShipFromAddress[], string | void>({
      query: (q) => ({ url: '/inventory/addresses', params: q ? { q } : undefined }),
      providesTags: ['ShipFromAddresses'],
    }),

    createShipFromAddress: builder.mutation<SavedShipFromAddress, ShipFromAddressInput & { isDefault?: boolean }>({
      query: (body) => ({ url: '/inventory/addresses', method: 'POST', body }),
      invalidatesTags: ['ShipFromAddresses'],
    }),

    updateShipFromAddress: builder.mutation<SavedShipFromAddress, { id: string; address: ShipFromAddressInput }>({
      query: ({ id, address }) => ({ url: `/inventory/addresses/${id}`, method: 'PUT', body: address }),
      invalidatesTags: ['ShipFromAddresses'],
    }),

    setDefaultShipFromAddress: builder.mutation<SavedShipFromAddress, string>({
      query: (id) => ({ url: `/inventory/addresses/${id}/default`, method: 'POST' }),
      invalidatesTags: ['ShipFromAddresses'],
    }),

    deleteShipFromAddress: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/inventory/addresses/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ShipFromAddresses'],
    }),
  }),
})

export const {
  useGetShipFromAddressesQuery,
  useCreateShipFromAddressMutation,
  useUpdateShipFromAddressMutation,
  useSetDefaultShipFromAddressMutation,
  useDeleteShipFromAddressMutation,
} = shipFromAddressesApi
