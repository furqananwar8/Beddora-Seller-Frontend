import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { EMPTY_DRAFT, draftReducer, type DraftAction, type DraftState } from '@/features/inventory/sku-mapping/bindingDraft'
import { DEFAULT_SKU_MAPPING_FILTERS, type SkuMappingFilterValues } from '@/features/inventory/sku-mapping/filters'
import { clearCredentials } from './auth.slice'

/**
 * The SKU Mapper's working state (applied filters, SKUs on the graph, unsaved edits). It lives here rather than in the
 * screen so leaving for a binding's history and coming back finds the graph as it was.
 */
interface SkuMapperState {
  filters: SkuMappingFilterValues
  graphKeys: string[]
  draft: DraftState
}

const initialState: SkuMapperState = { filters: DEFAULT_SKU_MAPPING_FILTERS, graphKeys: [], draft: EMPTY_DRAFT }

const skuMapperSlice = createSlice({
  name: 'skuMapper',
  initialState,
  reducers: {
    filtersApplied: (state, action: PayloadAction<SkuMappingFilterValues>) => {
      state.filters = action.payload
    },
    graphKeysSet: (state, action: PayloadAction<string[]>) => {
      state.graphKeys = action.payload
    },
    /** Reuses the screen's draft reducer so the edit rules live in one place. */
    draftActed: (state, action: PayloadAction<DraftAction>) => {
      state.draft = draftReducer(state.draft, action.payload)
    },
  },
  extraReducers: (builder) => {
    builder.addCase(clearCredentials, () => initialState)
  },
})

export const { filtersApplied, graphKeysSet, draftActed } = skuMapperSlice.actions
export default skuMapperSlice.reducer
