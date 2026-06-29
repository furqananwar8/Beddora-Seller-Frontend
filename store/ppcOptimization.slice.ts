import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { PPCOptimizationFilters } from '@/types/ppcOptimization.types'

interface PPCOptimizationState {
  filters: PPCOptimizationFilters
}

const initialState: PPCOptimizationState = {
  filters: {
    accountId: '',
    amazonAccountId: undefined,
    marketplaceId: undefined,
    campaignId: undefined,
    adGroupId: undefined,
    keyword: undefined,
    startDate: undefined,
    endDate: undefined,
  },
}

export const ppcOptimizationSlice = createSlice({
  name: 'ppcOptimization',
  initialState,
  reducers: {
    setPpcOptimizationFilters: (state, action: PayloadAction<Partial<PPCOptimizationFilters>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
  },
})

export const { setPpcOptimizationFilters } = ppcOptimizationSlice.actions

export default ppcOptimizationSlice.reducer

