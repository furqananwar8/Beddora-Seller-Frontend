import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ListingAlertFilters } from '@/types/listingAlerts.types'

interface ListingAlertsState {
  filters: ListingAlertFilters
}

const initialState: ListingAlertsState = {
  filters: {
    marketplaceId: undefined,
    asin: undefined,
    sku: undefined,
    status: undefined,
  },
}

export const listingAlertsSlice = createSlice({
  name: 'listingAlerts',
  initialState,
  reducers: {
    setListingAlertsFilters: (state, action: PayloadAction<Partial<ListingAlertFilters>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
  },
})

export const { setListingAlertsFilters } = listingAlertsSlice.actions

export default listingAlertsSlice.reducer

