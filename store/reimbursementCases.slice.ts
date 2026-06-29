import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { CaseFilters } from '@/services/api/reimbursementCases.api'

interface ReimbursementCasesState {
  filters: CaseFilters
}

const initialState: ReimbursementCasesState = {
  filters: {
    marketplaceId: undefined,
    productId: undefined,
    sku: undefined,
    caseType: undefined,
    submissionStatus: undefined,
    startDate: undefined,
    endDate: undefined,
  },
}

export const reimbursementCasesSlice = createSlice({
  name: 'reimbursementCases',
  initialState,
  reducers: {
    setReimbursementCaseFilters: (state, action: PayloadAction<Partial<CaseFilters>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
  },
})

export const { setReimbursementCaseFilters } = reimbursementCasesSlice.actions

export default reimbursementCasesSlice.reducer

