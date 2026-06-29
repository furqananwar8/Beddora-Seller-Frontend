import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { BuyBoxAlertFilters } from '@/types/buyBoxAlerts.types'

interface BuyBoxAlertsState {
  filters: BuyBoxAlertFilters
}

const initialState: BuyBoxAlertsState = {
  filters: {
    marketplaceId: undefined,
    asin: undefined,
    sku: undefined,
    status: undefined,
  },
}

export const buyBoxAlertsSlice = createSlice({
  name: 'buyBoxAlerts',
  initialState,
  reducers: {
    setBuyBoxAlertsFilters: (state, action: PayloadAction<Partial<BuyBoxAlertFilters>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
  },
})

export const { setBuyBoxAlertsFilters } = buyBoxAlertsSlice.actions

export default buyBoxAlertsSlice.reducer

