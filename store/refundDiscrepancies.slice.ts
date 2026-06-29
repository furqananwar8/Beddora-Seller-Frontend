import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RefundDiscrepancyFilters } from '@/services/api/refundDiscrepancies.api'

interface RefundDiscrepanciesState {
  filters: RefundDiscrepancyFilters
}

const initialState: RefundDiscrepanciesState = {
  filters: {
    marketplaceId: undefined,
    productId: undefined,
    sku: undefined,
    refundReasonCode: undefined,
    status: undefined,
    startDate: undefined,
    endDate: undefined,
  },
}

export const refundDiscrepanciesSlice = createSlice({
  name: 'refundDiscrepancies',
  initialState,
  reducers: {
    setRefundDiscrepancyFilters: (
      state,
      action: PayloadAction<Partial<RefundDiscrepancyFilters>>
    ) => {
      state.filters = { ...state.filters, ...action.payload }
    },
  },
})

export const { setRefundDiscrepancyFilters } = refundDiscrepanciesSlice.actions

export default refundDiscrepanciesSlice.reducer