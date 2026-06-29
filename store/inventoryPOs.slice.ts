import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { PurchaseOrderFilters } from '@/types/purchaseOrders.types'

interface InventoryPOsState {
  filters: PurchaseOrderFilters
  selectedPOId?: string | null
}

const initialState: InventoryPOsState = {
  filters: {
    accountId: '',
    supplierId: undefined,
    marketplaceId: undefined,
    status: undefined,
    sku: undefined,
  },
  selectedPOId: null,
}

export const inventoryPOsSlice = createSlice({
  name: 'inventoryPOs',
  initialState,
  reducers: {
    setPOFilters: (state, action: PayloadAction<Partial<PurchaseOrderFilters>>) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
      }
    },
    setSelectedPOId: (state, action: PayloadAction<string | null>) => {
      state.selectedPOId = action.payload
    },
  },
})

export const { setPOFilters, setSelectedPOId } = inventoryPOsSlice.actions

export default inventoryPOsSlice.reducer

