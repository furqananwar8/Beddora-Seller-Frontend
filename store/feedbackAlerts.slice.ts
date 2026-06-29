import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { FeedbackAlertFilters } from '@/types/feedbackAlerts.types'

interface FeedbackAlertsState {
  filters: FeedbackAlertFilters
}

const initialState: FeedbackAlertsState = {
  filters: {
    marketplaceId: undefined,
    asin: undefined,
    sku: undefined,
    rating: undefined,
    status: undefined,
  },
}

export const feedbackAlertsSlice = createSlice({
  name: 'feedbackAlerts',
  initialState,
  reducers: {
    setFeedbackAlertsFilters: (state, action: PayloadAction<Partial<FeedbackAlertFilters>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
  },
})

export const { setFeedbackAlertsFilters } = feedbackAlertsSlice.actions

export default feedbackAlertsSlice.reducer

