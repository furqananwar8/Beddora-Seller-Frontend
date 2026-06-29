import { ExpenseFilters, useGetExpensesQuery } from '@/services/api/expenses.api'

export const useFetchExpenses = (filters: ExpenseFilters) => {
  return useGetExpensesQuery(filters)
}

