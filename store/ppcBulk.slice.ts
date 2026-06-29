import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { BulkBaseInput } from '@/types/ppcBulk.types'

interface PPCBulkState {
  filters: BulkBaseInput
}

const initialState: PPCBulkState = {
  filters: {
    accountId: '',
    marketplaceId: undefined,
    amazonAccountId: undefined,
    campaignId: undefined,
    adGroupId: undefined,
    keyword: undefined,
    sku: undefined,
    targetType: 'keyword',
    targetIds: undefined,
    preview: false,
  },
}

export const ppcBulkSlice = createSlice({
  name: 'ppcBulk',
  initialState,
  reducers: {
    setPpcBulkFilters: (state, action: PayloadAction<Partial<BulkBaseInput>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
  },
})

export const { setPpcBulkFilters } = ppcBulkSlice.actions

export default ppcBulkSlice.reducer

