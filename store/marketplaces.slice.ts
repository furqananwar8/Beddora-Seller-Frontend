import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface MarketplacesState {
  selectedMarketplaceId?: string
}

const initialState: MarketplacesState = {
  selectedMarketplaceId: undefined,
}

export const marketplacesSlice = createSlice({
  name: 'marketplaces',
  initialState,
  reducers: {
    setSelectedMarketplace: (state, action: PayloadAction<string | undefined>) => {
      state.selectedMarketplaceId = action.payload
    },
  },
})

export const { setSelectedMarketplace } = marketplacesSlice.actions

export default marketplacesSlice.reducer

