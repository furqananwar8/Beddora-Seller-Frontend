import { baseApi } from './baseApi'
import { Envelope, Page, unwrap } from './finance.api'
import { csv } from './queryParams'

/** One of the organisation's own warehouse locations (Settings > Warehouses). */
export interface Warehouse {
  id: number
  name: string
  /** Street line. */
  address: string
  /** 2-letter code. */
  country: string
  /** Subdivision code; null where the country lists none. */
  province: string | null
  city: string
  postalCode: string | null
  updatedAt: string
}

export type WarehouseBody = Omit<Warehouse, 'id' | 'updatedAt'>

export interface WarehouseListParams {
  page: number
  limit: number
  /** Name, address, city or postal code. */
  search?: string
  countries?: string[]
  provinces?: string[]
}

/** The countries and states warehouses are in, for the list's filters. */
export interface WarehouseFilterOptions {
  countries: string[]
  provinces: Array<{ country: string; code: string }>
}

export const warehousesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWarehouses: builder.query<Page<Warehouse>, WarehouseListParams>({
      query: ({ search, countries, provinces, ...params }) => ({
        url: '/settings/warehouses',
        params: { ...params, search: search || undefined, countries: csv(countries), provinces: csv(provinces) },
      }),
      providesTags: ['Warehouses'],
    }),
    getWarehouseFilterOptions: builder.query<WarehouseFilterOptions, void>({
      query: () => '/settings/warehouses/filter-options',
      transformResponse: (response: Envelope<WarehouseFilterOptions>) => unwrap(response),
      providesTags: ['Warehouses'],
    }),
    createWarehouse: builder.mutation<Warehouse, WarehouseBody>({
      query: (body) => ({ url: '/settings/warehouses', method: 'POST', body }),
      transformResponse: (response: Envelope<Warehouse>) => unwrap(response),
      invalidatesTags: ['Warehouses'],
    }),
    updateWarehouse: builder.mutation<Warehouse, { id: number; body: WarehouseBody }>({
      query: ({ id, body }) => ({ url: `/settings/warehouses/${id}`, method: 'PUT', body }),
      transformResponse: (response: Envelope<Warehouse>) => unwrap(response),
      invalidatesTags: ['Warehouses'],
    }),
    deleteWarehouse: builder.mutation<void, number>({
      query: (id) => ({ url: `/settings/warehouses/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Warehouses'],
    }),
  }),
})

export const {
  useGetWarehousesQuery,
  useGetWarehouseFilterOptionsQuery,
  useCreateWarehouseMutation,
  useUpdateWarehouseMutation,
  useDeleteWarehouseMutation,
} = warehousesApi
