import { useCreateExpenseMutation } from '@/services/api/expenses.api'

export const useAddExpense = () => {
  return useCreateExpenseMutation()
}

