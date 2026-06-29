import { baseApi } from './baseApi'

/**
 * Supplier Item
 */
export interface SupplierItem {
  id: string
  name: string
  currency: string
  email?: string
  website?: string
  comment?: string
  contactPerson?: string
  phone?: string
  address?: string
  taxId?: string
  paymentTerms?: string
  createdAt: string
  updatedAt: string
}

/**
 * Supplier Filters
 */
export interface SupplierFilters {
  search?: string
  currency?: string
}

/**
 * Create Supplier Request
 */
export interface CreateSupplierRequest {
  name: string
  currency: string
  email?: string
  website?: string
  comment?: string
  contactPerson?: string
  phone?: string
  address?: string
  taxId?: string
  paymentTerms?: string
}

/**
 * Update Supplier Request
 */
export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {}

/**
 * Suppliers API
 */
export const suppliersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get all suppliers
     */
    getSuppliers: builder.query<SupplierItem[], SupplierFilters | void>({
      query: (filters) => ({
        url: '/suppliers',
        params: filters ?? undefined,
      }),
      providesTags: ['Suppliers'],
    }),

    /**
     * Get single supplier
     */
    getSupplier: builder.query<SupplierItem, string>({
      query: (id) => ({
        url: `/suppliers/${id}`,
      }),
      providesTags: ['Suppliers'],
    }),

    /**
     * Create supplier
     */
    createSupplier: builder.mutation<SupplierItem, CreateSupplierRequest>({
      query: (body) => ({
        url: '/suppliers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Suppliers'],
    }),

    /**
     * Update supplier
     */
    updateSupplier: builder.mutation<SupplierItem, { id: string; data: UpdateSupplierRequest }>({
      query: ({ id, data }) => ({
        url: `/suppliers/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Suppliers'],
    }),

    /**
     * Delete supplier
     */
    deleteSupplier: builder.mutation<void, string>({
      query: (id) => ({
        url: `/suppliers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Suppliers'],
    }),
  }),
})

export const {
  useGetSuppliersQuery,
  useGetSupplierQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} = suppliersApi
