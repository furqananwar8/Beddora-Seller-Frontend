import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { PPCDashboardFilters } from '@/types/ppcDashboard.types'

interface PpcDashboardState {
  filters: PPCDashboardFilters
}

const initialState: PpcDashboardState = {
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

export const ppcDashboardSlice = createSlice({
  name: 'ppcDashboard',
  initialState,
  reducers: {
    setPpcFilters: (state, action: PayloadAction<Partial<PPCDashboardFilters>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
  },
})

export const { setPpcFilters } = ppcDashboardSlice.actions

export default ppcDashboardSlice.reducer

