import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { FeeChangeAlertFilters } from '@/types/feeChangeAlerts.types'

interface FeeChangeAlertsState {
  filters: FeeChangeAlertFilters
}

const initialState: FeeChangeAlertsState = {
  filters: {
    marketplaceId: undefined,
    sku: undefined,
    feeType: undefined,
    status: undefined,
  },
}

export const feeChangeAlertsSlice = createSlice({
  name: 'feeChangeAlerts',
  initialState,
  reducers: {
    setFeeChangeAlertsFilters: (state, action: PayloadAction<Partial<FeeChangeAlertFilters>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
  },
})

export const { setFeeChangeAlertsFilters } = feeChangeAlertsSlice.actions

export default feeChangeAlertsSlice.reducer

