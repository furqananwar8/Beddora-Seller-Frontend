import { baseApi } from './baseApi'

/**
 * Expenses API endpoints
 * Provides RTK Query hooks for expense tracking and management
 */

export type ExpenseType = 'fixed' | 'recurring' | 'one-time'

export interface AllocatedProduct {
  sku: string
  percentage: number
}

export interface Expense {
  id: string
  accountId: string
  marketplaceId: string | null
  type: ExpenseType
  category: string
  amount: number
  currency: string
  allocatedProducts: AllocatedProduct[] | null
  description: string | null
  incurredAt: string
  createdAt: string
  updatedAt: string
}

export interface ExpenseFilters {
  accountId?: string
  marketplaceId?: string
  type?: ExpenseType
  category?: string
  sku?: string
  startDate?: string
  endDate?: string
}

export interface ExpenseSummary {
  totalAmount: number
  byType: Record<ExpenseType, number>
  byCategory: Record<string, number>
  count: number
}

export interface ExpensesListResponse {
  success: boolean
  data: Expense[]
  summary: ExpenseSummary
  totalRecords: number
}

export interface CreateExpenseRequest {
  accountId: string
  marketplaceId?: string
  type: ExpenseType
  category: string
  amount: number
  currency: string
  allocatedProducts?: AllocatedProduct[]
  description?: string
  incurredAt: string
}

export interface UpdateExpenseRequest {
  marketplaceId?: string
  type?: ExpenseType
  category?: string
  amount?: number
  currency?: string
  allocatedProducts?: AllocatedProduct[]
  description?: string
  incurredAt?: string
}

export interface BulkImportResponse {
  success: boolean
  data: {
    created: number
    failed: number
    errors: Array<{ row: number; message: string }>
  }
}

export const expensesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExpenses: builder.query<ExpensesListResponse, ExpenseFilters>({
      query: (filters) => ({
        url: '/profit/expenses',
        params: filters,
      }),
      providesTags: ['Profit'],
      keepUnusedDataFor: 30,
    }),

    createExpense: builder.mutation<{ success: boolean; data: Expense }, CreateExpenseRequest>({
      query: (data) => ({
        url: '/profit/expenses',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Profit'],
    }),

    updateExpense: builder.mutation<
      { success: boolean; data: Expense },
      { id: string; data: UpdateExpenseRequest }
    >({
      query: ({ id, data }) => ({
        url: `/profit/expenses/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Profit'],
    }),

    deleteExpense: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/profit/expenses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Profit'],
    }),

    bulkImportExpenses: builder.mutation<BulkImportResponse, { accountId: string; file: File }>({
      query: ({ accountId, file }) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('accountId', accountId)

        return {
          url: '/profit/expenses/bulk',
          method: 'POST',
          body: formData,
        }
      },
      invalidatesTags: ['Profit'],
    }),
  }),
})

export const {
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useBulkImportExpensesMutation,
} = expensesApi

