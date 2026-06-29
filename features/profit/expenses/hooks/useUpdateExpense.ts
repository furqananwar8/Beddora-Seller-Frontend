import { useUpdateExpenseMutation } from '@/services/api/expenses.api'

export const useUpdateExpense = () => {
  return useUpdateExpenseMutation()
}

