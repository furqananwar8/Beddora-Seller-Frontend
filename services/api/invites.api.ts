import { baseApi } from './baseApi'

export interface Permission {
  id: number
  name: string
  resource: string
  action: string
  page: string
  subpage: string | null
  description: string | null
}

export interface Invite {
  id: number
  email: string
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'
  validUntil: string | null
  canEdit: boolean
  createdAt: string
  expiresAt: string
  acceptedAt: string | null
}

export interface CreateInvitePayload {
  email: string
  featurePermissionIds: number[]
  validUntil?: string | null
  canEdit?: boolean
  accountAccess?: { full: boolean; accountIds: number[] } | null
  productAccess?: { full: boolean; productIds: number[] } | null
}

export interface CreateInviteResponse {
  inviteId: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export const invitesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPermissions: builder.query<Permission[], void>({
      query: () => '/permissions',
      transformResponse: (response: ApiResponse<Permission[]>) => response.data,
      providesTags: ['Permissions'],
      keepUnusedDataFor: 600,
    }),

    // Backend returns raw array — no transformResponse needed
    getInvites: builder.query<Invite[], void>({
      query: () => '/invites',
      providesTags: ['Invites'],
      keepUnusedDataFor: 60,
    }),

    // Backend returns raw object — no transformResponse needed
    createInvite: builder.mutation<CreateInviteResponse, CreateInvitePayload>({
      query: (payload) => ({
        url: '/invites',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Invites'],
    }),
  }),
})

export const {
  useGetPermissionsQuery,
  useGetInvitesQuery,
  useCreateInviteMutation,
} = invitesApi