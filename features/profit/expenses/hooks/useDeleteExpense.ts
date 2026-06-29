import { useDeleteExpenseMutation } from '@/services/api/expenses.api'

export const useDeleteExpense = () => {
  return useDeleteExpenseMutation()
}

