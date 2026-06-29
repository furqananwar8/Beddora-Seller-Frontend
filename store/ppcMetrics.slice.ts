import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { PPCMetricsFilters } from '@/types/ppcMetrics.types'

interface PPCMetricsState {
  filters: PPCMetricsFilters
}

const initialState: PPCMetricsState = {
  filters: {
    accountId: '',
    amazonAccountId: undefined,
    marketplaceId: undefined,
    sku: undefined,
    startDate: undefined,
    endDate: undefined,
    period: 'day',
  },
}

export const ppcMetricsSlice = createSlice({
  name: 'ppcMetrics',
  initialState,
  reducers: {
    setPpcMetricsFilters: (state, action: PayloadAction<Partial<PPCMetricsFilters>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
  },
})

export const { setPpcMetricsFilters } = ppcMetricsSlice.actions

export default ppcMetricsSlice.reducer

