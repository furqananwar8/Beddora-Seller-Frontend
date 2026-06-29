import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { PPCProfitMetricsFilters } from '@/types/ppcProfitMetrics.types'

interface PPCProfitMetricsState {
  filters: PPCProfitMetricsFilters
}

const initialState: PPCProfitMetricsState = {
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

export const ppcProfitMetricsSlice = createSlice({
  name: 'ppcProfitMetrics',
  initialState,
  reducers: {
    setPpcProfitMetricsFilters: (state, action: PayloadAction<Partial<PPCProfitMetricsFilters>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
  },
})

export const { setPpcProfitMetricsFilters } = ppcProfitMetricsSlice.actions

export default ppcProfitMetricsSlice.reducer

