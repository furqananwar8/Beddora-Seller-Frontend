import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ExpenseFilters, ExpenseType } from '@/services/api/expenses.api'

interface ProfitExpensesState {
  filters: ExpenseFilters
  showForm: boolean
  showBulkImport: boolean
  editingExpenseId: string | null
}

const initialState: ProfitExpensesState = {
  filters: {
    type: undefined,
    category: undefined,
    sku: undefined,
    startDate: undefined,
    endDate: undefined,
  },
  showForm: false,
  showBulkImport: false,
  editingExpenseId: null,
}

const profitExpensesSlice = createSlice({
  name: 'profitExpenses',
  initialState,
  reducers: {
    setExpenseFilters: (state, action: PayloadAction<ExpenseFilters>) => {
      state.filters = action.payload
    },
    setExpenseTypeFilter: (state, action: PayloadAction<ExpenseType | undefined>) => {
      state.filters.type = action.payload
    },
    setShowExpenseForm: (state, action: PayloadAction<boolean>) => {
      state.showForm = action.payload
      if (!action.payload) {
        state.editingExpenseId = null
      }
    },
    setEditingExpenseId: (state, action: PayloadAction<string | null>) => {
      state.editingExpenseId = action.payload
      state.showForm = action.payload !== null
    },
    setShowBulkImport: (state, action: PayloadAction<boolean>) => {
      state.showBulkImport = action.payload
    },
    resetExpenseState: (state) => {
      state.filters = {}
      state.showForm = false
      state.showBulkImport = false
      state.editingExpenseId = null
    },
  },
})

export const {
  setExpenseFilters,
  setExpenseTypeFilter,
  setShowExpenseForm,
  setEditingExpenseId,
  setShowBulkImport,
  resetExpenseState,
} = profitExpensesSlice.actions

export default profitExpensesSlice.reducer

