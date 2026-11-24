import { baseApi } from './baseApi'

/** Rows per page a table can show; mirrors PAGE_SIZE_OPTIONS on the backend. */
export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const

type PageSizes = Record<string, number>

export const pagePreferencesApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getPageSizes: b.query<PageSizes, void>({
      query: () => '/me/page-sizes',
      transformResponse: (res: { data: PageSizes }) => res.data,
    }),
    savePageSize: b.mutation<void, { pageKey: string; pageSize: number }>({
      query: (body) => ({ url: '/me/page-sizes', method: 'PUT', body }),
      // Show the choice at once; the request just persists it for next time.
      async onQueryStarted({ pageKey, pageSize }, { dispatch, queryFulfilled }) {
        const patch = dispatch(pagePreferencesApi.util.updateQueryData('getPageSizes', undefined, (draft) => { draft[pageKey] = pageSize }))
        try { await queryFulfilled } catch { patch.undo() }
      },
    }),
  }),
})

export const { useGetPageSizesQuery, useSavePageSizeMutation } = pagePreferencesApi
