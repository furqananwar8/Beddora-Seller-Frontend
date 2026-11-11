import { baseApi } from './baseApi'
import { unwrap, type Page, type PageParams, type UserRef } from './finance.api'

/** One cost center. `code` spells out its whole path (see the backend's cost-center-code.ts). */
export interface CostCenterNode {
  id: number
  code: string
  name: string
  /** 1 for L1 ... 4 for L4. */
  level: number
  parentId: number | null
}

/** A listing row: an L1 and, when searching, which of its cost centers matched. */
export interface CostCenterRoot extends CostCenterNode {
  createdAt: string
  createdBy: UserRef
  matchIds: number[]
}

/** A head a cost center can be moved under, with the level it would get there. */
export interface CostCenterMoveTarget {
  id: number
  code: string
  name: string
  level: number
  /** The heads above it, e.g. `Expense › Operating Expense`. */
  path: string
  resultingLevel: number
}

export interface CostCenterMoveTargets {
  targets: CostCenterMoveTarget[]
  /** Why only heads at its own level are offered (it or something under it is booked to); null when any head fits. */
  levelLocked: string | null
}

/** A new entry from the create screen, under a saved parent (`parentId`) or another new entry (`parentKey`). */
export interface NewCostCenter {
  key: string
  name: string
  parentId?: number
  parentKey?: string
}

export const costCentersApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getCostCenters: b.query<Page<CostCenterRoot>, PageParams>({
      query: ({ search, ...params }) => ({ url: '/finance/cost-centers', params: { ...params, search: search || undefined } }),
      providesTags: ['FinanceCostCenters'],
    }),
    getCostCenterDescendants: b.query<CostCenterNode[], number>({
      query: (rootId) => `/finance/cost-centers/${rootId}/descendants`,
      transformResponse: unwrap,
      providesTags: ['FinanceCostCenters'],
    }),
    /** Children of a parent, or the L1 list without one: the choices of each level's select. */
    getCostCenterOptions: b.query<CostCenterNode[], number | void>({
      query: (parentId) => ({ url: '/finance/cost-centers/options', params: parentId ? { parentId } : undefined }),
      transformResponse: unwrap,
      providesTags: ['FinanceCostCenters'],
    }),
    createCostCenters: b.mutation<CostCenterNode[], NewCostCenter[]>({
      query: (nodes) => ({ url: '/finance/cost-centers', method: 'POST', body: { nodes } }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceCostCenters'],
    }),
    renameCostCenter: b.mutation<CostCenterNode, { id: number; name: string }>({
      query: ({ id, name }) => ({ url: `/finance/cost-centers/${id}`, method: 'PATCH', body: { name } }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceCostCenters'],
    }),
    getCostCenterMoveTargets: b.query<CostCenterMoveTargets, number>({
      query: (id) => `/finance/cost-centers/${id}/move-targets`,
      transformResponse: unwrap,
      providesTags: ['FinanceCostCenters'],
    }),
    /** Moves it, with everything under it, under another head; its level and codes follow. */
    moveCostCenter: b.mutation<CostCenterNode, { id: number; parentId: number }>({
      query: ({ id, parentId }) => ({ url: `/finance/cost-centers/${id}/parent`, method: 'PATCH', body: { parentId } }),
      transformResponse: unwrap,
      invalidatesTags: ['FinanceCostCenters'],
    }),
    deleteCostCenter: b.mutation<void, number>({
      query: (id) => ({ url: `/finance/cost-centers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['FinanceCostCenters'],
    }),
  }),
})

export const {
  useGetCostCentersQuery,
  useGetCostCenterDescendantsQuery,
  useGetCostCenterOptionsQuery,
  useCreateCostCentersMutation,
  useRenameCostCenterMutation,
  useGetCostCenterMoveTargetsQuery,
  useMoveCostCenterMutation,
  useDeleteCostCenterMutation,
} = costCentersApi
