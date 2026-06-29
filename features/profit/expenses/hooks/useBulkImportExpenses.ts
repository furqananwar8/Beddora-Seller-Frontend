import { useBulkImportExpensesMutation } from '@/services/api/expenses.api'

export const useBulkImportExpenses = () => {
  return useBulkImportExpensesMutation()
}

